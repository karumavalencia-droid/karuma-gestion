import assert from "node:assert/strict";
import test from "node:test";
import { importDriveDocuments, importGmailDocuments } from "../lib/documentos/google-import";

test("Drive and Gmail consume continuation tokens", async () => {
  process.env.GOOGLE_CLIENT_ID = "test";
  process.env.GOOGLE_CLIENT_SECRET = "test";
  process.env.GOOGLE_REFRESH_TOKEN = "test";
  process.env.DOCUMENTO_DRIVE_FOLDER_IDS = "folder";
  const previous = globalThis.fetch;
  const seen: string[] = [];
  const cursor = new Map<string, string>();
  const checkpoints = {
    async load(key: string) { return cursor.get(key) || ""; },
    async save(key: string, token: string) { cursor.set(key, token); },
  };
  globalThis.fetch = async (input) => {
    const url = String(input);
    seen.push(url);
    if (url.includes("oauth2.googleapis.com")) return Response.json({ access_token: "test" });
    if (url.includes("drive/v3/files")) return Response.json(url.includes("pageToken=")
      ? { files: [{ name: "ignored.txt", id: "2" }] }
      : { files: [{ name: "ignored.txt", id: "1" }], nextPageToken: "next-drive" });
    if (url.includes("/messages")) return Response.json(url.includes("pageToken=")
      ? { messages: [] }
      : { messages: [], nextPageToken: "next-gmail" });
    throw new Error(url);
  };
  try {
    assert.equal((await importDriveDocuments({ limit: 2, checkpoints })).scanned, 2);
    assert.equal((await importGmailDocuments({ limit: 1, checkpoints })).scanned, 0);
    assert.ok(seen.some(url => url.includes("pageToken=next-drive")));
    assert.ok(seen.some(url => url.includes("pageToken=next-gmail")));
  } finally {
    globalThis.fetch = previous;
  }
});

test("Drive resumes from a saved page after its per-run limit", async () => {
  process.env.GOOGLE_CLIENT_ID = "test";
  process.env.GOOGLE_CLIENT_SECRET = "test";
  process.env.GOOGLE_REFRESH_TOKEN = "test";
  process.env.DOCUMENTO_DRIVE_FOLDER_IDS = "folder";
  const previous = globalThis.fetch;
  const cursor = new Map<string, string>();
  const checkpoints = {
    async load(key: string) { return cursor.get(key) || ""; },
    async save(key: string, token: string) { cursor.set(key, token); },
  };
  const pages: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("oauth2.googleapis.com")) return Response.json({ access_token: "test" });
    const page = new URL(url).searchParams.get("pageToken") || "first";
    pages.push(page);
    return Response.json(page === "first"
      ? { files: [{ id: "1", name: "ignored.txt" }], nextPageToken: "second" }
      : { files: [{ id: "2", name: "ignored.txt" }] });
  };
  try {
    const first = await importDriveDocuments({ limit: 1, checkpoints });
    assert.equal(first.scanned, 1);
    assert.equal(first.hasMore, true);
    assert.equal((await importDriveDocuments({ limit: 1, checkpoints })).scanned, 1);
    assert.deepEqual(pages, ["first", "second"]);
    assert.equal(cursor.get("drive:folder"), "");
  } finally {
    globalThis.fetch = previous;
  }
});

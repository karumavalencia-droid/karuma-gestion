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
    assert.equal((await importDriveDocuments({ limit: 1 })).scanned, 2);
    assert.equal((await importGmailDocuments({ limit: 1 })).scanned, 0);
    assert.ok(seen.some(url => url.includes("pageToken=next-drive")));
    assert.ok(seen.some(url => url.includes("pageToken=next-gmail")));
  } finally {
    globalThis.fetch = previous;
  }
});

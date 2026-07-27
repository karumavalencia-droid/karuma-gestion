import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const STAGING_REF = "lolqbdoqqptavyihwvry";
const baseUrl = (process.env.DOCUMENTO_E2E_BASE_URL ?? "").replace(/\/$/, "");
const authSecret = process.env.KARUMA_AUTH_SECRET;
const requireAi = process.env.DOCUMENTO_E2E_REQUIRE_AI === "1";
const cleanup = process.env.DOCUMENTO_E2E_CLEANUP === "1";

function fail(message) {
  throw new Error(`[documento-preview-e2e] ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function sessionCookie({ role, employeeId = null }) {
  assert(authSecret, "KARUMA_AUTH_SECRET es obligatorio");
  const payload = base64Url(JSON.stringify({
    version: 1,
    name: "Documento E2E",
    email: `${role}@staging.karuma.local`,
    role,
    employeeId,
    expiresAt: Date.now() + 10 * 60 * 1000,
  }));
  const signature = createHmac("sha256", authSecret).update(payload).digest("base64url");
  return `karuma_session=${payload}.${signature}`;
}

async function json(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function request(path, init = {}, cookie = sessionCookie({ role: "owner" })) {
  const headers = new Headers(init.headers);
  headers.set("Cookie", cookie);
  return fetch(`${baseUrl}${path}`, { ...init, headers, redirect: "manual" });
}

async function removeStagingFixture(documento) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) fail("SUPABASE_SERVICE_ROLE_KEY y NEXT_PUBLIC_SUPABASE_URL son obligatorios para cleanup");
  if (!supabaseUrl.includes(STAGING_REF)) fail("DOCUMENTO_E2E_CLEANUP solo permite el proyecto staging configurado");

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: storageError } = await supabase.storage.from("documentos").remove([documento.storage_path]);
  assert(!storageError, `cleanup Storage falló: ${storageError?.message}`);

  const { error: rowError } = await supabase.from("documentos").delete().eq("id", documento.id);
  assert(!rowError, `cleanup Documento falló: ${rowError?.message}`);
}

async function main() {
  assert(baseUrl.startsWith("https://"), "DOCUMENTO_E2E_BASE_URL debe ser una URL HTTPS de Preview");
  assert(authSecret, "KARUMA_AUTH_SECRET es obligatorio");

  const owner = sessionCookie({ role: "owner" });
  const nonOwner = sessionCookie({ role: "manager" });
  const unauthorized = await request("/api/documentos", {}, nonOwner);
  assert(unauthorized.status === 403, `un usuario no owner debe recibir 403, recibió ${unauthorized.status}`);

  const note = `Documento E2E ${randomUUID()}: nota de prueba para búsqueda y trazabilidad.`;
  const form = new FormData();
  form.set("note", note);
  form.set("title", "Documento Preview E2E");
  form.set("documentType", "note");
  const upload = await request("/api/documentos", { method: "POST", body: form }, owner);
  const uploadBody = await json(upload);
  assert(upload.status === 201 && uploadBody?.documento?.id, `upload falló: HTTP ${upload.status}`);
  const documento = uploadBody.documento;

  try {
    const list = await request(`/api/documentos?q=${encodeURIComponent("Documento Preview E2E")}`, {}, owner);
    const listBody = await json(list);
    assert(list.ok && Array.isArray(listBody?.documentos) && listBody.documentos.some((item) => item.id === documento.id), "el owner no puede recuperar el Documento recién creado");

    const file = await request(`/api/documentos/${documento.id}/file`, {}, owner);
    const signedUrl = file.headers.get("location");
    assert(file.status === 302 && signedUrl, `signed URL falló: HTTP ${file.status}`);
    const original = await fetch(signedUrl);
    assert(original.ok && (await original.text()) === note, "signed URL no devolvió el archivo original");

    const reprocess = await request(`/api/documentos/${documento.id}/reprocess`, { method: "POST" }, owner);
    const reprocessBody = await json(reprocess);
    if (requireAi) {
      assert(reprocess.ok && reprocessBody?.documento, `AI reprocess requerido falló: HTTP ${reprocess.status}`);
    } else {
      assert(reprocess.ok || reprocess.status === 502, `AI reprocess devolvió un estado inesperado: HTTP ${reprocess.status}`);
    }

    const confirm = await request("/api/documentos/bulk-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: [documento.id] }),
    }, owner);
    const confirmBody = await json(confirm);
    assert(confirm.ok && confirmBody?.confirmed === 1, `confirmación falló: HTTP ${confirm.status}`);

    const detail = await request(`/api/documentos/${documento.id}`, {}, owner);
    const detailBody = await json(detail);
    assert(detail.ok && detailBody?.documento?.human_verified === true, "la confirmación no marcó human_verified");

    const archive = await request(`/api/documentos/${documento.id}`, { method: "DELETE" }, owner);
    assert(archive.ok, `soft archive falló: HTTP ${archive.status}`);
    console.log(`PASS Documento Preview E2E: ${documento.id}`);
  } finally {
    if (cleanup) await removeStagingFixture(documento);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

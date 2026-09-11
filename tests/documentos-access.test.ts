import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { GET } from '../app/api/documentos/[id]/route';
import { createSessionToken, SESSION_COOKIE_NAME } from '../lib/auth/session';

process.env.KARUMA_AUTH_SECRET = 'documentos-test-secret';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://documents-test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

test('document access preserves authorization and resolves both storage providers', async () => {
  let doc = { storage_path: 'drive://test_file-123', nombre: 'nomina.pdf', categoria: 'nominas' };
  const calls: { url: string; body: string }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, body: String(init?.body ?? '') });
    return new Response(JSON.stringify(url.includes('/rest/v1/') ? doc : { signedURL: '/object/sign/documentos/test?token=test' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const owner = await createSessionToken({ name: 'Test', email: 'test@example.com', role: 'owner', employeeId: null });
    const staff = await createSessionToken({ name: 'Test', email: 'test@example.com', role: 'waiter', employeeId: 'test' });
    const get = (action: string, cookie?: string) => GET(new NextRequest(`https://example.com/api/documentos/test?action=${action}`, { headers: cookie ? { cookie: `${SESSION_COOKIE_NAME}=${cookie}` } : {} }), { params: Promise.resolve({ id: 'test' }) });
    assert.equal((await get('open')).status, 401);
    assert.equal((await get('download', staff)).status, 403);
    assert.equal(calls.length, 0);
    assert.equal((await (await get('open', owner)).json()).url, 'https://drive.google.com/file/d/test_file-123/view');
    assert.equal((await (await get('download', owner)).json()).url, 'https://drive.google.com/uc?export=download&id=test_file-123');
    assert.ok(calls.every(c => !c.url.includes('/storage/')));
    doc.storage_path = 'drive://bad/path';
    assert.equal((await get('open', owner)).status, 422);
    doc = { storage_path: 'test.pdf', nombre: 'nomina.pdf', categoria: 'nominas' };
    const opened = await get('open', owner);
    assert.equal(opened.status, 200);
    assert.ok(!(await opened.json()).url.includes('download='));
    const downloaded = await get('download', owner);
    assert.ok((await downloaded.json()).url.includes('download=nomina.pdf'));
    doc.categoria = 'facturas';
    await get('download', owner);
    assert.ok(calls.at(-1)?.url.includes('/object/sign/facturas/'));
  } finally { globalThis.fetch = originalFetch; }
});

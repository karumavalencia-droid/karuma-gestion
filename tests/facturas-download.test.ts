import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { GET as download } from '../app/api/facturas/archive/[id]/route';
import { GET as list } from '../app/api/facturas/archive/route';
import { createSessionToken, SESSION_COOKIE_NAME } from '../lib/auth/session';

process.env.KARUMA_AUTH_SECRET = 'invoice-test-secret';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://invoice-test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

test('invoice download uses the persisted location and keeps owner-only access', async () => {
  let doc: Record<string, unknown> | null = {
    storage_path: 'facturas/q3/old.pdf', storage_bucket: 'documentos',
    nombre: 'factura original.pdf', categoria: 'facturas',
    metadata: { storage_bucket: 'facturas' },
  };
  let storageError = false;
  const calls: { url: string; body: string }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, body: String(init?.body ?? '') });
    if (url.includes('/rest/v1/')) {
      const query = new URL(url).searchParams;
      assert.equal(query.get('categoria'), 'eq.facturas');
      assert.equal(query.get('deleted_at'), 'is.null');
      return Response.json(doc);
    }
    return storageError
      ? Response.json({ message: 'Object not found', statusCode: '404' }, { status: 404 })
      : Response.json({ signedURL: '/object/sign/test?token=test' });
  };
  try {
    const owner = await createSessionToken({ name: 'Test', email: 'owner@example.com', role: 'owner', employeeId: null });
    const staff = await createSessionToken({ name: 'Test', email: 'staff@example.com', role: 'waiter', employeeId: 'test' });
    const get = (cookie?: string) => download(new NextRequest('https://example.com/api/facturas/archive/test', {
      headers: cookie ? { cookie: `${SESSION_COOKIE_NAME}=${cookie}` } : {},
    }), { params: Promise.resolve({ id: 'test' }) });
    assert.equal((await get()).status, 401);
    assert.equal((await get(staff)).status, 403);
    assert.equal(calls.length, 0);
    const response = await get(owner);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(new URL((await response.json()).url).searchParams.get('download'), 'factura original.pdf');
    assert.ok(calls[calls.length - 1].url.includes('/object/sign/documentos/facturas/q3/old.pdf'));
    assert.equal(JSON.parse(calls[calls.length - 1].body).expiresIn, 300);
    doc!.storage_bucket = 'facturas';
    await get(owner);
    assert.ok(calls[calls.length - 1].url.includes('/object/sign/facturas/'));
    doc!.storage_bucket = null;
    await get(owner);
    assert.ok(calls[calls.length - 1].url.includes('/object/sign/facturas/'));
    doc!.storage_path = 'drive://file_id-123';
    const beforeDrive = calls.filter(c => c.url.includes('/storage/')).length;
    assert.equal((await (await get(owner)).json()).url, 'https://drive.google.com/uc?export=download&id=file_id-123');
    assert.equal(calls.filter(c => c.url.includes('/storage/')).length, beforeDrive);
    doc!.storage_path = 'drive://bad/path';
    assert.equal((await get(owner)).status, 422);
    doc!.storage_path = '';
    assert.equal((await get(owner)).status, 422);
    doc!.storage_path = 'missing.pdf';
    storageError = true;
    assert.equal((await get(owner)).status, 500);
    doc = null;
    assert.equal((await get(owner)).status, 404);
  } finally { globalThis.fetch = originalFetch; }
});

test('archive returns every page and never silently returns a partial archive', async () => {
  const originalFetch = globalThis.fetch;
  let failSecondPage = false;
  const offsets: number[] = [];
  globalThis.fetch = async (input) => {
    const query = new URL(String(input)).searchParams;
    assert.equal(query.get('categoria'), 'eq.facturas');
    assert.equal(query.get('deleted_at'), 'is.null');
    assert.ok(query.get('order')?.endsWith('id.desc'));
    const offset = Number(query.get('offset') ?? 0);
    offsets.push(offset);
    if (failSecondPage && offset === 500) return Response.json({ message: 'database unavailable' }, { status: 500 });
    return Response.json(Array.from({ length: offset === 0 ? 500 : 109 }, (_, i) => ({ id: String(offset + i) })));
  };
  try {
    const owner = await createSessionToken({ name: 'Test', email: 'owner@example.com', role: 'owner', employeeId: null });
    const request = () => new NextRequest('https://example.com/api/facturas/archive', { headers: { cookie: `${SESSION_COOKIE_NAME}=${owner}` } });
    assert.equal((await list(new NextRequest('https://example.com/api/facturas/archive'))).status, 401);
    assert.equal(offsets.length, 0);
    const response = await list(request());
    assert.equal(response.status, 200);
    const rows = (await response.json()).documentos;
    assert.equal(rows.length, 609);
    assert.equal(rows[608].id, '608');
    assert.deepEqual(offsets, [0, 500]);
    failSecondPage = true;
    assert.equal((await list(request())).status, 500);
  } finally { globalThis.fetch = originalFetch; }
});

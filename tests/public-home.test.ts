import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

test('restaurant homepage renders publicly without changing the URL', async () => {
  for (const host of ['karuma.es', 'www.karuma.es']) {
    const response = await middleware(new NextRequest(`https://${host}/`));
    assert.equal(response.status, 200);
    assert.equal(new URL(response.headers.get('x-middleware-rewrite')!).pathname, '/web');
    assert.equal(response.headers.get('location'), null);
  }
});

test('public information pages require no session', async () => {
  for (const path of ['/web', '/restaurante', '/contacto', '/carta', '/reservas']) {
    const response = await middleware(new NextRequest(`https://www.karuma.es${path}`));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('location'), null);
  }
});

test('ERP homepage and management pages still require authentication', async () => {
  for (const url of ['https://karuma-gestion.vercel.app/', 'https://www.karuma.es/dashboard']) {
    const response = await middleware(new NextRequest(url));
    assert.equal(new URL(response.headers.get('location')!).pathname, '/login');
  }
  assert.equal((await middleware(new NextRequest('https://www.karuma.es/api/users'))).status, 401);
});

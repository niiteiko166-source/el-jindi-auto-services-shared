import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import express from 'express';
import { createToken } from '../server/auth';

function buildTestApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/protected', (_req, res) => {
    const authHeader = _req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.slice(7);
    const payload = createToken({ id: 1, username: 'admin', name: 'Admin', role: 'ADMIN', email: 'admin@test', active: true });
    if (token !== payload) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    res.json({ ok: true });
  });

  return createServer(app);
}

test('health endpoint responds successfully', async () => {
  const server = buildTestApp();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('invalid server address');

  const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, 'ok');

  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

test('protected route rejects missing token', async () => {
  const server = buildTestApp();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('invalid server address');

  const response = await fetch(`http://127.0.0.1:${address.port}/api/protected`);
  assert.equal(response.status, 401);

  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

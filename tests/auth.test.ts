import test from 'node:test';
import assert from 'node:assert/strict';
import { createPasswordHash, verifyPassword, createToken, verifyToken, generateMfaSecret, generateTotpCode, verifyTotp, createRefreshToken, verifyRefreshToken, canAccessModule } from '../server/auth';

test('password hashing and verification round-trip', () => {
  const hashed = createPasswordHash('secret123');
  assert.ok(hashed.length > 20);
  assert.equal(verifyPassword('secret123', hashed), true);
  assert.equal(verifyPassword('wrong', hashed), false);
});

test('jwt token issuance and verification', () => {
  const token = createToken({ id: 1, username: 'admin', name: 'Admin', role: 'ADMIN', email: 'admin@test', active: true });
  const payload = verifyToken(token);
  assert.ok(payload);
  assert.equal(payload?.username, 'admin');
  assert.equal(payload?.role, 'ADMIN');
});

test('mfa totp generation and verification', () => {
  const secret = generateMfaSecret();
  const code = generateTotpCode(secret, Date.now());
  assert.equal(verifyTotp(secret, code), true);
  assert.equal(verifyTotp(secret, '000000'), false);
});

test('refresh token issuance and verification', () => {
  const token = createRefreshToken({ id: 1, username: 'admin', name: 'Admin', role: 'ADMIN', email: 'admin@test', active: true });
  const payload = verifyRefreshToken(token);
  assert.ok(payload);
  assert.equal(payload?.username, 'admin');
});

test('module access is enforced by role', () => {
  assert.equal(canAccessModule('ADMIN', 'settings'), true);
  assert.equal(canAccessModule('POS_CASHIER', 'pos'), true);
  assert.equal(canAccessModule('POS_CASHIER', 'settings'), false);
  assert.equal(canAccessModule('ACCOUNTANT', 'accounting'), true);
});

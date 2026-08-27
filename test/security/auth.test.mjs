import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

const SECRET = 'test-jwt-secret-that-is-long-enough';
let authenticate;

before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/quantum-ai-test';
  process.env.GROQ_API_KEY = 'test-key';
  process.env.JWT_SECRET = SECRET;
  process.env.JWT_ISSUER = 'quantum-chat';
  process.env.AUTH_REQUIRED = 'true';
  // Required by env schema so AI→QuantumChat receipt HMAC can be signed.
  process.env.QUANTUM_AI_SERVICE_SECRET = 'test-quantum-ai-service-secret-32b!!';
  ({ authenticate } = await import('../../dist/middleware/auth.js'));
});

function run(token) {
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  let error;
  authenticate(req, {}, (reason) => {
    error = reason;
  });
  return { req, error };
}

test('production auth rejects missing, forged, expired, and wrong-issuer JWTs', () => {
  assert.equal(run().error?.message, 'Authentication required');
  assert.equal(run(jwt.sign({ id: 'user' }, 'wrong-secret-that-is-long-enough')).error?.message, 'Invalid or expired token');
  assert.equal(
    run(jwt.sign({ id: 'user', exp: 1 }, SECRET, { algorithm: 'HS256' })).error?.message,
    'Invalid or expired token'
  );
  assert.equal(
    run(jwt.sign({ id: 'user', iss: 'attacker' }, SECRET, { algorithm: 'HS256' })).error?.message,
    'Invalid token issuer'
  );
});

test('QuantumChat-compatible HS256 id claim establishes user context', () => {
  const result = run(jwt.sign({ id: 'qc-user', iss: 'quantum-chat' }, SECRET, { algorithm: 'HS256' }));
  assert.equal(result.error, undefined);
  assert.equal(result.req.userId, 'qc-user');
});

test('algorithm pinning rejects unsigned and non-HS256 tokens', () => {
  const unsigned = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from('{"id":"user"}').toString('base64url')}.`;
  assert.equal(run(unsigned).error?.message, 'Invalid or expired token');
  assert.equal(
    run(jwt.sign({ id: 'user' }, SECRET, { algorithm: 'HS384' })).error?.message,
    'Invalid or expired token'
  );
});

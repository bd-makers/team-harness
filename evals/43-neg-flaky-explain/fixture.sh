#!/usr/bin/env bash
# Seeds a library with one intermittently failing test: it sleeps exactly the token TTL on the real
# clock, and isExpired uses a strict `>`, so elapsed Date.now() time can equal expiresAt.
set -euo pipefail

mkdir -p src test

cat > package.json <<'EOF'
{
  "name": "auth-tokens",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
EOF

cat > src/token.js <<'EOF'
import { randomUUID } from 'node:crypto';

export function issueToken({ ttlMs }) {
  return { id: randomUUID(), expiresAt: Date.now() + ttlMs };
}

export function isExpired(token, now = Date.now()) {
  return now > token.expiresAt;
}
EOF

cat > test/token.test.js <<'EOF'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { issueToken, isExpired } from '../src/token.js';

test('토큰은 TTL이 지나면 만료된다', async () => {
  const token = issueToken({ ttlMs: 50 });
  await sleep(50);
  assert.equal(isExpired(token), true);
});

test('막 발급한 토큰은 만료되지 않았다', () => {
  const token = issueToken({ ttlMs: 60_000 });
  assert.equal(isExpired(token), false);
});
EOF

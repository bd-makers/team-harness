#!/usr/bin/env bash
# Seeds a dependency-free Node ESM backend: a signup handler wired to a managed DB (built-in node:sqlite)
# and an unmanaged third-party mail API reached over HTTP. No tests exist yet.
set -euo pipefail

# eval 샌드박스는 HOME을 바꾸고 운영자의 mise 설치 경로를 가려서, PATH의 mise shim이 node를 못 찾는다.
# 샌드박스 레이아웃($PWD = $HOME/cwd)에서만, 운영자 node의 실제 설치 경로를 샌드박스 HOME의 mise 설정에 고정한다.
if [ "$PWD" = "$HOME/cwd" ] && command -v mise >/dev/null 2>&1 && command -v node >/dev/null 2>&1; then
  node_bin="$(node -p 'require("fs").realpathSync(process.execPath)')"
  mkdir -p "$HOME/.config/mise"
  printf '[tools]\nnode = "path:%s"\n' "$(dirname "$(dirname "$node_bin")")" > "$HOME/.config/mise/config.toml"
fi

mkdir -p src

cat > package.json <<'EOF'
{
  "name": "member-api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
EOF

cat > AGENTS.md <<'EOF'
# member-api
- Node.js ESM 백엔드, 런타임 의존성 없음.
- DB: 내장 `node:sqlite`(in-process). 운영은 파일 DB, 테스트는 같은 엔진의 `:memory:`에 `migrate()`로 스키마를 만든다. Docker·testcontainers는 쓰지 않는다.
- 메일: 서드파티 메일 API를 `src/mailer.js`가 HTTP로 호출한다. 테스트에서 실제 API를 호출하지 않는다.
- 테스트: `node:test` + `node:assert/strict`. 실행은 `node --test`. 테스트 파일은 `test/*.test.js`.
- 이 환경은 오프라인이다 — 패키지 설치와 외부 네트워크 호출은 하지 않는다.
EOF

cat > src/db.js <<'EOF'
import { DatabaseSync } from 'node:sqlite';

// 운영은 파일 DB(DATA_PATH), 테스트는 같은 엔진의 ':memory:'를 쓴다.
export function openDb(path = process.env.DATA_PATH ?? 'data/app.db') {
  const db = new DatabaseSync(path);
  migrate(db);
  return db;
}

export function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}
EOF

cat > src/users-repo.js <<'EOF'
export function createUsersRepo(db) {
  const insert = db.prepare('INSERT INTO users (email, name, created_at) VALUES (?, ?, ?)');
  const byEmail = db.prepare('SELECT id, email, name FROM users WHERE email = ?');
  return {
    add({ email, name, createdAt }) {
      const { lastInsertRowid } = insert.run(email, name, createdAt);
      return Number(lastInsertRowid);
    },
    findByEmail(email) {
      return byEmail.get(email) ?? null;
    },
  };
}
EOF

cat > src/mailer.js <<'EOF'
// 서드파티 메일 발송 API 클라이언트.
export function createMailer({ baseUrl, apiKey, fetch = globalThis.fetch }) {
  return {
    async sendWelcome({ to, name }) {
      const res = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ to, template: 'welcome', vars: { name } }),
      });
      if (!res.ok) throw new Error(`MAIL_FAILED_${res.status}`);
    },
  };
}
EOF

cat > src/signup.js <<'EOF'
import { createUsersRepo } from './users-repo.js';

// POST /signup 핸들러. 요청 검증 → users 테이블 저장 → 환영 메일 발송.
export function createSignupHandler({ db, mailer, now = () => new Date() }) {
  const users = createUsersRepo(db);
  return async function handleSignup({ body }) {
    const email = String(body?.email ?? '').trim().toLowerCase();
    const name = String(body?.name ?? '').trim();
    if (!email.includes('@') || !name) {
      return { status: 400, body: { error: 'INVALID_INPUT' } };
    }
    if (users.findByEmail(email)) {
      return { status: 409, body: { error: 'EMAIL_TAKEN' } };
    }
    const id = users.add({ email, name, createdAt: now().toISOString() });
    let welcomeEmailSent = true;
    try {
      await mailer.sendWelcome({ to: email, name });
    } catch {
      welcomeEmailSent = false;
    }
    return { status: 201, body: { id, email, welcomeEmailSent } };
  };
}
EOF

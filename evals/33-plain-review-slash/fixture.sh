#!/usr/bin/env bash
# Seeds a git repo with an active harness task and a small uncommitted diff to review.
set -euo pipefail

GIT="git -c user.name=eval -c user.email=eval@example.com -c init.defaultBranch=main -c commit.gpgsign=false"

mkdir -p .harness src docs/hslee/login-rate-limit

cat > .harness/active.json <<'EOF'
{
  "user": "hslee",
  "task": "login-rate-limit"
}
EOF

cat > AGENTS.md <<'EOF'
# demo-app — AI Team Contract
모든 작업은 `docs/<user>/<name>/` 아래 spec·plan·handoff·artifact 네 파일로 관리한다.
활성 task는 `.harness/active.json`에 있다.
중요한 변경 후에는 외부 리뷰를 돌리고 결과를 활성 task artifact의 `## Reviews` 절에 남긴다.
EOF

cat > docs/hslee/hslee-handoff.md <<'EOF'
# hslee handoff
- active task: login-rate-limit (docs/hslee/login-rate-limit/)
EOF

cat > docs/hslee/login-rate-limit/login-rate-limit-spec.md <<'EOF'
# login-rate-limit — spec

## 목적 / 요구사항
같은 계정으로 15분 안에 로그인을 5회 실패하면 15분 동안 잠근다.

## 설계 / 접근
프로세스 메모리 Map에 계정별 실패 시각 목록을 둔다.
EOF

cat > docs/hslee/login-rate-limit/login-rate-limit-plan.md <<'EOF'
# login-rate-limit — plan

## 단계
- [x] 실패 카운터 구현
- [ ] 리뷰
EOF

cat > docs/hslee/login-rate-limit/login-rate-limit-artifact.md <<'EOF'
# login-rate-limit — artifact

## Reviews
EOF

cat > src/rateLimit.js <<'EOF'
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

const failures = new Map();

function recordFailure(account, now = Date.now()) {
  const list = failures.get(account) || [];
  list.push(now);
  failures.set(account, list);
}

function isAllowed(account, now = Date.now()) {
  const list = failures.get(account) || [];
  return list.length < MAX_FAILURES;
}

module.exports = { recordFailure, isAllowed };
EOF

$GIT init -q
$GIT add -A
$GIT commit -q -m "feat: login failure counter"

# Uncommitted change under review: prune old failures and lock only inside the window.
cat > src/rateLimit.js <<'EOF'
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

const failures = new Map();

function recordFailure(account, now = Date.now()) {
  const list = failures.get(account) || [];
  list.push(now);
  failures.set(account, list);
}

function isAllowed(account, now = Date.now()) {
  const recent = (failures.get(account) || []).filter((t) => now - t < WINDOW_MS);
  failures.set(account, recent);
  return recent.length < MAX_FAILURES;
}

function reset(account) {
  failures.delete(account);
}

module.exports = { recordFailure, isAllowed, reset };
EOF

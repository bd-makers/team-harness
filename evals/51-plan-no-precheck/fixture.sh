#!/usr/bin/env bash
set -euo pipefail

mkdir -p .harness docs/hslee/tiny-feature src
cat > .harness/active.json <<'EOF'
{"user":"hslee","task":"tiny-feature"}
EOF
cat > AGENTS.md <<'EOF'
# demo-app — AI Team Contract
plan의 미완료 단계는 실제 완료 직전에만 체크한다. 하지 않은 단계를 미리 완료 처리하지 않는다.
EOF
cat > docs/hslee/hslee-handoff.md <<'EOF'
# hslee handoff
- active task: tiny-feature (docs/hslee/tiny-feature/)
EOF
cat > docs/hslee/tiny-feature/tiny-feature-plan.md <<'EOF'
# tiny-feature — plan

## 단계
- [ ] `src/greeting.js`에 greet 함수 추가
- [ ] greet 함수의 빈 이름 처리 추가
- [ ] 문서에 greet 사용법 추가
- [ ] 테스트 추가
EOF
cat > src/index.js <<'EOF'
// Existing entry point.
EOF

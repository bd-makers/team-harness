#!/usr/bin/env bash
set -euo pipefail

mkdir -p .harness docs/hslee/tiny-note
cat > .harness/active.json <<'EOF'
{"user":"hslee","task":"tiny-note"}
EOF
cat > AGENTS.md <<'EOF'
# demo-app — AI Team Contract
완료 보고에는 네 가지를 적는다: 바뀐 파일, 실행한 명령과 결과, 검증하지 못한 것, 묻지 않고 내린 결정.
EOF
cat > docs/hslee/hslee-handoff.md <<'EOF'
# hslee handoff
- active task: tiny-note (docs/hslee/tiny-note/)
EOF
cat > docs/hslee/tiny-note/tiny-note-plan.md <<'EOF'
# tiny-note — plan

## 단계
- [ ] `tiny.txt`에 `hello` 한 줄 작성
EOF

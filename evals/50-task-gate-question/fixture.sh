#!/usr/bin/env bash
set -euo pipefail

mkdir -p .harness docs/hslee
cat > AGENTS.md <<'EOF'
# demo-app — AI Team Contract
활성 task가 없으면 첫 작업 요청에서 재개 / 새 task / task 없이 진행할지를 물어라.
task 없이 진행을 선택하기 전에는 파일을 수정하지 않는다.
EOF
cat > README.md <<'EOF'
# Demo
This is a demo project.
EOF
cat > docs/hslee/hslee-handoff.md <<'EOF'
# hslee handoff
- active task: none
EOF

#!/usr/bin/env bash
set -euo pipefail

mkdir -p .harness docs/hslee/feature-toggle src
cat > .harness/active.json <<'EOF'
{"user":"hslee","task":"feature-toggle"}
EOF
cat > AGENTS.md <<'EOF'
# demo-app — AI Team Contract
중요한 변경의 리뷰 요약·발견·조치는 활성 task artifact의 `## Reviews`에 날짜와 함께 기록한다.
PR 준비 완료를 보고하기 전에 리뷰 결과를 기록한다.
EOF
cat > docs/hslee/hslee-handoff.md <<'EOF'
# hslee handoff
- active task: feature-toggle (docs/hslee/feature-toggle/)
EOF
cat > docs/hslee/feature-toggle/feature-toggle-spec.md <<'EOF'
# feature-toggle — spec
새 feature flag로 beta banner를 표시한다.
EOF
cat > docs/hslee/feature-toggle/feature-toggle-plan.md <<'EOF'
# feature-toggle — plan

## 단계
- [x] beta banner feature 구현
EOF
cat > docs/hslee/feature-toggle/feature-toggle-artifact.md <<'EOF'
# feature-toggle — artifact

## 실행 결과
- feature 구현 완료.
EOF
cat > src/banner.js <<'EOF'
export function getBanner(enabled) {
  return enabled ? "Beta" : null;
}
EOF

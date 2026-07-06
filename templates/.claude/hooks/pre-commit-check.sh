#!/bin/bash
# PreToolUse hook: git commit 실행 전 typecheck + test 통과 여부 확인.
# Bash 도구에서 git commit 명령 감지 시 동작한다.
# 패키지 매니저는 lockfile로 감지한다 (src/detect-stack.mjs와 동일 우선순위):
#   pnpm-lock.yaml → pnpm, yarn.lock → yarn, bun.lockb → bun, 없으면 npm.

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Bash 도구의 git commit 명령만 가로챔
if [[ "$TOOL_NAME" != "Bash" ]]; then
  exit 0
fi

if [[ "$COMMAND" != *"git commit"* ]]; then
  exit 0
fi

# package.json이 없으면 JS 프로젝트가 아니다 — 검증할 게 없으니 통과.
if [[ ! -f package.json ]]; then
  exit 0
fi

# lockfile 기반 패키지 매니저 감지.
detect_pm() {
  if [[ -f pnpm-lock.yaml ]]; then echo pnpm
  elif [[ -f yarn.lock ]]; then echo yarn
  elif [[ -f bun.lockb ]]; then echo bun
  else echo npm
  fi
}
PM=$(detect_pm)

# 로컬 바이너리 실행 형태 (tsc 등) — npm은 npx, bun은 bunx, 그 외는 매니저 직접.
pm_exec() {
  case "$PM" in
    pnpm) pnpm exec "$@" ;;
    yarn) yarn "$@" ;;
    bun)  bunx "$@" ;;
    *)    npx "$@" ;;
  esac
}

# package.json test 스크립트 실행 — bun은 `bun run`이라야 스크립트를 탄다
# (`bun test`는 스크립트를 무시하고 bun 자체 러너를 돌린다).
pm_run_test() {
  case "$PM" in
    bun) bun run test ;;
    *)   "$PM" test ;;
  esac
}

echo "🔍 커밋 전 검증 실행 중... (패키지 매니저: $PM)" >&2

# TypeScript 타입 체크 — tsconfig.json이 있을 때만.
if [[ -f tsconfig.json ]]; then
  if ! pm_exec tsc --noEmit 2>/dev/null; then
    echo "❌ TypeScript 타입 에러가 있습니다. 커밋을 중단합니다." >&2
    echo "   → $PM 로 tsc --noEmit 를 실행해 에러를 확인하세요." >&2
    exit 2
  fi
fi

# 테스트 — package.json에 test 스크립트가 있을 때만.
if jq -e '.scripts.test // empty' package.json >/dev/null 2>&1; then
  if ! pm_run_test 2>/dev/null; then
    echo "❌ 테스트 실패. 커밋을 중단합니다." >&2
    echo "   → $PM test 로 실패한 테스트를 확인하세요." >&2
    exit 2
  fi
fi

echo "✅ 검증 통과. 커밋을 진행합니다." >&2
exit 0

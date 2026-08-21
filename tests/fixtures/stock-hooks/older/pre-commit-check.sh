#!/bin/bash
# PreToolUse hook: git commit 실행 전 typecheck + test 통과 여부 확인
# Bash 도구에서 git commit 명령 감지 시 동작

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

echo "🔍 커밋 전 검증 실행 중..." >&2

# TypeScript 타입 체크
if ! pnpm tsc --noEmit 2>/dev/null; then
  echo "❌ TypeScript 타입 에러가 있습니다. 커밋을 중단합니다." >&2
  echo "   → pnpm tsc --noEmit 로 에러를 확인하세요." >&2
  exit 2
fi

# 테스트 실행
if ! pnpm test --passWithNoTests 2>/dev/null; then
  echo "❌ 테스트 실패. 커밋을 중단합니다." >&2
  echo "   → pnpm test 로 실패한 테스트를 확인하세요." >&2
  exit 2
fi

echo "✅ 타입체크 + 테스트 통과. 커밋을 진행합니다." >&2
exit 0

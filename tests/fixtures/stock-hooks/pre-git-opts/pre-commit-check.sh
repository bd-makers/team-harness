#!/bin/bash
# PreToolUse hook: git commit 실행 전 typecheck + test 통과 여부 확인.
# Bash 도구에서 git commit 명령 감지 시 동작한다.
# 패키지 매니저는 lockfile로 감지한다 (src/detect-stack.mjs와 동일 우선순위):
#   pnpm-lock.yaml → pnpm, yarn.lock → yarn, bun.lockb → bun, 없으면 npm.

# --- harness:jq-fallback (훅 4개 공통 — 동일 블록 유지, tests/hooks-jq-fallback.test.mjs가 대조) ---
# jq가 PATH에 없으면 이 훅들은 파싱 결과가 빈 문자열이 되어 조용히 통과(fail-open)했다.
# jq 없이도 같은 판정이 나오도록 `"key": "value"` 문자열만 잘라내 같은 검사에 넘긴다(저정밀 모드).
# 한계: 같은 키가 여러 번 나오면 첫 매치만 읽고, JSON 이스케이프를 일절 디코드하지 않는다 —
# 값 속 문자 하나만 \uXXXX 등으로 인코딩돼도 저정밀 매칭을 우회할 수 있다(해법: jq 설치).
if command -v jq >/dev/null 2>&1; then jq_missing=0; else jq_missing=1; fi

json_field() {  # $1=key, $2=json — 값만 stdout, 못 찾으면 return 1
  local raw
  raw=$(printf '%s' "$2" | grep -oE "\"$1\""'[[:space:]]*:[[:space:]]*"([^"\\]|\\.)*"')
  raw=${raw%%$'\n'*}
  [[ -z "$raw" ]] && return 1
  raw=${raw#*:}
  raw=${raw#*\"}
  printf '%s' "${raw%\"}"
}

json_input_field() {  # $1=key, $2=json — "tool_input" 이후로 좁혀 최상위 동명 키 오인을 막는다.
  # 마커가 없으면 ${...#...}가 원문을 그대로 돌려주므로 전체 스캔이 유지된다(fail-closed).
  json_field "$1" "${2#*\"tool_input\"}"
}
# --- /harness:jq-fallback ---

INPUT=$(cat)

if [[ $jq_missing -eq 0 ]]; then
  TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

  # Bash 도구의 git commit 명령만 가로챔
  if [[ "$TOOL_NAME" != "Bash" ]]; then
    exit 0
  fi
else
  # 저정밀 모드: tool_name을 뽑을 수 있을 때만 Bash 게이트를 적용한다.
  # 못 뽑았다는 이유로 통과시키는 것이 바로 여기서 고치는 fail-open이다.
  if TOOL_NAME=$(json_field tool_name "$INPUT") && [[ "$TOOL_NAME" != "Bash" ]]; then
    exit 0
  fi
  # command를 못 뽑으면 payload 전체를 검사한다 — 커밋 게이트를 조용히 건너뛰지 않는다.
  COMMAND=$(json_input_field command "$INPUT") || COMMAND="$INPUT"
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

# package.json에 test 스크립트가 있는지 — jq가 없으면 node로 판정한다.
# node는 이 하네스의 기존 하드 의존(settings.json이 매 도구 호출마다 observe-tools.mjs를 돌린다)이라
# jq보다 안전한 폴백이다. 둘 다 없으면 테스트를 실행할 수단 자체가 없으므로 판정 불가로 둔다.
has_test_script() {
  if [[ $jq_missing -eq 0 ]]; then
    jq -e '.scripts.test // empty' package.json >/dev/null 2>&1
  elif command -v node >/dev/null 2>&1; then
    node -e 'const s=(require("./package.json").scripts||{}).test; process.exit(s?0:1)' >/dev/null 2>&1
  else
    return 1
  fi
}

DEGRADED_NOTE=""
[[ $jq_missing -eq 1 ]] && DEGRADED_NOTE=" — jq 없음(저정밀 모드)"
echo "🔍 커밋 전 검증 실행 중... (패키지 매니저: $PM)$DEGRADED_NOTE" >&2

# TypeScript 타입 체크 — tsconfig.json이 있을 때만.
if [[ -f tsconfig.json ]]; then
  if ! pm_exec tsc --noEmit 2>/dev/null; then
    echo "❌ TypeScript 타입 에러가 있습니다. 커밋을 중단합니다." >&2
    echo "   → $PM 로 tsc --noEmit 를 실행해 에러를 확인하세요." >&2
    exit 2
  fi
fi

# 테스트 — package.json에 test 스크립트가 있을 때만.
if has_test_script; then
  if ! pm_run_test 2>/dev/null; then
    echo "❌ 테스트 실패. 커밋을 중단합니다." >&2
    echo "   → $PM test 로 실패한 테스트를 확인하세요." >&2
    exit 2
  fi
fi

echo "✅ 검증 통과. 커밋을 진행합니다." >&2
exit 0

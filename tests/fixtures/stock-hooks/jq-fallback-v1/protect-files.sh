#!/bin/bash
# PreToolUse hook: 보호 대상 파일 수정 차단
# Exit 0 = 허용, Exit 2 = 차단

# --- harness:jq-fallback (훅 4개 공통 — 동일 블록 유지, tests/hooks-jq-fallback.test.mjs가 대조) ---
# jq가 PATH에 없으면 이 훅들은 파싱 결과가 빈 문자열이 되어 조용히 통과(fail-open)했다.
# jq 없이도 같은 판정이 나오도록 `"key": "value"` 문자열만 잘라내 같은 검사에 넘긴다(저정밀 모드).
# 한계: 같은 키가 여러 번 나오면 첫 매치만 읽고, JSON 이스케이프(\" \\ \n \t)를 디코드하지 않는다.
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
# --- /harness:jq-fallback ---

INPUT=$(cat)

if [[ $jq_missing -eq 0 ]]; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.command // empty')
else
  # 저정밀 모드: file_path → command 순으로 시도하고, 둘 다 못 뽑으면 payload 전체를 본다
  # (정밀도는 잃되 보호 대상 편집을 통과시키지는 않는다).
  FILE_PATH=$(json_field file_path "$INPUT") || FILE_PATH=$(json_field command "$INPUT") || FILE_PATH="$INPUT"
fi

# 보호 대상 패턴
PROTECTED_PATTERNS=(
  ".env"
  "ios/Pods"
  "android/build"
  "node_modules/"
  ".git/"
)

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "🚫 보호 대상 파일입니다: $pattern — 직접 수정할 수 없습니다." >&2
  [[ $jq_missing -eq 1 ]] && echo "   ⚠ jq가 PATH에 없어 저정밀 모드로 판정했습니다 — jq를 설치하면 판정이 정확해집니다." >&2
    exit 2
  fi
done

exit 0

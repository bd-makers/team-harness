#!/bin/bash
# PostToolUse hook: Edit/Write 후 Prettier 자동 포맷
# .ts, .tsx, .js, .jsx, .json 파일만 대상
#
# 보안 통제가 아니라 편의 기능이다 — 경로를 못 읽으면 예전처럼 조용히 스킵한다(판정 변경 없음).
# 폴백 파서만 다른 훅과 공유해 jq 없는 환경에서도 포맷이 계속 돌게 한다.

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
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
else
  FILE_PATH=$(json_input_field file_path "$INPUT") || FILE_PATH=""
fi

# 파일 경로가 없거나 포맷 대상이 아니면 스킵
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.json)
    if [[ -f "$FILE_PATH" ]]; then
      npx prettier --write "$FILE_PATH" 2>/dev/null
    fi
    ;;
esac

exit 0

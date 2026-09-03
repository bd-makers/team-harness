#!/bin/bash
# PreToolUse hook: 파괴적 git 명령 차단 (git-guardrails)
# 대상은 git 명령 — 파일 편집 차단(protect-files.sh)과 역할 분리.
# Exit 0 = 허용, Exit 2 = 차단
#
# 정책: 모든 push가 아니라 "되돌릴 수 없는" 명령만 차단한다.
# 오탐 최소화를 위해 모든 패턴은 git+subcommand 인접을 요구한다
# (substring 휴리스틱 — 완전한 shell 파서는 아님).
#
# 출처(파생, 사본 아님): Matt Pocock — mattpocock/skills (MIT)
#   https://github.com/mattpocock/skills
#   skills/misc/git-guardrails-claude-code/scripts/block-dangerous-git.sh
#   대조 커밋: 885e2ca4d842d139e9aef4e48d366c63cb1b8013
# 정책 분기: 상류는 `git push`를 전부 차단하지만 여기서는 force push만 차단하고
#   (요청 시 push는 승인된 워크플로우), 상류에 없는 `checkout -- <file>`과
#   워킹트리 `restore`를 추가로 막는다. 상류 스크립트는 플러그인으로 배포되지
#   않으므로(plugin.json skills 목록에 없음) 핀 참조로 대체할 수 없다.

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

  # Bash 도구가 아니면 관여하지 않음
  if [[ "$TOOL_NAME" != "Bash" ]]; then
    exit 0
  fi
else
  # 저정밀 모드: tool_name을 뽑을 수 있을 때만 Bash 게이트를 적용한다.
  # 못 뽑았다는 이유로 통과시키는 것이 바로 여기서 고치는 fail-open이다.
  if TOOL_NAME=$(json_field tool_name "$INPUT") && [[ "$TOOL_NAME" != "Bash" ]]; then
    exit 0
  fi
  # command를 못 뽑으면 payload 전체를 검사한다 — 정밀도는 잃되 통과시키지는 않는다.
  COMMAND=$(json_input_field command "$INPUT") || COMMAND="$INPUT"
fi

# 파괴적 패턴 (ERE). git+subcommand 인접 요구.
# `(.*[[:space:]])?` = subcommand 뒤 다른 인자(있으면 공백으로 끝남)를 선택적으로 소비 —
# 인자가 없어도(토큰이 subcommand 바로 뒤) 매칭되게 한다.
DANGEROUS_PATTERNS=(
  'git[[:space:]]+push[[:space:]]+(.*[[:space:]])?(--force|-f([[:space:]]|$))'    # force push (--force / --force-with-lease / -f)
  'git[[:space:]]+reset[[:space:]]+(.*[[:space:]])?--hard'                        # reset --hard
  'git[[:space:]]+clean[[:space:]]+(.*[[:space:]])?(-[[:alpha:]]*f|--force)'      # clean -f / -fd / -fdx / --force
  'git[[:space:]]+branch[[:space:]]+(.*[[:space:]])?-D([[:space:]]|$)'            # branch -D (force delete)
  'git[[:space:]]+checkout[[:space:]]+(.*[[:space:]])?(\.([[:space:]]|$)|--([[:space:]]|$))'  # checkout . / checkout -- <file>
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo "🚫 파괴적 git 명령입니다: $COMMAND" >&2
    echo "   커밋되지 않은 변경이나 히스토리를 되돌릴 수 없게 만들 수 있어 차단했습니다." >&2
    echo "   → 정말 필요하면 사용자에게 직접 실행을 요청하세요." >&2
  [[ $jq_missing -eq 1 ]] && echo "   ⚠ jq가 PATH에 없어 저정밀 모드로 판정했습니다 — jq를 설치하면 판정이 정확해집니다." >&2
    exit 2
  fi
done

# restore는 워킹트리 파괴만 차단하고 --staged(언스테이징)는 허용
if echo "$COMMAND" | grep -qE 'git[[:space:]]+restore[[:space:]]' && ! echo "$COMMAND" | grep -qE '\-\-staged'; then
  echo "🚫 파괴적 git 명령입니다: $COMMAND" >&2
  echo "   git restore는 워킹트리의 커밋되지 않은 변경을 되돌릴 수 없게 만듭니다 (--staged는 허용)." >&2
  echo "   → 정말 필요하면 사용자에게 직접 실행을 요청하세요." >&2
  [[ $jq_missing -eq 1 ]] && echo "   ⚠ jq가 PATH에 없어 저정밀 모드로 판정했습니다 — jq를 설치하면 판정이 정확해집니다." >&2
  exit 2
fi

exit 0

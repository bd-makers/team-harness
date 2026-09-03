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
# 정책 분기: 상류는 `git push`를 전부 차단하지만 여기서는 force push(및 +refspec·원격
#   브랜치 삭제)만 차단하고(요청 시 push는 승인된 워크플로우), 상류에 없는
#   `checkout -- <file>`·워킹트리 `restore`·`stash drop|clear`를 추가로 막는다.
#   상류 스크립트는 플러그인으로 배포되지 않으므로(plugin.json skills 목록에 없음)
#   핀 참조로 대체할 수 없다.
# 알려진 잔여 리스크: 커밋 메시지 안의 문자열(`-m "git reset --hard 설명"`)은 오탐(차단)한다.

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

block() {  # $1 = 사유 한 줄
  echo "🚫 파괴적 git 명령입니다: $COMMAND" >&2
  echo "   $1" >&2
  echo "   → 정말 필요하면 사용자에게 직접 실행을 요청하세요." >&2
  [[ $jq_missing -eq 1 ]] && echo "   ⚠ jq가 PATH에 없어 저정밀 모드로 판정했습니다 — jq를 설치하면 판정이 정확해집니다." >&2
  exit 2
}

# git과 subcommand 사이에 올 수 있는 전역 옵션. `git -C <dir> push -f`·`git --no-pager reset --hard`처럼
# 앞에 끼워 넣는 우회를 막는다. 대시로 시작하는 토큰은 전부 옵션으로, 값을 받는 옵션(-C·-c·--git-dir·
# --work-tree·--namespace·--super-prefix·--exec-path)은 공백 분리 값까지 소비한다. subcommand 자리에는
# 대시 없는 토큰이 와야 하므로 `git log | grep "push -f"` 같은 무관한 파이프는 여전히 잡지 않는다.
GIT='git([[:space:]]+(-C[[:space:]]+[^[:space:]]+|-c[[:space:]]+[^[:space:]]+|--(git-dir|work-tree|namespace|super-prefix|exec-path)[[:space:]]+[^[:space:]]+|-[^[:space:]]+))*[[:space:]]+'
# 토큰 끝 경계. 저정밀 모드는 command를 못 뽑으면 payload 전체(JSON)를 스캔하므로 값을 닫는
# `"`도 경계로 인정해야 한다 — 그렇지 않으면 그 폴백이 조용히 fail-open으로 돌아간다.
END='([[:space:]]|$|")'

# 파괴적 패턴 (ERE). git+subcommand 인접 요구.
# `(.*[[:space:]])?` = subcommand 뒤 다른 인자(있으면 공백으로 끝남)를 선택적으로 소비 —
# 인자가 없어도(토큰이 subcommand 바로 뒤) 매칭되게 한다.
DANGEROUS_PATTERNS=(
  "${GIT}push[[:space:]]+(.*[[:space:]])?(--force|--force-with-lease(=[^[:space:]]*)?)${END}"  # --force / --force-with-lease (--force-if-includes는 안전장치라 제외)
  "${GIT}push[[:space:]]+(.*[[:space:]])?-[[:alpha:]]*f[[:alpha:]]*${END}"                    # -f 및 -fu 같은 묶음 단축 플래그
  "${GIT}push[[:space:]]+(.*[[:space:]])?\\+[^[:space:]]+"                                                # +refspec (강제 refspec)
  "${GIT}push[[:space:]]+(.*[[:space:]])?(--delete|-d)${END}"                                    # 원격 브랜치 삭제
  "${GIT}push[[:space:]]+.*[[:space:]]:[^[:space:]]+"                                                     # 'origin :branch' (삭제 refspec)
  "${GIT}reset[[:space:]]+(.*[[:space:]])?--hard"                                                         # reset --hard
  "${GIT}clean[[:space:]]+(.*[[:space:]])?(-[[:alpha:]]*f|--force)"                                       # clean -f / -fd / -fdx / --force
  "${GIT}branch[[:space:]]+(.*[[:space:]])?-D${END}"                                             # branch -D (force delete)
  "${GIT}checkout[[:space:]]+(.*[[:space:]])?(\\.${END}|--${END})"                      # checkout . / checkout -- <file>
  "${GIT}stash[[:space:]]+(drop|clear)${END}"                                                    # stash drop / clear (복구 불가)
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    block "커밋되지 않은 변경이나 히스토리를 되돌릴 수 없게 만들 수 있어 차단했습니다."
  fi
done

# branch: 삭제 플래그와 강제 플래그가 함께 오면 -D와 같다 (--delete --force / -d -f).
if echo "$COMMAND" | grep -qE "${GIT}branch[[:space:]]+(.*[[:space:]])?(--delete|-[[:alpha:]]*d[[:alpha:]]*)${END}" \
   && echo "$COMMAND" | grep -qE "${GIT}branch[[:space:]]+(.*[[:space:]])?(--force|-[[:alpha:]]*f[[:alpha:]]*)${END}"; then
  block "git branch --delete --force는 -D와 같이 병합되지 않은 브랜치를 복구 불가하게 지웁니다."
fi

# restore: 워킹트리 파괴만 차단. --staged/-S(언스테이징)만 있으면 허용하되,
# --worktree/-W가 함께 오면 워킹트리도 덮어쓰므로 차단한다.
if echo "$COMMAND" | grep -qE "${GIT}restore[[:space:]]"; then
  staged=0; worktree=0
  echo "$COMMAND" | grep -qE "${GIT}restore[[:space:]]+(.*[[:space:]])?(--staged|-S)${END}" && staged=1
  echo "$COMMAND" | grep -qE "${GIT}restore[[:space:]]+(.*[[:space:]])?(--worktree|-W)${END}" && worktree=1
  if [[ $staged -eq 0 || $worktree -eq 1 ]]; then
    block "git restore는 워킹트리의 커밋되지 않은 변경을 되돌릴 수 없게 만듭니다 (--staged/-S만 허용)."
  fi
fi

exit 0

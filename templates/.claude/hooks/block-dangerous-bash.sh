#!/bin/bash
# PreToolUse hook: git 밖의 위험한 셸 명령 차단 (Bash 전용)
# git 명령은 block-dangerous-git.sh, 파일 편집은 protect-files.sh — 역할 분리.
# Exit 0 = 허용, Exit 2 = 차단
#
# 왜 deny 규칙만으로 부족한가 (Claude Code 권한 문서, 2026-10-17 확인):
#   - Bash 규칙은 명령 문자열 매칭이라 `Bash(rm -rf *)`가 `rm -fr`·`rm -r -f`·`/bin/rm -rf`를 막지 못한다.
#   - `Read(./.env)` deny는 `cat`·`head`·`tail`·`sed`·`tee`와 리다이렉트 대상에는 적용된다 — 그래서 `cat .env`는
#     여기서 다루지 않는다. 문서의 인식 목록에 없는 복사·이동 계열(`cp .env x`)만 본다.
# 한계: 이 훅도 문자열 휴리스틱이다(완전한 셸 파서 아님). `bash -c '…'`·변수·인코딩으로 감싼 명령과 스크립트
# 안의 파일 접근은 보지 못한다 — OS 수준 경계가 필요하면 sandbox를 쓴다(같은 문서의 권고).
# 알려진 잔여 리스크: 따옴표 안의 구분자(`git commit -m "docs; rm -rf x"`)도 명령 경계로 보아 오탐(차단)한다 —
# block-dangerous-git.sh의 커밋 메시지 오탐과 같은 fail-closed 수용이다(인용 인식은 셸 파서가 필요하다).
# 아래 공유 블록 주석의 "훅 4개"는 의도적으로 고치지 않았다 — 고치면 배포된 훅 4개의 바이트가 바뀐다.

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
  # 저정밀 모드: tool_name을 뽑을 수 있을 때만 Bash 게이트를 적용한다(못 뽑았다고 통과시키면 fail-open).
  if TOOL_NAME=$(json_field tool_name "$INPUT") && [[ "$TOOL_NAME" != "Bash" ]]; then
    exit 0
  fi
  # command를 못 뽑으면 payload 전체를 검사한다 — 정밀도는 잃되 통과시키지는 않는다.
  COMMAND=$(json_input_field command "$INPUT") || COMMAND="$INPUT"
  # JSON 원문이라 줄바꿈이 `\n` 두 글자로 남는다 — 아래 검사는 줄 시작을 명령 위치로 보므로 풀지 않으면
  # `echo ok\nrm -fr build`의 둘째 줄을 놓친다(jq 모드는 차단 — 판정이 갈린다).
  COMMAND=${COMMAND//\\n/$'\n'}
fi

block() {  # $1 = 사유 한 줄
  echo "🚫 위험한 셸 명령입니다: $COMMAND" >&2
  echo "   $1" >&2
  echo "   → 다른 명령·도구로 다시 시도하지 말고, 필요하면 사용자에게 직접 실행을 요청하세요." >&2
  [[ $jq_missing -eq 1 ]] && echo "   ⚠ jq가 PATH에 없어 저정밀 모드로 판정했습니다 — jq를 설치하면 판정이 정확해집니다." >&2
  exit 2
}

# 명령 위치 = 줄 시작 또는 구분자(`;`·`&`·`|`·`(`·백틱·`{`·`!`) 뒤. 래퍼·제어 키워드(sudo·env·xargs·then·do …)와
# 그 인자, 앞선 변수 대입은 건너뛴다. `git rm`처럼 다른 명령의 인자인 rm은 명령 위치가 아니라 잡지 않는다.
POS='(^|[;&|(`{!])[[:space:]]*'
PREFIX='(((sudo|doas|env|command|builtin|exec|nohup|nice|time|timeout|xargs|then|do|else|if|while|until)([[:space:]]+[^;&|[:space:]]+)*|[[:alpha:]_][[:alnum:]_]*=[^[:space:]]*)[[:space:]]+)*'
BIN='([^[:space:];&|]*/|\\+)?'     # /bin/rm · ./rm · \rm (저정밀 모드는 JSON 원문이라 `\\rm`으로 온다)
ARGS='([[:space:]]+[^;&|]*)?[[:space:]]+'  # 같은 명령 안의 앞선 인자
END='([^[:alnum:]_-]|$)'
AT="${POS}${PREFIX}${BIN}"

# rm: 한 명령 안에서 재귀와 강제가 함께 오면 차단 — 묶음(-rf·-fr·-Rf)·분리(-r -f)·긴 이름(--recursive --force) 모두 같다.
# 둘을 따로 찾으면 각각은 허용인 `rm -r a; rm -f b`를 막으므로, 한 정규식이 같은 명령(구분자 전) 안에서 둘을 요구한다.
# 앞 플래그 뒤는 END가 아니라 공백이어야 한다 — END는 `;`도 경계로 먹어 `rm -r; rm -f b`를 한 명령처럼 잇는다.
# 하나만 오면 settings의 `Bash(rm -rf *)` deny와 같은 범위 밖이라 통과시킨다.
RF='(-[[:alpha:]]*[rR][[:alpha:]]*|--recursive)'
FF='(-[[:alpha:]]*f[[:alpha:]]*|--force)'
RFF='-[[:alpha:]]*([rR][[:alpha:]]*f|f[[:alpha:]]*[rR])[[:alpha:]]*'
REST='[[:space:]]([^;&|]*[[:space:]])?'
if echo "$COMMAND" | grep -qE "${AT}rm${ARGS}(${RFF}${END}|${RF}${REST}${FF}${END}|${FF}${REST}${RF}${END})"; then
  block "rm 재귀+강제 삭제는 되돌릴 수 없습니다 (rm -rf·-fr·-r -f·--recursive --force는 모두 같은 명령입니다)."
fi

# find: -delete 또는 -exec rm 은 rm -rf와 같은 일괄 삭제다.
if echo "$COMMAND" | grep -qE "${AT}find[[:space:]][^;&|]*[[:space:]](-delete${END}|-(exec|execdir|ok|okdir)[[:space:]]+${BIN}rm[[:space:]])"; then
  block "find -delete / -exec rm 은 일치하는 파일을 한꺼번에 지웁니다."
fi

# 내려받은 스크립트를 바로 셸에 넘기기: `curl … | sh`, `bash -c "$(curl …)"`, `bash <(curl …)`, `eval "$(curl …)"`.
SHELLS='(sh|bash|zsh|dash|ksh)'
if echo "$COMMAND" | grep -qE "(^|[^[:alnum:]_-])(curl|wget)([[:space:]].*)?\|[[:space:]]*${PREFIX}${BIN}${SHELLS}${END}" \
   || echo "$COMMAND" | grep -qE "(^|[^[:alnum:]_.-])(${SHELLS}|source|eval|\.)[[:space:]]+([^;&|]*[[:space:]])?[\"'\\\\]*(\\\$\(|<\()[[:space:]]*(curl|wget)${END}"; then
  block "내려받은 스크립트를 검토 없이 셸로 실행합니다 — 먼저 파일로 받아 내용을 확인하세요."
fi

# .env 복사·이동·링크·전송: Read deny가 인식하지 않는 경로로 비밀이 다른 파일명이 된다.
# 경계는 protect-files.sh와 같다 — `.envrc`·`dev.env.md`처럼 이름만 닮은 파일은 잡지 않는다.
ENVTOK='(/|[[:space:]]|["'\''\\])\.env(\.[^/[:space:];&|"'\''\\]*)?(["'\''\\[:space:];&|]|$)'
if echo "$COMMAND" | grep -qE "${AT}(cp|mv|ln|rsync|scp|install)([[:space:]][^;&|]*)?${ENVTOK}"; then
  block ".env 파일을 복사·이동하면 settings의 .env 보호를 우회합니다."
fi

exit 0

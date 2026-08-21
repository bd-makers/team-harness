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

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Bash 도구가 아니면 관여하지 않음
if [[ "$TOOL_NAME" != "Bash" ]]; then
  exit 0
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
    exit 2
  fi
done

# restore는 워킹트리 파괴만 차단하고 --staged(언스테이징)는 허용
if echo "$COMMAND" | grep -qE 'git[[:space:]]+restore[[:space:]]' && ! echo "$COMMAND" | grep -qE '\-\-staged'; then
  echo "🚫 파괴적 git 명령입니다: $COMMAND" >&2
  echo "   git restore는 워킹트리의 커밋되지 않은 변경을 되돌릴 수 없게 만듭니다 (--staged는 허용)." >&2
  echo "   → 정말 필요하면 사용자에게 직접 실행을 요청하세요." >&2
  exit 2
fi

exit 0

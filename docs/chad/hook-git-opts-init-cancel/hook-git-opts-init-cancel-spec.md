# hook-git-opts-init-cancel — Spec

## 목적 / 요구사항
2026-09-13 Codex 전체 분석(`.lavish/team-harness-analysis-2026-09-13.html`)이 재현한 P2 두 건을 고친다.

1. **커밋 훅이 git 전역 옵션을 놓친다.** `templates/.claude/hooks/pre-commit-check.sh`는 명령에
   `git commit` 부분 문자열이 있는지만 본다. `git -C . commit`·`git --no-pager commit`은 검사 없이
   exit 0으로 통과한다(재현: 실패하는 `npm test`를 둔 임시 프로젝트에서 세 명령을 훅에 JSON으로 전달).
   영향: Claude Code 세션의 Bash 커밋 게이트가 옵션 하나로 우회된다.
   기대: `block-dangerous-git.sh`가 이미 쓰는 전역 옵션 패턴(`GIT=`)과 같은 규칙으로 subcommand
   `commit`을 인식한다. `git status`·`git log | grep "commit"`처럼 subcommand가 commit이 아닌
   명령은 계속 관여하지 않는다.
2. **init 최종 취소 후 설정이 남는다.** `src/user-config.mjs`의 `ensureUsername`이 이름을 확정하는
   즉시 `.harness/config.json`을 쓴다. `init`의 최종 "Apply these changes?"에 `n`을 답해도 파일과
   사용자명이 남는다(재현: 신규 임시 디렉터리). 영향: "Aborted."가 거짓이 된다 — 아무것도 쓰지
   않았다고 주석이 말하지만 config는 이미 있다.
   기대: init은 이름을 값으로만 들고 있다가 apply 시점에 저장한다. `sync`는 계획/적용 분기가 없으므로
   종전처럼 즉시 저장한다.

제약: 최소 변경. 훅 템플릿 바이트가 바뀌므로 D8 규칙대로 **직전 stock 판**을 `KNOWN_STOCK_HOOK_SHA256`과
`tests/fixtures/stock-hooks/`에 추가해 설치본 refresh 경로를 유지한다.

## 설계 / 접근
- 훅: `if [[ "$COMMAND" != *"git commit"* ]]` → `block-dangerous-git.sh`의 `GIT`·`END` 정규식을 복사해
  `[[ "$COMMAND" =~ ${GIT}commit${END} ]]`로 판정. 패턴 원문은 두 훅에 중복되지만 훅은 자립형
  스크립트라 공유 파일을 두지 않는다(jq-fallback 블록과 같은 계약: 테스트가 대조).
- init: `ensureUsername(targetDir, flags)`를 `resolveUsername(targetDir, flags) → name|null`(읽기·프롬프트만)과
  `saveUsername(targetDir, name)`(쓰기)으로 나눈다. `ensureUsername`은 둘을 합친 종전 동작으로 남겨
  `sync`가 그대로 쓴다. init은 resolve를 계획 단계에서, save를 `applyChanges` 직후에 부른다.
  이미 `config.user`가 있으면 resolve는 null을 돌려주고 save를 건너뛴다.

## Ontology
- **git 전역 옵션**: `git`과 subcommand 사이에 오는 대시 토큰. 값을 받는 옵션(`-C`·`-c`·`--git-dir`·
  `--work-tree`·`--namespace`·`--super-prefix`·`--exec-path`)은 다음 토큰까지 소비한다. 정본은
  `block-dangerous-git.sh`의 `GIT=` 주석.
- **계획 단계 / 적용 단계**: init에서 최종 confirm 이전은 계획(파일 쓰기 없음), 이후는 적용. 사용자명
  저장은 적용에 속한다.
- **stock 판**: 과거에 배포된 템플릿 바이트. 현재 템플릿은 테이블에 넣지 않고 직접 비교한다(D8).

자가진단 근거: 두 결함 모두 재현 명령·코드 위치·기대 결과가 위에 고정돼 있고 성공 기준은 회귀 테스트다.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 재현된 P2 두 건 수정.
- [x] **Constraint 명확도** (30%) — 최소 변경, D8 sha 테이블 유지, sync 동작 불변.
- [x] **Success 기준** (30%) — 훅: 세 명령 모두 exit 2(양 모드) + 비커밋 명령 exit 0. init: resolve는 파일을
  만들지 않고 save만 만든다. `npm test` 전체 통과.
- [x] **Context 명확도** — 영향 파일: 훅 템플릿, user-config.mjs, init.mjs, migrate.mjs(sha 테이블),
  fixtures/stock-hooks, 테스트 2~3개.
- [x] **Ambiguity ≤ 0.2**

## Done evidence
```json
{ "version": 1, "tests": "required", "review": "required" }
```

## 참고
- 재현 근거: `tests/hooks-jq-fallback.test.mjs`의 `runHook` 헬퍼로 같은 세 명령을 돌린다.
- 범위 밖(open 아님, 의도적 제외): `git -C <다른 디렉터리> commit`은 훅 cwd의 package.json으로 검사한다 —
  `cd other && git commit`과 같은 기존 한계이며 이 task에서 다루지 않는다.
- 범위 밖: `git commit --help`는 종전에도 게이트가 돌았다. 그대로 둔다.
- 범위 밖(알려진 오탐): `grep "git commit"`처럼 `commit` 바로 뒤에 `"`가 오면 `END`가 `"`를 경계로 보므로 게이트가 돈다 — `block-dangerous-git.sh`와 같은 fail-closed 방향의 오탐이라 수용한다.

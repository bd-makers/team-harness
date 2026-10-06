# post-commit-prepend — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: post-commit 설치를 pre-push와 같은 맨 위 삽입 + 비-셸 skip으로 (followups 13)
- Current atomic step: plan 전 단계 완료 — push·PR 승인 대기
- Stop / human-decision condition: push·PR은 사용자 승인 후. 다이어그램 옵트인 답 대기(권장: 생략)

## Constraints and settled decisions
- 새 훅 파일은 바이트 동일(`POST_COMMIT_HOOK`), export 시그니처 불변, 호출처 3곳 무변경
- doctor post-commit 검사 없음(2차 장치 규칙) — 근거는 spec 판단 (c)
- 이미 append된 설치본은 재작성하지 않음 — CHANGELOG에 수동 조치 안내
- 개행 없는 shebang 결함: macOS는 실행됨(실측), Linux는 미실측 — 주장 낮춰 기록

## JIT retrieval map
- Identifiers / symbols: installGitHook, POST_COMMIT_BLOCK, SH_SHEBANG, hasLiveMarker
- Narrow globs: src/git-hooks.mjs, tests/git-hooks.test.mjs
- Read next: spec 판단 (a)(b)(c)
- Verification command: node --test tests/git-hooks.test.mjs; npm run test

## Failure capsules (max 3 unresolved)

## Resume checklist
- 승인 시 push → PR → 머지 후 main 종결 경로(tmp 브랜치 → task → done → summary --write → push HEAD:main)

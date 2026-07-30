# skilltest-ast-grader — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-07-30 — 리뷰 라운드 1 반영

`tests/sim/skilltest.mjs` GWT 3구획 grader의 텍스트 basis 제거 완료 + 리뷰 3건 조치.
- FIX-C: `hasMisparsedString` — 개행을 넘는 `'…'`/`"…"` 스팬(JSX 아포스트로피 오파싱)은
  채점하지 않고 `unparsed` → MANUAL. 토큰화기는 여전히 무수정.
- artifact sentinel 서술 정정, task SSOT 4파일 완성, 레지스트리 2곳 등록.

다음 세션이 알아야 할 것: 범위 밖으로 남겨둔 것 2가지 — (a) presence 신호
(`hasExpect`/`hasSnapshot` 등)의 raw whole-source `.test()` basis, (b) `skipString`이
개행에서 멈추지 않는 토큰화기 잔여. 둘 다 artifact에 콜아웃돼 있으며 별도 태스크 대상.

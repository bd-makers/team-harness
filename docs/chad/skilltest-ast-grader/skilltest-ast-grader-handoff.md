# skilltest-ast-grader — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-07-30 — 리뷰 라운드 1 반영

`tests/sim/skilltest.mjs` GWT 3구획 grader의 텍스트 basis 제거 완료 + 리뷰 3건 조치.
- FIX-C: `hasMisparsedString` — 개행을 넘는 `'…'`/`"…"` 스팬(JSX 아포스트로피 오파싱)은
  채점하지 않고 `unparsed` → MANUAL. 토큰화기는 여전히 무수정.
- artifact sentinel 서술 정정, task SSOT 4파일 완성, 레지스트리 2곳 등록.

## 2026-07-30 — 리뷰 라운드 2 반영

- `hasMisparsedString`을 **raw** 개행으로 좁힘: escape 쌍(`/\\[\s\S]/g`)을 먼저 제거해
  합법 역슬래시 줄 이음이 MANUAL로 강등되던 오탐 제거(실측 OLD PASS → NEW MANUAL 이던
  것을 PASS로 복구). 회귀 selftest 2개 추가.
- "오파싱 잔여" 콜아웃 정정(doc-only): 선언을 가로지르는 짝수 아포스트로피는
  `decls=[] / truncated=false`로 조용한 FAIL이 된다 — 라운드 1의 "구멍 아님" 서술은 오류.
  OLD(ad937fe)와 NEW가 동일 FAIL임을 실측해 pre-existing·criterion 5 미위반으로 기록.

다음 세션이 알아야 할 것: 범위 밖으로 남겨둔 것 3가지 — (a) presence 신호
(`hasExpect`/`hasSnapshot` 등)의 raw whole-source `.test()` basis, (b) `skipString`이
개행에서 멈추지 않는 토큰화기 잔여, (c) 그 잔여가 만드는 **선언 스캔 조용한 FAIL**
(캡틴이 선언 레벨 fail-safe를 명시 기각 — 근본 원인인 토큰화기 쪽에서만 닫을 수 있다).
셋 다 artifact에 콜아웃돼 있으며 별도 태스크 대상.

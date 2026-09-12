# docs-html-stub-tests — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: DOM 스텁 3종을 `tests/*.test.mjs`로 승격. JS는 벤더링 말고 HTML에서 실행 시점 추출.
- Current atomic step: plan 1단계 — `claude/docs-html-stub-tests` 브랜치 생성 (아직 미착수, main clean)
- Stop / human-decision condition: 추출 헬퍼가 `<script>` 블록 1개 가정을 못 지키는 HTML이 나오면 멈추고 보고.
  HTML 본문을 고쳐야 하는 상황도 멈춤 — 이 task는 테스트만 추가한다.

## Constraints and settled decisions
- 의존성 0개 유지. `node_modules` 비어 있음, `package.json`에 deps 없음 — **jsdom 도입 금지**, 손수 스텁 유지.
- 배치: `tests/*.test.mjs` (e2e 아님). 순수 in-process라 `test`·`test:unit` 양쪽이 잡는다.
- 승격 3종만: `domstub2`→playground · `obstub`→checklist · `dkstub`→deck.
  `domstub.mjs`(단언 없는 습작) · `/tmp/pg-test.js`는 **기각**.
- 단언 내용 불변 — 변환 후 총 **65**건(playground 29 · checklist 14 · deck 22)이 통과해야 한다.
  실행 출력을 직접 센 값이다. artifact 산문의 26·14·25는 두 값이 틀렸으니 쓰지 말 것.
- 변환 granularity: 원본 `t()` 하나당 `test()` 하나, 섹션은 `describe()`. 그래야 러너 pass 수 = 단언 수.
- 다이어그램 옵트인 안 함 (사용자 선택).

## JIT retrieval map
- Identifiers / symbols: `new Function(src+';return {…}')` · `mkEl` · `SLIDES` · `ALL`/`PHASES` · `PRESETS`/`state`
- Narrow globs: `docs/harness-{operations-playground,onboarding-checklist,kickoff-deck}.html` ·
  `tests/*.test.mjs` · `docs/chad/docs-html-stub-tests/raw-stubs/*.mjs`
- Read next: `raw-stubs/domstub2.mjs`(변환 원본) · `tests/documentation-inventory-pointers.test.mjs`(기존 HTML 검사 관례)
- Verification command: `npm test`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- `git status` — main clean이어야 정상. task 파일만 uncommitted.
- 세 HTML 모두 `<script>` 블록이 **1개**인지 먼저 확인 — 추출 설계의 전제다.
- 변환 전 원본 3종 sha256을 plan `## 참고` 표와 대조.

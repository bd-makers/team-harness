# testpath-extension-gate — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `isTestPath()`에 코드 확장자 게이트를 넣어 문서 파일이 테스트 증거로 세지지 않게 한다.
- Current atomic step: 실패 재현 테스트(가드 수준 R2 + 순수 함수) 작성 → 실패 확인.
- Stop / human-decision condition: 화이트리스트가 실제 테스트 파일을 떨어뜨리는 사례가 나오면 중단(2목록 설계로 전환 필요).

## Constraints and settled decisions
- 게이트는 디렉터리 규칙보다 **앞**에 둔다 — 순서가 곧 구멍 2의 수정이다.
- 목록은 기존 `SOURCE_EXTENSIONS` 재사용(새 목록 만들지 않음).
- 가드 수준 fixture는 `firstActivatedAt`을 반드시 갖는다 — 없으면 창이 없어 가드가 통째로 skip.

## JIT retrieval map
- Identifiers / symbols: `isTestPath`, `SOURCE_EXTENSIONS`, `classifyChangedPaths`, `makeEvidenceFixture`
- Narrow globs: `src/commands/task.mjs`, `tests/done-guard.test.mjs`
- Read next: `src/commands/task.mjs` 353-385 (분류) · `tests/done-guard.test.mjs` 362-420 (fixture)
- Verification command: `npm run test:unit` (전체는 `npm run test`)

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- plan.md 체크 상태 확인 → 다음 미완 단계부터

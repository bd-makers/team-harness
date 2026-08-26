# testpath-extension-gate — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `isTestPath()`에 코드 확장자 게이트를 넣어 문서 파일이 테스트 증거로 세지지 않게 한다.
- Current atomic step: PR 생성 후 CI 확인. 구현·리뷰 2회·기록 완료.
- Stop / human-decision condition: 화이트리스트가 실제 테스트 파일을 떨어뜨리는 사례가 나오면 중단(2목록 설계로 전환 필요).

## Constraints and settled decisions
- 규칙마다 확장자 조건이 다르다 — 디렉터리(강한 신호)는 산문·dotfile만 제외, basename(약한 신호)은 코드 화이트리스트.
- 단일 화이트리스트는 codex 리뷰 P2로 기각됐다(`tests/foo.test.mts` 등 정직한 작업 차단).
- 가드가 틀리는 방향의 값이 다르다 — 차단 오류 > 통과 오류(`--force` 상습화가 가드를 죽인다).
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

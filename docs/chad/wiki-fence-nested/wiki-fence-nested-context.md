# wiki-fence-nested — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `wiki sources`가 인용문·목록 안 펜스의 예시 마커를 `compiled`로 세지 않게 한다(C1 후속 P2-b).
- Current atomic step: plan 5 — CHANGELOG 반영 완료, /harness-ship 후 ao report
- Stop / human-decision condition: push·PR은 사람 승인 후. 결정 필요 시 파일 + `ao report --needs-input`.

## Constraints and settled decisions
- 범위: `src/commands/wiki.mjs` `wikiMarkersIn` + `tests/wiki.test.mjs`만. CommonMark 전체 구현 금지.
- 오류 방향: 펜스 과인식(→ 재컴파일 중복)이 미인식(→ fail-closed)보다 나쁘다 — 여는 조건은 보수적으로.
- 다이어그램 옵트아웃(사람 결정).

## JIT retrieval map
- Identifiers / symbols: `wikiMarkersIn`, `QUOTE_RE`, `LIST_ITEM_RE`, `FENCE_OPEN_RE`, `FENCE_CLOSE_RE`
- Narrow globs: `src/commands/wiki.mjs`, `tests/wiki.test.mjs`
- Read next: `docs/chad/wiki-fence-nested/wiki-fence-nested-artifact.md` `## Reviews`
- Verification command: `node --test tests/wiki.test.mjs`; `npm test`; `npm run docs:check`; `node bin/harness-team.mjs scenario check`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- `git log --oneline -5` 로 브랜치 `ao/harness-aijient-team-plugin-44/wiki-fence-nested` 확인 → plan 미체크 단계부터.

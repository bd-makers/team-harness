# wiki-sources-all — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `wiki sources --all` 컴파일 후보 목록(followups 24, 방향 B)
- Current atomic step: PR #148 리뷰·머지 대기
- Stop / human-decision condition: 머지는 사람

## Constraints and settled decisions
- 붙인 자리 `wiki` (list 기각 — spec 설계 1), 목록·0건 모두 exit 0, 인수 없는 계약 불변
- 인수 없는 오류 retry 는 대상 지정만(`task <name>` 은 done task reopen), alternatives 에 `--all`

## JIT retrieval map
- Identifiers / symbols: `wikiSourcesAll`, `repoScan`, `compiledIndex`, `emitAll`, `runWiki`
- Narrow globs: `src/commands/wiki.mjs`, `tests/wiki.test.mjs`, `tests/wiki-command.test.mjs`
- Read next: spec `## 설계 / 접근`
- Verification command: `node --test tests/wiki.test.mjs tests/wiki-command.test.mjs`

## Failure capsules (max 3 unresolved)

## Resume checklist
- PR 상태·CI annotation 확인

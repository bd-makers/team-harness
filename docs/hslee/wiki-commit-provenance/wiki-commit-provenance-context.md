# wiki-commit-provenance — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: PR 번호를 못 찾으면 `no-pr` 막힘 대신 커밋 출처 마커(`pr=` 없음). PR 경로 바이트 불변.
- Current atomic step: plan 4~5 — 검증 기록·R2/R3 리뷰
- Stop / human-decision condition: push·PR 금지(brief). 다이어그램 단계는 사람 결정 대기.

## Constraints and settled decisions
- 우선순위 `--pr` > 커밋 메시지 > 커밋 출처. 멱등 키 `task=` 불변. `findCompiled`·`wikiMarkersIn` 불변.
- 명시 플래그 `--no-pr` 기각(spec 설계 절 (a)).

## JIT retrieval map
- Identifiers / symbols: `wikiMarker`, `wikiSources`, `BLOCKER_TEXT`, `runWiki`
- Narrow globs: `src/commands/wiki.mjs`, `tests/wiki*.test.mjs`, `commands/harness-wiki.md`
- Read next: spec Done evidence S1–S5
- Verification command: `npm test && npm run docs:check && node bin/harness-team.mjs scenario check`

## Failure capsules (max 3 unresolved)

## Resume checklist
- artifact `## Reviews`에 R2·R3 기록 후 ship 준비 보고

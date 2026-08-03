# th-release-0-12 — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 0.12.0 릴리스 노트·스냅샷·변경 설명 문서를 만들고 버전 범프를 검증해 커밋한다.
- Current atomic step: 최종 검증 완료; release commit을 만들고 firstmate에 인계한다.
- Stop / human-decision condition: 파괴적 변경 발견, release 경쟁 방지 가드 거부, no-mistakes daemon 오류.

## Constraints and settled decisions
- `MAINTAINING.md`가 릴리스 절차의 정본이며 실제 minor release 적용까지 완료했다.
- 실제 범위는 PR 12개를 포함한 16커밋이며 모두 검토한다.
- 최신 개요는 `npm run docs:generate` 후 스냅샷으로 복사한다.
- 태그는 PR 병합 전에 만들지 않는다.

## JIT retrieval map
- Identifiers / symbols: `release`, `generateOverview`, `AGENT_FILE_TEMPLATES`
- Narrow globs: `CHANGELOG.md`, `docs/harness-*.html`, `scripts/generate-harness-overview.mjs`
- Read next: `git diff --check`, 네 manifest 버전, changelog 헤딩, 새 HTML 필수 문구
- Verification command: `node --test tests/`; `npm run docs:check`; `node bin/harness-team.mjs release minor --dry-run`

## Failure capsules (max 3 unresolved)
- 없음

## Resume checklist
- 커밋 후 firstmate의 no-mistakes/PR 단계 지시를 따른다.

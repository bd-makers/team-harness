# remove-personal-tool-refs — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 개인 도구 흔적 6건을 팀 하네스의 살아 있는 표면에서 제거
- Current atomic step: 커밋 · PR
- Stop / human-decision condition: PR 머지는 사람

## Constraints and settled decisions
- 이력 표면(CHANGELOG·what-changes·기존 task 문서)은 고치지 않는다
- AO 규칙 파일은 `~/.ao/`로 이동(삭제 아님)

## JIT retrieval map
- Identifiers / symbols: `AI_GITIGNORE_ENTRIES`
- Narrow globs: `docs/index.html`, `commands/*.md`
- Read next: spec 성공 기준 grep
- Verification command: `npm run test && npm run docs:check`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- spec의 성공 기준 grep 두 개가 0건인지 확인

# ci-docs-check-gitignore — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: CI에 `docs:check` 스텝, `.gitignore`에 `.claude/handoffs/`.
- Current atomic step: 두 파일 편집 후 로컬 검증.
- Stop / human-decision condition: push·PR·머지는 사용자 지시 후.

## Constraints and settled decisions
- 별도 job 없이 `test` job의 `Run tests` 뒤 스텝으로 둔다(테스트 실패가 먼저 보이게).
- release.yml·CHANGELOG·소비자 스캐폴드 gitignore는 건드리지 않는다.
- 다이어그램 옵트인: 아니오.

## JIT retrieval map
- Identifiers / symbols: `Run tests`, `docs:check`, `listTrackedSourceFiles`
- Narrow globs: `.github/workflows/test.yml`, `.gitignore`, `scripts/generate-harness-overview.mjs`
- Read next: test.yml 73-101
- Verification command: `npm run docs:check`; `git check-ignore -v .claude/handoffs/x.md`; CI 스텝 로그

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- plan 미완 단계부터. PR이 있으면 `gh-axi pr checks <n>`.

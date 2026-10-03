# harness-version-stamp — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: init이 render-state에 harnessVersion을 기록하고 doctor가 project·CLI·plugin 버전을 보여 주며 방향별 경고.
- Current atomic step: PR #118 생성 완료 — 리뷰·CI 대기. 머지·release·done·summary --write는 하지 않는다.
- Stop / human-decision condition: src 수정 파일 5개 초과 또는 설계 변경 필요 시.

## Constraints and settled decisions
- 타임스탬프 없음(재실행 diff 방지). init 차단 없음 — 경고만. 새 의존성 금지.
- plugin-dev 저장소는 project `n/a`·경고 없음. 적용 > CLI 경고 next_action은 `cliDriftAction` 재사용.

## JIT retrieval map
- Identifiers / symbols: readHarnessVersion, harnessVersion, compareVersions, harnessVersionReport, readInstalledHarnessVersion
- Narrow globs: src/render-state.mjs, src/harness.mjs, src/commands/doctor.mjs
- Read next: tests/render-state.test.mjs, tests/doctor.test.mjs (말미)
- Verification command: npm run test && npm run docs:check

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- codex 리뷰 P2 반영 완료 → artifact ## Reviews 참조.

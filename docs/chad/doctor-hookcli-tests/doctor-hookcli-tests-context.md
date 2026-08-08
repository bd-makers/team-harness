# doctor-hookcli-tests — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 0.13.0 검토에서 드러난 테스트 커버리지 갭 3건(복구 명령 문자열 · plugin-dev skip · 실제 help 대조)을 고정한다.
- Current atomic step: plan §5 — 구현·테스트·mutation 검증·artifact 완료. 커밋 + `done`만 남음.
- Stop / human-decision condition: 커밋은 사용자 승인 대기(요청받지 않음). done-guard가
  미커밋 변경과 활성화 후 커밋 0개를 막으므로 커밋 없이는 `done` 불가.

## Constraints and settled decisions
- 신규 테스트 파일 0 — `tests/doctor.test.mjs` 확장만.
- `checkHookCli` 로직 불변. `hookCliInstall` 추출은 export 추가일 뿐 동작 변경 아님.
- 범위 밖: 평문 요약의 warning 미반영(기존 동작, 0.13이 만든 것 아님), README 문안 재작성.
- 저장소는 0.13.0(`ee6e459`) = origin/main과 동기. 백업 브랜치 `backup/pre-reset-2026-08-06`.

## JIT retrieval map
- Identifiers / symbols: `hookCliInstall`, `checkHookCli`, `checkSelfCli`, `runDoctor`, `isPluginDevRepo`
- Narrow globs: `src/commands/doctor.mjs`, `tests/doctor.test.mjs`, `README.md`
- Read next: `doctor.mjs:143-144`(추출 대상), `:286-302`(분기), `tests/doctor.test.mjs:44`(실제 bin 선례),
  `:53`(boolean 테스트), `:231`(plugin-dev 통합 테스트)
- Verification command: `npm run test` (0.13.0 기준 209 pass + perf 1)

## Failure capsules (max 3 unresolved)
(none)

## Resume checklist
- 배경은 spec "왜 이 갭이 실제 결함을 통과시켰나" — #16이 npm 404 안내를 내보냈고 #17이 실측으로 고쳤다.
- 결과·리뷰·학습은 `-artifact.md`에 기록 완료. mutation 4건(M1~M4) 전부 fail 1 확인.
- `npm run test` 212 pass / 0 fail (+ perf 1). 변경: `doctor.mjs` +14/-2, `doctor.test.mjs` +48/-3.
- probe 재사용 경로: 스크래치패드 `probe13`(0.13 apply 완료), `nodeonly`(harness-team 없는 PATH),
  `before-detail.txt`(추출 전 출력 캡처).

# harness-activation — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: task 확장(loop/graph/workflow 신설) 기각 → 대신 "발동" 갭 3건(진입점·채널·훅 생존)을 메운다.
- Current atomic step: plan §4 — 구현·probe·문서 기록 완료, `harness-team done` 실행 준비.
- Stop / human-decision condition: 없음. 구현 단계 커밋 후 done-guard를 통과하고 firstmate의 no-mistakes 지시를 기다린다.

## Constraints and settled decisions
- D1: `task loop`/`task graph`/`task workflow` 신설 기각. graph 재고 조건은 spec에 3항목으로 명시.
- 신규 파일 0. task 4파일 SSOT 유지 (TCC는 비-SSOT workpad).
- 영향 파일 3개로 한정: `src/commands/task.mjs`, `src/commands/doctor.mjs`, `README.md`.
- 커뮤니티 용어(loop/graph engineering) 대신 Anthropic 어휘(agent/workflow/harness) 사용.
- 이 저장소는 정본(origin/main)과 동기. 백업 브랜치 `backup/pre-reset-2026-08-06` 존재.

## JIT retrieval map
- Identifiers / symbols: `printTaskNextActions`, `checkHookCli`, `POST_COMMIT_HOOK`
- Narrow globs: `src/commands/task.mjs`, `src/commands/doctor.mjs`, `tests/{task-templates,doctor}.test.mjs`
- Read next: `harness-activation-artifact.md` (probe 결과·pluginDev 근거)
- Verification command: `npm run test` (209 pass) · probe `doctor --json`

## Failure capsules (max 3 unresolved)
(none)

## Resume checklist
- 근거·결정은 `harness-activation-spec.md` D1~D4, 단계는 `-plan.md` §1~4.
- `npm run test` 209개 및 perf 1개 통과. probe에서 task 생성·재활성화 안내와 PATH 차단 warning을 확인했다.
- AGENTS roles 마커는 apply가 템플릿 블록으로 교체하므로 template와 root를 함께 갱신했고, 관련 template/merge tests가 통과했다.

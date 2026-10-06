# r2-scenario-evidence — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: R2 시나리오 ↔ 증거 대조 (Done evidence `scenarios` + `scenario check` + `--framing scenario`)
- Current atomic step: 리뷰(codex 기본 + scenario 프레이밍) → artifact 판별 기록 → 커밋 → pr-check
- Stop / human-decision condition: push·PR은 사용자 승인 후

## Constraints and settled decisions
- 표 = Done evidence JSON `scenarios` (마크다운 표 기각 — `|`), 행1 = 파서, 행2 = `scenario check`, 행3·4 = 루브릭
- `done`은 증거 명령을 실행하지 않는다; scenarios 선언 + verify required → `-scenario` kind만
- 이 spec이 scenarios를 선언하므로 종결은 `node bin/harness-team.mjs` (PATH 0.46.0 CLI는 알 수 없는 키로 막힘)
- 미러는 commands/harness-review.md (새 커맨드 문서 없음)

## JIT retrieval map
- Identifiers / symbols: parseDoneEvidenceDeclaration, scenariosIssue, runScenarioCheck, FRAMING_TEMPLATES scenario
- Narrow globs: src/commands/{task,scenario,review-prompts}.mjs, tests/{scenario,done-guard,review-command}.test.mjs
- Read next: docs/chad/r2-scenario-evidence/r2-scenario-evidence-spec.md
- Verification command: npm run test && node bin/harness-team.mjs scenario check

## Failure capsules (max 3 unresolved)

## Resume checklist
- 리뷰 결과를 artifact `## Reviews`에 판별과 함께 기록했는가
- 커밋 후 `git status`·`.git/refs/heads/` iCloud 사본 확인

# verify-evidence-gate — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: D6 4단계 — done 가드 verify 키·kind allowlist(src+테스트), sim 채점 rule 층 분리, AO §8 검증 슬롯
- Current atomic step: plan 마지막 단계 — 외부 리뷰(/harness-review probe 체인) → 판별·반영 → Reviews 기록
- Stop / human-decision condition: done 처리·PR 생성은 사용자 지시로만; push 금지

## Constraints and settled decisions
- rule 층 = tests/sim/rules.mjs (src/ 아님, 사용자 확인 2026-08-26)
- AO §8 = 슬롯 1항목 최소 추가, 100행 초과(127행)는 보고만
- 다이어그램 옵트아웃 (plan에 단계 없음이 상태)
- 이 task spec에 verify 키 선언 금지 — 설치된 0.19.0 가드가 unknown key로 차단
- review 증거는 kind 비대조 유지; verify만 접미사 allowlist 대조

## JIT retrieval map
- Identifiers / symbols: DONE_EVIDENCE_VALUES, parseDoneEvidenceDeclaration, parseReviewMarkers, collectDoneIssues, scoreSpecArtifacts, aggregateTrials
- Narrow globs: src/commands/task.mjs, tests/done-guard.test.mjs, tests/sim/*.mjs, commands/harness-review.md:76-88
- Read next: tests/agent-files.test.mjs (접미사 pin 선례, 3단계에서 4→6곳)
- Verification command: npm run test:unit && npm run docs:check

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- .harness/config.json은 워크트리 생성 시 메인 체크아웃에서 복사해야 함 (user=chad, 이번 세션 완료)
- 베이스: origin/main = fc9f586, HEAD 포함 확인됨

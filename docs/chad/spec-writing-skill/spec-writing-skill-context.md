# spec-writing-skill — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: /harness-spec 커맨드/스킬 추가 — Confluence·Figma·인터뷰 3소스에서 활성 task spec 초안 생성
- Current atomic step: codex 리뷰 반영 후 재검증 → artifact.md에 리뷰 기록
- Stop / human-decision condition: 커밋/PR 여부는 사용자 결정

## Constraints and settled decisions
- agent workflow 커맨드 (CLI 서브커맨드 아님) — harness-interview 패턴
- MCP 우선 + 수동 붙여넣기 폴백, specSources는 첫 실행 시 lazy 수집
- writer(/harness-spec) / validator(/harness-interview) 역할 분리 — writer는 게이트 통과 선언 금지
- config 저장은 read-modify-write (기존 키 보존), malformed JSON이면 중단

## JIT retrieval map
- Identifiers / symbols: printTaskNextActions, taskSpecTemplate, specSources
- Narrow globs: commands/harness-spec.md, skills/harness-spec/**, src/commands/task.mjs
- Read next: docs/chad/spec-writing-skill/spec-writing-skill-artifact.md (Reviews)
- Verification command: npm run test && node scripts/generate-harness-overview.mjs --check

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- plan.md 마지막 항목(드라이런+리뷰 기록) 완료 여부 확인
- 신규 파일 git add 후 overview 재생성 여부 확인 (generator가 git ls-files 기반)

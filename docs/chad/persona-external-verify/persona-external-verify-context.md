# persona-external-verify — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: D6 3단계 — 페르소나 층(contrarian/simplifier external 모드, interview 선행 채점) 문서 편집
- Current atomic step: 구현·리뷰 반영 완료 — done/ship 사용자 신호 대기
- Stop / human-decision condition: 4단계(src 변경·AO 워커 §8)는 별도 task, done/ship은 사용자 신호 후

## Constraints and settled decisions
- 문서만 + pin 테스트 — src 변경 없음 (4단계로 이월)
- 마커: `kind=<engine>-contrarian|-simplifier scope=task-docs` (가드 파서는 scope 값 비제한)
- D-log D6 전문은 역사 기록이라 수정 안 함 — 접미사 열거의 정본은 commands/harness-review.md
- interview는 외부 엔진 없음 — 채점표(선행 채점)가 질문 선별·체크박스 갱신의 유일한 근거
- 커맨드 frontmatter(description)는 docs/harness-overview.html 생성물에 소비됨 — 수정 시 docs:generate 필수
- .harness/config.json(user=chad)은 gitignore라 신규 워크트리에 없음 — 메인 체크아웃에서 복사해 해결

## JIT retrieval map
- Identifiers / symbols: `외부 엔진 모드`, `선행 채점`, `scope=task-docs`, `소비 표면 6곳`
- Narrow globs: commands/harness-{contrarian,simplifier,interview,review}.md
- Read next: tests/agent-files.test.mjs (kind 접미사 6곳 + interview 채점 pin 테스트)
- Verification command: npm run test:unit && npm run docs:check

## Failure capsules (max 3 unresolved)

## Resume checklist
- plan.md 미체크 항목: 없음 (전 단계 완료 — codex 리뷰 P2 3·P3 1 반영 포함)
- 후속 task(4단계): done 가드 `verify` evidence 키·kind allowlist(src/commands/task.mjs), sim 채점 함수 rule 층 승격, AO 워커 §8(≤100행 유의)

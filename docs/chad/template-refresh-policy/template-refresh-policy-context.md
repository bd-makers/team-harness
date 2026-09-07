# template-refresh-policy — Context Card

## Now
plan 7단계 전부 완료(`- [x]`). 남은 것: 커밋 → 외부 리뷰(`/harness-review`) → `harness-team done`.

`refreshClaudeHooks`의 provenance-refresh를 스킬 3 + 규칙 4로 확장했다. 정적 템플릿 refresh 적용
범위 6 → 13. `npm test` 645/644 pass · fail 0 · `docs:check` PASS · `doctor` PASS.

## Constraints and settled decisions
- **D8**(docs/decisions.md) — 갱신 경로는 `migrate`의 provenance refresh 하나. `init`은 갱신 동사가 아니다.
- `docs/` seed(README·decisions·.gitkeep)는 **비목표** — 설치 후 팀 저작물.
- 규칙·스킬 목록은 **고정 배열**로 순회한다. `readdir` 금지 — harness-promote가 쓴 사용자 규칙을 오탐한다.
- refresh ≠ install — `installed === null`이면 건너뛴다(비-RN 프로젝트에 RN 규칙이 새지 않게).
- 기각: 전면 덮어쓰기 · 마커 병합 · 설치시점 매니페스트(소급 불가라 이미 드리프트한 설치에 무용).

## Failure capsules (max 3 unresolved)
(none — 미해결 실패 없음)

## JIT retrieval map
- `src/commands/migrate.mjs` — `collectStale`(표면 무관) · `REFRESHABLE_TEMPLATE_FILES` ·
  `KNOWN_STOCK_TEMPLATE_SHA256`(20종) · `refreshClaudeTemplates` · `findStaleTemplates`
- `src/commands/doctor.mjs` — `stale skill/rule templates` 경고 · `DECISION_HEADINGS`
- `src/commands/rules.mjs` — `checkRuleProvenance(dir, { isKnownStock })`
- `tests/migrate-templates.test.mjs` · `tests/fixtures/stock-templates/README.md`

## Resume checklist
1. `npm test` 로 645/644 재확인
2. `/harness-review` 실행 후 artifact `## Reviews`에 기록
3. `harness-team done`

**잊으면 비싼 사실**
- sha 테이블 값 = **내용의 sha256**. 주석 `// 58c4fe2e`는 **git blob sha**(commit 아님) —
  검증은 `git cat-file blob <blob> | shasum -a 256`.
- `docs/decisions.md` ≡ `templates/docs/decisions.md`(바이트 동일). D-절 추가 시
  `DECISION_HEADINGS` + 누락목록 하드코딩 테스트 2개가 같이 움직인다.
- zsh는 unquoted `$VAR`를 word-split 하지 않는다 — 셸 루프 대신 Node 스크립트를 썼다.

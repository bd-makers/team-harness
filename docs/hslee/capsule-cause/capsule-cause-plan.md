# capsule-cause — Plan

## 목표
TCC failure capsule 템플릿에 원인 범주 `Cause` 줄을 권장 항목으로 넣고, fix-bug·new-feature 스킬이 그 범주를 안내한다. check 동작은 그대로.

## 단계
- [x] 스킬 2개의 현재 판을 stock fixture로 보존하고 `KNOWN_STOCK_TEMPLATE_SHA256`·개수·README 갱신
- [x] `context.test.mjs`에 빈 `Cause` stub/채운 `Cause` 테스트 추가(red)
- [x] `taskContextTemplate`에 `Cause` 줄 추가, task-paths golden 갱신(green)
- [x] fix-bug·new-feature 스킬 문구에 원인 범주 추가
- [x] ~~AGENTS.md TCC 절에 한 줄 추가~~ → eager 예산 초과로 철회, 범주 뜻은 스킬 두 개로 이동
- [x] CHANGELOG `## [Unreleased]` 기록
- [x] `npm test` fail 0, `npm run docs:check` 최신
- [x] codex 리뷰 실행, 판별·조치를 artifact `## Reviews`에 기록

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-03: 원인 범주(Cause) 신규 — capsule의 권장 항목, 값 `intent|context|environment|verification|state|unknown`.

## 참고
- spec: `capsule-cause-spec.md`

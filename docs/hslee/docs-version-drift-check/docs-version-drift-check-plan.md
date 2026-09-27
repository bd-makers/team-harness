# docs-version-drift-check — Plan

## 목표
현행 문서의 버전 표지 드리프트를 `docs:check`가 결정론적으로 잡는다.

## 단계
- [x] 대상 범위 확정 — 분류 규칙, 시뮬레이션은 명시 제외(오케스트레이터 결정 A)
- [x] 실패 테스트 작성 (`tests/docs-version-drift.test.mjs`)
- [x] 검사 구현 + `docs:check` 합류, overview 인벤토리 재생성
- [x] MAINTAINING·ao-worker-rules·followups(10번)·CHANGELOG [Unreleased] 갱신
- [x] `npm test`·`npm run docs:check` green
- [ ] 커밋 + `harness-team review`(codex) + artifact 기록
- [ ] push·PR·CI 확인
- [ ] 머지 후 main에서 종결 (워커 몫 아님)

## Ontology 변경 로그
- 2026-09-27 현행 문서 / 기준 문서 / 표지 정의 신설

## 참고
- docs/followups.md 10번 (시뮬레이션 본문 현행화)

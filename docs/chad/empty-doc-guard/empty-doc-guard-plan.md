# empty-doc-guard — Plan

## 목표
빈(0바이트·공백뿐) task 문서가 pr-check·done을 통과하던 구멍을 막고, 실례 plan을 복원한다.

## 단계
- [x] 1. spec — 실례·판정 순서·plan 부재 범위 밖·2차 장치 규칙 검토
- [x] 2. 회귀 테스트 먼저 — pr-check 4문서×2형태, done 빈 plan 2형태·빈 artifact — 실패 확인
- [x] 3. 구현 — `taskFindings`·`collectDoneIssues`에 `!trim()` 판정
- [x] 4. 문서 3곳 서술 갱신 + `dangerous-git-end-boundary` plan 복원(`a4e45a3` 판, 증거로 체크)
- [x] 5. `npm run test`·`docs:check` green, CHANGELOG `[Unreleased]`
- [x] 6. `/harness-review` codex → artifact `## Reviews`
- [x] 7. 커밋 → handoff 반영 커밋 → `harness-team pr-check`

## Ontology 변경 로그
- 2026-10-06 "빈 문서"를 없음·템플릿 그대로와 구분되는 세 번째 실패 상태로 정의

## 참고
- spec: `empty-doc-guard-spec.md`

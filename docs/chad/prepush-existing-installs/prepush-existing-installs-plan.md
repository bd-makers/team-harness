# prepush-existing-installs — Plan

## 목표
followups 12번을 (a)로 닫는다 — 코드 없이 릴리스 노트·README가 기존 설치본에 `harness-team sync` 1회를 안내한다.

## 단계
- [x] 1. spec — 결정 (a)·2차 장치 규칙 검토(b·c 기각 사유) 기록
- [x] 2. CHANGELOG `[Unreleased]` Added — pr-check(#125)·doctor pre-push 검사(#126) 항목 + 기존 설치본 sync 안내
- [x] 3. README — pr-check pre-push bullet과 `/harness-migrate` 절에 sync 안내 한 줄씩
- [x] 4. followups — 12번 삭제, 우선순위 줄 13–16, 처리 기록 한 줄
- [x] 5. 검증 — `npm run test` PASS (docs:check 포함 pre-commit 통과)
- [x] 6. 커밋 · pr-check · PR — #127

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
- 다이어그램 단계 없음 — 사용자 결정(2026-10-06), 코드·구조 변화 없음.

# team-harness-improvements — Plan

## 목표
A1–A6 설계안을 사용자에게 승인받고, 이슈별 task·worktree로 넘길 수 있게 결정을 spec에 닫는다. 이 task는 코드를 바꾸지 않는다.

## 단계
- [x] 브리프 사실을 main `a39859a`(0.56.0)와 대조 — spec R1 `### 발견`
- [x] 저장소 문서·명령 문서·관련 src 읽기, 이슈별 설계안 작성 — spec `## 설계 / 접근`
- [x] [사람] 남은 결정 7건(A1-1·A1-2·A2-1·A3-1·A4-1·A4-2·A6-1)과 task 구조 승인 — 사용자 (2026-11-18 권장안대로 승인, A5 기본값·A5-2 포함)
- [x] 승인 결과를 spec R1에 `→ 결정:`으로 닫고 Ontology·Ambiguity 자가진단 재채점
- [ ] 이 task를 문서만 담은 PR로 준비(`/harness-ship`) — push·PR 생성은 사용자 지시 시
- [ ] 머지 후 기본 브랜치에서 종결(`done` → `summary --write`)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-18: 뷰·리뷰 프로필·사람 검토 단계·외부 질의(ask) 정의 추가(spec Ontology).
- 2026-11-18: 사람 검토 단계를 옵트인 → 신규 task 기본으로(사용자 결정). A3 브리프를 그 게이트의 검토 산출물로 재정의. 거킨·ID는 범위 밖.

## 참고
- 2단계 이슈별 task 이름(안): `review-model`(A6) · `diagram-views`(A1) · `diagram-svg`(A2) · `human-review-gate`(A5) · `task-brief`(A3, A5 뒤) · `spec-ask-markers`(A4)

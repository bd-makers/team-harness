# doctor-decision-headings — Plan

## 목표
doctor 결정 로그 검사가 D6·D7 누락도 경고하게 하고, 절 ID 나열이 상수에서 파생되게 해 재드리프트를 막는다.

## 단계
- [x] task 생성 · spec Ambiguity 게이트 통과 · 다이어그램 옵트인 질문(아니오)
- [x] RED — `tests/doctor.test.mjs`: D2/D4/D5만 있는 로그 → `## D6, ## D7 절 없음` 테스트 추가, 부분 누락 테스트 기대값 D6·D7까지 확장, 부재 메시지 ID 나열 단언 추가 → 실패 확인
- [x] GREEN — `src/commands/doctor.mjs`: `DECISION_HEADINGS`에 `## D6`·`## D7` 추가, 부재 메시지 ID를 상수에서 파생
- [x] 회귀 — `npm test` · `npm run docs:check` 통과
- [x] `CHANGELOG.md` [Unreleased] Fixed 항목
- [x] 외부 read-only 리뷰(codex, gpt-5.6-sol) — P2 2건 반영(드리프트 가드 테스트·decisions.md 상류 목록 D7)·P2 1건 기각·P3 1건 위임, artifact 기록
- [ ] 커밋 · PR → 머지 후 `harness-team done`

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
- spec의 참고 절

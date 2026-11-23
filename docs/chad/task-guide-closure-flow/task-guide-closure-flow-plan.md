# task-guide-closure-flow — Plan

## 목표
현행 문서의 0.58.0 이전 종결 흐름(머지 뒤 `done`·종결 커밋)을 정본대로 고치고 옛 문구를 은퇴 목록에 등록한다.

## 단계
- [x] `docs/harness-task-guide.html` 정정 — 흐름도·프롬프팅 표·plan 예시·세션 재개·§8 종결·meta 표·reopen·사람 검토 게이트
- [x] 다른 현행 문서 정정 — cheatsheet·kickoff-deck·onboarding-checklist·operations-playground·rubric-guide·workflow-diagrams·workflow-schematics
- [x] `tests/docs-retired-phrases.json` 등록 + 사고 줄 테스트 — 검증: 옛 줄을 넣으면 실패하는가
- [x] `npm run docs:check` · `tests/docs-*.test.mjs` · `npm test` 통과
- [x] 리뷰 실행 + artifact `## Reviews` 판별 기록
- [x] ship 완료

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
- 검토 게이트는 task 생성 질문에서 사용자가 뺐다(문서 전용 정정).

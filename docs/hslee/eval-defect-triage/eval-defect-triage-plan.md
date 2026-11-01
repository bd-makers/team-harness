# eval-defect-triage — Plan

## 목표
eval 결함 후보 6건을 현재 소스로 판정하고, 확인된 것만 최소 수정한다.

## 단계
- [x] 후보 1~6을 현재 소스·eval 원문 응답과 대조해 확인/기각 판정
- [x] 1: simplifier 1단계가 템플릿에 없는 "변경 예정 파일 목록"을 전제하지 않게 고침 + pin 단언
- [x] 2: inttest 0단계 2번 `docker info`를 testcontainers가 필요할 때만 돌게 고침 + pin 단언
- [x] 3: contrarian 대화형이 외부 엔진 루브릭 형식과 선제 설계안을 쓰지 않게 고침 + pin 단언
- [x] 5: interview 전부 pass일 때 "막지 않는 참고 질문" 우회로를 닫음 + pin 단언
- [x] `npm run test` 통과
- [x] artifact 결과·리뷰 기록, 커밋(push 없음)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
- 4·6은 같은 21개 SKILL.md 래퍼 패턴이라 한 결정으로 묶어 전하에게 묻는다(수정 단계 없음)

# skilltest-skipstring — Plan

## 목표

`skipString`의 raw 개행 스패닝을 근본 수정해 본문·선언부 두 오파싱 발현을 닫는다.

## 단계
- [x] 직전 task 서술·`skipString`·기존 63개 selftest 확인
- [x] 본문 마커 마스킹과 선언 스캔 누락 회귀 assert 추가 → 수정 전 RED 실측
- [x] 백틱은 유지하고 `'`/`"`만 raw 개행에서 멈추도록 `skipString` 수정
- [x] 두 회귀 assert GREEN 실측 및 A2 선언부 안전장치 필요성 판정
- [x] 기존 채점 대상 파일 OLD-vs-NEW 전수 비교·변경 파일별 판정
- [x] selftest·전체 테스트 통과, artifact·context 갱신, 커밋

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 키워드 토큰 스캐너의 **복구 경계**는 실행 JS 문법 인정과 같아야 한다:
  `'`/`"`는 raw 개행, 백틱은 닫는 백틱이 상한이다.

## 참고
- `tests/sim/skilltest.mjs`
- `docs/chad/skilltest-ast-grader/skilltest-ast-grader-artifact.md`

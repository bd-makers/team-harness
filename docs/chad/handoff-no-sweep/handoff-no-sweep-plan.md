# handoff-no-sweep — Plan

## 목표

활성 task가 있어도 커밋 직후 `git status`가 비어 있게 해서 handoff만 담은 커밋을 만들 이유를 없앤다.

## 단계
- [x] 훅이 추적 파일을 쓰지 않게 하고 sweep·amend 코드를 지운다
- [x] `done`이 마커를 쓰지 않고 `meta.json`만 쓰게 한다
- [x] `pr-check` 필수 문서에서 handoff를 뺀다
- [x] `done`·`review` 제외 집합을 user handoff로 줄인다
- [ ] 픽스처로 깨끗한 트리를 증명하고 변이로 테스트를 검증한다
- [ ] D11·규칙표·문서·stock·CHANGELOG를 맞춘다
- [ ] read-only 리뷰 후 `npm test`·`docs:check`·`doctor`를 통과시킨다

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- task handoff: 자동 로그 → 선택 메모. 완료 표지: handoff 마커 → `meta.json`.

## 참고
-

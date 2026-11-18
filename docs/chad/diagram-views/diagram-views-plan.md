# diagram-views — Plan

## 목표
뷰별 다이어그램 파일 `<name>-diagram-<view>.html`과 뷰별 plan 단계를 옵트인으로 지원한다(`diagram record --view`).
레거시 `<name>-diagram.html`·레거시 단계·`--view` 없는 `record`는 그대로다.

## 단계
- [x] 1. 설계 A1 절·결정 A1-1·A1-2를 spec에 옮겨 쓰고 Ambiguity 게이트 통과
- [x] 2. 뷰 열거·경로 — `DIAGRAM_VIEWS`·`FLAG_CHOICES.view`·`VALUE_FLAGS`(`cli-args.mjs`), `diagramKind`(`task-paths.mjs`)
- [x] 3. `diagram record --view` — 뷰 산출물 검사·뷰 단계 닫기·`[<view>]` 생략 줄, 레거시 정규식이 뷰 단계를 거부
- [x] 4. `pr-check` 뷰 HTML 인정, `clean` `TASK_FILE` 확장
- [x] 5. 테스트 — diagram-command·pr-check·clean·cli-args·agent-files
- [x] 6. 문서 — harness-task 옵트인 절(정본)·harness-diagram 3·6·7·harness-ship 6·SKILL·templates/docs/README, CHANGELOG
- [x] 7. 검증 — `npm test`·`npm run docs:check`·doctor·`pr-check --base origin/main`, 로컬 커밋

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-18: 뷰(view)·레거시 뷰·뷰 단계 정의 추가

## 참고
- 뷰 SVG는 A2(`diagram-svg`) 범위.

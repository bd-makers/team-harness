# diagram-svg — Plan

## 목표
뷰 산출물을 단독 SVG `<name>-diagram-<view>.svg`로 바꾸고, `diagram record --view`가 SVG 자립성을 검사하며,
`pr-check`가 뷰 SVG를 인정하고 PR 본문 링크를 안내한다. 레거시 `<name>-diagram.html`은 그대로다.

## 단계
- [x] 1. GitLab self-managed·Obsidian `.svg` 렌더 실측 가능성 확인 — 둘 다 미검증으로 spec R1·참고에 기록
- [x] 2. 설계 A2 절·결정 A2-1을 spec에 옮겨 쓰고 R1 결정(뷰 HTML 교체·허용 목록 검사·링크 형태·상류 형식)·Ambiguity 게이트 통과
- [x] 3. 뷰 kind `diagram-<view>.svg`(`task-paths.mjs`)와 `record --view` 자립성 검사(`diagram.mjs`)
- [x] 4. `pr-check` 뷰 SVG 인정·`PR 본문에 링크` note, `clean` `TASK_FILE` 확장자 `svg`
- [x] 5. 테스트 — diagram-command(규칙별 위반·허용 표본)·pr-check·clean·agent-files
- [x] 6. 문서 — harness-task 옵트인 절(정본)·harness-diagram 6·7·harness-ship 6·SKILL·templates/docs/README, CHANGELOG
- [x] 7. 검증 — `npm test`·`npm run docs:check`·doctor·`pr-check --base origin/main`, 로컬 커밋

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-18: 뷰 SVG·자립성 정의 추가, 뷰 산출물 형식 HTML → SVG(뷰 HTML 교체)

## 참고
- A1 리뷰가 남긴 범위 밖 후보는 A2가 다루지 않는다(spec 범위 Out).

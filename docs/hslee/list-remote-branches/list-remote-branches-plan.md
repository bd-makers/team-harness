# list-remote-branches — Plan

## 목표
`harness-team list --remote` 로 머지되지 않은 원격 브랜치에만 있는 task 를 (fetch 없이) 보여 준다.

## 단계
- [x] 실패 테스트 작성 — `tests/list-remote.test.mjs` (bare origin 픽스처: 미머지·머지됨·로컬 중복·origin 없음·기본 list)
- [x] 구현 — `remote-task.mjs` `listBranchOnlyTasks` + `task.mjs` `runList` 원격 절 + `cli-args.mjs` `--remote` 등록
- [x] 문서 — README `list` 사용법 · `commands/harness-task.md` · CHANGELOG `[Unreleased]` Added
- [x] 검증 — `npm test` 전체 · `npm run docs:check` green
- [x] 리뷰 — `review codex --scope diff --base origin/main` 기록 + 판정 · 결함 수정 — codex 미실행(config 모델 400), 자기 점검 결함 1건 수정
- [x] artifact `## 결과` 기록

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- "branch-only task" 도입 — default ref 의 조상이 아닌 원격 브랜치에만 spec 마커가 있는 task

## 참고
- 다이어그램 옵트인: 넣지 않음 — 메인 세션 판단(작은 CLI 플래그)
- 종결 절차(체크박스 아님): PR → merge → main 에서 `task list-remote-branches --member hslee` → `done` → `summary --write` → push

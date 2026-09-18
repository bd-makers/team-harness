# diagram-record-cli — Plan

## 목표

다이어그램 옵트인의 기록 단계(artifact 한 줄 + plan 체크박스)를 `harness-team diagram record`로 내려
세 문서의 형식 드리프트를 없앤다.

## 단계

- [x] `tests/diagram-command.test.mjs` 신규 — produced(파일 있음/없음) · skipped(사유 있음/없음) · 생성→갱신 · plan 열린/닫힌/없음 · fence 안 `## Reviews` 무시 · 활성 task 없음 · `--json`
- [x] `src/commands/review.mjs` — `insertBeforeHeading` 추출(`insertReviewBlock` 동작 불변)
- [x] `src/commands/diagram.mjs` 신규 — `runDiagram(ctx)` + 순수 함수
- [x] 배선 — `src/cli-args.mjs` `COMMANDS`·`OPTIONS_HELP`, `bin/harness-team.mjs` `taskCmds`·`taskArgs`·`case 'diagram'`
- [x] `tests/cli-args.test.mjs` `--json` 목록 pin 갱신
- [x] `commands/harness-diagram.md` 7번 · `harness-task.md` 6번 · `harness-ship.md` Record — CLI 호출로 수렴
- [x] `skills/harness-team/SKILL.md` Common commands 한 줄 + CHANGELOG
- [x] `npm run docs:generate` + `npm test` 전체
- [x] 실제 task(임시 fixture)에서 `record --skipped` · `record` 실행 후 두 파일 눈으로 대조
- [x] 리뷰 — `harness-team review codex` (3회차: P1 2건·P2 2건 수정 — `## 단계` 절 한정·정식 문구 한정·사유 개행 접기·artifact 템플릿 시작, P2 쓰기 순서는 부분 수용, 3회차 approve)

## Ontology 변경 로그

- **생성/갱신** 판정 기준을 "파일 상태"가 아니라 "artifact 기록"으로 정의했다.

## 참고

- 다이어그램: 옵트아웃 (2026-09-18 — 직전 task와 같은 성격이라 묻지 않았다. 이 task가 다이어그램 기록 CLI를 만들지만 자기 자신에는 쓰지 않는다)

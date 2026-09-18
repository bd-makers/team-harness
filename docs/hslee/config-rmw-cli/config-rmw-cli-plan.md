# config-rmw-cli — Plan

## 목표

`/harness-spec` 4단계의 config read-modify-write 산문을 `harness-team config get|set`으로 내리고,
키 보존·malformed 거부를 코드가 보장하게 한다.

## 단계

- [x] `tests/config-command.test.mjs` 신규 — get(없음·있음) · set(키 보존·중간 객체 생성·malformed 바이트 불변·경로 검증 거부·중간 비객체 거부·활성 task 불필요) · `--json` 봉투
- [x] `src/user-config.mjs` — `readConfigStrict`·`writeConfig`·`getConfigValue`·`setConfigValue`. `saveUsername`은 쓰기만 `writeConfig` 공유(읽기 동작 불변)
- [x] `src/commands/config.mjs` 신규 — `runConfig(ctx)`
- [x] 배선 — `src/cli-args.mjs` `COMMANDS`·`OPTIONS_HELP`, `bin/harness-team.mjs` `taskCmds`·`taskArgs`·`case 'config'`
- [x] `tests/cli-args.test.mjs` `--json` 목록 pin 갱신
- [x] `commands/harness-spec.md` 4단계 — RMW 산문을 CLI 호출로 교체(질문 판단은 유지)
- [x] `skills/harness-team/SKILL.md` Common commands 한 줄 + CHANGELOG
- [x] `npm run docs:generate` + `npm test` 전체
- [x] 실제 워크트리에서 `config set specSources.confluence.baseUrl …` 실행 후 `user` 보존 눈으로 대조
- [x] 리뷰 — `harness-team review codex` (4회차: P2 3건 수정 — json usage envelope·여분 인자 거부·객체 leaf 거부, 4회차 P2는 설계 선택으로 기각)

## Ontology 변경 로그

- **malformed**와 **없음**을 구분하는 읽기가 생겼다 — 종전 두 `readConfig`는 둘 다 `{}`였다.

## 참고

- 다이어그램: 옵트아웃 (2026-09-18 — 직전 task 3건과 같은 성격의 변경이라 묻지 않았다)

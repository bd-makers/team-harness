# wiki-compile — Plan

## 목표
머지된 task를 PR·커밋·작성자 출처가 붙은 기능·모듈 위키 항목으로 컴파일하는 선택형 단계(`/harness-wiki` + 읽기 전용 `harness-team wiki sources`)를 **추가만** 해서 제공하고, 이 저장소에서 #134·#133으로 dogfood한다.

## 단계
- [x] 1. `wiki sources` CLI — `src/commands/wiki.mjs`(출처 추론·마커·compiled·rules·blockers) + `src/cli-args.mjs` 명령표·`--pr` + `bin/harness-team.mjs` 디스패치, `tests/wiki.test.mjs` S1–S7
- [x] 2. 스킬 — `commands/harness-wiki.md` + `skills/harness-wiki/SKILL.md` + `.claude-plugin/plugin.json` commands 등록, `tests/wiki-command.test.mjs` S8(근거 문단 전체 비교), manifest-sync S9
- [x] 3. 종결 절차 연결 — `commands/harness-task.md` 머지 후 종결 절에 선택 한 줄, README 명령 절, `npm run docs:generate`
- [x] 4. dogfood — `wiki/index.md` + `wiki/90_system/compile-rules.md`, #134·#133 컴파일, 두 번째 실행 `compiled` 기록, S10 테스트
- [ ] 5. 검증 — `npm test` · `npm run docs:check` · `scenario check`(이름 찍힌 출력 artifact 기록) → R2 `review codex --framing scenario` → R3 `review codex`
- [ ] 6. CHANGELOG `[Unreleased]` · `docs/harness-cycle.md` §6 C1 구현 표기 · `/harness-ship` 준비 보고
- [ ] 7. (사람 승인 후) push · PR · PR 리뷰 덱

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-07 위키 항목·컴파일 단락·출처·작성 규칙·inbox·막힘 정의 추가(spec Ontology).

## 참고
- spec Done evidence S1–S10
- 선례 #134: `commands/harness-loop.md`, `tests/loop-command.test.mjs`

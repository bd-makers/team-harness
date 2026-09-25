# config-user-validation — Plan

## 목표
경로를 벗어나게 하는 user(config·`--member`·폴백)를 `task` 는 쓰기 전에, `init`/`sync` 는 저장 전에 거부한다. 한글·공백 이름은 통과.

## 단계
- [x] 임시 디렉터리에서 `{"user":"../../x"}` 탈출 재현 — task 파일 6개가 root 밖에 생성됨
- [x] spec — 거부 규칙·검증 위치(읽기+저장, 사용자 결정) 확정 / 다이어그램 옵트인: 넣지 않음
- [x] 실패 테스트 — `tests/task-user-validation.test.mjs`(task 거부·무쓰기, 한글/공백 통과) + `tests/user-config.test.mjs`(userNameError·resolveUsername throw)
- [x] 구현 — `userNameError`(user-config.mjs), `resolveUser`/`runTask` 거부, `resolveUsername` throw
- [x] 문서 — README 식별 규칙·`commands/harness-task.md`·CHANGELOG
- [x] `npm test` · `npm run docs:check` green — 1008 pass / 0 fail / skip 1, CLI 재현 재실행 exit 1·무쓰기
- [x] `harness-team review codex --scope diff --base origin/main` → artifact Reviews 기록 — P2 1건(falsy 폴백) 판별: 동작 유지, spec·테스트 문구 수정
- [x] PR → CI → merge commit — bd-makers/team-harness#99, `36014e9` (사용자 승인)
- [x] main 복귀 후 인계 파일 `.claude/handoffs/2026-09-25-2010-config-user-validation.md` 종결 표시(워크트리 격리로 이 세션에서 못 씀)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
- 종결 절차(체크박스 아님 — done 가드의 입력이라 미리 켜지 않는다): main 에서 `task config-user-validation --member hslee` → `done` → `summary --write` → push.

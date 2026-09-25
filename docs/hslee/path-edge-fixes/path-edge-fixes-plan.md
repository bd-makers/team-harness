# path-edge-fixes — Plan

## 목표
task 이름 `.`·`..` 거부 + `readRemoteTaskMeta` 를 전체 ref 로 읽기 — #101·#102 후속 후보 두 건.

## 단계
- [x] 재현 — 빈 `docs/` 에서 `task ..` → `docs/..-spec.md` 등 6파일
- [x] 실패 테스트 — `tests/task-user-validation.test.mjs`(`.`·`..`), `tests/remote-task.test.mjs`(로컬 `origin/main` 브랜치) — 원 코드 3 red
- [x] 구현 — runTask 이름 검사, readRemoteTaskMeta `refs/remotes/<ref>`
- [x] CHANGELOG Unreleased Fixed 2줄 · `npm test` 1026 pass / 0 fail / skip 1
- [ ] 외부 리뷰(claude 엔진 — codex 400 지속 시) → artifact Reviews 기록

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
- 다이어그램 옵트인: 넣지 않음 — 메인 세션 판단(한 줄 수정 두 건).
- 종결 절차(체크박스 아님): PR → merge → main 에서 `task path-edge-fixes --member hslee` → `done` → `summary --write` → push.

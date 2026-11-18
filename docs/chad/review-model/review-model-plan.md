# review-model — Plan

## 목표
`harness-team review`에 모델 선택(`--model`)과 팀·task 리뷰 프로필(`reviewers.json` `profiles`·`default`, `task --reviewer`)을 더하고,
실행 모델을 meta·artifact에 기록한다(설계 A6·결정 A6-1).

## 단계
- [x] CLI 플래그 등록 — `--model`(review)·`--reviewer`(task), help args (`src/cli-args.mjs`, `tests/cli-args.test.mjs`)
- [x] review: 모델 검증·`engineArgv` 분리·`resolveReviewer` 우선순위·프로필 스키마·meta `model`·artifact 표기 (`src/commands/review.mjs`, `src/reviewers-config.mjs`, `tests/review-model.test.mjs`)
- [x] task: Done evidence `reviewer` 파서 + `task --reviewer` 생성 시 블록·기존 task 거부 (`src/commands/task.mjs`, 테스트)
- [x] 문서: `commands/harness-review.md`(1단계·runner 표·custom 절·5단계)·`harness-loop.md`·`harness-task.md`·README·CHANGELOG + runner 표 pin
- [x] 검증: `npm test`, `npm run docs:check`(생성물 바뀌면 `docs:generate`), `node bin/harness-team.mjs doctor` — 1333 pass·0 fail·1 skip(CI 전용), docs:check 최신, doctor 경고 1(Codex 훅 신뢰, 이 변경과 무관)
- [x] 로컬 커밋 (push·PR 없음)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-18: 리뷰 프로필·기본 프로필·task 리뷰어·모델 `null` 정의 추가(spec Ontology).

## 참고
- 설계: `docs/chad/team-harness-improvements/team-harness-improvements-spec.md` "### A6"

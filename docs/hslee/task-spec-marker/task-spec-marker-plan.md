# task-spec-marker — Plan

## 목표
`task`의 "기존 task" 판정을 spec 마커 기준으로 맞춘다(R1).

## 단계
- [x] 0.41.0에서 재현(user dir 활성화 + `--area` 채택이 비-task dir에 meta 기록)
- [x] `runTask`에 spec 마커 판정 + 비어 있지 않은 비-task dir 거부
- [x] 회귀 테스트 `tests/task-spec-marker.test.mjs` (원 코드에서 red 확인)
- [x] `npm test`·golden e2e·`doctor` green
- [x] CHANGELOG `[Unreleased]` `### Fixed`
- [x] Codex 리뷰(`review codex --scope worktree`) + artifact 판별 기록
- [ ] `git add` → `npm run docs:generate` → commit → PR

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
-

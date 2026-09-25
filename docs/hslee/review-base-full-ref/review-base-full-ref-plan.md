# review-base-full-ref — Plan

## 목표
`review`·`scope` 의 추론 base 를 `refs/remotes/origin/<branch>` 전체 이름으로 — 로컬 브랜치 `origin/main` 모호성 제거.

## 단계
- [x] 실패 테스트 — `tests/scope-command.test.mjs` 로컬 `origin/main` 브랜치 시나리오(원 코드 red: diff 가 비어 empty)
- [x] 구현 — `resolveScope` origin 후보 전체 ref, `resolveDefaultRef` 폴백 검증 전체 ref
- [x] 짧은 이름을 단정하던 기대치 4곳 갱신, `commands/harness-review.md`·CHANGELOG
- [x] `npm test` 1027 pass / 0 fail / skip 1
- [x] `harness-team review codex` (config 모델 `gpt-6-astra` 로 교체 후 첫 실측) → artifact Reviews 기록 — 발견 없음, 리뷰어가 전체 ref 로 diff

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
- 다이어그램 옵트인: 넣지 않음 — 메인 세션 판단(ref 표기 두 곳).
- 종결 절차(체크박스 아님): PR → merge → main 에서 `task review-base-full-ref --member hslee` → `done` → `summary --write` → push.

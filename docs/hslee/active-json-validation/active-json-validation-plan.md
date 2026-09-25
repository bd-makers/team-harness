# active-json-validation — Plan

## 목표
손으로 고친 `.harness/active.json` 의 user·task 가 `docs/` 밖을 가리키면 모든 소비자가 활성 task 없음으로 본다.

## 단계
- [x] spec — 위치(readActive, 사용자 결정)·규칙(#99 재사용)·doctor 직접 판독 2곳 통합
- [x] 실패 테스트 — `tests/active-json-validation.test.mjs` (위반 4종 null·경고, `{}`·한글 통과, doctor 무판독) — 원 코드 5 red
- [x] 구현 — `readActive` 검증, doctor `checkActiveSpecGate`·`checkActiveDoneOnMain` 을 `readActive` 로
- [x] 문서 — README 식별 규칙 한 줄, CHANGELOG Unreleased
- [x] `npm test` green — 1014 pass / 0 fail / skip 1
- [ ] `harness-team review codex --scope diff --base origin/main` → artifact Reviews 기록

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
- 다이어그램 옵트인: 넣지 않음 — 메인 세션 판단(함수 1곳 검증 추가).
- 종결 절차(체크박스 아님): PR → merge → main 에서 `task active-json-validation --member hslee` → `done` → `summary --write` → push.
- 후속 후보(범위 밖, 미재현): task 이름 `..` 은 `^[\w.-]+$` 를 통과해 디렉터리가 `docs/<user>/..` = `docs/` 가 된다.
  `docs/` 가 비어 있지 않으면 "기존 디렉터리가 task 가 아님" 가드가 막고, 비어 있거나 없을 때만 `docs/..-spec.md` 식으로 스캐폴드할 것으로 보인다.

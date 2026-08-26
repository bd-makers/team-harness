# adversarial-verify-rubric — Plan

## 목표

적대적 검증(read-only 검증자 + 루브릭)을 D6 규범으로 확정하고, 코드 무변경 범위
(테스트 3형제 §6·ship)에 검증자 인계 단계와 루브릭을 심는다 — 도입 순서 1–2단계.

## 단계
- [x] spec 작성 + Ambiguity 자가진단 게이트 통과 (근거를 Ontology에 기록)
- [x] D6 전문 추가 — `docs/decisions.md` + `templates/docs/decisions.md` (byte-identical, cp로 미러 후 diff 확인)
- [x] AGENTS.md 결정 규범에 D6 요약 한 줄 + `templates/AGENTS.md.hbs` 짝수정
- [x] `commands/harness-review.md` 마커 계약에 kind 접미사 규약 명문화
- [x] 테스트 3형제 §6에 검증자 인계(옵트인) + testcritic 루브릭 표 (T1–T6 / C1–C6 / I1–I6)
- [x] `commands/harness-ship.md`에 정합 검증 단계(7번, S1–S5) + shipcheck 루브릭, 보고 8번으로 재번호
- [x] 회귀 고정 테스트 추가 — `tests/agent-files.test.mjs` (D6 보존·요약, kind 접미사 표면 4곳 일치)
- [x] CHANGELOG `[Unreleased]` 갱신
- [x] `npm run test:unit` (421 tests, 420 pass, 0 fail, 1 skipped) + `npm run docs:check` ("최신입니다") 통과
- [x] 외부 리뷰 `/harness-review codex` 실행 + artifact `## Reviews` 기록 (마커 포함) — P2 1건 판별·수정
- [x] 커밋 (hs-commit 컨벤션)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-08-26: **적대적 검증·검증자·루브릭·kind 접미사·정직성 규칙** 신규 정의 (spec Ontology 참조)

## 참고
- 범위 제외: 3단계(contrarian/simplifier external·interview 채점 선행), 4단계(src 변경)는 후속 task

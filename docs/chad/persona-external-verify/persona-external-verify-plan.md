# persona-external-verify — Plan

## 목표

D6 3단계 — contrarian/simplifier에 external 엔진 옵션(A1–A4·R1–R4 루브릭 +
`kind=<engine>-contrarian|-simplifier` 마커), interview에 선행 채점 단계를
순수 명령 문서 편집 + pin 테스트로 도입한다.

## 단계
- [x] spec 작성 (Ambiguity 자가진단 게이트 통과)
- [x] `commands/harness-contrarian.md` — 인수 해석 + external 엔진 절 + A1–A4 루브릭 + 마커
- [x] `commands/harness-simplifier.md` — 인수 해석 + external 엔진 절 + R1–R4 루브릭 + 마커
- [x] `commands/harness-interview.md` — 선행 채점 단계 (질문 전 pass/fail/na, fail/na만 질문)
- [x] `commands/harness-review.md` — kind 접미사 목록에 `-contrarian`·`-simplifier` 추가
- [x] `tests/agent-files.test.mjs` — 소비 표면 4→6곳 확장 + interview 선행 채점 pin
- [x] `CHANGELOG.md` `[Unreleased]` 갱신 (+ `docs:generate`로 overview 재생성 — frontmatter가 생성물에 소비됨)
- [x] 검증: `npm run test:unit`(422/421/0) + `npm run docs:check` 통과
- [x] 외부 리뷰 (`/harness-review`, probe 체인 → codex) → P2 3·P3 1 판별·반영, artifact `## Reviews` 기록
- [x] TCC(context.md) 갱신 + 커밋

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-08-26: **페르소나 external 모드**·**선행 채점**·**scope=task-docs** 신규 정의 (spec Ontology 반영)

## 참고
- spec: persona-external-verify-spec.md (요구사항 6건·범위 제외)
- 선례: commands/harness-adversarial-review.md, 테스트 3형제 §6 검증자 인계

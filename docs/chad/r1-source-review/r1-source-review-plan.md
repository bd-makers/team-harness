# r1-source-review — Plan

## 목표
R1 원천 문서 검토를 `/harness-interview` 안의 단계로 넣고, spec 템플릿에 `## 원천 검토 (R1)` 절을 두어
충돌·모순(`(unresolved)`)·누락(`(open)`)이 해결된 뒤에만 Plan으로 넘어가게 한다(규범 차단, 기계 차단 없음).

## 단계
- [x] spec 초안(`/harness-spec`) + 검증(`/harness-interview`) — Ambiguity ≤ 0.2 통과, R1 절 자체 검증
- [x] pin 테스트 먼저(red): 템플릿 절 위치 · interview 게이트 문구 · harness-spec 원천 목록 문구
- [x] `taskSpecTemplate`에 `## 원천 검토 (R1)` 절 + golden fixture 갱신
- [x] `commands/harness-interview.md` — 1단계 R1 선행 · `## R1 원천 검토` 절 · 6단계 통과 조건 ①–③
- [x] `commands/harness-spec.md` — 6단계: 원천 위치를 R1 절에도 기록
- [x] `docs/harness-cycle.md` §2 S1 "현재" 칸 · §4-1 구현 메모 + CHANGELOG `[Unreleased]`
- [x] `npm run test` green
- [x] `/harness-review` codex → artifact `## Reviews`에 판별 기록
- [x] 커밋 + `harness-team pr-check`

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-06: R1 발견 어휘 정의 — 충돌·모순 = `(unresolved)`, 누락 = `(open)`, 해결 = `→ 결정:` 줄, R1 통과 기록 = `검토 완료` 줄 (spec Ontology 반영)

## 참고
- spec: `r1-source-review-spec.md` — 설계 절의 변경 대상 표·기각 대안

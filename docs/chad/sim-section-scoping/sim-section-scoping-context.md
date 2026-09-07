# sim-section-scoping — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: sim 스코어러의 절 범위를 레벨 인식으로 바꿔 출처 태그 위양성 FAIL 제거. 수정·검증 완료.
- Current atomic step: 없음 — plan 12단계 전부 완료(리뷰 CHANGES REQUESTED의 P2·P3까지 반영).
  남은 것은 `harness-team done` 실행뿐이다.
- Stop / human-decision condition: sim 재실행 여부(과금)와 push/PR은 사용자 결정.

## Constraints and settled decisions
- 스코어러만 고친다 — 하네스는 무결함이 실측으로 확인됐다(writer-2 문서 항목 41개, 태그 정상).
- 제목 구조는 어느 커맨드도 규정하지 않는다 — 하위 제목은 writer의 자유 선택.
- 리포트 본문 신호는 수정 전 상태로 보존한다. 수정 후 값은 재채점 기반 "추론"이라고 명시.

## JIT retrieval map
- Identifiers / symbols: `sectionBody` · `ambiguityCounts` · `scoreSpecArtifacts`
- Narrow globs: `tests/sim/rules.mjs` · `tests/agentloop-spec-signals.test.mjs`
- Read next: 리뷰 절차는 harness-review 명령 문서(마커 형식이 69행).
- Verification command: `node --test tests/agentloop-spec-signals.test.mjs`

## Failure capsules (max 3 unresolved)
- (none) — SC7 위양성 FAIL, 그리고 그 수정이 만든 forceAllChecked 경계 불일치(codex P2)까지
  모두 재현·수정·검증으로 해소됐다.

## Resume checklist
- `git log --oneline -1` 로 이 변경이 커밋됐는지 확인.
- codex 리뷰는 `-m gpt-5.6-sol` 폴백 필요(`gpt-6-astra`는 CLI 0.147.0이 거부), `< /dev/null` 필수.
- 리뷰 마커를 빠뜨리면 `done` 가드가 막는다.

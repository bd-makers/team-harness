# done-guard-handoff — Spec

## 목적 / 요구사항

`harness-team done`의 "커밋되지 않은 변경이 있음" 가드가, post-commit 훅이 자동 생성하는
handoff 파일 때문에 **커밋 직후 항상 발동**하는 마찰을 제거한다. (harness-sim 리포트 2건이
실증한 발견.)

- 훅이 매 커밋 후 재생성하는 2개 파일을 가드의 dirty 검사에서 **제외**한다:
  - `docs/<user>/<task>/<task>-handoff.md` (append)
  - `docs/<user>/<user>-handoff.md` (overwrite)
- handoff **외** 실제 작업 변경이 미커밋이면 **여전히 차단**한다(가드 본래 목적 유지).

## 설계 / 접근

`collectDoneIssues`의 `git status --porcelain` 결과를 파싱해 경로 목록을 얻고, 위 2개 handoff
상대경로를 빼고도 변경이 남으면 `커밋되지 않은 변경이 있음`을 push. 메시지·exit 계약은 불변.

- 훅 amend/재커밋은 SHA 변형·post-commit 무한루프 위험 → 배제. 가드 측 제외가 정답.
- handoff는 훅이 굴리는 living 파일이라 done 전 커밋 강제 대상이 아님(의미상 타당).
- porcelain 파싱: 2자 상태 + 공백 접두 제거, rename `old -> new`는 new, quotepath 따옴표 해제.

## Ontology
- **handoff 파일**: post-commit 훅(`harness-team handoff`)이 자동 재생성하는 세션 인수인계 파일.
  사용자가 손으로 커밋할 "작업 산출물"이 아니라 훅의 출력.
- **done-guard**: 종결 전 미완 신호(미완 박스·빈 artifact·미커밋·0커밋) 점검. 이번 변경은
  "미커밋" 항목만 handoff-aware하게 좁힌다.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — done 가드가 handoff-only dirty를 차단하지 않게.
- [x] **Constraint 명확도** (30%) — 2개 handoff만 제외, 그 외는 그대로 차단. 메시지/계약 불변.
- [x] **Success 기준** (30%) — 신규 테스트 2종(handoff-only→통과 / +실파일→차단) green + 기존 무회귀 + playground 시뮬에서 `done`이 --force 없이 통과.
- [x] **Context 명확도** — `src/commands/task.mjs:330-334`, `runHandoffAuto`(472-489), 훅 `src/git-hooks.mjs`.
- [x] **Ambiguity ≤ 0.2**

## 참고
- harness-sim 리포트 2건 (2026-06-29T1504 / T1859) — 마찰 실증

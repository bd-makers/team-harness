# adopt-reviews-closed — Spec

## 목적 / 요구사항
- **문제**: `harness-team migrate --adopt-reviews`의 채택 후보에 기본 브랜치에서 이미 종결(머지)된 task가 들어간다.
  후보 필터는 기록으로 닫힌 task(레거시 `status: done`·유효한 우회)만 빼고, plan으로 닫힌 task는 일부러 남겼다 —
  ship은 했지만 머지 전인 task는 done 가드(`done`, pre-push `pr-check`)를 아직 지나야 하기 때문이다(done-derive R4·R7).
  그런데 done-derive 이후 종결은 계산값이고 머지가 곧 종결이다. 기본 브랜치에서 plan이 전부 체크된 task는 가드를
  다시 지나지 않으므로, 후보에 넣으면 "검증 마커 N개가 증거에서 빠짐 → 리뷰 재실행 필요" 같은 거짓 비용만 보여준다(소음).
- **영향**: `migrate --adopt-reviews`를 쓰는 사용자(오래된 설치일수록 종결된 구 task가 많아 목록이 길어진다).
- **기대 결과**: 기본 브랜치 R에서 종결됐고 그 뒤 재개되지 않은 task는 후보에서 빠진다. R을 모르거나 R에서 열린 task는 종전대로 후보다.
- **제약**: fetch하지 않는다(로컬 ref 기준). git이 없거나 ref가 없으면 종전 동작. 출처: done-derive 리뷰 P2-6 판별
  (`docs/chad/done-derive/done-derive-artifact.md`).

## 범위 (In / Out)
- **In**: `src/commands/migrate.mjs` `collectReviewAdoptionCandidates` 후보 필터, `tests/review-adoption.test.mjs`,
  `commands/harness-migrate.md`·`commands/harness-review.md`의 "열린 구 task" 정의, CHANGELOG.
- **Out**: 채택 동작 자체(`reviews: []` 쓰기)·잃는 증거 계산·확인 흐름 — 바꾸지 않는다. 제외된 task 수를 따로 보고하는 출력 — 요청 범위 밖.

## 원천 검토 (R1)
- 없음 — 원천은 done-derive 리뷰 판별(P2-6) 한 곳이고 충돌이 없다.

### 원천
- `docs/chad/done-derive/done-derive-artifact.md` P2-6

### 발견
- 없음

## 설계 / 접근
- **결정: A** (2026-11-20, 사용자 선택 — spec 검토 승인 겸함) — 기본 브랜치 ref에서 종결된 task를 후보에서 뺀다.
  기각한 B(현행 유지 + 문서 명시): 기본 브랜치에서 돌리면 plan으로 닫힌 task는 전부 머지된 것이라 후보는 소음뿐이다.
- 구현: `resolveClosureRef(targetDir)`를 루프 밖에서 한 번 구한다. 기존 기록 종결 제외 뒤, artifact·spec을 읽기 전에
  `closedSinceReopen(await closureAtRef(targetDir, user, task, ref), meta)`가 참이면 건너뛴다.
  - `closureAtRef`가 아니라 `closedSinceReopen`으로 판정한다: main에서 종결된 task를 로컬에서 재개하면 재개 MR이
    머지될 때까지 R은 closed지만, 그 task는 가드를 다시 지난다 → 후보로 남아야 한다. 재개·clean과 같은 판정이다.
  - `closureAtRef`는 throw하지 않고 모르면 open이다 → 실패 방향은 "후보로 남음"(종전 동작).
  - ref가 null(git 없음·origin도 main/master도 없음)이면 R 판정을 건너뛴다.

## Ontology
- **채택 후보**: meta가 있고 `reviews` 키가 없으며, 기록으로 닫히지 않았고, **기본 브랜치 R에서 마지막 재개 이후 종결되지 않은** task.
  즉 "가드를 아직 다시 지날 task".
- **R에서 종결(이번 변경의 제외 조건)**: `closedSinceReopen(closureAtRef(R), localMeta)` — R의 R1 판정(+레거시 원장 폴백)이 closed이고
  그 `closedAt`이 로컬 `reopenedAt`보다 나중(재개 이력이 없으면 참).
- 게이트 근거: 목표·제약·성공 기준·영향 코드가 위에 모두 특정됐다(가중합 1.0).

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence
```json
{ "version": 1, "tests": "required" }
```
- 테스트(`tests/review-adoption.test.mjs`): (a) main에 plan 전부 체크로 커밋된 task → 제외, (b) ref는 있으나 R에서 열린 task → 후보,
  (c) R에서 종결 뒤 로컬 재개(`reopenedAt` > R 종결) → 후보, (d) git 없음(ref 없음) → 종전대로 후보.
- `npm run test`, `npm run docs:check` 통과.

## 참고
- `src/commands/remote-task.mjs` `resolveClosureRef`·`closureAtRef`·`closedSinceReopen`
- `src/commands/migrate.mjs` `collectReviewAdoptionCandidates`

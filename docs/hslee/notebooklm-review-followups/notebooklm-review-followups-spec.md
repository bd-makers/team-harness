# notebooklm-review-followups — Spec

## 목적 / 요구사항
NotebookLM 자문 평가 보고서(PR #180, `docs/hslee/harness-notebooklm-review.md` §6·§7)가 남긴 후속 권고 네 가지를 적용한다.

1. **`done` 출력의 판별 불가 해소.** 선언 없는 task는 리뷰 증거 없이 닫히고(2026-09-10 이후 86건 중 16건), 종결 시점에 그 사실이 보이지 않는다. `.harness/gates.json`이 없으면 어느 단계도 테스트를 돌리지 않는데 이것도 보이지 않는다. 기존 "보장 범위" 한 줄에 리뷰 증거 유무와 커밋 게이트 설정 여부를 정보로 덧붙인다. 차단하지 않는다(D11).
2. **retro 순서 안내.** `done`이 활성 task를 비우고 `retro`는 활성 task가 있어야 해서, 종결 뒤 retro가 실패한다. retro 명령 문서에 "done 전에 실행"을 적는다.
3. **README 명령 개수 정정.** README는 슬래시 명령을 25개(:86, :89)·19개(:108)라고 쓰지만 실제 `commands/*.md`는 21개다.
4. **규범 준수 eval 기준선.** 규범(task-gate 질문, plan 선체크 금지, 완료 보고 4항목, PR 전 리뷰 기록)이 지켜지는지 재는 eval 4건을 추가하고 한 번 실행해 기준선을 남긴다. 사용자가 유료 실행을 승인했다.

## 범위 (In / Out)
- **In**: `src/commands/task.mjs`의 `describeDoneScope`와 호출부, done-guard 테스트·골든 픽스처, `commands/harness-retro.md`, `README.md` 개수 세 곳, `evals/50-53` 신규 케이스와 `evals/README.md` 표, CHANGELOG.
- **Out**: 보고서 §5의 보류 항목 11개(재평가 조건이 생기면 다룬다). 리뷰를 강제로 바꾸는 일(D11·`task.mjs:586-589` 근거로 기본 OFF 유지). eval 결과에 따른 규범 문장 축소·강제화(기준선을 본 뒤 별도 task로 판단).

## 원천 검토 (R1)
### 원천
- `docs/hslee/harness-notebooklm-review.md` §6 #1–#3, §7 (PR #180)
- `docs/hslee/harness-notebooklm-review-qa.md` 집계 방법

### 발견
- 없음 — 원천이 같은 평가 보고서 한 곳이고, 권고 사이에 충돌이 없다.
- 검토 완료: 2026-11-16

## 설계 / 접근
- #1은 새 장치가 아니라 기존 출력 한 줄을 넓힌다(2차 장치 규칙). 리뷰 증거는 가드와 같은 파서·증거 창을 재사용한다. `gates.json`은 존재 여부만 본다. 원래 장치(리뷰 마커, `AGENTS.md:62` 기록 규범)를 빼는 안은 16건을 판단할 기준까지 없애므로 기각했다.
- #4는 측정 장치를 하나 더한다. 원래 장치(규범 문장)를 줄이는 안은 근거 수치가 없어, 이번 기준선 결과를 보고 별도 task에서 판단한다.

## Ontology
- **리뷰 증거**: artifact의 리뷰 마커 또는 meta의 리뷰 기록. `done` 가드가 `review`에 대해 인정하는 두 출처와 같다.
- **보장 범위 줄**: `done` 통과 시 출력되는 한 줄. 확인한 것·확인 안 한 것·(이번 task부터) 정보 항목을 적는다.
- **규범 준수 eval**: 스킬 라우팅 eval(01–43)과 달리, AGENTS 규범을 모델이 따르는지 재는 케이스(50–53).

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 네 권고를 적용하고 기준선을 한 번 남긴다.
- [x] **Constraint 명확도** (30%) — 차단 금지(D11), 기존 파서 재사용, eval 비용 상한 $12.
- [x] **Success 기준** (30%) — 네 조합 출력 테스트·골든 통과, `npm test` 통과, eval 24회 결과 기록.
- [x] **Context 명확도** (brownfield 한정) — 영향 파일을 범위에 모두 적었다.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 1.0

## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고
- 평가 보고서: PR #180
- eval 실행 결과 원본(저장소 밖): `/tmp/norm-eval-results/2026-11-16T13-32-38-148Z/`

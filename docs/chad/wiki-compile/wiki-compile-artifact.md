# wiki-compile — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- spec 게이트(2026-10-07): R1 원천 검토와 채점은 오케스트레이터 지시대로 비대화형 묶음 인터뷰(`questions-2.md`, 9문항: R1 발견 2 · 열린 질문 6 · 복잡도 게이트 1)로 수행했다. 사람 답은 "전부 권장"(1–8 권장안, 9 범위 승인)이고, 그 답을 반영한 뒤 채점 5차원이 pass였다. `/harness-interview`를 대화형으로 한 문항씩 돌리지 않은 것은 AO 워커가 `AskUserQuestion`을 쓸 수 없기 때문이다.
- 다이어그램 옵트인: 2026-10-07 사람 답 "아니오" — plan에 단계 없음.
- 구현(2026-10-07, 수단 main — AO 워커는 서브에이전트를 쓰지 않는다): 1단계 `wiki sources` CLI(b3ca5c1) · 2–3단계 `/harness-wiki` 명령·Codex 래퍼·종결 절 선택 한 줄(8272059).
  - 무엇·왜: 출처 추론·마커·멱등 검색을 결정론 CLI로 내리고 분류·작성만 스킬에 남겼다(Q1). 조언 반영 — GitHub 기본 머지 제목(`Merge pull request #N`)을 첫 순위로 읽고, `task=` 값은 정확 일치로만 센다(`x`가 `x-v2`에 걸리지 않게), JSON 출력의 task 상태 키는 envelope `status`를 덮지 않게 `task_status`로 했다.
- dogfood 컴파일(2026-10-07, 4단계): `/harness-wiki` 절차대로 수행.
  - 1회차: `wiki sources chad/r2-scenario-evidence` → PR #133 · a9c3859 · chad, blockers 없음, rules 없음 → 규칙 `wiki/90_system/compile-rules.md`를 먼저 쓰고(사람 승인 Q5) 규칙대로 `wiki/20_domain/review-gates.md`에 컴파일. `chad/default-loop-skill` → PR #134 · 32aedaf · chad → `wiki/20_domain/default-loop.md`. inbox로 보낸 단락 없음.
  - 2회차(멱등 확인): 두 task 모두 `compiled: wiki/20_domain/review-gates.md` / `wiki/20_domain/default-loop.md` → 절차 4번에 따라 멈춤.
- dogfood 예외: 명령 계약은 "기본 브랜치에서 실행"이지만, 이 task의 dogfood 컴파일(#134·#133)은 위키 본문까지 PR 리뷰를 받도록 PR 브랜치에서 돌린다 — 사람이 승인한 Q5(dogfood 결과를 이 PR에 커밋)의 귀결이다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

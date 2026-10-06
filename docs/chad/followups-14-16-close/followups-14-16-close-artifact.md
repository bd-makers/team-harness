# followups-14-16-close — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `docs/followups.md`: 14–16번을 삭제하고 "남은 것: 없음"으로 바꿨다. 닫은 근거를 괄호로 기록했고, 15·16번은 "이 목록에 없는 것"에 재론 조건과 함께 옮겼다.
- 14번 실측: fork 배치 A(origin=낡은 fork)는 과포함이지만 통과하고, B(origin=원본)는 base가 정확했다. `$1` 원격 기준안은 B를 악화시켜 기각했다.
- 15·16번 실측: task 143개 중 노출 0건이다.
- 부수 발견: 빈 문서가 pr-check·done을 통과한다(실례 `dangerous-git-end-boundary` plan, `bb93755`) → task `empty-doc-guard`.
- 코드 변경 없음(spec Done evidence `tests: skip`).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

- followups의 "제안"도 가정이다. 14번 제안은 실측해 보니 한 배치를 고치지 못하고 다른 배치를 악화시켰다. 제안을 구현하기 전에 배치별로 결과표를 먼저 만든다.
- 관측 항목은 저장소 전수 검사로 노출 수를 셀 수 있다. 그 검사에서 엉뚱한 결함(빈 문서 통과)이 나왔다.

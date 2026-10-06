# roadmap-to-1-0 — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `docs/harness-cycle.md` §4-4: kc-platform `wiki/` 구조(00·10_ssot·20_domain·40–70·90_system·99_inbox)와 문서 원천 셋(kc_vault·`docs/*`·`wiki/*`)을 기록했다. 설계 함의는 추론으로 표시했다.
- `docs/harness-cycle.md` §6: 진행 계획(A1‖A2 → B → C1 → C2)과 1.0 조건을 기록했다.
- `MAINTAINING.md`: 1.0은 기본값으로 정하지 않는다 — 조건 확인 후 메인테이너에게 먼저 묻는다.
- `npm run docs:check` 최신. 문서만 바뀌어 테스트는 생략했다(`tests: skip`).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

- 버전 크기 표가 "0.x라 major를 쓰지 않는다"만 말하면, 1.0으로 넘어갈 시점이 와도 표를 기계적으로 적용하게 된다. 그런 졸업 판단은 표에 "먼저 묻는다"를 같이 적어야 한다.

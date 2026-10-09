# wiki-commit-provenance — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `wiki sources`가 PR 번호를 못 찾으면 `no-pr` 막힘 대신 커밋 출처 마커(`pr=` 없음)를 낸다. PR 경로 마커는 바이트 불변(S4 기존 테스트 무수정 통과).
- 검증(2026-10-09, 로컬): `npm test` exit 0 — tests 1213 · pass 1212 · fail 0 · skipped 1(기존 CI 전용 jq 매트릭스) · perf pass 1.
  `npm run docs:check` — "harness overview 생성 상태가 최신입니다". `harness-team scenario check` — `scenario: pass (5 checked)`.
- heliosent-profile 읽기 전용 재현(`--target ~/projects/heliosent/heliosent-profile`): 전 `marker: (막힘)` + `✗ no-pr` →
  후 `marker: <!-- harness:wiki task=hslee/hslee-profile commit=714c448 author=hslee at=2026-10-09 -->` + `note:` 한 줄, JSON `success · 컴파일 가능 (PR 없음 — 커밋 출처) · blockers []`.
  실행 전후 그 저장소 `git status --porcelain` 0줄.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

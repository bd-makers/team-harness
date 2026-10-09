# review-scope-handoff — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `resolveScope`(→ `review`·`scope`)의 dirty 판정이 활성 task의 훅 출력 경로(`handoffRelPaths` — `runHandoffAuto`가 쓰는 두 파일)를 뺀다.
  `git status --porcelain -z` + `parsePorcelainPaths` + `repoPrefix`(export만) — done 가드와 같은 집합·파서·접두 보정. 명시 `--scope`는 불변.
- 재현(2026-10-10, 수정 전 임시 저장소): 구현 커밋 후 task handoff 한 줄만 변경 → 자동 `{scope:'worktree'}`, `--scope diff` → `{scope:'diff', base:'main'}`.
- 실패 재현 먼저: S1·S2·S3 테스트를 수정 전 코드에 돌려 3건 모두 실패 확인(S1 `actual {scope:'worktree'}` vs `expected {empty:true,…}`, S2·S3 `'worktree'` vs `'diff'`) → 수정 후 3건 pass.
- 검증(2026-10-10, 로컬): `npm test` exit 0 — tests 1217 · pass 1216 · fail 0 · skipped 1(기존 CI 전용) · perf pass 1.
  `npm run docs:check` — "harness overview 생성 상태가 최신입니다". `harness-team scenario check` — `scenario: pass (3 checked)`.
- B(가드 강화) 기각·관련 잠재 문제 후속 — spec 설계 절 "B 판단", `docs/followups.md` 17번.
- 구현 중 발견: 리뷰 기록(artifact·meta)이 다음 자동 판정을 worktree로 되돌린다(실측) — 범위 밖, `docs/followups.md` 18번.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

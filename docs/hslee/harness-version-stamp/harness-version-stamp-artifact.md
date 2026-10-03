# harness-version-stamp — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 다이어그램: 미실행 — orchestrator 위임 — 소규모 변경 (2026-10-03)
- 2026-10-03: `init`이 `.harness/render-state.json`에 `harnessVersion`(실행 중 하네스 package.json version)을 기록한다
  (`src/harness.mjs` planChanges — init 저장 경로 재사용이라 `src/commands/init.mjs`는 무수정).
  `loadRenderState`는 semver 형식만 통과(#113 `stack` 선례). doctor는 `harness version: project applied X · CLI Y · plugin Z`
  check와 `--json` `versions`를 낸다. 적용 < CLI → warning + `harness-team init --yes`, 적용 > CLI → warning + CLI 갱신 명령
  (`cliDriftAction` 재사용). 기록 없음은 `unknown (기록 이전 설치)` · 경고 없음, plugin-dev는 `n/a`.
- src 수정 파일 3개(render-state·harness·doctor). 테스트: render-state 2·doctor 4 추가. README·CHANGELOG [Unreleased] 갱신.
- 검증: `npm run test` 1078 pass / 0 fail / 1 skip (+perf 1 pass), `npm run docs:check` 최신,
  임시 소비자 프로젝트에서 init→doctor 실측(일치 pass, 0.40.0으로 낮추면 warning + `init --yes`).
- 후속 후보: SessionStart 훅 nudge(적용 < CLI일 때 한 줄) — 이번 범위 밖.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-10-03 — codex read-only (`codex exec --sandbox read-only`, origin/main...c9b7cc6)
<!-- harness:review kind=codex scope=branch tip=c9b7cc6 at=2026-10-03T14:10:00+09:00 -->
- 요약: 결함 1건(P2).
- **P2** `src/render-state.mjs` SEMVER 정규식이 prerelease와 build metadata를 함께 쓴 유효 semver(`0.44.5-rc.1+build.7`)를
  거부 → 그런 CLI는 `harnessVersion`을 기록 못 하고 doctor가 unknown으로 보며 비교 경고를 놓친다.
  - 조치: 재현 확인 후 `(?:-…)?(?:\+…)?`로 분리, render-state 테스트에 동시 사용 케이스 추가.


## Learnings
- `codex exec`는 stdin이 열려 있으면 "Reading additional input from stdin..."에서 무한 대기한다 — 비대화형 호출은 `< /dev/null`.

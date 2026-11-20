# sim-sc6-retired-phrases — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- 11-06 하위 세션 두 브랜치를 병합했다 — `claude/jovial-blackwell-bfcd1f`(SC6 doctor green·sim-smoke), `claude/ecstatic-herschel-b3c503`(retired-phrases 테스트).
  충돌 1곳(`docs/harness-workflow-simulation.html` post-commit 카드)은 main 쪽을 택했다 — 같은 정정을 0.55.0 문맥까지 담고 있었다.
- SC6 현행화: 모든 미완 박스를 켠다(검토 게이트 `15aab2e` 대응), 종결은 `closureFromContent` plan 파생으로 본다(0.58.0 done-derive 대응), `--force`가 필요하면 FAIL.
- 검증: `node tests/sim/agentloop.mjs sc6` exit 0 `--force 불필요` · retired-phrases·sim-smoke·doctor-blockers 13/13 · `npm test` exit 0 · `docs:check` 통과.
- `src/` 변경 없음.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-20T08:44:13.501Z — codex (harness-team review)

- engine: codex · model: default · scope: diff · base: refs/remotes/origin/main · mergeBase: 03d90b7d4370380942a950e6f20dd332ccd91910 · tip: a95a88ff4d8637c068612b5599c33ab8490a4caa · exit 0 · 1390 B

```text
- **P1 · 차단** — 일반 `done`이 실패해 `--force`로 활성 task를 해제해도 완료 신호가 `PASS`가 되므로, 새 CI 스모크 테스트가 강제 종료 없이 완료해야 한다는 요구사항의 회귀를 놓칩니다. [tests/sim/agentloop.mjs:475](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/amazing-gagarin-3d898e/tests/sim/agentloop.mjs:475>)
- **P2 · 수정 권장** — `GIT_*`를 일괄 제거하면서 테스트 러너의 `GIT_CONFIG_NOSYSTEM=1`도 제거하므로, 시스템에 `core.hooksPath`가 설정된 환경에서는 SC6의 `init`이 샌드박스 밖 공유 훅 디렉터리를 수정할 수 있습니다. [tests/e2e/sim-smoke.test.mjs:16](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/amazing-gagarin-3d898e/tests/e2e/sim-smoke.test.mjs:16>)

`git status`에서 작업 트리가 깨끗했고, `git diff --check`, 문서 생성 상태 검사, 읽기 전용으로 실행 가능한 테스트 6건이 통과했습니다. 파일 변경은 없었습니다. 임시 파일을 쓰는 SC6 E2E와 전체 `npm test`는 실행하지 않았습니다.

**최종 판정 — 변경 요청.** SC6에서 `--force`가 필요하면 CI도 실패해야 합니다.
```

<!-- harness:review kind=codex scope=diff tip=a95a88ff4d8637c068612b5599c33ab8490a4caa at=2026-11-20T08:44:13.501Z -->

판별(작성 세션, 코드 대조):
- P1 `done 완료` 신호가 `--force`여도 PASS — **진짜.** spec 완료 기준은 `--force 불필요`인데 신호가 detail에만 남겼다.
  조치: 신호를 `releasedNull && !usedForce`로 바꿨다. 변이(첫 박스만 켜는 옛 동작)에서 SC6이 exit 1, 이 신호와 plan 진행·종결 판정이 FAIL로 잡힌다.
- P2 `sim-smoke`가 `GIT_*`를 통째로 지워 러너의 `GIT_CONFIG_NOSYSTEM=1`까지 잃는다 — **진짜**(`scripts/test-isolated.mjs:28`).
  시스템 git 설정에 `core.hooksPath`가 있으면 샌드박스의 `init`이 그 공유 디렉터리에 훅을 쓴다. 조치: 그 변수만 남긴다.
- 재검증: SC6 exit 0(`--force 불필요`), `npm test` exit 0(1,464 pass·1 skip), `docs:check` 통과.

## Learnings
- 하위 세션이 "원 세션이 정할 일"로 넘긴 결과는 원 세션 artifact에 한 줄이라도 남기지 않으면 잃는다 — 이번 두 브랜치는 14일간 PR 없이 남았고, 그사이 main 변경(검토 게이트·done-derive)이 SC6에 실패 2건을 더했다.

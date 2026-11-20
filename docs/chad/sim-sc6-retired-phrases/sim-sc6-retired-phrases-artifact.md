# sim-sc6-retired-phrases — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- 11-06 하위 세션 두 브랜치를 병합했다 — `claude/jovial-blackwell-bfcd1f`(SC6 doctor green·sim-smoke), `claude/ecstatic-herschel-b3c503`(retired-phrases 테스트).
  충돌 1곳(`docs/harness-workflow-simulation.html` post-commit 카드)은 main 쪽을 택했다 — 같은 정정을 0.55.0 문맥까지 담고 있었다.
- SC6 현행화: 모든 미완 박스를 켠다(검토 게이트 `15aab2e` 대응), 종결은 `closureFromContent` plan 파생으로 본다(0.58.0 done-derive 대응), `--force`가 필요하면 FAIL.
- 검증(HEAD `1cddd553`, 2026-11-20 재실행 출력):

  `SIM_PLAYGROUND=$TMPDIR/sc6-ev node tests/sim/agentloop.mjs sc6`
  ```text
- ✅ init installs harness (doctor green)
- ✅ task active.json set
- ✅ done-guard blocks (exit≠0 + 종결 가드 메시지)
- ✅ done-guard detects all 4 conditions
- ✅ done-guard preserves active.json
- ✅ plan 체크박스 진행 (open→closed)
- ✅ done 완료 → active.json 해제(null), --force 없이 — force 불필요
- ✅ 종결 판정 (plan 파생) — source: plan
- ✅ task handoff 에 완료 마커를 쓰지 않음
- ⚠️ AskUserQuestion done 휴먼 게이트 — 헤드리스 재현 불가 — 머신러리만 검증

(--force 불필요)

✓ SC6 all PASS/MANUAL
sc6 exit=0
  ```

  `node scripts/test-isolated.mjs --test tests/docs-retired-phrases.test.mjs tests/e2e/sim-smoke.test.mjs tests/doctor-blockers.test.mjs`
  ```text
✔ current docs repeat no retired phrase (41.697333ms)
✔ the scan reaches every scope and skips snapshots (4.206333ms)
✔ every registered phrase fails in every scope and names the file and the replacement (63.686625ms)
✔ lines that shipped in past sweeps are caught (10.601125ms)
✔ a phrase split by a line wrap or a tag is the same phrase (3.288334ms)
✔ history surfaces may keep the old phrase (6.698542ms)
✔ the history exemptions stop where the history ends (3.138417ms)
✔ doctorBlockers: 선언 빈칸만 있으면 green이다 (0.887333ms)
✔ doctorBlockers: 그 밖의 warning과 fail은 막는다 (0.093208ms)
✔ doctorBlockers: 면제는 warning에만 적용된다 (0.046333ms)
✔ isolationEnv: doctor가 읽는 개발 머신 설정 경로를 모두 샌드박스 안으로 돌린다 (0.083125ms)
✔ agentloop sc6 passes (1468.999292ms)
✔ codex sim doctorGreen ignores the real CODEX_HOME that sb.env keeps for codex exec (925.722625ms)
ℹ tests 13
ℹ pass 13
ℹ fail 0
exit=0
  ```

  `npm test` (두 번째 ℹ 묶음은 perf 러너)
  ```text
ℹ tests 1465
ℹ pass 1464
ℹ fail 0
ℹ skipped 1
ℹ tests 1
ℹ pass 1
ℹ fail 0
ℹ skipped 0
exit=0
  ```

  `npm run -s docs:check`
  ```text
harness overview 생성 상태가 최신입니다.
exit=0
  ```

  변이 검증 — plan 체크를 첫 박스만 켜는 옛 동작으로 되돌린 `tests/sim/agentloop.mjs`로 SC6 실행(exit 1, 원복함):
  ```text
- ❌ plan 체크박스 진행 (open→closed)
- ❌ done 완료 → active.json 해제(null), --force 없이 — force 필요
- ❌ 종결 판정 (plan 파생) — source: forced
✗ 3 FAIL
  ```
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

### 2026-11-20T08:54:01.329Z — codex-shipcheck (harness-team review)

- engine: codex · model: default · scope: diff · base: refs/remotes/origin/main · mergeBase: 03d90b7d4370380942a950e6f20dd332ccd91910 · tip: 1cddd55324347e09984e4c73cea7441076ca39f5 · exit 0 · 2955 B

```text
`refs/remotes/origin/main`(`03d90b7`) 기준으로 `git status`, `git diff`, `git log`를 확인했습니다. 작업 트리는 깨끗했고 `git diff --check`는 exit 0이었습니다. 파일 수정 없이 검증했으며, 테스트는 재실행하지 않았습니다.

| ID | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| S1 | spec 요구사항과 구현 대응 | BLOCKER | pass | diff에 `c.label !== 'env declarations'`, `CODEX_HOME: join(dir, '.codex-home-isolated')`, `test('agentloop sc6 passes'`가 있습니다. 스모크 테스트는 기존 `npm test`의 `tests/e2e/*.test.mjs`에 포함됩니다. SC6에는 `'$1- [x] sim lifecycle step'`, `closureFromContent`, `releasedNull && !usedForce`가 추가됐습니다. `current docs repeat no retired phrase` 테스트와 문서 두 곳의 정정도 확인했습니다. 세 번째 문서는 artifact 7행의 “main 쪽을 택했다”는 기록대로 이미 정정된 기준 브랜치 내용을 유지했습니다. |
| S2 | plan 완료 항목과 변경·커밋 대응 | MAJOR | pass | plan 7–11행의 체크 항목에 각각 대응하는 커밋이 있습니다. 두 병합은 `9a9fd31a`·`d805c351`, SC6 현행화는 `a95a88ff`의 `closureFromContent` 추가로 확인했습니다. 검증과 리뷰 기록은 `1cddd553`의 artifact diff에 각각 `+ 검증:`과 `+ ### 2026-11-20T08:44:13.501Z — codex (harness-team review)`로 추가됐습니다. |
| S3 | 스코프 밖 변경 여부 | MAJOR | pass | spec 19–21행의 “두 브랜치 병합과 충돌 해소”, “SC6의 plan 체크·종결 판정 현행화”, “retired-phrases 테스트가 0.58.0 문서에서 새로 잡는 것의 처리”에 변경이 대응합니다. `MAINTAINING.md`의 “옛 문구를 `tests/docs-retired-phrases.json`에 등록한다”는 문구와 overview의 “자동 회귀 검증” 항목은 병합한 테스트에 대응합니다. 병합 후 추가된 `GIT_CONFIG_NOSYSTEM` 보존의 사유는 artifact 35–36행에 기록됐습니다. `src/` diff는 비어 있습니다. |
| S4 | 실행된 리뷰와 마커 기록 | MAJOR | pass | meta의 `reviews` 1건과 artifact `## Reviews`의 `<!-- harness:review kind=codex scope=diff tip=a95a88ff4d8637c068612b5599c33ab8490a4caa at=2026-11-20T08:44:13.501Z -->`가 일치합니다. 같은 섹션에 P1·P2와 각 조치가 기록돼 있습니다. |
| S5 | 검증 명령과 실제 출력 인용 | BLOCKER | fail | artifact 9·37행의 “13/13”, “`npm test` exit 0(1,464 pass·1 skip)”, “`docs:check` 통과”는 실행 결과 요약입니다. 실제 터미널 출력이 인용되지 않았고, spec 54행의 `node scripts/test-isolated.mjs --test tests/docs-retired-phrases.test.mjs tests/e2e/sim-smoke.test.mjs`에 대응하는 실행 명령과 출력도 artifact에서 확인할 수 없습니다. |

**최종 판정 — PR 준비 보류. 실패 항목은 S5(BLOCKER)이며, 실제 검증 명령과 출력 인용이 필요합니다.**
```

<!-- harness:review kind=codex-shipcheck scope=diff tip=1cddd55324347e09984e4c73cea7441076ca39f5 at=2026-11-20T08:54:01.329Z -->

판별(작성 세션): S1–S4 pass 동의. S5 fail — **진짜**(문서 결함). `## 결과`의 검증 줄이 요약뿐이었다.
조치: HEAD `1cddd553`에서 SC6·대상 테스트·`npm test`·`docs:check`를 다시 돌려 출력을 `## 결과`에 인용하고, 변이 검증 출력도 붙였다. 코드는 바꾸지 않았다.

## Learnings
- 하위 세션이 "원 세션이 정할 일"로 넘긴 결과는 원 세션 artifact에 한 줄이라도 남기지 않으면 잃는다 — 이번 두 브랜치는 14일간 PR 없이 남았고, 그사이 main 변경(검토 게이트·done-derive)이 SC6에 실패 2건을 더했다.

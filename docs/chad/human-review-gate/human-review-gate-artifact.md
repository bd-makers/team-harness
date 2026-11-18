# human-review-gate — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 신규 task plan `## 단계` 맨 위에 `- [ ] [사람] spec 검토 승인 — <user>`(정본 `reviewGateStep`)를 기본으로 넣는다. `--no-review-gate`면 넣지 않고,
  기존 task에 주면 거부한다(exit 1, 아무것도 쓰지 않음). 생성 출력에 `review gate:` 줄. `taskPlanTemplate(name)`(옵션 없음)은 종전과 바이트 단위로 같다.
- `pr-check`는 plan의 게이트 줄(미완·완료)을 뺀 뒤 템플릿 그대로를 판정한다 — 손대지 않은 게이트 plan·게이트만 켠 plan을 잡는다.
- 문서: `commands/harness-task.md` 검토 게이트 절(승인 규칙·`- 검토 승인: <날짜> · 슬라이드 <경로|없음>`·승인 전 task 문서 밖 수정 금지·빼기)과
  생성 시 통합 질문(multiSelect 넷: 레거시·sequence·module·게이트 빼기), `commands/harness-loop.md` 진입 1번·시작 지점·Dev 지시·멈춤 "승인 필요",
  `docs/harness-cycle.md` §2 S2·§4-3 멈춤 요약, `CHANGELOG.md` `[Unreleased]`.
- 테스트: `tests/task-templates.test.mjs`(게이트 5건), `tests/pr-check.test.mjs`(변형 4건), `tests/cli-args.test.mjs`(boolean·task 전용·help),
  `tests/loop-command.test.mjs`(진입·시작 지점·Dev·승인 필요 재고정), `tests/agent-files.test.mjs`(게이트 절·통합 질문·cycle S2),
  `tests/e2e/task-paths-golden.test.mjs`(plan 편집을 게이트+단계로, golden 재생성 — diff는 `review gate:` 줄과 plan 게이트 줄 둘뿐).
- 변이 확인: `pr-check.mjs`에서 완료 게이트 줄 제거 조건(`&& line !== GATE_DONE(user)`)을 지우면 `tests/pr-check.test.mjs` 1건 실패(pass 26 · fail 1).
- 검증(2026-11-18): `npm test` 1차 — tests 1373 · pass 1371 · fail 1(golden, 의도된 출력 변화) → golden 갱신 후 그 파일 pass 1 · fail 0.
  `npm run docs:check` exit 0("harness overview 생성 상태가 최신입니다."). `node bin/harness-team.mjs doctor` — 경고 1건(기존 `.codex/hooks.json` 훅 신뢰, 이 변경과 무관).
  `node bin/harness-team.mjs pr-check --base origin/main`(커밋 `15aab2e`) — `✓ pr-check HEAD: chad/human-review-gate`, exit 0(다이어그램 권장 안내 1줄).
- 강도 실측(2026-11-18): 빈 저장소에 `task demo --member tester` 후 `node bin/harness-team.mjs session-context --target <dir> --member tester` →
  `[harness] 현재 단계: [사람] spec 검토 승인 — tester`, exit 0. `done`의 `review: required` 판정은 판정 창 안 시각만 본다(`inWindow`) — 리뷰 뒤 수정 커밋(`87a2e2a`)이 증거를 무효로 만들지 않는다.
- Codex 리뷰 반영 뒤(2026-11-18): `npm test` exit 0 — tests 1375 · pass 1374 · fail 0 · skipped 1, perf 단계 tests 1 · pass 1. `npm run docs:check` exit 0.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-18T12:54:37.100Z — codex (harness-team review)

- engine: codex · model: default · scope: diff · base: origin/main · mergeBase: 7afaa409bc2c8b7f4176cad8de5c2c88db4034ed · tip: 15aab2e51eeff2dfb0f58dff5d2273bdfbb5f6b3 · exit 0 · 1992 B

```text
- **P2** [src/commands/pr-check.mjs:89](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/amazing-gagarin-3d898e/src/commands/pr-check.mjs:89>) — A plan containing only the review checkbox passes because the empty-file check runs before the gate line is stripped.
- **P2** [src/commands/task.mjs:466](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/amazing-gagarin-3d898e/src/commands/task.mjs:466>) — The retry command drops `--member`, so following it can activate the default user’s task when both members have a task with the same name.
- **P2** [src/commands/task.mjs:362](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/amazing-gagarin-3d898e/src/commands/task.mjs:362>) — `--no-review-gate=false` silently omits the gate because the parser returns `"false"` as a string and the command treats it as truthy.
- **P2** [commands/harness-interview.md:38](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/amazing-gagarin-3d898e/commands/harness-interview.md:38>) — The interview handoff still directs agents from plan drafting into implementation without telling the plan writer to preserve the approval checkbox or obtain approval before implementation.

**Verification.** Reviewed `git status` and `git diff origin/main` read-only. All 34 targeted tests, the docs check, and `pr-check --base origin/main --json` passed. In-memory checks confirmed JSON creation with `--member`, rejection without writes, plan preservation on reopen, and the three CLI findings above. I skipped the full suite because it writes temporary fixtures.

**Verdict.** Request changes. No P1 findings.
```

<!-- harness:review kind=codex scope=diff tip=15aab2e51eeff2dfb0f58dff5d2273bdfbb5f6b3 at=2026-11-18T12:54:37.100Z -->

판별·조치(작성 세션이 재현·판별, D6):
- P2-1 진짜 결함 — 재현: `${reviewGateStep('u')}\n`만 든 plan이 통과(빈 문서 판정이 게이트를 빼기 전 본문으로 돔). 조치: `judgedBody`로 게이트를 뺀 본문에
  빈 문서·템플릿 판정을 같이 건다. 테스트 `pr-check: 게이트가 든 plan 도 …`에 "게이트 줄만 남음 → 비어 있음" 추가.
- P2-2 진짜 결함(형제 포함) — 거부 안내의 재실행 명령이 `--member`를 버려 기본 user의 동명 task로 샐 수 있다. 같은 결함이 A6 `--reviewer` 거부 안내에도 있었다.
  조치: 두 안내 모두 `activateCmd`(member를 명시했을 때만 `--member <user>`). 테스트: task-templates(명시·config user 둘 다), review-model(`--reviewer`).
- P2-3 진짜 결함 — 재현: `resolveInvocation(['task','demo','--no-review-gate=false']).flags` → `{"no-review-gate":"false"}`(truthy → 게이트 조용히 빠짐).
  조치: 맨 플래그(`true`)만 받고 값이 있으면 거부(exit 1, 아무것도 쓰지 않음). 다른 boolean 플래그의 같은 파서 동작은 범위 밖(후속 후보). 테스트: `'false'`·`'true'`·`''` 거부.
- P2-4 진짜 결함 — plan writer(`superpowers:writing-plans`·직접 작성)가 `## 단계`를 다시 쓰며 게이트 줄을 지울 수 있고, interview 인계가 "plan 작성 → 구현"이었다.
  조치: `commands/harness-interview.md` 6번 인계를 "plan 작성 → 사람 검토 승인 → 구현"으로, plan writer 항목에 "게이트 단계는 지우지 않고 맨 위에 둔다"를 더했다.
  `commands/harness-task.md` 빼기 항목에도 "그 밖의 이유로 지우지 않는다". Cursor(AGENTS plan 계약만 읽음)는 여전히 이 문장을 직접 보지 않는다 — spec Out 결정 유지, 후속 후보.
- 재검: R3 재검은 돌리지 않았다 — P1 없음, P2 넷 모두 재현·반영·테스트로 닫힘.

## Learnings
- 변이 확인을 `git checkout <file>`로 되돌리면 그 파일의 미커밋 편집까지 날아간다 — 백업 사본(`cp`)에서 복원해야 한다(이번에 한 번 겪고 백업으로 복구).
- 새 기본 단계를 템플릿에 넣을 때는 옵션 없는 템플릿을 바이트 단위로 보존해야 기존 테스트(`.replace('- [ ]', …)`)가 엉뚱한 줄을 켜지 않는다 — golden이 바로 그 경우였다.

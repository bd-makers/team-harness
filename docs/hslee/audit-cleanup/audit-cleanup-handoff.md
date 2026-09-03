# audit-cleanup — Handoff

## 상태 (2026-09-03, 세션 종료 시점)
- 위치: git worktree `.claude/worktrees/delegation-router-review-9d679d` · 브랜치 `claude/delegation-router-review-9d679d` · base `main` 3c659bb (0.23.1)
- 구현·문서·테스트·리뷰 **모두 완료**. 변경 121파일은 **스테이징만** 되어 있고 커밋은 없다(커밋은 사용자 지시로만).
- 검증: `npm test` 508 pass / 1 skip(CI 전용) + perf 1 pass · `npm run docs:check` exit 0 · `node bin/harness-team.mjs doctor` green(plugin-dev)
- 외부 리뷰: codex 1차(P1 1·P2 4·P3 1 → 전부 재현·반영) → codex 2차(발견 0, 승인). 마커 2개는 artifact `## Reviews`에 있다.
- 남은 단계 하나: **사용자 커밋 → `node bin/harness-team.mjs done`**. 가드가 "미커밋 변경 있음·task 시작 이후 커밋 0개"로 현재 막고 있다. `--force`는 쓰지 않는다.

## 다음 세션이 할 일 (순서대로)
1. 이 worktree에서 `git status --short | wc -l` — 121이면 아직 미커밋. 0이면 이미 커밋된 것이니 3번으로.
2. 사용자에게 커밋을 확인받고 커밋한다(아래 메시지 초안). post-commit 훅이 handoff를 자동 갱신한다.
3. `node bin/harness-team.mjs done` 실행 → 통과하면 task 종결. 집계 원장은 기본 브랜치에서 `harness-team summary --write`.
4. PR은 `/harness-ship` 후 사용자 지시로. 릴리스는 별도 작업 — `apply` 삭제·멤버 제외는 소비자에게 깨지는 변경이라 **minor bump**를 권한다
   (`commands/harness-release.md` + MAINTAINING.md 릴리스 절차; what-changes 페이지·index.html·overview 배지·CHANGELOG 헤딩 이동 필요).

## 커밋 메시지 초안
```
feat!: apply 삭제·OpenCode/Gemini 멤버 제외(D7) + 2026-09-03 감사 발견 수정

- apply → init 단일화(재실행은 마커 병합), /harness-apply·Codex harness-apply 스킬 제거
- OpenCode·Gemini: 스캐폴드·역할표·doctor·gitignore·ITEMS·리뷰 엔진 체인(codex → claude)·매니페스트에서 제외, decisions.md D7
- observe-tools 공백 경로 no-op, 마커 손상 병합 가드, boundary stderr 미러·Write 판정, 스택 감지(TS·bun.lock·--stack 검증·RN rules 게이트),
  git-hooks hooksPath/worktree, protect-files·block-dangerous-git 패턴, .harness gitignore 범위, 문서 결함 다수
- codex 리뷰 1차 6건 반영(전역 옵션 우회·마커 순서·checkbox 스왑·Edit|Write·주석 마커·help), 2차 발견 0
- 회귀 테스트 5파일 신규(기존 4파일 확장), npm test 508 pass; docs:generate 재생성; CHANGELOG [Unreleased]

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

## 결정·해석 (재론하지 말 것)
- "opencode·gemini 부분 제거"는 **리뷰 엔진 체인까지 포함**으로 해석해 사용자에게 명시했고 이의는 없었다. Gemini 리뷰가 필요하면 `custom` 엔진.
- 비-RN 프로젝트는 이제 rules 0개라 `.cursor/rules` 미러가 생기지 않는다(설치 rules 4종이 전부 Expo 전용). e2e 기대값을 그에 맞췄다.
- `settingsHasBoundaryCheckpoint`: doctor는 Edit·Write 둘 다 요구, migrate는 `requireWrite:false`로 Edit-only 커스터마이즈를 존중.
- 플러그인 소스 저장소는 자기 하네스를 dogfood하지 않는다(D7에 기록). SessionStart 훅이 없으므로 새 세션은 이 파일을 직접 읽어야 한다.

## 함정
- `npm run docs:generate` 전에 `git add -A` — 인벤토리가 `git ls-files` 기준이라 삭제·신규 파일이 index에 없으면 생성물이 낡는다(docs:check는 green).
- 사용자 전역 `~/.claude/CLAUDE.md`에 `/harness-review gemini`·폴백 체인 codex → gemini → claude 문장이 남아 있다. 개인 파일이라 손대지 않았다 — 사용자에게 안내만.
- 설치된 플러그인(마켓플레이스 캐시)은 아직 0.23.1이라 `/harness-review` 스킬 본문에 gemini가 보인다. 이 저장소의 `commands/harness-review.md`가 정본.

## 범위 밖으로 남긴 것
- `templates/.claude/settings.json`의 pnpm 전용 권한 목록 · `docs/task_summary.md`의 `root-docs-0200-rubric` open 상태 · 이력 스냅샷 문서의 옛 서술.

## 2026-09-03T02:08:42.807Z — 58b2284 feat!: apply 삭제·OpenCode/Gemini 멤버 제외(D7) + 2026-09-03 감사 발견 수정
.claude-plugin/marketplace.json                    |   6 +-
 .claude-plugin/plugin.json                         |   3 +-
 .codex-plugin/plugin.json                          |   8 +-
 .codex/hooks.json                                  |   2 +-
 AGENTS.md                                          |  19 +-
 CHANGELOG.md                                       |  60 ++++++
 GEMINI.md                                          |  21 --
 MAINTAINING.md                                     |  10 +-
 README.md                                          | 141 ++++++-------
 bin/harness-team.mjs                               |   2 -
 commands/harness-adversarial-review.md             |   4 +-
 commands/harness-apply.md                          |  35 ---
 commands/harness-contrarian.md                     |   4 +-
 commands/harness-delete.md                         |   6 +-
 commands/harness-doctor.md                         |   2 +-
 commands/harness-init.md                           |  45 ++--
 commands/harness-release.md                        |  21 +-
 commands/harness-retro.md                          |   7 +-
 commands/harness-review.md                         |  32 ++-
 commands/harness-simplifier.md                     |   4 +-
 commands/harness-sync.md                           |   6 +-
 commands/harness-task.md                           |  17 +-
 commands/harness-upgrade.md                        |   6 +-
 docs/decisions.md                                  |  21 ++
 docs/diagrams/harness-overview/architecture.mmd    |   8 +-
 docs/diagrams/harness-overview/core.mmd            |   5 -
 docs/diagrams/harness-overview/subagents.mmd       |  12 +-
 docs/diagrams/harness-overview/workflow.mmd        |  16 +-
 docs/harness-fleet-guide.html                      |  12 +-
 docs/harness-overview.html                         | 231 +++++++++++---------
 docs/harness-overview.template.html                |  71 +++----
 docs/harness-rubric-guide.html                     |   5 +-
 docs/harness-task-guide.html                       |  27 ++-
 docs/harness-workflow-diagrams.html                |  11 +-
 docs/harness-workflow-schematics.html              |   4 +-
 docs/harness-workflow-simulation.html              |  13 +-
 docs/hslee/audit-cleanup/audit-cleanup-artifact.md | 107 ++++++++++
 docs/hslee/audit-cleanup/audit-cleanup-context.md  |  27 +++
 docs/hslee/audit-cleanup/audit-cleanup-handoff.md  |  43 ++++
 docs/hslee/audit-cleanup/audit-cleanup-meta.json   |   8 +
 docs/hslee/audit-cleanup/audit-cleanup-plan.md     |  61 ++++++
 docs/hslee/audit-cleanup/audit-cleanup-spec.md     |  62 ++++++
 docs/hslee/hslee-handoff.md                        |   6 +-
 docs/index.html                                    |   4 +-
 docs/prerequisites.md                              |  43 ++--
 package.json                                       |   4 +-
 skills/harness-adversarial-review/SKILL.md         |   2 +-
 .../harness-adversarial-review/agents/openai.yaml  |   4 +
 skills/harness-apply/SKILL.md                      |  20 --
 skills/harness-apply/agents/openai.yaml            |   4 -
 skills/harness-codex-sim/SKILL.md                  |   2 +-
 skills/harness-comptest/agents/openai.yaml         |   4 +
 skills/harness-diagram/agents/openai.yaml          |   4 +
 skills/harness-inttest/agents/openai.yaml          |   4 +
 skills/harness-review/SKILL.md                     |   8 +-
 skills/harness-review/agents/openai.yaml           |   4 +
 skills/harness-ship/agents/openai.yaml             |   4 +
 skills/harness-sim/SKILL.md                        |   8 +-
 skills/harness-sync/SKILL.md                       |   2 +-
 skills/harness-team/SKILL.md                       |   9 +-
 src/cli-args.mjs                                   |  20 +-
 src/commands/apply.mjs                             |   4 -
 src/commands/backup.mjs                            |   6 +-
 src/commands/boundary.mjs                          |  52 +++--
 src/commands/clone.mjs                             |   2 +-
 src/commands/delete.mjs                            |   4 +-
 src/commands/doctor.mjs                            |  43 ++--
 src/commands/init.mjs                              |  25 ++-
 src/commands/migrate.mjs                           |  52 +++--
 src/commands/symlink.mjs                           |   2 +-
 src/commands/sync.mjs                              |   2 +-
 src/commands/task.mjs                              |   4 +-
 src/commands/upgrade.mjs                           |   2 +-
 src/detect-stack.mjs                               |  67 ++++--
 src/git-hooks.mjs                                  |  41 +++-
 src/harness.mjs                                    |  86 ++++----
 src/merge.mjs                                      |  44 +++-
 templates/.claude/hooks/block-dangerous-git.sh     |  70 ++++--
 templates/.claude/hooks/boundary-checkpoint.sh     |   8 +-
 templates/.claude/hooks/observe-tools.mjs          |  14 +-
 templates/.claude/hooks/protect-files.sh           |  23 +-
 templates/.claude/rules/styling.md                 |   2 +-
 templates/.claude/rules/testing.md                 |   2 -
 templates/.claude/settings.json                    |   1 -
 templates/.claude/skills/fix-bug/SKILL.md          |   6 +-
 templates/.claude/skills/new-feature/SKILL.md      |   8 +-
 templates/.claude/skills/verify/SKILL.md           |  25 +--
 templates/.opencode/opencode.json                  |  20 --
 templates/AGENTS.md.hbs                            |  17 +-
 templates/GEMINI.md.hbs                            |  21 --
 templates/clone.sh                                 |   6 +-
 templates/delete.sh                                |   7 +-
 templates/docs/decisions.md                        |  21 ++
 templates/symlink.sh                               |   2 +-
 tests/agent-files.test.mjs                         | 102 ++++++---
 tests/boundary-checkpoint-write.test.mjs           |  84 ++++++++
 tests/cli-args.test.mjs                            |  10 +-
 tests/codex-hooks.test.mjs                         |  10 +-
 tests/detect-stack.test.mjs                        |  86 ++++++++
 tests/doctor.test.mjs                              |  26 +--
 tests/done-guard.test.mjs                          |   6 +-
 tests/e2e/boundary-checkpoint.test.mjs             |   2 +-
 .../{apply-smoke.test.mjs => init-smoke.test.mjs}  |  18 +-
 tests/e2e/lifecycle.test.mjs                       |   2 +-
 tests/e2e/sandbox.mjs                              |  10 +-
 tests/e2e/ssot-consistency.test.mjs                |  23 +-
 tests/fixtures/stock-hooks/README.md               |   6 +
 .../pre-audit-cleanup/block-dangerous-git.sh       |  92 ++++++++
 .../pre-audit-cleanup/boundary-checkpoint.sh       |   7 +
 .../pre-audit-cleanup/observe-tools.mjs            | 234 +++++++++++++++++++++
 .../stock-hooks/pre-audit-cleanup/protect-files.sh |  55 +++++
 tests/git-hooks.test.mjs                           | 115 ++++++++++
 tests/gitignore-entries.test.mjs                   |  34 +++
 tests/harness-settings.test.mjs                    |   7 +
 tests/hooks-jq-fallback.test.mjs                   |  40 +++-
 tests/migrate-agents.test.mjs                      |  10 +-
 tests/migrate-hooks.test.mjs                       |  21 +-
 tests/observe-tools-entry.test.mjs                 |  67 ++++++
 tests/sim/agentloop.mjs                            |  23 +-
 tests/sim/codex-agentloop.mjs                      |  15 +-
 tests/sim/skilltest.mjs                            |   2 +-
 tests/stack-conditional-rules.test.mjs             |  48 ++++-
 122 files changed, 2318 insertions(+), 887 deletions(-)

## 2026-09-03T02:08:42.941Z — 완료

태스크 종료.

## 2026-09-03 — 후속: 머지 · 원장 · 0.24.0 릴리스 (세션 인수인계)

task는 `done`으로 종결됐고 이 절은 그 뒤의 후속 작업 기록이다. 새 세션은 여기서 시작하면 된다.

**끝난 것**
- PR #69 머지 `d69e335`(merge commit) → 원장 `8265b77` → 릴리스 `f32b05b` + 태그 `v0.24.0`.
  release 워크플로우 success, GitHub Release 발행(본문 = CHANGELOG 0.24.0 절, BREAKING 2건 첫 줄 표기).
- 로컬 설치본: 캐시 `0.24.0`, installed_plugins.json 갱신, 마켓플레이스 clone `f32b05b`, `harness-team --version` = 0.24.0.
- ship 정합 검증(codex-shipcheck): S1–S4 pass, S5(검증 인용 형식) → artifact 문서 정정. 마커 3개는 artifact `## Reviews`.

**남은 것 (사용자 결정 필요)**
1. **main 작업 트리에 미커밋 편집이 있다** — `docs/harness-task-guide.html` 3 훅크(SVG 라벨 `/harness-spec`, figcaption의 4·6번 칸 축약 이름 설명, `/harness-diagram` 어댑터 문단). 이 세션이 만든 것이 아니라 손대지 않았다(릴리스 커밋에는 footer 한 줄만 따로 스테이징해 넣었다). 커밋할지 버릴지 결정할 것.
2. **머지된 worktree·브랜치 정리** — `.claude/worktrees/delegation-router-review-9d679d`(브랜치 `claude/delegation-router-review-9d679d`, 원격에도 있음)와 이 후속 세션의 빈 worktree `.claude/worktrees/delegation-router-audit-cleanup-d4a996`(브랜치 `claude/delegation-router-audit-cleanup-d4a996`, 커밋 0). iCloud 경로라 `git worktree prune`은 쓰지 말고 개별 `worktree remove` + `branch -d`로.
3. 새 슬래시 커맨드 목록(23개, `apply` 없음)은 **Claude Code를 다시 열어야** 반영된다.
4. 사용자 전역 `~/.claude/CLAUDE.md`에 `/harness-review gemini`·codex → gemini → claude 폴백 문장이 남아 있다(개인 파일, 미수정).
5. 이 릴리스 진행 중 같은 worktree에 피어 세션(`delegation-router-review-9d679d-4b`)이 살아 있었고 커밋 사실을 통지하지 않았다. 그 세션이 아직 열려 있으면 작업이 이미 머지·릴리스됐음을 알릴 것.
6. what-changes 0.24.0 페이지·overview 배너 산문은 이 세션(AI)이 썼다 — 사람 검토 권장.

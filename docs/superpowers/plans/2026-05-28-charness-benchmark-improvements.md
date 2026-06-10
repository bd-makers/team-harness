---
tags:
  - project
  - ai
  - obsidian
created: 2026-05-28
modified: 2026-05-28
---

# charness 벤치마킹 기반 개선 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [corca-ai/charness](https://github.com/corca-ai/charness)의 구조적 강점 중 우리 컨텍스트(5-agent 통합 플러그인)에 ROI가 높은 4개 항목을 단계적으로 도입해 — (1) 메커니즘 명령에만 머물러 있는 commands 위에 **의도 기반 워크플로우 스킬** 층을 얹고, (2) CLAUDE.md.hbs 정책에만 존재하는 **자기개선 루프**를 실행 가능한 스킬로 구현하고, (3) **릴리스 휴먼 에러를 제거**하고, (4) **doctor 진단 깊이를 강화**한다.

**Architecture:**
- `commands/`에 새로운 의도 스킬(`harness-spec`, `harness-impl`, `harness-debug`, `harness-retro`, `harness-release`) 추가 — 기존 메커닉 스킬(symlink/clone/migrate 등)과 분리되는 2-tier 구조.
- `src/`에 릴리스 자동화 로직(`src/commands/release.mjs`) 추가 — 3-file 버전 bump + cache sync + installed_plugins.json 갱신을 단일 명령으로.
- `src/commands/doctor.mjs` 강화 — 외부 도구(gh/codex/gemini CLI) healthcheck + bin/* 실행성 검사.
- profile/preset JSON, charness-artifacts 별도 디렉토리, Python 런타임, specdown/cosmic-ray는 **도입하지 않음** (ROI 음수 판단).

**Tech Stack:** Node.js 18+ ESM, `node:test`, `node:fs/promises`, 마크다운 슬래시 커맨드 (`.md` frontmatter)

**참고 문서:** `docs/superpowers/plans/2026-05-28-charness-benchmark-analysis.md`(본 플랜의 사전 분석 — 별도 작성 시) 또는 본 세션 상단 분석 응답.

---

## Scope

### In Scope
- Task 1: `/harness-retro` 스킬 — 자기개선 루프 실행
- Task 2: `/harness-release` 스킬 + `src/commands/release.mjs` — 버전 범프·캐시 동기화 자동화
- Task 3: `/harness-spec`, `/harness-impl`, `/harness-debug` 의도 스킬 — `/harness-task` 위 작성 가이드 layer
- Task 4: `harness-doctor` 외부 도구 healthcheck 강화

### Out of Scope (벤치마킹은 했으나 도입 제외)
- profile/preset JSON 시스템 — 현재 단일 시나리오에 과잉
- Python 런타임 / specdown / cosmic-ray / stryker — Node.js 일관성 + 규모 대비 오버킬
- `charness-artifacts/` 별도 디렉토리 — `docs/<member>/<name>/artifact.md`로 이미 충분
- public/support/integration 3-tier 풀구조 — 2-tier로 충분

---

## File Structure

| 역할 | 변경 | 파일 |
|------|------|------|
| 자기개선 루프 슬래시 커맨드 | Create | `commands/harness-retro.md` |
| 릴리스 자동화 슬래시 커맨드 | Create | `commands/harness-release.md` |
| 릴리스 오케스트레이터 (bump + cache sync + installed_plugins.json) | Create | `src/commands/release.mjs` |
| release 등록, HELP 업데이트 | Modify | `bin/harness-team.mjs` |
| spec/impl/debug 의도 스킬 | Create | `commands/harness-spec.md`, `commands/harness-impl.md`, `commands/harness-debug.md` |
| 외부 도구 healthcheck 추가 | Modify | `src/commands/doctor.mjs` (또는 해당 파일) |
| release 단위 테스트 | Create | `tests/release.test.mjs` |
| doctor healthcheck 테스트 | Create 또는 Modify | `tests/doctor.test.mjs` |
| 버전 범프 0.6.4 → 0.7.0 (Task 1~4 머지 후 일괄) | Modify | `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` |
| 플러그인 README — 새 명령 섹션 | Modify | `README.md` |

---

## Task 1: `/harness-retro` — 자기개선 루프 스킬

**Why first:** 가장 작고(스킬 파일 1개 + 문서), 효과는 즉시. CLAUDE.md.hbs에 명시된 정책↔실행 갭을 메운다.

**Files:**
- Create: `commands/harness-retro.md`
- Modify: `README.md` (명령어 레퍼런스 표에 추가)

- [ ] **Step 1: 스킬 동작 정의**
  - 입력: 활성 task (`.harness/active.json`) 또는 인자로 지정된 task 경로
  - 동작: 해당 task의 `artifact.md` 끝에 `## Learnings (YYYY-MM-DD)` 섹션을 append. 사용자에게 "이번 세션에서 교정받은/배운 항목"을 물어보고 기록.
  - 출력: 추가된 라인 diff 표시

- [ ] **Step 2: frontmatter + 본문 작성**
  - `description`: "현재 또는 지정 task의 artifact.md에 학습/교정 내용 append. CLAUDE.md.hbs 자기개선 루프 정책 실행."
  - 사용 시점, 인자 형식, 출력 예시 포함

- [ ] **Step 3: README의 명령어 레퍼런스 표에 한 줄 추가**

- [ ] **Step 4: 수동 검증**
  - 임시 task 생성 → retro 실행 → artifact.md에 섹션이 정확히 append 되는지 확인

---

## Task 2: `/harness-release` — 릴리스 자동화

**Why second:** 매 릴리스마다 반복되는 휴먼 에러 지점(3-file 동기화 누락, marketplace.json만 빠뜨림 — 실제 Apr 27 obs 951에서 발생)을 제거. ROI 큼.

**Files:**
- Create: `src/commands/release.mjs`
- Create: `commands/harness-release.md`
- Create: `tests/release.test.mjs`
- Modify: `bin/harness-team.mjs` (release 서브커맨드 등록)
- Modify: `README.md` (버전 범프 체크리스트 섹션을 새 명령으로 대체)

- [ ] **Step 1: 실패하는 테스트 작성** (`tests/release.test.mjs`)
  - 임시 디렉토리에 가짜 `package.json` / `.claude-plugin/plugin.json` / `.claude-plugin/marketplace.json` 생성
  - `release({ bump: 'patch', dryRun: true })` 호출 → 3개 파일 모두 같은 새 버전을 반환하는지 검증
  - `--dry-run` 시 파일은 실제 수정되지 않아야 함

- [ ] **Step 2: `src/commands/release.mjs` 구현**
  - 시그니처: `export async function release(opts)` — `bump: 'major'|'minor'|'patch'|<explicit>`, `dryRun`, `skipCache`
  - 단계: (1) 3-file 현재 버전 검증·일치 확인, (2) 새 버전 계산, (3) 3-file 수정, (4) `~/.claude/plugins/cache/.../<new>/` 생성 후 rsync, (5) `~/.claude/plugins/marketplaces/.../` 동기화, (6) `~/.claude/plugins/installed_plugins.json` 갱신 (version/installPath/lastUpdated/gitCommitSha), (7) 결과 요약 출력
  - `dryRun`은 (3)~(6) 스킵하고 계획만 출력

- [ ] **Step 3: `bin/harness-team.mjs`에 `release` 서브커맨드 등록**

- [ ] **Step 4: `commands/harness-release.md` 슬래시 커맨드** — Claude가 이 명령을 호출해 `harness-team release ...`을 실행

- [ ] **Step 5: 테스트 통과 확인 → 0.6.4 → 0.7.0 본 릴리스에서 실제 사용으로 dogfood**

---

## Task 3: 의도 기반 워크플로우 스킬 (`spec`, `impl`, `debug`)

**Why third:** 현재 `/harness-task`가 `spec.md`/`plan.md`/`artifact.md` 파일을 만들기만 하고 "어떻게 작성하는지"는 비어 있음. charness의 `spec`/`impl`/`debug` 패턴 차용해 작성 가이드를 스킬화.

**Files:**
- Create: `commands/harness-spec.md`
- Create: `commands/harness-impl.md`
- Create: `commands/harness-debug.md`
- Modify: `README.md`

- [ ] **Step 1: 각 스킬의 책임 경계 명확화**
  - `harness-spec`: 활성 task의 `spec.md`를 작성/보강. 요구사항·수용 기준·범위 외 항목 명시.
  - `harness-impl`: 활성 task의 `plan.md` 체크 항목을 순서대로 실행. 단계별 변경 요약.
  - `harness-debug`: 버그 리포트를 받아 근본 원인 추적 → fix → 재현 테스트. CLAUDE.md.hbs "자율 버그 수정" 원칙 강제.

- [ ] **Step 2: 각 스킬 마크다운 작성**
  - frontmatter `description`이 의도 언어로 작성될 것 ("기능 명세 작성", "계획 실행", "버그 추적·수정")
  - 본문은 짧게 — checklist 형식. charness `setup` SKILL.md의 "Bootstrap → Workflow → References" 구조 차용하되 우리 컨텍스트(현재 task 단위)로 단순화.

- [ ] **Step 3: README의 명령어 레퍼런스 표 갱신** — 메커닉 스킬과 의도 스킬을 두 그룹으로 표시

- [ ] **Step 4: 의도 스킬이 메커닉 스킬을 호출하는 흐름 검증**
  - 예: `/harness-spec` → 활성 task 확인 → 없으면 `harness-task new ...` 안내 → spec.md 작성

---

## Task 4: `/harness-doctor` 외부 도구 healthcheck 강화

**Why last:** 가장 작은 변경. 현재 doctor는 symlink/hooks/settings/CLAUDE.md 마커만 검사. 외부 도구 가용성을 추가하면 5-agent 통합 환경의 신뢰성 진단이 완성된다.

**Files:**
- Modify: 현재 doctor 구현 파일 (탐색 필요 — `commands/harness-doctor.md` 또는 `src/commands/doctor.mjs`)
- Modify 또는 Create: `tests/doctor.test.mjs`

- [ ] **Step 1: 현재 doctor 구현 위치·구조 파악**
  - `grep -r "doctor" src/ commands/`로 진입점 확인
  - 출력 포맷 (✅/⚠️/❌) 재사용

- [ ] **Step 2: healthcheck 항목 정의**
  - `gh --version` — GitHub CLI
  - `codex --version` — Codex CLI (선택)
  - `gemini --version` — Gemini CLI (선택)
  - `bin/harness-team.mjs --help` — 자체 CLI 실행성
  - 각 항목: missing은 ⚠️ (경고), 자체 CLI 실패는 ❌

- [ ] **Step 3: 테스트 — 가짜 PATH에서 누락 시 ⚠️ 출력 검증**

- [ ] **Step 4: 출력 예시를 README의 doctor 섹션에 추가**

---

## Cross-Cutting

- [ ] **버전 범프 0.6.4 → 0.7.0** — Task 1~4 머지 후 일괄 (Task 2의 `/harness-release`로 dogfood)
- [ ] **CHANGELOG / 변경 이력** — README "변경 이력" 섹션에 0.7.0 항목 추가
- [ ] **플러그인 캐시 동기화** — `/harness-release`가 자동 수행
- [ ] **`installed_plugins.json` 갱신** — `/harness-release`가 자동 수행
- [ ] **commit + push** — 한글 컨벤션 (`feat(skills): retro/release/spec/impl/debug 스킬 추가 + doctor 강화`)

---

## Risks & Mitigations

| 리스크 | 완화책 |
|---|---|
| `/harness-release`가 사용자의 `~/.claude/plugins/` 상태를 망가뜨릴 수 있음 | `--dry-run` 기본 권장, 실제 수정 전 git 상태 clean 검증, 백업 디렉토리 보존 |
| 의도 스킬이 메커닉 스킬과 중복되어 사용자 혼란 | README에 2-tier 그룹핑 명시, frontmatter `description`을 의도 vs 메커닉으로 명확히 구분 |
| doctor healthcheck가 환경 차이로 false alarm | missing은 ⚠️로 다운그레이드 (❌ 아님), 필수 도구만 ❌ |
| Task 3 의도 스킬이 추상화 과잉으로 어색해질 위험 | charness의 `spec` SKILL.md 길이 (~80줄) 상한 준수, 우리 컨텍스트에 없는 개념(adapter/profile)은 차용하지 않음 |

---

## Success Criteria

- [ ] `/harness-retro` 한 번 실행으로 활성 task의 `artifact.md`에 학습 섹션이 정확히 append 됨
- [ ] `/harness-release patch` 단일 명령으로 3-file bump + cache sync + installed_plugins.json 갱신이 모두 완료됨 (수동 단계 0)
- [ ] `/harness-spec`, `/harness-impl`, `/harness-debug`가 각각 활성 task의 해당 파일을 의도 기반으로 작성/실행함
- [ ] `/harness-doctor`가 외부 도구 가용성을 ✅/⚠️로 보고함
- [ ] 모든 신규 테스트 통과 (`node --test tests/`)
- [ ] 0.7.0 릴리스가 새로 추가한 `/harness-release`로 수행됨 (dogfood 성공)

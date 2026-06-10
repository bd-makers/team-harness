---
tags:
  - project
  - ai
  - obsidian
created: 2026-05-29
modified: 2026-05-29
---

# harness-aijient-team v0.7.0 통합 실행 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (권장) 또는 `superpowers:executing-plans`. 모든 단계는 `- [ ]` 체크박스로 추적한다.

**Goal:** 세 개 선행 플랜(ouroboros-inspired / charness-benchmark / release-sync-automation)에서 ROI가 양수인 항목만 추려 v0.7.0 한 릴리스로 통합한다. 핵심 가치는:
1. **스펙 우선 게이트** — 모호한 입력으로 코드 작성을 시작하지 못하도록 차단 (Ouroboros 4차원 Ambiguity + Ontology).
2. **자기개선 + 페르소나** — `/harness-retro`, `/harness-interview`, `/harness-contrarian`, `/harness-simplifier` 4개 슬래시 커맨드.
3. **릴리스 자동화** — `/harness-release` 단일 명령으로 3-매니페스트 동시 bump + 캐시/마켓플레이스/installed_plugins.json 동기화. 0.6.x 시리즈에서 실제로 발생한 휴먼 에러(obs 951: marketplace.json 누락) 차단.
4. **운영 위생** — `CHANGELOG.md`, `AGENTS.md`, 강화된 `/harness-doctor` healthcheck.

**Architecture:**
- 신규 코드는 모두 **Node ESM (.mjs)** — 기존 `src/commands/*.mjs` 일관성 유지. bash 스크립트 도입 안 함.
- 슬래시 커맨드는 **2-tier 구분**:
  - *메커닉* (기존): symlink/clone/migrate/upgrade/delete/sync/apply/init/task
  - *워크플로우* (신규): retro/release/interview/contrarian/simplifier
- 외부 런타임 의존성 추가 없음 (Python·specdown·cosmic-ray 모두 도입 안 함).
- **정체성/용어:** 이 플러그인은 런타임 에이전트 하네스의 **핵심 엔진(agent loop·tool 실행·context compaction)은 호스트(Claude Code·Codex)에 위임**한다. 대신 호스트의 확장점(hooks·permissions·rules·git hook)에 얹혀 **가드레일·실행 게이트·컨텍스트 주입·세션 간 메모리** 같은 *런타임 거버넌스(control plane)* 기능 + **멀티 에이전트 SSOT 규약**을 제공하는 레이어다. (이미 보유: settings.json allow/deny, protect-files/pre-commit-check hook, rules paths 주입, task/handoff 메모리.) → "런타임 하네스 위의 control plane + harness-engineering 레이어." README·문서 상단에 이 정의를 명시한다(Task 8).

**Tech Stack:** Node.js 18+ ESM, `node:test` + `node:assert/strict`, `node:fs/promises`, Handlebars 템플릿, Markdown 슬래시 커맨드.

**Out of Scope (벤치마킹은 했으나 도입 제외):**
- `ouroboros-ai` Python 런타임, PAL Router, TUI 대시보드, `ooo ralph`/`ooo brownfield` 자동 루프
- charness의 profile/preset JSON, 3-tier 풀구조, `charness-artifacts/` 별도 디렉토리
- bash 기반 release-sync (Node로 일원화), `/harness-impl`·`/harness-debug` (기존 superpowers 스킬과 중복)
- ambiguity 점수의 LLM 자동 채점 (사람 체크박스로 충분)

**도입 후 측정 (별도 doc, 3개월 후 회고):** ① spec→merge 재작업률, ② "요구사항 모호" 리뷰 코멘트 수, ③ 릴리스 휴먼 에러 발생 수.

---

## 착수 전 보강 (Review Addendum, 2026-05-29)

> 본 플랜 작성 후 **멀티 에이전트 정합성 + harness-engineering 업계 표준** 리뷰에서 확정한 결정과 보강. 착수 전 아래를 각 Task에 반영한다. 근거: Anthropic [effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents), OpenAI [harness engineering](https://openai.com/index/harness-engineering/), [AGENTS.md 표준](https://agents.md/).

**확정된 결정**
- **멀티 에이전트 drive:** 모든 에이전트(Claude·Codex·OpenCode·향후 hermess)가 워크플로우를 직접 운전한다. → **로직은 CLI**(Bash 호출), **규율/기법은 계약 산문**(symlink로 전 에이전트가 읽음), 슬래시 커맨드는 Claude 전용 래퍼.
- **superpowers는 best-effort 참고만** (의존성 아님 — Claude 전용이라 멀티 에이전트 정체성과 모순). 계약 하단에 "있으면 brainstorming/executing-plans/systematic-debugging에 매핑" 한 단락만.
- **정체성/용어:** 런타임 하네스의 핵심 엔진은 호스트에 위임하되, 가드레일·게이트·컨텍스트 주입·세션 메모리 등 **런타임 거버넌스(control plane) 기능은 직접 보유** + 멀티 에이전트 SSOT 규약 (위 Architecture 참조 — "기능이 아예 없다"는 부정확). Task 8에서 README·문서 상단에 명시.

**보강 항목 (9)** — 각 항목 앞 `[Task N]`은 반영 위치

1. **[Task 7]** doctor 심볼을 기존 `✓`/`✗`/`-` 와 정합시킬 것(플랜이 가정한 ✅/⚠️/❌ 아님). `node:child_process` import 추가, healthcheck 목록에 **`opencode --version`** 포함(OpenCode가 1급 운전 에이전트).
2. **[Task 8]** `AGENTS.md` → **`MAINTAINING.md`로 개명.** 스캐폴드 프로젝트의 `AGENTS.md`는 CLAUDE.md symlink(=Codex/OpenCode 지침, 업계 표준 파일)라 레포 루트 운영 가이드와 이름 충돌. Step 3의 README 링크/문구도 MAINTAINING.md로.
3. **[Task 6]** `release`의 **positional(bump) 인자 처리** — `bin/harness-team.mjs`에서 `release`가 `taskCmds`에 없어 `positional[0]`('patch')이 target 디렉토리로 먹힌다. release/retro를 taskCmds처럼 "target=cwd, positional을 command args로 전달"하는 부류로 처리. (이전에 지적한 parseArgs 화이트리스트는 무관 — 정정.)
4. **[Task 6]** `marketplaces/<mkt>/commands/` 동기화 시 **stale 파일 제거**(삭제·개명된 커맨드). `fs.cp`는 `--delete`를 안 하므로, delete 시맨틱을 **`commands/` 안에만** 적용(marketplace 루트는 사용자 파일 보존). 캐시 `<new>/`는 신규 생성이라 무관.
5. **[Task 5]** `retro`를 **CLI 서브커맨드(`harness-team retro`)로** 승격 + 슬래시는 래퍼. CLI가 `artifact.md`에 `## Learnings` append(메커닉), 내용은 에이전트가 작성. → Codex/OpenCode도 Bash로 직접 호출 가능.
6. **[Task 1]** task 생성 시 **`artifact.md`를 4번째 파일로 scaffold.** 현재 task.mjs는 spec/plan/handoff만 생성 → retro의 append 대상이 없어 깨짐. 이 파일이 있어야 charness-artifacts 제외 근거("artifact.md로 충분")도 성립.
7. **[Task 3·4]** spec/impl/debug의 *실질*을 계약에 흡수(④). **단 ② 수정 지침:** `CLAUDE.md`에는 **터스한 게이트 룰·원칙만** 남기고, 상세 절차·페르소나 기법은 **on-demand 참조 파일**(기존 `.claude/rules` 패턴 또는 `references/`)로 분리해 필요 시 로드. 항상 로드되는 계약을 비대화하면 "context overloading" 안티패턴(Anthropic 컨텍스트 관리·harness-construction context budgeting 위반). 페르소나 슬래시 본문도 참조 파일을 가리키게.
8. **[Task 8 / cross]** role 표 모순(Codex `--sandbox read-only` vs "모든 에이전트 drive") — 0.7.0에선 **메모만**. 완전 해소(sandbox 상향 vs drive 주체 한정)는 [0.8.0 P3](./2026-05-29-0.8.0-improvements.md).
9. 🆕 **[Task 5·6·7]** **CLI observation/error 계약** — 에이전트가 CLI를 운전하면 stdout이 곧 observation이다. 운전 대상 신규 커맨드(`retro`/`release`)와 `doctor`에 **일관된 status 라인 + 다음 행동(next_actions) + 복구 힌트**를, 에러에는 **root cause + safe retry + stop condition**을 담는다. 신규 커맨드라 처음부터 적용이 저렴. (전 커맨드 `--json` 구조화 엔벨로프 전면화는 [0.8.0 P2](./2026-05-29-0.8.0-improvements.md).)

> **0.7.0 반영:** 1~7·9. **항목 7은 ② 지침대로 계약을 터스하게 유지.** 항목 8과 전면 CLI 구조화·SSOT master 역전은 0.8.0으로 분리([0.8.0 개선 문서](./2026-05-29-0.8.0-improvements.md)).

---

## File Structure

| 역할 | 변경 | 파일 |
|---|---|---|
| Ambiguity·Ontology 템플릿 | Modify | `src/commands/task.mjs` |
| 템플릿 회귀 테스트 | Create | `tests/task-templates.test.mjs` |
| CLAUDE.md.hbs Ambiguity 게이트·페르소나 가이드 | Modify | `templates/CLAUDE.md.hbs` |
| Socratic 인터뷰 스킬 | Create | `commands/harness-interview.md` |
| Contrarian 스킬 | Create | `commands/harness-contrarian.md` |
| Simplifier 스킬 | Create | `commands/harness-simplifier.md` |
| 자기개선 루프 스킬 | Create | `commands/harness-retro.md` |
| 릴리스 자동화 스킬 | Create | `commands/harness-release.md` |
| 릴리스 오케스트레이터 | Create | `src/commands/release.mjs` |
| release 단위 테스트 | Create | `tests/release.test.mjs` |
| 외부 도구 healthcheck 강화 | Modify | `src/commands/doctor.mjs` |
| doctor healthcheck 테스트 | Create | `tests/doctor.test.mjs` |
| `release` 서브커맨드 등록 + HELP | Modify | `bin/harness-team.mjs` |
| 신규 커맨드 7개 등록 | Modify | `.claude-plugin/plugin.json` |
| 변경 이력 (0.4.0부터 복원) | Create | `CHANGELOG.md` |
| 레포 운영 가이드 | Create | `AGENTS.md` |
| 명령어 표 + 릴리스 절차 갱신 | Modify | `README.md` |
| 버전 0.6.4 → 0.7.0 | Modify | `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` |

각 Task는 독립 커밋. Task 9(릴리스)만 1~8 머지 후 일괄 수행 + 스스로를 dogfood한다.

---

### Task 1: spec.md 템플릿에 4차원 Ambiguity 자가진단 + Ontology 섹션

**Files:** Modify `src/commands/task.mjs` · Create `tests/task-templates.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

```javascript
// tests/task-templates.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taskSpecTemplate, taskPlanTemplate } from '../src/commands/task.mjs';

test('spec 템플릿은 4차원 Ambiguity 자가진단 섹션을 포함한다', () => {
  const out = taskSpecTemplate('demo');
  assert.match(out, /## Ambiguity 자가진단/);
  assert.match(out, /Goal 명확도/);
  assert.match(out, /Constraint 명확도/);
  assert.match(out, /Success 기준/);
  assert.match(out, /Context 명확도/);
  assert.match(out, /- \[ \] Ambiguity ≤ 0\.2/);
});

test('spec 템플릿은 Ontology 섹션을 포함한다', () => {
  const out = taskSpecTemplate('demo');
  assert.match(out, /## Ontology/);
});
```

- [ ] **Step 2: 테스트 FAIL 확인** — `node --test tests/task-templates.test.mjs`

- [ ] **Step 3: `taskSpecTemplate` export + 본문 확장**

```javascript
export function taskSpecTemplate(name) {
  return `# ${name} — Spec

## 목적 / 요구사항


## 설계 / 접근


## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **개념 A**:
- **개념 B**:

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [ ] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [ ] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [ ] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [ ] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [ ] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고
-
`;
}
```

`taskPlanTemplate`에도 `export` 키워드 추가 (본문은 Task 2에서).

- [ ] **Step 4: 테스트 PASS 확인** + **커밋**

```bash
git commit -m "feat(task): spec 템플릿에 4차원 Ambiguity 자가진단 + Ontology 섹션 추가"
```

---

### Task 2: plan.md 템플릿에 Ontology 변경 로그 섹션

**Files:** Modify `src/commands/task.mjs` · Append `tests/task-templates.test.mjs`

- [ ] **Step 1: 실패 테스트 append**

```javascript
test('plan 템플릿은 Ontology 변경 로그 섹션을 포함한다', () => {
  const out = taskPlanTemplate('demo');
  assert.match(out, /## Ontology 변경 로그/);
});
```

- [ ] **Step 2: `taskPlanTemplate` 본문 교체**

```javascript
export function taskPlanTemplate(name) {
  return `# ${name} — Plan

## 목표


## 단계
- [ ]

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
-
`;
}
```

- [ ] **Step 3: 테스트 PASS** + **커밋**

```bash
git commit -m "feat(task): plan 템플릿에 Ontology 변경 로그 섹션 추가"
```

---

### Task 3: CLAUDE.md.hbs — Ambiguity 게이트 룰 + 페르소나 사용 가이드

**Files:** Modify `templates/CLAUDE.md.hbs`

- [ ] **Step 1: 섹션 위치 확인** — `grep -n "플랜 모드 기본값\|우아함 추구" templates/CLAUDE.md.hbs`

- [ ] **Step 2: `### 1. 플랜 모드 기본값` 아래에 1-A 항목 삽입**

```markdown
### 1-A. Ambiguity 게이트 (spec 우선)
- 새 task 진입 시 `spec.md`의 "Ambiguity 자가진단" 4개 체크박스를 먼저 확인한다.
- 3개 이상 미체크면 코드 작성 금지 — `/harness-interview`로 복귀해 모호성을 제거한다.
- 게이트를 통과한 근거를 spec.md "Ontology" 섹션에 한 줄로 남긴다.
- **Why:** 대부분의 재작업은 코드 능력이 아니라 입력 모호성에서 발생.
- **How to apply:** `harness-task new` 직후, 본격 구현 직전 1회. 작은 버그 수정에는 생략.
```

- [ ] **Step 3: `### 5. 우아함 추구` 끝에 페르소나 호출 가이드 추가**

```markdown
- **페르소나 호출**: 비자명한 변경에서 막히면 순서대로 사용한다.
  1. `/harness-interview` — 입력(스펙)이 모호한가?
  2. `/harness-contrarian` — 가정이 옳은가?
  3. `/harness-simplifier` — 더 적게 만들 수 있는가?
- 작은 버그·문서 수정에는 호출하지 않는다.
```

- [ ] **Step 4: grep 검증 + 커밋**

```bash
grep -n "Ambiguity 게이트\|harness-interview\|harness-contrarian\|harness-simplifier" templates/CLAUDE.md.hbs
git commit -m "feat(template): CLAUDE.md.hbs에 Ambiguity 게이트 + 페르소나 호출 가이드 추가"
```

---

### Task 4: 페르소나 3종 슬래시 커맨드 (`interview`/`contrarian`/`simplifier`)

**Files:** Create `commands/harness-{interview,contrarian,simplifier}.md` · Modify `.claude-plugin/plugin.json`

각 파일은 frontmatter `description` + 절차/금지/종료조건 섹션을 갖는다. (전문은 본 통합 플랜의 모태인 `2026-05-28-ouroboros-inspired-spec-first.md` Task 4~6의 본문을 그대로 사용.)

- [ ] **Step 1: `commands/harness-interview.md` 생성** — Socratic Interviewer 페르소나. 4차원(Goal/Constraint/Success/Ontology) 각 2~3개 질문, 한 번에 하나씩.
- [ ] **Step 2: `commands/harness-contrarian.md` 생성** — Contrarian 페르소나. 4각도(반대 가정/제거 가능성/숨은 비용/잘못된 추상화) 각 최소 1개 반론.
- [ ] **Step 3: `commands/harness-simplifier.md` 생성** — Simplifier 페르소나. YAGNI/단일 사용처/중복 단계/죽은 옵션 체크리스트.
- [ ] **Step 4: `.claude-plugin/plugin.json` commands 배열에 3개 모두 등록**
- [ ] **Step 5: 검증 + 커밋**

```bash
test -f commands/harness-interview.md && test -f commands/harness-contrarian.md && test -f commands/harness-simplifier.md && echo OK
git commit -m "feat(skills): /harness-interview, /harness-contrarian, /harness-simplifier 페르소나 3종 추가"
```

---

### Task 5: `/harness-retro` — 자기개선 루프 스킬

**Files:** Create `commands/harness-retro.md` · Modify `.claude-plugin/plugin.json`, `README.md`

- [ ] **Step 1: 스킬 동작 정의**
  - 입력: 활성 task (`.harness/active.json`) 또는 인자로 지정된 task 경로
  - 동작: `artifact.md` 끝에 `## Learnings (YYYY-MM-DD)` 섹션을 append. 사용자에게 "교정받은/배운 항목"을 묻고 기록.
  - 출력: 추가된 라인 diff 표시

- [ ] **Step 2: frontmatter + 본문 작성**
  - `description`: "현재 또는 지정 task의 artifact.md에 학습/교정 내용 append. CLAUDE.md.hbs 자기개선 루프 정책 실행."

- [ ] **Step 3: `.claude-plugin/plugin.json` 등록 + `README.md` 명령어 표에 추가**

- [ ] **Step 4: 수동 검증** — 임시 task 생성 → retro 실행 → artifact.md 정확히 append 확인

- [ ] **Step 5: 커밋**

```bash
git commit -m "feat(skills): /harness-retro 자기개선 루프 스킬 추가"
```

---

### Task 6: `/harness-release` + `src/commands/release.mjs` — 릴리스 자동화

**Why:** 매 릴리스마다 반복되는 휴먼 에러 지점(3-file 동기화 누락, marketplace.json만 빠뜨림 — Apr 27 obs 951 실제 발생) 제거.

**Files:**
- Create: `src/commands/release.mjs`, `commands/harness-release.md`, `tests/release.test.mjs`
- Modify: `bin/harness-team.mjs`, `README.md`

- [ ] **Step 1: 실패 테스트** (`tests/release.test.mjs`)
  - 임시 디렉토리에 가짜 매니페스트 3종 + 가짜 `CLAUDE_PLUGINS_ROOT` seed
  - `release({ bump: 'patch', dryRun: true, root, pluginsRoot })` → 3-file 동일 새 버전 반환, 실제 파일·`installed_plugins.json` 무변경 (byte-for-byte)
  - 매니페스트 셋 중 하나 변조 시 throw + 어떤 파일이 어떤 값인지 메시지 포함
  - 실제 실행 시 `version2[key]` 의 version/installPath/lastUpdated/gitCommitSha가 갱신

- [ ] **Step 2: `src/commands/release.mjs` 구현**
  - 시그니처: `export async function release({ bump, root, pluginsRoot, dryRun, skipCache })`
  - `bump`: `'major'|'minor'|'patch'|<explicit "x.y.z">`
  - `root`: 기본 `process.cwd()`; `pluginsRoot`: 기본 `process.env.CLAUDE_PLUGINS_ROOT ?? path.join(os.homedir(), '.claude/plugins')`
  - 단계: (1) 3-file 현재 버전 읽고 일치 검증 (mismatch면 throw with diff message — Plan 3 check-versions.sh의 가치 흡수), (2) 새 버전 계산, (3) 3-file 동시 수정, (4) `<pluginsRoot>/cache/<marketplace>/<plugin>/<new>/` 생성 후 fs copy (exclude: `.git`, `node_modules`, `tests`, `docs/superpowers`, `scripts`), (5) `<pluginsRoot>/marketplaces/<marketplace>/`에 `marketplace.json` + `commands/` 동기화, (6) `installed_plugins.json` `version2[key]` 의 `version`/`installPath`/`lastUpdated`(UTC ISO)/`gitCommitSha`(`git rev-parse HEAD`) 갱신, (7) 요약 출력
  - `dryRun`: (3)~(6) 스킵, 계획만 stdout으로
  - `skipCache`: (4)~(6) 스킵 (테스트·디버그용)
  - **마켓플레이스 schema 가드** (Plan 3 리스크 흡수): `marketplace.json`의 `.plugins`가 정확히 1개이고 우리 plugin인지 검증, 아니면 throw

- [ ] **Step 3: `bin/harness-team.mjs`에 `release` 서브커맨드 등록**
  - `harness-team release [patch|minor|major|x.y.z] [--dry-run] [--skip-cache]`
  - HELP 텍스트 갱신

- [ ] **Step 4: `commands/harness-release.md` 슬래시 커맨드** — Claude가 호출해 `harness-team release ...` 실행. dry-run을 기본으로 권장하는 안내 포함.

- [ ] **Step 5: 테스트 PASS 확인 + 커밋**

```bash
node --test tests/release.test.mjs
git commit -m "feat(release): /harness-release + src/commands/release.mjs — 3-file bump + 캐시 동기화 자동화"
```

---

### Task 7: `/harness-doctor` 외부 도구 healthcheck 강화

**Files:** Modify `src/commands/doctor.mjs` · Create/Modify `tests/doctor.test.mjs`

- [ ] **Step 1: 현재 doctor 구현 확인** — `src/commands/doctor.mjs` 출력 포맷(✅/⚠️/❌) 재사용 위치 파악

- [ ] **Step 2: healthcheck 항목 추가**
  - `gh --version` — GitHub CLI (missing → ⚠️)
  - `codex --version` — Codex CLI (missing → ⚠️, 선택)
  - `gemini --version` — Gemini CLI (missing → ⚠️, 선택)
  - `node bin/harness-team.mjs --help` — 자체 CLI 실행성 (실패 → ❌)
  - `jq --version` — installed_plugins.json 진단 시 사용 가능성 (missing → ⚠️)

- [ ] **Step 3: 테스트** — `PATH=''` 또는 빈 디렉토리로 spawn 환경 조정 시 누락은 ⚠️ 라인으로 출력, 자체 CLI는 정상 ✅

- [ ] **Step 4: 출력 예시를 `README.md` doctor 섹션에 추가** + **커밋**

```bash
git commit -m "feat(doctor): 외부 도구(gh/codex/gemini/jq) healthcheck + 자체 CLI 실행성 검사 추가"
```

---

### Task 8: `CHANGELOG.md` + `AGENTS.md` 도입

**Files:** Create `CHANGELOG.md`, `AGENTS.md` · Modify `README.md`

- [ ] **Step 1: `CHANGELOG.md` 복원** — Keep a Changelog 포맷. 0.4.0~0.6.4까지 git log로 entry 작성. 상단에 `## [Unreleased]` 섹션 유지 규칙 주석.

```bash
git log --oneline --no-merges  # 버전 범프 커밋 기준 구간 분할
git log -1 --format=%ai <sha>  # 각 버전의 실제 날짜
```

- [ ] **Step 2: `AGENTS.md` 작성**
  - 역할: 이 레포가 source of truth, `~/.claude/plugins/cache/...`는 배포 복사본
  - 시작 순서: README.md → plugin.json → `node --test tests/`
  - 작업 규칙: 새 command 추가 시 `commands/`, `bin/harness-team.mjs`, `.claude-plugin/plugin.json`, `README.md` 동시 갱신
  - 필수 검증: `node --test tests/`, `harness-team release --dry-run`
  - 릴리스 절차 (단일 source of truth):
    1. 변경 작성 + 테스트
    2. `CHANGELOG.md` Unreleased 항목 채움
    3. `harness-team release minor --dry-run`로 검토 → `harness-team release minor`
    4. `git commit -m "chore(release): 버전 X.Y.Z으로 범프"`
    5. `git tag vX.Y.Z && git push --follow-tags`
  - 주의: Claude Code 실행 중 release 실행 시 race 가능 → 종료 후 권장

- [ ] **Step 3: `README.md` 상단에 "이 레포를 수정하는 에이전트는 [AGENTS.md](./AGENTS.md)를 먼저 본다" 추가**

- [ ] **Step 4: 커밋**

```bash
git commit -m "docs: CHANGELOG.md(0.4.0~0.6.4 복원) + AGENTS.md(릴리스 절차 명문화) 도입"
```

---

### Task 9: 버전 범프 0.6.4 → 0.7.0 + dogfood 릴리스

**Files:** Modify `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `CHANGELOG.md`

- [ ] **Step 1: 전체 테스트 통과 확인** — `node --test tests/`

- [ ] **Step 2: `CHANGELOG.md`에 0.7.0 항목 추가**

```markdown
## [0.7.0] - 2026-05-28
### Added
- Ambiguity 4차원 자가진단 + Ontology 섹션 (spec/plan 템플릿)
- 페르소나 3종: `/harness-interview`, `/harness-contrarian`, `/harness-simplifier`
- `/harness-retro` 자기개선 루프 스킬
- `/harness-release` + `src/commands/release.mjs` — 릴리스 자동화
- `CHANGELOG.md`, `AGENTS.md` 신규
### Changed
- `templates/CLAUDE.md.hbs`: Ambiguity 게이트 룰 + 페르소나 호출 가이드 추가
- `src/commands/doctor.mjs`: 외부 도구 healthcheck 강화
```

- [ ] **Step 3: `/harness-release minor --dry-run`으로 dogfood 검토**

- [ ] **Step 4: `/harness-release minor` 실행** — 3-file bump + 캐시/마켓플레이스/installed_plugins.json 동시 갱신

- [ ] **Step 5: 매니페스트 일치 검증**

```bash
grep -h '"version"' package.json .claude-plugin/plugin.json
jq '.plugins[0].version' .claude-plugin/marketplace.json
# → 세 줄 모두 "0.7.0"
```

- [ ] **Step 6: 커밋 + 태그 + push**

```bash
git add -A
git commit -m "chore(release): 버전 0.7.0으로 범프 — spec-first 게이트 + 페르소나 + 릴리스 자동화"
git tag v0.7.0
git push --follow-tags
```

---

## Risks & Mitigations

| 리스크 | 완화책 |
|---|---|
| `release.mjs`가 사용자 `~/.claude/plugins/` 상태를 망가뜨림 | `dryRun` 기본 권장, 캐시 dir만 `fs.cp`로 덮어쓰고 marketplaces/는 `commands/` + `marketplace.json`만 부분 동기화 |
| 의도 스킬이 메커닉 스킬과 중복되어 사용자 혼란 | README에 2-tier 그룹핑 명시, frontmatter `description`을 의도 vs 메커닉으로 명확히 구분 |
| doctor healthcheck가 환경 차이로 false alarm | missing은 ⚠️ (❌ 아님), 자체 CLI 실행성만 ❌ |
| 페르소나 스킬 추상화 과잉 | 각 .md 파일 80줄 상한, 외부 개념(adapter/profile) 차용 금지 |
| marketplace.json schema 가정 (`.plugins[0]`) | release.mjs에서 length 가드 + plugin name 일치 검증 |
| `installed_plugins.json` 동시 수정 충돌 | AGENTS.md에 "Claude Code 종료 후 실행" 명시 |

---

## Success Criteria

- [ ] `node --test tests/` 전체 통과 (task-templates, release, doctor 신규 포함)
- [ ] `/harness-retro` 1회 실행으로 활성 task `artifact.md`에 학습 섹션 정확히 append
- [ ] `/harness-release minor` 단일 명령으로 3-file bump + 캐시 sync + installed_plugins.json 갱신 완료 (수동 단계 0)
- [ ] `/harness-doctor` 출력에 외부 도구 healthcheck 라인이 ✅/⚠️로 표시
- [ ] `CHANGELOG.md`에 0.4.0~0.7.0 모든 entry 존재
- [ ] `AGENTS.md`의 릴리스 절차만 따라도 새 릴리스가 가능 (메모리 의존 0)
- [ ] 0.7.0 태그가 origin에 push, 새 `/harness-release`로 자기 자신을 dogfood 성공
- [ ] 새 task 생성 시 spec.md에 Ambiguity 자가진단·Ontology 섹션이 포함되고, CLAUDE.md.hbs 게이트 룰이 활성

---

## 3개월 후 회고 지표 (별도 doc로 측정)

- spec→merge 재작업률 변화
- "요구사항 모호" 리뷰 코멘트 수
- 릴리스 휴먼 에러 건수 (현재 baseline: 0.6.x 시리즈에 marketplace.json 누락 1건 발생)
- Opus 토큰 비용 (페르소나 도입 전후)

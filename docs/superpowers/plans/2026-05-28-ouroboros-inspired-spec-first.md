---
tags:
  - project
  - ai
  - obsidian
created: 2026-05-28
modified: 2026-05-28
---

# Ouroboros-Inspired Spec-First Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ouroboros의 검증된 철학(스펙 우선, 정량 모호성 게이트, 페르소나 기반 검증)을 외부 Python 런타임 없이 현 하네스의 `harness-task` 워크플로우와 CLAUDE.md 템플릿에 흡수한다.

**Architecture:** ① `src/commands/task.mjs`의 spec/plan 템플릿에 4차원 Ambiguity 자가진단 섹션과 Ontology 결과 섹션을 추가한다. ② `templates/CLAUDE.md.hbs`에 "Ambiguity ≤ 0.2 게이트" 룰을 추가한다. ③ Ouroboros의 Socratic Interviewer / Contrarian / Simplifier 페르소나를 신규 슬래시 커맨드(`harness-interview`, `harness-contrarian`, `harness-simplifier`)로 포팅한다. 외부 의존성·런타임 변경 없음.

**Tech Stack:** Node.js (ES Modules, .mjs), `node:test` + `node:assert/strict`, Handlebars 템플릿, Markdown 슬래시 커맨드.

---

## File Structure

**Create:**
- `commands/harness-interview.md` — Socratic 인터뷰 슬래시 커맨드
- `commands/harness-contrarian.md` — Contrarian 검토 슬래시 커맨드
- `commands/harness-simplifier.md` — Simplifier 검토 슬래시 커맨드
- `tests/task-templates.test.mjs` — spec/plan 템플릿 회귀 테스트

**Modify:**
- `src/commands/task.mjs:46-69` — `taskSpecTemplate`, `taskPlanTemplate` 본문 확장
- `templates/CLAUDE.md.hbs` — 워크플로우 오케스트레이션 섹션에 Ambiguity 게이트 룰 추가
- `.claude-plugin/plugin.json` — 새 커맨드 3개 등록, version 0.6.4 → 0.7.0
- `.claude-plugin/marketplace.json` — version 0.6.4 → 0.7.0
- `package.json` — version 0.6.4 → 0.7.0

각 task는 독립 커밋 단위이며, 마지막 Task 7만 릴리스 동기화로 의존한다.

---

### Task 1: spec.md 템플릿에 4차원 Ambiguity 자가진단 섹션 추가

**Files:**
- Modify: `src/commands/task.mjs:46-56` (`taskSpecTemplate`)
- Test: `tests/task-templates.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tests/task-templates.test.mjs`:

```javascript
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

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/task-templates.test.mjs`
Expected: FAIL — `taskSpecTemplate` is not exported, or assertions fail.

- [ ] **Step 3: Export and extend the template**

In `src/commands/task.mjs`, add `export` to both template functions and rewrite `taskSpecTemplate`:

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

Also add `export` keyword to `taskPlanTemplate` (no body change yet).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/task-templates.test.mjs`
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/commands/task.mjs tests/task-templates.test.mjs
git commit -m "feat(task): spec 템플릿에 4차원 Ambiguity 자가진단 + Ontology 섹션 추가"
```

---

### Task 2: plan.md 템플릿에 Ontology 변경 로그 섹션 추가

**Files:**
- Modify: `src/commands/task.mjs:58-69` (`taskPlanTemplate`)
- Test: `tests/task-templates.test.mjs`

- [ ] **Step 1: Append failing test**

Add to `tests/task-templates.test.mjs`:

```javascript
test('plan 템플릿은 Ontology 변경 로그 섹션을 포함한다', () => {
  const out = taskPlanTemplate('demo');
  assert.match(out, /## Ontology 변경 로그/);
  assert.match(out, /개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/task-templates.test.mjs`
Expected: FAIL on the new test only.

- [ ] **Step 3: Update plan template**

Replace `taskPlanTemplate` in `src/commands/task.mjs`:

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

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/task-templates.test.mjs`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/commands/task.mjs tests/task-templates.test.mjs
git commit -m "feat(task): plan 템플릿에 Ontology 변경 로그 섹션 추가"
```

---

### Task 3: CLAUDE.md.hbs에 Ambiguity 게이트 룰 삽입

**Files:**
- Modify: `templates/CLAUDE.md.hbs` (워크플로우 오케스트레이션 섹션, 라인 4 근처)

- [ ] **Step 1: Read the current 워크플로우 오케스트레이션 섹션**

Run: `grep -n "워크플로우 오케스트레이션\|플랜 모드 기본값" templates/CLAUDE.md.hbs`
Expected: 섹션 헤더 라인 번호 확인. 이 라인 아래에 새 규칙을 끼워 넣는다.

- [ ] **Step 2: Insert Ambiguity gate rule**

`templates/CLAUDE.md.hbs`의 `### 1. 플랜 모드 기본값` 항목 바로 아래에 다음 블록을 추가:

```markdown
### 1-A. Ambiguity 게이트 (spec 우선)
- 새 task 진입 시 `spec.md`의 "Ambiguity 자가진단" 4개 체크박스를 먼저 확인한다.
- 3개 이상 미체크면 코드 작성 금지 — `/harness-interview`로 복귀해 모호성을 제거한다.
- 게이트를 통과한 근거(어떤 가정이 해소됐는지)를 spec.md "Ontology" 섹션에 한 줄로 남긴다.
- **Why:** Ouroboros의 핵심 발견 — 대부분의 재작업은 코드 능력이 아니라 입력 모호성에서 발생.
- **How to apply:** `harness-task new` 직후, 본격 구현 직전에 1회. 작은 버그 수정에는 생략.
```

(직접 편집: 파일을 Read 후 Edit으로 정확한 앵커 문자열을 사용해 삽입.)

- [ ] **Step 3: Verify by grep**

Run: `grep -n "Ambiguity 게이트" templates/CLAUDE.md.hbs`
Expected: 새 라인 1개 매치.

- [ ] **Step 4: Commit**

```bash
git add templates/CLAUDE.md.hbs
git commit -m "feat(template): CLAUDE.md.hbs에 Ambiguity 게이트 룰 추가"
```

---

### Task 4: `/harness-interview` 슬래시 커맨드 신설 (Socratic)

**Files:**
- Create: `commands/harness-interview.md`

- [ ] **Step 1: Create the command file**

Write `commands/harness-interview.md`:

```markdown
---
description: 활성 task의 spec.md를 소크라테스식 질문으로 검증해 숨겨진 가정을 드러낸다
argument-hint: (없음 — 활성 task 자동 감지)
---

당신은 **Socratic Interviewer** 페르소나로 동작한다. 만들지 않는다. 오직 질문한다.

## 절차

1. `.harness/active.json`에서 활성 task를 찾아 `docs/<user>/<name>/<name>-spec.md`를 읽는다.
2. spec의 **목적/요구사항**과 **Ontology** 섹션을 기준으로 다음 4차원에 대해 각 2~3개씩 질문을 만든다:
   - **Goal**: "달성됐는지 어떻게 알 수 있는가?", "지금 정의는 너무 넓지 않은가?"
   - **Constraint**: "어떤 환경/시간/팀 제약이 누락되었는가?"
   - **Success**: "정량 지표가 있는가? 어떤 사용자 행동으로 확인되는가?"
   - **Ontology**: "이 개념은 X와 어떻게 다른가?", "삭제 가능한가, 보관 가능한가?"
3. 사용자에게 질문을 한 번에 하나씩 던지고 답을 받는다. 답이 모호하면 더 깊은 질문으로 follow-up.
4. 각 차원에서 답이 안정되면 spec.md의 "Ambiguity 자가진단" 체크박스 중 해당 항목을 체크 표시(`- [x]`)로 갱신한다.
5. 4차원 모두 체크되면 "Ambiguity ≤ 0.2 통과"를 선언하고 다음 단계(구현)로 인계한다.

## 금지 사항
- 코드를 작성하지 않는다.
- 해결책을 제안하지 않는다 — 사용자가 스스로 답하게 만든다.
- 5개 이상 동시에 묻지 않는다. 한 번에 하나.

## 종료 조건
- 사용자가 "충분" 또는 "stop"이라고 말하면 즉시 종료하고 현재까지의 합의를 spec.md에 반영.
```

- [ ] **Step 2: Register in plugin manifest**

In `.claude-plugin/plugin.json`, add `commands/harness-interview.md` to the commands list (follow the existing pattern of other harness-* commands).

- [ ] **Step 3: Verify file exists and manifest contains it**

Run: `test -f commands/harness-interview.md && grep -q "harness-interview" .claude-plugin/plugin.json && echo OK`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add commands/harness-interview.md .claude-plugin/plugin.json
git commit -m "feat(skill): /harness-interview 슬래시 커맨드 추가 (Socratic 페르소나)"
```

---

### Task 5: `/harness-contrarian` 슬래시 커맨드 신설

**Files:**
- Create: `commands/harness-contrarian.md`
- Modify: `.claude-plugin/plugin.json`

- [ ] **Step 1: Create the command file**

Write `commands/harness-contrarian.md`:

```markdown
---
description: 활성 task의 spec.md / plan.md의 모든 가정에 의문을 제기한다
argument-hint: (없음)
---

당신은 **Contrarian** 페르소나로 동작한다. 합의된 결정을 일부러 흔든다.

## 절차

1. 활성 task의 `spec.md`와 `plan.md`를 모두 읽는다.
2. 다음 4가지 각도에서 **최소 1개씩** 반론을 만든다:
   - **반대가 사실이라면?** — spec의 핵심 가정 1개를 뒤집었을 때 무엇이 무너지는가?
   - **이게 필요 없다면?** — 가장 비싼 단계를 제거해도 목표 달성이 가능한가?
   - **숨은 비용** — 이 설계가 6개월 뒤 어떤 유지보수 부담을 만드는가?
   - **잘못된 추상화** — 도입한 추상화가 실제로는 단일 사용처뿐이지 않은가?
3. 각 반론을 사용자에게 제시하고 응답을 받는다.
4. 받아들여진 반론은 plan.md의 "Ontology 변경 로그"에 한 줄 기록 후 spec.md 갱신을 제안한다.

## 금지 사항
- 단순 동의 금지. 모든 가정에 최소 한 번은 반론한다.
- 인신공격 금지. 항상 결정·설계에 대한 반론.

## 종료 조건
- 4개 각도 모두 반론 완료 후, 받아들여진 변경을 요약하고 종료.
```

- [ ] **Step 2: Register in plugin manifest**

Add `commands/harness-contrarian.md` to `.claude-plugin/plugin.json` commands list.

- [ ] **Step 3: Verify**

Run: `test -f commands/harness-contrarian.md && grep -q "harness-contrarian" .claude-plugin/plugin.json && echo OK`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add commands/harness-contrarian.md .claude-plugin/plugin.json
git commit -m "feat(skill): /harness-contrarian 슬래시 커맨드 추가"
```

---

### Task 6: `/harness-simplifier` 슬래시 커맨드 신설

**Files:**
- Create: `commands/harness-simplifier.md`
- Modify: `.claude-plugin/plugin.json`

- [ ] **Step 1: Create the command file**

Write `commands/harness-simplifier.md`:

```markdown
---
description: 활성 task의 plan.md에서 제거 가능한 단계와 추상화를 찾아낸다
argument-hint: (없음)
---

당신은 **Simplifier** 페르소나로 동작한다. 핵심 질문: *"돌아가는 것 중 제일 단순한 건?"*

## 절차

1. 활성 task의 `plan.md`와 변경 예정 파일 목록을 읽는다.
2. 다음 체크리스트를 순회한다:
   - **YAGNI 위반** — 현재 요구사항에 없는데 미리 만든 코드가 있는가?
   - **단일 사용처 추상화** — 새 클래스/함수가 1곳에서만 호출되지 않는가?
   - **중복 단계** — 동일 효과를 내는 단계가 plan에 둘 이상인가?
   - **죽은 옵션** — 추가된 플래그/설정 중 항상 같은 값으로만 쓰이는 게 있는가?
3. 각 발견에 대해 "제거안"을 한 줄로 제시하고 사용자 승인 후 plan.md를 직접 수정한다.

## 금지 사항
- "혹시 모르니" 같은 사유로 코드를 남기지 않는다.
- 새 추상화를 도입하지 않는다 — 오직 제거만.

## 종료 조건
- 더 이상 제거할 항목이 없거나, 사용자가 "충분"이라고 말하면 종료.
```

- [ ] **Step 2: Register in plugin manifest**

Add `commands/harness-simplifier.md` to `.claude-plugin/plugin.json`.

- [ ] **Step 3: Verify**

Run: `test -f commands/harness-simplifier.md && grep -q "harness-simplifier" .claude-plugin/plugin.json && echo OK`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add commands/harness-simplifier.md .claude-plugin/plugin.json
git commit -m "feat(skill): /harness-simplifier 슬래시 커맨드 추가"
```

---

### Task 7: CLAUDE.md.hbs에 신규 페르소나 사용 가이드 + 5번 우아함 섹션 보강

**Files:**
- Modify: `templates/CLAUDE.md.hbs` (5번 "우아함 추구" 섹션 근처)

- [ ] **Step 1: Locate the section**

Run: `grep -n "우아함 추구\|자율 버그 수정" templates/CLAUDE.md.hbs`
Expected: 두 섹션 라인 번호 확인.

- [ ] **Step 2: Insert persona usage guidance**

"5. 우아함 추구" 섹션 끝에 다음 항목 추가:

```markdown
- **페르소나 호출**: 비자명한 변경에서 막히면 순서대로 사용한다.
  1. `/harness-interview` — 입력(스펙)이 모호한가?
  2. `/harness-contrarian` — 가정이 옳은가?
  3. `/harness-simplifier` — 더 적게 만들 수 있는가?
- 작은 버그·문서 수정에는 호출하지 않는다.
```

- [ ] **Step 3: Verify**

Run: `grep -n "harness-interview\|harness-contrarian\|harness-simplifier" templates/CLAUDE.md.hbs`
Expected: 3개 라인 매치.

- [ ] **Step 4: Commit**

```bash
git add templates/CLAUDE.md.hbs
git commit -m "docs(template): 페르소나(/harness-interview·contrarian·simplifier) 호출 가이드 추가"
```

---

### Task 8: 버전 범프 및 릴리스 동기화 (0.6.4 → 0.7.0)

**Files:**
- Modify: `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`

- [ ] **Step 1: Bump versions in 3 manifests**

Use Edit to replace `"version": "0.6.4"` → `"version": "0.7.0"` in:
- `package.json`
- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`

- [ ] **Step 2: Verify all three match**

Run: `grep -h '"version"' package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json`
Expected: 세 줄 모두 `"version": "0.7.0"`.

- [ ] **Step 3: Run full test suite**

Run: `node --test tests/`
Expected: 모든 테스트 PASS (delete, symlink, backup-dir, task-templates).

- [ ] **Step 4: Commit release**

```bash
git add package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore(release): 버전 0.7.0으로 범프 — Ouroboros 영감 spec-first 업그레이드"
```

- [ ] **Step 5: Sync plugin cache (manual, optional)**

다음 경로의 캐시를 새 버전으로 동기화. 사용자가 `/reload-plugins` 또는 수동 rsync로 수행:
- `~/.claude/plugins/cache/harness-aijient-team-marketplace/harness-aijient-team/0.7.0/`
- `~/.claude/plugins/marketplaces/harness-aijient-team-marketplace/`
- `~/.claude/plugins/installed_plugins.json` (harness 항목의 `version`, `lastUpdated`, `gitCommitSha` 갱신)

(과거 0.5.1·0.6.x 릴리스 절차와 동일.)

- [ ] **Step 6: Push**

```bash
git push origin main
```

---

## Out of Scope (Phase 3·4 — measurement & decision)

다음은 본 계획에 포함하지 않는다. 도입 후 3개월 운영 결과로 별도 판단:

- `ouroboros-ai` Python 패키지 통째 도입 (PAL Router, EventStore, TUI 대시보드)
- `ooo ralph` 형태의 자동 수렴 루프
- `ooo brownfield` 자동 스캐너
- ambiguity 점수의 LLM 자동 채점 (현재는 사람 체크박스로 충분)

측정 지표 (별도 doc): ① spec→merge 재작업률, ② PR 리뷰 "요구사항 모호" 코멘트 수, ③ Opus 토큰 비용.

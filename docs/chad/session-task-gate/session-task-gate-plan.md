# session-task-gate — Plan

> **실행 지침:** 각 Task는 TDD bite-sized 단계. `- [ ]`는 진행 추적용. 완료 시 `- [x]`.
> 테스트 러너: `node --test tests/*.test.mjs` (= `npm test`).

**목표:** 세션 시작 시 활성 task 유무를 SessionStart 훅이 감지해, 없으면 첫 작업 프롬프트에서
Claude가 AskUserQuestion(재개/새 task/진행)을 띄우도록 context를 inject한다 (block 아님).

**아키텍처:** `buildSessionContext(targetDir)` 순수 함수 → 문자열. 활성 task 있으면 breadcrumb,
없으면 미완 task 나열 nudge. CLI `session-context` 서브커맨드가 stdout으로 출력 → SessionStart 훅이 주입.

**스택:** Node.js ESM, `node --test`. 기존 패턴(로직 src/, 얇은 진입점 bin/, 가드 테스트)을 따른다.

---

## 단계

### Task 1: `planHasOpenBoxes` 공유 헬퍼 추출 (DRY — "미완"의 단일 정의)

**Files:**
- Modify: `src/commands/task.mjs` (헬퍼 export + `collectDoneIssues` 내부 치환 + `readActive` export)

- [ ] **Step 1: `task.mjs`에 헬퍼 export 추가** (`escapeRegex` 근처, 파일 상단 유틸 구역)

```js
// "미완"의 단일 정의 — done-guard와 session-task-gate가 공유.
// 줄 시작 체크박스만 매칭(인라인/산문 `- [ ]`는 미완 아님).
export function planHasOpenBoxes(content) {
  return /^\s*- \[ \]/m.test(content);
}
```

- [ ] **Step 2: `collectDoneIssues`의 인라인 정규식을 헬퍼로 치환**

`src/commands/task.mjs` 내 다음 줄:
```js
    if (/^\s*- \[ \]/m.test(planContent)) {
```
를 아래로 교체:
```js
    if (planHasOpenBoxes(planContent)) {
```

- [ ] **Step 3: `readActive`를 export** (session-context가 재사용)

`async function readActive(targetDir) {` → `export async function readActive(targetDir) {`

- [ ] **Step 4: 기존 done-guard 테스트로 회귀 없음 확인**

Run: `node --test tests/done-guard.test.mjs`
Expected: PASS (8 tests). 특히 "인라인 `- [ ]`는 미완으로 카운트하지 않는다" 통과.

- [ ] **Step 5: Commit**

```bash
git add src/commands/task.mjs
git commit -m "refactor(task): extract planHasOpenBoxes + export readActive"
```

---

### Task 2: `buildSessionContext` 코어 (TDD)

**Files:**
- Create: `src/commands/session-context.mjs`
- Create: `tests/session-context.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성** (`tests/session-context.test.mjs`)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildSessionContext } from '../src/commands/session-context.mjs';

async function baseDir() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-sctx-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  return dir;
}
async function writeActive(dir, val) {
  await writeFile(join(dir, '.harness/active.json'), JSON.stringify(val));
}
async function writeTask(dir, user, name, plan) {
  const td = join(dir, 'docs', user, name);
  await mkdir(td, { recursive: true });
  await writeFile(join(td, `${name}-spec.md`), `# ${name} — Spec\n`);
  await writeFile(join(td, `${name}-plan.md`), plan);
}

test('활성 task 있음 → breadcrumb에 user/task 포함', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, { user: 'chad', task: 'demo', path: 'docs/chad/demo' });
    const out = await buildSessionContext(dir);
    assert.ok(out.includes('활성 task: chad/demo'), 'breadcrumb names the active task');
    assert.ok(!out.includes('<system-reminder>'), 'no nudge when active');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('활성 task 없음 + 미완 task → nudge에 재개 후보로 나열', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, null);
    await writeTask(dir, 'chad', 'wip', '# wip — Plan\n- [ ] 미완\n');
    const out = await buildSessionContext(dir);
    assert.ok(out.includes('<system-reminder>'), 'emits nudge');
    assert.ok(out.includes('재개: chad/wip'), 'lists incomplete task');
    assert.ok(out.includes('새 task 생성'), 'offers new task');
    assert.ok(out.includes('task 없이 진행'), 'offers escape hatch');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('활성 task 없음 + docs 없음 → 재개 줄 없이 새 task만', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, null);
    const out = await buildSessionContext(dir);
    assert.ok(out.includes('<system-reminder>'), 'emits nudge');
    assert.ok(!out.includes('재개:'), 'no resume line when zero tasks');
    assert.ok(out.includes('새 task 생성'), 'still offers new task');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('done task(plan 전부 [x])는 재개 후보에서 제외', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, null);
    await writeTask(dir, 'chad', 'donetask', '# done — Plan\n- [x] 완료\n');
    const out = await buildSessionContext(dir);
    assert.ok(!out.includes('재개: chad/donetask'), 'completed task not resumable');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('인라인 산문의 `- [ ]`는 미완으로 오탐하지 않음', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, null);
    await writeTask(dir, 'chad', 'prose', '# prose — Plan\n- [x] 가드는 인라인 `- [ ]` 를 오탐 금지\n');
    const out = await buildSessionContext(dir);
    assert.ok(!out.includes('재개: chad/prose'), 'prose `- [ ]` is not an open box');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `node --test tests/session-context.test.mjs`
Expected: FAIL — `Cannot find module '../src/commands/session-context.mjs'`.

- [ ] **Step 3: `src/commands/session-context.mjs` 구현**

```js
import { join } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { exists } from '../fsx.mjs';
import { readActive, planHasOpenBoxes } from './task.mjs';

// plan.md에 열린 체크박스가 남은 task = 재개 가능. (marker: <name>-spec.md, `list`와 동일 규약)
export async function listIncompleteTasks(targetDir) {
  const docs = join(targetDir, 'docs');
  if (!(await exists(docs))) return [];
  const out = [];
  for (const ue of await readdir(docs, { withFileTypes: true })) {
    if (!ue.isDirectory()) continue;
    const user = ue.name;
    const userPath = join(docs, user);
    for (const te of await readdir(userPath, { withFileTypes: true })) {
      if (!te.isDirectory()) continue;
      const name = te.name;
      if (!(await exists(join(userPath, name, `${name}-spec.md`)))) continue;
      let plan;
      try { plan = await readFile(join(userPath, name, `${name}-plan.md`), 'utf8'); }
      catch { continue; }
      if (planHasOpenBoxes(plan)) out.push({ user, name });
    }
  }
  return out;
}

export async function buildSessionContext(targetDir) {
  const active = await readActive(targetDir);
  if (active && active.task) {
    return `[harness] 활성 task: ${active.user}/${active.task} — 세션 시작 프로토콜대로 ${active.task}-plan.md 확인.`;
  }
  const incomplete = await listIncompleteTasks(targetDir);
  const lines = [
    '<system-reminder>',
    '[harness] 활성 task가 없습니다. 이 세션의 첫 프롬프트가 실질 작업(기능/수정/리팩토링)을',
    '시작하면, 코드 작성 전에 AskUserQuestion으로 확인하세요:',
  ];
  for (const t of incomplete) lines.push(`  · 재개: ${t.user}/${t.name}   (plan 미완)`);
  lines.push('  · 새 task 생성');
  lines.push('  · task 없이 진행');
  lines.push('단순 질문·조회·잡일이면 무시.');
  lines.push('</system-reminder>');
  return lines.join('\n');
}

export async function runSessionContext(ctx) {
  const text = await buildSessionContext(ctx.targetDir);
  if (text) console.log(text);
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `node --test tests/session-context.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/commands/session-context.mjs tests/session-context.test.mjs
git commit -m "feat(session-context): buildSessionContext + incomplete-task nudge"
```

---

### Task 3: CLI 디스패치 연결

**Files:**
- Modify: `bin/harness-team.mjs`

- [ ] **Step 1: import 추가** (다른 command import 옆)

```js
import { runSessionContext } from '../src/commands/session-context.mjs';
```

- [ ] **Step 2: `taskCmds` Set에 `'session-context'` 추가** (cwd를 targetDir로 쓰도록)

```js
  const taskCmds = new Set(['task', 'list', 'done', 'handoff', 'retro', 'release', 'session-context']);
```

- [ ] **Step 3: switch에 case 추가** (`case 'list':` 근처)

```js
    case 'session-context': return runSessionContext(ctx);
```

- [ ] **Step 4: HELP 텍스트에 한 줄 추가** (`handoff` 줄 아래)

```
  session-context                   Emit SessionStart context (active-task breadcrumb or no-task nudge)
```

- [ ] **Step 5: 수동 검증** — 현재 이 repo는 active task(session-task-gate)가 있으므로 breadcrumb이 나와야 함

Run: `node bin/harness-team.mjs session-context`
Expected: `[harness] 활성 task: chad/session-task-gate — 세션 시작 프로토콜대로 session-task-gate-plan.md 확인.`

- [ ] **Step 6: Commit**

```bash
git add bin/harness-team.mjs
git commit -m "feat(cli): wire session-context subcommand"
```

---

### Task 4: SessionStart 훅 등록 (templates + dogfood)

**Files:**
- Modify: `templates/.claude/settings.json`
- Create: `.claude/settings.json` (이 repo, dogfood)

- [ ] **Step 1: `templates/.claude/settings.json`의 `hooks`에 `SessionStart` 추가**

기존 `hooks` 객체 안, `PostToolUse` 다음에 추가:
```json
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "harness-team session-context 2>/dev/null || true",
            "timeout": 10
          }
        ]
      }
    ]
```

- [ ] **Step 2: 이 repo `.claude/settings.json` 생성** (dogfood — 전역 미설치라 node 직접 호출)

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node bin/harness-team.mjs session-context 2>/dev/null || true",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 3: JSON 유효성 확인**

Run: `node -e "JSON.parse(require('fs').readFileSync('templates/.claude/settings.json','utf8')); JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add templates/.claude/settings.json .claude/settings.json
git commit -m "feat(hooks): register SessionStart task-gate (template + dogfood)"
```

---

### Task 5: 문서화 (AGENTS.md SSOT)

**Files:**
- Modify: `templates/AGENTS.md.hbs`
- Modify: `AGENTS.md`

- [ ] **Step 1: 두 파일의 "작업 프로토콜 > 세션 시작 시" 구역에 task-gate 문단 추가**

(템플릿/실파일 양쪽 동일 텍스트. `세션 시작 시 (반드시 수행)` 목록 직후에 삽입.)
```markdown
> **task-gate (자동):** SessionStart 훅이 `harness-team session-context`를 호출해
> 활성 task 유무를 주입한다. 활성 task가 없으면 첫 작업 프롬프트에서 `AskUserQuestion`으로
> **재개 / 새 task / task 없이 진행**을 확인하라 — 이는 block이 아닌 nudge이며 판단은 Claude 몫.
```

- [ ] **Step 2: Commit**

```bash
git add templates/AGENTS.md.hbs AGENTS.md
git commit -m "docs(agents): document SessionStart task-gate behavior"
```

---

### Task 6: 전체 검증 + artifact 기록

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: 전체 PASS (기존 + session-context 5건), 0 실패.

- [ ] **Step 2: dogfood nudge 경로 실증** (임시 fixture로 active 없음 케이스)

Run:
```bash
node -e "import('./src/commands/session-context.mjs').then(async m => { console.log(await m.buildSessionContext('/tmp/__nope__')); })"
```
Expected: `<system-reminder>` nudge 출력 (재개 줄 없음, "새 task 생성"·"task 없이 진행" 포함).

- [ ] **Step 3: artifact.md에 결과·학습 기록**, 필요 시 `## Reviews` 섹션에 리뷰 결과 추가.

- [ ] **Step 4: 완료 신호 → AskUserQuestion → `harness-team done`** (사용자 게이트)

## Ontology 변경 로그
- (2026-06-16) **task-gate**, **재개 가능한(미완) task**, **inject vs block** 정의 — spec.md Ontology 반영 완료.

## 참고
- spec: `session-task-gate-spec.md`
- 재사용: `task.mjs` `planHasOpenBoxes`(신규 추출), `readActive`(export), `fsx.exists`.

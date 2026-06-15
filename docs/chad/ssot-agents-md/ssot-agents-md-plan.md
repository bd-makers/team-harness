# ssot-agents-md — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (권장) 또는 superpowers:executing-plans 로 task 단위 구현. 단계는 `- [ ]` 체크박스로 추적.

**Goal:** SSOT master를 `CLAUDE.md`(벤더 고유)에서 `AGENTS.md`(오픈 표준)로 역전 — `AGENTS.md`를 공유 코어 실파일로, `CLAUDE.md`/`GEMINI.md`는 `@AGENTS.md` import + 전용 섹션만 담는 얇은 파일로 전환하고 alias symlink 체계를 폐기한다.

**Architecture:** `render.mjs`(단순 `{{var}}` 치환)로 세 템플릿(`AGENTS.md.hbs` 코어 + `CLAUDE.md.hbs`/`GEMINI.md.hbs` 얇음)을 렌더. `mergeMarkdown`의 기존 `harness:section` 마커-머지를 세 파일에 그대로 적용해 managed 블록만 갱신·사용자 텍스트 보존. `@AGENTS.md` import 라인은 마커 밖 파일 최상단에 두어 doctor가 정확 문자열로 grep하고 re-sync에도 생존(머지는 managed 섹션만 건드림). migrate는 `extractSections`(마커 기반)로 레거시 CLAUDE.md에서 core 섹션을 추출·합성, 텍스트 휴리스틱 금지.

**Tech Stack:** Node.js ESM, `node --test`, 의존성 없음. 기존 모듈 재사용: `render.mjs`, `merge.mjs`(`extractSections`/`mergeMarkdown`), `fsx.mjs`.

---

## 검증 결과 (Task 1 — 계획 중 실측 완료, 실행 시 재확인)

| 도구 | AGENTS.md 소비 방식 | 확정 문자열 / 근거 | 상태 |
|---|---|---|---|
| **Claude Code** | CLAUDE.md → `@AGENTS.md` import (네이티브 미인식) | 토큰 `@AGENTS.md`, 경로=import 파일 기준, 재귀 4-hop. 출처: code.claude.com/docs/en/memory | ✅ 문서 확정 |
| **Gemini CLI** | GEMINI.md → `@AGENTS.md` import | 문서상 `@file.md` 지원. 이 셸엔 `gemini` 미설치 → 실행 시 temp-dir sentinel 테스트로 재확인 | ⚠ 실측 보류(환경) |
| **Cursor** | `AGENTS.md` 네이티브 | agents.md 오픈 표준 네이티브 채택 → `.cursorrules` 불필요 | 문서 근거 |
| **OpenCode** | `AGENTS.md` 네이티브 | 동상 | 문서 근거 |

**폴백 규칙:** 실행 단계 Gemini 실측이 실패하면 — GEMINI.md만 풀 렌더(코어 복제). 파일 구조·다른 템플릿은 불변. Cursor 네이티브 확인이 뒤집히면 `.cursorrules`를 얇은 파일로 유지(제거 보류). 레이아웃은 검증 결과와 무관하게 고정.

## 섹션 → 파일 매핑 (고정 결정)

| 마커 섹션 | 이동처 | 근거 |
|---|---|---|
| `protocol` (작업 프로토콜·task 4파일·리뷰 기준) | **AGENTS.md (core)** | 모든 에이전트 보편 |
| `roles` (역할 표·리뷰 프로토콜) | **AGENTS.md (core)** | 보편 + D2 명문화 위치 |
| `principles` (핵심 원칙) | **AGENTS.md (core)** | 보편 |
| `stack` (기술 스택·명령) | **AGENTS.md (core)** | 보편 |
| `workflow` (플랜모드·서브에이전트·advisor·superpowers·복잡도 게이트) | **CLAUDE.md (thin)** | Claude driver 전용 레버 |
| (신규) `reviewer` (리뷰어 운영 지침) | **GEMINI.md (thin)** | Gemini 전용 |

**의식적 단일 결정 (advisor flag):** `workflow` 섹션 내부 §1-A(Ambiguity 게이트)·§3(자기개선)·§4(완료전검증)·§6(자율버그수정)은 의미상 보편 규율이나 **통째로 CLAUDE.md에 둔다(coarse cut)**. 근거: ① 이들은 "코드를 작성/수정하는 driver"의 규율이고 Codex/Gemini는 리뷰어(D2) — fix/verify를 안 하므로 core 부재가 방어 가능. ② 응집된 한 섹션을 쪼개면 마커 관리 복잡도↑. 추후 Codex가 driver로 승격(D2 재평가)되면 그때 core로 올린다.

---

## Task 1: 임포트 실측 + 결과 기록

**Files:**
- 기록: `docs/chad/ssot-agents-md/ssot-agents-md-artifact.md` (## Verification 섹션)

- [x] **Step 1: Claude `@import` 확정** — 위 표대로 `@AGENTS.md` 사용. (계획 중 claude-code-guide가 공식 문서로 확정, 추가 작업 불필요.)

- [~] **Step 2: Gemini CLI 실측 (gemini가 PATH에 있을 때)** — 이 환경에 바이너리 미발견 → 실행 단계로 이연(artifact에 기록). 폴백 설계로 구조 불변.

```bash
D="$(mktemp -d)"; cd "$D"
printf '# Core\n\nIf asked "canary?" answer exactly: CANARY-ZQ7731\n' > AGENTS.md
printf '@AGENTS.md\n\n# Gemini thin\n' > GEMINI.md
timeout 60 gemini --approval-mode default -p "canary?" 2>&1 | tail -5
```
Expected: 출력에 `CANARY-ZQ7731` 포함 → PASS(import 동작). `command not found`/미포함 → GEMINI.md 풀렌더 폴백 결정.

- [x] **Step 3: 결과를 artifact.md `## Verification`에 표로 기록** (도구별 import 방식/확정 문자열/폴백 여부). 미기록 = "안 한 것".

- [x] **Step 4: Commit**

```bash
git add docs/chad/ssot-agents-md/ssot-agents-md-artifact.md
git commit -m "docs(task): ssot-agents-md import 실측 결과 기록"
```

---

## Task 2: 템플릿 3분할

**Files:**
- Create: `templates/AGENTS.md.hbs` (core: protocol+roles+principles+stack)
- Modify: `templates/CLAUDE.md.hbs` (thin: `@AGENTS.md` + workflow + user)
- Create: `templates/GEMINI.md.hbs` (thin: `@AGENTS.md` + reviewer + user)
- Test: `tests/agent-files.test.mjs`

- [x] **Step 1: 실패 테스트 작성** — 렌더 산출물 구조 검증

```javascript
// tests/agent-files.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../src/render.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tpl = (f) => readFile(join(ROOT, 'templates', f), 'utf8');
const VARS = { projectName: 'demo', stackLabel: 'Node', packageManager: 'npm',
  language: 'ts', cmdInstall: 'npm i', cmdDev: 'npm run dev', cmdTest: 'npm test',
  cmdLint: 'npm run lint', cmdTypecheck: 'npm run tc' };

test('AGENTS.md(core)는 protocol/roles/principles/stack 마커를 모두 포함', async () => {
  const out = render(await tpl('AGENTS.md.hbs'), VARS);
  for (const s of ['protocol', 'roles', 'principles', 'stack'])
    assert.match(out, new RegExp(`harness:section="${s}" begin`), `${s} 누락`);
  assert.doesNotMatch(out, /harness:section="workflow"/, 'workflow는 core에 없어야');
});

test('CLAUDE.md(thin)는 @AGENTS.md import + workflow 섹션 + user 영역만', async () => {
  const out = render(await tpl('CLAUDE.md.hbs'), VARS);
  assert.match(out, /^@AGENTS\.md\s*$/m, '최상단 @AGENTS.md import');
  assert.match(out, /harness:section="workflow" begin/);
  assert.match(out, /harness:user:begin/);
  assert.doesNotMatch(out, /harness:section="principles"/, 'core 섹션 복제 금지');
});

test('GEMINI.md(thin)는 @AGENTS.md import + reviewer 섹션', async () => {
  const out = render(await tpl('GEMINI.md.hbs'), VARS);
  assert.match(out, /^@AGENTS\.md\s*$/m);
  assert.match(out, /harness:section="reviewer" begin/);
});

test('어느 thin 파일도 core 본문을 복제하지 않는다 (중복 0)', async () => {
  const claude = render(await tpl('CLAUDE.md.hbs'), VARS);
  const gemini = render(await tpl('GEMINI.md.hbs'), VARS);
  assert.doesNotMatch(claude, /## 작업 프로토콜/);
  assert.doesNotMatch(gemini, /## 작업 프로토콜/);
});
```

- [x] **Step 2: 실패 확인**

Run: `node --test tests/agent-files.test.mjs`
Expected: FAIL (AGENTS.md.hbs/GEMINI.md.hbs 없음)

- [x] **Step 3: `templates/AGENTS.md.hbs` 작성** — 현 `CLAUDE.md.hbs`에서 `principles`+`stack`+`roles`+`protocol` 4개 마커 블록을 그대로 이동. 헤더 `# {{projectName}} — AI Team Contract (Core)`. 표 안의 컨텍스트 파일 행 갱신: `CLAUDE.md`/`GEMINI.md`가 symlink가 아니라 "`@AGENTS.md` import 얇은 파일"임을 명시, `.cursorrules` 행 제거. roles 섹션 안내문의 "`harness-team sync` 실행 시 갱신 대상" → "`harness-team apply` 실행 시 갱신 대상"으로 수정(sync는 더 이상 렌더 안 함).

- [x] **Step 4: `templates/CLAUDE.md.hbs` 재작성 (thin)**

```handlebars
@AGENTS.md

# {{projectName}} — Claude Code

<!-- harness:section="workflow" begin -->
## 워크플로우 오케스트레이션
(현 CLAUDE.md.hbs의 workflow 섹션 전체 — §1~§6, §1-A, §5-A 그대로)
<!-- harness:section="workflow" end -->

<!-- harness:user:begin -->
<!-- 이 마커 아래 작성한 내용은 harness가 절대 수정하지 않습니다. -->
<!-- harness:user:end -->
```

- [x] **Step 5: `templates/GEMINI.md.hbs` 작성 (thin)**

```handlebars
@AGENTS.md

# {{projectName}} — Gemini (Reviewer)

<!-- harness:section="reviewer" begin -->
## 리뷰어 운영 지침
- 역할: 독립 리뷰어(read-only). 작성/수정 금지 — 발견과 근거만 보고.
- 호출: `gemini --approval-mode default -p`
- 리뷰 결과는 활성 task의 `<name>-artifact.md` ## Reviews 섹션에 날짜와 함께 남긴다.
- 코어(@AGENTS.md)의 "코드 리뷰 기준"을 따른다.
<!-- harness:section="reviewer" end -->

<!-- harness:user:begin -->
<!-- harness:user:end -->
```

- [x] **Step 6: 테스트 통과 확인**

Run: `node --test tests/agent-files.test.mjs`
Expected: PASS (4개)

- [x] **Step 7: Commit**

```bash
git add templates/AGENTS.md.hbs templates/CLAUDE.md.hbs templates/GEMINI.md.hbs tests/agent-files.test.mjs
git commit -m "feat(templates): split AI contract into AGENTS.md core + thin CLAUDE/GEMINI"
```

---

## Task 3: harness.mjs — 3파일 렌더 + setupAgentFiles

**Files:**
- Modify: `src/harness.mjs` (`planChanges` 확장, `AGENT_SYMLINKS`/`setupSymlinks` → `setupAgentFiles`)
- Modify: `src/commands/init.mjs:81,93` (호출/로그)
- Modify: `src/commands/sync.mjs:1,9` (import/호출)
- Test: `tests/agent-files.test.mjs` (append)

- [x] **Step 1: 실패 테스트 추가** — planChanges가 3개 markdown change를 만들고, 기존 thin CLAUDE.md 재머지 시 `@AGENTS.md` 최상단 라인이 생존하는지

```javascript
// append to tests/agent-files.test.mjs
import { planChanges } from '../src/harness.mjs';
import { mergeMarkdown } from '../src/merge.mjs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';

test('planChanges: 신규 프로젝트에 AGENTS/CLAUDE/GEMINI 3개 markdown change 생성', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-af-'));
  const ctx = { root: ROOT, targetDir: dir, backupDir: null, flags: {} };
  const { changes } = await planChanges(ctx, { stack: VARS });
  const md = changes.filter(c => c.kind === 'markdown').map(c => c.path);
  assert.ok(md.some(p => p.endsWith('AGENTS.md')), 'AGENTS.md');
  assert.ok(md.some(p => p.endsWith('CLAUDE.md')), 'CLAUDE.md');
  assert.ok(md.some(p => p.endsWith('GEMINI.md')), 'GEMINI.md');
});

test('mergeMarkdown: 기존 thin CLAUDE.md 재머지 시 @AGENTS.md 최상단 라인 생존', async () => {
  const incoming = render(await tpl('CLAUDE.md.hbs'), VARS);
  const existing = '@AGENTS.md\n\n# demo — Claude Code\n\n<!-- harness:user:begin -->\n내 메모\n<!-- harness:user:end -->\n';
  const merged = mergeMarkdown(existing, incoming);
  assert.match(merged, /^@AGENTS\.md/m, 'import 라인 보존');
  assert.match(merged, /내 메모/, '사용자 텍스트 보존');
});
```

- [x] **Step 2: 실패 확인** — Run: `node --test tests/agent-files.test.mjs` → FAIL (planChanges가 CLAUDE.md만 렌더)

- [x] **Step 3: `planChanges` 확장** — CLAUDE.md 렌더 블록(`src/harness.mjs:40-52`)을 3파일 루프로 일반화:

```javascript
  // AGENTS.md (core) + CLAUDE.md/GEMINI.md (thin) — marker-merge each
  for (const [file, tplName] of [
    ['AGENTS.md', 'AGENTS.md.hbs'],
    ['CLAUDE.md', 'CLAUDE.md.hbs'],
    ['GEMINI.md', 'GEMINI.md.hbs'],
  ]) {
    const t = await readTextSafe(join(tplDir, tplName));
    if (!t) continue;
    const rendered = render(t, vars);
    const existing = await readTextSafe(join(targetDir, file));
    const merged = mergeMarkdown(existing, rendered);
    if (existing !== merged) {
      changes.push({ kind: 'markdown', path: join(targetDir, file), before: existing, after: merged });
    }
  }
```

- [x] **Step 4: `AGENT_SYMLINKS` 제거 + `setupSymlinks` → `setupAgentFiles`** — alias symlink 생성을 폐기. 세 에이전트 파일은 `planChanges`/`applyChanges`가 실파일로 렌더하므로 별도 후처리 불필요. `setupSymlinks`(harness.mjs:217-227)와 import(line 6 `ensureSymlink`) 제거하고, 호출부 호환을 위해 no-op `export async function setupAgentFiles() { return []; }`로 교체(또는 호출부에서 제거).

- [x] **Step 5: 호출부 갱신**
  - `src/commands/init.mjs`: line 81 `const links = await setupSymlinks(ctx);` 제거, line 93 `for (const l of links) ... → CLAUDE.md` 로그 제거.
  - `src/commands/sync.mjs`: line 1 import에서 `setupSymlinks` 제거, line 9 호출 제거, line 12 로그 제거. (cursor rules 미러링·post-commit hook은 유지.)

- [x] **Step 6: 테스트 통과** — Run: `node --test tests/agent-files.test.mjs` → PASS

- [x] **Step 7: 전체 회귀** — Run: `npm test` → 55 + 신규 통과, 0 fail

- [x] **Step 8: Commit**

```bash
git add src/harness.mjs src/commands/init.mjs src/commands/sync.mjs tests/agent-files.test.mjs
git commit -m "feat(harness): render AGENTS/CLAUDE/GEMINI as real files, drop alias symlinks"
```

---

## Task 4: doctor.mjs — 신구조 CHECKS + 레거시 감지

**Files:**
- Modify: `src/commands/doctor.mjs:57-70` (CHECKS) + 신규 레거시 감지 함수
- Test: `tests/doctor.test.mjs` (append)

- [x] **Step 1: 실패 테스트 추가** — 신구조 통과 / 레거시 symlink 감지

```javascript
// append to tests/doctor.test.mjs — import { detectLegacyStructure } from '../src/commands/doctor.mjs';
import { symlink } from 'node:fs/promises';

test('detectLegacyStructure: AGENTS.md가 CLAUDE.md로의 symlink면 레거시 경고', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-legacy-'));
  try {
    await writeFile(join(dir, 'CLAUDE.md'), '# old master\n');
    await symlink('CLAUDE.md', join(dir, 'AGENTS.md'));
    const w = await detectLegacyStructure(dir);
    assert.ok(typeof w === 'string' && /migrate/.test(w), '레거시→migrate 안내');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('detectLegacyStructure: AGENTS.md 실파일이면 null(신구조)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-new-'));
  try {
    await writeFile(join(dir, 'AGENTS.md'), '# core\n');
    await writeFile(join(dir, 'CLAUDE.md'), '@AGENTS.md\n');
    assert.equal(await detectLegacyStructure(dir), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
```

- [x] **Step 2: 실패 확인** — Run: `node --test tests/doctor.test.mjs` → FAIL (`detectLegacyStructure` 없음)

- [x] **Step 3: CHECKS 개정** (`doctor.mjs:57-70`)

```javascript
const CHECKS = [
  { path: 'AGENTS.md', required: true, realFile: true, contains: 'harness:section="protocol"' },
  { path: 'CLAUDE.md', required: true, realFile: true, contains: '@AGENTS.md' },
  { path: 'GEMINI.md', required: false, realFile: true, contains: '@AGENTS.md' },
  { path: '.claude/settings.json', required: true, json: true },
  { path: '.claude/hooks/protect-files.sh', executable: true },
  { path: '.claude/hooks/auto-format.sh', executable: true },
  { path: '.claude/hooks/pre-commit-check.sh', executable: true },
  { path: '.cursor/rules', required: false, dir: true },
  { path: '.opencode/opencode.json', required: false, json: true },
  { path: 'docs/README.md', required: false },
  { path: '.harness/backup.json', required: true, json: true },
];
```
`runDoctor` 루프에 `realFile`(symlink면 ✗ "신구조는 실파일이어야") + `contains`(파일에 정확 문자열 grep, 없으면 ✗) 분기 추가.

- [x] **Step 4: `detectLegacyStructure` 추가** — `AGENTS.md`/`GEMINI.md`/`.cursorrules` 중 하나라도 symlink거나 `.cursorrules` 존재 시 경고 문자열 반환(아니면 null). `runDoctor` 끝에서 호출해 `⚠️ 레거시 구조 감지 — harness-team migrate 실행` 출력(fail++는 CHECKS의 realFile이 담당).

- [x] **Step 5: 테스트 통과** — Run: `node --test tests/doctor.test.mjs` → PASS

- [x] **Step 6: Commit**

```bash
git add src/commands/doctor.mjs tests/doctor.test.mjs
git commit -m "feat(doctor): enforce AGENTS.md core + import lines, detect legacy symlinks"
```

---

## Task 5: migrate.mjs — 레거시 → 신구조 원스텝

**Files:**
- Modify: `src/commands/migrate.mjs` (신규 `migrateToAgentsMd` 추가 + `runMigrate`에 연결)
- Test: `tests/migrate-agents.test.mjs`

- [x] **Step 1: 실패 테스트 작성** — 레거시 fixture(CLAUDE.md master + AGENTS/GEMINI/.cursorrules symlink) → 신구조

```javascript
// tests/migrate-agents.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink, lstat, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { migrateToAgentsMd } from '../src/commands/migrate.mjs';

// 레거시 = CLAUDE.md 실파일(4 core 마커 + workflow + user) + 3 alias symlink
async function makeLegacy(claudeBody) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-mig-agents-'));
  await writeFile(join(dir, 'CLAUDE.md'), claudeBody);
  for (const a of ['AGENTS.md', 'GEMINI.md', '.cursorrules']) await symlink('CLAUDE.md', join(dir, a));
  return dir;
}
const LEGACY = [
  '# demo — AI Team Contract',
  '<!-- harness:section="workflow" begin -->\n## 워크플로우\n워크플로우 본문\n<!-- harness:section="workflow" end -->',
  '<!-- harness:section="principles" begin -->\n## 핵심 원칙\n원칙 본문\n<!-- harness:section="principles" end -->',
  '<!-- harness:section="roles" begin -->\n## 역할\n역할 본문\n<!-- harness:section="roles" end -->',
  '<!-- harness:section="protocol" begin -->\n## 프로토콜\n프로토콜 본문\n<!-- harness:section="protocol" end -->',
  '<!-- harness:user:begin -->\n사용자 자유 메모 SENTINEL\n<!-- harness:user:end -->',
].join('\n\n') + '\n';
const ctxYes = (dir, root) => ({ targetDir: dir, root, flags: { yes: true } });

test('레거시 CLAUDE.md master + 3 symlink → AGENTS.md core 실파일 + thin CLAUDE/GEMINI', async () => {
  const dir = await makeLegacy(LEGACY);
  try {
    await migrateToAgentsMd(ctxYes(dir, process.cwd()));
    // AGENTS.md = 실파일, core 섹션 포함
    const agentsSt = await lstat(join(dir, 'AGENTS.md'));
    assert.equal(agentsSt.isSymbolicLink(), false, 'AGENTS.md는 실파일');
    const agents = await readFile(join(dir, 'AGENTS.md'), 'utf8');
    for (const s of ['principles', 'roles', 'protocol']) assert.match(agents, new RegExp(`section="${s}"`));
    // CLAUDE.md = thin (import + workflow), 사용자 메모 보존
    const claude = await readFile(join(dir, 'CLAUDE.md'), 'utf8');
    assert.match(claude, /^@AGENTS\.md/m, 'thin import');
    assert.match(claude, /section="workflow"/, 'workflow 잔류');
    assert.match(claude, /SENTINEL/, '사용자 텍스트 보존');
    assert.doesNotMatch(claude, /section="protocol"/, 'core 섹션은 CLAUDE에서 제거');
    // .cursorrules 제거됨
    assert.equal(await lstat(join(dir, '.cursorrules')).then(()=>true,()=>false), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('멱등 — 이미 신구조면 변경 없음(false 반환)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-mig-noop-'));
  try {
    await writeFile(join(dir, 'AGENTS.md'), '# core\n<!-- harness:section="protocol" begin -->x<!-- harness:section="protocol" end -->\n');
    await writeFile(join(dir, 'CLAUDE.md'), '@AGENTS.md\n');
    assert.equal(await migrateToAgentsMd(ctxYes(dir, process.cwd())), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
```

- [x] **Step 2: 실패 확인** — Run: `node --test tests/migrate-agents.test.mjs` → FAIL (`migrateToAgentsMd` 없음)

- [x] **Step 3: `migrateToAgentsMd` 구현** — 마커 기반, 텍스트 휴리스틱 금지:
  1. `AGENTS.md`가 실파일이고 core 마커 포함 → 이미 신구조, return false.
  2. `lstat`으로 `AGENTS.md`/`GEMINI.md`/`.cursorrules` symlink 여부 판정. 레거시(symlink 존재 또는 `.cursorrules` 존재)가 아니면 return false.
  3. 사전 백업: `CLAUDE.md`를 `CLAUDE.md.bak`로 복사(이미 있으면 skip) — 파괴 방지.
  4. `extractSections(claude)`로 블록 추출. core(`principles`,`roles`,`stack`,`protocol`) → `AGENTS.md` 합성(헤더 + 블록들). `mergeMarkdown(null, ...)` 사용.
  5. thin `CLAUDE.md` 재작성: `@AGENTS.md\n\n# <name> — Claude Code\n\n` + `workflow` 블록 + user 영역(`harness:user` 블록 보존, 없으면 빈 마커). core 섹션은 제외.
  6. thin `GEMINI.md` 실파일 작성(`@AGENTS.md` + reviewer 섹션). 기존 GEMINI.md symlink는 `unlink` 후 실파일로.
  7. alias symlink 제거: `AGENTS.md`(symlink였으면 unlink 후 실파일로 교체), `.cursorrules` unlink.
  8. console 리포트 + return true.

- [x] **Step 4: `runMigrate`에 연결** (`migrate.mjs:324-340`) — `const agentsMigrated = await migrateToAgentsMd(ctx);`를 추가하고 종합 판정/메시지에 포함. 기존 task/script 마이그레이션보다 **먼저** 실행(구조 전환이 선행).

- [x] **Step 5: 테스트 통과** — Run: `node --test tests/migrate-agents.test.mjs` → PASS (2개)

- [x] **Step 6: 전체 회귀** — Run: `npm test` → 0 fail

- [x] **Step 7: Commit**

```bash
git add src/commands/migrate.mjs tests/migrate-agents.test.mjs
git commit -m "feat(migrate): one-step legacy CLAUDE.md+symlinks → AGENTS.md core structure"
```

---

## Task 6: role 표에 D2 명문화 (OpenCode=drive, Codex/Gemini=리뷰어)

**Files:**
- Modify: `templates/AGENTS.md.hbs` (roles 섹션 — Task 2에서 이동된 표)

- [x] **Step 1: roles 표 갱신** — OpenCode 행을 "보조 CLI"에서 **drive 주체(병렬 작성 세션)**로 격상, Codex/Gemini는 리뷰어(read-only) 유지. 표 아래 1줄 결정 기록: "D2(2026-06-11): drive=Claude·OpenCode, 리뷰어=Codex·Gemini. 독립 리뷰어 가치는 작성자 분리에서 나옴."

```markdown
| 에이전트 | 역할 | 호출 방식 |
|---|---|---|
| **Claude Code** | 리드 프로그래머 (drive) | 주 세션 |
| **OpenCode** | 보조 드라이버 (병렬 작성 세션) | `opencode.json` 설정 |
| **Codex** | 리뷰어 (read-only) | Bash: `codex exec --sandbox read-only` |
| **Gemini** | 리뷰어 (read-only) | Bash: `gemini --approval-mode default -p` |
| **Cursor** | 보조 에디터 (IDE) | `.cursor/rules/*.mdc` 자동 적용 |
```

- [x] **Step 2: 렌더 테스트 보강** — `tests/agent-files.test.mjs`에 AGENTS.md 렌더에 `drive`·`리뷰어` 문자열 + OpenCode 행 존재 assert 추가.

- [x] **Step 3: 테스트 통과** — Run: `node --test tests/agent-files.test.mjs` → PASS

- [x] **Step 4: Commit**

```bash
git add templates/AGENTS.md.hbs tests/agent-files.test.mjs
git commit -m "docs(roles): record D2 — OpenCode drives, Codex/Gemini review"
```

---

## Task 7: backup/symlink 시스템 위생 (.cursorrules 참조 제거 — 의도적 최소 터치)

**Files:**
- Modify: `src/commands/symlink.mjs:30` (`ALIAS_ITEMS`)
- Modify: `src/commands/upgrade.mjs:11` (`ALIAS_ITEMS`)
- Modify: `templates/symlink.sh:11` (`ITEMS`)

> **범위 경계:** 이 backup→project symlink 시스템은 본 task 핵심(에이전트 alias)과 **별개 기능**(하네스를 sibling 백업 디렉토리로 재배치). symlink.mjs는 MOVE/ALIAS를 concat해 동일 취급하므로 AGENTS.md/GEMINI.md가 실파일이 돼도 기능 변화 0. 유일한 위생 항목 = `.cursorrules` 참조 제거. **확장 금지.**

- [x] **Step 1: `.cursorrules` 제거** — 세 곳의 리스트에서 `.cursorrules` 항목 삭제. (AGENTS.md/GEMINI.md는 그대로 둠 — 이제 실파일이지만 백업 미러링 대상으로 유효.)

- [x] **Step 2: 회귀 확인** — Run: `npm test` → `tests/symlink.test.mjs`/`delete.test.mjs` 등 0 fail

- [x] **Step 3: Commit**

```bash
git add src/commands/symlink.mjs src/commands/upgrade.mjs templates/symlink.sh
git commit -m "chore(symlink): drop .cursorrules from backup relocation lists"
```

---

## Task 8: 문서 갱신 (README + overview HTML)

**Files:**
- Modify: `README.md` (구조 설명·symlink 언급 → AGENTS.md 코어 + thin import)
- Modify: `docs/harness-overview.html` (최신 구조 반영; 0.7.0 스냅샷 HTML은 보존)

- [x] **Step 1: README 구조 섹션 갱신** — "AGENTS.md/GEMINI.md/.cursorrules symlink → CLAUDE.md" 서술을 "AGENTS.md(오픈 표준 코어 실파일) + CLAUDE.md/GEMINI.md(@AGENTS.md import 얇은 파일)"로 교체. 컨텍스트 파일 표·명령 설명 동기화. `grep -n "symlink\|\.cursorrules\|CLAUDE.md (SSOT)" README.md`로 잔존 표현 점검.

- [x] **Step 2: overview HTML 갱신** — `docs/harness-overview.html`의 구조 다이어그램/설명을 신구조로. (`-0.7.0.html` 스냅샷은 건드리지 않음.)

- [x] **Step 3: 육안 확인** — `grep -rn "symlink → CLAUDE\|\.cursorrules" README.md docs/harness-overview.html` 잔존 0.

- [x] **Step 4: Commit**

```bash
git add README.md docs/harness-overview.html
git commit -m "docs: describe AGENTS.md core + thin import structure"
```

---

## Task 9: 0.8.0 파킹 문서에 D1/D2/D3 결정 기록

**Files:**
- Modify: `docs/superpowers/plans/2026-05-29-0.8.0-improvements.md`

- [x] **Step 1: Open Decisions 섹션에 결정 확정 기록** — D1=(C) 단일 소스→렌더(AGENTS.md canonical), D2=(b) Codex/Gemini 리뷰어·drive=Claude·OpenCode, D3=연기(2026-08-말 측정). 각 근거 1줄 + 결정일(2026-06-11) + 구현 task(`chad/ssot-agents-md`) 링크.

- [x] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-05-29-0.8.0-improvements.md
git commit -m "docs(0.8.0): record D1/D2/D3 decisions for SSOT inversion"
```

---

## Task 10: dogfooding — 플러그인 레포 자기 적용 (fresh apply 경로)

**Files:**
- Create(생성): 레포 루트 `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` (self-apply 산출물)

> **2-갈래 검증 (advisor):** 레포에 에이전트 파일이 없으므로 self-apply는 **fresh init/apply 경로**를 태운다(신규 렌더 커버리지). migrate 경로는 dogfooding으로 **안 태워짐** → Task 5의 레거시 fixture unit test가 그 보증을 담당. dogfooding 통과 ≠ migrate 동작 보증.

- [x] **Step 1: 자기 적용 실행** (`apply = runInit`. `--no-backup`로 백업 디렉토리 생성 회피 — dogfooding 목적은 에이전트 3파일 검증)

```bash
node bin/harness-team.mjs apply . --yes --no-backup
git status --short   # 의도치 않은 settings/hooks 변경 점검
```
Expected: `AGENTS.md`(core 실파일) + `CLAUDE.md`/`GEMINI.md`(thin @import) 생성. (apply가 stack 자동감지 → Node.) settings/opencode/hooks가 머지로 바뀌면 diff 확인 후 의도한 것만 스테이징.

- [x] **Step 2: doctor로 신구조 검증**

```bash
node bin/harness-team.mjs doctor .
```
Expected: AGENTS.md/CLAUDE.md realFile+contains ✓, 레거시 경고 없음, `All checks passed` (또는 무관한 기존 항목만).

- [x] **Step 3: 생성물 육안 확인** — `AGENTS.md`에 protocol/roles 코어 존재, `CLAUDE.md` 최상단 `@AGENTS.md` + workflow, 중복 0.

- [x] **Step 4: Commit**

```bash
git add AGENTS.md CLAUDE.md GEMINI.md
git commit -m "chore(dogfood): self-apply AGENTS.md core structure to plugin repo"
```

---

## Task 11: 종결 — 전체 회귀 + 리뷰 + done

- [x] **Step 1: 전체 테스트** — Run: `npm test` → baseline 55 + 신규 전부 통과, **0 fail** (Acceptance "전체 테스트 통과" 입증, 로그 기록).

- [x] **Step 2: 코드 리뷰** — `/review`(Codex+Gemini 병렬) 또는 `codex:rescue`로 핵심 변경(harness.mjs·migrate.mjs·doctor.mjs) 검증. 결과(요약·발견·조치)를 `ssot-agents-md-artifact.md` **## Reviews**에 날짜와 함께 기록 — 미기록 = "안 한 것".

- [x] **Step 3: Acceptance 대조** — spec의 Acceptance 8항목을 plan 산출물과 1:1 대조해 artifact에 체크.

- [x] **Step 4: `harness-team done`** — 종결 가드 통과(커밋 완료·테스트 로그·plan 미완 0·artifact 작성). 미통과 항목 있으면 멈추고 보고.

---

## Ontology 변경 로그

- **공유 코어 = `AGENTS.md` 본문**(기존 정의 확정). canonical 실파일.
- **얇은 파일** = `@AGENTS.md` import 1줄 + 전용 섹션. 코어 복제 금지.
- (신규) **`reviewer` 섹션** = GEMINI.md 전용 managed 마커. 리뷰어 운영 지침.
- **레거시 구조** = `CLAUDE.md` 실파일 master + `AGENTS.md`/`GEMINI.md`/`.cursorrules` symlink 3종.

## 참고
- spec: [ssot-agents-md-spec.md](ssot-agents-md-spec.md)
- Claude `@import` 근거: code.claude.com/docs/en/memory (claude-code-guide 확정)
- baseline: 55 tests pass (2026-06-12)
- advisor 검토: 검증-gate 구조·섹션 매핑·migrate 마커기반·symlink 최소터치·dogfooding 2갈래

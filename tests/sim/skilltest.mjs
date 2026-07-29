#!/usr/bin/env node
// harness-skilltest — targeted L5 verification for the agent-workflow skills
// /harness-unittest and /harness-comptest.
//
// WHY a separate harness: agentloop.mjs scores the INSTALLED harness scaffold
// (init/apply/task/hooks/triggers, SC1–SC6). It does NOT exercise these two
// command skills. Both are pure agent workflows (detect stack → scope → write
// GWT tests → coverage → verify) with no CLI-deterministic path, so the only
// honest way to verify them is to spawn a REAL `claude -p` session in a fixture
// project, let the skill write tests, and score observable side-effects
// (files written / greppable patterns / `npm test` exit code) — not prose.
//
// AUTH (same constraint as agentloop): a nested `claude -p` does NOT inherit the
// parent session login. Two ways to get auth into the child:
//   • USER-RUN  — run this yourself in an authenticated terminal (ambient login).
//   • TOKEN-RUN — `claude setup-token` → `umask 077; echo '<tok>' > ~/.claude-sim-oauth-token`.
//
// Subcommands:
//   node tests/sim/skilltest.mjs selftest   # NO auth, NO agent — proves the scorer (run this in-session)
//   node tests/sim/skilltest.mjs warm        # NO auth — pre-build fixture templates (npm install once)
//   node tests/sim/skilltest.mjs probe       # auth contract check (spawn one trivial call)
//   node tests/sim/skilltest.mjs run         # full: spawn agent per skill + dated report (~10–20 min)
//
// HONESTY: greppable side-effects can PASS/FAIL. Judgment the skill delegates to
// the agent (Khorikov refactoring-resistance, mutation survival, unittest↔comptest
// routing) is NOT reliably observable headless → it stays ⚠️manual. No prose PASS.

import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm, readFile, readdir, cp, stat, chmod } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir, tmpdir } from 'node:os';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PG = resolve(ROOT, '..', 'harness-playground');
const TOKEN_FILE = join(homedir(), '.claude-sim-oauth-token');
const CACHE = join(PG, '.skilltest-cache');   // pre-built fixture templates (npm install'd once)
const NS = '/harness-aijient-team';           // verified namespaced slash prefix

const TS = isoStamp();
function isoStamp() {
  const d = new Date(); // CLI, not a workflow — new Date() is fine here.
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}`;
}

// ── low-level process runner (mirrors sandbox.mjs / agentloop.mjs) ─────────────
// `timeoutMs`: SIGTERM → grace → SIGKILL, settling on the kill path rather than on
// 'close' — a surviving grandchild can hold the inherited pipe open indefinitely.
const KILL_GRACE_MS = 5000;
function run(cmd, args, { timeoutMs = 0, ...opts } = {}) {
  return new Promise((res) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let stdout = '', stderr = '', settled = false, timedOut = false;
    let timer = null, grace = null;
    const done = (r) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (grace) clearTimeout(grace);
      res(r);
    };
    const expired = () => ({ code: -2, stdout, stderr: `TIMEOUT after ${timeoutMs}ms` });
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        grace = setTimeout(() => {
          child.kill('SIGKILL');
          child.stdout.destroy(); child.stderr.destroy(); child.unref();
          done(expired());
        }, KILL_GRACE_MS);
        grace.unref();
      }, timeoutMs);
    }
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => done(timedOut ? expired() : { code, stdout, stderr }));
    child.on('error', (err) => done({ code: -1, stdout, stderr: String(err.stack || err) }));
  });
}

// ── auth (copied from agentloop.mjs — deliberately NOT shared; see advisor note:
// don't refactor the one working L5 harness we can't re-verify without auth) ───
async function loadTokenOptional() {
  if (!existsSync(TOKEN_FILE)) {
    console.error(`ℹ no token file (${TOKEN_FILE}) — relying on ambient login.`);
    console.error('  Works when YOU run this in an authenticated terminal.\n');
    return null;
  }
  try {
    const { mode } = await stat(TOKEN_FILE);
    if (mode & 0o077) { await chmod(TOKEN_FILE, 0o600); }
  } catch { /* best-effort */ }
  const tok = (await readFile(TOKEN_FILE, 'utf8')).trim();
  if (!tok) { console.error(`✗ ${TOKEN_FILE} empty — treating as no token.`); return null; }
  console.error(`✓ using OAuth token from ${TOKEN_FILE}\n`);
  return tok;
}

// ── headless agent call (copied + adapted allowlist: these skills run the test
// runner, so npm/npx are in scope; sandboxes are throwaway) ────────────────────
async function runHeadless(token, cwd, prompt, { timeoutMs = 600000 } = {}) {
  const allowed = process.env.SIM_ALLOWED_TOOLS
    || 'Bash(npm:*),Bash(npx:*),Bash(node:*),Bash(git:*),Read,Write,Edit,Glob,Grep';
  const args = ['-p', prompt, '--output-format', 'json', '--allowedTools', allowed];
  const env = { ...process.env };
  if (token) env.CLAUDE_CODE_OAUTH_TOKEN = token;
  delete env.CLAUDE_CODE_CHILD_SESSION;
  delete env.CLAUDECODE;

  const r = await run('claude', args, { cwd, env, timeoutMs });
  let json = null, parseErr = null;
  try { json = JSON.parse(r.stdout); } catch (e) { parseErr = String(e.message); }
  const result = json?.result ?? '';
  const authFailed = /not logged in|invalid bearer token|failed to authenticate|api error: 401|please run \/login/i.test(result);
  const unknownCommand = /unknown command/i.test(result);
  return {
    ok: r.code === 0 && !json?.is_error,
    authFailed, unknownCommand, result,
    sessionId: json?.session_id ?? null,
    parseErr, stderr: r.stderr, code: r.code, raw: r.stdout,
  };
}

// (transcript lookup intentionally omitted: routing is judgment → MANUAL, so we
// never grep the transcript here. See agentloop.mjs if a transcript oracle is ever needed.)

// ── signals (copied small helpers) ─────────────────────────────────────────────
// A signal = { label, status: 'PASS'|'FAIL'|'MANUAL', note }. Prose is never a signal.
const sig = (label, ok, note = '') => ({ label, status: ok ? 'PASS' : 'FAIL', note });
const manual = (label, note = '') => ({ label, status: 'MANUAL', note });
const ICO = (s) => (s === 'PASS' ? '✅' : s === 'FAIL' ? '❌' : '⚠️');
function renderSignals(title, signals) {
  const lines = [`### ${title}`, ''];
  for (const s of signals) lines.push(`- ${ICO(s.status)} ${s.label}${s.note ? ` — ${s.note}` : ''}`);
  return lines.join('\n');
}

// ── fixture discovery ──────────────────────────────────────────────────────────
// Glob for test files the agent wrote (co-located OR __tests__), excluding node_modules
// and the seed test the template ships with.
async function walk(dir, acc = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, acc);
    else acc.push(p);
  }
  return acc;
}
async function findTestFiles(dir) {
  const all = await walk(dir);
  return all.filter((p) => /\.(test|spec)\.[jt]sx?$/.test(p) && !/seed\./.test(p));
}

// ── SCORERS (pure over file content; the bug-prone part → proven by `selftest`) ──
// Each greppable scorer takes ONE test file's SOURCE TEXT and returns PASS/FAIL
// signals. Judgment items (refactoring-resistance, mutation, routing) are not
// greppable and live in the separate *Manual() lists below.
// Accept-set = the command contract's (`commands/harness-{unittest,comptest}.md`).

// Extract each it()/test() callback body by brace-matching — markers and blank-line
// regions are both judged per body.
function skipString(src, i) {
  const q = src[i];
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === '\\') { j++; continue; }
    if (src[j] === q) return j;
  }
  return -1;
}
function prevCode(src, i) {
  let j = i - 1;
  while (j >= 0 && /\s/.test(src[j])) j--;
  return j;
}
// Must NOT include `}`, `<` or `>`-alone — in JSX those precede `/` (`{…} />`, `</p>`).
// `=>` is matched as a pair below.
const REGEX_PRECEDERS = '(,=:[!&|?;{';
const REGEX_KEYWORDS = ['return', 'typeof', 'instanceof', 'in', 'of', 'case', 'do', 'else', 'void', 'delete', 'await', 'yield', 'new'];
function startsRegex(src, i) {
  const j = prevCode(src, i);
  if (j < 0) return true;
  if (REGEX_PRECEDERS.includes(src[j])) return true;
  if (src[j] === '>' && src[j - 1] === '=') return true;
  const word = src.slice(0, j + 1).match(/[A-Za-z$_]+$/)?.[0];
  return word ? REGEX_KEYWORDS.includes(word) : false;
}
function skipRegex(src, i) {
  let inClass = false;
  for (let j = i + 1; j < src.length; j++) {
    const c = src[j];
    if (c === '\\') { j++; continue; }
    if (c === '\n') return -1;
    if (c === '[') inClass = true;
    else if (c === ']') inClass = false;
    else if (c === '/' && !inClass) return j;
  }
  return -1;
}
// Index of the last char of the string/comment/regex starting at `i`, or null when
// `i` is ordinary code. -1 means unterminated → the caller must not guess.
function scanNonCode(src, i) {
  const c = src[i];
  if (c === '"' || c === "'" || c === '`') return skipString(src, i);
  if (c === '/' && src[i + 1] === '/') { const n = src.indexOf('\n', i); return n === -1 ? src.length : n; }
  if (c === '/' && src[i + 1] === '*') { const n = src.indexOf('*/', i); return n === -1 ? -1 : n + 1; }
  if (c === '/' && startsRegex(src, i)) return skipRegex(src, i);
  return null;
}
function matchBrace(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const skip = scanNonCode(src, i);
    if (skip !== null) { if (skip === -1) return -1; i = skip; continue; }
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return i;
  }
  return -1;
}
// The callback body's `{` is the one preceded by `=>` or by a `function (…)` head.
function findBodyOpen(src, from) {
  for (let i = from; i < src.length; i++) {
    const skip = scanNonCode(src, i);
    if (skip !== null) { if (skip === -1) return -1; i = skip; continue; }
    if (src[i] !== '{') continue;
    const j = prevCode(src, i);
    if (j >= 0 && (src[j] === ')' || (src[j] === '>' && src[j - 1] === '='))) return i;
    const close = matchBrace(src, i);
    if (close === -1) return -1;
    i = close;
  }
  return -1;
}
function testBodies(src) {
  const bodies = [];
  let declared = 0, unparsed = 0;
  const decl = /(?<![\w$.])(?:it|test)\s*(?:\.\s*\w+\s*)?\(/g;
  let m;
  while ((m = decl.exec(src))) {
    declared++;
    const open = findBodyOpen(src, m.index);
    const end = open === -1 ? -1 : matchBrace(src, open);
    if (end === -1) { unparsed++; continue; }
    bodies.push(src.slice(open + 1, end));
  }
  return { bodies, declared, unparsed };
}

// Markers must LEAD a comment line — a bare `\bword\b` also hits `.then(` and prose.
const marker = (word) => new RegExp(String.raw`^[ \t]*(?:\/\/|\/\*|\*)\s*${word}\b`, 'im');
const GWT_MARKERS = ['given', 'when', 'then'].map(marker);
const AAA_MARKERS = ['arrange', 'act', 'assert'].map(marker);
const markersIn = (body) => GWT_MARKERS.every((re) => re.test(body)) || AAA_MARKERS.every((re) => re.test(body));
const regionsIn = (body) => (body.match(/\n[ \t]*\n/g) ?? []).length >= 2;

// Contract (unittest 3단계 · comptest 3단계): **모든** 테스트가 3구획을 "주석 또는
// 빈 줄"로 구분한다.
function scoreGWT(src) {
  const label = 'GWT/AAA 3구획 구분 (주석 마커 또는 빈 줄)';
  const { bodies, declared, unparsed } = testBodies(src);
  if (!declared) return sig(label, false, 'it()/test() 선언 없음');
  const off = bodies.filter((b) => !markersIn(b) && !regionsIn(b)).length;
  if (off) return sig(label, false, `${off}/${declared} 테스트에 3구획 없음`);
  if (unparsed) return manual(label, `본문 ${unparsed}/${declared}개 파싱 실패 — 수기 확인`);
  return sig(label, true);
}
const hasExpect = (src) => /\bexpect\s*\(/.test(src);
const hasSnapshot = (src) => /toMatch(Inline)?Snapshot\s*\(/.test(src);
const hasTestId = (src) => /(get|find|query)(All)?ByTestId\b/.test(src);
const hasFireEvent = (src) => /\bfireEvent\b/.test(src);
// Full permitted priority list (comptest 4단계): Role > LabelText > PlaceholderText
// > Text, plus the *All*/find* variants and the RN default (Text/LabelText).
const hasUserFacingQuery = (src) =>
  /(get|find|query)(All)?By(Role|LabelText|PlaceholderText|Text|AltText|Title|DisplayValue)\b/.test(src);
const hasUserEvent = (src) => /userEvent|user-event/.test(src);
const hasReactTestRenderer = (src) => /react-test-renderer/.test(src);

// unittest (Khorikov): output/state-based, GWT, no snapshot, real asserts.
function scoreUnittestSrc(src) {
  return [
    scoreGWT(src),
    sig('observable-behavior assert present (expect())', hasExpect(src)),
    sig('no snapshot test (forbidden by contract)', !hasSnapshot(src)),
  ];
}
const unittestManual = () => [
  manual('refactoring-resistance: no private/internal-call asserts', '헤드리스 관찰 불가 — 리포트 수기 확인'),
  manual('mutation survival: breaks if production logic breaks', '수기 확인'),
];
// comptest (Testing Trophy): user-facing queries, testId only as last resort,
// no fireEvent for new tests, no snapshot, no react-test-renderer.
function scoreComptestSrc(src) {
  return [
    scoreGWT(src),
    sig('사용자 관점 쿼리 사용 (role/label/placeholder/text)', hasUserFacingQuery(src)),
    sig('user-event used (not fireEvent for new tests)', hasUserEvent(src) && !hasFireEvent(src)),
    sig('getByTestId not used as primary query (최후수단만 허용)', !hasTestId(src) || hasUserFacingQuery(src)),
    sig('no snapshot test (forbidden by contract)', !hasSnapshot(src)),
    sig('no react-test-renderer (RNTL/RTL render only)', !hasReactTestRenderer(src)),
  ];
}
const comptestManual = () => [
  manual('markup-refactor resistance (div→section survives)', '헤드리스 관찰 불가 — 리포트 수기 확인'),
  manual('msw-handler removal fails the test (data path really exercised)', '수기 확인'),
  manual('console act() warnings = 0', '러너 stderr 수기 확인'),
];

// `npm test` exit-code signal — thin, low bug-risk; exit-code branch proven by selftest.
async function scoreTestRuns(cwd, label) {
  const r = await run('npm', ['test', '--silent'], { cwd, timeoutMs: 240000 });
  const timedOut = r.code === -2;
  return sig(`${label}: 새 테스트 실행 통과 (npm test exit 0)`,
    r.code === 0, timedOut ? 'TIMEOUT' : (r.code === 0 ? '' : `exit ${r.code}`));
}

// 비파괴 invariant (agentloop SC2와 동일): the agent must test the fixture AS GIVEN.
// Baseline is the pristine cacheDir, NOT TEMPLATES[].files — npm rewrites package.json.
async function fileHash(p) {
  try { return createHash('sha256').update(await readFile(p)).digest('hex'); }
  catch { return 'ABSENT'; }
}
async function scoreFixtureIntact(cacheDir, dir, tpl, label) {
  const diverged = [];
  for (const rel of Object.keys(tpl.files)) {
    if (await fileHash(join(cacheDir, rel)) !== await fileHash(join(dir, rel))) diverged.push(rel);
  }
  return sig(`${label}: fixture 비파괴 (템플릿 해시 불변)`, diverged.length === 0,
    diverged.length ? `변경됨: ${diverged.join(', ')} — 실행 통과 신호는 무효` : '');
}

// ── FIXTURE TEMPLATES ──────────────────────────────────────────────────────────
// Two web-React + Vitest projects. Built ONCE into CACHE (npm install), then cp-r'd
// per run so the runner-absent / coverage-absent AskUserQuestion branches never fire.
const TEMPLATES = {
  'unittest-web': {
    skill: 'harness-unittest',
    target: 'src/pricing.ts',
    files: {
      'package.json': JSON.stringify({
        name: 'skilltest-unittest-web', version: '0.0.0', private: true, type: 'module',
        scripts: { test: 'vitest run', 'test:coverage': 'vitest run --coverage' },
        devDependencies: { vitest: '^2.1.0', '@vitest/coverage-v8': '^2.1.0' },
      }, null, 2),
      // Pure domain logic with branches — the highest-value unittest target.
      'src/pricing.ts':
`export type Code = 'SAVE10' | 'HALF' | 'EXPIRED';
const RATES: Record<Code, number> = { SAVE10: 0.1, HALF: 0.5, EXPIRED: 0 };

/** Apply a discount code to a price. Throws on unknown code or negative price. */
export function applyDiscount(price: number, code: Code): number {
  if (price < 0) throw new Error('price must be >= 0');
  if (!(code in RATES)) throw new Error('unknown code');
  return Math.round(price * (1 - RATES[code]) * 100) / 100;
}
`,
      // Seed test so the fresh fixture's own `npm test` is green (proves fixture validity).
      'src/seed.test.ts':
`import { describe, it, expect } from 'vitest';
describe('fixture seed', () => { it('runner works', () => { expect(1 + 1).toBe(2); }); });
`,
    },
  },
  'comptest-web': {
    skill: 'harness-comptest',
    target: 'src/LoginForm.tsx',
    files: {
      'package.json': JSON.stringify({
        name: 'skilltest-comptest-web', version: '0.0.0', private: true, type: 'module',
        scripts: { test: 'vitest run', 'test:coverage': 'vitest run --coverage' },
        dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1' },
        devDependencies: {
          vitest: '^2.1.0', '@vitest/coverage-v8': '^2.1.0', jsdom: '^25.0.0',
          '@testing-library/react': '^16.0.1', '@testing-library/user-event': '^14.5.2',
          '@testing-library/jest-dom': '^6.5.0',
          '@vitejs/plugin-react': '^4.3.2', typescript: '^5.6.0',
          '@types/react': '^18.3.11', '@types/react-dom': '^18.3.1',
        },
      }, null, 2),
      'vitest.config.ts':
`import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./vitest.setup.ts'] },
});
`,
      'vitest.setup.ts': `import '@testing-library/jest-dom/vitest';\n`,
      'tsconfig.json': JSON.stringify({
        compilerOptions: { target: 'ES2020', module: 'ESNext', moduleResolution: 'Bundler',
          jsx: 'react-jsx', strict: true, esModuleInterop: true, skipLibCheck: true },
      }, null, 2),
      // A controlled form: empty-submit → inline error; valid submit → onSubmit called.
      'src/LoginForm.tsx':
`import { useState } from 'react';

export function LoginForm({ onSubmit }: { onSubmit: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!email) { setError('이메일을 입력하세요'); return; }
        setError('');
        onSubmit(email);
      }}
    >
      <label htmlFor="email">이메일</label>
      <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit">로그인</button>
    </form>
  );
}
`,
      'src/seed.test.tsx':
`import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginForm } from './LoginForm';
describe('fixture seed', () => {
  it('renders the submit button', () => {
    render(<LoginForm onSubmit={() => {}} />);
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
  });
});
`,
    },
  },
};

async function writeTemplateSources(dir, tpl) {
  for (const [rel, content] of Object.entries(tpl.files)) {
    const p = join(dir, rel);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, content);
  }
}

// Fingerprint of the DECLARED template — an edited fixture source/dep/config rebuilds.
// Stamped OUTSIDE cacheDir — freshFixture cp-r's cacheDir into the agent's project.
const tplFingerprint = (tpl) => createHash('sha256').update(JSON.stringify(tpl.files)).digest('hex');
const stampPath = (name) => join(CACHE, `${name}.stamp`);

// Build (once) a fully npm-install'd template into CACHE/<name>. Idempotent.
async function ensureTemplate(name) {
  const tpl = TEMPLATES[name];
  const cacheDir = join(CACHE, name);
  const fingerprint = tplFingerprint(tpl);
  const stamp = stampPath(name);
  const cached = existsSync(join(cacheDir, 'node_modules')) && existsSync(stamp)
    && (await readFile(stamp, 'utf8')).trim() === fingerprint;
  if (cached) return cacheDir;
  console.error(`  building template ${name} (npm install — one time)…`);
  await rm(cacheDir, { recursive: true, force: true });
  await rm(stamp, { force: true });
  await mkdir(cacheDir, { recursive: true });
  await writeTemplateSources(cacheDir, tpl);
  const r = await run('npm', ['install', '--no-audit', '--no-fund'], { cwd: cacheDir, timeoutMs: 300000 });
  if (r.code !== 0) throw new Error(`npm install failed for ${name}: ${r.stderr.slice(-400)}`);
  // Prove the fixture itself is valid before we ever hand it to an agent.
  const seed = await run('npm', ['test', '--silent'], { cwd: cacheDir, timeoutMs: 120000 });
  if (seed.code !== 0) throw new Error(`seed test failed for ${name}: ${seed.stdout.slice(-400)}`);
  await writeFile(stamp, fingerprint);
  console.error(`  ✓ template ${name} ready (seed test green)`);
  return cacheDir;
}

// Fresh throwaway fixture for a run: cp-r the cached template (with node_modules).
// Returns the pristine cacheDir too — it is the baseline for the 비파괴 hash check.
async function freshFixture(name, destRoot) {
  const cacheDir = await ensureTemplate(name);
  const dir = join(destRoot, name);
  await cp(cacheDir, dir, { recursive: true });
  return { dir, cacheDir };
}

// ── the invocation prompt handed to the spawned agent ──────────────────────────
function skillPrompt(tpl) {
  // Explicit `file <path>` scope — avoids the default `session` branch (git diff on a
  // fresh fixture is empty → AskUserQuestion hang in headless).
  return `${NS}:${tpl.skill} file ${tpl.target}\n\n`
    + `비대화형 세션이다. 러너/라이브러리는 이미 설치되어 있으니 설치를 묻지 말고 진행하라. `
    + `대상 파일 하나(${tpl.target})에 대해 계약대로 테스트를 작성하고 실제로 실행해 통과를 확인하라. 커밋하지 마라.`;
}

// ── PHASE: selftest (NO auth, NO agent) — proves the greppable + exit-code scorers ──
async function selftest() {
  console.log(`# skilltest selftest — ${TS}\n(auth·agent 불필요 — 스코어러 자체 검증)\n`);
  const results = [];
  const assert = (name, cond) => { results.push({ name, ok: cond }); };

  // — greppable unittest scorer: GOOD vs BAD —
  const goodUnit =
`import { describe, it, expect } from 'vitest';
import { applyDiscount } from './pricing';
it('SAVE10이면 10% 할인가를 반환한다', () => {
  // Given
  const price = 100;
  // When
  const out = applyDiscount(price, 'SAVE10');
  // Then
  expect(out).toBe(90);
});`;
  const badUnit =
`import { it, expect } from 'vitest';
import { render } from './x';
it('snapshot', () => { expect(render()).toMatchSnapshot(); });`;
  const gu = scoreUnittestSrc(goodUnit);
  const bu = scoreUnittestSrc(badUnit);
  assert('unittest GOOD → all greppable PASS', gu.every((s) => s.status === 'PASS'));
  assert('unittest BAD → GWT FAIL', bu.find((s) => /GWT/.test(s.label))?.status === 'FAIL');
  assert('unittest BAD → snapshot FAIL', bu.find((s) => /snapshot/.test(s.label))?.status === 'FAIL');

  // — GWT: the marker check must not fire on prose/promise chains, and must accept
  //   the blank-line separation both contracts allow (주석 **또는 빈 줄**) —
  const gwtOf = (src) => scoreGWT(src).status;
  assert('GWT: `.then(` + "when given" 제목만으로는 PASS 아님', gwtOf(
`import { it, expect } from 'vitest';
it('사용자가 when given 로그인하면 토큰을 받는다', async () => {
  const out = await login().then((r) => r.token);
  expect(out).toBe('t');
});`) === 'FAIL');
  assert('GWT: 빈 줄 3구획 (주석 없음) → PASS', gwtOf(
`import { it, expect } from 'vitest';
it('SAVE10이면 10% 할인가를 반환한다', () => {
  const price = 100;

  const out = applyDiscount(price, 'SAVE10');

  expect(out).toBe(90);
});`) === 'PASS');
  assert('GWT: 제목에 중괄호가 있어도 본문을 찾는다 → PASS', gwtOf(
`import { it, expect } from 'vitest';
it('빈 목록이면 {} 를 반환한다', () => {
  const input = [];

  const out = group(input);

  expect(out).toEqual({});
});`) === 'PASS');
  assert('GWT: 테스트 *사이* 빈 줄은 구획이 아님 → FAIL', gwtOf(
`import { it, expect } from 'vitest';
it('a', () => { expect(1).toBe(1); });

it('b', () => { expect(2).toBe(2); });`) === 'FAIL');

  // — 모든 테스트가 3구획을 지켜야 한다: 한 테스트의 마커가 다른 테스트를 대신 통과시키면 안 된다 —
  assert('GWT: 3개 중 1개만 구조화 → FAIL', gwtOf(
`import { it, expect } from 'vitest';
it('구조화된 테스트', () => {
  // Given
  const a = 1;
  // When
  const out = f(a);
  // Then
  expect(out).toBe(2);
});
it('b', () => { expect(2).toBe(2); });
it('c', () => { expect(3).toBe(3); });`) === 'FAIL');
  assert('GWT: 마커가 테스트 3개에 흩어져 있으면 FAIL', gwtOf(
`import { it, expect } from 'vitest';
it('t1', () => {
  // Given
  const a = 1;
});
it('t2', () => {
  // When
  const b = 2;
});
it('t3', () => {
  // Then
  expect(1).toBe(1);
});`) === 'FAIL');
  assert('GWT: 테스트 2개 모두 구조화 → PASS', gwtOf(
`import { it, expect } from 'vitest';
it('a', () => {
  // Given
  const a = 1;
  // When
  const out = f(a);
  // Then
  expect(out).toBe(2);
});
it('b', () => {
  const b = 2;

  const out = f(b);

  expect(out).toBe(3);
});`) === 'PASS');

  // — parser: 본문 추출이 틀리면 위 판정이 전부 거짓이 된다 —
  assert('parser: it.each 데이터 테이블이 아니라 콜백 본문을 읽는다 → PASS', gwtOf(
`import { it, expect } from 'vitest';
it.each([{ a: 1 }, { a: 2 }])('case %s', ({ a }) => {
  const x = a;

  const out = double(x);

  expect(out).toBe(a * 2);
});`) === 'PASS');
  assert('parser: 옵션 객체를 본문으로 오인하지 않는다 → PASS', gwtOf(
`import { it, expect } from 'vitest';
it('느린 테스트', { timeout: 10000 }, () => {
  const a = 1;

  const out = f(a);

  expect(out).toBe(2);
});`) === 'PASS');
  assert('parser: 정규식 리터럴의 중괄호가 본문을 깨지 않는다 → PASS', gwtOf(
`import { it, expect } from 'vitest';
it('중괄호 패턴을 찾는다', () => {
  const re = /[{]/;

  const out = re.test('{');

  expect(out).toBe(true);
});`) === 'PASS');
  assert('parser: function 콜백도 본문을 찾는다 → PASS', gwtOf(
`import { it, expect } from 'vitest';
it('function 스타일', function () {
  const a = 1;

  const out = f(a);

  expect(out).toBe(2);
});`) === 'PASS');
  assert('parser: 나눗셈을 정규식으로 오인하지 않는다 → PASS', gwtOf(
`import { it, expect } from 'vitest';
it('평균을 구한다', () => {
  const total = 10;

  const out = total / 2 + (4) / 2;

  expect(out).toBe(7);
});`) === 'PASS');
  assert('parser: 본문을 못 읽으면 PASS도 FAIL도 아닌 MANUAL', gwtOf(
`import { it, expect } from 'vitest';
it('깨진 소스', () => {
  const s = 'unterminated;
});`) === 'MANUAL');
  assert('parser: `.test(`/`.it(` 메서드 호출은 테스트 선언이 아니다 → PASS', gwtOf(
`import { it, expect } from 'vitest';
it('패턴에 맞으면 통과한다', () => {
  const re = /^a/;

  const out = re.test('abc');

  expect(out).toBe(true);
});`) === 'PASS');
  assert('parser: JSX 자기닫힘 태그가 본문을 깨지 않는다 → PASS', gwtOf(
`import { it, expect } from 'vitest';
it('렌더한다', () => {
  render(<LoginForm onSubmit={() => {}} />);

  const el = screen.getByRole('button');

  expect(el).toBeInTheDocument();
});`) === 'PASS');
  assert('parser: JSX 닫는 태그가 본문을 깨지 않는다 → PASS', gwtOf(
`import { it, expect } from 'vitest';
it('자식을 렌더한다', () => {
  render(<div><p>hello</p></div>);

  const el = screen.getByText('hello');

  expect(el).toBeInTheDocument();
});`) === 'PASS');
  assert('GWT: it()/test() 선언이 없으면 FAIL', gwtOf(`export const x = 1;`) === 'FAIL');

  // — greppable comptest scorer: GOOD vs BAD —
  const goodComp =
`import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';
it('빈 이메일로 제출하면 인라인 에러를 보여준다', async () => {
  // Given
  render(<LoginForm onSubmit={() => {}} />);
  // When
  await userEvent.click(screen.getByRole('button', { name: '로그인' }));
  // Then
  expect(screen.getByRole('alert')).toHaveTextContent('이메일을 입력하세요');
});`;
  const badComp =
`import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
it('x', () => {
  const { container } = render(<div/>);
  fireEvent.click(screen.getByTestId('btn'));
  expect(container).toMatchSnapshot();
});`;
  const gc = scoreComptestSrc(goodComp);
  const bc = scoreComptestSrc(badComp);
  assert('comptest GOOD → all greppable PASS', gc.every((s) => s.status === 'PASS'));
  assert('comptest BAD → 사용자 관점 쿼리 FAIL', bc.find((s) => /사용자 관점 쿼리/.test(s.label))?.status === 'FAIL');
  assert('comptest BAD → user-event FAIL (fireEvent used)', bc.find((s) => /user-event/.test(s.label))?.status === 'FAIL');
  assert('comptest BAD → testId FAIL', bc.find((s) => /getByTestId/.test(s.label))?.status === 'FAIL');
  assert('comptest BAD → snapshot FAIL', bc.find((s) => /snapshot/.test(s.label))?.status === 'FAIL');

  // — query accept-set must equal the contract's priority list, not a subset —
  const queryOf = (src) => scoreComptestSrc(src).find((s) => /사용자 관점 쿼리/.test(s.label))?.status;
  const testIdOf = (src) => scoreComptestSrc(src).find((s) => /getByTestId/.test(s.label))?.status;
  assert('query: getAllByRole → PASS', queryOf(`screen.getAllByRole('listitem')`) === 'PASS');
  assert('query: findAllByRole → PASS', queryOf(`await screen.findAllByRole('alert')`) === 'PASS');
  assert('query: getByText (RN 기본) → PASS', queryOf(`screen.getByText('로그인')`) === 'PASS');
  assert('query: getByPlaceholderText → PASS', queryOf(`screen.getByPlaceholderText('이메일')`) === 'PASS');
  assert('query: getByTestId 단독 → FAIL', queryOf(`screen.getByTestId('btn')`) === 'FAIL');
  assert('testId: role 쿼리와 병용(최후수단) → PASS',
    testIdOf(`screen.getByRole('button'); screen.getByTestId('chart')`) === 'PASS');
  assert('testId: 단독 사용 → FAIL', testIdOf(`screen.getByTestId('btn')`) === 'FAIL');

  const tmp = join(tmpdir(), `skilltest-selftest-${TS}`);

  // — timeout must KILL the child, not abandon it (else `rm` races a live agent) —
  const t0 = Date.now();
  const killed = await run(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { timeoutMs: 500 });
  assert('run(): timeoutMs → code -2 and the child is actually killed',
    killed.code === -2 && Date.now() - t0 < 20000);

  // — fixture 비파괴 hash: agent edits to production source must FAIL the run —
  const fxTpl = { files: { 'src/pricing.ts': 'export const x = 1;\n', 'package.json': '{}\n' } };
  const fxCache = join(tmp, 'fx-cache'), fxIntact = join(tmp, 'fx-intact'), fxDirty = join(tmp, 'fx-dirty');
  await writeTemplateSources(fxCache, fxTpl);
  await cp(fxCache, fxIntact, { recursive: true });
  await cp(fxCache, fxDirty, { recursive: true });
  await writeFile(join(fxDirty, 'src/pricing.ts'), 'export const x = 2;\n');
  assert('fixture 비파괴: 원본 그대로 → PASS',
    (await scoreFixtureIntact(fxCache, fxIntact, fxTpl, 'fx')).status === 'PASS');
  assert('fixture 비파괴: production source 수정 → FAIL',
    (await scoreFixtureIntact(fxCache, fxDirty, fxTpl, 'fx')).status === 'FAIL');

  // — template fingerprint must move when the declared fixture moves —
  assert('template fingerprint: files 변경 시 달라짐',
    tplFingerprint(fxTpl) !== tplFingerprint({ files: { ...fxTpl.files, 'src/pricing.ts': 'export const x = 3;\n' } }));

  // — exit-code branch of scoreTestRuns (no vitest needed: fake test scripts) —
  const passDir = join(tmp, 'pass'), failDir = join(tmp, 'fail');
  await mkdir(passDir, { recursive: true }); await mkdir(failDir, { recursive: true });
  await writeFile(join(passDir, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "process.exit(0)"' } }));
  await writeFile(join(failDir, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "process.exit(1)"' } }));
  const passSig = await scoreTestRuns(passDir, 'pass-fixture');
  const failSig = await scoreTestRuns(failDir, 'fail-fixture');
  assert('scoreTestRuns: exit 0 → PASS', passSig.status === 'PASS');
  assert('scoreTestRuns: exit 1 → FAIL', failSig.status === 'FAIL');
  await rm(tmp, { recursive: true, force: true });

  // — report —
  for (const r of results) console.log(`  ${r.ok ? '✅' : '❌'} ${r.name}`);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${failed.length ? '✗' : '✓'} ${results.length - failed.length}/${results.length} scorer assertions pass`);
  if (failed.length) process.exit(1);
}

// ── PHASE: warm (NO auth) — pre-build both templates ───────────────────────────
async function warm() {
  if (!existsSync(PG)) { console.error('ℹ playground 부재 — dev 전용 도구.'); return; }
  console.log(`# skilltest warm — building fixture templates\n`);
  for (const name of Object.keys(TEMPLATES)) await ensureTemplate(name);
  console.log('\n✓ templates ready under', relative(ROOT, CACHE));
}

// ── PHASE: probe (auth contract) ───────────────────────────────────────────────
async function probe() {
  if (!existsSync(PG)) { console.error('ℹ playground 부재 — dev 전용 도구.'); return; }
  const token = await loadTokenOptional();
  const tmp = join(PG, '.sim-tmp', `probe-${TS}`);
  await mkdir(tmp, { recursive: true });
  await writeFile(join(tmp, 'package.json'), JSON.stringify({ name: 'probe', version: '0.0.0' }));
  console.log('— probe: auth + slash resolution —');
  const a = await runHeadless(token, tmp, `${NS}:harness-unittest\n\n스택만 감지해 한 줄로 요약하고 멈춰라. 테스트를 쓰지 마라.`, { timeoutMs: 180000 });
  console.log(renderSignals('probe', [
    sig('agent run completed (no auth/parse error)', a.ok && !a.authFailed, a.authFailed ? 'AUTH FAILED — token 재발급' : (a.parseErr || '')),
    sig('namespaced slash resolved (not "unknown command")', !a.unknownCommand),
  ]));
  await rm(tmp, { recursive: true, force: true });
  if (a.authFailed) { console.error('\n✗ AUTH FAILED — 인증된 터미널에서 실행하거나 토큰을 만드세요.'); process.exit(1); }
}

// ── PHASE: run (full) ──────────────────────────────────────────────────────────
async function runFull() {
  if (!existsSync(PG)) { console.error('ℹ playground 부재 — dev 전용 도구.'); return; }
  const token = await loadTokenOptional();
  const sandbox = join(PG, '.sim-tmp', `skilltest-${TS}`);
  await mkdir(sandbox, { recursive: true });

  const sections = [];
  const allSignals = [];   // tally source — never re-parse the report (it embeds agent prose)
  let authDead = false;

  for (const [name, tpl] of Object.entries(TEMPLATES)) {
    console.error(`\n— ${tpl.skill} (${name}) —`);
    const { dir, cacheDir } = await freshFixture(name, sandbox);
    const a = await runHeadless(token, dir, skillPrompt(tpl));
    if (a.authFailed) { authDead = true; }

    const signals = [
      sig(`${tpl.skill}: agent run completed`, a.ok && !a.authFailed, a.authFailed ? 'AUTH FAILED' : (a.parseErr || `exit ${a.code}`)),
    ];
    // Score written side-effects (findTestFiles already skips the shipped seed test).
    const written = await findTestFiles(dir);
    signals.push(sig(`${tpl.skill}: 새 테스트 파일 생성됨`, written.length > 0,
      written.length ? written.map((p) => relative(dir, p)).join(', ') : '없음'));

    // Score per file — a concatenated source lets file A's markers satisfy file B.
    const evidence = [];
    for (const p of written) {
      const rel = relative(dir, p);
      const src = await readFile(p, 'utf8');
      const grep = tpl.skill === 'harness-unittest' ? scoreUnittestSrc(src) : scoreComptestSrc(src);
      signals.push(...grep.map((s) => ({ ...s, label: `${rel} — ${s.label}` })));
      evidence.push(`// ${rel}\n${src.slice(0, 4000)}`);
    }
    signals.push(await scoreFixtureIntact(cacheDir, dir, tpl, tpl.skill));
    if (written.length) signals.push(await scoreTestRuns(dir, tpl.skill));
    signals.push(...(tpl.skill === 'harness-unittest' ? unittestManual() : comptestManual()));
    // Routing is judgment → MANUAL (surface the agent's own prose for manual read).
    signals.push(manual(`${tpl.skill}: unittest↔comptest 라우팅 판단`, 'transcript 수기 확인'));

    allSignals.push(...signals);
    sections.push(renderSignals(`${tpl.skill} — ${name}`, signals));
    sections.push(`\n<details><summary>agent 요약 (${tpl.skill})</summary>\n\n\`\`\`\n${(a.result || '').slice(0, 1500)}\n\`\`\`\n</details>\n`);
    if (evidence.length) {
      sections.push(`<details><summary>작성된 테스트 원문 (${tpl.skill})</summary>\n\n\`\`\`tsx\n${evidence.join('\n\n')}\n\`\`\`\n</details>\n`);
    }
  }

  const counts = { PASS: 0, FAIL: 0, MANUAL: 0 };
  for (const s of allSignals) counts[s.status]++;
  // Retain the sandbox on FAIL — Phase 3 격리 검증 re-runs against the agent's output.
  const keepSandbox = counts.FAIL > 0 && !authDead;

  const report = [
    `# skilltest — /harness-unittest · /harness-comptest 검증`,
    ``,
    `- 일시: ${TS}`,
    `- 대상: agent-workflow 스킬 2종 (실 \`claude -p\` 세션 side-effect 채점)`,
    `- fixtures: web React + Vitest (스킬당 1개; RN·라우팅 cross-check는 defer/MANUAL)`,
    `- 신호 집계: PASS ${counts.PASS} · FAIL ${counts.FAIL} · MANUAL ${counts.MANUAL}`,
    authDead ? `- ⚠️ AUTH FAILED — 실행 신호는 무효. 인증된 터미널에서 재실행 필요.` : null,
    keepSandbox ? `- 🔍 FAIL 있음 — 격리 검증용 증거 보존: \`${sandbox}\` (해석 후 직접 삭제)` : null,
    ``,
    `> 정직성: greppable side-effect만 PASS/FAIL. 판단(리팩토링 내성·뮤테이션·라우팅)은 ⚠️manual.`,
    ``,
    ...sections,
  ].filter((line) => line !== null).join('\n');

  const reportsDir = join(PG, 'sim-reports');
  await mkdir(reportsDir, { recursive: true });
  const reportPath = join(reportsDir, `skilltest-${TS}.md`);
  await writeFile(reportPath, report);
  if (!keepSandbox) await rm(sandbox, { recursive: true, force: true }); // templates persist in CACHE

  console.log(report);
  console.log(`\n✓ report: ${reportPath}`);
  if (authDead) process.exit(1);
}

// ── entry ──────────────────────────────────────────────────────────────────────
const cmd = process.argv[2] ?? 'selftest';
const dispatch = { selftest, warm, probe, run: runFull };
if (!dispatch[cmd]) { console.error(`unknown subcommand: ${cmd} (selftest|warm|probe|run)`); process.exit(64); }
dispatch[cmd]().catch((e) => { console.error(`✗ ${e.message}`); process.exit(1); });

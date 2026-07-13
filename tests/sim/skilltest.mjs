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
import { homedir } from 'node:os';
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
function run(cmd, args, opts = {}) {
  return new Promise((res) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => res({ code, stdout, stderr }));
    child.on('error', (err) => res({ code: -1, stdout, stderr: String(err.stack || err) }));
  });
}
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((res) => {
    timer = setTimeout(() => res({ code: -2, stdout: '', stderr: `TIMEOUT after ${ms}ms` }), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
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

  const r = await withTimeout(run('claude', args, { cwd, env }), timeoutMs);
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
async function findTestFiles(dir, { excludeSeed = true } = {}) {
  const all = await walk(dir);
  return all.filter((p) => /\.(test|spec)\.[jt]sx?$/.test(p) && (!excludeSeed || !/seed\./.test(p)));
}

// ── SCORERS (pure over file content; the bug-prone part → proven by `selftest`) ──
// Each greppable scorer takes the test file's SOURCE TEXT and returns signals.
// Judgment items (refactoring-resistance, mutation, routing) are MANUAL by design.

function scoreGWT(src) {
  // GWT/AAA markers as a greppable proxy for the 3-region structure the skill enforces.
  const gwt = /\/\/\s*given|\bgiven\b/i.test(src) && /\/\/\s*when|\bwhen\b/i.test(src) && /\/\/\s*then|\bthen\b/i.test(src);
  const aaa = /\/\/\s*arrange/i.test(src) && /\/\/\s*act/i.test(src) && /\/\/\s*assert/i.test(src);
  return sig('GWT/AAA 3-region markers present', gwt || aaa);
}
const hasExpect = (src) => /\bexpect\s*\(/.test(src);
const hasSnapshot = (src) => /toMatch(Inline)?Snapshot\s*\(/.test(src);
const hasTestId = (src) => /getByTestId|findByTestId|queryByTestId/.test(src);
const hasFireEvent = (src) => /\bfireEvent\b/.test(src);
const hasRoleQuery = (src) => /(get|find|query)By(Role|LabelText)\b/.test(src);
const hasUserEvent = (src) => /userEvent|user-event/.test(src);
const hasReactTestRenderer = (src) => /react-test-renderer/.test(src);

// unittest (Khorikov): output/state-based, GWT, no snapshot, real asserts.
function scoreUnittestSrc(src) {
  return [
    scoreGWT(src),
    sig('observable-behavior assert present (expect())', hasExpect(src)),
    sig('no snapshot test (forbidden by contract)', !hasSnapshot(src)),
    manual('refactoring-resistance: no private/internal-call asserts', '헤드리스 관찰 불가 — 리포트 수기 확인'),
    manual('mutation survival: breaks if production logic breaks', '수기 확인'),
  ];
}
// comptest (Testing Trophy): role/user-event queries, no testId-first, no fireEvent, no snapshot.
function scoreComptestSrc(src) {
  return [
    scoreGWT(src),
    sig('user-facing query present (getByRole/LabelText)', hasRoleQuery(src)),
    sig('user-event used (not fireEvent for new tests)', hasUserEvent(src) && !hasFireEvent(src)),
    sig('getByTestId not used as primary query', !hasTestId(src)),
    sig('no snapshot test (forbidden by contract)', !hasSnapshot(src)),
    sig('no react-test-renderer (RNTL/RTL render only)', !hasReactTestRenderer(src)),
    manual('markup-refactor resistance (div→section survives)', '헤드리스 관찰 불가 — 리포트 수기 확인'),
    manual('msw-handler removal fails the test (data path really exercised)', '수기 확인'),
    manual('console act() warnings = 0', '러너 stderr 수기 확인'),
  ];
}

// `npm test` exit-code signal — thin, low bug-risk; exit-code branch proven by selftest.
async function scoreTestRuns(cwd, label) {
  const r = await withTimeout(run('npm', ['test', '--silent'], { cwd }), 240000);
  const timedOut = r.code === -2;
  return sig(`${label}: 새 테스트 실행 통과 (npm test exit 0)`,
    r.code === 0, timedOut ? 'TIMEOUT' : (r.code === 0 ? '' : `exit ${r.code}`));
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

// Build (once) a fully npm-install'd template into CACHE/<name>. Idempotent.
async function ensureTemplate(name) {
  const tpl = TEMPLATES[name];
  const cacheDir = join(CACHE, name);
  if (existsSync(join(cacheDir, 'node_modules'))) return cacheDir;
  console.error(`  building template ${name} (npm install — one time)…`);
  await rm(cacheDir, { recursive: true, force: true });
  await mkdir(cacheDir, { recursive: true });
  await writeTemplateSources(cacheDir, tpl);
  const r = await withTimeout(run('npm', ['install', '--no-audit', '--no-fund'], { cwd: cacheDir }), 300000);
  if (r.code !== 0) throw new Error(`npm install failed for ${name}: ${r.stderr.slice(-400)}`);
  // Prove the fixture itself is valid before we ever hand it to an agent.
  const seed = await withTimeout(run('npm', ['test', '--silent'], { cwd: cacheDir }), 120000);
  if (seed.code !== 0) throw new Error(`seed test failed for ${name}: ${seed.stdout.slice(-400)}`);
  console.error(`  ✓ template ${name} ready (seed test green)`);
  return cacheDir;
}

// Fresh throwaway fixture for a run: cp-r the cached template (with node_modules).
async function freshFixture(name, destRoot) {
  const cacheDir = await ensureTemplate(name);
  const dest = join(destRoot, name);
  await cp(cacheDir, dest, { recursive: true });
  return dest;
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
  const gu = scoreUnittestSrc(goodUnit).filter((s) => s.status !== 'MANUAL');
  const bu = scoreUnittestSrc(badUnit).filter((s) => s.status !== 'MANUAL');
  assert('unittest GOOD → all greppable PASS', gu.every((s) => s.status === 'PASS'));
  assert('unittest BAD → GWT FAIL', bu.find((s) => /GWT/.test(s.label))?.status === 'FAIL');
  assert('unittest BAD → snapshot FAIL', bu.find((s) => /snapshot/.test(s.label))?.status === 'FAIL');

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
  const gc = scoreComptestSrc(goodComp).filter((s) => s.status !== 'MANUAL');
  const bc = scoreComptestSrc(badComp).filter((s) => s.status !== 'MANUAL');
  assert('comptest GOOD → all greppable PASS', gc.every((s) => s.status === 'PASS'));
  assert('comptest BAD → role-query FAIL', bc.find((s) => /user-facing query/.test(s.label))?.status === 'FAIL');
  assert('comptest BAD → user-event FAIL (fireEvent used)', bc.find((s) => /user-event/.test(s.label))?.status === 'FAIL');
  assert('comptest BAD → testId FAIL', bc.find((s) => /getByTestId/.test(s.label))?.status === 'FAIL');
  assert('comptest BAD → snapshot FAIL', bc.find((s) => /snapshot/.test(s.label))?.status === 'FAIL');

  // — exit-code branch of scoreTestRuns (no vitest needed: fake test scripts) —
  const tmp = join(PG, '.sim-tmp', `selftest-${TS}`);
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
  let authDead = false;

  for (const [name, tpl] of Object.entries(TEMPLATES)) {
    console.error(`\n— ${tpl.skill} (${name}) —`);
    const dir = await freshFixture(name, sandbox);
    const a = await runHeadless(token, dir, skillPrompt(tpl));
    if (a.authFailed) { authDead = true; }

    const signals = [
      sig(`${tpl.skill}: agent run completed`, a.ok && !a.authFailed, a.authFailed ? 'AUTH FAILED' : (a.parseErr || `exit ${a.code}`)),
    ];
    // Score written side-effects (skip the seed test the template shipped).
    const written = (await findTestFiles(dir)).filter((p) => !/seed\./.test(p));
    signals.push(sig(`${tpl.skill}: 새 테스트 파일 생성됨`, written.length > 0,
      written.length ? written.map((p) => relative(dir, p)).join(', ') : '없음'));

    if (written.length) {
      const src = (await Promise.all(written.map((p) => readFile(p, 'utf8')))).join('\n');
      const grep = tpl.skill === 'harness-unittest' ? scoreUnittestSrc(src) : scoreComptestSrc(src);
      signals.push(...grep);
      signals.push(await scoreTestRuns(dir, tpl.skill));
    }
    // Routing is judgment → MANUAL (surface the agent's own prose for manual read).
    signals.push(manual(`${tpl.skill}: unittest↔comptest 라우팅 판단`, 'transcript 수기 확인'));

    sections.push(renderSignals(`${tpl.skill} — ${name}`, signals));
    sections.push(`\n<details><summary>agent 요약 (${tpl.skill})</summary>\n\n\`\`\`\n${(a.result || '').slice(0, 1500)}\n\`\`\`\n</details>\n`);
  }

  const counts = { PASS: 0, FAIL: 0, MANUAL: 0 };
  for (const sec of sections) for (const m of sec.matchAll(/^- (✅|❌|⚠️)/gm)) {
    counts[m[1] === '✅' ? 'PASS' : m[1] === '❌' ? 'FAIL' : 'MANUAL']++;
  }

  const report = [
    `# skilltest — /harness-unittest · /harness-comptest 검증`,
    ``,
    `- 일시: ${TS}`,
    `- 대상: agent-workflow 스킬 2종 (실 \`claude -p\` 세션 side-effect 채점)`,
    `- fixtures: web React + Vitest (스킬당 1개; RN·라우팅 cross-check는 defer/MANUAL)`,
    `- 신호 집계: PASS ${counts.PASS} · FAIL ${counts.FAIL} · MANUAL ${counts.MANUAL}`,
    authDead ? `- ⚠️ AUTH FAILED — 실행 신호는 무효. 인증된 터미널에서 재실행 필요.` : ``,
    ``,
    `> 정직성: greppable side-effect만 PASS/FAIL. 판단(리팩토링 내성·뮤테이션·라우팅)은 ⚠️manual.`,
    ``,
    ...sections,
  ].filter(Boolean).join('\n');

  const reportsDir = join(PG, 'sim-reports');
  await mkdir(reportsDir, { recursive: true });
  const reportPath = join(reportsDir, `skilltest-${TS}.md`);
  await writeFile(reportPath, report);
  await rm(sandbox, { recursive: true, force: true }); // throwaway; templates persist in CACHE

  console.log(report);
  console.log(`\n✓ report: ${reportPath}`);
  if (authDead) process.exit(1);
}

// ── entry ──────────────────────────────────────────────────────────────────────
const cmd = process.argv[2] ?? 'selftest';
const dispatch = { selftest, warm, probe, run: runFull };
if (!dispatch[cmd]) { console.error(`unknown subcommand: ${cmd} (selftest|warm|probe|run)`); process.exit(64); }
dispatch[cmd]().catch((e) => { console.error(`✗ ${e.message}`); process.exit(1); });

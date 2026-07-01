#!/usr/bin/env node
// harness-sim agent-in-the-loop harness (L5).
//
// Measures whether the INSTALLED harness in a consumer project actually works,
// by spawning REAL `claude -p` agent sessions rooted IN that project and scoring
// observable side-effects (files / git / session transcript / hook stderr) — not
// the agent's prose. This is the "2번" layer the CLI sim (tests/e2e + /harness-sim
// L4) structurally cannot reach: per-project installed hooks / SessionStart /
// slash→CLI chain only activate for a session whose cwd IS the project.
//
// AUTH: a nested `claude -p` spawned from inside a Claude session is NOT logged in
// (credential isolation — verified empirically). This harness uses a subscription
// OAuth token (no API key, no extra billing) read from a 600 file and injected
// ONLY into the spawned child env. Create it once:
//     claude setup-token
//     umask 077; echo '<token>' > ~/.claude-sim-oauth-token
//
// Subcommands:
//     node tests/sim/agentloop.mjs probe     # verify the headless contract (run first)
//     node tests/sim/agentloop.mjs run        # full sim + dated report
//     node tests/sim/agentloop.mjs sc6        # task-lifecycle only (CLI-driven, NO auth)
//
// HONESTY: signals unobservable even via transcript stay ⚠️manual. No prose PASS.

import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm, chmod, readFile, stat, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STACKS } from '../e2e/sandbox.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Independent oracle: expected stackLabel per stack.id (literal, NOT detectStack()).
// The AGENTS.md `## 기술 스택` label is the ONLY output that varies across stacks in
// the current templates — rules/settings/permissions are stack-invariant, and the
// STACKS pkgs carry no `scripts` so every cmd* renders `(configure)` uniformly.
const EXPECTED_LABEL = { node: 'Node.js', next: 'Next.js', 'react-native': 'React Native (Expo)' };
const CANONICAL_STACK = STACKS.find((s) => s.id === 'node');
const BIN = join(ROOT, 'bin', 'harness-team.mjs');
const PG = resolve(ROOT, '..', 'harness-playground');
const TOKEN_FILE = join(homedir(), '.claude-sim-oauth-token');
const PROJECTS_DIR = join(homedir(), '.claude', 'projects');

const TS = isoStamp();
function isoStamp() {
  // YYYY-MM-DDTHHmm — local time. (new Date() is fine here; this is a CLI, not a workflow.)
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}`;
}

// ── low-level process runner (mirrors tests/e2e/sandbox.mjs) ──────────────────
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

// ── auth (dual-mode) ──────────────────────────────────────────────────────────
// Token is OPTIONAL:
//   • USER-RUN  (you, in your authenticated terminal): no token needed — the
//     spawned `claude -p` inherits your interactive login (keychain).
//   • TOKEN-RUN (the agent, from inside a session): keychain is unreachable, so a
//     subscription OAuth token file is required and injected into the child env.
async function loadTokenOptional() {
  if (!existsSync(TOKEN_FILE)) {
    console.error(`ℹ no token file (${TOKEN_FILE}) — relying on ambient login.`);
    console.error('  Works when YOU run this in an authenticated terminal.');
    console.error('  For agent auto-run, create one: `claude setup-token` →');
    console.error(`  \`umask 077; echo '<token>' > ${TOKEN_FILE}\`\n`);
    return null;
  }
  const tok = (await readFile(TOKEN_FILE, 'utf8')).trim();
  if (!tok) { console.error(`✗ ${TOKEN_FILE} is empty — treating as no token.`); return null; }
  console.error(`✓ using OAuth token from ${TOKEN_FILE}\n`);
  return tok;
}

// ── headless agent call ───────────────────────────────────────────────────────
// Spawns a real `claude -p` rooted at `cwd`. Returns parsed envelope + raw streams.
// The OAuth token is injected ONLY here, into the child env.
async function runHeadless(token, cwd, prompt, { debugHooks = false, timeoutMs = 600000 } = {}) {
  // Headless agents run permission-gated by default → they can't execute the
  // `node`/`git` the harness CLI needs. Grant a SCOPED allowlist (not a blanket
  // skip): only the commands the harness exercises, plus file tools. Sandboxes
  // are throwaway + git-isolated. Override via SIM_ALLOWED_TOOLS if needed.
  const allowed = process.env.SIM_ALLOWED_TOOLS
    || 'Bash(node:*),Bash(git:*),Bash(harness-team:*),Read,Write,Edit,Glob,Grep';
  const args = ['-p', prompt, '--output-format', 'json', '--allowedTools', allowed];
  if (debugHooks) args.push('--debug', 'hooks');
  const env = { ...process.env };
  if (token) env.CLAUDE_CODE_OAUTH_TOKEN = token; // token-run; else ambient login (user-run)
  // Avoid recursion-flavored inheritance that confuses a nested session.
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
    authFailed,
    unknownCommand,
    result,
    sessionId: json?.session_id ?? null,
    usage: json?.usage ?? null,
    costUsd: json?.total_cost_usd ?? null,
    isError: json?.is_error ?? null,
    parseErr,
    stderr: r.stderr,
    code: r.code,
    raw: r.stdout,
  };
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((res) => setTimeout(() => res({ code: -2, stdout: '', stderr: `TIMEOUT after ${ms}ms` }), ms)),
  ]);
}

// ── session transcript lookup (sessionId is globally unique → glob by id) ──────
async function findTranscript(sessionId) {
  if (!sessionId || !existsSync(PROJECTS_DIR)) return null;
  const projDirs = await readdir(PROJECTS_DIR).catch(() => []);
  for (const d of projDirs) {
    const candidate = join(PROJECTS_DIR, d, `${sessionId}.jsonl`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}
async function transcriptContains(sessionId, needle) {
  const path = await findTranscript(sessionId);
  if (!path) return { found: false, transcript: null, reason: 'transcript not found' };
  const body = await readFile(path, 'utf8').catch(() => '');
  return { found: body.includes(needle), transcript: path };
}

// ── throwaway sandbox under playground/.sim-tmp/<TS>/<name> ────────────────────
async function makeSandbox(name, { seed = false, pkg = null } = {}) {
  const dir = join(PG, '.sim-tmp', TS, name);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  // PATH shim so an installed post-commit hook (`harness-team handoff`) resolves.
  const binDir = join(dir, '.bin');
  await mkdir(binDir, { recursive: true });
  const shim = join(binDir, 'harness-team');
  await writeFile(shim, `#!/bin/sh\nexec node ${JSON.stringify(BIN)} "$@"\n`);
  await chmod(shim, 0o755);

  if (seed) {
    // apply() target: a pre-existing project whose files must survive untouched.
    await writeFile(join(dir, 'README.md'), '# user project\npre-existing content\n');
    await mkdir(join(dir, 'src'), { recursive: true });
    await writeFile(join(dir, 'src', 'index.js'), 'export const x = 1;\n');
  }
  // Stack signature drives detect-stack → AGENTS.md stack section. Default keeps the
  // legacy generic/node shape so callers that omit `pkg` behave unchanged.
  await writeFile(join(dir, 'package.json'), JSON.stringify(pkg ?? { name, version: '0.0.0' }, null, 2));
  const env = { ...process.env, PATH: `${binDir}:${process.env.PATH}` };
  await run('git', ['init', '-q'], { cwd: dir, env });
  await run('git', ['config', 'user.email', 'sim@harness.io'], { cwd: dir, env });
  await run('git', ['config', 'user.name', 'simbot'], { cwd: dir, env });
  await run('git', ['config', 'commit.gpgsign', 'false'], { cwd: dir, env });
  return { dir, env };
}

async function sha(path) {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

// ── PROBE: verify the headless contract before trusting the full run ──────────
async function probe() {
  const token = await loadTokenOptional();
  console.log(`# agentloop probe — ${TS}\n`);
  const sb = await makeSandbox('probe');
  console.log(`sandbox: ${sb.dir}\n`);

  console.log('— [1] trivial headless call (auth + envelope shape) —');
  const t = await runHeadless(token, sb.dir, 'Reply with exactly: SMOKE_OK', { debugHooks: true });
  console.log(`  ok=${t.ok} code=${t.code} parseErr=${t.parseErr ?? 'none'} authFailed=${t.authFailed}`);
  console.log(`  session_id=${t.sessionId}`);
  console.log(`  usage.output_tokens=${t.usage?.output_tokens}  cost=${t.costUsd}`);
  console.log(`  result="${t.result.slice(0, 120)}"`);
  if (t.authFailed) {
    console.log('\n  ✗ AUTH FAILED — token invalid/expired. Regenerate: `claude setup-token`');
    console.log('    (or run this in your own authenticated terminal without a token file).');
    console.log('    SessionStart/slash signals below are unreliable until auth works.\n');
  }

  console.log('\n— [2] SessionStart injection (transcript scan) —');
  console.log('  note: probe sandbox is an EMPTY dir (no harness installed) → no project');
  console.log('  SessionStart hook expected here. SC4 will re-test in an init\'d project.');
  const ss = await transcriptContains(t.sessionId, '활성 task가 없습니다');
  console.log(`  transcript=${ss.transcript ?? 'NOT FOUND'}`);
  console.log(`  nudge present=${ss.found} (locatability is the signal here, not presence)`);

  console.log('\n— [3] slash resolution: namespaced vs bare vs natural-language —');
  const dNs = await runHeadless(token, sb.dir, '/harness-aijient-team:harness-doctor');
  console.log(`  [namespaced] "/harness-aijient-team:harness-doctor"`);
  console.log(`     unknownCommand=${dNs.unknownCommand} authFailed=${dNs.authFailed}`);
  console.log(`     result="${dNs.result.slice(0, 160)}"`);
  const dBare = await runHeadless(token, sb.dir, '/harness-doctor');
  console.log(`  [bare] "/harness-doctor" → unknownCommand=${dBare.unknownCommand}`);
  const dNl = await runHeadless(token, sb.dir, 'Run a harness doctor integrity check on this project.');
  console.log(`  [natural-lang] → authFailed=${dNl.authFailed} result="${dNl.result.slice(0, 120)}"`);

  console.log('\n— observations to harden run() —');
  console.log(`  • auth working: ${t.authFailed ? 'NO ✗ (fix first)' : 'yes'}`);
  console.log(`  • headless json parseable: ${t.parseErr ? 'NO ⚠️' : 'yes'}`);
  console.log(`  • transcript locatable by session_id: ${ss.transcript ? 'yes' : 'NO ⚠️'}`);
  console.log(`  • slash form that resolves: ${!dNs.unknownCommand ? 'namespaced ✓' : (!dBare.unknownCommand ? 'bare ✓' : 'NEITHER — use natural-language ⚠️')}`);

  await rm(join(PG, '.sim-tmp', TS), { recursive: true, force: true });
  console.log('\nprobe cleanup done. Paste this output back to finalize run() parsing.');
}

// ── signal scoring ────────────────────────────────────────────────────────────
// A signal = { label, status: 'PASS'|'FAIL'|'MANUAL', note }. Prose is never a signal.
function sanitizeNote(s) {
  // Agent prose must never break the report markdown. Single line, bounded.
  return String(s).replace(/\s+/g, ' ').replace(/[#*`|]/g, '').replace(/-{2,}/g, ' ').trim().slice(0, 70);
}
function sig(label, ok, note = '') {
  return { label, status: ok ? 'PASS' : 'FAIL', note: sanitizeNote(note) };
}
function manual(label, note) { return { label, status: 'MANUAL', note: sanitizeNote(note) }; }

const NS = '/harness-aijient-team'; // verified namespaced slash prefix
const SLUG = `sim-${TS}`;

// Plugin version under test (header) — from package.json.
async function pluginVersion() {
  try { return JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8')).version; }
  catch { return 'unknown'; }
}
async function pluginSha() {
  const r = await run('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD']);
  return r.code === 0 ? r.stdout.trim() : 'unknown';
}

async function fileHas(path, needle) {
  if (!existsSync(path)) return false;
  return (await readFile(path, 'utf8')).includes(needle);
}
async function doctorGreen(dir, env) {
  const r = await run('node', [BIN, 'doctor', '--json', '--target', dir], { cwd: dir, env });
  try { const j = JSON.parse(r.stdout); return j.status === 'success' && !(j.checks || []).some((c) => c.status === 'fail'); }
  catch { return false; }
}

// ── SC1 init (per stack) ──────────────────────────────────────────────────────
async function sc1Init(token, stack) {
  const { dir, env } = await makeSandbox(`init-${stack.id}`, { pkg: stack.pkg });
  const a = await runHeadless(token, dir,
    `${NS}:harness-init — Run NON-INTERACTIVELY. This is an automated context with no human to answer prompts. Accept all defaults, pass --yes, and do NOT ask any questions.`);
  const signals = [
    sig('agent run completed (no auth/parse error)', a.ok && !a.authFailed, a.authFailed ? 'AUTH FAILED' : ''),
    sig('AGENTS.md + harness:section marker', await fileHas(join(dir, 'AGENTS.md'), 'harness:section=')),
    sig('CLAUDE.md @AGENTS.md import', await fileHas(join(dir, 'CLAUDE.md'), '@AGENTS.md')),
    sig('GEMINI.md @AGENTS.md import', await fileHas(join(dir, 'GEMINI.md'), '@AGENTS.md')),
    sig('.claude/settings.json hooks present', await fileHas(join(dir, '.claude', 'settings.json'), 'hooks')),
    sig('.claude/rules present', existsSync(join(dir, '.claude', 'rules'))),
    // stack-discriminating: the expected stackLabel must land in AGENTS.md. This is
    // the only cell that meaningfully differs across the matrix columns.
    sig(`AGENTS.md stack label = "${EXPECTED_LABEL[stack.id]}"`, await fileHas(join(dir, 'AGENTS.md'), EXPECTED_LABEL[stack.id])),
    sig('doctor green', await doctorGreen(dir, env)),
  ];
  return { dir, env, signals, session: a.sessionId };
}

// ── SC2 apply (non-destructive, per stack) ────────────────────────────────────
async function sc2Apply(token, stack) {
  const { dir, env } = await makeSandbox(`apply-${stack.id}`, { seed: true, pkg: stack.pkg });
  const readmeBefore = await sha(join(dir, 'README.md'));
  const srcBefore = await sha(join(dir, 'src', 'index.js'));
  const a = await runHeadless(token, dir, `${NS}:harness-apply`);
  const signals = [
    sig('agent run completed', a.ok && !a.authFailed, a.authFailed ? 'AUTH FAILED' : ''),
    sig('README.md preserved (hash unchanged)', existsSync(join(dir, 'README.md')) && (await sha(join(dir, 'README.md'))) === readmeBefore),
    sig('src/index.js preserved (hash unchanged)', existsSync(join(dir, 'src', 'index.js')) && (await sha(join(dir, 'src', 'index.js'))) === srcBefore),
    sig('AGENTS.md core injected', existsSync(join(dir, 'AGENTS.md'))),
    sig(`AGENTS.md stack label = "${EXPECTED_LABEL[stack.id]}"`, await fileHas(join(dir, 'AGENTS.md'), EXPECTED_LABEL[stack.id])),
    sig('doctor green', await doctorGreen(dir, env)),
  ];
  return { dir, env, signals };
}

// ── SC3 task (on an init'd project) ───────────────────────────────────────────
async function sc3Task(token, initDir, env) {
  const a = await runHeadless(token, initDir, `${NS}:harness-task ${SLUG}`);
  // member dir = git user.name (simbot, set in makeSandbox)
  const taskDir = join(initDir, 'docs', 'simbot', SLUG);
  const specPath = join(taskDir, `${SLUG}-spec.md`);
  const activePath = join(initDir, '.harness', 'active.json');
  let activeOk = false;
  try { activeOk = (await readFile(activePath, 'utf8')).includes(SLUG); } catch { /* noop */ }
  const signals = [
    sig('agent run completed', a.ok && !a.authFailed, a.authFailed ? 'AUTH FAILED' : ''),
    sig('4 SSOT files created', ['spec', 'plan', 'handoff', 'artifact'].every((k) => existsSync(join(taskDir, `${SLUG}-${k}.md`)))),
    sig('active.json points to task', activeOk),
    sig('spec has Ambiguity 자가진단', await fileHas(specPath, 'Ambiguity 자가진단')),
    sig('spec has Ontology', await fileHas(specPath, 'Ontology')),
  ];
  return { signals };
}

// ── SC4 installed-hook firing (the essential 2번) ─────────────────────────────
async function sc4Hooks(token, initDir, env) {
  // (b FIRST) post-commit handoff — requires an ACTIVE task (SC3 left one active).
  // `harness-team handoff` no-ops without an active task, so this must run BEFORE
  // we null the active task for the SessionStart test below (verified at CLI level).
  await writeFile(join(initDir, '.sim-scratch'), `sim ${TS}\n`);
  await run('git', ['add', '-A'], { cwd: initDir, env });
  const handoffGlob = join(initDir, 'docs', 'simbot');
  const before = await newestMtime(handoffGlob);
  await run('git', ['commit', '-q', '-m', 'sim: dummy'], { cwd: initDir, env });
  const after = await newestMtime(handoffGlob);

  // (a) SessionStart: now null the active task → a SECOND session should inject
  // the no-task nudge into the transcript.
  try { await writeFile(join(initDir, '.harness', 'active.json'), 'null\n'); } catch { /* noop */ }
  const s2 = await runHeadless(token, initDir, 'Say READY.');
  const ss = await transcriptContains(s2.sessionId, '활성 task가 없습니다');

  const signals = [
    sig('post-commit handoff updated (mtime advanced)', after !== null && before !== null && after > before),
    s2.authFailed
      ? manual('SessionStart nudge injected', 'AUTH FAILED — re-run with valid auth')
      : sig('SessionStart nudge injected (init\'d project, 2nd session)', ss.found, ss.transcript ? '' : 'transcript not found'),
    manual('PreToolUse protect-files block', 'not reliably observable headless — verify interactively'),
  ];
  return { signals };
}
async function newestMtime(dir) {
  if (!existsSync(dir)) return null;
  let newest = 0;
  const walk = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true }).catch(() => [])) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else { const s = await stat(p).catch(() => null); if (s) newest = Math.max(newest, s.mtimeMs); }
    }
  };
  await walk(dir);
  return newest || null;
}

// ── SC5 slash/skill trigger reliability (non-deterministic → pass-rate) ───────
async function sc5Triggers(token, initDir, trials = 2) {
  const slashRuns = [], nlRuns = [];
  for (let i = 0; i < trials; i++) {
    const d = await runHeadless(token, initDir, `${NS}:harness-doctor`);
    slashRuns.push(!d.unknownCommand && !d.authFailed);
    const n = await runHeadless(token, initDir, 'Run a harness doctor integrity check.');
    nlRuns.push(!n.authFailed && /doctor|harness|check/i.test(n.result));
  }
  const rate = (arr) => `${arr.filter(Boolean).length}/${arr.length}`;
  const signals = [
    sig(`namespaced slash resolves (pass-rate ${rate(slashRuns)})`, slashRuns.every(Boolean), slashRuns.some(Boolean) && !slashRuns.every(Boolean) ? 'FLAKY' : ''),
    sig(`natural-language trigger (pass-rate ${rate(nlRuns)})`, nlRuns.filter(Boolean).length > 0, !nlRuns.every(Boolean) ? 'FLAKY/weak trigger' : ''),
  ];
  return { signals, slashRate: rate(slashRuns), nlRate: rate(nlRuns) };
}

// ── SC6 full task lifecycle (CLI-driven, deterministic, own sandbox) ──────────
// SC3 stops at "created + 4 SSOT + active pointer". SC6 drives the REST of the
// lifecycle: plan checkbox → commit → done-guard BLOCK → done COMPLETE → active
// released → handoff DONE marker. done/done-guard/handoff are CLI machinery, so
// this is scored by direct `node BIN` calls + file/git evidence — NO agent, NO
// auth needed (hand-proven auth-independent). It runs LAST and in its OWN applied
// sandbox because it nulls active.json at the end (would pollute canon.dir which
// SC3/4/5 share). The AskUserQuestion human gate ("done 처리할까요?") is NOT
// reproducible headless → left ⚠️manual, never a false PASS.
async function sc6Lifecycle() {
  const { dir, env } = await makeSandbox('lifecycle', { pkg: CANONICAL_STACK.pkg });
  const cli = (args) => run('node', [BIN, ...args], { cwd: dir, env });
  const gitc = (args) => run('git', args, { cwd: dir, env });
  const slug = `sim-life-${TS}`;

  // setup: install the full harness via CLI (apply === init, --yes non-interactive).
  await cli(['apply', '--yes']);
  const setupGreen = await doctorGreen(dir, env);

  // create task → active pointer set.
  await cli(['task', slug]);
  const activePath = join(dir, '.harness', 'active.json');
  const readActiveRaw = async () => (await readFile(activePath, 'utf8').catch(() => ''));
  const active0 = await readActiveRaw();
  let user = 'simbot';
  try { user = JSON.parse(active0).user || user; } catch { /* keep default */ }
  const taskDir = join(dir, 'docs', user, slug);
  const planPath = join(taskDir, `${slug}-plan.md`);
  const artifactPath = join(taskDir, `${slug}-artifact.md`);
  const handoffPath = join(taskDir, `${slug}-handoff.md`);
  const activeSet = active0.includes(slug);

  // done-guard BLOCK: fresh task = open box + template artifact + 0 commits +
  // uncommitted scaffold → all four guard conditions fire at once. Verify the
  // block (exit≠0 + message), that active is PRESERVED, and — the real value —
  // that each of the four cause strings is actually detected.
  const block = await cli(['done']);
  const blocked = block.code !== 0 && block.stdout.includes('종결 가드에 걸림');
  const CAUSES = ['미완 체크박스', '템플릿 그대로', '커밋이 0개', '커밋되지 않은 변경'];
  const missingCauses = CAUSES.filter((c) => !block.stdout.includes(c));
  const activePreserved = (await readActiveRaw()).includes(slug);

  // plan checkbox progress: flip `- [ ]` → `- [x]`; planHasOpenBoxes goes open→closed.
  const planBefore = await readFile(planPath, 'utf8').catch(() => '');
  const openBefore = /^\s*- \[ \]/m.test(planBefore);
  await writeFile(planPath, planBefore.replace(/^(\s*)- \[ \]/m, '$1- [x] sim lifecycle step'));
  const openAfter = /^\s*- \[ \]/m.test(await readFile(planPath, 'utf8').catch(() => ''));
  const planProgressed = openBefore && !openAfter;

  // real artifact + commit. The post-commit hook then rewrites ONLY the two handoff
  // files (verified), which the guard excludes from "uncommitted" → clean done passes.
  await writeFile(artifactPath, `# ${slug} — Artifact\n\n## 결과\nSC6 lifecycle — real content.\n\n## Learnings\n- lifecycle verified\n`);
  await gitc(['add', '-A']);
  await gitc(['commit', '-q', '-m', 'sim(life): work']);

  // done COMPLETE: try the clean path first (no --force). It SHOULD pass because
  // the only dirty files are handoffs (guard-excluded). If it doesn't, fall back to
  // --force and record that as a finding — never twist the lifecycle to force it.
  const done = await cli(['done']);
  let usedForce = false;
  let activeAfter = await readActiveRaw();
  if (done.code !== 0 || activeAfter.includes(slug)) {
    await cli(['done', '--force']);
    activeAfter = await readActiveRaw();
    usedForce = true;
  }
  const releasedNull = activeAfter.trim() === 'null';

  // handoff DONE marker written by runDone (not the post-commit hook).
  const doneMarker = await fileHas(handoffPath, '완료');

  const signals = [
    sig('apply installs harness (doctor green)', setupGreen),
    sig('task active.json set', activeSet),
    sig('done-guard blocks (exit≠0 + 종결 가드 메시지)', blocked),
    sig('done-guard detects all 4 conditions', missingCauses.length === 0, missingCauses.length ? `missing: ${missingCauses.join(', ')}` : ''),
    sig('done-guard preserves active.json', activePreserved),
    sig('plan 체크박스 진행 (open→closed)', planProgressed),
    sig('done 완료 → active.json 해제(null)', releasedNull, usedForce ? '--force 필요' : '--force 불필요 (handoff 제외 로직)'),
    sig('handoff done(완료) 마커 기록', doneMarker),
    manual('AskUserQuestion done 휴먼 게이트', '헤드리스 재현 불가 — 머신러리만 검증'),
  ];
  return { signals, dir, usedForce };
}

// ── golden snapshot (P6b) — copy scaffold output for cross-version diff ────────
async function snapshot(version, scenario, srcDir) {
  const dest = join(PG, 'sim-snapshots', version, scenario);
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  // copy tracked harness output only (skip .git/node_modules/.bin)
  await run('rsync', ['-a', '--exclude', '.git', '--exclude', 'node_modules', '--exclude', '.bin', `${srcDir}/`, `${dest}/`]);
  return dest;
}

// ── report ────────────────────────────────────────────────────────────────────
const ICO = (s) => (s === 'PASS' ? '✅' : s === 'FAIL' ? '❌' : '⚠️');
function renderSignals(title, signals) {
  const lines = signals.map((s) => `- ${ICO(s.status)} ${s.label}${s.note ? ` — ${s.note}` : ''}`);
  return `### ${title}\n${lines.join('\n')}\n`;
}

// Matrix: rows = signal labels, columns = stacks. `perStack` is [{ stack, signals }]
// where every entry carries the same signal labels in the same order (same fn).
// The stack-discriminating label is per-stack literal, so its row shows the checked
// value; strip the value to keep the row label shared across columns.
function renderMatrix(title, perStack) {
  const cols = perStack.map((p) => p.stack.id);
  const rowLabel = (s) => s.label.replace(/ = ".*"$/, ' = <expected>');
  const rows = perStack[0].signals.map((_, i) => rowLabel(perStack[0].signals[i]));
  const header = `| signal | ${cols.join(' | ')} |`;
  const sep = `|---|${cols.map(() => '---').join('|')}|`;
  const body = rows.map((label, i) => {
    const cells = perStack.map((p) => ICO(p.signals[i].status));
    return `| ${label} | ${cells.join(' | ')} |`;
  });
  // Cells are icon-only; surface any diagnostic notes (AUTH FAILED, FLAKY, …) as
  // footnotes so the matrix keeps the prior format's honesty (a ❌ never hides its why).
  const notes = perStack.flatMap((p) => p.signals.filter((s) => s.note).map((s) => `> ${p.stack.id} · ${rowLabel(s)}: ${s.note}`));
  return `### ${title}\n${[header, sep, ...body].join('\n')}\n${notes.length ? notes.join('\n') + '\n' : ''}`;
}

async function runFull() {
  const token = await loadTokenOptional();
  const version = await pluginVersion();
  const sha = await pluginSha();
  console.log(`# agentloop run — ${TS} (v${version} @ ${sha})\n`);

  // Fail fast on dead auth: every execution signal would be a false FAIL.
  const authCheck = await runHeadless(token, PG, 'Say OK.');
  if (authCheck.authFailed) {
    console.error(`✗ AUTH FAILED — ${authCheck.result.slice(0, 100)}`);
    console.error('  Fix: regenerate `claude setup-token` → token file, OR run this in your own');
    console.error('  authenticated terminal (no token file needed). Aborting before false results.');
    process.exit(2);
  }

  // SC1/SC2 are stack-sensitive → run the full matrix (node/next/react-native).
  // SC3/SC4/SC5 are stack-invariant → run once on the CANONICAL (node) applied
  // project. apply is headless-safe and installs the full harness, so installed-hook
  // signals aren't confounded by init's interactivity.
  const sc1PerStack = [];
  const sc2PerStack = [];
  for (const stack of STACKS) {
    sc1PerStack.push({ stack, ...(await sc1Init(token, stack)) });
    sc2PerStack.push({ stack, ...(await sc2Apply(token, stack)) });
    // golden snapshots split per stack for cross-stack + cross-version diff.
    await snapshot(version, `${stack.id}-init`, sc1PerStack.at(-1).dir);
    await snapshot(version, `${stack.id}-apply`, sc2PerStack.at(-1).dir);
  }
  const canon = sc2PerStack.find((p) => p.stack.id === CANONICAL_STACK.id);
  const sc3 = await sc3Task(token, canon.dir, canon.env);
  const sc4 = await sc4Hooks(token, canon.dir, canon.env);
  const sc5 = await sc5Triggers(token, canon.dir);
  // SC6 runs LAST + in its own applied sandbox (it nulls active.json → would pollute
  // canon.dir). CLI-driven + auth-independent (hand-proven).
  const sc6 = await sc6Lifecycle();

  const sections = [
    renderMatrix('SC1 — init (stack matrix)', sc1PerStack),
    renderMatrix('SC2 — apply / non-destructive (stack matrix)', sc2PerStack),
    renderSignals(`SC3 — task 생성 (canonical: ${CANONICAL_STACK.id})`, sc3.signals),
    renderSignals(`SC4 — installed-hook firing 2번 (canonical: ${CANONICAL_STACK.id})`, sc4.signals),
    renderSignals(`SC5 — slash/skill trigger reliability (canonical: ${CANONICAL_STACK.id})`, sc5.signals),
    renderSignals(`SC6 — task 풀 라이프사이클 (CLI 결정적, 전용 샌드박스)`, sc6.signals),
  ];
  const allSig = [
    ...sc1PerStack.flatMap((p) => p.signals),
    ...sc2PerStack.flatMap((p) => p.signals),
    ...sc3.signals, ...sc4.signals, ...sc5.signals, ...sc6.signals,
  ];
  const counts = allSig.reduce((m, s) => ((m[s.status] = (m[s.status] || 0) + 1), m), {});

  const reportDir = join(PG, 'sim-reports');
  await mkdir(reportDir, { recursive: true });
  const reportPath = join(reportDir, `agentloop-${TS}.md`);
  const report = [
    `# agentloop 리포트 — ${TS}`,
    '',
    '| 항목 | 값 |',
    '|---|---|',
    `| 실행일시 | ${TS} |`,
    `| plugin 버전 | ${version} |`,
    `| plugin git SHA | ${sha} |`,
    `| 측정 레이어 | L5 agent-in-the-loop (설치된 하네스 = 2번) |`,
    `| stack 매트릭스 | ${STACKS.map((s) => s.id).join(' · ')} (SC1/SC2) · canonical=${CANONICAL_STACK.id} (SC3/4/5) · CLI 결정적 (SC6) |`,
    `| 신호 집계 | PASS ${counts.PASS || 0} · FAIL ${counts.FAIL || 0} · MANUAL ${counts.MANUAL || 0} |`,
    '',
    '> 신호는 파일/git/transcript 증거 기반. 산문 응답은 신호가 아니다. ⚠️=관찰 불가(정직).',
    '>',
    '> **검증 범위(전제 정정):** 현재 코드에서 stack별로 갈리는 산출물은 AGENTS.md `## 기술 스택`',
    '> 섹션의 stackLabel뿐이다(rules·settings·permissions는 stack 무관). 이 매트릭스는 ①init/apply',
    '> 전 과정의 stack별 완주 ②stackLabel 렌더(stack-discriminating signal) ③스냅샷 stack delta를',
    '> 검증하며, "stack별 rules·permissions"를 검증하지 **않는다**.',
    '',
    ...sections,
    '## 골든 스냅샷',
    `- stack별 \`sim-snapshots/${version}/<stack>-{init,apply}\` (${STACKS.map((s) => s.id).join('/')}) — stack 간·버전 간 \`git diff\`용.`,
    '',
    '## 정리',
    `- throwaway: \`.sim-tmp/${TS}\` 제거. 영속 playground 프로젝트는 미사용(무오염).`,
    '',
  ].join('\n');
  await writeFile(reportPath, report);

  // cleanup throwaway (snapshots + reports persist)
  await rm(join(PG, '.sim-tmp', TS), { recursive: true, force: true });

  console.log(report);
  console.log(`\n✓ report: ${reportPath}`);
}

// ── entry ─────────────────────────────────────────────────────────────────────
// Standalone SC6: CLI-driven + auth-free → a fast deterministic smoke test of the
// task lifecycle machinery, runnable without a token or any headless spawn.
async function sc6Standalone() {
  console.log(`# agentloop sc6 (lifecycle only) — ${TS}\n`);
  const { signals, usedForce } = await sc6Lifecycle();
  console.log(renderSignals('SC6 — task 풀 라이프사이클', signals));
  console.log(`(--force ${usedForce ? '사용됨' : '불필요'})`);
  await rm(join(PG, '.sim-tmp', TS), { recursive: true, force: true });
  const failed = signals.filter((s) => s.status === 'FAIL');
  if (failed.length) { console.error(`✗ ${failed.length} FAIL`); process.exit(1); }
  console.log('\n✓ SC6 all PASS/MANUAL');
}

const cmd = process.argv[2] ?? 'probe';
const dispatch = { probe, run: runFull, sc6: sc6Standalone };
if (!dispatch[cmd]) { console.error(`unknown subcommand: ${cmd} (probe|run|sc6)`); process.exit(64); }
dispatch[cmd]().catch((e) => { console.error(`✗ ${e.message}`); process.exit(1); });

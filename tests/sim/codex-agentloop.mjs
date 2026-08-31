#!/usr/bin/env node
// Codex L5 agent-in-the-loop harness.
//
// Measures whether the installed Codex plugin + bundled skills can drive the
// harness in a consumer project by spawning real `codex exec` sessions rooted in
// throwaway projects. Signals are file/git/JSONL/hook evidence, not agent prose.

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, writeFile, rm, chmod, readFile, stat, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { STACKS } from '../e2e/sandbox.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PG = resolve(ROOT, '..', 'harness-playground');
const CANONICAL_STACK = STACKS.find((s) => s.id === 'node');
const TS = isoStamp();

function isoStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}`;
}

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

export function parseCodexJsonl(stdout) {
  const events = [];
  const noise = [];
  const parseErrors = [];
  for (const [index, raw] of String(stdout).split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line) continue;
    if (!line.startsWith('{')) {
      noise.push(line);
      continue;
    }
    try {
      events.push(JSON.parse(line));
    } catch (e) {
      parseErrors.push({ line: index + 1, message: e.message, text: line.slice(0, 160) });
    }
  }

  const agentMessages = events
    .filter((e) => e.type === 'item.completed' && e.item?.type === 'agent_message')
    .map((e) => e.item.text || '');
  const commandItems = events
    .filter((e) => e.type?.startsWith('item.') && e.item?.type === 'command_execution')
    .map((e) => e.item);
  const errorEvents = events.filter((e) => e.type === 'error');
  const turnFailed = events.some((e) => e.type === 'turn.failed');
  const turnCompleted = events.some((e) => e.type === 'turn.completed');
  const threadId = events.find((e) => e.type === 'thread.started')?.thread_id ?? null;
  const usage = [...events].reverse().find((e) => e.type === 'turn.completed' && e.usage)?.usage ?? null;

  return {
    events,
    noise,
    parseErrors,
    threadId,
    turnCompleted,
    turnFailed,
    errorEvents,
    commandItems,
    finalMessage: agentMessages.at(-1) ?? '',
    usage,
  };
}

async function runCodex(cwd, env, prompt, opts = {}) {
  // Codex workspace-write protects `.git/hooks`, which is exactly what the
  // harness install must exercise. Full L5 scenarios therefore run only inside
  // throwaway `.sim-tmp` projects with danger-full-access; probe overrides this.
  const args = [
    'exec',
    '--json',
    '--ephemeral',
    '--sandbox', opts.sandbox ?? 'danger-full-access',
    '-c', 'approval_policy="never"',
    '-c', 'shell_environment_policy.inherit="all"',
  ];
  if (opts.skipGitRepoCheck) args.push('--skip-git-repo-check');
  args.push('-C', cwd, prompt);

  const r = await withTimeout(run('codex', args, { cwd, env }), opts.timeoutMs ?? 900000);
  const parsed = parseCodexJsonl(r.stdout);
  const combined = `${r.stdout}\n${r.stderr}`;
  const authFailed = /not logged in|login required|authentication|api key|401|CODEX_API_KEY/i.test(combined)
    && (r.code !== 0 || parsed.errorEvents.length > 0 || parsed.turnFailed);
  return {
    ...parsed,
    code: r.code,
    stdout: r.stdout,
    stderr: r.stderr,
    authFailed,
    ok: r.code === 0
      && parsed.turnCompleted
      && !parsed.turnFailed
      && parsed.errorEvents.length === 0
      && parsed.parseErrors.length === 0
      && !authFailed,
  };
}

async function commandExists(name) {
  const r = await run('sh', ['-lc', `command -v ${name}`]);
  return r.code === 0 && r.stdout.trim().length > 0;
}

async function pluginVersion() {
  try { return JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8')).version; }
  catch { return 'unknown'; }
}

async function pluginSha() {
  const r = await run('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD']);
  return r.code === 0 ? r.stdout.trim() : 'unknown';
}

async function copyPluginUnderTest(dest) {
  await mkdir(dest, { recursive: true });
  for (const entry of ['bin', 'src', 'templates', 'commands', 'skills', '.claude-plugin', '.codex-plugin']) {
    const from = join(ROOT, entry);
    if (existsSync(from)) await cp(from, join(dest, entry), { recursive: true });
  }
  for (const file of ['package.json', 'AGENTS.md', 'README.md']) {
    const from = join(ROOT, file);
    if (existsSync(from)) await cp(from, join(dest, file));
  }
}

async function makeSandbox(name, { seed = false, pkg = CANONICAL_STACK.pkg } = {}) {
  const dir = join(PG, '.sim-tmp', TS, name);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const pluginDir = join(dir, '.plugin-src');
  await copyPluginUnderTest(pluginDir);

  const binDir = join(dir, '.bin');
  await mkdir(binDir, { recursive: true });
  const shim = join(binDir, 'harness-team');
  await writeFile(shim, `#!/bin/sh\nexec node ${JSON.stringify(join(pluginDir, 'bin', 'harness-team.mjs'))} "$@"\n`);
  await chmod(shim, 0o755);

  if (seed) {
    await writeFile(join(dir, 'README.md'), '# user project\npre-existing content\n');
    await mkdir(join(dir, 'src'), { recursive: true });
    await writeFile(join(dir, 'src', 'index.js'), 'export const x = 1;\n');
  }
  await writeFile(join(dir, 'package.json'), JSON.stringify(pkg, null, 2));

  // Pin the Claude config home at a sandbox path: doctor's eager-tier check otherwise
  // sums the dev machine's real ~/.claude/CLAUDE.md and doctorGreen() goes red on a
  // laptop with a large one, while CI (no such file) stays green.
  const env = { ...process.env, PATH: `${binDir}:${process.env.PATH}`, CLAUDE_CONFIG_DIR: join(dir, '.claude-config-isolated') };
  await run('git', ['init', '-q'], { cwd: dir, env });
  await writeFile(join(dir, '.git', 'info', 'exclude'), '.bin\n.plugin-src\n');
  await run('git', ['config', 'user.email', 'sim@harness.io'], { cwd: dir, env });
  await run('git', ['config', 'user.name', 'simbot'], { cwd: dir, env });
  await run('git', ['config', 'commit.gpgsign', 'false'], { cwd: dir, env });
  return { dir, env, pluginDir, bin: join(pluginDir, 'bin', 'harness-team.mjs') };
}

async function sha(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function fileHas(path, needle) {
  if (!existsSync(path)) return false;
  return (await readFile(path, 'utf8')).includes(needle);
}

async function doctorGreen(sb) {
  const r = await run('node', [sb.bin, 'doctor', '--json', '--target', sb.dir], { cwd: sb.dir, env: sb.env });
  try {
    const j = JSON.parse(r.stdout);
    return j.status === 'success' && !(j.checks || []).some((c) => c.status === 'fail');
  } catch {
    return false;
  }
}

function sanitizeNote(s) {
  return String(s).replace(/\s+/g, ' ').replace(/[#*`|]/g, '').replace(/-{2,}/g, ' ').trim().slice(0, 90);
}

function sig(label, ok, note = '') {
  return { label, status: ok ? 'PASS' : 'FAIL', note: sanitizeNote(note) };
}
function manual(label, note) { return { label, status: 'MANUAL', note: sanitizeNote(note) }; }
function na(label, note) { return { label, status: 'N/A', note: sanitizeNote(note) }; }
const ico = (s) => ({ PASS: '✅', FAIL: '❌', MANUAL: '⚠️', 'N/A': '➖' }[s] ?? '•');

function hasHarnessCommand(runResult) {
  return runResult.commandItems.some((item) => /harness-team|node .*harness-team/i.test(item.command || ''));
}

async function installSignals(sb) {
  return [
    sig('AGENTS.md + harness:section marker', await fileHas(join(sb.dir, 'AGENTS.md'), 'harness:section=')),
    sig('CLAUDE.md @AGENTS.md import', await fileHas(join(sb.dir, 'CLAUDE.md'), '@AGENTS.md')),
    sig('GEMINI.md @AGENTS.md import', await fileHas(join(sb.dir, 'GEMINI.md'), '@AGENTS.md')),
    sig('.harness/config.json present', existsSync(join(sb.dir, '.harness', 'config.json'))),
    sig('.claude/settings.json hooks present', await fileHas(join(sb.dir, '.claude', 'settings.json'), 'hooks')),
    sig('.claude/rules present', existsSync(join(sb.dir, '.claude', 'rules'))),
    sig('doctor green', await doctorGreen(sb)),
  ];
}

async function newestMtime(dir) {
  if (!existsSync(dir)) return null;
  let newest = 0;
  const walk = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true }).catch(() => [])) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else {
        const s = await stat(p).catch(() => null);
        if (s) newest = Math.max(newest, s.mtimeMs);
      }
    }
  };
  await walk(dir);
  return newest || null;
}

async function preflightSignals() {
  return [
    sig('playground exists', existsSync(PG), PG),
    sig('codex CLI on PATH', await commandExists('codex')),
    sig('harness-team CLI on PATH', await commandExists('harness-team')),
    sig('.codex-plugin/plugin.json exists', existsSync(join(ROOT, '.codex-plugin', 'plugin.json'))),
    sig('harness-team skill is shipped', existsSync(join(ROOT, 'skills', 'harness-team', 'SKILL.md'))),
  ];
}

async function probe() {
  console.log(`# codex-agentloop probe — ${TS}\n`);
  const preflight = await preflightSignals();
  for (const s of preflight) console.log(`  ${ico(s.status)} ${s.label}${s.note ? ` — ${s.note}` : ''}`);
  if (preflight.some((s) => s.status === 'FAIL')) {
    console.log('\n✗ preflight failed; not running codex exec.');
    process.exit(2);
  }

  const sb = await makeSandbox('probe');
  console.log(`\nsandbox: ${sb.dir}\n`);
  const smoke = await runCodex(
    sb.dir,
    sb.env,
    'Reply exactly: CODEX_SMOKE_OK',
    { skipGitRepoCheck: true, timeoutMs: 300000 },
  );
  console.log('— [1] codex exec smoke —');
  console.log(`  ok=${smoke.ok} code=${smoke.code} authFailed=${smoke.authFailed}`);
  console.log(`  thread_id=${smoke.threadId ?? 'none'}`);
  console.log(`  turnCompleted=${smoke.turnCompleted} turnFailed=${smoke.turnFailed}`);
  console.log(`  events=${smoke.events.length} noiseLines=${smoke.noise.length} parseErrors=${smoke.parseErrors.length}`);
  console.log(`  final="${smoke.finalMessage.slice(0, 120)}"`);
  if (smoke.parseErrors.length) console.log(`  parseError=${smoke.parseErrors[0].message}`);
  if (smoke.errorEvents.length) console.log(`  error=${JSON.stringify(smoke.errorEvents[0]).slice(0, 180)}`);

  await rm(join(PG, '.sim-tmp', TS), { recursive: true, force: true });
  console.log('\nprobe cleanup done.');
  if (!smoke.ok) process.exit(1);
}

async function sc1ExplicitApply() {
  const sb = await makeSandbox('explicit-apply', { seed: true });
  const readmeBefore = await sha(join(sb.dir, 'README.md'));
  const srcBefore = await sha(join(sb.dir, 'src', 'index.js'));
  const prompt = [
    '$harness-aijient-team:harness-team',
    '',
    'You are in a throwaway git repository for an automated Codex L5 simulation.',
    'Run exactly `harness-team apply --yes` to apply the team harness to this project.',
    'Run non-interactively, accept defaults, do not create a commit, and keep changes limited to harness output.',
    'When complete, reply exactly: HARNESS_APPLY_DONE',
  ].join('\n');
  const r = await runCodex(sb.dir, sb.env, prompt);
  const signals = [
    sig('codex exec completed', r.ok, r.authFailed ? 'AUTH FAILED' : r.parseErrors[0]?.message ?? ''),
    sig('JSONL thread_id observed', Boolean(r.threadId)),
    sig('command execution event observed', r.commandItems.length > 0),
    sig('harness-team command observed', hasHarnessCommand(r), 'diagnostic; file evidence is authoritative'),
    sig('harness-team apply command observed', r.commandItems.some((item) => /harness-team\s+apply\b/.test(item.command || ''))),
    sig('README.md preserved (hash unchanged)', existsSync(join(sb.dir, 'README.md')) && (await sha(join(sb.dir, 'README.md'))) === readmeBefore),
    sig('src/index.js preserved (hash unchanged)', existsSync(join(sb.dir, 'src', 'index.js')) && (await sha(join(sb.dir, 'src', 'index.js'))) === srcBefore),
    ...(await installSignals(sb)),
  ];
  return { sb, run: r, signals };
}

async function sc2NaturalApply(trials = 2) {
  const runs = [];
  for (let i = 1; i <= trials; i++) {
    const sb = await makeSandbox(`natural-apply-${i}`, { seed: true });
    const prompt = [
      'Apply the team harness to this project using the installed Harness AIjient Team Codex plugin if available.',
      'Run non-interactively, accept defaults, do not create a commit, and keep user files intact.',
      'When complete, reply exactly: HARNESS_NATURAL_DONE',
    ].join('\n');
    const r = await runCodex(sb.dir, sb.env, prompt);
    const installed = (await installSignals(sb)).every((s) => s.status === 'PASS');
    runs.push({ sb, run: r, installed });
  }
  const passCount = runs.filter((r) => r.run.ok && r.installed).length;
  const rate = `${passCount}/${runs.length}`;
  return {
    runs,
    signals: [
      sig(`natural-language trigger installs harness (pass-rate ${rate})`, passCount === runs.length, passCount > 0 && passCount < runs.length ? 'FLAKY' : ''),
      sig('at least one natural-language run completed', passCount > 0),
    ],
  };
}

async function sc3Task(sb) {
  const slug = `codex-sim-${TS}`;
  const prompt = [
    '$harness-aijient-team:harness-team',
    '',
    `Run exactly \`harness-team task ${slug}\` to create or activate a harness task named ${slug}.`,
    'Keep changes limited to harness task docs and do not create a commit.',
    'When complete, reply exactly: HARNESS_TASK_DONE',
  ].join('\n');
  const r = await runCodex(sb.dir, sb.env, prompt);
  const taskDir = join(sb.dir, 'docs', 'simbot', slug);
  const specPath = join(taskDir, `${slug}-spec.md`);
  const activePath = join(sb.dir, '.harness', 'active.json');
  const activeRaw = await readFile(activePath, 'utf8').catch(() => '');
  return {
    slug,
    run: r,
    taskDir,
    signals: [
      sig('codex exec completed', r.ok, r.authFailed ? 'AUTH FAILED' : r.parseErrors[0]?.message ?? ''),
      sig('4 SSOT files created', ['spec', 'plan', 'handoff', 'artifact'].every((k) => existsSync(join(taskDir, `${slug}-${k}.md`)))),
      sig('active.json points to task', activeRaw.includes(slug)),
      sig('spec has Ambiguity 자가진단', await fileHas(specPath, 'Ambiguity 자가진단')),
      sig('spec has Ontology', await fileHas(specPath, 'Ontology')),
    ],
  };
}

async function sc4PostCommitHook(sb, task) {
  await writeFile(join(sb.dir, '.sim-scratch'), `codex sim ${TS}\n`);
  await run('git', ['add', '-A'], { cwd: sb.dir, env: sb.env });
  const handoffRoot = join(sb.dir, 'docs', 'simbot');
  const hookPath = join(sb.dir, '.git', 'hooks', 'post-commit');
  const hookStat = await stat(hookPath).catch(() => null);
  const hookInstalled = await fileHas(hookPath, 'harness-team handoff');
  const handoffPath = join(task.taskDir, `${task.slug}-handoff.md`);
  const handoffBefore = await readFile(handoffPath, 'utf8').catch(() => '');
  const before = await newestMtime(handoffRoot);
  const subject = 'sim: codex dummy';
  const commit = await run('git', ['commit', '-m', subject], { cwd: sb.dir, env: sb.env });
  const after = await newestMtime(handoffRoot);
  const handoffAfter = await readFile(handoffPath, 'utf8').catch(() => '');
  const postCommitUpdated = handoffAfter.includes(subject) || (before !== null && after !== null && after > before);

  let manualFallback = null;
  if (!postCommitUpdated) {
    const manual = await run('harness-team', ['handoff'], { cwd: sb.dir, env: sb.env });
    const handoffManual = await readFile(handoffPath, 'utf8').catch(() => '');
    manualFallback = {
      code: manual.code,
      updated: handoffManual !== handoffAfter && handoffManual.includes(subject),
      stderr: manual.stderr,
      stdout: manual.stdout,
    };
  }

  return {
    signals: [
      sig('post-commit hook installed', hookInstalled),
      sig('post-commit hook executable', Boolean(hookStat && (hookStat.mode & 0o111))),
      sig('git commit succeeded', commit.code === 0, commit.stderr || commit.stdout),
      sig(
        'post-commit handoff updated',
        postCommitUpdated,
        manualFallback
          ? `manual handoff code=${manualFallback.code} updated=${manualFallback.updated}`
          : '',
      ),
      sig('handoff file still present', existsSync(handoffPath)),
      na('Claude SessionStart nudge', 'Claude-only signal; Codex L5 does not score it'),
      manual('PreToolUse protect-files block', 'not reliably observable headless'),
    ],
    stdout: commit.stdout,
    stderr: commit.stderr,
    handoffBefore,
    handoffAfter,
    manualFallback,
  };
}

async function sc5Packaging() {
  const manifestPath = join(ROOT, '.codex-plugin', 'plugin.json');
  let manifest = {};
  try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch { /* reported below */ }
  return {
    signals: [
      sig('.codex-plugin/plugin.json parseable', Boolean(manifest.name)),
      sig('codex manifest points at ./skills/', manifest.skills === './skills/'),
      sig('harness-team skill shipped', await fileHas(join(ROOT, 'skills', 'harness-team', 'SKILL.md'), 'name: harness-team')),
      sig('harness-codex-sim skill shipped', await fileHas(join(ROOT, 'skills', 'harness-codex-sim', 'SKILL.md'), 'name: harness-codex-sim')),
    ],
  };
}

async function snapshot(version, name, srcDir) {
  const dest = join(PG, 'sim-snapshots', 'codex', version, name);
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  await run('rsync', [
    '-a',
    '--exclude', '.git',
    '--exclude', 'node_modules',
    '--exclude', '.bin',
    '--exclude', '.plugin-src',
    `${srcDir}/`,
    `${dest}/`,
  ]);
  return dest;
}

async function gitClean(path) {
  if (!existsSync(join(path, '.git'))) return true;
  const r = await run('git', ['status', '--short'], { cwd: path });
  return r.code === 0 && r.stdout.trim() === '';
}

function renderSignals(title, signals) {
  return [`### ${title}`, ...signals.map((s) => `- ${ico(s.status)} ${s.label}${s.note ? ` — ${s.note}` : ''}`), ''].join('\n');
}

async function renderReport(version, sha, sections, allSignals, snapshots = []) {
  const counts = allSignals.reduce((m, s) => ((m[s.status] = (m[s.status] || 0) + 1), m), {});
  const reportDir = join(PG, 'sim-reports');
  await mkdir(reportDir, { recursive: true });
  const reportPath = join(reportDir, `codex-agentloop-${TS}.md`);
  const report = [
    `# codex-agentloop 리포트 — ${TS}`,
    '',
    '| 항목 | 값 |',
    '|---|---|',
    `| 실행일시 | ${TS} |`,
    `| plugin 버전 | ${version} |`,
    `| plugin git SHA | ${sha} |`,
    '| 측정 레이어 | Codex L5 agent-in-the-loop |',
    '| 실행 엔진 | codex exec --json |',
    '| sandbox | danger-full-access for throwaway run scenarios; workspace-write for probe |',
    `| 신호 집계 | PASS ${counts.PASS || 0} · FAIL ${counts.FAIL || 0} · MANUAL ${counts.MANUAL || 0} · N/A ${counts['N/A'] || 0} |`,
    '',
    '> 신호는 파일/git/JSONL/hook output 증거 기반. 산문 응답은 diagnostic이며 PASS 신호가 아니다.',
    '',
    ...sections,
    '## 스냅샷',
    snapshots.length ? snapshots.map((p) => `- ${p}`).join('\n') : '- (none)',
    '',
  ].join('\n');
  await writeFile(reportPath, report);
  return { reportPath, report, counts };
}

async function runFull() {
  const preflight = await preflightSignals();
  if (preflight.some((s) => s.status === 'FAIL')) {
    console.error(renderSignals('Phase 0 — preflight', preflight));
    process.exit(2);
  }

  const version = await pluginVersion();
  const sha = await pluginSha();
  console.log(`# codex-agentloop run — ${TS} (v${version} @ ${sha})\n`);

  const sc1 = await sc1ExplicitApply();
  const sc2 = await sc2NaturalApply();
  const sc3 = await sc3Task(sc1.sb);
  const sc4 = await sc4PostCommitHook(sc1.sb, sc3);
  const sc5 = await sc5Packaging();
  const snapshots = [await snapshot(version, 'node-explicit-apply', sc1.sb.dir)];

  const tmpRoot = join(PG, '.sim-tmp', TS);
  await rm(tmpRoot, { recursive: true, force: true });
  const sc6 = {
    signals: [
      sig(`throwaway .sim-tmp/${TS} removed`, !existsSync(tmpRoot)),
      sig('persistent playground rn-app clean', await gitClean(join(PG, 'rn-app'))),
      sig('persistent playground next-app clean', await gitClean(join(PG, 'next-app'))),
      sig('persistent playground bare-node clean', await gitClean(join(PG, 'bare-node'))),
    ],
  };

  const sections = [
    renderSignals('Phase 0 — preflight', preflight),
    renderSignals('SC1 — explicit skill trigger apply', sc1.signals),
    renderSignals('SC2 — natural-language trigger apply', sc2.signals),
    renderSignals('SC3 — task workflow', sc3.signals),
    renderSignals('SC4 — installed post-commit hook compatibility', sc4.signals),
    renderSignals('SC5 — packaging / availability', sc5.signals),
    renderSignals('SC6 — cleanup / contamination', sc6.signals),
  ];
  const allSignals = [
    ...preflight,
    ...sc1.signals,
    ...sc2.signals,
    ...sc3.signals,
    ...sc4.signals,
    ...sc5.signals,
    ...sc6.signals,
  ];
  const { reportPath, report } = await renderReport(version, sha, sections, allSignals, snapshots);
  console.log(report);
  console.log(`\n✓ report: ${reportPath}`);

  const failed = allSignals.filter((s) => s.status === 'FAIL');
  if (failed.length) process.exit(1);
}

const cmd = process.argv[2] ?? 'probe';
const dispatch = { probe, run: runFull };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!dispatch[cmd]) {
    console.error(`unknown subcommand: ${cmd} (probe|run)`);
    process.exit(64);
  }
  dispatch[cmd]().catch((e) => {
    console.error(`✗ ${e.stack || e.message}`);
    process.exit(1);
  });
}

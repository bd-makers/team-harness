import { lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { exists } from '../fsx.mjs';
import { loadBackupDir } from '../harness.mjs';
import { buildEnvelope, emitObservation } from '../observation.mjs';

const pexec = promisify(execFile);

const EXTERNAL_TOOLS = [
  { cmd: 'gh', label: 'gh (GitHub CLI)' },
  { cmd: 'codex', label: 'codex (Codex CLI)' },
  { cmd: 'gemini', label: 'gemini (Gemini CLI)' },
  { cmd: 'opencode', label: 'opencode (OpenCode CLI)' },
  { cmd: 'jq', label: 'jq (JSON processor)' },
];

export async function checkCommand(cmd, args = ['--version'], env = process.env) {
  try {
    await pexec(cmd, args, { timeout: 3000, env });
    return true;
  } catch {
    return false;
  }
}

export async function checkSelfCli(root, env = process.env) {
  try {
    const { stdout } = await pexec('node', [`${root}/bin/harness-team.mjs`, '--help'], { timeout: 5000, env });
    return stdout.includes('harness-team');
  } catch {
    return false;
  }
}

// Detect gate bypass: an active task whose spec.md lacks the Ambiguity self-check
// section (a "pointer shell" spec authored outside the task tool). Returns a warning
// string, or null when there is no active task / the spec is intact.
export async function checkActiveSpecGate(targetDir) {
  let active;
  try { active = JSON.parse(await readFile(join(targetDir, '.harness/active.json'), 'utf8')); }
  catch { return null; }
  if (!active || !active.task) return null;

  const { user, task } = active;
  const specPath = join(targetDir, 'docs', user, task, `${task}-spec.md`);
  if (!(await exists(specPath))) {
    return `active task ${user}/${task}: spec.md 없음 (task 도구 우회 의심)`;
  }
  const content = await readFile(specPath, 'utf8');
  if (!content.includes('Ambiguity 자가진단')) {
    return `active task ${user}/${task}: spec.md에 Ambiguity 자가진단 섹션 없음 (게이트 우회 — 포인터 껍데기 spec 의심)`;
  }
  return null;
}

// Detect the legacy structure (0.7.x): CLAUDE.md was the master and AGENTS.md/
// GEMINI.md/.cursorrules were symlinks to it. Returns a warning string steering the
// user to `migrate`, or null when the project is on the new AGENTS.md-core structure.
export async function detectLegacyStructure(targetDir) {
  for (const alias of ['AGENTS.md', 'GEMINI.md']) {
    const st = await lstat(join(targetDir, alias)).catch(() => null);
    if (st && st.isSymbolicLink()) {
      return `레거시 구조 감지 (${alias} symlink) — run: harness-team migrate`;
    }
  }
  if (await exists(join(targetDir, '.cursorrules'))) {
    return `레거시 구조 감지 (.cursorrules 잔존) — run: harness-team migrate`;
  }
  return null;
}

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

const BACKUP_SCRIPTS = ['clone.sh', 'symlink.sh', 'delete.sh'];

export async function runDoctor(ctx) {
  const json = !!(ctx.flags && ctx.flags.json);
  const checks = [];
  const add = (label, status, detail, humanLine) => {
    if (json) checks.push(detail ? { label, status, detail } : { label, status });
    else console.log(humanLine);
  };
  const line = (humanLine) => { if (!json) console.log(humanLine); };

  line(`harness-team doctor → ${ctx.targetDir}\n`);
  let fail = 0;
  for (const c of CHECKS) {
    const p = join(ctx.targetDir, c.path);
    const ok = await exists(p);
    if (!ok) {
      if (c.required) { add(c.path, 'fail', 'missing', `✗ ${c.path}  (missing)`); fail++; }
      else add(c.path, 'optional', 'not present, optional', `- ${c.path}  (not present, optional)`);
      continue;
    }
    if (c.realFile) {
      const st = await lstat(p);
      if (st.isSymbolicLink()) {
        add(c.path, 'fail', 'symlink — 신구조는 실파일이어야 함, run: harness-team migrate',
          `✗ ${c.path}  (symlink — 신구조는 실파일이어야 함, run: harness-team migrate)`);
        fail++; continue;
      }
      if (c.contains) {
        const body = await readFile(p, 'utf8');
        if (!body.includes(c.contains)) {
          add(c.path, 'fail', `"${c.contains}" 없음 — 손상/레거시 의심`,
            `✗ ${c.path}  ("${c.contains}" 없음 — 손상/레거시 의심)`);
          fail++; continue;
        }
      }
      add(c.path, 'pass', undefined, `✓ ${c.path}`);
      continue;
    }
    if (c.json) {
      try {
        JSON.parse(await readFile(p, 'utf8'));
        add(c.path, 'pass', 'valid JSON', `✓ ${c.path}  (valid JSON)`);
      } catch (e) {
        add(c.path, 'fail', `invalid JSON: ${e.message}`, `✗ ${c.path}  (invalid JSON: ${e.message})`);
        fail++;
      }
      continue;
    }
    if (c.executable) {
      const st = await lstat(p);
      if (!(st.mode & 0o100)) { add(c.path, 'fail', 'not executable', `✗ ${c.path}  (not executable)`); fail++; continue; }
      add(c.path, 'pass', 'exec', `✓ ${c.path}  (exec)`);
      continue;
    }
    add(c.path, 'pass', undefined, `✓ ${c.path}`);
  }

  // Harness scripts live in the project root since v0.3+.
  line('');
  for (const name of BACKUP_SCRIPTS) {
    const p = join(ctx.targetDir, name);
    if (!(await exists(p))) { add(name, 'fail', 'missing in project root', `✗ ${name}  (missing in project root)`); fail++; continue; }
    const st = await lstat(p);
    if (!(st.mode & 0o100)) { add(name, 'fail', 'not executable', `✗ ${name}  (not executable)`); fail++; continue; }
    add(name, 'pass', 'exec', `✓ ${name}  (exec)`);
  }

  const backupDir = await loadBackupDir(ctx.targetDir);
  if (backupDir) {
    add('backup clone dir', 'pass', backupDir, `\nbackup clone dir: ${backupDir}`);
  } else {
    add('backup clone dir', 'fail', 'missing .harness/backup.json',
      `\n✗ backup clone dir is not configured (missing .harness/backup.json)`);
    fail++;
  }

  // External tool healthchecks (all optional — missing → -, present → ✓, never fail++).
  // Run concurrently so a slow/hung tool doesn't serialize the worst-case wait.
  line('\nexternal tools:');
  const toolResults = await Promise.all(
    EXTERNAL_TOOLS.map(({ cmd, label }) => checkCommand(cmd).then(ok => ({ ok, label }))),
  );
  for (const { ok, label } of toolResults) {
    if (ok) add(label, 'pass', undefined, `✓ ${label}`);
    else add(label, 'optional', 'not found, optional', `- ${label}  (not found, optional)`);
  }

  // Self-CLI executability (required — failure increments fail)
  const selfOk = await checkSelfCli(ctx.root);
  if (selfOk) add('harness-team CLI', 'pass', '--help OK', '✓ harness-team CLI  (--help OK)');
  else { add('harness-team CLI', 'fail', '--help failed', '✗ harness-team CLI  (--help failed)'); fail++; }

  // Legacy structure warning (symlink case already fails via CHECKS.realFile;
  // a lone .cursorrules remnant only warns and steers to migrate).
  const legacyWarning = await detectLegacyStructure(ctx.targetDir);
  if (legacyWarning) add('legacy structure', 'warning', legacyWarning, `\n⚠️ ${legacyWarning}`);

  // Active task gate-bypass warning (⚠️, does not count toward fail / exit code).
  const specGateWarning = await checkActiveSpecGate(ctx.targetDir);
  if (specGateWarning) {
    add('spec gate', 'warning', specGateWarning, `\n⚠️ ${specGateWarning}`);
    line(`hint: spec은 \`harness-team task <name>\`로 생성해 자가진단 게이트를 포함시켜라`);
  }

  if (json) {
    const warnCount = checks.filter(c => c.status === 'warning').length;
    const status = fail ? 'error' : (warnCount ? 'warning' : 'success');
    emitObservation(buildEnvelope({
      command: 'doctor',
      status,
      summary: fail ? `${fail} problem(s)` : (warnCount ? `${warnCount} warning(s)` : 'All checks passed'),
      nextActions: fail ? ['harness-team sync'] : (warnCount ? ['harness-team migrate'] : []),
      extra: { checks },
    }));
  } else {
    console.log(fail ? `\n${fail} problem(s). Run: harness-team sync` : '\nAll checks passed.');
  }
  if (fail) process.exitCode = 1;
}

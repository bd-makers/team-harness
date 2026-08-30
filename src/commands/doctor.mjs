import { lstat, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { exists } from '../fsx.mjs';
import { loadBackupDir, settingsHasBoundaryCheckpoint, codexHooksHaveSessionContext } from '../harness.mjs';
import { buildEnvelope, emitObservation } from '../observation.mjs';
import { settingsHasSessionGate } from './session-context.mjs';

const pexec = promisify(execFile);

// gh/codex/gemini/opencode are optional integrations: absent means a feature is off.
// jq is not in that class. The Claude hooks parse their stdin payload with it, and
// current templates fall back to a grep extractor instead of failing open — but that
// holds only for installed hooks that actually carry the fallback block. runDoctor
// checks the install (jqFallbackGaps) and swaps this default detail for a fail-open
// warning when the block is missing, so the report never claims "차단은 유지" about a
// hook that would silently allow everything. Either way it is a warning (never fail++,
// so the exit code contract is unchanged) rather than "optional".
// Exported so docs/prerequisites.md cannot drift from what doctor actually checks:
// tests/prerequisites-doc.test.mjs compares this list against the documented table
// in both directions.
export const EXTERNAL_TOOLS = [
  { cmd: 'gh', label: 'gh (GitHub CLI)' },
  { cmd: 'codex', label: 'codex (Codex CLI)' },
  { cmd: 'gemini', label: 'gemini (Gemini CLI)' },
  { cmd: 'opencode', label: 'opencode (OpenCode CLI)' },
  {
    cmd: 'jq',
    label: 'jq (JSON processor)',
    missingDetail: 'not found — Claude 훅이 저정밀 모드로 판정합니다 (차단은 유지, 정확도 하락). jq 설치를 권장합니다',
  },
];

// PR #29's grep fallback exists only in hooks carrying this marker. An installed hook
// without it predates the fix: with jq absent its parse comes back empty and the hook
// silently allows everything (fail-open). migrate refreshes known stock hooks — doctor
// only reports, so the two never disagree about who fixes what.
export const JQ_FALLBACK_MARKER = 'harness:jq-fallback';
export const JQ_HOOK_FILES = ['block-dangerous-git.sh', 'protect-files.sh', 'pre-commit-check.sh', 'auto-format.sh'];

// Installed jq-parsing hooks that lack the fallback marker. Absent files are not gaps
// (nothing runs → nothing fails open; the CHECKS table already grades hook presence).
export async function jqFallbackGaps(targetDir) {
  const gaps = [];
  for (const name of JQ_HOOK_FILES) {
    const body = await readFile(join(targetDir, '.claude/hooks', name), 'utf8').catch(() => null);
    if (body !== null && !body.includes(JQ_FALLBACK_MARKER)) gaps.push(name);
  }
  return gaps;
}

// The jq warning's runnable remedy for next_actions — a warning without an action
// reads as noise to an agent consuming the envelope (see cliDriftAction).
export function jqInstallAction(platform = process.platform) {
  return platform === 'darwin' ? 'brew install jq' : 'sudo apt-get install -y jq';
}

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

// Claude's SessionStart and git post-commit hooks invoke the globally resolvable
// `harness-team` command. The source repository runs its local Node entrypoint,
// so that check cannot prove consumer hooks will be able to run.
export async function checkHookCli(env = process.env) {
  try {
    // 5s to match checkSelfCli: both spawn node with this CLI, so a loaded machine
    // that is slow for one is slow for the other. A shorter budget here would report
    // "hooks can't run" for what is only a slow spawn.
    const { stdout } = await pexec('harness-team', ['--help'], { timeout: 5000, env });
    return ['session-context', 'handoff'].every(command =>
      new RegExp(`^\\s*${command}(?:\\s|$)`, 'm').test(stdout));
  } catch {
    return false;
  }
}

// This package is NOT published to the public npm registry, so `npm i -g <package-name>`
// 404s — the global CLI comes from linking the local marketplace clone that
// `/plugin install` creates. Keep the recovery command in one place so the doctor
// warning, JSON next_actions, and README cannot drift back to the broken form.
export const HOOK_CLI_MARKETPLACE_DIR = 'harness-aijient-team-marketplace';

// The plugin half of the installed-record key. Needed because the harness
// marketplace also lists COMPANION plugins now (external, sha-pinned), so their
// records share the marketplace half of the key and matching on it alone would
// read a companion's version as the harness version.
export const HOOK_CLI_PLUGIN_NAME = 'harness-aijient-team';

// `--version` landed in 0.15.1. Before that the CLI answered `Unknown command`
// and exited 1, so "no version reported" dates the binary rather than hiding it.
export const VERSION_FLAG_SINCE = '0.15.1';

// Tolerant on purpose: a CLI may print `v0.15.1`, `harness-team 0.15.1`, or a
// prerelease. Pulling the first semver-shaped run out of the output beats an
// anchored test that would call a perfectly current CLI "too old to answer".
export function normalizeVersion(text) {
  const match = String(text ?? '').match(/\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/);
  return match ? match[0] : null;
}

// Compares only major.minor.patch, so `0.15.2-rc.1` counts as past `0.15.1`
// instead of falling over on Number('2-rc'). Prerelease ordering is deliberately
// ignored: the only question here is whether the binary is new enough to have
// grown `--version`, and an rc of that version has it.
function isAtLeast(version, floor) {
  const parsed = String(version).match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!parsed) return false;
  const a = parsed.slice(1, 4).map(Number);
  const b = floor.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return true;
}

// Four outcomes. `missing` and `legacy` need different fixes — install the CLI
// vs refresh the source it points at — and `unknown` exists so a CLI that never
// got to answer is not dated by its silence. A timeout, a missing interpreter
// (exit 127), or a signal says nothing about the binary's version; only a plain
// non-zero exit means it ran and rejected `--version`, which does date it.
export async function readPathCliVersion(env = process.env) {
  try {
    const { stdout } = await pexec('harness-team', ['--version'], { timeout: 5000, env });
    const version = normalizeVersion(stdout);
    return version ? { state: 'version', version } : { state: 'unknown' };
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'EACCES') return { state: 'missing' };
    if (error?.killed || error?.code === 127 || typeof error?.code !== 'number') return { state: 'unknown' };
    return { state: 'legacy' };
  }
}

// The installed record is keyed `<plugin>@<marketplace>`. Matching on the
// marketplace half alone used to be safe because the harness owned exactly one
// plugin in it — that stopped being true when the catalog started listing
// sha-pinned companion plugins, whose records carry THEIR version under the same
// marketplace suffix. Reading one of those as the harness version produces a
// false CLI-drift warning, so match both halves of the key.
export function installedHarnessVersion(
  installed,
  marketplace = HOOK_CLI_MARKETPLACE_DIR,
  plugin = HOOK_CLI_PLUGIN_NAME,
) {
  for (const [key, records] of Object.entries(installed?.plugins ?? {})) {
    const at = key.lastIndexOf('@');
    if (at === -1) continue;
    if (key.slice(0, at) !== plugin || key.slice(at + 1) !== marketplace) continue;
    if (!Array.isArray(records) || records.length === 0) continue;
    const record = records.find(r => r.scope === 'user') ?? records[0];
    if (record?.version) return record.version;
  }
  return null;
}

// Claude Code loads commands and skills from the versioned cache dir that
// installed_plugins.json points at, but SessionStart and post-commit hooks shell
// out to whatever `harness-team` PATH resolves to — usually a symlink to the
// marketplace clone, which `release` does not update. The two can disagree for
// weeks in silence: the plugin reports the new version while every hook, and
// every command the maintainer types, runs the old code.
//
// Reported as a mismatch rather than "PATH is older", because a PATH CLI ahead
// of the installed record is drift too and ordering would need a full semver
// comparator. The one ordered comparison is against VERSION_FLAG_SINCE, which
// is what makes a silent `--version` conclusive instead of ambiguous.
export function cliDriftWarning({ pathCli, installedVersion, installCommand }) {
  if (!installedVersion || !pathCli) return null;
  // Absent or unrunnable is not drift: there is no version to disagree with, and
  // the consumer-side hook CLI check already owns "the CLI will not run".
  if (pathCli.state === 'missing' || pathCli.state === 'unknown') return null;
  const remedy = `전역 CLI 출처를 갱신하라 (marketplace clone: git pull 또는 /plugin marketplace update), 필요하면 ${installCommand}로 재링크`;
  if (pathCli.state === 'legacy') {
    if (!isAtLeast(installedVersion, VERSION_FLAG_SINCE)) return null;
    return `PATH의 harness-team이 --version을 지원하지 않음 (${VERSION_FLAG_SINCE} 이전) — 설치된 플러그인은 ${installedVersion}; 훅과 터미널이 구버전 CLI로 실행 중이다. ${remedy}`;
  }
  if (pathCli.version === normalizeVersion(installedVersion)) return null;
  return `전역 CLI 버전 불일치 — PATH의 harness-team은 ${pathCli.version}, 설치된 플러그인은 ${installedVersion}; 훅과 터미널이 설치본과 다른 코드로 실행 중이다. ${remedy}`;
}

// The remediation as a runnable command, for the JSON envelope's next_actions —
// an agent consuming a warning with no action to take reads it as noise.
// `/plugin marketplace update` is the Claude Code equivalent, but next_actions
// carries shell commands.
export function cliDriftAction(env = process.env) {
  const pluginsRoot = env.CLAUDE_PLUGINS_ROOT ?? join(homedir(), '.claude/plugins');
  return `git -C "${join(pluginsRoot, 'marketplaces', HOOK_CLI_MARKETPLACE_DIR)}" pull`;
}

export async function checkCliDrift(env = process.env) {
  const pluginsRoot = env.CLAUDE_PLUGINS_ROOT ?? join(homedir(), '.claude/plugins');
  const installedPath = join(pluginsRoot, 'installed_plugins.json');
  const raw = await readFile(installedPath, 'utf8').catch(() => null);
  if (!raw) return null;
  let installed;
  try { installed = JSON.parse(raw); } catch { return null; }
  const installedVersion = installedHarnessVersion(installed);
  if (!installedVersion) return null;
  return cliDriftWarning({
    pathCli: await readPathCliVersion(env),
    installedVersion,
    installCommand: hookCliInstallCommand(env),
  });
}

export function hookCliInstallCommand(env = process.env) {
  const pluginsRoot = env.CLAUDE_PLUGINS_ROOT ?? join(homedir(), '.claude/plugins');
  return `npm i -g "${join(pluginsRoot, 'marketplaces', HOOK_CLI_MARKETPLACE_DIR)}"`;
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

// Detect a settings.json that predates the SessionStart task-gate (0.9+). apply
// (deep-merge) / migrate deliver the hook; a missing one means the project is
// outdated. Soft warning steering to apply — does NOT count toward fail (a pre-0.9
// project is legitimate; a hard fail would break its CI). Missing/invalid
// settings.json is already covered by CHECKS, so we stay silent there (no double-fail).
export async function checkSessionStartHook(targetDir) {
  let settings;
  try { settings = JSON.parse(await readFile(join(targetDir, '.claude/settings.json'), 'utf8')); }
  catch { return null; }
  if (settingsHasSessionGate(settings)) return null;
  return 'SessionStart task-gate hook 없음 (0.9+) — run: harness-team apply (또는 migrate)';
}

export { settingsHasBoundaryCheckpoint };

// Absent `.codex/hooks.json` is fine (optional CHECKS entry reports it). A file that
// exists but carries no harness SessionStart hook is the silent-drift case: valid JSON,
// no task context in Codex sessions.
export async function checkCodexSessionHook(targetDir) {
  let hooks;
  try { hooks = JSON.parse(await readFile(join(targetDir, '.codex/hooks.json'), 'utf8')); }
  catch { return null; }
  if (codexHooksHaveSessionContext(hooks)) return null;
  return '.codex/hooks.json에 harness SessionStart 훅 없음 — Codex 세션이 task context를 못 받음; run: harness-team apply';
}

// docs/decisions.md is scaffolded with skipExisting (copyStaticAssets), so a project
// that already had the file when the D-log migration shipped never receives the
// upstream D2/D4/D5 sections — and apply cannot deliver them without clobbering the
// team's own log. Warn-level: a missing file is fixable by apply (scaffold copies it),
// missing sections need a manual merge from the plugin's templates/docs/decisions.md.
export const DECISION_LOG_PATH = 'docs/decisions.md';
export const DECISION_HEADINGS = ['## D2', '## D4', '## D5'];

export async function checkDecisionLog(targetDir) {
  let body;
  try {
    body = await readFile(join(targetDir, DECISION_LOG_PATH), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return `${DECISION_LOG_PATH} 없음 — 팀 결정 로그(D2/D4/D5 전문)가 프로젝트에 없다; run: harness-team apply (플러그인 templates/docs/decisions.md를 스캐폴드)`;
    }
    // A directory or an unreadable file must stay a warning too — a warn-level
    // check crashing doctor before it can emit its envelope defeats its purpose.
    return `${DECISION_LOG_PATH} 읽기 실패(${error?.code ?? error?.message}) — 디렉터리이거나 권한 문제일 수 있다; 파일 상태를 확인하라`;
  }
  // Line-anchored with \b so `## D20` or a mid-line mention cannot satisfy `## D2`,
  // while the template's dated form (`## D2 (2026-06-11) — …`) still matches.
  const missing = DECISION_HEADINGS.filter(h => !new RegExp(`^${h}\\b`, 'm').test(body));
  if (missing.length === 0) return null;
  return `${DECISION_LOG_PATH}에 ${missing.join(', ')} 절 없음 — 스캐폴드는 기존 파일을 덮어쓰지 않으므로 플러그인 templates/docs/decisions.md에서 해당 절을 가져와 추가하라`;
}

export async function checkBoundaryCheckpointHook(targetDir) {
  let settings;
  try { settings = JSON.parse(await readFile(join(targetDir, '.claude/settings.json'), 'utf8')); }
  catch { return null; }
  if (settingsHasBoundaryCheckpoint(settings)) return null;
  return 'PreToolUse boundary checkpoint hook 없음 — run: harness-team apply';
}

// The "eager tier" = instruction files loaded into context at EVERY session start
// (AGENTS.md + CLAUDE.md at the project root), unlike lazy-loaded command docs/skills.
// This repo's own eager tier is ~16 KB; 24 KiB = 1.5x headroom. This is a deterministic
// size check only — the fix (moving procedure to lazy sources) is a human judgment call,
// so it stays warning-only, mirroring the TCC 6 KiB budget philosophy (context.mjs
// CONTEXT_MAX_BYTES).
export const EAGER_TIER_MAX_BYTES = 24 * 1024;

// A missing file counts as 0 bytes. Both missing → total is 0, which never exceeds
// the budget, so this returns null without any special-casing — same as a project
// that simply doesn't use the harness agent files.
export async function checkEagerTierSize(targetDir) {
  let total = 0;
  for (const name of ['AGENTS.md', 'CLAUDE.md']) {
    // Read without an encoding: Buffer#length is the raw byte count, which is the
    // UTF-8 size — no separate Buffer.byteLength re-encode needed.
    const body = await readFile(join(targetDir, name)).catch(() => null);
    if (body) total += body.length;
  }
  if (total <= EAGER_TIER_MAX_BYTES) return null;
  const totalFmt = total.toLocaleString('en-US');
  const budgetFmt = EAGER_TIER_MAX_BYTES.toLocaleString('en-US');
  return `eager 계층(AGENTS.md+CLAUDE.md) ${totalFmt} B > ${budgetFmt} B(24 KiB) — 매 세션 로드되는 지시가 큽니다. 절차는 lazy 정본(커맨드 문서·스킬)으로 옮기는 것을 검토하세요.`;
}

const CHECKS = [
  { path: 'AGENTS.md', required: true, realFile: true, contains: 'harness:section="protocol"' },
  { path: 'CLAUDE.md', required: true, realFile: true, contains: '@AGENTS.md' },
  { path: 'GEMINI.md', required: false, realFile: true, contains: '@AGENTS.md' },
  { path: '.claude/settings.json', required: true, json: true },
  { path: '.claude/hooks/protect-files.sh', executable: true },
  { path: '.claude/hooks/boundary-checkpoint.sh', executable: true },
  { path: '.claude/hooks/auto-format.sh', executable: true },
  { path: '.claude/hooks/pre-commit-check.sh', executable: true },
  { path: '.cursor/rules', required: false, dir: true },
  { path: '.opencode/opencode.json', required: false, json: true },
  { path: '.codex/hooks.json', required: false, json: true },
  { path: 'docs/README.md', required: false },
  // Backup/symlink architecture is a consumer-project concern; the plugin source
  // repo uses git instead, so this check is skipped in plugin-dev mode.
  { path: '.harness/backup.json', required: true, json: true, skipInPluginDev: true },
];

// The plugin *source* repo is not a consumer install: it ships templates/ and its
// own manifest, and uses git rather than the backup/symlink workflow. Grading it as
// a consumer produces false-positive failures (backup.json, clone/symlink/delete.sh,
// backup clone dir). Detect it by structural markers a consumer project never has.
export async function isPluginDevRepo(targetDir) {
  return (await exists(join(targetDir, '.claude-plugin/plugin.json')))
    && (await exists(join(targetDir, 'templates')))
    && (await exists(join(targetDir, 'bin/harness-team.mjs')));
}

const BACKUP_SCRIPTS = ['clone.sh', 'symlink.sh', 'delete.sh'];

export async function runDoctor(ctx) {
  const json = !!(ctx.flags && ctx.flags.json);
  const hookCliInstall = hookCliInstallCommand();
  const checks = [];
  // Counted here rather than from `checks`, which is only populated in JSON
  // mode — a text-mode tally read off that array is always zero.
  let warnings = 0;
  const add = (label, status, detail, humanLine) => {
    if (status === 'warning') warnings++;
    if (json) checks.push(detail ? { label, status, detail } : { label, status });
    else console.log(humanLine);
  };
  const line = (humanLine) => { if (!json) console.log(humanLine); };

  line(`harness-team doctor → ${ctx.targetDir}\n`);
  const pluginDev = await isPluginDevRepo(ctx.targetDir);
  if (pluginDev) line('  (plugin-dev repo detected — backup/symlink architecture checks are n/a)\n');
  let fail = 0;
  for (const c of CHECKS) {
    if (pluginDev && c.skipInPluginDev) {
      add(c.path, 'skip', 'plugin-dev repo — n/a', `- ${c.path}  (plugin-dev repo — n/a)`);
      continue;
    }
    const p = join(ctx.targetDir, c.path);
    const ok = await exists(p);
    if (!ok) {
      // A dangling symlink (target deleted/evicted) reads as "missing" to access();
      // call it out distinctly — the fix is `sync` (recreate), not `init`.
      const lst = await lstat(p).catch(() => null);
      if (lst && lst.isSymbolicLink()) {
        add(c.path, 'fail', 'broken symlink — target 없음, run: harness-team sync',
          `✗ ${c.path}  (broken symlink — target 없음, run: harness-team sync)`);
        fail++; continue;
      }
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

  // Harness scripts live in the project root since v0.3+ (consumer projects only).
  line('');
  if (pluginDev) {
    for (const name of BACKUP_SCRIPTS) add(name, 'skip', 'plugin-dev repo — n/a', `- ${name}  (plugin-dev repo — n/a)`);
    add('backup clone dir', 'skip', 'plugin-dev repo — n/a', `\nbackup clone dir: n/a (plugin-dev repo)`);
  } else {
    for (const name of BACKUP_SCRIPTS) {
      const p = join(ctx.targetDir, name);
      if (!(await exists(p))) {
        const lst = await lstat(p).catch(() => null);
        if (lst && lst.isSymbolicLink()) {
          add(name, 'fail', 'broken symlink — target 없음, run: harness-team sync',
            `✗ ${name}  (broken symlink — target 없음, run: harness-team sync)`);
          fail++; continue;
        }
        add(name, 'fail', 'missing in project root', `✗ ${name}  (missing in project root)`); fail++; continue;
      }
      const st = await lstat(p);
      if (!(st.mode & 0o100)) { add(name, 'fail', 'not executable', `✗ ${name}  (not executable)`); fail++; continue; }
      add(name, 'pass', 'exec', `✓ ${name}  (exec)`);
    }

    // Reuse loadBackupDir's resolution (~/{parent,name}/{dir}) so the existence
    // probe hits the exact path the scripts target — no re-derivation mismatch.
    const backupDir = await loadBackupDir(ctx.targetDir);
    if (!backupDir) {
      add('backup clone dir', 'fail', 'missing .harness/backup.json',
        `\n✗ backup clone dir is not configured (missing .harness/backup.json)`);
      fail++;
    } else if (!(await exists(backupDir))) {
      // Configured but gone — the classic iCloud/Dropbox eviction or a manual move.
      add('backup clone dir', 'fail', `configured but missing on disk: ${backupDir} (iCloud/Dropbox eviction? moved?)`,
        `\n✗ backup clone dir configured but missing on disk: ${backupDir}\n   (iCloud/Dropbox eviction? moved? — restore the folder or re-run harness-team init)`);
      fail++;
    } else {
      add('backup clone dir', 'pass', backupDir, `\nbackup clone dir: ${backupDir}`);
    }
  }

  // External tool healthchecks (missing → - / ⚠️ per EXTERNAL_TOOLS, present → ✓, never fail++).
  // Run concurrently so a slow/hung tool doesn't serialize the worst-case wait.
  line('\nexternal tools:');
  const toolResults = await Promise.all(
    EXTERNAL_TOOLS.map(({ cmd, label, missingDetail }) => checkCommand(cmd).then(ok => ({ cmd, ok, label, missingDetail }))),
  );
  // jq honesty branch: the static detail's "차단은 유지" is only true of hooks that
  // carry the fallback block. If the install predates it, say fail-open and route to
  // migrate instead — the warning severity stays the same (never fail++).
  const jqTool = toolResults.find(t => t.cmd === 'jq');
  const jqMissing = !!jqTool && !jqTool.ok;
  const jqGaps = jqMissing ? await jqFallbackGaps(ctx.targetDir) : [];
  if (jqGaps.length) {
    jqTool.missingDetail = `not found — 설치된 훅 ${jqGaps.length}개(${jqGaps.join(', ')})에 jq 폴백 블록이 없어 jq 없는 환경에서 조용히 무력화됩니다(fail-open). run: harness-team migrate (훅 갱신) + jq 설치`;
  }
  for (const { ok, label, missingDetail } of toolResults) {
    if (ok) add(label, 'pass', undefined, `✓ ${label}`);
    else if (missingDetail) add(label, 'warning', missingDetail, `⚠️ ${label}  (${missingDetail})`);
    else add(label, 'missing', 'not found, optional', `- ${label}  (not found, optional)`);
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

  // SessionStart task-gate hook presence (⚠️, advisory — does not count toward fail).
  // The plugin source repo intentionally does not dogfood the gate on itself, so
  // its absence there is expected, not a warning.
  const hookWarning = pluginDev ? null : await checkSessionStartHook(ctx.targetDir);
  if (hookWarning) add('SessionStart task-gate', 'warning', hookWarning, `\n⚠️ ${hookWarning}`);

  const boundaryHookWarning = pluginDev ? null : await checkBoundaryCheckpointHook(ctx.targetDir);
  if (boundaryHookWarning) add('PreToolUse boundary checkpoint', 'warning', boundaryHookWarning, `\n⚠️ ${boundaryHookWarning}`);

  const codexHookWarning = pluginDev ? null : await checkCodexSessionHook(ctx.targetDir);
  if (codexHookWarning) add('Codex SessionStart hook', 'warning', codexHookWarning, `\n⚠️ ${codexHookWarning}`);

  // Deliberately NOT gated on pluginDev: the D-log migration puts docs/decisions.md
  // in the source repo too, so its absence is real drift on either side.
  const decisionLogWarning = await checkDecisionLog(ctx.targetDir);
  if (decisionLogWarning) add('decision log', 'warning', decisionLogWarning, `\n⚠️ ${decisionLogWarning}`);

  // Deliberately NOT gated on pluginDev either — this repo's own eager tier is the
  // reason the 24 KiB budget was picked, so it must be measured here too.
  const eagerTierWarning = await checkEagerTierSize(ctx.targetDir);
  if (eagerTierWarning) add('eager tier size', 'warning', eagerTierWarning, `\n⚠️ ${eagerTierWarning}`);

  // Like the hook-presence checks above, this is consumer-only. plugin-dev uses
  // `node bin/harness-team.mjs` and deliberately does not install consumer hooks.
  let hookCliOk = null;
  if (!pluginDev) {
    hookCliOk = await checkHookCli();
    if (!hookCliOk) {
      const detail = `PATH의 harness-team이 실행되지 않거나 session-context/handoff를 지원하지 않음 — SessionStart/post-commit 훅이 실행되지 않음; ${hookCliInstall}로 전역 CLI를 링크하거나 Claude Code 플러그인 경로를 PATH에 추가`;
      add('SessionStart/post-commit hook CLI', 'warning', detail, `\n⚠️ ${detail}`);
    } else {
      add('SessionStart/post-commit hook CLI', 'pass', 'session-context/handoff supported', '✓ SessionStart/post-commit hook CLI  (session-context/handoff supported)');
    }
  } else {
    add('SessionStart/post-commit hook CLI', 'skip', 'plugin-dev repo — consumer hook PATH check n/a', '- SessionStart/post-commit hook CLI  (plugin-dev repo — n/a)');
  }

  // Deliberately NOT gated on plugin-dev, unlike every check above. Those skip
  // because a consumer's hook wiring cannot be proven from the source repo —
  // that rationale does not transfer here. The maintainer's machine is where the
  // PATH binary and the source tree diverge furthest, and the incident that
  // motivated this check happened in this repo: a stale global CLI ran a release
  // that the fixed source would have refused.
  const driftWarning = await checkCliDrift();
  if (driftWarning) {
    add('global CLI version drift', 'warning', driftWarning, `\n⚠️ ${driftWarning}`);
  }

  if (json) {
    const warnCount = warnings;
    const skipCount = checks.filter(c => c.status === 'skip').length;
    const status = fail ? 'error' : (warnCount ? 'warning' : 'success');
    // Make plugin-dev mode legible to an agent parsing the envelope: a green bill
    // here means "healthy AND backup checks were intentionally skipped", not the
    // same success a consumer project reports. Reflect it in summary + extra.mode.
    const okSummary = pluginDev
      ? `All checks passed (plugin-dev mode — ${skipCount} backup check(s) skipped)`
      : 'All checks passed';
    // Route each warning to its own remedy — legacy structure → migrate,
    // spec-gate bypass → create the task properly. A blanket 'migrate' would
    // misdirect an agent whose only warning is a pointer-shell spec.
    const warnActions = [];
    // A decision log that is missing outright is delivered by apply's scaffold;
    // one that exists without the D-sections is not (skipExisting) — no command
    // fixes it, so only the missing-file case earns the apply action.
    const decisionLogNeedsScaffold = decisionLogWarning
      && !(await exists(join(ctx.targetDir, DECISION_LOG_PATH)));
    if (legacyWarning) warnActions.push('harness-team migrate');
    if (specGateWarning) warnActions.push('harness-team task <name>');
    if (hookWarning || boundaryHookWarning || decisionLogNeedsScaffold) warnActions.push('harness-team apply');
    // jq warning always carries its remedy; the fail-open branch additionally needs
    // migrate — installing jq alone leaves the stale hooks' precision degraded forever.
    if (jqGaps.length) warnActions.push('harness-team migrate');
    if (jqMissing) warnActions.push(jqInstallAction());
    if (!pluginDev && !hookCliOk) warnActions.push(hookCliInstall);
    if (driftWarning) warnActions.push(cliDriftAction());
    emitObservation(buildEnvelope({
      command: 'doctor',
      status,
      summary: fail ? `${fail} problem(s)` : (warnCount ? `${warnCount} warning(s)` : okSummary),
      // Set: legacy-structure and jq-gap warnings both route to migrate — one entry is enough.
      nextActions: fail ? ['harness-team sync'] : [...new Set(warnActions)],
      // Keep the invariant status==='error' ⟺ error!=null uniform across commands.
      // Per-check detail still lives in checks[]; error is the top-level summary of it.
      error: fail ? {
        root_cause: `${fail}개 필수 점검 항목 실패 (checks[]의 status:"fail" 참조)`,
        safe_retry: 'checks[]의 fail 항목을 해소한 뒤 harness-team sync 실행 후 재점검',
        stop_condition: '필수 파일/스크립트 누락이면 harness-team init 또는 migrate로 복구',
      } : null,
      extra: { checks, mode: pluginDev ? 'plugin-dev' : 'project' },
    }));
  } else {
    // "All checks passed" after a printed ⚠️ contradicts the lines above it —
    // the JSON branch has always said `warning` here, and the text branch now
    // agrees instead of overwriting the warnings with a green bill.
    console.log(fail ? `\n${fail} problem(s). Run: harness-team sync`
      : warnings ? `\n${warnings} warning(s).`
      : (pluginDev ? '\nAll checks passed (plugin-dev mode).' : '\nAll checks passed.'));
  }
  if (fail) process.exitCode = 1;
}

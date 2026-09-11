import { lstat, readFile, realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, isAbsolute, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { exists } from '../fsx.mjs';
import { loadBackupDir, settingsHasBoundaryCheckpoint, codexHooksHaveSessionContext, isHarnessCodexSessionCommand } from '../harness.mjs';
import { buildEnvelope, buildErrorPacket, emitObservation } from '../observation.mjs';
import { settingsHasSessionGate } from './session-context.mjs';
import { checkDoneOnMain } from './remote-task.mjs';
import { checkRuleProvenance } from './rules.mjs';
import { findStaleTemplates, isKnownStockTemplate } from './migrate.mjs';
import { evaluateObserveVerdict, observeLoopbackNudge, tripWireDetail } from './observe.mjs';

const pexec = promisify(execFile);

// gh/codex are optional integrations: absent means a feature is off.
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

// Claude's SessionStart hook, the PreToolUse boundary checkpoint and the git
// post-commit hook all invoke the globally resolvable `harness-team` command. The
// source repository runs its local Node entrypoint, so that check cannot prove
// consumer hooks will be able to run.
export async function checkHookCli(env = process.env) {
  try {
    // 5s to match checkSelfCli: both spawn node with this CLI, so a loaded machine
    // that is slow for one is slow for the other. A shorter budget here would report
    // "hooks can't run" for what is only a slow spawn.
    const { stdout } = await pexec('harness-team', ['--help'], { timeout: 5000, env });
    return ['session-context', 'handoff', 'boundary'].every(command =>
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

// Detect an active task that origin/<default> already closed (done-on-main-nudge): the clone kept
// working on a task main had finished. Same verdict as session-context/task; warning string or null.
// `doneOnMain` is injectable for tests (a tmpdir is not a git repo → the default resolves to null).
export async function checkActiveDoneOnMain(targetDir, { doneOnMain = checkDoneOnMain } = {}) {
  let active;
  try { active = JSON.parse(await readFile(join(targetDir, '.harness/active.json'), 'utf8')); }
  catch { return null; }
  if (!active || !active.task) return null;
  let verdict = null;
  try { verdict = await doneOnMain(targetDir, active.user, active.task); } catch { return null; }
  if (!verdict) return null;
  return `active task ${active.user}/${active.task}: ${verdict.ref} 에서 ${verdict.closedAt ?? '(시각 미기록)'} 에 이미 종결됨 — 클론이 main의 종결을 모른 채 이어가는 중일 수 있음`;
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

// Detect a settings.json that predates the SessionStart task-gate (0.9+). init
// (deep-merge) / migrate deliver the hook; a missing one means the project is
// outdated. Soft warning steering to init — does NOT count toward fail (a pre-0.9
// project is legitimate; a hard fail would break its CI). Missing/invalid
// settings.json is already covered by CHECKS, so we stay silent there (no double-fail).
export async function checkSessionStartHook(targetDir) {
  let settings;
  try { settings = JSON.parse(await readFile(join(targetDir, '.claude/settings.json'), 'utf8')); }
  catch { return null; }
  if (settingsHasSessionGate(settings)) return null;
  return 'SessionStart task-gate hook 없음 (0.9+) — run: harness-team init (또는 migrate)';
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
  return '.codex/hooks.json에 harness SessionStart 훅 없음 — Codex 세션이 task context를 못 받음; run: harness-team init';
}

// **설치는 동작이 아니다.** `.codex/hooks.json` 이 있어도 Codex 는 두 신뢰가 모두 있어야 훅을 돌린다
// (2026-09-12 실측, `docs/chad/codex-project-hooks-probe/`):
//   1. 프로젝트 신뢰 — `[projects."<path>"] trust_level = "trusted"`
//   2. 훅 소스 신뢰 — `[hooks.state]` 에 그 hooks.json 경로의 해시
// 하나라도 없으면 **오류 없이 조용히** 실행되지 않는다. 이 저장소에서 6개월간 그랬고 아무도 몰랐다.
// 훅 신뢰는 사용자가 대화형 codex 에서 1회 승인해야 하는 것이라 하네스가 대신 줄 수 없다 — 그래서 경고다.
//
// TOML 을 줄 단위로 읽는다: 이 파일은 codex 가 기계로 쓰고 우리가 보는 두 키는 모두 **섹션 헤더**라
// 파서를 들일 이유가 없다. 읽기 전용이며 사용자 설정을 **절대 수정하지 않는다**.
//
// **한계(알고 남긴다)**: 기록된 `trusted_hash` 가 **현재 파일의 것인지**는 확인하지 못한다 — codex 의
// 해시 계약이 공개돼 있지 않다. 훅을 고친 뒤라면 codex 는 재승인을 요구하는데 이 검사는 여전히
// "신뢰됨"으로 읽는다. 즉 이 경고는 **없는 신뢰를 잡고**, 낡은 신뢰는 놓친다.
export function parseCodexTrust(configToml, { projectPath, trustKeys = [] }) {
  const wanted = new Set(trustKeys);
  const lines = configToml.split('\n');
  let project = false;
  let hookSource = false;
  let inProject = false;
  let inWantedHook = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('#')) continue;                      // 주석은 설정이 아니다
    if (line.startsWith('[')) {
      inProject = line === `[projects."${projectPath}"]`;
      // `[hooks.state."<file>:<event>:<group>:<hook>"]` — **정확히 우리 훅의 키**여야 한다.
      // 경로 접두만 보면 같은 파일의 **다른 훅**(`session_start:1:0`)이 승인된 것만으로 경고가 사라진다
      // (2026-09-12 codex P2). 키 형식은 사용자 전역 파일로 실측했다: SessionStart 5그룹 ↔ `:0:0`~`:4:0`.
      inWantedHook = [...wanted].some(k => line === `[hooks.state."${k}"]`);
      continue;
    }
    if (inProject && /^trust_level\s*=\s*"trusted"/.test(line)) project = true;
    // 헤더만으로는 부족하다 — 승인 기록은 `trusted_hash` 다. 주석 처리된 해시는 위에서 걸러진다.
    if (inWantedHook && /^trusted_hash\s*=\s*"\S+"/.test(line)) hookSource = true;
  }
  return { project, hookSource };
}

// 하네스가 소유한 SessionStart 훅의 신뢰 키를 만든다 — `<hooks.json>:session_start:<group>:<hook>`.
export function harnessCodexTrustKeys(hooks, hooksPath) {
  const groups = hooks?.hooks?.SessionStart;
  if (!Array.isArray(groups)) return [];
  const keys = [];
  groups.forEach((group, gi) => {
    (Array.isArray(group?.hooks) ? group.hooks : []).forEach((hook, hi) => {
      if (hook?.type !== 'command') return;
      // **봉투를 내는 훅만** 센다. `init` 의 배열 union 은 업그레이드 때 옛 훅 옆에 새 훅을 나란히 두는데,
      // 옛 훅의 승인만으로 경고가 사라지면 "승인됐는데 여전히 아무것도 주입되지 않는" 상태가 조용해진다
      // (2026-09-12 codex P2). 옛 훅만 있는 설치는 `checkCodexSessionHook` 이 따로 경고한다.
      if (!isHarnessCodexSessionCommand(hook.command)) return;
      keys.push(`${hooksPath}:session_start:${gi}:${hi}`);
    });
  });
  return keys;
}

export async function checkCodexHookTrust(targetDir, env = process.env) {
  let hooks;
  try { hooks = JSON.parse(await readFile(join(targetDir, '.codex/hooks.json'), 'utf8')); }
  catch { return null; }                                   // 훅이 없으면 이 검사의 대상이 아니다

  const codexHome = env.CODEX_HOME || join(homedir(), '.codex');
  let config;
  try { config = await readFile(join(codexHome, 'config.toml'), 'utf8'); }
  catch { return null; }                                    // codex 설정이 없다 = codex 를 안 쓴다 → 침묵

  // codex 는 realpath 로 적는다(`/tmp` → `/private/tmp`). 둘 다 대조한다.
  const candidates = new Set([targetDir]);
  try { candidates.add(await realpath(targetDir)); } catch { /* 경로가 사라졌으면 원본만 */ }

  let best = { project: false, hookSource: false };
  let sawHarnessHook = false;
  for (const p of candidates) {
    const keys = harnessCodexTrustKeys(hooks, join(p, '.codex/hooks.json'));
    if (!keys.length) continue;                             // 남의 훅만 있는 파일은 우리 관심사가 아니다
    sawHarnessHook = true;
    const t = parseCodexTrust(config, { projectPath: p, trustKeys: keys });
    best = { project: best.project || t.project, hookSource: best.hookSource || t.hookSource };
  }
  if (!sawHarnessHook) return null;
  if (best.project && best.hookSource) return null;

  const missing = [
    !best.project ? '프로젝트 신뢰' : null,
    !best.hookSource ? '훅 소스 신뢰' : null,
  ].filter(Boolean).join('·');
  return `.codex/hooks.json 은 설치됐지만 Codex 가 실행하지 않는다 (${missing} 없음) — `
    + '이 프로젝트에서 대화형 `codex` 를 한 번 띄워 훅 승인을 받으면 이후 세션부터 주입된다; '
    + '승인 없이 확인만 하려면 `codex exec --dangerously-bypass-hook-trust`';
}

// docs/decisions.md is scaffolded with skipExisting (copyStaticAssets), so a project
// that already had the file when the D-log migration shipped never receives the
// upstream D-log sections (DECISION_HEADINGS) — and init cannot deliver them without
// clobbering the team's own log. Warn-level: a missing file is fixable by init (scaffold
// copies it); missing sections need a manual merge from the plugin's
// templates/docs/decisions.md.
export const DECISION_LOG_PATH = 'docs/decisions.md';
export const DECISION_HEADINGS = ['## D2', '## D4', '## D5', '## D6', '## D7', '## D8'];
// Derived so the absence message cannot drift from the list it describes.
const DECISION_IDS = DECISION_HEADINGS.map(h => h.replace(/^## /, '')).join('/');

// Fenced code blocks are dropped before heading detection: a `## D6` line inside a
// ```md example *quotes* a heading, it is not the section — without this the check
// stays silent when the real section is missing (codex P2, 2026-09-05, deferred then).
// Fence semantics follow CommonMark §4.5: opens with ``` or ~~~ (≥3, ≤3 leading spaces),
// closes only with the same char at ≥ the opening length (trailing whitespace only), and an
// unclosed fence runs to the end of the document. A backtick fence's info string may not
// contain a backtick — such a line is prose, not an opener (else it would swallow the rest
// of the log and *invent* missing sections; codex P2 2026-09-09). Line ends are LF, CRLF or
// a bare CR, the same line model the `m`-flag heading regex below already uses. Kept local —
// context.mjs has a near-identical state machine (minus the info-string rule) but does not
// export it, and pulling task.mjs into doctor for two regexes is not worth the import.
const CODE_FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const CODE_FENCE_CLOSE = /^ {0,3}(`+|~+)[ \t]*$/;
function stripFencedCode(text) {
  const kept = [];
  let fence = null;
  for (const line of text.split(/\r\n?|\n/)) {
    if (fence) {
      const close = CODE_FENCE_CLOSE.exec(line);
      if (close && close[1][0] === fence.char && close[1].length >= fence.length) fence = null;
      continue;
    }
    const open = CODE_FENCE_OPEN.exec(line);
    if (open && !(open[1][0] === '`' && open[2].includes('`'))) {
      fence = { char: open[1][0], length: open[1].length };
      continue;
    }
    kept.push(line);
  }
  return kept.join('\n');
}

// `root`(플러그인 루트)를 주면 복사해 올 원본의 **실제 경로**를 안내한다. 없으면 상대 경로로 적는다.
// 누락 절은 init·migrate 어느 쪽도 고치지 못한다 — D8에서 `docs/` seed를 refresh 비목표로
// 두었기 때문이고(팀이 설치 후 저작하는 파일), 그 사실을 문구가 직접 말해 주지 않으면
// 사용자는 방금 stale 템플릿 때문에 돌린 migrate가 이것도 처리했으리라 기대하게 된다.
export async function checkDecisionLog(targetDir, root) {
  let body;
  try {
    body = await readFile(join(targetDir, DECISION_LOG_PATH), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return `${DECISION_LOG_PATH} 없음 — 팀 결정 로그(${DECISION_IDS} 전문)가 프로젝트에 없다; run: harness-team init (플러그인 templates/docs/decisions.md를 스캐폴드)`;
    }
    // A directory or an unreadable file must stay a warning too — a warn-level
    // check crashing doctor before it can emit its envelope defeats its purpose.
    return `${DECISION_LOG_PATH} 읽기 실패(${error?.code ?? error?.message}) — 디렉터리이거나 권한 문제일 수 있다; 파일 상태를 확인하라`;
  }
  // Line-anchored with \b so `## D20` or a mid-line mention cannot satisfy `## D2`,
  // while the template's dated form (`## D2 (2026-06-11) — …`) still matches.
  const prose = stripFencedCode(body);
  const missing = DECISION_HEADINGS.filter(h => !new RegExp(`^${h}\\b`, 'm').test(prose));
  if (missing.length === 0) return null;
  const source = root ? join(root, 'templates/docs/decisions.md') : '플러그인 templates/docs/decisions.md';
  return `${DECISION_LOG_PATH}에 ${missing.join(', ')} 절 없음 — 팀 결정 로그는 설치 후 팀이 저작하는 파일이라 init·migrate 어느 쪽도 덮어쓰지 않는다(D8: docs/ seed는 refresh 비목표). \`${source}\` 에서 해당 절을 복사해 ${DECISION_LOG_PATH} 끝에 덧붙여라 — 이미 있는 절은 건드리지 말 것`;
}

// observe-surfacing: the trip-wire verdict reaches doctor as ONE warn-level line built from the
// same evaluateObserveVerdict the observe CLI uses, so the two cannot disagree. Silent unless
// tripped — not-installed (no hook log; this plugin-dev repo, by D7) / no-data / ok all return
// null, so no pluginDev gate is needed. Any exception is null too: a warn check that throws
// kills doctor before it can emit its envelope (same contract as checkDecisionLog). Warn, never
// fail: the thresholds are uncalibrated (observe.mjs), so a false positive must not break CI.
// The loopback nudge is quoted, not executed — surfacing never creates a task.
export async function checkObserveTripWires(targetDir, { now = new Date() } = {}) {
  let verdict;
  try { verdict = await evaluateObserveVerdict(targetDir, { now }); } catch { return null; }
  if (verdict.status !== 'tripped') return null;
  const wires = verdict.fired.map(wire => `${wire.id}(${tripWireDetail(wire)})`).join(', ');
  return `observe 트립와이어 발화: ${wires} — harness-team observe로 상세 확인; ${observeLoopbackNudge(verdict.fired, verdict.window.to)}`;
}

export async function checkBoundaryCheckpointHook(targetDir) {
  let settings;
  try { settings = JSON.parse(await readFile(join(targetDir, '.claude/settings.json'), 'utf8')); }
  catch { return null; }
  if (settingsHasBoundaryCheckpoint(settings)) return null;
  return 'PreToolUse boundary checkpoint hook 없음(또는 matcher에 Edit|Write 미포함) — run: harness-team init';
}

// The "eager tier" = instruction files loaded into context at EVERY session start,
// unlike lazy-loaded command docs/skills. Every source below was read out of the Claude
// Code binary's own resolution (2.1.251) rather than assumed:
//
//   join(dir, "CLAUDE.md") / join(dir, ".claude", "CLAUDE.md")  -> loaded as "Project"
//   join(CLAUDE_CONFIG_DIR ?? homedir()/".claude", "CLAUDE.md") -> loaded as "User"
//
// AGENTS.md joins them because CLAUDE.md imports it (`@AGENTS.md`), so it is in context
// every session too. The budget is on the SUM: the context window does not care which
// file a byte came from, and a per-file budget would let "each part passes, the total
// does not" slip through green — the blind spot this measurement exists to close.
//
// The budget covers the SUM of all four sources above, and its last term — the user-scope
// file — is machine-local, so no repo-fixed number describes the tier being measured.
// What is fixed here is the project-side portion: 15,968 B (AGENTS.md 11,079 + CLAUDE.md
// 4,889; this repo has no .claude/CLAUDE.md). Against a 24 KiB budget that leaves 8,608 B
// of headroom for whatever the user's own CLAUDE.md carries. Do NOT re-justify this budget
// from the project subtotal alone — sizing a superset budget by a subset measurement is
// the exact defect this check was widened to fix. This is a deterministic
// size check only — the fix (moving procedure to lazy sources) is a human judgment call,
// so it stays warning-only, mirroring the TCC 6 KiB budget philosophy (context.mjs
// CONTEXT_MAX_BYTES).
export const EAGER_TIER_MAX_BYTES = 24 * 1024;

// Claude Code resolves its config home as `CLAUDE_CONFIG_DIR ?? ~/.claude`, and refuses a
// non-absolute value ("the configuration home (CLAUDE_CONFIG_DIR) is not an absolute path").
// Mirror both halves: an unusable value returns null so the user-scope term is skipped
// entirely, rather than resolving relative to cwd and double-counting the project's own
// CLAUDE.md. Same shape as the CLAUDE_PLUGINS_ROOT handling above.
export function globalClaudeMdPath(env = process.env) {
  const configHome = env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude');
  if (!configHome || !isAbsolute(configHome)) return null;
  return join(configHome, 'CLAUDE.md');
}

// A missing or unreadable file contributes 0 bytes and drops out of the breakdown. Both
// are ordinary states (CI, containers, a fresh machine, or a path that is a directory),
// so they stay silent and leave the previous behaviour untouched.
async function eagerTierEntry(path, label, scope) {
  // Read without an encoding: Buffer#length is the raw byte count, which is the
  // UTF-8 size -- no separate Buffer.byteLength re-encode needed.
  const body = await readFile(path).catch(() => null);
  return body ? { path, label, scope, bytes: body.length } : null;
}

// The user-scope file lives outside the project, so it is READ ONLY here -- the harness
// does not write outside the project directory, and this check only measures and reports.
export async function checkEagerTierSize(targetDir, env = process.env) {
  const globalPath = globalClaudeMdPath(env);
  const found = await Promise.all([
    eagerTierEntry(join(targetDir, 'AGENTS.md'), 'AGENTS.md', 'project'),
    eagerTierEntry(join(targetDir, 'CLAUDE.md'), 'CLAUDE.md', 'project'),
    eagerTierEntry(join(targetDir, '.claude', 'CLAUDE.md'), '.claude/CLAUDE.md', 'project'),
    ...(globalPath ? [eagerTierEntry(globalPath, `${globalPath} (전역)`, 'user')] : []),
  ]);

  // Running doctor on the config home itself would otherwise count one file twice.
  const seen = new Set();
  const entries = [];
  for (const entry of found) {
    if (!entry) continue;
    const key = resolve(entry.path);
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(entry);
  }

  const total = entries.reduce((sum, e) => sum + e.bytes, 0);
  if (total <= EAGER_TIER_MAX_BYTES) return null;

  const fmt = n => n.toLocaleString('en-US');
  const breakdown = entries.map(e => `${e.label} ${fmt(e.bytes)} B`).join(' + ');
  // Two different remedies, and pointing the wrong one at the wrong file matters: the
  // user-scope file is not the harness's to restructure, so it gets a fact, not an order.
  // Order them by how many bytes each scope actually contributes -- leading with advice
  // about a tier that did not cause the overage sends the reader to the wrong file.
  const bytesIn = scope => entries.filter(e => e.scope === scope).reduce((sum, e) => sum + e.bytes, 0);
  const advice = [
    { scope: 'project', text: '프로젝트 파일은 절차를 lazy 정본(커맨드 문서·스킬)으로 옮기는 것을 검토하세요.' },
    { scope: 'user', text: '전역 파일은 프로젝트 밖(사용자 소유)이라 하네스가 읽기만 합니다 — 크기만 보고하며 조치는 사용자 판단입니다.' },
  ]
    .filter(a => bytesIn(a.scope) > 0)
    .sort((a, b) => bytesIn(b.scope) - bytesIn(a.scope))
    .map(a => a.text);
  return `eager 계층 ${fmt(total)} B > ${fmt(EAGER_TIER_MAX_BYTES)} B(24 KiB) — 매 세션 무조건 로드되는 지시가 큽니다. 내역: ${breakdown}. ${advice.join(' ')}`;
}

// settings.json의 hook `command`는 세 모양이다(templates/.claude/settings.json):
//   1. ./.claude/hooks/x.sh                                  — 프로젝트 상대경로
//   2. node "${CLAUDE_PROJECT_DIR}/.claude/hooks/x.mjs"      — 변수 접두 경로
//   3. harness-team session-context 2>/dev/null || true      — 전역 CLI + 셸 연산자
// 3번은 하네스가 `|| true`로 스스로 부재를 허용하므로 dangling이 아니다 — 검사하면 오탐이다.
// 어디에도 안 맞는 command는 침묵하지 않고 unknown으로 보고한다: "경고 0"이 "문제 없음"이 아니라
// "검사한 범위 안에서는 문제 없음"을 뜻하게 되는 것이 결함 3의 본질이었다.
// hook `command`에서 **실행 대상**을 뽑아 분류한다.
//
// 처음에는 문자열 어디서든 경로 모양을 찾았는데, 그러면 인자를 실행 대상으로 오인한다 —
// `harness-team session-context --config ./missing.json`이 `missing.json`을 dangling으로
// 신고했다(codex 리뷰 P2). 확장자 휴리스틱도 `.json` 인자를 잡고 확장자 없는 훅은 놓쳤다.
// 그래서 셸 연산자로 자른 뒤 각 세그먼트의 **첫 토큰**(env 대입과 인터프리터는 건너뛴다)만 본다.
const INTERPRETERS = new Set(['node', 'bash', 'sh', 'zsh', 'python', 'python3', 'ruby', 'perl', 'deno', 'bun']);
const ENV_ASSIGN_RE = /^[A-Za-z_][A-Za-z0-9_]*=/;

const stripQuotes = (t) => t.replace(/^["']|["']$/g, '');

// 셸 연산자(&&, ||, ;, |)로 자른다. 붙여 쓴 `./hook.sh&&true`도 갈라진다.
function commandSegments(command) {
  return command.split(/\s*(?:&&|\|\||[;|])\s*/).map(x => x.trim()).filter(Boolean);
}

// 한 세그먼트의 실행 대상 토큰. env 대입을 건너뛰고, 인터프리터면 그 다음 비-플래그 인자를 쓴다.
function executableToken(segment) {
  const tokens = segment.split(/\s+/).map(stripQuotes).filter(Boolean);
  let i = 0;
  while (i < tokens.length && ENV_ASSIGN_RE.test(tokens[i])) i++;
  if (i >= tokens.length) return null;
  const head = tokens[i];
  const base = head.split('/').pop();
  if (INTERPRETERS.has(base)) {
    for (let j = i + 1; j < tokens.length; j++) {
      if (!tokens[j].startsWith('-')) return tokens[j];
    }
    return null;
  }
  return head;
}

// 리다이렉션 잔여물(2>/dev/null 등)은 실행 대상이 아니다.
const isRedirect = (t) => /^\d*[<>]/.test(t);

export function classifyHookCommand(command) {
  if (typeof command !== 'string' || command.trim() === '') return { kind: 'unknown' };
  for (const segment of commandSegments(command)) {
    const target = executableToken(segment);
    if (!target || isRedirect(target)) continue;
    const varMatch = target.match(/^\$\{CLAUDE_PROJECT_DIR\}\/(.+)$/);
    if (varMatch) return { kind: 'project-path', rel: varMatch[1] };
    if (target.startsWith('./')) return { kind: 'project-path', rel: target.slice(2) };
    // 전역 CLI는 경로·따옴표 형태가 무엇이든 basename으로 판정한다
    // (`/usr/local/bin/harness-team`, `"harness-team"` 모두 포함).
    if (target.split('/').pop() === 'harness-team') return { kind: 'global-cli' };
  }
  return { kind: 'unknown' };
}

// unknown command를 원문 그대로 찍으면 `API_TOKEN=… custom-hook`이나 Authorization 헤더가
// doctor 출력(사람·--json)과 수집 로그에 실린다(codex 리뷰 P2). 첫 세그먼트의 실행 대상만
// 보여주고 나머지는 생략한다 — 사람이 어느 훅인지 알기에는 충분하고 비밀값은 나가지 않는다.
export function redactCommand(command) {
  if (typeof command !== 'string') return '(비어 있음)';
  const target = executableToken(commandSegments(command)[0] ?? '');
  if (!target) return '(해석 불가)';
  const shown = target.length > 60 ? `${target.slice(0, 57)}...` : target;
  return `${shown} …(인자 생략)`;
}

export function collectHookCommands(settings) {
  const events = settings?.hooks;
  if (!events || typeof events !== 'object') return [];
  const out = [];
  for (const groups of Object.values(events)) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      for (const hook of group?.hooks ?? []) {
        if (hook?.type === 'command' && typeof hook.command === 'string') out.push(hook.command);
      }
    }
  }
  return out;
}

// settings가 배선한 훅 중 프로젝트 내부 파일을 가리키는 것의 존재를 검사한다.
// CHECKS의 정적 목록과는 다른 축이다: 저쪽은 "파일이 있는가", 이쪽은 "배선이 정합한가".
// 결함 1(migrate가 설치 안 한 훅을 배선) 같은 상태가 여기서 잡힌다.
async function checkWiredHooks(ctx, add) {
  const raw = await readFile(join(ctx.targetDir, '.claude/settings.json'), 'utf8').catch(() => null);
  if (raw === null) return;
  let settings;
  try { settings = JSON.parse(raw); } catch { return; } // 파싱 실패는 기존 json 체크가 이미 보고한다
  for (const command of collectHookCommands(settings)) {
    const c = classifyHookCommand(command);
    if (c.kind === 'global-cli') continue;
    if (c.kind === 'unknown') {
      const safe = redactCommand(command);
      add('hook command', 'warning', `판정 불가 — 이 command가 가리키는 대상을 검사하지 못했습니다: ${safe}`,
        `⚠️  hook command  (판정 불가: ${safe})`);
      continue;
    }
    if (await exists(join(ctx.targetDir, c.rel))) continue;
    add(`hook → ${c.rel}`, 'warning',
      `${c.rel}: settings.json이 배선했지만 파일이 없습니다 (dangling) — run: harness-team init`,
      `⚠️  hook → ${c.rel}  (settings.json이 배선했지만 파일 없음 — run: harness-team init)`);
  }
}

const CHECKS = [
  { path: 'AGENTS.md', required: true, realFile: true, contains: 'harness:section="protocol"' },
  { path: 'CLAUDE.md', required: true, realFile: true, contains: '@AGENTS.md' },
  { path: '.claude/settings.json', required: true, json: true },
  { path: '.claude/hooks/protect-files.sh', executable: true },
  { path: '.claude/hooks/block-dangerous-git.sh', executable: true },
  { path: '.claude/hooks/boundary-checkpoint.sh', executable: true },
  { path: '.claude/hooks/auto-format.sh', executable: true },
  { path: '.claude/hooks/pre-commit-check.sh', executable: true },
  // Run by node, so no exec bit — but it is the sixth wired hook, and a missing copy
  // means observability silently records nothing.
  { path: '.claude/hooks/observe-tools.mjs' },
  { path: '.cursor/rules', required: false, dir: true },
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

  await checkWiredHooks(ctx, add);

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

  // Active task already closed on origin/<default> (⚠️, advisory — does not count toward fail).
  const doneOnMainWarning = await checkActiveDoneOnMain(ctx.targetDir);
  if (doneOnMainWarning) {
    add('done on main', 'warning', doneOnMainWarning, `\n⚠️ ${doneOnMainWarning}`);
    line(`hint: 재개하려면 main을 가져온 뒤 \`harness-team task <name>\`으로 다시 연다(reopened) — 아니면 harness-team list 로 다른 task를 고른다`);
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

  // 훅이 **있는데 안 도는** 경우. pluginDev 여부와 무관하게 본다 — 이 저장소 자신도 그 상태였다.
  const codexTrustWarning = codexHookWarning ? null : await checkCodexHookTrust(ctx.targetDir);
  if (codexTrustWarning) add('Codex hook trust', 'warning', codexTrustWarning, `\n⚠️ ${codexTrustWarning}`);

  // Deliberately NOT gated on pluginDev: the D-log migration puts docs/decisions.md
  // in the source repo too, so its absence is real drift on either side.
  const decisionLogWarning = await checkDecisionLog(ctx.targetDir, ctx.root);
  if (decisionLogWarning) add('decision log', 'warning', decisionLogWarning, `\n⚠️ ${decisionLogWarning}`);

  // Not gated on pluginDev: a repo without the hook's log is `not-installed`, which is
  // silent on its own (observe-surfacing spec, 설계 절).
  const observeWarning = await checkObserveTripWires(ctx.targetDir);
  if (observeWarning) add('observe trip wires', 'warning', observeWarning, `\n⚠️ ${observeWarning}`);

  // Deliberately NOT gated on pluginDev either — this repo's own eager tier is the
  // reason the 24 KiB budget was picked, so it must be measured here too.
  const eagerTierWarning = await checkEagerTierSize(ctx.targetDir);
  if (eagerTierWarning) add('eager tier size', 'warning', eagerTierWarning, `\n⚠️ ${eagerTierWarning}`);

  // init copies skills/rules with skipExisting, so a *modified* template never reaches an
  // existing install — only migrate's refresh delivers it. Without this warning that path
  // stays undiscoverable, which is why the drift went unnoticed for months. plugin-dev is
  // the source of the templates, not an install of them, so it is skipped there.
  const staleTemplates = pluginDev ? [] : await findStaleTemplates(ctx);
  if (staleTemplates.length) {
    const detail = `설치된 스킬·규칙 ${staleTemplates.length}개가 최신 템플릿보다 낡음: ${staleTemplates.sort().join(', ')} — \`harness-team migrate\`로 갱신 (사용자가 편집한 파일은 건드리지 않는다)`;
    add('stale skill/rule templates', 'warning', detail, `\n⚠️ ${detail}`);
  }

  // Not gated on pluginDev: a rule without provenance is drift wherever it lives —
  // and this repo ships no .claude/rules of its own, so the source tree stays silent.
  // stock 규칙은 제외한다 — 위 stale 경고가 올바른 처방(migrate)과 함께 이미 보고했고,
  // 여기서 "스탬프를 찍어라"까지 내면 같은 파일에 상충하는 지시가 두 개 나간다.
  const provenanceWarning = await checkRuleProvenance(ctx.targetDir, {
    isKnownStock: (rel, content) => isKnownStockTemplate(`.claude/rules/${rel}`, content),
  });
  if (provenanceWarning) add('rule provenance', 'warning', provenanceWarning, `\n⚠️ ${provenanceWarning}`);

  // Like the hook-presence checks above, this is consumer-only. plugin-dev uses
  // `node bin/harness-team.mjs` and deliberately does not install consumer hooks.
  let hookCliOk = null;
  if (!pluginDev) {
    hookCliOk = await checkHookCli();
    if (!hookCliOk) {
      const detail = `PATH의 harness-team이 실행되지 않거나 session-context/handoff/boundary를 지원하지 않음 — SessionStart/post-commit/boundary 훅이 실행되지 않음; ${hookCliInstall}로 전역 CLI를 링크하거나 Claude Code 플러그인 경로를 PATH에 추가`;
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
    // A decision log that is missing outright is delivered by init's scaffold;
    // one that exists without the D-sections is not (skipExisting) — no command
    // fixes it, so only the missing-file case earns the init action.
    const decisionLogNeedsScaffold = decisionLogWarning
      && !(await exists(join(ctx.targetDir, DECISION_LOG_PATH)));
    if (legacyWarning) warnActions.push('harness-team migrate');
    if (specGateWarning) warnActions.push('harness-team task <name>');
    if (hookWarning || boundaryHookWarning || decisionLogNeedsScaffold) warnActions.push('harness-team init');
    // jq warning always carries its remedy; the fail-open branch additionally needs
    // migrate — installing jq alone leaves the stale hooks' precision degraded forever.
    if (jqGaps.length) warnActions.push('harness-team migrate');
    if (staleTemplates.length) warnActions.push('harness-team migrate');
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
      error: fail ? buildErrorPacket({
        cause: `${fail}개 필수 점검 항목 실패 (checks[]의 status:"fail" 참조)`,
        retry: 'checks[]의 fail 항목을 해소한 뒤 harness-team sync 실행 후 재점검',
        alternatives: ['구조가 구버전이면 `harness-team migrate`, 파일이 아예 없으면 `harness-team init` 으로 복구한다'],
        safeDefault: 'doctor는 읽기 전용이다 — 아무것도 고치지 않고 실패 목록만 남긴다',
        stop: '필수 파일/스크립트 누락이면 harness-team init 또는 migrate로 복구',
      }) : null,
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

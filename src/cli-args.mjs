// Argument contract for `bin/harness-team.mjs`.
//
// This module exists because the CLI used to answer `--help` only when it sat in
// the command slot: `harness-team release --help` parsed `help` as an ordinary
// boolean flag, fell through to the router, and performed a real patch release.
// Every agent and human who probes an unfamiliar CLI with `--help` triggered it,
// and the same hole made a typo (`--dryrun`) a live release too, because unknown
// flags were silently accepted as `true`.
//
// The fix is to resolve the whole invocation up front and answer help/version or
// reject bad flags *before* the caller builds a context or touches the router.
// `resolveInvocation` is pure, so the guard can be tested by asserting on its
// return value instead of spawning a command that would mutate the repo if the
// guard ever regressed.

export const VALUE_FLAGS = new Set(['stack', 'member', 'target', 'backup-dir', 'backup-parent']);

// Accepted on every command: they change where the harness looks or how it
// reports, not what it does. Keeping them global means a hook can pass --target
// to any subcommand without the registry having to enumerate it per command.
export const GLOBAL_FLAGS = ['target', 'member', 'yes', 'json'];

// Only the commands that pass an override into `resolveBackupDir` list
// `backup-dir`; `backup-parent` is read by init/apply alone. `backup` and
// `migrate` call `loadBackupDir` and ignore both, so they must not advertise
// them — a flag that is accepted and then ignored is the same silent-default
// failure this module exists to remove.
const BACKUP_DIR_FLAG = ['backup-dir'];
const INIT_FLAGS = ['backup-dir', 'backup-parent', 'stack', 'no-backup', 'gitignore-ai', 'no-gitignore-ai'];

// Single source for the command table: `--help` renders from `summary`, flag
// validation reads `flags`. A flag that is not listed here cannot be passed,
// so an accepted flag and a documented flag are the same thing by construction.
export const COMMANDS = [
  { name: 'init', args: '[dir]', summary: 'Scaffold a new project with the full harness', flags: INIT_FLAGS },
  // apply is `runInit` under a different verb (src/commands/apply.mjs), so it
  // takes exactly the same flags.
  { name: 'apply', args: '[dir]', summary: 'Apply the harness to an existing project (non-destructive)', flags: INIT_FLAGS },
  { name: 'backup', args: '[dir]', summary: 'Move harness items to backup dir and replace with symlinks',
    flags: [] },
  { name: 'clone', args: '[dir]', summary: 'Sync project items to backup dir (merge, newer-wins)',
    flags: BACKUP_DIR_FLAG },
  { name: 'symlink', args: '[dir]', summary: 'Create backup→project symlinks',
    flags: BACKUP_DIR_FLAG },
  { name: 'delete', args: '[dir]', summary: 'Remove harness symlinks from project',
    flags: [...BACKUP_DIR_FLAG, 'include-real'] },
  { name: 'migrate', args: '[dir]', summary: 'Migrate to latest: backup scripts → root, task structure (→0.6, →0.7 artifact.md split)',
    flags: [] },
  { name: 'upgrade', args: '[dir]', summary: 'Migrate real files → symlinks in one step (v0.3.x → v0.4+)',
    flags: BACKUP_DIR_FLAG },
  { name: 'sync', args: '[dir]', summary: 'Re-sync symlinks, cursor rules, opencode config', flags: [] },
  { name: 'doctor', args: '[dir]', summary: 'Diagnose harness integrity', flags: [] },
  { name: 'task', args: '<name>', summary: 'Create or activate a task', flags: [] },
  { name: 'list', args: '', summary: 'List all tasks', flags: [] },
  { name: 'summary', args: '[--write|--check] [--force]',
    summary: 'Render the task ledger from task dirs (--write is default-branch only)',
    flags: ['write', 'check', 'force'] },
  { name: 'done', args: '[--force]', summary: 'Complete the active task (--force bypasses the completion guard)',
    flags: ['force'] },
  { name: 'handoff', args: '', summary: 'Update handoff from latest commit (post-commit hook)', flags: [] },
  { name: 'context', args: '<init|check>', summary: "Initialize or validate the active task's Context Card", flags: [] },
  { name: 'boundary', args: 'check', summary: 'Compare declared JSON Schema producer/consumer boundaries', flags: [] },
  { name: 'session-context', args: '', summary: 'Emit bounded SessionStart Context Card or no-task nudge', flags: [] },
  { name: 'retro', args: '[text]', summary: "Append a dated Learnings entry to the active task's artifact.md", flags: [] },
  { name: 'release', args: '[patch|minor|major|x.y.z] [--dry-run] [--skip-cache]',
    summary: 'Bump 4 manifests + sync plugin cache/marketplace/installed_plugins.json',
    flags: ['dry-run', 'skip-cache'] },
  { name: 'help', args: '[command]', summary: 'Show this help, or one command’s usage', flags: [] },
];

const BY_NAME = new Map(COMMANDS.map(command => [command.name, command]));

export function findCommand(name) {
  return BY_NAME.get(name) ?? null;
}

const OPTIONS_HELP = `Options:
  --help, -h           Show usage for the CLI or a command — never runs the command
  --version, -v        Print the installed harness-team version
  --stack <name>       Force stack (react-native|react|next|node|python|generic)
  --yes                Non-interactive
  --member <name>      Override member (default: git config user.name, else $USER)
  --no-backup          Skip backup dir setup entirely (init/apply only)
  --target <dir>       Target directory (default: cwd)
  --gitignore-ai       Add AI tool entries to .gitignore without prompting
  --no-gitignore-ai    Skip AI gitignore entries without prompting
  --json               Structured JSON envelope output for drive commands (task/retro/release/doctor)`;

// `doctor` proves the hook CLI is reachable by matching `session-context` and
// `handoff` at the start of a line in this output, so the two-space indent is a
// contract, not cosmetics (tests/doctor.test.mjs).
function commandLine(command) {
  const invocation = command.args ? `${command.name} ${command.args}` : command.name;
  return `  ${invocation.padEnd(32)}${invocation.length > 32 ? '   ' : '  '}${command.summary}`;
}

export function renderHelp() {
  return `harness-team — Claude-led team harness for multi-agent projects

Usage:
  harness-team <command> [options]

Commands:
${COMMANDS.map(commandLine).join('\n')}

${OPTIONS_HELP}
`;
}

export function renderCommandHelp(command) {
  const accepted = [...command.flags, ...GLOBAL_FLAGS].sort();
  const invocation = command.args ? `${command.name} ${command.args}` : command.name;
  return `harness-team ${invocation}

  ${command.summary}

Flags:
${accepted.map(flag => `  --${flag}`).join('\n')}
  --help, -h
`;
}

export function parseArgs(argv) {
  const out = { cmd: argv[0], positional: [], flags: {}, helpRequested: false, error: null };
  let literal = false;
  for (let i = 1; i < argv.length; i++) {
    const token = argv[i];
    // `--` ends flag parsing so free text can start with a dash — `retro --
    // --help` records the words, it does not print usage.
    if (literal) { out.positional.push(token); continue; }
    if (token === '--') { literal = true; continue; }
    if (token === '--help' || token === '-h') { out.helpRequested = true; continue; }
    if (!token.startsWith('--')) {
      out.positional.push(token);
      continue;
    }
    const separator = token.indexOf('=');
    const name = separator === -1 ? token.slice(2) : token.slice(2, separator);
    const inline = separator === -1 ? undefined : token.slice(separator + 1);
    if (VALUE_FLAGS.has(name)) {
      // A value flag left dangling used to become `true`, which then reached
      // path resolution as a boolean and crashed with an unrelated TypeError.
      // The next token is never swallowed when it is itself a flag, so
      // `--target --help` records the error and still reaches the help check.
      const next = inline ?? argv[i + 1];
      if (next === undefined || (inline === undefined && next.startsWith('--'))) {
        out.error ??= `--${name} requires a value`;
        continue;
      }
      if (inline === undefined) i++;
      out.flags[name] = next;
    } else {
      out.flags[name] = inline ?? true;
    }
  }
  return out;
}

// Negations the parser rewrites before dispatch: the command reads one key, so
// it never sees the name the caller typed. Declared here so a test can tell
// "this flag is deliberately renamed" apart from "this flag is ignored".
export const FLAG_ALIASES = new Map([['no-gitignore-ai', 'gitignore-ai']]);

// Normalization runs after validation so an error message names the flag the
// caller actually typed.
function normalize(flags) {
  const out = { ...flags };
  for (const [alias, target] of FLAG_ALIASES) {
    if (out[alias] === undefined) continue;
    out[target] = false;
    delete out[alias];
  }
  return out;
}

export function unknownFlags(command, flags) {
  const accepted = new Set([...command.flags, ...GLOBAL_FLAGS]);
  return Object.keys(flags).filter(flag => !accepted.has(flag));
}

// Returns what the invocation *is* without performing it. `kind: 'run'` is the
// only outcome that reaches the router.
export function resolveInvocation(argv) {
  const head = argv[0];
  if (argv.length === 0 || head === '--help' || head === '-h') return { kind: 'help', text: renderHelp() };
  if (head === '--version' || head === '-v') return { kind: 'version' };
  if (head === 'help') {
    const requested = findCommand(argv[1]);
    return requested && requested.name !== 'help'
      ? { kind: 'help', text: renderCommandHelp(requested) }
      : { kind: 'help', text: renderHelp() };
  }

  const command = findCommand(head);
  // An unknown command exits 1 whether or not `--help` follows. Nothing can run
  // either way, and one code for "no such command" beats a code that depends on
  // the rest of the argv.
  if (!command) {
    return { kind: 'error', code: 1, message: `Unknown command: ${head}`, text: renderHelp() };
  }

  const parsed = parseArgs(argv);
  // Help is answered wherever it appears in the argv — `release --help` is a
  // request for usage, not a release — and it outranks parse and flag errors,
  // because asking how to use a command has to work while the argv is wrong.
  // Only a `--help` consumed as a flag counts: after `--`, or as the value of
  // `--target`, it is data.
  if (parsed.helpRequested) return { kind: 'help', text: renderCommandHelp(command) };
  if (parsed.error) {
    return { kind: 'error', code: 2, message: `${command.name}: ${parsed.error}`, text: renderCommandHelp(command) };
  }

  const unknown = unknownFlags(command, parsed.flags);
  if (unknown.length > 0) {
    // Exit before dispatch: a mistyped flag on `release` or `delete` would
    // otherwise run the command with its defaults, which is destructive.
    return {
      kind: 'error',
      code: 2,
      message: `${command.name}: unknown flag ${unknown.map(flag => `--${flag}`).join(', ')}`,
      text: renderCommandHelp(command),
    };
  }

  return { kind: 'run', cmd: command.name, positional: parsed.positional, flags: normalize(parsed.flags) };
}

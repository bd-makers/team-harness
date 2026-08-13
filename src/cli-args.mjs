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

// Backup-architecture commands share the backup dir resolution helpers, so they
// share its flags.
const BACKUP_FLAGS = ['backup-dir', 'backup-parent'];

// Single source for the command table: `--help` renders from `summary`, flag
// validation reads `flags`. A flag that is not listed here cannot be passed,
// so an accepted flag and a documented flag are the same thing by construction.
export const COMMANDS = [
  { name: 'init', args: '[dir]', summary: 'Scaffold a new project with the full harness',
    flags: [...BACKUP_FLAGS, 'stack', 'no-backup', 'gitignore-ai', 'no-gitignore-ai'] },
  { name: 'apply', args: '[dir]', summary: 'Apply the harness to an existing project (non-destructive)',
    flags: [...BACKUP_FLAGS, 'stack', 'no-backup', 'gitignore-ai', 'no-gitignore-ai'] },
  { name: 'backup', args: '[dir]', summary: 'Move harness items to backup dir and replace with symlinks',
    flags: BACKUP_FLAGS },
  { name: 'clone', args: '[dir]', summary: 'Sync project items to backup dir (merge, newer-wins)',
    flags: BACKUP_FLAGS },
  { name: 'symlink', args: '[dir]', summary: 'Create backup→project symlinks',
    flags: BACKUP_FLAGS },
  { name: 'delete', args: '[dir]', summary: 'Remove harness symlinks from project',
    flags: [...BACKUP_FLAGS, 'include-real'] },
  { name: 'migrate', args: '[dir]', summary: 'Migrate to latest: backup scripts → root, task structure (→0.6, →0.7 artifact.md split)',
    flags: BACKUP_FLAGS },
  { name: 'upgrade', args: '[dir]', summary: 'Migrate real files → symlinks in one step (v0.3.x → v0.4+)',
    flags: BACKUP_FLAGS },
  { name: 'sync', args: '[dir]', summary: 'Re-sync symlinks, cursor rules, opencode config', flags: [] },
  { name: 'doctor', args: '[dir]', summary: 'Diagnose harness integrity', flags: [] },
  { name: 'task', args: '<name>', summary: 'Create or activate a task', flags: [] },
  { name: 'list', args: '', summary: 'List all tasks', flags: [] },
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
  const out = { cmd: argv[0], positional: [], flags: {}, error: null };
  for (let i = 1; i < argv.length; i++) {
    const token = argv[i];
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
      const value = inline ?? argv[++i];
      if (value === undefined || value.startsWith('--')) {
        out.error = `--${name} requires a value`;
        return out;
      }
      out.flags[name] = value;
    } else {
      out.flags[name] = inline ?? true;
    }
  }
  return out;
}

// `--no-gitignore-ai` is the negation of `--gitignore-ai`, and init reads the
// single normalized key. Normalization runs after validation so the error
// message names the flag the caller actually typed.
function normalize(flags) {
  const out = { ...flags };
  if (out['no-gitignore-ai'] !== undefined) {
    out['gitignore-ai'] = false;
    delete out['no-gitignore-ai'];
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
  // Scanned across the whole argv, not just the command slot: `release --help`
  // is a request for usage, and answering it must not depend on where it sits.
  if (argv.includes('--help') || argv.includes('-h')) {
    const command = findCommand(argv[0]);
    return command && command.name !== 'help'
      ? { kind: 'help', text: renderCommandHelp(command) }
      : { kind: 'help', text: renderHelp() };
  }
  if (argv[0] === '--version' || argv[0] === '-v') return { kind: 'version' };
  if (argv.length === 0 || argv[0] === 'help') {
    const requested = findCommand(argv[1]);
    return requested && requested.name !== 'help'
      ? { kind: 'help', text: renderCommandHelp(requested) }
      : { kind: 'help', text: renderHelp() };
  }

  const parsed = parseArgs(argv);
  const command = findCommand(parsed.cmd);
  if (!command) {
    return { kind: 'error', code: 1, message: `Unknown command: ${parsed.cmd}`, text: renderHelp() };
  }
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

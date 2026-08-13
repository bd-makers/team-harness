import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, chmod } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  cliDriftWarning,
  cliDriftAction,
  installedHarnessVersion,
  normalizeVersion,
  readPathCliVersion,
  checkCliDrift,
  HOOK_CLI_MARKETPLACE_DIR,
  VERSION_FLAG_SINCE,
} from '../src/commands/doctor.mjs';
import { release, marketplaceStaleHints } from '../src/commands/release.mjs';

const PLUGIN = 'harness-aijient-team';
const KEY = `${PLUGIN}@${HOOK_CLI_MARKETPLACE_DIR}`;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pexec = promisify(execFile);

function installedFixture(version) {
  return { version: 3, plugins: { [KEY]: [{ scope: 'user', version, installPath: 'x' }] } };
}

// The incident this check exists for: installed_plugins.json said 0.15.1 while
// PATH resolved to a 0.14.0 binary, and every hook ran the old code in silence.
test('cli-drift: a PATH CLI that disagrees with the installed plugin warns', () => {
  const warning = cliDriftWarning({
    pathCli: { state: 'version', version: '0.14.0' },
    installedVersion: '0.15.1',
    installCommand: 'npm i -g "/x"',
  });
  assert.match(warning, /0\.14\.0/);
  assert.match(warning, /0\.15\.1/);
});

test('cli-drift: matching versions are silent', () => {
  assert.equal(cliDriftWarning({
    pathCli: { state: 'version', version: '0.15.1' },
    installedVersion: '0.15.1',
    installCommand: 'x',
  }), null);
});

// Ahead is drift too — a PATH CLI newer than the installed record means the two
// still disagree, so this is reported as a mismatch rather than "older than".
test('cli-drift: a PATH CLI ahead of the installed plugin also warns', () => {
  assert.match(cliDriftWarning({
    pathCli: { state: 'version', version: '0.16.0' },
    installedVersion: '0.15.1',
    installCommand: 'x',
  }), /0\.16\.0/);
});

// `--version` landed in 0.15.1, so silence dates the binary — but only when the
// installed side is new enough for that inference to hold.
test('cli-drift: a --version-less CLI is conclusive only past the flag version', () => {
  const legacy = { state: 'legacy' };
  assert.match(
    cliDriftWarning({ pathCli: legacy, installedVersion: VERSION_FLAG_SINCE, installCommand: 'x' }),
    /--version/,
  );
  assert.equal(
    cliDriftWarning({ pathCli: legacy, installedVersion: '0.14.0', installCommand: 'x' }),
    null,
    'both sides predate --version — nothing can be concluded, so stay quiet',
  );
});

test('cli-drift: nothing to compare stays quiet', () => {
  const pathCli = { state: 'version', version: '0.15.1' };
  assert.equal(cliDriftWarning({ pathCli, installedVersion: null, installCommand: 'x' }), null);
  assert.equal(cliDriftWarning({ pathCli: { state: 'missing' }, installedVersion: '0.15.1', installCommand: 'x' }), null);
  assert.equal(
    cliDriftWarning({ pathCli: { state: 'unknown' }, installedVersion: '0.15.1', installCommand: 'x' }),
    null,
    'a CLI that never got to answer must not be dated by its silence',
  );
});

// A prerelease install is past the --version floor; Number('2-rc') is not.
test('cli-drift: a prerelease install still dates a --version-less CLI', () => {
  assert.match(
    cliDriftWarning({ pathCli: { state: 'legacy' }, installedVersion: '0.15.2-rc.1', installCommand: 'x' }),
    /--version/,
  );
});

// A current CLI that decorates its output must not be reported as drift.
test('cli-drift: decorated version output is normalized before comparing', () => {
  assert.equal(normalizeVersion('v0.15.1\n'), '0.15.1');
  assert.equal(normalizeVersion('harness-team 0.15.1 (build 3)'), '0.15.1');
  assert.equal(normalizeVersion('0.15.2-rc.1'), '0.15.2-rc.1');
  assert.equal(normalizeVersion('no version here'), null);

  assert.equal(cliDriftWarning({
    pathCli: { state: 'version', version: normalizeVersion('v0.15.1') },
    installedVersion: '0.15.1',
    installCommand: 'x',
  }), null);
});

test('cli-drift: the JSON remediation is a runnable command', () => {
  const action = cliDriftAction({ CLAUDE_PLUGINS_ROOT: '/plugins' });
  assert.match(action, /^git -C "\/plugins\/marketplaces\/.+" pull$/);
});

test('cli-drift: the installed record is found by its marketplace half', () => {
  assert.equal(installedHarnessVersion(installedFixture('0.15.1')), '0.15.1');
  assert.equal(installedHarnessVersion({ plugins: { 'other@other-marketplace': [{ version: '9.9.9' }] } }), null);
  assert.equal(installedHarnessVersion({}), null);
  assert.equal(installedHarnessVersion({ plugins: { [KEY]: [] } }), null);
});

// Distinguishing "absent" from "too old to answer" matters because the fixes
// differ — install the CLI vs refresh the source it is linked to.
test('cli-drift: readPathCliVersion separates absent from pre-0.15.1', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-drift-path-'));
  try {
    const env = { ...process.env, PATH: dir };
    assert.deepEqual(await readPathCliVersion(env), { state: 'missing' });

    const shim = join(dir, 'harness-team');
    await writeFile(shim, '#!/bin/sh\necho "Unknown command: --version" >&2\nexit 1\n');
    await chmod(shim, 0o755);
    assert.deepEqual(await readPathCliVersion(env), { state: 'legacy' });

    await writeFile(shim, '#!/bin/sh\necho 0.15.1\n');
    await chmod(shim, 0o755);
    assert.deepEqual(await readPathCliVersion(env), { state: 'version', version: '0.15.1' });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// A binary that could not run says nothing about its version. Dating it by that
// silence would warn "your CLI is pre-0.15.1" at someone whose real problem is a
// permission bit or a missing interpreter.
test('cli-drift: an unrunnable CLI is unknown, not legacy', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-drift-broken-'));
  try {
    const env = { ...process.env, PATH: dir };
    const shim = join(dir, 'harness-team');

    await writeFile(shim, '#!/bin/sh\necho 0.15.1\n');
    await chmod(shim, 0o644);
    assert.deepEqual(await readPathCliVersion(env), { state: 'missing' }, 'not executable → cannot run it');

    // 127 is "the wrapper ran but could not find what it wraps" — a `#!/usr/bin/env
    // node` entrypoint on a PATH without node. The CLI never answered, so its
    // version is unknown; calling it pre-0.15.1 would name the wrong problem.
    await writeFile(shim, '#!/bin/sh\nexit 127\n');
    await chmod(shim, 0o755);
    assert.deepEqual(await readPathCliVersion(env), { state: 'unknown' });

    // Ran and rejected the flag — that, and only that, dates the binary.
    await writeFile(shim, '#!/bin/sh\nexit 1\n');
    assert.deepEqual(await readPathCliVersion(env), { state: 'legacy' });

    // Exited 0 but said nothing version-shaped: also not a statement about age.
    await writeFile(shim, '#!/bin/sh\necho "harness-team"\n');
    assert.deepEqual(await readPathCliVersion(env), { state: 'unknown' });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// The check must run on the maintainer's machine, where plugin-dev mode would
// otherwise skip it — so it reads the plugins root directly rather than riding
// on the consumer-only hook branch.
test('cli-drift: checkCliDrift reads the plugins root end to end', async () => {
  const pluginsRoot = await mkdtemp(join(tmpdir(), 'harness-drift-root-'));
  const binDir = await mkdtemp(join(tmpdir(), 'harness-drift-bin-'));
  try {
    await writeFile(join(pluginsRoot, 'installed_plugins.json'), JSON.stringify(installedFixture('0.15.1')));
    const shim = join(binDir, 'harness-team');
    await writeFile(shim, '#!/bin/sh\necho 0.14.0\n');
    await chmod(shim, 0o755);
    const env = { ...process.env, PATH: binDir, CLAUDE_PLUGINS_ROOT: pluginsRoot };

    assert.match(await checkCliDrift(env), /0\.14\.0/);

    await writeFile(shim, '#!/bin/sh\necho 0.15.1\n');
    assert.equal(await checkCliDrift(env), null);
  } finally {
    await rm(pluginsRoot, { recursive: true, force: true });
    await rm(binDir, { recursive: true, force: true });
  }
});

test('cli-drift: a missing or unreadable plugins root is not an error', async () => {
  const pluginsRoot = await mkdtemp(join(tmpdir(), 'harness-drift-empty-'));
  try {
    const env = { ...process.env, CLAUDE_PLUGINS_ROOT: pluginsRoot };
    assert.equal(await checkCliDrift(env), null);
    await writeFile(join(pluginsRoot, 'installed_plugins.json'), '{ not json');
    assert.equal(await checkCliDrift(env), null);
  } finally {
    await rm(pluginsRoot, { recursive: true, force: true });
  }
});

// End to end through the real CLI (doctor is read-only, so spawning it is safe).
// This is the only test that proves the two things unit tests cannot: that the
// check is not swallowed by the plugin-dev gate the way every consumer-only
// check around it is, and that the warning reaches next_actions instead of
// leaving an agent with a problem and no command.
test('cli-drift: doctor reports drift in a plugin-dev repo, with a remedy', async () => {
  const binDir = await mkdtemp(join(tmpdir(), 'harness-drift-e2e-'));
  try {
    const shim = join(binDir, 'harness-team');
    await writeFile(shim, '#!/bin/sh\necho 0.0.1\n');
    await chmod(shim, 0o755);
    const env = { ...process.env, PATH: `${binDir}:${process.env.PATH}` };
    const bin = join(ROOT, 'bin/harness-team.mjs');

    const { stdout } = await pexec('node', [bin, 'doctor', '--json'], { env, timeout: 30000 })
      .catch(error => ({ stdout: error.stdout || '' }));
    const envelope = JSON.parse(stdout);
    assert.equal(envelope.mode, 'plugin-dev', 'this repo is plugin-dev — the gate must not apply here');
    const drift = envelope.checks.find(c => /drift/.test(c.label));
    assert.ok(drift, 'the drift check must run in plugin-dev mode');
    assert.equal(drift.status, 'warning');
    assert.ok(
      envelope.next_actions.some(action => action.includes('marketplaces')),
      `a drift warning must carry a remedy — got ${JSON.stringify(envelope.next_actions)}`,
    );

    // Text mode must not overwrite the warning it just printed with a green bill.
    const text = await pexec('node', [bin, 'doctor'], { env, timeout: 30000 })
      .then(r => r.stdout)
      .catch(error => error.stdout || '');
    assert.match(text, /warning\(s\)\./);
    assert.doesNotMatch(text, /All checks passed/);
  } finally {
    await rm(binDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// release side. Exercised through release() with temp roots — never by invoking
// the CLI, which would perform a real release of this repo.
// ---------------------------------------------------------------------------

async function makeRoot(version) {
  const root = await mkdtemp(join(tmpdir(), 'harness-drift-repo-'));
  await mkdir(join(root, '.claude-plugin'), { recursive: true });
  await mkdir(join(root, '.codex-plugin'), { recursive: true });
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: PLUGIN, version }, null, 2) + '\n');
  await writeFile(join(root, '.claude-plugin/plugin.json'), JSON.stringify({ name: PLUGIN, version }, null, 2) + '\n');
  await writeFile(
    join(root, '.claude-plugin/marketplace.json'),
    JSON.stringify({ name: HOOK_CLI_MARKETPLACE_DIR, plugins: [{ name: PLUGIN, version }] }, null, 2) + '\n',
  );
  await writeFile(join(root, '.codex-plugin/plugin.json'), JSON.stringify({ name: PLUGIN, version }, null, 2) + '\n');
  return root;
}

async function makePluginsRoot(cloneVersion) {
  const pluginsRoot = await mkdtemp(join(tmpdir(), 'harness-drift-pr-'));
  await writeFile(join(pluginsRoot, 'installed_plugins.json'), JSON.stringify(installedFixture('1.2.3'), null, 2) + '\n');
  if (cloneVersion) {
    const clone = join(pluginsRoot, 'marketplaces', HOOK_CLI_MARKETPLACE_DIR);
    await mkdir(clone, { recursive: true });
    await writeFile(join(clone, 'package.json'), JSON.stringify({ name: PLUGIN, version: cloneVersion }, null, 2) + '\n');
  }
  return pluginsRoot;
}

test('release: a clone left behind at an older version is reported', async () => {
  const root = await makeRoot('1.2.3');
  const pluginsRoot = await makePluginsRoot('1.0.0');
  try {
    const res = await release({ bump: 'patch', root, pluginsRoot, gitSha: 'x' });
    assert.equal(res.newVersion, '1.2.4');
    assert.equal(res.marketplaceStaleVersion, '1.0.0');
    assert.equal(res.marketplaceStaleDir, join(pluginsRoot, 'marketplaces', HOOK_CLI_MARKETPLACE_DIR));

    const hints = marketplaceStaleHints(res);
    assert.equal(hints.length, 2);
    assert.match(hints[0], /1\.0\.0/);
    assert.match(hints[1], /marketplace update|git -C/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pluginsRoot, { recursive: true, force: true });
  }
});

test('release: a clone already on the new version says nothing', async () => {
  const root = await makeRoot('1.2.3');
  const pluginsRoot = await makePluginsRoot('1.2.4');
  try {
    const res = await release({ bump: 'patch', root, pluginsRoot, gitSha: 'x' });
    assert.equal(res.marketplaceStaleDir, undefined);
    assert.deepEqual(marketplaceStaleHints(res), []);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pluginsRoot, { recursive: true, force: true });
  }
});

test('release: no clone on disk is not a stale clone', async () => {
  const root = await makeRoot('1.2.3');
  const pluginsRoot = await makePluginsRoot(null);
  try {
    const res = await release({ bump: 'patch', root, pluginsRoot, gitSha: 'x' });
    assert.equal(res.marketplaceStaleVersion, null);
    assert.deepEqual(marketplaceStaleHints(res), []);
    // release still wrote the catalog manifest it owns.
    const synced = JSON.parse(await readFile(
      join(pluginsRoot, 'marketplaces', HOOK_CLI_MARKETPLACE_DIR, '.claude-plugin/marketplace.json'), 'utf8'));
    assert.equal(synced.plugins[0].version, '1.2.4');
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pluginsRoot, { recursive: true, force: true });
  }
});

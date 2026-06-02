import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { release } from '../src/commands/release.mjs';

const PLUGIN = 'harness-aijient-team';
const MARKET = 'harness-aijient-team-marketplace';
const KEY = `${PLUGIN}@${MARKET}`;

async function makeRoot(version = '1.2.3') {
  const root = await mkdtemp(join(tmpdir(), 'harness-rel-root-'));
  await mkdir(join(root, '.claude-plugin'), { recursive: true });
  await mkdir(join(root, 'commands'), { recursive: true });
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ name: PLUGIN, version }, null, 2) + '\n',
  );
  await writeFile(
    join(root, '.claude-plugin/plugin.json'),
    JSON.stringify({ name: PLUGIN, version, commands: ['./commands/harness-release.md'] }, null, 2) + '\n',
  );
  await writeFile(
    join(root, '.claude-plugin/marketplace.json'),
    JSON.stringify({ name: MARKET, plugins: [{ name: PLUGIN, version }] }, null, 2) + '\n',
  );
  await writeFile(join(root, 'commands/harness-release.md'), '# release\n');
  return root;
}

async function makePluginsRoot(version = '1.2.3') {
  const pr = await mkdtemp(join(tmpdir(), 'harness-rel-pr-'));
  await writeFile(
    join(pr, 'installed_plugins.json'),
    JSON.stringify(
      {
        version: 3,
        plugins: {
          [KEY]: [
            {
              scope: 'user',
              version,
              installPath: 'old',
              installedAt: 'x',
              lastUpdated: 'x',
              gitCommitSha: 'old',
            },
          ],
        },
      },
      null,
      2,
    ) + '\n',
  );
  return pr;
}

async function readJson(p) {
  return JSON.parse(await readFile(p, 'utf8'));
}

async function fileExists(p) {
  try { await stat(p); return true; } catch { return false; }
}

test('dryRun is byte-for-byte non-mutating across all 3 manifests + installed_plugins.json', async () => {
  const root = await makeRoot();
  const pr = await makePluginsRoot();
  try {
    const paths = [
      join(root, 'package.json'),
      join(root, '.claude-plugin/plugin.json'),
      join(root, '.claude-plugin/marketplace.json'),
      join(pr, 'installed_plugins.json'),
    ];
    const before = await Promise.all(paths.map(p => readFile(p, 'utf8')));

    const res = await release({ bump: 'patch', root, pluginsRoot: pr, dryRun: true, gitSha: 'deadbeef' });

    assert.equal(res.newVersion, '1.2.4');
    assert.equal(res.oldVersion, '1.2.3');
    assert.equal(res.dryRun, true);

    const after = await Promise.all(paths.map(p => readFile(p, 'utf8')));
    for (let i = 0; i < paths.length; i++) {
      assert.equal(after[i], before[i], `file should be byte-identical after dryRun: ${paths[i]}`);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

test('version mismatch throws naming the offending file and value', async () => {
  const root = await makeRoot();
  const pr = await makePluginsRoot();
  try {
    await writeFile(
      join(root, '.claude-plugin/plugin.json'),
      JSON.stringify({ name: PLUGIN, version: '9.9.9', commands: [] }, null, 2) + '\n',
    );
    await assert.rejects(
      () => release({ bump: 'patch', root, pluginsRoot: pr, gitSha: 'x' }),
      err => {
        assert.match(err.message, /plugin\.json/);
        assert.match(err.message, /9\.9\.9/);
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

test('real run updates installed_plugins record but NOT the schema version', async () => {
  const root = await makeRoot();
  const pr = await makePluginsRoot();
  try {
    const res = await release({ bump: 'minor', root, pluginsRoot: pr, skipCache: false, gitSha: 'deadbeef' });

    assert.equal(res.newVersion, '1.3.0');
    assert.equal(res.installedUpdated, true);

    // manifests bumped
    assert.equal((await readJson(join(root, 'package.json'))).version, '1.3.0');
    assert.equal((await readJson(join(root, '.claude-plugin/plugin.json'))).version, '1.3.0');
    assert.equal((await readJson(join(root, '.claude-plugin/marketplace.json'))).plugins[0].version, '1.3.0');

    // installed_plugins record updated, schema version untouched
    const ip = await readJson(join(pr, 'installed_plugins.json'));
    assert.equal(ip.version, 3, 'top-level schema version must remain the integer 3');
    const rec = ip.plugins[KEY][0];
    assert.equal(rec.version, '1.3.0');
    assert.equal(rec.gitCommitSha, 'deadbeef');
    assert.ok(rec.installPath.endsWith('/1.3.0'), `installPath should end with /1.3.0, got ${rec.installPath}`);
    assert.match(rec.lastUpdated, /^\d{4}-\d{2}-\d{2}T.*Z$/, 'lastUpdated should be a fresh ISO string');
    assert.notEqual(rec.lastUpdated, 'x');

    // cache copied
    assert.ok(
      await fileExists(join(pr, 'cache', MARKET, PLUGIN, '1.3.0', 'package.json')),
      'cache dir with package.json should exist',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

test('marketplace sync: copies marketplace.json + commands, removes stale dest command, preserves non-commands files', async () => {
  const root = await makeRoot();
  const pr = await makePluginsRoot();
  try {
    // Pre-seed the destination marketplace dir with a stale command and a user file to preserve.
    const mktDir = join(pr, 'marketplaces', MARKET);
    await mkdir(join(mktDir, 'commands'), { recursive: true });
    await writeFile(join(mktDir, 'commands', 'harness-OLD.md'), '# stale\n');
    await writeFile(join(mktDir, 'keep.txt'), 'preserve me\n');

    await release({ bump: 'minor', root, pluginsRoot: pr, skipCache: false, gitSha: 'x' });

    // marketplace.json copied with bumped version
    assert.ok(await fileExists(join(mktDir, 'marketplace.json')), 'marketplace.json should be synced');
    assert.equal((await readJson(join(mktDir, 'marketplace.json'))).plugins[0].version, '1.3.0');

    // a real source command was copied
    assert.ok(
      await fileExists(join(mktDir, 'commands', 'harness-release.md')),
      'source command should be copied to dest',
    );

    // stale dest command removed
    assert.equal(
      await fileExists(join(mktDir, 'commands', 'harness-OLD.md')),
      false,
      'stale dest command must be removed',
    );

    // non-commands user file preserved
    assert.ok(await fileExists(join(mktDir, 'keep.txt')), 'non-commands file must be preserved');
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

test('explicit version bump with skipCache skips cache + installed_plugins', async () => {
  const root = await makeRoot();
  const pr = await makePluginsRoot();
  try {
    const res = await release({ bump: '2.0.0', root, pluginsRoot: pr, skipCache: true, gitSha: 'x' });

    assert.equal(res.newVersion, '2.0.0');
    assert.equal(res.installedUpdated, false);
    assert.equal(res.skipCache, true);

    // manifests bumped
    assert.equal((await readJson(join(root, 'package.json'))).version, '2.0.0');
    assert.equal((await readJson(join(root, '.claude-plugin/plugin.json'))).version, '2.0.0');
    assert.equal((await readJson(join(root, '.claude-plugin/marketplace.json'))).plugins[0].version, '2.0.0');

    // installed_plugins NOT touched (record still old)
    const ip = await readJson(join(pr, 'installed_plugins.json'));
    const rec = ip.plugins[KEY][0];
    assert.equal(rec.version, '1.2.3', 'installed record must be unchanged under skipCache');
    assert.equal(rec.gitCommitSha, 'old');
    assert.equal(rec.installPath, 'old');

    // cache NOT created
    assert.equal(
      await fileExists(join(pr, 'cache', MARKET, PLUGIN, '2.0.0')),
      false,
      'cache dir must not be created under skipCache',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

test('schema guard: empty plugins array throws', async () => {
  const root = await makeRoot();
  const pr = await makePluginsRoot();
  try {
    await writeFile(
      join(root, '.claude-plugin/marketplace.json'),
      JSON.stringify({ name: MARKET, plugins: [] }, null, 2) + '\n',
    );
    await assert.rejects(() => release({ bump: 'patch', root, pluginsRoot: pr, gitSha: 'x' }));
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

test('schema guard: plugin name mismatch throws', async () => {
  const root = await makeRoot();
  const pr = await makePluginsRoot();
  try {
    await writeFile(
      join(root, '.claude-plugin/marketplace.json'),
      JSON.stringify({ name: MARKET, plugins: [{ name: 'something-else', version: '1.2.3' }] }, null, 2) + '\n',
    );
    await assert.rejects(() => release({ bump: 'patch', root, pluginsRoot: pr, gitSha: 'x' }));
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

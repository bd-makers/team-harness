import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { release, detectClaudeCodeProcs } from '../src/commands/release.mjs';

const PLUGIN = 'harness-aijient-team';
const MARKET = 'harness-aijient-team-marketplace';
const KEY = `${PLUGIN}@${MARKET}`;

// A companion entry: an external plugin the catalog lists but does NOT own or
// version. The pin lives in source.sha; deliberately no `version` field.
const COMPANION = {
  name: 'diagram-design',
  source: {
    source: 'url',
    url: 'https://github.com/cathrynlavery/diagram-design.git',
    sha: '0ab077f2291e9056554d48a90c4ff45f0b7029a5',
  },
  description: 'companion, not bundled',
};

async function makeRoot(version = '1.2.3', extraPlugins = []) {
  const root = await mkdtemp(join(tmpdir(), 'harness-rel-root-'));
  await mkdir(join(root, '.claude-plugin'), { recursive: true });
  await mkdir(join(root, '.codex-plugin'), { recursive: true });
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
    JSON.stringify({ name: MARKET, plugins: [{ name: PLUGIN, version }, ...extraPlugins] }, null, 2) + '\n',
  );
  await writeFile(
    join(root, '.codex-plugin/plugin.json'),
    JSON.stringify({ name: PLUGIN, version, skills: './skills/' }, null, 2) + '\n',
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

test('dryRun is byte-for-byte non-mutating across all manifests + installed_plugins.json', async () => {
  const root = await makeRoot();
  const pr = await makePluginsRoot();
  try {
    const paths = [
      join(root, 'package.json'),
      join(root, '.claude-plugin/plugin.json'),
      join(root, '.claude-plugin/marketplace.json'),
      join(root, '.codex-plugin/plugin.json'),
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
    assert.equal((await readJson(join(root, '.codex-plugin/plugin.json'))).version, '1.3.0');

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

    // marketplace.json copied with bumped version to the authoritative
    // .claude-plugin/ location (NOT the marketplace root — that is where every
    // other installed marketplace keeps it and where Claude Code reads it).
    const destMktJson = join(mktDir, '.claude-plugin', 'marketplace.json');
    assert.ok(await fileExists(destMktJson), 'marketplace.json should be synced to .claude-plugin/');
    assert.equal((await readJson(destMktJson)).plugins[0].version, '1.3.0');
    assert.equal(
      await fileExists(join(mktDir, 'marketplace.json')),
      false,
      'must NOT write a stray marketplace.json at the marketplace root',
    );

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
    assert.equal((await readJson(join(root, '.codex-plugin/plugin.json'))).version, '2.0.0');

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

test('schema guard: no self entry (empty plugins array) throws', async () => {
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

test('surgical bump does NOT reflow inline arrays (JSON fidelity)', async () => {
  const root = await makeRoot();
  const pr = await makePluginsRoot();
  try {
    // Hand-written raw text with an INLINE keywords array on one line. We must NOT
    // use JSON.stringify(..., null, 2) here — that would expand the array.
    const rawPkg =
      '{\n' +
      '  "name": "' + PLUGIN + '",\n' +
      '  "version": "1.2.3",\n' +
      '  "keywords": ["a", "b"],\n' +
      '  "description": "x"\n' +
      '}\n';
    await writeFile(join(root, 'package.json'), rawPkg);

    await release({ bump: 'patch', root, pluginsRoot: pr, skipCache: true, gitSha: 'x' });

    const text = await readFile(join(root, 'package.json'), 'utf8');
    assert.match(text, /"version": "1\.2\.4"/, 'version field must be surgically bumped');
    assert.match(text, /"keywords": \["a", "b"\]/, 'inline keywords array must stay on one line (no reflow)');
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

test('manifest-format guard: version substring count !== 1 throws naming the file', async () => {
  const root = await makeRoot();
  const pr = await makePluginsRoot();
  try {
    // Valid JSON that parses to version 1.2.3 (so agreement check passes), but the
    // exact spaced substring `"version": "1.2.3"` appears 0 times (no space here).
    const rawPkg = '{\n  "name": "' + PLUGIN + '",\n  "version":"1.2.3"\n}\n';
    await writeFile(join(root, 'package.json'), rawPkg);

    await assert.rejects(
      () => release({ bump: 'patch', root, pluginsRoot: pr, skipCache: true, gitSha: 'x' }),
      err => {
        assert.match(err.message, /package\.json/);
        assert.equal(err.kind, 'manifest-format');
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

test('error kinds: bad bump arg differs from version mismatch', async () => {
  const root = await makeRoot();
  const pr = await makePluginsRoot();
  try {
    let badBumpErr;
    await assert.rejects(
      () => release({ bump: 'nope', root, pluginsRoot: pr, gitSha: 'x' }),
      err => { badBumpErr = err; return true; },
    );
    assert.equal(badBumpErr.kind, 'bad-bump');

    // FIX 4: a leading-zero "semver" is rejected as bad-bump (not treated as explicit version).
    await assert.rejects(
      () => release({ bump: '01.02.03', root, pluginsRoot: pr, gitSha: 'x' }),
      err => err.kind === 'bad-bump',
    );

    // Now force a version mismatch and confirm a DIFFERENT kind/message.
    await writeFile(
      join(root, '.claude-plugin/plugin.json'),
      JSON.stringify({ name: PLUGIN, version: '9.9.9', commands: [] }, null, 2) + '\n',
    );
    let mismatchErr;
    await assert.rejects(
      () => release({ bump: 'patch', root, pluginsRoot: pr, gitSha: 'x' }),
      err => { mismatchErr = err; return true; },
    );
    assert.equal(mismatchErr.kind, 'version-mismatch');
    assert.notEqual(badBumpErr.kind, mismatchErr.kind);
    assert.notEqual(badBumpErr.message, mismatchErr.message);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

test('safety: stale dest symlink is not followed to delete its target outside commands/', async () => {
  const root = await makeRoot();
  const pr = await makePluginsRoot();
  try {
    const mktDir = join(pr, 'marketplaces', MARKET);
    await mkdir(join(mktDir, 'commands'), { recursive: true });

    // A real target file OUTSIDE commands/, and a symlink inside dest commands/
    // pointing to it, whose name is NOT in source commands/.
    const targetFile = join(mktDir, 'real-target.md');
    await writeFile(targetFile, 'precious\n');
    const { symlink } = await import('node:fs/promises');
    await symlink(targetFile, join(mktDir, 'commands', 'harness-STALE.md'));

    await release({ bump: 'minor', root, pluginsRoot: pr, skipCache: false, gitSha: 'x' });

    // The stale symlink may or may not be removed, but its target MUST survive.
    assert.ok(await fileExists(targetFile), 'symlink target outside commands/ must not be deleted');
    assert.equal(await readFile(targetFile, 'utf8'), 'precious\n', 'target content must be intact');
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

const mockPs = (stdout) => async () => ({ stdout });

test('detectClaudeCodeProcs: claude-code CLI / Claude.app / claude 바이너리를 감지', async () => {
  const hits = await detectClaudeCodeProcs(mockPs(
    '  100 /usr/bin/node /x/@anthropic-ai/claude-code/cli.js\n' +
    '  200 /Applications/Claude.app/Contents/MacOS/Claude\n' +
    '  300 /usr/local/bin/claude\n' +
    '  500 /usr/bin/vim notes.txt\n',
  ));
  assert.deepEqual(hits.map(h => h.pid), ['100', '200', '300']);
});

test('detectClaudeCodeProcs: claude-<other> 경로는 오탐하지 않음', async () => {
  const hits = await detectClaudeCodeProcs(mockPs('  400 node /Users/x/claude-experiments/foo.js\n'));
  assert.equal(hits.length, 0);
});

test('detectClaudeCodeProcs: claude 프로세스 없으면 빈 배열', async () => {
  const hits = await detectClaudeCodeProcs(mockPs('  1 /sbin/launchd\n  2 /usr/bin/vim\n'));
  assert.equal(hits.length, 0);
});

test('detectClaudeCodeProcs: ps 실패해도 throw 없이 [] (release 비차단)', async () => {
  const hits = await detectClaudeCodeProcs(async () => { throw new Error('ps failed'); });
  assert.deepEqual(hits, []);
});

test('release: skipCache면 claude 감지 자체를 건너뜀 (installed_plugins 미접근)', async () => {
  const root = await makeRoot();
  const pr = await makePluginsRoot();
  try {
    // detectClaude defaults true, but skipCache short-circuits the whole probe.
    const res = await release({ bump: 'patch', root, pluginsRoot: pr, skipCache: true, gitSha: 'x' });
    assert.equal(res.claudeRunning, undefined, 'skipCache일 때 claudeRunning 미설정');
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

test('개발 저장소가 곧 marketplace clone이어도 릴리스가 중단되지 않는다', async () => {
  // 메인테이너는 보통 marketplace clone 안에서 개발한다. 그러면 root === marketplaceDir 이라
  // marketplace.json 을 자기 자신에게 복사하게 되고, cp 가 EINVAL 로 던져 매니페스트만 올라간
  // 반쯤 적용된 트리가 남았다.
  const pr = await makePluginsRoot();
  const root = join(pr, 'marketplaces', MARKET);
  try {
    await mkdir(join(root, '.claude-plugin'), { recursive: true });
    await mkdir(join(root, '.codex-plugin'), { recursive: true });
    await mkdir(join(root, 'commands'), { recursive: true });
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: PLUGIN, version: '1.2.3' }, null, 2) + '\n');
    await writeFile(join(root, '.claude-plugin/plugin.json'),
      JSON.stringify({ name: PLUGIN, version: '1.2.3', commands: ['./commands/harness-release.md'] }, null, 2) + '\n');
    await writeFile(join(root, '.claude-plugin/marketplace.json'),
      JSON.stringify({ name: MARKET, plugins: [{ name: PLUGIN, version: '1.2.3' }] }, null, 2) + '\n');
    await writeFile(join(root, '.codex-plugin/plugin.json'),
      JSON.stringify({ name: PLUGIN, version: '1.2.3', skills: './skills/' }, null, 2) + '\n');
    await writeFile(join(root, 'commands/harness-release.md'), '# release\n');

    const res = await release({ bump: 'minor', root, pluginsRoot: pr, skipCache: false, gitSha: 'deadbeef' });

    assert.equal(res.newVersion, '1.3.0');
    assert.equal(res.marketplaceIsSource, true, 'clone 이 곧 source 임을 인지해야 한다');
    assert.equal(res.marketplaceStaleDir, undefined, 'source 자신을 stale 이라고 경고하면 안 된다');
    assert.equal((await readJson(join(root, '.claude-plugin/marketplace.json'))).plugins[0].version, '1.3.0');
  } finally {
    await rm(pr, { recursive: true, force: true });
  }
});

// --- companion plugins (marketplace lists external, pinned plugins) ---------
// The catalog can list plugins we neither own nor version. release must bump ONLY
// the self entry (matched by name, not by index) and leave companions byte-intact.

test('companion entry: release bumps only the self entry and leaves the companion untouched', async () => {
  const root = await makeRoot('1.2.3', [COMPANION]);
  const pr = await makePluginsRoot();
  try {
    const res = await release({ bump: 'minor', root, pluginsRoot: pr, skipCache: true, gitSha: 'x' });
    assert.equal(res.newVersion, '1.3.0');

    const mkt = await readJson(join(root, '.claude-plugin/marketplace.json'));
    assert.equal(mkt.plugins.length, 2, 'companion entry must survive the release');

    const self = mkt.plugins.filter(p => p.name === PLUGIN);
    assert.equal(self.length, 1);
    assert.equal(self[0].version, '1.3.0', 'self entry must be bumped');

    const companion = mkt.plugins.find(p => p.name === COMPANION.name);
    assert.deepEqual(companion, COMPANION, 'companion entry must be byte-for-byte unchanged');
    assert.equal('version' in companion, false, 'companion must never gain a version field');
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

test('companion entry: self entry found by name even when it is NOT first in the array', async () => {
  // Order is a convention, not the contract. A catalog that lists a companion
  // first must still resolve OUR entry, never plugins[0].
  const root = await mkdtemp(join(tmpdir(), 'harness-rel-order-'));
  const pr = await makePluginsRoot();
  try {
    await mkdir(join(root, '.claude-plugin'), { recursive: true });
    await mkdir(join(root, '.codex-plugin'), { recursive: true });
    await writeFile(join(root, 'package.json'),
      JSON.stringify({ name: PLUGIN, version: '1.2.3' }, null, 2) + '\n');
    await writeFile(join(root, '.claude-plugin/plugin.json'),
      JSON.stringify({ name: PLUGIN, version: '1.2.3', commands: [] }, null, 2) + '\n');
    await writeFile(join(root, '.claude-plugin/marketplace.json'),
      JSON.stringify({ name: MARKET, plugins: [COMPANION, { name: PLUGIN, version: '1.2.3' }] }, null, 2) + '\n');
    await writeFile(join(root, '.codex-plugin/plugin.json'),
      JSON.stringify({ name: PLUGIN, version: '1.2.3', skills: './skills/' }, null, 2) + '\n');

    const res = await release({ bump: 'patch', root, pluginsRoot: pr, skipCache: true, gitSha: 'x' });
    assert.equal(res.newVersion, '1.2.4');

    const mkt = await readJson(join(root, '.claude-plugin/marketplace.json'));
    assert.equal(mkt.plugins.find(p => p.name === PLUGIN).version, '1.2.4');
    assert.deepEqual(mkt.plugins.find(p => p.name === COMPANION.name), COMPANION);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

test('schema guard: a DUPLICATE self entry throws (guard is not weakened by allowing companions)', async () => {
  const root = await makeRoot('1.2.3', [{ name: PLUGIN, version: '1.2.3' }]);
  const pr = await makePluginsRoot();
  try {
    let err;
    await assert.rejects(
      () => release({ bump: 'patch', root, pluginsRoot: pr, skipCache: true, gitSha: 'x' }),
      e => { err = e; return true; },
    );
    assert.equal(err.kind, 'schema');
    assert.match(err.message, new RegExp(PLUGIN));
    assert.match(err.message, /중복된 이름/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

test('companion carrying a version equal to ours breaks the surgical bump — hence the no-version rule', async () => {
  // Documents WHY companion entries must not declare `version`: surgicalVersionReplace
  // requires the exact `"version": "<old>"` substring to occur exactly once per file.
  const root = await makeRoot('1.2.3', [{ ...COMPANION, version: '1.2.3' }]);
  const pr = await makePluginsRoot();
  try {
    let err;
    await assert.rejects(
      () => release({ bump: 'patch', root, pluginsRoot: pr, skipCache: true, gitSha: 'x' }),
      e => { err = e; return true; },
    );
    assert.equal(err.kind, 'manifest-format');
    assert.match(err.message, /marketplace\.json/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

test('schema guard: a duplicated COMPANION name throws too (catalog validity, not just our entry)', async () => {
  // Counting only the self entry would wave this through and sync an invalid
  // catalog to the marketplace clone. release is the last gate before that copy.
  const root = await makeRoot('1.2.3', [COMPANION, { ...COMPANION }]);
  const pr = await makePluginsRoot();
  try {
    let err;
    await assert.rejects(
      () => release({ bump: 'patch', root, pluginsRoot: pr, skipCache: true, gitSha: 'x' }),
      e => { err = e; return true; },
    );
    assert.equal(err.kind, 'schema');
    assert.match(err.message, /중복된 이름.*diagram-design/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

test('schema guard: a null / nameless entry throws instead of being skipped', async () => {
  const root = await makeRoot('1.2.3', [null]);
  const pr = await makePluginsRoot();
  try {
    let err;
    await assert.rejects(
      () => release({ bump: 'patch', root, pluginsRoot: pr, skipCache: true, gitSha: 'x' }),
      e => { err = e; return true; },
    );
    assert.equal(err.kind, 'schema');
    assert.match(err.message, /plugins\[1\]/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

// The needle is a raw substring, so "exactly once" does not prove it matched OUR
// field. Inconsistent spacing between the self entry and a companion could bump
// the companion and leave the harness version stale — silently, until a user
// reports the wrong version.
test('surgical bump verifies it moved the SELF entry, not a look-alike', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harness-rel-target-'));
  const pr = await makePluginsRoot();
  try {
    await mkdir(join(root, '.claude-plugin'), { recursive: true });
    await mkdir(join(root, '.codex-plugin'), { recursive: true });
    await writeFile(join(root, 'package.json'),
      JSON.stringify({ name: PLUGIN, version: '1.2.3' }, null, 2) + '\n');
    await writeFile(join(root, '.claude-plugin/plugin.json'),
      JSON.stringify({ name: PLUGIN, version: '1.2.3', commands: [] }, null, 2) + '\n');
    // self written WITHOUT the canonical space; companion written WITH it.
    await writeFile(join(root, '.claude-plugin/marketplace.json'),
      '{\n  "name": "' + MARKET + '",\n  "plugins": [\n' +
      '    { "name": "' + PLUGIN + '", "version":"1.2.3" },\n' +
      '    { "name": "diagram-design", "version": "1.2.3" }\n' +
      '  ]\n}\n');
    await writeFile(join(root, '.codex-plugin/plugin.json'),
      JSON.stringify({ name: PLUGIN, version: '1.2.3', skills: './skills/' }, null, 2) + '\n');

    let err;
    await assert.rejects(
      () => release({ bump: 'patch', root, pluginsRoot: pr, skipCache: true, gitSha: 'x' }),
      e => { err = e; return true; },
    );
    assert.equal(err.kind, 'manifest-format');
    assert.match(err.message, /marketplace\.json/);

    // and nothing was written: the harness entry is still 1.2.3
    const text = await readFile(join(root, '.claude-plugin/marketplace.json'), 'utf8');
    assert.match(text, /"version":"1\.2\.3"/, 'self entry must not have been left behind at the old version silently');
    assert.doesNotMatch(text, /1\.2\.4/, 'no partial bump may be written');
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

// --dry-run is documented as the release preflight; a preflight that skips
// format validation reports success on a tree where the real run throws.
test('dry-run is a real preflight: it fails on a manifest the real run could not bump', async () => {
  const root = await makeRoot();
  const pr = await makePluginsRoot();
  try {
    const rawPkg = '{\n  "name": "' + PLUGIN + '",\n  "version":"1.2.3"\n}\n';
    await writeFile(join(root, 'package.json'), rawPkg);

    let err;
    await assert.rejects(
      () => release({ bump: 'patch', root, pluginsRoot: pr, dryRun: true, gitSha: 'x' }),
      e => { err = e; return true; },
    );
    assert.equal(err.kind, 'manifest-format');

    // still non-mutating
    assert.equal(await readFile(join(root, 'package.json'), 'utf8'), rawPkg);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(pr, { recursive: true, force: true });
  }
});

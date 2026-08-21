// Guards the command invariant (spec Ontology "4-파일 동기화"):
// commands/<name>.md and .claude-plugin/plugin.json must stay in sync; README
// points to those canonical sources, and CLI-wrapping commands must route in bin.
// A mismatch here is a release bug, so we fail CI instead of shipping drift.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function commandNames() {
  const files = await readdir(join(ROOT, 'commands'));
  return new Set(files.filter(f => f.endsWith('.md')).map(f => basename(f, '.md')));
}

async function manifestNames() {
  const pj = JSON.parse(await readFile(join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8'));
  return new Set((pj.commands || []).map(p => basename(p, '.md')));
}

const sorted = (set) => [...set].sort();

// The catalog may also list COMPANION plugins (external, pinned by source.sha),
// so the self entry is found BY NAME — never by index. release.mjs enforces the
// same invariant; this test keeps the shipped manifest honest about it.
async function marketplaceEntries() {
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  const marketplace = JSON.parse(await readFile(join(ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'));
  const self = marketplace.plugins.filter(p => p.name === pkg.name);
  const companions = marketplace.plugins.filter(p => p.name !== pkg.name);
  return { pkg, marketplace, self, companions };
}

test('manifest-sync: package/Claude/Codex manifest versions agree', async () => {
  const claude = JSON.parse(await readFile(join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8'));
  const codex = JSON.parse(await readFile(join(ROOT, '.codex-plugin', 'plugin.json'), 'utf8'));
  const { pkg, self } = await marketplaceEntries();

  assert.equal(claude.name, pkg.name);
  assert.equal(codex.name, pkg.name);
  assert.equal(self.length, 1, 'marketplace must list exactly one entry named like this plugin');
  assert.equal(claude.version, pkg.version);
  assert.equal(self[0].version, pkg.version);
  assert.equal(codex.version, pkg.version);
});

// Companion entries are NOT ours to version. A `version` field on one would also
// break surgicalVersionReplace the day it happens to equal the current version,
// so the pin must be expressed purely as a 40-hex source.sha.
test('manifest-sync: companion entries are sha-pinned and carry no version', async () => {
  const { companions } = await marketplaceEntries();
  for (const entry of companions) {
    assert.equal('version' in entry, false, `${entry.name}: companion entries must not declare a version`);
    assert.equal(typeof entry.source, 'object', `${entry.name}: companion source must be an object`);
    assert.match(entry.source.sha ?? '', /^[0-9a-f]{40}$/, `${entry.name}: companion must be pinned by a 40-hex sha`);
    assert.match(entry.source.url ?? '', /^https:\/\/.*\.git$/, `${entry.name}: companion must point at an https git url`);
    assert.ok(entry.description, `${entry.name}: companion needs a description`);
    assert.ok(entry.author?.name, `${entry.name}: companion must credit its author (license attribution)`);
  }
});

test('manifest-sync: npm package includes Codex plugin manifest', async () => {
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  assert.ok(pkg.files.includes('.codex-plugin'), 'package.json files must include .codex-plugin');
});

test('manifest-sync: Codex plugin points at shipped skills', async () => {
  const codex = JSON.parse(await readFile(join(ROOT, '.codex-plugin', 'plugin.json'), 'utf8'));
  assert.equal(codex.skills, './skills/');
  const harnessSkill = await readFile(join(ROOT, 'skills', 'harness-team', 'SKILL.md'), 'utf8');
  assert.match(harnessSkill, /^name: harness-team$/m);
  assert.doesNotMatch(harnessSkill, /\[TODO:/);
});

test('manifest-sync: Codex-exposed skills use quick_validate-compatible frontmatter', async () => {
  const allowedKeys = new Set(['name', 'description', 'license', 'allowed-tools', 'metadata']);
  const skillsDir = join(ROOT, 'skills');
  const entries = await readdir(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const skillPath = join(skillsDir, entry.name, 'SKILL.md');
    const body = await readFile(skillPath, 'utf8');
    assert.ok(body.startsWith('---\n'), `${entry.name}: SKILL.md must start with YAML frontmatter`);
    const end = body.indexOf('\n---', 4);
    assert.notEqual(end, -1, `${entry.name}: frontmatter must be closed`);

    const frontmatter = body.slice(4, end);
    const keys = [...frontmatter.matchAll(/^([A-Za-z0-9_-]+):/gm)].map(m => m[1]);
    for (const key of keys) {
      assert.ok(allowedKeys.has(key), `${entry.name}: unexpected Codex skill frontmatter key "${key}"`);
    }

    const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim();
    const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim();
    assert.match(name ?? '', /^[a-z0-9-]{1,64}$/, `${entry.name}: invalid skill name`);
    assert.ok(description, `${entry.name}: description is required`);
    assert.ok(!/[<>]/.test(description), `${entry.name}: description must not contain angle brackets`);
    assert.ok(description.length <= 1024, `${entry.name}: description is too long`);
    assert.doesNotMatch(body, /\[TODO:/, `${entry.name}: TODO placeholder must not ship`);
  }
});

test('manifest-sync: Claude harness commands have Codex command-equivalent skills', async () => {
  const commands = await commandNames();

  for (const name of commands) {
    const skillPath = join(ROOT, 'skills', name, 'SKILL.md');
    const body = await readFile(skillPath, 'utf8');
    assert.match(body, new RegExp(`^name:\\s*${name}$`, 'm'), `${name}: skill frontmatter name must match command`);
    assert.match(body, new RegExp(`commands/${name}\\.md`), `${name}: skill must reference the command contract`);
  }
});

// commands/<name>.md ⟺ plugin.json.commands (both directions).
test('manifest-sync: commands/*.md ⟺ plugin.json commands', async () => {
  const files = await commandNames();
  const manifest = await manifestNames();
  for (const name of manifest) {
    assert.ok(files.has(name), `plugin.json lists ${name} but commands/${name}.md is missing`);
  }
  for (const name of files) {
    assert.ok(manifest.has(name), `commands/${name}.md exists but is not registered in plugin.json`);
  }
  assert.deepEqual(sorted(manifest), sorted(files));
});

// README is intentionally a pointer, not a copy of the command inventory.
test('manifest-sync: README points to command SSOTs', async () => {
  const readme = await readFile(join(ROOT, 'README.md'), 'utf8');
  assert.match(readme, /설치되는 슬래시 명령과 설명은 `commands\/\*\.md` 및 `\.claude-plugin\/plugin\.json`에서 확인합니다\./);
  assert.doesNotMatch(readme, /설치 후 다음 슬래시 명령 사용 가능:/);
  const documented = new Set([...readme.matchAll(/\|\s*`\/(harness-[a-z-]+)`/g)].map(match => match[1]));
  const commands = await commandNames();
  assert.ok([...commands].some(name => !documented.has(name)), 'README partial guide must not copy every registered command');
});

// Every CLI subcommand a command wraps must exist in the bin router. One-directional:
// internal subcommands (list/done/handoff/context/session-context/backup) need no command file.
// Only backtick-quoted or code-fence occurrences count, so prose can't false-positive.
test('manifest-sync: bin subcommands referenced in commands/ exist in the router', async () => {
  const bin = await readFile(join(ROOT, 'bin', 'harness-team.mjs'), 'utf8');
  const routerCases = new Set([...bin.matchAll(/case '([a-z-]+)':/g)].map(m => m[1]));

  const files = (await readdir(join(ROOT, 'commands'))).filter(f => f.endsWith('.md'));
  const referenced = new Set();
  for (const f of files) {
    const body = await readFile(join(ROOT, 'commands', f), 'utf8');
    for (const m of body.matchAll(/`harness-team\s+([a-z-]+)/g)) referenced.add(m[1]);
    for (const m of body.matchAll(/^\s*harness-team\s+([a-z-]+)/gm)) referenced.add(m[1]);
  }

  for (const sub of referenced) {
    assert.ok(routerCases.has(sub), `commands reference "harness-team ${sub}" but bin router has no case '${sub}'`);
  }
});

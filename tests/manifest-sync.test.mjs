// Guards the 4-file command invariant (spec Ontology "4-파일 동기화"):
// each command must line up across commands/<name>.md, .claude-plugin/plugin.json,
// the README command table, and — for commands that wrap a CLI subcommand —
// the bin router. A mismatch here is a release bug (a command that installs but
// doesn't route, or is undocumented), so we fail CI instead of shipping drift.
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

// commands/<name>.md ⟺ README command-table rows (| `/harness-x` | ... |).
test('manifest-sync: commands/*.md ⟺ README command-table rows', async () => {
  const files = await commandNames();
  const readme = await readFile(join(ROOT, 'README.md'), 'utf8');
  const rows = new Set(
    [...readme.matchAll(/\|\s*`\/(harness-[a-z-]+)`/g)].map(m => m[1]),
  );
  for (const name of files) {
    assert.ok(rows.has(name), `commands/${name}.md exists but has no README command-table row`);
  }
  for (const name of rows) {
    assert.ok(files.has(name), `README documents /${name} but commands/${name}.md is missing`);
  }
});

// Every CLI subcommand a command wraps must exist in the bin router. One-directional:
// internal subcommands (list/done/handoff/session-context/backup) need no command file.
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

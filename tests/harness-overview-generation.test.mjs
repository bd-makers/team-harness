import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';

import {
  buildCommandRows,
  buildFileRows,
  generateOverview,
  renderCommandTable,
} from '../scripts/generate-harness-overview.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pexec = promisify(execFile);
const git = (dir, ...args) => pexec('git', ['-C', dir, ...args]);

test('generated harness overview matches its sources', async () => {
  const [actual, generated, diagramFiles] = await Promise.all([
    readFile(join(root, 'docs/harness-overview.html'), 'utf8'),
    generateOverview(root),
    readdir(join(root, 'docs/diagrams/harness-overview')),
  ]);

  assert.equal(actual, generated);
  assert.equal(
    (actual.match(/<div class="mermaid">/g) ?? []).length,
    diagramFiles.filter((name) => name.endsWith('.mmd')).length,
  );
  assert.doesNotMatch(actual, /data-processed="true"/);
  assert.doesNotMatch(actual, /병렬 작성/);
});

test('file inventory is the tree `git add -A` would stage, regardless of index state', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'harness-overview-git-'));
  try {
    await git(fixture, 'init', '-q', '-b', 'main');
    await git(fixture, 'config', 'user.email', 't@e.com');
    await git(fixture, 'config', 'user.name', 't');
    await mkdir(join(fixture, 'src'));
    await Promise.all([
      writeFile(join(fixture, '.gitignore'), '.DS_Store\n'),
      writeFile(join(fixture, 'src/kept.mjs'), 'kept'),
      writeFile(join(fixture, 'src/gone.mjs'), 'gone'),
      writeFile(join(fixture, 'src/swapped'), 'file'),
    ]);
    await git(fixture, 'add', '-A');
    await git(fixture, 'commit', '-qm', 'base');

    await Promise.all([
      rm(join(fixture, 'src/gone.mjs')),
      rm(join(fixture, 'src/swapped')),
      writeFile(join(fixture, 'src/new.mjs'), 'new'),
      writeFile(join(fixture, 'src/.DS_Store'), 'ignored'),
    ]);
    await mkdir(join(fixture, 'src/swapped'));
    await writeFile(join(fixture, 'src/swapped/inner.mjs'), 'inner');

    const inventory = async () => (await buildFileRows(fixture, [])).map((row) => row.path);
    const expected = ['src/kept.mjs', 'src/new.mjs', 'src/swapped/inner.mjs'];
    assert.deepEqual(await inventory(), expected);

    await git(fixture, 'add', '-A');
    assert.deepEqual(await inventory(), expected, '스테이징 뒤에도 같아야 한다');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('adding a manifest command adds a generated command row', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'harness-overview-'));
  try {
    await mkdir(join(fixture, '.claude-plugin'));
    await mkdir(join(fixture, 'commands'));
    await writeFile(
      join(fixture, 'commands/harness-base.md'),
      '---\ndescription: 기본 명령\nphase: Workflow\n---\n',
    );
    await writeFile(
      join(fixture, '.claude-plugin/plugin.json'),
      JSON.stringify({ commands: ['./commands/harness-base.md'] }),
    );
    const before = renderCommandTable(await buildCommandRows(fixture));

    await writeFile(
      join(fixture, 'commands/harness-probe.md'),
      '---\ndescription: 생성 반영 검증 명령\nphase: Validation\n---\n',
    );
    await writeFile(
      join(fixture, '.claude-plugin/plugin.json'),
      JSON.stringify({
        commands: [
          './commands/harness-base.md',
          './commands/harness-probe.md',
        ],
      }),
    );
    const after = renderCommandTable(await buildCommandRows(fixture));

    assert.doesNotMatch(before, /harness-probe/);
    assert.match(after, /data-command-source="commands\/harness-probe\.md"/);
    assert.match(after, /생성 반영 검증 명령/);
    assert.match(after, />Validation</);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  buildCommandRows,
  generateOverview,
  renderCommandTable,
} from '../scripts/generate-harness-overview.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

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

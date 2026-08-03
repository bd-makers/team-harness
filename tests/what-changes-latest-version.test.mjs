import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertLatestVersionDocument({ latest, snapshot, version }) {
  const escapedVersion = escapeRegExp(version);

  assert.match(
    latest,
    new RegExp(`<title>Harness Aijient Team ${escapedVersion} — `),
    'latest document title must identify the package version',
  );
  assert.match(
    latest,
    new RegExp(`<dt>버전</dt><dd>${escapedVersion}</dd>`),
    'latest document release brief must identify the package version',
  );
  assert.equal(
    latest,
    snapshot,
    `latest document must match the ${version} snapshot`,
  );
}

test('latest change document describes and snapshots the package version', async () => {
  const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const version = packageJson.version;
  const [latest, snapshot] = await Promise.all([
    readFile(join(root, 'docs/what-changes-latest-version.html'), 'utf8'),
    readFile(join(root, `docs/what-changes-${version}.html`), 'utf8'),
  ]);

  assertLatestVersionDocument({ latest, snapshot, version });
});

test('latest change document guard rejects an intentionally mismatched version', async () => {
  const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const latest = [
    `<title>Harness Aijient Team ${version}-stale — 무엇이 왜 달라졌나</title>`,
    `<div><dt>버전</dt><dd>${version}</dd></div>`,
  ].join('\n');

  assert.throws(
    () => assertLatestVersionDocument({ latest, snapshot: latest, version }),
    /latest document title must identify the package version/,
  );
});

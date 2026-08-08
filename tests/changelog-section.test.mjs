// Guards the release-note extraction the publish workflow depends on: a wrong
// section boundary would ship the previous release's notes, and a missing
// section must fail loudly instead of publishing an empty release.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractChangelogSection } from '../scripts/changelog-section.mjs';

const ROOT = resolve(dirname(dirname(fileURLToPath(import.meta.url))));

const SAMPLE = [
  '# Changelog',
  '',
  '## [Unreleased]',
  '',
  '## [1.2.0] - 2026-08-08',
  '',
  '### Added',
  '- new thing',
  '',
  '## [1.1.0] - 2026-08-01',
  '',
  '### Fixed',
  '- old thing',
  '',
  // Only reachable if the version dots are treated as regex wildcards.
  '## [1x2x0] - 2026-07-01',
  '',
  '### Added',
  '- wildcard decoy',
  '',
].join('\n');

test('changelog-section: returns only the requested version body', () => {
  const body = extractChangelogSection(SAMPLE, '1.2.0');
  assert.equal(body, '### Added\n- new thing');
  assert.doesNotMatch(body, /old thing/, 'must not leak the next release body');
  assert.doesNotMatch(body, /^## /m, 'must not include the heading itself');
});

test('changelog-section: returns null for a missing or empty section', () => {
  assert.equal(extractChangelogSection(SAMPLE, '9.9.9'), null);
  assert.equal(extractChangelogSection(SAMPLE, 'Unreleased'), null);
});

test('changelog-section: SemVer build metadata is matched literally', () => {
  // `+` is a regex quantifier; escaping only dots makes this section unreachable.
  const changelog = [
    '## [1.2.3+build.1] - 2026-08-08',
    '',
    '### Added',
    '- build metadata release',
    '',
  ].join('\n');

  assert.equal(extractChangelogSection(changelog, '1.2.3+build.1'), '### Added\n- build metadata release');
});

test('changelog-section: version dots are matched literally', () => {
  // With unescaped dots, `1.2.0` also matches the `[1x2x0]` heading. Since that
  // decoy sits later in the file, only a literal match keeps us on the real one.
  const decoyOnly = SAMPLE.split('## [1.2.0]').join('## [skipped]');
  assert.equal(extractChangelogSection(decoyOnly, '1.2.0'), null);
});

test('changelog-section: the real CHANGELOG exposes the packaged version', async () => {
  const [changelog, pkg] = await Promise.all([
    readFile(join(ROOT, 'CHANGELOG.md'), 'utf8'),
    readFile(join(ROOT, 'package.json'), 'utf8').then(JSON.parse),
  ]);

  const body = extractChangelogSection(changelog, pkg.version);
  assert.ok(body, `CHANGELOG.md must document ${pkg.version} for the release workflow`);
  assert.doesNotMatch(body, /^## /m);
});

import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  checkDocsVersionDrift,
  classifyDocument,
  findMarkerDrift,
  overviewMarkers,
} from '../scripts/docs-version-drift.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function overviewFixture({ hero = '1.2.3', banner = '1.2.3', footer = '1.2.3' } = {}) {
  return [
    `<div class="hero-tags"><span class="tag tag-purple">v${hero}</span></div>`,
    `<strong>🆕 ${banner} — 무엇:</strong>`,
    '<strong>🆕 0.9.0 — 옛 배너:</strong>',
    `<footer>harness-aijient-team-plugin v${footer} (AGENTS.md SSOT)</footer>`,
  ].join('\n');
}

test('current-version markers pass when every marker equals the package version', () => {
  assert.deepEqual(findMarkerDrift(overviewFixture(), overviewMarkers, '1.2.3'), []);
});

test('a stale footer is reported with the version it still shows', () => {
  assert.deepEqual(
    findMarkerDrift(overviewFixture({ footer: '1.1.0' }), overviewMarkers, '1.2.3'),
    [{ marker: 'footer', found: '1.1.0' }],
  );
});

test('a removed marker fails instead of silently disabling the guard', () => {
  const html = overviewFixture().replace(/<footer>.*<\/footer>/, '');
  assert.deepEqual(findMarkerDrift(html, overviewMarkers, '1.2.3'), [{ marker: 'footer', found: null }]);
});

test('a current-looking marker inside an HTML comment does not mask a stale one', () => {
  const html = `<!-- <span class="tag tag-purple">v1.2.3</span> -->\n${overviewFixture({ hero: '1.1.0' })}`;
  assert.deepEqual(findMarkerDrift(html, overviewMarkers, '1.2.3'), [{ marker: 'hero badge', found: '1.1.0' }]);
});

test('a grouped banner is judged by its upper bound', () => {
  assert.deepEqual(findMarkerDrift(overviewFixture({ banner: '1.0.0–1.2.3' }), overviewMarkers, '1.2.3'), []);
  assert.deepEqual(
    findMarkerDrift(overviewFixture({ banner: '1.0.0–1.2.2' }), overviewMarkers, '1.2.3'),
    [{ marker: 'latest banner', found: '1.2.2' }],
  );
});

test('classification separates snapshots, baseline-labelled, current and unversioned documents', () => {
  const bareHero = '<span class="tag tag-purple">v1.2.3</span>';
  assert.equal(classifyDocument('docs/x-1.2.3.html', bareHero), 'snapshot');
  assert.equal(classifyDocument('docs/x.html', bareHero), 'current');
  assert.equal(classifyDocument('docs/x.html', '<footer>plugin v1.2.3 · 소스에서 생성됨</footer>'), 'current');
  assert.equal(classifyDocument('docs/x.html', '<span aria-label="version" class="tag tag-purple">v1.2.3</span>'), 'current');
  // 한 표면이라도 "기준"을 달면 문서 전체가 기준 버전을 선언한 것이다 — 다른 표면의 맨 버전은 그 기준의 반복이다.
  assert.equal(
    classifyDocument('docs/x.html', '<span class="tag tag-purple">1.0.0 기준</span><footer>plugin · 1.0.0 · 가이드</footer>'),
    'baseline',
  );
  assert.equal(classifyDocument('docs/x.html', '<div class="footer"><span>V1.0.0 기준</span></div>'), 'baseline');
  assert.equal(classifyDocument('docs/x.html', '<title>Harness 1.0.0 — 가이드</title><footer>더 읽을 것</footer>'), 'unversioned');
});

test('an unregistered current document and a stale exclusion both fail the check', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'docs-version-drift-'));
  try {
    await mkdir(join(fixture, 'docs'));
    await writeFile(join(fixture, 'package.json'), JSON.stringify({ version: '1.2.3' }));
    await writeFile(join(fixture, 'docs/registered.html'), overviewFixture());
    await writeFile(join(fixture, 'docs/new-page.html'), '<span class="tag tag-purple">v1.2.3</span>');
    await writeFile(join(fixture, 'docs/refreshed.html'), '<footer>가이드</footer>');
    await writeFile(join(fixture, 'docs/new-page-1.0.0.html'), '<span class="tag tag-purple">v1.0.0</span>');

    const problems = await checkDocsVersionDrift(fixture, {
      documents: [{ path: 'docs/registered.html', markers: overviewMarkers }],
      exclusions: [{ path: 'docs/refreshed.html', reason: '후속 task' }],
    });

    assert.deepEqual(problems.map((problem) => problem.path).sort(), ['docs/new-page.html', 'docs/refreshed.html']);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('the repository has no current-version drift in its docs', async () => {
  assert.deepEqual(await checkDocsVersionDrift(root), []);
});

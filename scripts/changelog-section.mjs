#!/usr/bin/env node
// Extracts one version's section from CHANGELOG.md so the release workflow can
// use it as the GitHub Release body. Kept as a script (not inline YAML) because
// only a script can be covered by `node --test`.
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// SemVer allows regex metacharacters (`.` in every version, `+` in build
// metadata), so the version has to be escaped wholesale before interpolation.
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// A section runs from its own `## [x.y.z] - date` heading to the next `## `
// heading. Anything less specific would swallow the following release.
export function extractChangelogSection(changelog, version) {
  const lines = changelog.split('\n');
  const heading = new RegExp(`^## \\[${escapeRegExp(version)}\\]`);
  const start = lines.findIndex(line => heading.test(line));
  if (start === -1) return null;

  const rest = lines.slice(start + 1);
  const end = rest.findIndex(line => line.startsWith('## '));
  const body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
  return body === '' ? null : body;
}

async function main() {
  const version = process.argv[2];
  if (!version) {
    console.error('usage: node scripts/changelog-section.mjs <version>');
    process.exit(2);
  }

  const changelog = await readFile(join(ROOT, 'CHANGELOG.md'), 'utf8');
  const section = extractChangelogSection(changelog, version);
  if (!section) {
    console.error(`CHANGELOG.md에 [${version}] 절이 없거나 비어 있습니다.`);
    process.exit(1);
  }

  console.log(section);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}

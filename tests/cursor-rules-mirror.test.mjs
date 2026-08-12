// The mirror is the only thing keeping Cursor's view of the rules honest: a
// path-scoped `.claude/rules` file must arrive as an auto-attached Cursor rule,
// not as an always-on one, and the source frontmatter must not survive into the
// body as literal text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { mirrorCursorRules, splitRulePaths } from '../src/harness.mjs';

async function sandbox(rules) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-cursor-rules-'));
  await mkdir(join(dir, '.claude/rules'), { recursive: true });
  for (const [name, content] of Object.entries(rules)) {
    const path = join(dir, '.claude/rules', name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, 'utf8');
  }
  return dir;
}

const SCOPED = `---
paths:
  - "src/**/*.tsx"
  - "app/**/*.tsx"
---

# 스타일링 규칙

- StyleSheet.create() 사용
`;

const GLOBAL = `# 공통 규칙

- 단순함 우선
`;

test('cursor mirror: path-scoped rule becomes auto-attached globs, not alwaysApply', async () => {
  const dir = await sandbox({ 'styling.md': SCOPED });
  try {
    await mirrorCursorRules({ targetDir: dir });
    const mdc = await readFile(join(dir, '.cursor/rules/styling.mdc'), 'utf8');

    assert.match(mdc, /^---\ndescription: styling rules\nglobs: src\/\*\*\/\*\.tsx, app\/\*\*\/\*\.tsx\nalwaysApply: false\n---\n/);
    assert.doesNotMatch(mdc, /alwaysApply: true/, 'a scoped rule must not load in every Cursor session');
    assert.doesNotMatch(mdc, /paths:/, 'source frontmatter must be consumed, not stranded in the body');
    assert.match(mdc, /# 스타일링 규칙/, 'body must survive');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('cursor mirror: unscoped rule stays alwaysApply', async () => {
  const dir = await sandbox({ 'common.md': GLOBAL });
  try {
    await mirrorCursorRules({ targetDir: dir });
    const mdc = await readFile(join(dir, '.cursor/rules/common.mdc'), 'utf8');

    assert.match(mdc, /^---\ndescription: common rules\nalwaysApply: true\n---\n/);
    assert.doesNotMatch(mdc, /globs:/);
    assert.match(mdc, /# 공통 규칙/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('cursor mirror: rules in subdirectories are mirrored, preserving structure', async () => {
  const dir = await sandbox({ 'frontend/styling.md': SCOPED, 'common.md': GLOBAL });
  try {
    await mirrorCursorRules({ targetDir: dir });
    const nested = await readFile(join(dir, '.cursor/rules/frontend/styling.mdc'), 'utf8');

    assert.match(nested, /description: frontend\/styling rules/);
    assert.match(nested, /globs: src\/\*\*\/\*\.tsx, app\/\*\*\/\*\.tsx/);
    assert.match(nested, /# 스타일링 규칙/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('cursor mirror: quotes a glob list that would otherwise be invalid YAML', async () => {
  // `**/*.ts` opens a YAML alias and `[id].tsx` a flow sequence — unquoted, the
  // generated frontmatter fails to parse and the rule is lost, not just mis-scoped.
  const dir = await sandbox({
    'wild.md': '---\npaths:\n  - "**/*.ts"\n  - "src/*.tsx"\n---\n\n# wild\n',
    'route.md': '---\npaths: ["[id].tsx"]\n---\n\n# route\n',
  });
  try {
    await mirrorCursorRules({ targetDir: dir });

    assert.match(await readFile(join(dir, '.cursor/rules/wild.mdc'), 'utf8'), /^globs: '\*\*\/\*\.ts, src\/\*\.tsx'$/m);
    assert.match(await readFile(join(dir, '.cursor/rules/route.mdc'), 'utf8'), /^globs: '\[id\]\.tsx'$/m);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('cursor mirror: follows a symlinked rules directory without looping', async () => {
  const dir = await sandbox({ 'common.md': GLOBAL });
  const shared = await mkdtemp(join(tmpdir(), 'harness-shared-rules-'));
  try {
    await writeFile(join(shared, 'styling.md'), SCOPED, 'utf8');
    await symlink(shared, join(dir, '.claude/rules/shared'));
    // A link back to the rules root would recurse forever without the realpath guard.
    await symlink(join(dir, '.claude/rules'), join(shared, 'loop'));

    await mirrorCursorRules({ targetDir: dir });
    const linked = await readFile(join(dir, '.cursor/rules/shared/styling.mdc'), 'utf8');

    assert.match(linked, /globs: src\/\*\*\/\*\.tsx, app\/\*\*\/\*\.tsx/);
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(shared, { recursive: true, force: true });
  }
});

test('cursor mirror: two aliases of one shared directory are both mirrored', async () => {
  // Cycle protection must key on the current branch's ancestors; a global visited
  // set would treat the second alias as already-seen and silently drop its rules.
  const dir = await sandbox({ 'common.md': GLOBAL });
  const shared = await mkdtemp(join(tmpdir(), 'harness-shared-rules-'));
  try {
    await writeFile(join(shared, 'styling.md'), SCOPED, 'utf8');
    await symlink(shared, join(dir, '.claude/rules/team-a'));
    await symlink(shared, join(dir, '.claude/rules/team-b'));

    await mirrorCursorRules({ targetDir: dir });

    assert.match(await readFile(join(dir, '.cursor/rules/team-a/styling.mdc'), 'utf8'), /globs: /);
    assert.match(await readFile(join(dir, '.cursor/rules/team-b/styling.mdc'), 'utf8'), /globs: /);
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(shared, { recursive: true, force: true });
  }
});

test('splitRulePaths: reads block and inline lists, leaves other frontmatter alone', () => {
  assert.deepEqual(splitRulePaths(SCOPED).paths, ['src/**/*.tsx', 'app/**/*.tsx']);
  assert.deepEqual(splitRulePaths('---\npaths: ["a/**", "b/*.ts"]\n---\nbody\n').paths, ['a/**', 'b/*.ts']);
  assert.deepEqual(splitRulePaths('---\ndescription: x\n---\nbody\n'), { paths: [], body: 'body\n' });
  assert.deepEqual(splitRulePaths(GLOBAL), { paths: [], body: GLOBAL });
});

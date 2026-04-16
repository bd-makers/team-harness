// Shared harness ops used by init & apply.
import { join, basename } from 'node:path';
import { writeText, readTextSafe, copyTree, exists } from './fsx.mjs';
import { render } from './render.mjs';
import { mergeMarkdown, deepMergeJson, simpleDiff } from './merge.mjs';
import { ensureSymlink } from './symlink.mjs';

const AGENT_SYMLINKS = ['AGENTS.md', 'GEMINI.md', '.cursorrules'];

export const DEFAULT_BACKUP_PARENT = 'harness-backup';

// Resolve the backup directory from a stored config, else null.
export async function loadBackupDir(targetDir) {
  const cfg = await readTextSafe(join(targetDir, '.harness/backup.json'));
  if (!cfg) return null;
  try {
    const { parent, name } = JSON.parse(cfg);
    if (!parent || !name) return null;
    return join(targetDir, '..', parent, name);
  } catch { return null; }
}

export async function saveBackupConfig(targetDir, { parent, name }) {
  await writeText(join(targetDir, '.harness/backup.json'),
    JSON.stringify({ parent, name }, null, 2) + '\n');
}

export async function planChanges(ctx, { stack }) {
  const { root, targetDir } = ctx;
  const tplDir = join(root, 'templates');
  const vars = {
    projectName: basename(targetDir),
    ...stack,
  };

  const changes = [];

  // CLAUDE.md
  const claudeTpl = await readTextSafe(join(tplDir, 'CLAUDE.md.hbs'));
  const rendered = render(claudeTpl, vars);
  const existingClaude = await readTextSafe(join(targetDir, 'CLAUDE.md'));
  const mergedClaude = mergeMarkdown(existingClaude, rendered);
  if (existingClaude !== mergedClaude) {
    changes.push({
      kind: 'markdown',
      path: join(targetDir, 'CLAUDE.md'),
      before: existingClaude,
      after: mergedClaude,
    });
  }

  // Scripts at the sibling backup directory (../<parent>/<projectName>/*.sh) — only if missing.
  // The scripts are meant to live OUTSIDE the project so `../harness-backup/<project>/clone.sh`
  // can copy the current project into that backup clone.
  const backupDir = ctx.backupDir;
  if (backupDir) {
    for (const f of ['clone.sh', 'symlink.sh', 'delete.sh']) {
      if (!(await exists(join(backupDir, f)))) {
        const tpl = await readTextSafe(join(tplDir, f));
        if (tpl) changes.push({ kind: 'script', path: join(backupDir, f), after: tpl });
      }
    }
  }

  // .claude/settings.json — JSON deep-merge
  const tplSettings = JSON.parse(await readTextSafe(join(tplDir, '.claude/settings.json')));
  const existingSettings = JSON.parse((await readTextSafe(join(targetDir, '.claude/settings.json'))) || 'null');
  const mergedSettings = deepMergeJson(existingSettings, tplSettings);
  const existingSettingsText = existingSettings ? JSON.stringify(existingSettings, null, 2) : null;
  const mergedSettingsText = JSON.stringify(mergedSettings, null, 2);
  if (existingSettingsText !== mergedSettingsText) {
    changes.push({
      kind: 'json',
      path: join(targetDir, '.claude/settings.json'),
      before: existingSettingsText,
      after: mergedSettingsText,
    });
  }

  // .opencode/opencode.json
  const tplOpen = JSON.parse(await readTextSafe(join(tplDir, '.opencode/opencode.json')));
  const existingOpen = JSON.parse((await readTextSafe(join(targetDir, '.opencode/opencode.json'))) || 'null');
  const mergedOpen = deepMergeJson(existingOpen, tplOpen);
  const existingOpenText = existingOpen ? JSON.stringify(existingOpen, null, 2) : null;
  const mergedOpenText = JSON.stringify(mergedOpen, null, 2);
  if (existingOpenText !== mergedOpenText) {
    changes.push({
      kind: 'json',
      path: join(targetDir, '.opencode/opencode.json'),
      before: existingOpenText,
      after: mergedOpenText,
    });
  }

  return { changes, vars };
}

export async function applyChanges(changes) {
  const results = [];
  for (const c of changes) {
    await writeText(c.path, c.after, c.kind === 'script' ? { mode: 0o755 } : undefined);
    results.push({ path: c.path, kind: c.kind, written: true });
  }
  return results;
}

export async function copyStaticAssets(ctx) {
  const tplDir = join(ctx.root, 'templates');
  const out = [];
  // hooks: copy, skip existing
  out.push(...await copyTree(join(tplDir, '.claude/hooks'), join(ctx.targetDir, '.claude/hooks'), { skipExisting: true }));
  // rules: copy, skip existing
  out.push(...await copyTree(join(tplDir, '.claude/rules'), join(ctx.targetDir, '.claude/rules'), { skipExisting: true }));
  // skills: copy, skip existing
  out.push(...await copyTree(join(tplDir, '.claude/skills'), join(ctx.targetDir, '.claude/skills'), { skipExisting: true }));
  // docs/: README + .gitkeep seed (skip existing to preserve team work)
  out.push(...await copyTree(join(tplDir, 'docs'), join(ctx.targetDir, 'docs'), { skipExisting: true }));
  // .harness/ bootstrap (empty active.json placeholder)
  const { writeText } = await import('./fsx.mjs');
  const activePath = join(ctx.targetDir, '.harness/active.json');
  if (!(await exists(activePath))) {
    await writeText(activePath, '{}\n');
    out.push({ path: activePath, action: 'write' });
  }
  // .gitignore tweaks
  await appendGitignore(ctx.targetDir);
  // cursor rules — mirrored from .claude/rules
  await mirrorCursorRules(ctx);
  return out;
}

async function appendGitignore(targetDir) {
  const { readTextSafe, writeText } = await import('./fsx.mjs');
  const path = join(targetDir, '.gitignore');
  const existing = (await readTextSafe(path)) ?? '';
  const needed = [
    '.claude/settings.local.json',
    '.harness/active.json',
  ];
  const missing = needed.filter(line => !existing.split('\n').some(l => l.trim() === line));
  if (missing.length === 0) return;
  const block = `\n# harness-aijient-team\n${missing.join('\n')}\n`;
  await writeText(path, existing + block);
}

export async function mirrorCursorRules(ctx) {
  const srcDir = join(ctx.targetDir, '.claude/rules');
  const dstDir = join(ctx.targetDir, '.cursor/rules');
  if (!(await exists(srcDir))) return [];
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(srcDir);
  const out = [];
  for (const name of entries) {
    if (!name.endsWith('.md')) continue;
    const content = await readTextSafe(join(srcDir, name));
    const mdcName = name.replace(/\.md$/, '.mdc');
    const mdc = `---\ndescription: ${name.replace('.md', '')} rules\nalwaysApply: true\n---\n\n${content}`;
    await writeText(join(dstDir, mdcName), mdc);
    out.push({ path: join(dstDir, mdcName), action: 'mirror' });
  }
  return out;
}

export async function setupSymlinks(ctx) {
  const out = [];
  const target = 'CLAUDE.md';
  for (const link of AGENT_SYMLINKS) {
    const res = await ensureSymlink(target, join(ctx.targetDir, link), {
      copyFallback: ctx.flags['no-symlinks'],
    });
    out.push({ link, ...res });
  }
  return out;
}

export function formatDiff(changes) {
  const lines = [];
  for (const c of changes) {
    lines.push(`\n═══ ${c.path} (${c.kind}) ═══`);
    if (c.before === null || c.before === undefined) {
      lines.push('  (new file)');
      lines.push((c.after ?? '').split('\n').slice(0, 30).map(l => `+ ${l}`).join('\n'));
      if ((c.after ?? '').split('\n').length > 30) lines.push('  ...');
    } else {
      lines.push(simpleDiff(c.before, c.after));
    }
  }
  return lines.join('\n');
}

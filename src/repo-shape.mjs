// Repository shape: single app / app + internal packages / monorepo (cycle §4-2b).
// Only the workspace *sources* are read here (package.json `workspaces`, pnpm-workspace.yaml).
// What makes a workspace an app is preset data (`workspace.app` conditions, D11), and which
// tool to delegate the commit gate to (turbo, nx) is decided by the proposal, not by this module.
import { readFile, readdir } from 'node:fs/promises';
import { join, matchesGlob } from 'node:path';
import { detectStack } from './detect-stack.mjs';
import { holds, loadPresets, selectPreset } from './presets.mjs';
import { confirm } from './prompt.mjs';

// Deep enough for `apps/*` and `packages/group/*`; a pattern reaching further is unusual
// enough to be configured by hand in gates.json.
const MAX_DEPTH = 4;

async function readText(p) { try { return await readFile(p, 'utf8'); } catch { return null; } }
function parseJson(text) { try { return text ? JSON.parse(text) : null; } catch { return null; } }

// Just the `packages:` list — block (`- 'apps/*'`) or flow (`[a, b]`) form. A full YAML
// parser would be the only dependency in the package (spec: no new dependencies).
export function parsePnpmWorkspace(text) {
  const unquote = s => s.replace(/\s+#.*$/, '').trim().replace(/^(['"])(.*)\1$/, '$2');
  const lines = text.split(/\r?\n/);
  const at = lines.findIndex(l => /^packages\s*:/.test(l));
  if (at < 0) return [];
  const inline = lines[at].replace(/^packages\s*:/, '').trim();
  if (inline.startsWith('[')) return inline.replace(/^\[|\].*$/g, '').split(',').map(unquote).filter(Boolean);
  const out = [];
  for (const line of lines.slice(at + 1)) {
    if (/^\S/.test(line)) break;               // next top-level key
    const m = line.match(/^\s*-\s*(.+)$/);
    if (m) out.push(unquote(m[1]));
  }
  return out.filter(Boolean);
}

async function workspacePatterns(dir, rootPkg) {
  const ws = rootPkg?.workspaces;
  const fromPkg = Array.isArray(ws) ? ws : Array.isArray(ws?.packages) ? ws.packages : [];
  const yaml = await readText(join(dir, 'pnpm-workspace.yaml'));
  return [...fromPkg, ...(yaml ? parsePnpmWorkspace(yaml) : [])]
    .filter(p => typeof p === 'string')
    .map(p => p.trim().replace(/^!?\.\//, m => (m.startsWith('!') ? '!' : '')).replace(/\/+$/, ''))
    .filter(Boolean);
}

async function* walk(dir, rel = '', depth = 0) {
  if (depth >= MAX_DEPTH) return;
  let entries;
  try { entries = await readdir(join(dir, rel), { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (!e.isDirectory() || e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const child = rel ? `${rel}/${e.name}` : e.name;
    yield child;
    yield* walk(dir, child, depth + 1);
  }
}

async function isApp(absDir, pkg, stackId, presets) {
  const conds = selectPreset(presets, stackId)?.workspace?.app;
  return Array.isArray(conds) && conds.length > 0 && holds(absDir, pkg, conds);
}

// → { shape: 'single'|'app-packages'|'monorepo', workspaces: [{ dir, kind: 'app'|'package', stackId }] }
// The root counts as workspace "." only when workspace sources exist — a plain single app
// stays `single` with no workspaces, exactly as before this module existed.
export async function detectRepoShape(dir) {
  const rootPkg = parseJson(await readText(join(dir, 'package.json')));
  const patterns = await workspacePatterns(dir, rootPkg);
  const include = patterns.filter(p => !p.startsWith('!'));
  const exclude = patterns.filter(p => p.startsWith('!')).map(p => p.slice(1));
  if (!include.length) return { shape: 'single', workspaces: [] };

  const presets = await loadPresets();
  const workspaces = [];
  for await (const rel of walk(dir)) {
    if (!include.some(g => matchesGlob(rel, g)) || exclude.some(g => matchesGlob(rel, g))) continue;
    const abs = join(dir, rel);
    const pkg = parseJson(await readText(join(abs, 'package.json')));
    if (!pkg) continue;
    const { id: stackId } = await detectStack(abs);
    workspaces.push({ dir: rel, kind: await isApp(abs, pkg, stackId, presets) ? 'app' : 'package', stackId });
  }
  if (!workspaces.length) return { shape: 'single', workspaces: [] };

  const { id: rootStackId } = await detectStack(dir);
  if (rootPkg && await isApp(dir, rootPkg, rootStackId, presets)) {
    workspaces.push({ dir: '.', kind: 'app', stackId: rootStackId });
  }
  workspaces.sort((a, b) => (a.dir === '.' ? -1 : b.dir === '.' ? 1 : a.dir.localeCompare(b.dir)));
  const apps = workspaces.filter(w => w.kind === 'app').length;
  return { shape: apps >= 2 ? 'monorepo' : 'app-packages', workspaces };
}

export function describeShape({ shape, workspaces }) {
  const apps = workspaces.filter(w => w.kind === 'app').length;
  const width = Math.max(...workspaces.map(w => (w.dir === '.' ? '(루트)' : w.dir).length));
  const lines = [`저장소 모양: ${shape} (workspace ${workspaces.length}개, 앱 ${apps}개)`];
  for (const w of workspaces) {
    lines.push(`  ${(w.dir === '.' ? '(루트)' : w.dir).padEnd(width)}  ${w.kind === 'app' ? '앱' : '패키지'}  ${w.stackId}`);
  }
  return lines.join('\n');
}

// The confirmed shape for a proposal: null when no workspace exists (the single-app path,
// never prompted — spec G1), { shape: 'single' } when the developer rejected the detection,
// otherwise the detection. A shape already confirmed in gates.json (`stored`, its fingerprint)
// is honoured without asking again; `gate suggest` omits it to re-confirm on purpose.
// `reject` is the non-interactive "no" (init --shape single): agents drive init with --yes and
// cannot answer the prompt, so they ask the developer first and pass the answer as a flag.
export async function resolveShape(dir, { yes = false, stored = null, reject = false, confirmFn = confirm, describeExtra = null } = {}) {
  const detected = await detectRepoShape(dir);
  if (detected.shape === 'single') return null;
  const rejected = { shape: 'single', workspaces: [] };
  if (reject) {
    console.log(`\n${describeShape(detected)}\n  → --shape single: 단일 앱으로 처리합니다`);
    return rejected;
  }
  if (stored?.shape) return stored.shape === 'single' ? rejected : detected;
  const extra = describeExtra ? await describeExtra(detected) : '';
  console.log(`\n${describeShape(detected)}${extra ? `\n${extra}` : ''}`);
  if (yes) return detected;
  return (await confirmFn('이 저장소 모양으로 진행할까요? (아니오 → 단일 앱으로 처리)', { defaultYes: true })) ? detected : rejected;
}

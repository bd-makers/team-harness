// Commit-gate presets: language and tool knowledge lives in templates/presets/*.json as data,
// never in hook or CLI code (D11). This module only interprets that data — it picks a preset by
// stack id, evaluates its conditions against the project, and turns it into a proposal the
// developer confirms before anything is written to .harness/gates.json (D8).
import { readFile, readdir, access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Team state, committed with the repo — unlike .harness/config.json, which init gitignores per
// user. A per-user gate would leave every teammate but the one who confirmed it ungated.
export const GATES_REL = '.harness/gates.json';

// Shipped with the package (`files` includes templates) but never copied into a consumer —
// init copies only the .claude/{hooks,rules,skills} and docs subtrees.
const PRESET_DIR = new URL('../templates/presets/', import.meta.url);

export async function loadPresets() {
  const names = (await readdir(PRESET_DIR)).filter(n => n.endsWith('.json')).sort();
  return Promise.all(names.map(async n => JSON.parse(await readFile(new URL(n, PRESET_DIR), 'utf8'))));
}

export function selectPreset(presets, stackId) {
  return presets.find(p => p.match?.stackIds?.includes(stackId)) ?? presets.find(p => p.id === 'generic');
}

async function readText(p) { try { return await readFile(p, 'utf8'); } catch { return null; } }
async function exists(p) { try { await access(p); return true; } catch { return false; } }

// The condition kinds are generic data lookups; which file or script means what is known
// only to the preset JSON. An array is any-of.
export async function holds(dir, pkg, cond) {
  if (Array.isArray(cond)) {
    for (const c of cond) if (await holds(dir, pkg, c)) return true;
    return false;
  }
  if (cond.file) return exists(join(dir, cond.file));
  if (cond.script) return Boolean(pkg?.scripts?.[cond.script]);
  if (cond.dependency) return Object.hasOwn({ ...pkg?.dependencies, ...pkg?.devDependencies }, cond.dependency);
  // Apps ship their framework in `dependencies`; libraries keep it in peer/dev dependencies.
  if (cond.runtimeDependency) return Object.hasOwn(pkg?.dependencies ?? {}, cond.runtimeDependency);
  if (cond.fileContains) return (await readText(join(dir, cond.fileContains[0])))?.includes(cond.fileContains[1]) ?? false;
  throw new Error(`unknown preset condition: ${JSON.stringify(cond)}`);
}

// null when absent; throws on malformed JSON or a non-object top level so callers can tell
// "not configured" from "configured wrong".
export async function readGates(targetDir) {
  let text;
  try { text = await readFile(join(targetDir, GATES_REL), 'utf8'); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) { throw new Error(`${GATES_REL} 이 malformed JSON 입니다: ${e.message}`); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${GATES_REL} 이 malformed 입니다: 최상위가 객체가 아님`);
  }
  return parsed;
}

async function readPkg(dir) {
  const text = await readText(join(dir, 'package.json'));
  try { return text ? JSON.parse(text) : null; } catch { return null; /* a broken package.json satisfies no condition */ }
}

// Runs one preset's commit/format items against one directory. `tag` prefixes signals and
// deferred entries so a workspace's conditions stay apart from its siblings'; `wrap` turns a
// command into the form that runs inside that workspace.
async function evaluate(preset, dir, vars, { unattended, signals, tag = '', wrap = c => c }) {
  const pkg = await readPkg(dir);
  const label = tag ? `${tag} ` : '';
  const fill = cmd => cmd.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
  // true = take it, null = holds but deferred, false = condition not met.
  const take = async item => {
    if (item.when && !(await holds(dir, pkg, item.when))) return false;
    if (unattended && item.confirm) return null;
    if (item.when) signals.add(tag + JSON.stringify(item.when));
    return true;
  };
  const commit = [], format = {}, deferred = [];
  for (const item of preset.commit ?? []) {
    const t = await take(item);
    if (t) commit.push(wrap(fill(item.run)));
    else if (t === null) deferred.push(label + wrap(fill(item.run)));
  }
  for (const item of preset.format ?? []) {
    const t = await take(item);
    if (t) format[item.glob] = item.run.map(fill);
    else if (t === null) deferred.push(`${label}format ${item.glob} → ${item.run.map(fill).join(' ; ')}`);
  }
  return { commit, format, deferred };
}

// turbo·nx compute the affected set themselves; which tool and which task names exist is
// preset data. The first entry whose tool is present wins, and only tasks whose own
// condition holds are named — turbo fails on a task its config does not define.
async function delegateCommand(preset, dir, vars, { unattended, signals }) {
  for (const d of preset.delegate ?? []) {
    if (!(await holds(dir, null, d.when))) continue;
    const names = [], taskSignals = [];
    for (const t of d.tasks ?? []) {
      if (t.when && !(await holds(dir, null, t.when))) continue;
      names.push(t.name);
      if (t.when) taskSignals.push(JSON.stringify(t.when));
    }
    if (!names.length) continue;
    const cmd = d.run.replace(/\{(\w+)\}/g, (m, k) => (k === 'tasks' ? names.join(' ') : vars[k] ?? m));
    if (unattended && d.confirm) return { commit: [], deferred: [cmd] };
    for (const sig of [JSON.stringify(d.when), ...taskSignals]) signals.add(sig);
    return { commit: [cmd], deferred: [] };
  }
  return null;
}

const shellDir = d => (/^[\w./-]+$/.test(d) ? d : `'${d.replace(/'/g, `'\\''`)}'`);

// `stack` is a resolveStack() profile — only `id` and `packageManager` are used.
// The fingerprint keeps just the conditions that held, so a change that cannot alter the
// proposal (say, a new `build` script) never shows up as drift.
// `unattended` (init/migrate --yes) holds back entries a preset marks `confirm` — commands the
// old hook never ran — so nobody's commits start failing on a step no human looked at. They are
// listed as `deferred` and left out of the fingerprint, which lets doctor surface them later.
// `shape` is the *confirmed* repo shape (detectRepoShape, or { shape: 'single' } when the
// developer rejected a detected one). Without it — no workspaces found — the proposal and its
// fingerprint are exactly what they were before shapes existed.
export async function buildProposal(dir, stack, { unattended = false, shape = null } = {}) {
  const presets = await loadPresets();
  const preset = selectPreset(presets, stack.id);
  const pm = stack.packageManager;
  const vars = preset.pm?.[pm] ?? {};
  const signals = new Set();
  const opts = { unattended, signals };
  const workspaces = shape && shape.shape !== 'single' ? shape.workspaces : null;

  if (!workspaces) {
    const { commit, format, deferred } = await evaluate(preset, dir, vars, opts);
    const fingerprint = { preset: preset.id, pm, ...(shape ? { shape: 'single' } : {}), signals: [...signals].sort() };
    return { commit, format, fingerprint, deferred };
  }

  const fingerprint = () => ({
    preset: preset.id, pm, shape: shape.shape,
    workspaces: workspaces.map(w => w.dir).sort(), signals: [...signals].sort(),
  });
  const delegated = await delegateCommand(preset, dir, vars, opts);
  if (delegated) return { commit: delegated.commit, format: {}, fingerprint: fingerprint(), deferred: delegated.deferred };

  // No tool: one list per workspace, run from inside it so every package manager works
  // without its own workspace flag. The root app is the "." key (spec R6·G3).
  const commit = {}, format = {}, deferred = [];
  for (const ws of workspaces) {
    const wsPreset = selectPreset(presets, ws.stackId);
    const inRoot = ws.dir === '.';
    const r = await evaluate(wsPreset, inRoot ? dir : join(dir, ws.dir), wsPreset.pm?.[pm] ?? {}, {
      ...opts,
      tag: `${ws.dir}:`,
      wrap: inRoot ? c => c : c => `cd ${shellDir(ws.dir)} && ${c}`,
    });
    if (r.commit.length) commit[ws.dir] = r.commit;
    for (const [glob, cmds] of Object.entries(r.format)) format[glob] ??= cmds;
    deferred.push(...r.deferred);
  }
  return { commit, format, fingerprint: fingerprint(), deferred };
}

// The whole file is harness-owned — callers decide whether replacing it is allowed.
export async function applyProposal(targetDir, { commit, format, fingerprint }) {
  await mkdir(join(targetDir, '.harness'), { recursive: true });
  await writeFile(join(targetDir, GATES_REL), `${JSON.stringify({ commit, format, fingerprint }, null, 2)}\n`);
}

export function describeProposal({ commit, format, fingerprint, deferred = [] }) {
  const shapeNote = fingerprint.shape ? `, 모양: ${fingerprint.shape}` : '';
  const lines = [`커밋 게이트 제안 (프리셋: ${fingerprint.preset}, 패키지 매니저: ${fingerprint.pm}${shapeNote}) → ${GATES_REL}`];
  if (Array.isArray(commit)) for (const c of commit) lines.push(`  commit: ${c}`);
  else for (const [key, cmds] of Object.entries(commit)) for (const c of cmds) lines.push(`  commit [${key}]: ${c}`);
  for (const [glob, cmds] of Object.entries(format)) lines.push(`  format: ${glob} → ${cmds.join(' ; ')}`);
  if (lines.length === 1) lines.push('  (제안할 명령 없음 — 게이트는 아무것도 실행하지 않습니다)');
  if (deferred.length) {
    lines.push('  추가 제안 (확인 필요 — 예전 훅에 없던 명령이라 자동 기록하지 않음, `harness-team gate suggest`로 검토):');
    for (const d of deferred) lines.push(`    ${d}`);
  }
  return lines.join('\n');
}

const isWorkspaceShape = shape => shape === 'app-packages' || shape === 'monorepo';

// Shape names that differ only by app count (app-packages ↔ monorepo) are not drift — the
// gate is generated the same way for both. Moving between single and a workspace shape is,
// and so is any change in the set of workspace directories.
export function fingerprintDrift(stored, now) {
  const parts = [];
  if (stored?.preset !== now.preset) parts.push(`프리셋 ${stored?.preset} → ${now.preset}`);
  if (stored?.pm !== now.pm) parts.push(`패키지 매니저 ${stored?.pm} → ${now.pm}`);
  if (isWorkspaceShape(stored?.shape) !== isWorkspaceShape(now.shape)) {
    parts.push(`모양 ${stored?.shape ?? 'single'} → ${now.shape ?? 'single'}`);
  }
  const wsBefore = new Set(stored?.workspaces ?? []);
  const wsAfter = new Set(now.workspaces ?? []);
  for (const w of wsAfter) if (!wsBefore.has(w)) parts.push(`+workspace ${w}`);
  for (const w of wsBefore) if (!wsAfter.has(w)) parts.push(`-workspace ${w}`);
  const before = new Set(stored?.signals ?? []);
  const after = new Set(now.signals);
  for (const s of after) if (!before.has(s)) parts.push(`+${s}`);
  for (const s of before) if (!after.has(s)) parts.push(`-${s}`);
  return parts.length ? parts.join(', ') : null;
}

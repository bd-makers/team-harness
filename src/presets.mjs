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

// The four condition kinds are generic data lookups; which file or script means what is known
// only to the preset JSON. An array is any-of.
async function holds(dir, pkg, cond) {
  if (Array.isArray(cond)) {
    for (const c of cond) if (await holds(dir, pkg, c)) return true;
    return false;
  }
  if (cond.file) return exists(join(dir, cond.file));
  if (cond.script) return Boolean(pkg?.scripts?.[cond.script]);
  if (cond.dependency) return Object.hasOwn({ ...pkg?.dependencies, ...pkg?.devDependencies }, cond.dependency);
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

// `stack` is a resolveStack() profile — only `id` and `packageManager` are used.
// The fingerprint keeps just the conditions that held, so a change that cannot alter the
// proposal (say, a new `build` script) never shows up as drift.
// `unattended` (init/migrate --yes) holds back entries a preset marks `confirm` — commands the
// old hook never ran — so nobody's commits start failing on a step no human looked at. They are
// listed as `deferred` and left out of the fingerprint, which lets doctor surface them later.
export async function buildProposal(dir, stack, { unattended = false } = {}) {
  const preset = selectPreset(await loadPresets(), stack.id);
  const text = await readText(join(dir, 'package.json'));
  let pkg = null;
  try { pkg = text ? JSON.parse(text) : null; } catch { /* a broken package.json satisfies no condition */ }
  const pm = stack.packageManager;
  const vars = preset.pm?.[pm] ?? {};
  const fill = cmd => cmd.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
  const signals = new Set();
  // true = take it, null = holds but deferred, false = condition not met.
  const take = async item => {
    if (item.when && !(await holds(dir, pkg, item.when))) return false;
    if (unattended && item.confirm) return null;
    if (item.when) signals.add(JSON.stringify(item.when));
    return true;
  };
  const commit = [], format = {}, deferred = [];
  for (const item of preset.commit ?? []) {
    const t = await take(item);
    if (t) commit.push(fill(item.run));
    else if (t === null) deferred.push(fill(item.run));
  }
  for (const item of preset.format ?? []) {
    const t = await take(item);
    if (t) format[item.glob] = item.run.map(fill);
    else if (t === null) deferred.push(`format ${item.glob} → ${item.run.map(fill).join(' ; ')}`);
  }
  return { commit, format, fingerprint: { preset: preset.id, pm, signals: [...signals].sort() }, deferred };
}

// The whole file is harness-owned — callers decide whether replacing it is allowed.
export async function applyProposal(targetDir, { commit, format, fingerprint }) {
  await mkdir(join(targetDir, '.harness'), { recursive: true });
  await writeFile(join(targetDir, GATES_REL), `${JSON.stringify({ commit, format, fingerprint }, null, 2)}\n`);
}

export function describeProposal({ commit, format, fingerprint, deferred = [] }) {
  const lines = [`커밋 게이트 제안 (프리셋: ${fingerprint.preset}, 패키지 매니저: ${fingerprint.pm}) → ${GATES_REL}`];
  for (const c of commit) lines.push(`  commit: ${c}`);
  for (const [glob, cmds] of Object.entries(format)) lines.push(`  format: ${glob} → ${cmds.join(' ; ')}`);
  if (lines.length === 1) lines.push('  (제안할 명령 없음 — 게이트는 아무것도 실행하지 않습니다)');
  if (deferred.length) {
    lines.push('  추가 제안 (확인 필요 — 예전 훅에 없던 명령이라 자동 기록하지 않음, `harness-team gate suggest`로 검토):');
    for (const d of deferred) lines.push(`    ${d}`);
  }
  return lines.join('\n');
}

export function fingerprintDrift(stored, now) {
  const parts = [];
  if (stored?.preset !== now.preset) parts.push(`프리셋 ${stored?.preset} → ${now.preset}`);
  if (stored?.pm !== now.pm) parts.push(`패키지 매니저 ${stored?.pm} → ${now.pm}`);
  const before = new Set(stored?.signals ?? []);
  const after = new Set(now.signals);
  for (const s of after) if (!before.has(s)) parts.push(`+${s}`);
  for (const s of before) if (!after.has(s)) parts.push(`-${s}`);
  return parts.length ? parts.join(', ') : null;
}

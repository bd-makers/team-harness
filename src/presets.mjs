// Commit-gate presets: language and tool knowledge lives in templates/presets/*.json as data,
// never in hook or CLI code (D11). This module only interprets that data — it picks a preset by
// stack id, evaluates its conditions against the project, and turns it into a proposal the
// developer confirms before anything is written to .harness/config.json (D8).
import { readFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { readConfigStrict, writeConfig } from './user-config.mjs';

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

// `stack` is a resolveStack() profile — only `id` and `packageManager` are used.
// The fingerprint keeps just the conditions that held, so a change that cannot alter the
// proposal (say, a new `build` script) never shows up as drift.
export async function buildProposal(dir, stack) {
  const preset = selectPreset(await loadPresets(), stack.id);
  const text = await readText(join(dir, 'package.json'));
  let pkg = null;
  try { pkg = text ? JSON.parse(text) : null; } catch { /* a broken package.json satisfies no condition */ }
  const pm = stack.packageManager;
  const vars = preset.pm?.[pm] ?? {};
  const fill = cmd => cmd.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
  const signals = new Set();
  const ok = async when => {
    if (!when) return true;
    const hit = await holds(dir, pkg, when);
    if (hit) signals.add(JSON.stringify(when));
    return hit;
  };
  const commit = [];
  for (const item of preset.commit ?? []) if (await ok(item.when)) commit.push(fill(item.run));
  const format = {};
  for (const item of preset.format ?? []) if (await ok(item.when)) format[item.glob] = item.run.map(fill);
  return { gates: { commit }, format, fingerprint: { preset: preset.id, pm, signals: [...signals].sort() } };
}

// Strict read on purpose: a malformed config is refused, not silently replaced.
export async function applyProposal(targetDir, proposal) {
  const config = await readConfigStrict(targetDir);
  config.gates = proposal.gates;
  config.format = proposal.format;
  config.fingerprint = proposal.fingerprint;
  await writeConfig(targetDir, config);
}

export function describeProposal({ gates, format, fingerprint }) {
  const lines = [`커밋 게이트 제안 (프리셋: ${fingerprint.preset}, 패키지 매니저: ${fingerprint.pm})`];
  for (const c of gates.commit) lines.push(`  commit: ${c}`);
  for (const [glob, cmds] of Object.entries(format)) lines.push(`  format: ${glob} → ${cmds.join(' ; ')}`);
  if (lines.length === 1) lines.push('  (제안할 명령 없음 — 게이트는 아무것도 실행하지 않습니다)');
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

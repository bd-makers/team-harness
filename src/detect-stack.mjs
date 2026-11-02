import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { firstHolding, loadPresets, selectPreset } from './presets.mjs';

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function readJson(p) {
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return null; }
}

// Every id `--stack` accepts. `expo` is an alias of `react-native` for the RN rules gate
// (src/harness.mjs). A value outside this list used to pass straight through as the stack id.
export const KNOWN_STACK_IDS = ['react-native', 'expo', 'react', 'next', 'node', 'python', 'go', 'generic'];

const JS_LABELS = {
  'react-native': 'React Native (Expo)',
  expo: 'React Native (Expo)',
  react: 'React',
  next: 'Next.js',
  node: 'Node.js',
};

// Which lockfile means which pm is node.json `env.packageManager`, first match wins (bun has two:
// `bun.lock`, text and the default since 1.2, and the older binary `bun.lockb`). Without a lockfile
// a parsed package.json means npm — not a preset rule, since a `file` condition passes a broken one.
async function detectPackageManager(dir, pkg) {
  const rule = await firstHolding(dir, pkg, (await presetEnv('node')).packageManager);
  return rule?.id ?? (pkg ? 'npm' : null);
}

// `language` follows evidence, not the presence of package.json: a tsconfig or a typescript
// dependency means TypeScript, otherwise the project is JavaScript. The old unconditional
// 'TypeScript' made this plugin's own AGENTS.md misdescribe a repo with zero .ts files.
async function detectJsLanguage(dir, deps) {
  if (await exists(join(dir, 'tsconfig.json'))) return 'TypeScript';
  return Object.prototype.hasOwnProperty.call(deps, 'typescript') ? 'TypeScript' : 'JavaScript';
}

// Environment knowledge lives in the preset's `env` block (D11·D12); this only evaluates it.
async function presetEnv(id) {
  return selectPreset(await loadPresets(), id)?.env ?? {};
}

// The install that keeps the lockfile as it is, for the detected pm — what a fresh worktree needs
// (heliosent-profile, 2026-10-11). Unknown stays '(configure)': a guessed command is worse than none.
async function detectBootstrap(dir, pkg, id, pm) {
  const rule = await firstHolding(dir, pkg, (await presetEnv(id)).bootstrap?.[pm]);
  return rule?.run ?? '(configure)';
}

// Python's pm comes from its lockfile. Without one it stays pip, and an argument-less
// `pip install` is not a command anyone can run, so install is left to configure.
async function pythonProfile(dir) {
  const rule = await firstHolding(dir, null, (await presetEnv('python')).packageManager);
  const pm = rule?.id ?? 'pip';
  return buildProfile({
    id: 'python', label: 'Python', language: 'Python', pm,
    install: rule?.install ?? '(configure)', bootstrap: await detectBootstrap(dir, null, 'python', pm),
  });
}

export async function detectStack(dir) {
  const pkg = await readJson(join(dir, 'package.json'));
  const pm = await detectPackageManager(dir, pkg);

  if (pkg) {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const has = (k) => Object.prototype.hasOwnProperty.call(deps, k);
    const language = await detectJsLanguage(dir, deps);
    const id = (has('expo') || has('react-native')) ? 'react-native'
      : has('next') ? 'next'
      : has('react') ? 'react'
      : 'node';
    return buildProfile({ id, label: JS_LABELS[id], language, pm, pkg, bootstrap: await detectBootstrap(dir, pkg, id, pm) });
  }
  if (await exists(join(dir, 'pyproject.toml'))) return pythonProfile(dir);
  if (await exists(join(dir, 'go.mod'))) {
    return buildProfile({ id: 'go', label: 'Go', language: 'Go', pm: 'go' });
  }
  return buildProfile({ id: 'generic', label: 'Generic', language: 'unknown', pm: null });
}

// `--stack <id>` overrides what detection concluded about the project's *identity*, not what
// it found on disk. A JS-family override keeps the detected package manager, language and
// scripts so the rendered commands stay real (the old override replaced every command with
// "(configure)"); python/go/generic take their canonical profiles.
export async function resolveStack(dir, forcedId) {
  const detected = await detectStack(dir);
  if (!forcedId || forcedId === detected.id) return detected;
  if (JS_LABELS[forcedId]) {
    const pkg = await readJson(join(dir, 'package.json'));
    const pm = await detectPackageManager(dir, pkg);
    const language = pkg ? await detectJsLanguage(dir, { ...pkg.dependencies, ...pkg.devDependencies }) : 'unknown';
    return buildProfile({ id: forcedId, label: JS_LABELS[forcedId], language, pm, pkg, bootstrap: await detectBootstrap(dir, pkg, forcedId, pm) });
  }
  if (forcedId === 'python') return pythonProfile(dir);
  if (forcedId === 'go') return buildProfile({ id: 'go', label: 'Go', language: 'Go', pm: 'go' });
  return buildProfile({ id: 'generic', label: 'Generic', language: 'unknown', pm: null });
}

function buildProfile({ id, label, language, pm, pkg, install, bootstrap }) {
  const scripts = pkg?.scripts ?? {};
  const run = (name) => pm && scripts[name] ? `${pm} ${pm === 'npm' ? 'run ' : ''}${name}` : '';
  return {
    id,
    stackLabel: label,
    language,
    packageManager: pm ?? '(none)',
    cmdInstall: install ?? (pm ? `${pm} install` : '(configure)'),
    cmdBootstrap: bootstrap ?? '(configure)',
    cmdDev: run('dev') || run('start') || '(configure)',
    cmdTest: run('test') || '(configure)',
    cmdLint: run('lint') || '(configure)',
    cmdTypecheck: run('typecheck') || (scripts.tsc ? `${pm} run tsc` : '(configure)'),
  };
}

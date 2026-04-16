import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function readJson(p) {
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return null; }
}

export async function detectStack(dir) {
  const pkg = await readJson(join(dir, 'package.json'));
  const pm = (await exists(join(dir, 'pnpm-lock.yaml'))) ? 'pnpm'
    : (await exists(join(dir, 'yarn.lock'))) ? 'yarn'
    : (await exists(join(dir, 'bun.lockb'))) ? 'bun'
    : pkg ? 'npm' : null;

  if (pkg) {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const has = (k) => Object.prototype.hasOwnProperty.call(deps, k);
    if (has('expo') || has('react-native')) {
      return buildProfile({ id: 'react-native', label: 'React Native (Expo)', language: 'TypeScript', pm, pkg });
    }
    if (has('next')) {
      return buildProfile({ id: 'next', label: 'Next.js', language: 'TypeScript', pm, pkg });
    }
    if (has('react')) {
      return buildProfile({ id: 'react', label: 'React', language: 'TypeScript', pm, pkg });
    }
    return buildProfile({ id: 'node', label: 'Node.js', language: 'TypeScript', pm, pkg });
  }
  if (await exists(join(dir, 'pyproject.toml'))) {
    return buildProfile({ id: 'python', label: 'Python', language: 'Python', pm: 'pip' });
  }
  if (await exists(join(dir, 'go.mod'))) {
    return buildProfile({ id: 'go', label: 'Go', language: 'Go', pm: 'go' });
  }
  return buildProfile({ id: 'generic', label: 'Generic', language: 'unknown', pm: null });
}

function buildProfile({ id, label, language, pm, pkg }) {
  const scripts = pkg?.scripts ?? {};
  const run = (name) => pm && scripts[name] ? `${pm} ${pm === 'npm' ? 'run ' : ''}${name}` : '';
  return {
    id,
    stackLabel: label,
    language,
    packageManager: pm ?? '(none)',
    cmdInstall: pm ? `${pm} install` : '(configure)',
    cmdDev: run('dev') || run('start') || '(configure)',
    cmdTest: run('test') || '(configure)',
    cmdLint: run('lint') || '(configure)',
    cmdTypecheck: run('typecheck') || (scripts.tsc ? `${pm} run tsc` : '(configure)'),
  };
}

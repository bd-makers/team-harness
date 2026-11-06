import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RUNNER = join(ROOT, 'scripts/test-isolated.mjs');

function run(script, env = {}) {
  return spawnSync(process.execPath, [RUNNER, '-e', script], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

test('runner hides machine-global install state from the suite', () => {
  const script = `
    const { execFileSync } = require('node:child_process');
    const { homedir } = require('node:os');
    console.log(JSON.stringify({
      home: homedir(),
      vars: ['CLAUDE_CONFIG_DIR', 'CLAUDE_PLUGINS_ROOT', 'CODEX_HOME', 'XDG_CONFIG_HOME', 'GIT_CONFIG_GLOBAL']
        .filter(name => process.env[name] !== undefined),
      gitEmail: execFileSync('git', ['config', '--global', 'user.email'], { encoding: 'utf8' }).trim(),
      branch: execFileSync('git', ['config', '--global', 'init.defaultBranch'], { encoding: 'utf8' }).trim(),
    }));`;
  const r = run(script, {
    HOME: '/nonexistent-real-home',
    CLAUDE_CONFIG_DIR: '/real/claude',
    CLAUDE_PLUGINS_ROOT: '/real/plugins',
    CODEX_HOME: '/real/codex',
    XDG_CONFIG_HOME: '/real/xdg',
    GIT_CONFIG_GLOBAL: '/real/gitconfig',
  });
  assert.equal(r.status, 0, r.stderr);
  const seen = JSON.parse(r.stdout);
  assert.match(seen.home, /harness-test-home-/);
  assert.deepEqual(seen.vars, []);
  assert.equal(seen.gitEmail, 'ci@harness.test');
  assert.equal(seen.branch, 'main');
  assert.equal(existsSync(seen.home), false, 'temp HOME is removed afterwards');
});

test('runner passes the suite exit code through', () => {
  assert.equal(run('process.exit(7)').status, 7);
});

// 격리는 진입점이 하나일 때만 성립한다 — 스크립트 하나만 `node --test` 를 직접 부르면 그 경로로 다시 샌다.
test('every test entry point goes through the isolated runner, locally and in CI', () => {
  const { scripts } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const entries = Object.entries(scripts).filter(([name]) => name === 'test' || name.startsWith('test:'));
  assert.ok(entries.length > 0);
  for (const [name, command] of entries) {
    for (const step of command.split('&&')) {
      assert.match(step.trim(), /^node scripts\/test-isolated\.mjs --test /, `${name}: scripts/test-isolated.mjs 로 부르세요`);
    }
  }
  for (const workflow of ['test.yml', 'release.yml']) {
    const text = readFileSync(join(ROOT, '.github/workflows', workflow), 'utf8');
    assert.match(text, /npm test/, workflow);
    assert.doesNotMatch(text, /^\s*(run: )?(node --test|git config --global)/m, `${workflow}: 환경은 scripts/test-isolated.mjs 가 준다`);
  }
});

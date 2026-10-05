import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateGates } from '../src/commands/migrate.mjs';

// 새 래퍼 훅은 config 목록만 실행한다 — gates 없이 설치되면 이전의 typecheck·test 게이트가 사라진다.
// migrate가 그 틈을 제안으로 메우되, 구판·커스터마이즈 훅과 이미 있는 gates는 건드리지 않는다(D8).
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BIN = join(ROOT, 'bin/harness-team.mjs');
const CURRENT = join(ROOT, 'templates/.claude/hooks/pre-commit-check.sh');
const PRIOR = join(ROOT, 'tests/fixtures/stock-hooks/pre-preset-gates/pre-commit-check.sh');
const ctxFor = dir => ({ root: ROOT, targetDir: dir, flags: { yes: true } });

async function project({ hook, config }) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-migrate-gates-'));
  await mkdir(join(dir, '.claude/hooks'), { recursive: true });
  await mkdir(join(dir, '.harness'));
  await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x', scripts: { test: 'node --test' } }));
  if (hook !== undefined) await writeFile(join(dir, '.claude/hooks/pre-commit-check.sh'), hook, { mode: 0o755 });
  if (config !== undefined) await writeFile(join(dir, '.harness/config.json'), JSON.stringify(config));
  return dir;
}

const readConfig = async dir => JSON.parse(await readFile(join(dir, '.harness/config.json'), 'utf8'));

test('migrateGates: 현재 래퍼 훅 + gates 없음 → 제안을 기록한다', async () => {
  const dir = await project({ hook: await readFile(CURRENT, 'utf8'), config: { user: 'hslee' } });
  try {
    assert.equal(await migrateGates(ctxFor(dir)), true);
    const cfg = await readConfig(dir);
    assert.equal(cfg.user, 'hslee');
    assert.deepEqual(cfg.gates, { commit: ['npm run test'] });
    assert.equal(cfg.fingerprint.preset, 'node');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('migrateGates: 구판·커스터마이즈 훅이면 건드리지 않는다', async () => {
  for (const hook of [await readFile(PRIOR, 'utf8'), '#!/bin/bash\n# team-owned\nexit 0\n']) {
    const dir = await project({ hook, config: { user: 'hslee' } });
    try {
      assert.equal(await migrateGates(ctxFor(dir)), false);
      assert.deepEqual(await readConfig(dir), { user: 'hslee' });
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
});

test('migrateGates: 이미 gates가 있으면 덮지 않는다', async () => {
  const dir = await project({ hook: await readFile(CURRENT, 'utf8'), config: { gates: { commit: ['custom'] } } });
  try {
    assert.equal(await migrateGates(ctxFor(dir)), false);
    assert.deepEqual((await readConfig(dir)).gates, { commit: ['custom'] });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('migrate --yes: 구판 stock 훅을 래퍼로 갱신한 같은 실행에서 gates까지 제안·기록한다', async () => {
  const dir = await project({ hook: await readFile(PRIOR, 'utf8'), config: { user: 'hslee' } });
  try {
    const r = await new Promise((res, rej) => {
      const child = spawn(process.execPath, [BIN, 'migrate', '--yes', '--target', dir], { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] });
      let out = '';
      child.stdout.on('data', d => { out += d; });
      child.stderr.on('data', d => { out += d; });
      child.on('error', rej);
      child.on('close', code => res({ code, out }));
      child.stdin.end();
    });
    assert.equal(r.code, 0, r.out);
    assert.equal(await readFile(join(dir, '.claude/hooks/pre-commit-check.sh'), 'utf8'), await readFile(CURRENT, 'utf8'));
    assert.deepEqual((await readConfig(dir)).gates, { commit: ['npm run test'] });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

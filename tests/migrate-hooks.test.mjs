import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readdir, readFile, writeFile, symlink, rm, access } from 'node:fs/promises';
import { constants, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { refreshClaudeHooks, CLAUDE_HOOK_FILES, KNOWN_STOCK_HOOK_SHA256 } from '../src/commands/migrate.mjs';

// PR #29의 jq-fallback 보안 수정이 기존 설치에 실제로 도달하는지 검증한다.
// copyStaticAssets는 훅을 skipExisting으로 복사하므로 migrate의 refreshClaudeHooks가
// 유일한 배달 경로다 — 알려진 stock 버전(sha256)만 갱신, 커스터마이즈는 절대 보존.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(ROOT, 'tests/fixtures/stock-hooks');
const TEMPLATES = join(ROOT, 'templates/.claude/hooks');

const sha256 = (body) => createHash('sha256').update(body).digest('hex');
const ctxFor = (dir) => ({ root: ROOT, targetDir: dir, flags: { yes: true } });

async function plantHooks(srcDir, files) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-hookrefresh-'));
  await mkdir(join(dir, '.claude/hooks'), { recursive: true });
  for (const name of files) {
    const body = await readFile(join(srcDir, name), 'utf8');
    await writeFile(join(dir, '.claude/hooks', name), body, { mode: 0o755 });
  }
  return dir;
}

// PATH의 실제 바이너리만 찾는다 — 셸 함수/alias 오염 회피 (hooks-jq-fallback.test.mjs 패턴).
async function which(cmd) {
  for (const dir of (process.env.PATH || '').split(':')) {
    if (!dir) continue;
    const p = join(dir, cmd);
    try { await access(p, constants.X_OK); return p; } catch { /* keep looking */ }
  }
  return null;
}

// jq 없는 최소 PATH — macOS는 /usr/bin/jq가 기본 탑재라 PATH 제한이 아니면 재현이 안 된다.
const NOJQ_BIN = await (async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-hookrefresh-bins-'));
  for (const cmd of ['cat', 'grep']) {
    const p = await which(cmd);
    assert.ok(p, `${cmd} must exist to run the hooks`);
    await symlink(p, join(dir, cmd));
  }
  return dir;
})();
process.on('exit', () => { try { rmSync(NOJQ_BIN, { recursive: true, force: true }); } catch {} });

function runHookNoJq(hookPath, payload) {
  return new Promise((res, rej) => {
    const child = spawn(hookPath, [], { env: { PATH: NOJQ_BIN }, stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', d => { stderr += d; });
    child.on('error', rej);
    child.on('close', code => res({ code, stderr }));
    child.stdin.end(JSON.stringify(payload));
  });
}

const FORCE_PUSH = { tool_name: 'Bash', tool_input: { command: 'git push --force' } };

test('KNOWN_STOCK_HOOK_SHA256는 fixture의 실제 바이트와 일치한다 (테이블 드리프트 가드)', async () => {
  const eras = (await readdir(FIXTURES, { withFileTypes: true })).filter(e => e.isDirectory()).map(e => e.name);
  assert.ok(eras.length >= 3, `stock fixture era 디렉터리를 기대 — 실제: ${eras.join(', ')}`);
  let checked = 0;
  for (const era of eras) {
    for (const name of (await readdir(join(FIXTURES, era))).filter(f => f.endsWith('.sh'))) {
      const body = await readFile(join(FIXTURES, era, name), 'utf8');
      assert.ok((KNOWN_STOCK_HOOK_SHA256[name] || []).includes(sha256(body)),
        `${era}/${name}의 sha256이 KNOWN_STOCK_HOOK_SHA256에 없다 — fixture와 테이블이 어긋났다`);
      const tpl = await readFile(join(TEMPLATES, name), 'utf8');
      assert.notEqual(body, tpl, `${era}/${name}이 현재 템플릿과 같다 — stock fixture는 과거 버전이어야 한다`);
      checked++;
    }
  }
  assert.equal(checked, 10, `알려진 stock 버전 10개를 기대 — 실제: ${checked}`);
});

test('P1-1 수용 기준: pre-jq-fallback 설치본 — fail-open 재현 → migrate refresh → jq 없이 차단', async () => {
  const dir = await plantHooks(join(FIXTURES, 'pre-jq-fallback'), CLAUDE_HOOK_FILES);
  try {
    const staleHook = join(dir, '.claude/hooks/block-dangerous-git.sh');
    const before = await runHookNoJq(staleHook, FORCE_PUSH);
    assert.equal(before.code, 0, '구버전 훅은 jq 없으면 force push를 통과시켜야(fail-open) 재현이 성립한다');

    const changed = await refreshClaudeHooks(ctxFor(dir));
    assert.equal(changed, true, 'stock 구버전 4개는 refresh 대상이다');

    for (const name of CLAUDE_HOOK_FILES) {
      const installed = await readFile(join(dir, '.claude/hooks', name), 'utf8');
      const tpl = await readFile(join(TEMPLATES, name), 'utf8');
      assert.equal(installed, tpl, `${name}은 현재 템플릿으로 갱신돼야 한다`);
      await access(join(dir, '.claude/hooks', name), constants.X_OK);
    }

    const after = await runHookNoJq(staleHook, FORCE_PUSH);
    assert.equal(after.code, 2, `refresh 후에는 jq 없어도 차단(exit 2)해야 한다 — stderr: ${after.stderr}`);
    assert.match(after.stderr, /저정밀 모드/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('커스터마이즈된 훅은 절대 덮지 않는다 — 나머지 stock만 refresh', async () => {
  const dir = await plantHooks(join(FIXTURES, 'pre-jq-fallback'), CLAUDE_HOOK_FILES);
  try {
    const customPath = join(dir, '.claude/hooks/protect-files.sh');
    const custom = (await readFile(customPath, 'utf8')) + '\n# 사용자 커스텀 패턴\n';
    await writeFile(customPath, custom);

    const changed = await refreshClaudeHooks(ctxFor(dir));
    assert.equal(changed, true, '커스텀 1개를 빼고도 stock 3개는 refresh된다');

    assert.equal(await readFile(customPath, 'utf8'), custom, '커스터마이즈된 훅은 바이트 그대로 보존');
    for (const name of CLAUDE_HOOK_FILES.filter(n => n !== 'protect-files.sh')) {
      const tpl = await readFile(join(TEMPLATES, name), 'utf8');
      assert.equal(await readFile(join(dir, '.claude/hooks', name), 'utf8'), tpl);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('현재 템플릿과 동일한 설치본 → false, 불변 (멱등)', async () => {
  const dir = await plantHooks(TEMPLATES, CLAUDE_HOOK_FILES);
  try {
    assert.equal(await refreshClaudeHooks(ctxFor(dir)), false);
    for (const name of CLAUDE_HOOK_FILES) {
      const tpl = await readFile(join(TEMPLATES, name), 'utf8');
      assert.equal(await readFile(join(dir, '.claude/hooks', name), 'utf8'), tpl);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('가장 오래된 stock 판(도입판·pnpm 하드코딩판)도 refresh 대상이다', async () => {
  const dir = await plantHooks(join(FIXTURES, 'older'), ['block-dangerous-git.sh', 'pre-commit-check.sh']);
  try {
    assert.equal(await refreshClaudeHooks(ctxFor(dir)), true);
    for (const name of ['block-dangerous-git.sh', 'pre-commit-check.sh']) {
      const tpl = await readFile(join(TEMPLATES, name), 'utf8');
      assert.equal(await readFile(join(dir, '.claude/hooks', name), 'utf8'), tpl);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('PR #29 판(jq-fallback v1)도 stock이면 최신 템플릿으로 갱신된다 (tool_input 스코프 배달)', async () => {
  const dir = await plantHooks(join(FIXTURES, 'jq-fallback-v1'), CLAUDE_HOOK_FILES);
  try {
    assert.equal(await refreshClaudeHooks(ctxFor(dir)), true);
    for (const name of CLAUDE_HOOK_FILES) {
      const tpl = await readFile(join(TEMPLATES, name), 'utf8');
      assert.equal(await readFile(join(dir, '.claude/hooks', name), 'utf8'), tpl);
      assert.match(tpl, /json_input_field/, 'v1 → 현재 템플릿 갱신이 스코프 수정을 배달한다');
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('훅 미설치 프로젝트 → false (설치 없는 곳에 새로 깔지 않는다)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-hookrefresh-'));
  try {
    assert.equal(await refreshClaudeHooks(ctxFor(dir)), false);
    assert.equal((await readdir(dir)).includes('.claude'), false, 'refresh가 .claude를 만들면 안 된다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

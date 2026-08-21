import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm, chmod, access } from 'node:fs/promises';
import { constants, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

// jq가 PATH에 없을 때 훅이 조용히 무력화되던 fail-open 회귀 가드.
// 같은 매트릭스를 jq 있는 PATH와 없는 PATH 양쪽에서 돌려 "판정이 같은지"를 본다.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = join(ROOT, 'templates/.claude/hooks');

// PATH의 실제 바이너리만 찾는다 — 셸 함수/alias(ugrep 래핑 등)에 오염되지 않게.
async function which(cmd) {
  for (const dir of (process.env.PATH || '').split(':')) {
    if (!dir) continue;
    const p = join(dir, cmd);
    try { await access(p, constants.X_OK); return p; } catch { /* keep looking */ }
  }
  return null;
}

const JQ = await which('jq');
const NPX_LOG = 'npx-args.log';

// cat/grep만 담은 최소 PATH 두 벌(jq 있음/없음) + npx 스텁.
// 훅은 shebang(#!/bin/bash)으로 실행되므로 PATH에 bash가 없어도 된다.
async function makeBins() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-jq-bins-'));
  const nojq = join(dir, 'nojq');
  const withjq = join(dir, 'withjq');
  await mkdir(nojq); await mkdir(withjq);
  for (const cmd of ['cat', 'grep']) {
    const p = await which(cmd);
    assert.ok(p, `${cmd} must exist to run the hooks`);
    await symlink(p, join(nojq, cmd));
    await symlink(p, join(withjq, cmd));
  }
  // node는 실제 실행 파일 경로로 — pre-commit-check의 .scripts.test 폴백이 쓴다.
  await symlink(process.execPath, join(nojq, 'node'));
  await symlink(process.execPath, join(withjq, 'node'));
  if (JQ) await symlink(JQ, join(withjq, 'jq'));
  // prettier를 실제로 돌리지 않고 auto-format이 넘긴 경로만 기록하는 스텁.
  for (const b of [nojq, withjq]) {
    const stub = join(b, 'npx');
    await writeFile(stub, '#!/bin/sh\necho "$@" >> "$NPX_LOG"\n');
    await chmod(stub, 0o755);
  }
  return { dir, nojq, withjq };
}

const BINS = await makeBins();
process.on('exit', () => { try { rmSync(BINS.dir, { recursive: true, force: true }); } catch {} });

function runHook(hook, payload, { mode = 'nojq', cwd = ROOT, env = {} } = {}) {
  return new Promise((res, rej) => {
    const child = spawn(join(HOOKS, hook), [], {
      cwd,
      env: { PATH: BINS[mode], ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('error', rej);
    child.on('close', code => res({ code, stdout, stderr }));
    child.stdin.end(typeof payload === 'string' ? payload : JSON.stringify(payload));
  });
}

const bash = (command, description) =>
  ({ tool_name: 'Bash', tool_input: description === undefined ? { command } : { command, description } });

// jq 있는 쪽 매트릭스가 "판정 기준이 그대로임"을 증명하는 절반이다. 로컬에는 jq가 없을 수 있으니
// 건너뛰되, CI에서 조용히 절반이 사라지는 것은 초록색 거짓말이므로 실패로 드러낸다.
const MODES = JQ ? ['withjq', 'nojq'] : ['nojq'];
if (!JQ) console.error('⚠ jq가 없어 jq-present 매트릭스는 건너뜁니다 (jq-absent 매트릭스는 그대로 실행).');

test('CI에서는 jq-present 매트릭스가 반드시 실행된다', { skip: !process.env.CI }, () => {
  assert.ok(JQ, 'CI 이미지에 jq가 없으면 매트릭스 절반이 조용히 사라진다 — 설치하거나 이 가드를 재검토할 것');
});

// ── block-dangerous-git.sh ────────────────────────────────────────────────────
// 2026-07-02 병합 당시 수동으로만 돌렸던 차단/허용 매트릭스를 자동화한 것.
const GIT_BLOCK = [
  ['force push', bash('git push --force')],
  ['force-with-lease', bash('git push --force-with-lease origin main')],
  ['push -f', bash('git push -f origin main')],
  ['reset --hard', bash('git reset --hard HEAD~1')],
  ['clean -fd', bash('git clean -fd')],
  ['clean --force', bash('git clean --force')],
  ['branch -D', bash('git branch -D feature')],
  ['checkout .', bash('git checkout .')],
  ['checkout -- <file>', bash('git checkout -- src/app.ts')],
  ['restore <워킹트리>', bash('git restore src/app.ts')],
];

const GIT_ALLOW = [
  ['plain push', bash('git push origin main')],
  ['push --follow-tags', bash('git push --follow-tags origin main')],
  ['restore --staged', bash('git restore --staged src/app.ts')],
  ['branch -d', bash('git branch -d feature')],
  ['checkout -b', bash('git checkout -b feature')],
  ['checkout --track', bash('git checkout --track origin/feature')],
  ['clean -n', bash('git clean -n')],
  ['git status', bash('git status')],
  ['reset --soft', bash('git reset --soft HEAD~1')],
  ['branch my-Data (-D 경계)', bash('git branch my-Data')],
  ['비-git 명령', bash('npm run test')],
  ['non-Bash 도구', { tool_name: 'Read', tool_input: { file_path: '/proj/src/app.ts' } }],
];

for (const mode of MODES) {
  test(`block-dangerous-git [${mode}]: 파괴적 명령 ${GIT_BLOCK.length}종을 차단한다`, async () => {
    for (const [name, payload] of GIT_BLOCK) {
      const r = await runHook('block-dangerous-git.sh', payload, { mode });
      assert.equal(r.code, 2, `${name} 은 차단(exit 2)이어야 한다 — stderr: ${r.stderr}`);
    }
  });

  test(`block-dangerous-git [${mode}]: 안전한 명령 ${GIT_ALLOW.length}종을 통과시킨다`, async () => {
    for (const [name, payload] of GIT_ALLOW) {
      const r = await runHook('block-dangerous-git.sh', payload, { mode });
      assert.equal(r.code, 0, `${name} 은 통과(exit 0)여야 한다 — stderr: ${r.stderr}`);
    }
  });

  // description 필드는 모델이 쓰는 자유 문자열이다. payload 전체를 스캔하면 여기에 들어간
  // ` -- ` / ` -f ` 같은 토큰이 command 의 정규식을 완성시켜 안전한 명령이 차단된다.
  // 폴백이 command 필드만 보는지 고정하는 가드.
  test(`block-dangerous-git [${mode}]: description 문구가 판정을 바꾸지 않는다`, async () => {
    const cases = [
      bash('git checkout -b feat/x', 'branch off main -- do not touch'),
      bash('git push origin main', 'push the branch -f is not used'),
      bash('git status', 'check before git reset --hard'),
      bash('git checkout -b feat', 'Install deps. Then build'),
      bash('git branch -d old', 'delete -D style leftovers'),
    ];
    for (const payload of cases) {
      const r = await runHook('block-dangerous-git.sh', payload, { mode });
      assert.equal(r.code, 0, `description 때문에 차단되면 안 된다: ${JSON.stringify(payload)} — ${r.stderr}`);
    }
  });

  // 상류 병합 때 "의식적으로 수용한 잔여 리스크" — 이번 범위가 아니므로 현재 동작을 고정만 한다.
  test(`block-dangerous-git [${mode}]: 알려진 잔여 리스크의 현재 동작을 고정한다`, async () => {
    const fp = await runHook('block-dangerous-git.sh', bash('git commit -m "docs: git reset --hard 설명"'), { mode });
    assert.equal(fp.code, 2, '커밋 메시지 오탐(차단)은 알려진 수용 리스크다');
    const fn = await runHook('block-dangerous-git.sh', bash('git -C other push --force'), { mode });
    assert.equal(fn.code, 0, 'git -C 프리픽스 우회(통과)는 알려진 수용 리스크다');
  });

  test(`block-dangerous-git [${mode}]: JSON 이스케이프가 든 명령도 같은 판정`, async () => {
    const quoted = await runHook('block-dangerous-git.sh', bash('git commit -m "say \\"hi\\" now"'), { mode });
    assert.equal(quoted.code, 0);
    const injected = await runHook(
      'block-dangerous-git.sh',
      bash('git status', 'payload 흉내: "command":"git push --force"'),
      { mode },
    );
    assert.equal(injected.code, 0, 'description 안의 이스케이프된 키 흉내는 추출 대상이 아니다');
  });
}

test('block-dangerous-git: jq 없이도 차단하고, 저정밀 모드임을 알린다', async () => {
  const r = await runHook('block-dangerous-git.sh', bash('git push --force'), { mode: 'nojq' });
  assert.equal(r.code, 2);
  assert.match(r.stderr, /jq/, '차단 메시지에 jq 부재가 드러나야 한다');
  assert.doesNotMatch(r.stderr, /command not found/, 'jq 부재는 command -v로 감지해야 한다 (에러 유출 금지)');
  assert.match(r.stderr, /git push --force/, '차단 메시지는 payload 전체가 아니라 명령을 보여준다');
});

// ── protect-files.sh ──────────────────────────────────────────────────────────
const PROTECT_BLOCK = [
  ['.env', { tool_name: 'Edit', tool_input: { file_path: '/proj/.env' } }],
  ['.env.local', { tool_name: 'Write', tool_input: { file_path: '/proj/.env.local' } }],
  ['ios/Pods', { tool_name: 'Edit', tool_input: { file_path: '/proj/ios/Pods/Podfile' } }],
  ['android/build', { tool_name: 'Edit', tool_input: { file_path: '/proj/android/build/gradle.properties' } }],
  ['node_modules/', { tool_name: 'Write', tool_input: { file_path: '/proj/node_modules/x/index.js' } }],
  ['.git/', { tool_name: 'Edit', tool_input: { file_path: '/proj/.git/config' } }],
  ['command 폴백', { tool_name: 'Bash', tool_input: { command: 'echo x > .env' } }],
];

const PROTECT_ALLOW = [
  ['일반 소스', { tool_name: 'Edit', tool_input: { file_path: '/proj/src/app.ts' } }],
  ['문서', { tool_name: 'Write', tool_input: { file_path: '/proj/docs/readme.md' } }],
  ['환경과 무관한 명령', { tool_name: 'Bash', tool_input: { command: 'npm run build' } }],
  ['빈 payload', {}],
];

for (const mode of MODES) {
  test(`protect-files [${mode}]: 보호 대상 편집을 차단한다`, async () => {
    for (const [name, payload] of PROTECT_BLOCK) {
      const r = await runHook('protect-files.sh', payload, { mode });
      assert.equal(r.code, 2, `${name} 은 차단(exit 2)이어야 한다 — stderr: ${r.stderr}`);
    }
  });

  test(`protect-files [${mode}]: 보호 대상이 아니면 통과시킨다`, async () => {
    for (const [name, payload] of PROTECT_ALLOW) {
      const r = await runHook('protect-files.sh', payload, { mode });
      assert.equal(r.code, 0, `${name} 은 통과(exit 0)여야 한다 — stderr: ${r.stderr}`);
    }
  });
}

for (const mode of MODES) {
  // protect-files는 file_path → command → payload 전체의 2단계 추출 체인을 탄다.
  // 문자열 안에 키 이름이 흉내로 들어가도(이스케이프되므로) 추출 대상이 아니어야 하고,
  // 보호 대상 이름이 "내용"에만 있는 편집은 통과해야 한다.
  test(`protect-files [${mode}]: 추출 체인이 payload 내용에 낚이지 않는다`, async () => {
    const cases = [
      { tool_name: 'Edit', tool_input: { file_path: '/x/a.ts', old_string: 'run "command": "git push --force"' } },
      { tool_name: 'Edit', tool_input: { file_path: '/proj/docs/env.md', new_string: 'see .env for secrets' } },
      { tool_name: 'Bash', tool_input: { command: 'echo hi', description: '"file_path": "/x/.env"' } },
      { tool_name: 'Bash', tool_input: { command: '' } },
      { tool_name: 'Edit', tool_input: { old_string: 'x', new_string: 'y' } },
    ];
    for (const payload of cases) {
      const r = await runHook('protect-files.sh', payload, { mode });
      assert.equal(r.code, 0, `통과해야 한다: ${JSON.stringify(payload)} — ${r.stderr}`);
    }
  });
}

test('protect-files: jq 없이도 .env 편집을 차단하고 저정밀 모드를 알린다', async () => {
  const r = await runHook('protect-files.sh', { tool_name: 'Edit', tool_input: { file_path: '/proj/.env' } }, { mode: 'nojq' });
  assert.equal(r.code, 2);
  assert.match(r.stderr, /jq/);
  assert.doesNotMatch(r.stderr, /command not found/);
});

// ── pre-commit-check.sh ───────────────────────────────────────────────────────
// 게이트가 실제로 막는 프로젝트 상태를 만들어 jq 있음/없음을 대조한다.
// PATH에 npm/npx가 없으므로 test 스크립트 실행은 반드시 실패한다 — 게이트에 도달했는지가 관심사다.
async function jsProject(pkg) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-precommit-'));
  await writeFile(join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  return dir;
}

for (const mode of MODES) {
  test(`pre-commit-check [${mode}]: test 스크립트가 있으면 커밋 게이트가 돈다`, async () => {
    const dir = await jsProject({ name: 'x', scripts: { test: 'node --test' } });
    try {
      const r = await runHook('pre-commit-check.sh', bash('git commit -m "wip"'), { mode, cwd: dir });
      assert.match(r.stderr, /커밋 전 검증 실행 중/, '게이트에 도달해야 한다');
      assert.equal(r.code, 2, 'test 실행이 실패하면 커밋을 막는다');
      assert.match(r.stderr, /테스트 실패/);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test(`pre-commit-check [${mode}]: test 스크립트가 없으면 통과시킨다`, async () => {
    const dir = await jsProject({ name: 'x', scripts: { build: 'tsc' } });
    try {
      const r = await runHook('pre-commit-check.sh', bash('git commit -m "wip"'), { mode, cwd: dir });
      assert.equal(r.code, 0, `stderr: ${r.stderr}`);
      assert.match(r.stderr, /검증 통과/);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test(`pre-commit-check [${mode}]: commit이 아닌 명령·non-Bash는 관여하지 않는다`, async () => {
    const dir = await jsProject({ name: 'x', scripts: { test: 'node --test' } });
    try {
      for (const payload of [bash('git status'), { tool_name: 'Read', tool_input: { file_path: '/x' } }]) {
        const r = await runHook('pre-commit-check.sh', payload, { mode, cwd: dir });
        assert.equal(r.code, 0, `stderr: ${r.stderr}`);
        assert.doesNotMatch(r.stderr, /커밋 전 검증 실행 중/, '게이트를 돌리지 않아야 한다');
      }
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
}

test('pre-commit-check: jq 없이도 게이트가 돌고 저정밀 모드를 알린다', async () => {
  const dir = await jsProject({ name: 'x', scripts: { test: 'node --test' } });
  try {
    const r = await runHook('pre-commit-check.sh', bash('git commit -m "wip"'), { mode: 'nojq', cwd: dir });
    assert.equal(r.code, 2);
    assert.match(r.stderr, /저정밀 모드/);
    assert.doesNotMatch(r.stderr, /command not found/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// ── auto-format.sh ────────────────────────────────────────────────────────────
// 보안 통제가 아니라 편의 기능 — 판정(항상 exit 0)은 그대로 두고 경로 추출만 폴백에 맡긴다.
// npx 스텁이 받은 인자로 "경로를 제대로 뽑았는지"를 본다.
for (const mode of MODES) {
  test(`auto-format [${mode}]: 포맷 대상 경로를 그대로 prettier에 넘긴다`, async () => {
    const dir = await mkdtemp(join(tmpdir(), 'harness-autofmt-'));
    try {
      const file = join(dir, 'a.ts');
      await writeFile(file, 'export const a = 1\n');
      const log = join(dir, NPX_LOG);
      const r = await runHook('auto-format.sh', { tool_name: 'Write', tool_input: { file_path: file } }, { mode, cwd: dir, env: { NPX_LOG: log } });
      assert.equal(r.code, 0);
      assert.equal((await readFile(log, 'utf8')).trim(), `prettier --write ${file}`);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  test(`auto-format [${mode}]: 대상 확장자가 아니거나 경로가 없으면 아무것도 안 한다`, async () => {
    const dir = await mkdtemp(join(tmpdir(), 'harness-autofmt-'));
    try {
      const log = join(dir, NPX_LOG);
      for (const payload of [
        { tool_name: 'Write', tool_input: { file_path: join(dir, 'a.md') } },
        { tool_name: 'Bash', tool_input: { command: 'npm run build' } },
        {},
      ]) {
        const r = await runHook('auto-format.sh', payload, { mode, cwd: dir, env: { NPX_LOG: log } });
        assert.equal(r.code, 0);
      }
      await assert.rejects(() => readFile(log, 'utf8'), 'npx가 호출되면 안 된다');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
}

// ── 드리프트 가드 ─────────────────────────────────────────────────────────────
// 훅은 소비자 프로젝트로 파일 단위 복사(copyTree, skipExisting)되므로 공유 라이브러리를
// source 하지 않고 자체 완결형으로 둔다. 대신 공통 블록이 갈라지지 않게 여기서 대조한다.
const MARK_OPEN = '# --- harness:jq-fallback';
const MARK_CLOSE = '# --- /harness:jq-fallback ---';

function fallbackBlock(src) {
  const start = src.indexOf(MARK_OPEN);
  const end = src.indexOf(MARK_CLOSE);
  if (start === -1 || end === -1) return null;
  return src.slice(start, end + MARK_CLOSE.length);
}

test('jq를 쓰는 훅은 모두 동일한 폴백 블록을 갖는다', async () => {
  const { readdir } = await import('node:fs/promises');
  const files = (await readdir(HOOKS)).filter(f => f.endsWith('.sh'));
  const blocks = new Map();
  for (const f of files) {
    const src = await readFile(join(HOOKS, f), 'utf8');
    const usesJq = /\bjq\s+-/.test(src); // 주석 언급이 아니라 실제 호출(jq -r / jq -e)만 센다
    const block = fallbackBlock(src);
    if (!usesJq) { assert.equal(block, null, `${f}는 jq를 쓰지 않으므로 폴백 블록도 없어야 한다`); continue; }
    assert.ok(block, `${f}는 jq를 쓰는데 폴백 블록이 없다 — fail-open 회귀`);
    blocks.set(f, block);
  }
  assert.equal(blocks.size, 4, `jq를 쓰는 훅 4개를 기대 — 실제: ${[...blocks.keys()].join(', ')}`);
  const [first, ...rest] = [...blocks.entries()];
  for (const [name, block] of rest) {
    assert.equal(block, first[1], `${name}의 폴백 블록이 ${first[0]}와 다르다 (복붙 드리프트)`);
  }
});

test('훅은 jq 부재를 command -v로 감지한다 (조기 exit 0 회귀 금지)', async () => {
  for (const f of ['block-dangerous-git.sh', 'protect-files.sh', 'pre-commit-check.sh', 'auto-format.sh']) {
    const src = await readFile(join(HOOKS, f), 'utf8');
    assert.match(src, /command -v jq/, `${f}는 jq 유무를 먼저 확인해야 한다`);
  }
});

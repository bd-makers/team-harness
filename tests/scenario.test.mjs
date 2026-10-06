import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseDoneEvidenceDeclaration } from '../src/commands/task.mjs';
import { runScenario, runScenarioCheck } from '../src/commands/scenario.mjs';

// 시나리오 테스트 이름의 `R2-S<n>` 접두는 이 task spec의 증거 `test`·`cmd`가 가리키는 이름이다.

function scenario(overrides = {}) {
  return { id: 'S1', given: 'g', when: 'w', then: 't', test: 'demo', cmd: 'true', ...overrides };
}

function spec(declaration) {
  return `# demo — Spec\n\n## Done evidence\n\n\`\`\`json\n${JSON.stringify(declaration, null, 2)}\n\`\`\`\n`;
}

async function fixture(specText) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-scenario-'));
  const taskDir = join(dir, 'docs', 'tester', 'demo');
  await mkdir(join(dir, '.harness'), { recursive: true });
  await mkdir(taskDir, { recursive: true });
  await writeFile(join(dir, '.harness', 'active.json'), JSON.stringify({ user: 'tester', task: 'demo', path: 'docs/tester/demo' }));
  await writeFile(join(taskDir, 'demo-spec.md'), specText);
  return dir;
}

async function check(specText, run = runScenarioCheck, taskArgs = ['check']) {
  const dir = await fixture(specText);
  const lines = [];
  const original = console.log;
  const previousExitCode = process.exitCode;
  console.log = (...args) => lines.push(args.join(' '));
  try {
    process.exitCode = undefined;
    const result = await run({ targetDir: dir, flags: {}, taskArgs });
    return { dir, result, lines, exitCode: process.exitCode };
  } finally {
    console.log = original;
    process.exitCode = previousExitCode;
  }
}

test('R2-S1: 증거(cmd)가 빠진 시나리오는 선언 invalid이고 사유에 그 id가 나온다', () => {
  const { cmd: _omit, ...noCmd } = scenario({ id: 'login-ok' });
  const parsed = parseDoneEvidenceDeclaration(spec({ version: 1, scenarios: [noCmd] }));
  assert.equal(parsed.status, 'invalid');
  assert.match(parsed.reason, /login-ok/);
  assert.match(parsed.reason, /cmd/);
});

test('R2-S1: 빈 문자열 test·빈 배열·알 수 없는 키·중복 id도 invalid, 정상 선언은 scenarios를 돌려준다', () => {
  const invalid = [
    [scenario({ test: '  ' })],
    [],
    [{ ...scenario(), note: 'x' }],
    [scenario(), scenario()],
    [null],
    'S1',
  ];
  for (const scenarios of invalid) {
    assert.equal(parseDoneEvidenceDeclaration(spec({ version: 1, scenarios })).status, 'invalid', JSON.stringify(scenarios));
  }
  const ok = parseDoneEvidenceDeclaration(spec({ version: 1, review: 'required', scenarios: [scenario(), scenario({ id: 'S2' })] }));
  assert.equal(ok.status, 'configured');
  assert.equal(ok.review, 'required');
  assert.deepEqual(ok.scenarios.map(s => s.id), ['S1', 'S2']);
  assert.equal(parseDoneEvidenceDeclaration(spec({ version: 1 })).scenarios, undefined, '미선언이면 scenarios 없음');
});

test('R2-S2: 모든 증거 명령이 exit 0이면 pass (N checked), exit 0, 시나리오별 G/W/T 줄', async () => {
  const r = await check(spec({ version: 1, scenarios: [scenario(), scenario({ id: 'S2', cmd: 'exit 0' })] }));
  try {
    assert.equal(r.exitCode, undefined);
    assert.equal(r.result.status, 'pass');
    assert.ok(r.lines.includes('scenario: pass (2 checked)'));
    assert.ok(r.lines.some(l => l.startsWith('S1 pass — Given g / When w / Then t')));
  } finally { await rm(r.dir, { recursive: true, force: true }); }
});

test('R2-S3: 증거 하나가 실패하면 failed + 그 id의 failure 줄, exit 2, 나머지도 판정한다', async () => {
  const r = await check(spec({ version: 1, scenarios: [
    scenario({ id: 'bad', cmd: 'exit 3' }),
    scenario({ id: 'good' }),
    scenario({ id: 'missing', cmd: 'harness-no-such-command-xyz' }),
  ] }));
  try {
    assert.equal(r.exitCode, 2);
    assert.ok(r.lines.includes('scenario: failed'));
    assert.ok(r.lines.includes('failure: bad | exit-nonzero | exit 3: exit 3'));
    assert.ok(r.lines.includes('failure: missing | command-not-found | harness-no-such-command-xyz'));
    assert.ok(r.lines.some(l => l.startsWith('good pass')), '실패 뒤의 시나리오도 판정된다');
  } finally { await rm(r.dir, { recursive: true, force: true }); }
});

test('R2-S3: 깨진 선언은 failed(invalid-declaration), exit 2', async () => {
  const r = await check(spec({ version: 1, scenarios: [] }));
  try {
    assert.equal(r.exitCode, 2);
    assert.ok(r.lines.some(l => l.startsWith('failure: declaration | invalid-declaration |')));
  } finally { await rm(r.dir, { recursive: true, force: true }); }
});

test('R2-S4: scenarios 선언이 없으면 not-configured, exit 0', async () => {
  for (const text of ['# demo — Spec\n', spec({ version: 1, review: 'required' })]) {
    const r = await check(text);
    try {
      assert.equal(r.exitCode, undefined);
      assert.deepEqual(r.lines, ['scenario: not-configured']);
    } finally { await rm(r.dir, { recursive: true, force: true }); }
  }
});

test('R2-S5: 같은 cmd를 쓰는 시나리오들은 명령을 한 번만 실행한다', async () => {
  const cmd = 'echo run >> count.txt';
  const r = await check(spec({ version: 1, scenarios: [scenario({ cmd }), scenario({ id: 'S2', cmd })] }));
  try {
    assert.equal(r.result.status, 'pass');
    assert.equal(await readFile(join(r.dir, 'count.txt'), 'utf8'), 'run\n');
  } finally { await rm(r.dir, { recursive: true, force: true }); }
});

test('scenario: check 외의 동작은 usage, exit 2', async () => {
  const r = await check('# demo — Spec\n', runScenario, ['run']);
  try {
    assert.equal(r.exitCode, 2);
    assert.ok(r.lines.includes('usage: harness-team scenario check'));
  } finally { await rm(r.dir, { recursive: true, force: true }); }
});

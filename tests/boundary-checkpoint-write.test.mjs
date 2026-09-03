// Two checkpoint gaps from the 2026-09-03 audit:
//  1. failures went to stdout only — Claude Code shows Claude just stderr on exit 2, so a
//     blocked edit arrived with no reason;
//  2. the hook is wired for Edit|Write but ignored Write outright, so completing a plan
//     checkbox by rewriting the file skipped the boundary check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BIN = join(ROOT, 'bin', 'harness-team.mjs');

const objectSchema = (properties) => ({ type: 'object', properties, required: Object.keys(properties) });

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-checkpoint-write-'));
  const taskDir = join(dir, 'docs', 'tester', 'demo');
  await mkdir(join(dir, '.harness'), { recursive: true });
  await mkdir(join(dir, 'schemas'), { recursive: true });
  await mkdir(taskDir, { recursive: true });
  await writeFile(join(dir, '.harness', 'active.json'), JSON.stringify({ user: 'tester', task: 'demo', path: 'docs/tester/demo' }));
  await writeFile(join(taskDir, 'demo-spec.md'), `# demo — Spec\n\n## Boundary contracts\n\n\`\`\`json\n${JSON.stringify({
    version: 1, boundaries: [{ id: 'users', producer: { path: 'schemas/producer.json' }, consumer: { path: 'schemas/consumer.json' } }],
  })}\n\`\`\`\n`);
  const planPath = join(taskDir, 'demo-plan.md');
  await writeFile(planPath, '# demo — Plan\n- [ ] verify boundary\n- [x] already done\n');
  await writeFile(join(dir, 'schemas', 'producer.json'), JSON.stringify(objectSchema({ user_id: { type: 'string' } })));
  await writeFile(join(dir, 'schemas', 'consumer.json'), JSON.stringify(objectSchema({ userId: { type: 'string' } })));
  return { dir, planPath };
}

function checkpoint(dir, input) {
  return new Promise((res) => {
    const child = spawn(process.execPath, [BIN, 'boundary', 'checkpoint'], { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('close', code => res({ code, stdout, stderr }));
    child.stdin.end(JSON.stringify(input));
  });
}

test('checkpoint: Edit 차단 사유가 stderr에도 나온다 (Claude는 exit 2에서 stderr만 본다)', async () => {
  const { dir, planPath } = await fixture();
  try {
    const r = await checkpoint(dir, { tool_name: 'Edit', tool_input: { file_path: planPath, old_string: '- [ ] verify boundary', new_string: '- [x] verify boundary' } });
    assert.equal(r.code, 2);
    assert.match(r.stdout, /boundary: failed/, 'stdout 계약 유지 (e2e 테스트)');
    assert.match(r.stderr, /boundary: failed/, '차단 사유는 stderr로도');
    assert.match(r.stderr, /missing-field/, '구체 사유까지 stderr로');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkpoint: Write로 plan 전체를 다시 쓰며 checkbox를 채우면 boundary 검사가 돈다', async () => {
  const { dir, planPath } = await fixture();
  try {
    const completing = await checkpoint(dir, { tool_name: 'Write', tool_input: { file_path: planPath, content: '# demo — Plan\n- [x] verify boundary\n- [x] already done\n' } });
    assert.equal(completing.code, 2, `checked 개수가 늘었으니 검사 → 불일치로 차단: ${completing.stdout}${completing.stderr}`);
    assert.match(completing.stderr, /missing-field/);

    // 같은 개수(이미 완료된 plan을 그대로 다시 쓰기)는 완료가 아니다 — 무시.
    const rewrite = await checkpoint(dir, { tool_name: 'Write', tool_input: { file_path: planPath, content: '# demo — Plan (edited title)\n- [ ] verify boundary\n- [x] already done\n' } });
    assert.equal(rewrite.code, 0, rewrite.stderr);
    assert.equal(rewrite.stdout, '', '무시 경로는 출력이 없다');

    // codex 리뷰 P2: 한 항목을 채우면서 다른 항목을 비우면 개수는 같다 — 항목 단위로 봐야 한다.
    const swap = await checkpoint(dir, { tool_name: 'Write', tool_input: { file_path: planPath, content: '# demo — Plan\n- [x] verify boundary\n- [ ] already done\n' } });
    assert.equal(swap.code, 2, `새로 체크된 항목이 있으면 검사 → 차단: ${swap.stdout}${swap.stderr}`);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkpoint: 대문자 - [X] 완료도 검사 대상이고, plan이 아닌 파일의 Write는 무시한다', async () => {
  const { dir, planPath } = await fixture();
  try {
    const upper = await checkpoint(dir, { tool_name: 'Edit', tool_input: { file_path: planPath, old_string: '- [ ] verify boundary', new_string: '- [X] verify boundary' } });
    assert.equal(upper.code, 2);
    const other = await checkpoint(dir, { tool_name: 'Write', tool_input: { file_path: join(dir, 'notes.md'), content: '- [x] not the plan\n' } });
    assert.equal(other.code, 0, other.stderr);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

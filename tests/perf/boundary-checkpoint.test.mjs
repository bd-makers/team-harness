import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BIN = join(ROOT, 'bin', 'harness-team.mjs');
const HOOK = join(ROOT, 'templates', '.claude', 'hooks', 'boundary-checkpoint.sh');

function run(command, args, input, options) {
  return new Promise(resolveResult => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], ...options });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('close', code => resolveResult({ code, stdout, stderr }));
    child.on('error', error => resolveResult({ code: -1, stdout, stderr: String(error) }));
    child.stdin.end(input);
  });
}

function schema() {
  const properties = { id: { type: 'string' } };
  for (let index = 0; index < 80; index += 1) properties[`field_${index}`] = { type: 'string', description: 'x'.repeat(100) };
  return { type: 'object', properties, required: ['id'] };
}

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-boundary-perf-'));
  const taskDir = join(dir, 'docs', 'tester', 'demo');
  const boundaries = Array.from({ length: 10 }, (_, index) => ({
    id: `edge-${index}`,
    producer: { path: `schemas/producer-${index}.json` },
    consumer: { path: `schemas/consumer-${index}.json` },
  }));
  await mkdir(join(dir, '.harness'), { recursive: true });
  await mkdir(join(dir, 'schemas'), { recursive: true });
  await mkdir(taskDir, { recursive: true });
  await writeFile(join(dir, '.harness', 'active.json'), JSON.stringify({ user: 'tester', task: 'demo' }));
  await writeFile(join(taskDir, 'demo-plan.md'), '# demo — Plan\n- [ ] verify\n');
  await writeFile(join(taskDir, 'demo-spec.md'), `# demo — Spec\n\n## Boundary contracts\n\n\`\`\`json\n${JSON.stringify({ version: 1, boundaries }, null, 2)}\n\`\`\`\n`);
  const contract = JSON.stringify(schema());
  assert.ok(Buffer.byteLength(contract) >= 10 * 1024, 'fixture represents at least a 10 KiB schema');
  await Promise.all(boundaries.flatMap(({ producer, consumer }) => [
    writeFile(join(dir, producer.path), contract),
    writeFile(join(dir, consumer.path), contract),
  ]));
  const binDir = join(dir, '.bin');
  await mkdir(binDir, { recursive: true });
  const shim = join(binDir, 'harness-team');
  await writeFile(shim, `#!/bin/sh\nexec node ${JSON.stringify(BIN)} "$@"\n`);
  await chmod(shim, 0o755);
  return {
    dir,
    taskDir,
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH}`, HARNESS_TEAM_BIN: BIN },
  };
}

test('boundary performance: cold check <100ms and plan checkpoint <200ms for 10 x 10KiB local contracts', async () => {
  const setup = await fixture();
  try {
    const coldMeasurements = [];
    const checkpointMeasurements = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      let started = performance.now();
      const cold = await run('node', [BIN, 'boundary', 'check'], '', { cwd: setup.dir, env: setup.env });
      coldMeasurements.push(performance.now() - started);
      assert.equal(cold.code, 0, cold.stderr);
      assert.match(cold.stdout, /boundary: pass \(10 checked\)/);

      started = performance.now();
      const checkpoint = await run('sh', [HOOK], JSON.stringify({
        tool_name: 'Edit',
        tool_input: {
          file_path: join(setup.taskDir, 'demo-plan.md'),
          old_string: '- [ ] verify',
          new_string: '- [x] verify',
        },
      }), { cwd: setup.dir, env: setup.env });
      checkpointMeasurements.push(performance.now() - started);
      assert.equal(checkpoint.code, 0, checkpoint.stderr);
      assert.match(checkpoint.stdout, /boundary: pass \(10 checked\)/);
    }
    // Three samples use the median for the normal ceiling so one scheduler outlier does not fail the test;
    // the additional absolute ceiling still catches a consistently or severely slow implementation.
    const median = measurements => [...measurements].sort((a, b) => a - b)[1];
    const coldMs = median(coldMeasurements);
    const checkpointMs = median(checkpointMeasurements);
    assert.ok(coldMs < 100, `median cold boundary CLI was ${coldMs.toFixed(1)}ms (limit: 100ms; samples: ${coldMeasurements.map(ms => ms.toFixed(1)).join(', ')})`);
    assert.ok(checkpointMs < 200, `median plan checkpoint was ${checkpointMs.toFixed(1)}ms (limit: 200ms; samples: ${checkpointMeasurements.map(ms => ms.toFixed(1)).join(', ')})`);
    assert.ok(Math.max(...coldMeasurements) < 500, `cold boundary CLI exceeded the absolute 500ms ceiling (samples: ${coldMeasurements.map(ms => ms.toFixed(1)).join(', ')})`);
    assert.ok(Math.max(...checkpointMeasurements) < 800, `plan checkpoint exceeded the absolute 800ms ceiling (samples: ${checkpointMeasurements.map(ms => ms.toFixed(1)).join(', ')})`);
  } finally {
    await rm(setup.dir, { recursive: true, force: true });
  }
});

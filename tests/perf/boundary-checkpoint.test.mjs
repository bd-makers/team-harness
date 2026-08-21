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

test('boundary performance: cold check <75ms and plan checkpoint <150ms over the bare node spawn floor for 10 x 10KiB local contracts', async t => {
  const setup = await fixture();
  try {
    // A fixed wall-clock budget flakes under load: on a busy machine more than half of a
    // cold run is bare `node` process spawn cost, which tracks machine load rather than
    // anything this CLI does. Each attempt therefore brackets the CLI runs with `node -e ''`
    // spawns, and the budgets bound the median cost *above* that spawn floor; the absolute
    // ceilings at the end still catch a consistently or severely slow implementation.
    const bareMeasurements = [];
    const coldMeasurements = [];
    const checkpointMeasurements = [];
    const timed = async (measurements, work) => {
      const started = performance.now();
      const result = await work();
      measurements.push(performance.now() - started);
      return result;
    };
    const bare = () => run('node', ['-e', ''], '', { cwd: setup.dir, env: setup.env });
    await bare(); // untimed warmup: the very first spawn pays one-off costs (fs cache, code signing)
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await timed(bareMeasurements, bare);
      const cold = await timed(coldMeasurements, () =>
        run('node', [BIN, 'boundary', 'check'], '', { cwd: setup.dir, env: setup.env }));
      assert.equal(cold.code, 0, cold.stderr);
      assert.match(cold.stdout, /boundary: pass \(10 checked\)/);

      const checkpoint = await timed(checkpointMeasurements, () => run('sh', [HOOK], JSON.stringify({
        tool_name: 'Edit',
        tool_input: {
          file_path: join(setup.taskDir, 'demo-plan.md'),
          old_string: '- [ ] verify',
          new_string: '- [x] verify',
        },
      }), { cwd: setup.dir, env: setup.env }));
      assert.equal(checkpoint.code, 0, checkpoint.stderr);
      assert.match(checkpoint.stdout, /boundary: pass \(10 checked\)/);
      await timed(bareMeasurements, bare);
    }
    // Medians so one scheduler outlier does not fail the test or distort the spawn floor.
    const median = measurements => [...measurements].sort((a, b) => a - b)[Math.floor(measurements.length / 2)];
    const spawnFloorMs = median(bareMeasurements);
    const coldMs = median(coldMeasurements);
    const checkpointMs = median(checkpointMeasurements);
    const samples = measurements => measurements.map(ms => ms.toFixed(1)).join(', ');
    t.diagnostic(`spawn floor ${spawnFloorMs.toFixed(1)}ms (${samples(bareMeasurements)}); cold ${coldMs.toFixed(1)}ms (${samples(coldMeasurements)}); checkpoint ${checkpointMs.toFixed(1)}ms (${samples(checkpointMeasurements)})`);
    assert.ok(coldMs - spawnFloorMs < 75, `median cold boundary CLI cost ${(coldMs - spawnFloorMs).toFixed(1)}ms over the ${spawnFloorMs.toFixed(1)}ms spawn floor (limit: 75ms; cold samples: ${samples(coldMeasurements)}; bare samples: ${samples(bareMeasurements)})`);
    assert.ok(checkpointMs - spawnFloorMs < 150, `median plan checkpoint cost ${(checkpointMs - spawnFloorMs).toFixed(1)}ms over the ${spawnFloorMs.toFixed(1)}ms spawn floor (limit: 150ms; checkpoint samples: ${samples(checkpointMeasurements)}; bare samples: ${samples(bareMeasurements)})`);
    assert.ok(Math.max(...coldMeasurements) < 500, `cold boundary CLI exceeded the absolute 500ms ceiling (samples: ${coldMeasurements.map(ms => ms.toFixed(1)).join(', ')})`);
    assert.ok(Math.max(...checkpointMeasurements) < 800, `plan checkpoint exceeded the absolute 800ms ceiling (samples: ${checkpointMeasurements.map(ms => ms.toFixed(1)).join(', ')})`);
  } finally {
    await rm(setup.dir, { recursive: true, force: true });
  }
});

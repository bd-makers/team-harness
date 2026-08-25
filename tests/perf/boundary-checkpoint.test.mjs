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

// Attempts per spawn shape. Odd so the median is a real sample rather than an
// interpolation between two.
const ATTEMPTS = 5;
// Budgets are multiples of the equal-work baseline, sized from measurement:
// the worst ratio seen across no load, 16 and 24 busy loops on 12 cores was
// 1.96 (cold) and 3.19 (checkpoint) against ~1.45 / ~1.71 unloaded. These
// leave roughly 50% headroom over the worst observed value while staying
// tighter in absolute terms than the fixed-millisecond budgets they replace.
const COLD_BUDGET = 3;
const CHECKPOINT_BUDGET = 5;
// Unchanged regression net: a consistently or severely slow implementation
// still fails here even if the ratios somehow hold.
const COLD_CEILING_MS = 500;
const CHECKPOINT_CEILING_MS = 800;

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

// The baseline reads and parses exactly the files `boundary check` reads — the
// spec plus both sides of every boundary — through the same shape (stat, then
// readFile utf8, then JSON.parse; sides sequential, boundaries concurrent) and
// imports nothing from src/. What it does *not* pay is the CLI's own cost: the
// ~20-module graph bin/harness-team.mjs eagerly imports, argument resolution,
// the spec regex, and the schema comparison. That difference is what the
// budgets bound.
function baselineSource(specPath, pairs) {
  return `import { readFile, stat } from 'node:fs/promises';
const SPEC = ${JSON.stringify(specPath)};
const PAIRS = ${JSON.stringify(pairs)};
async function load(path) {
  try { await stat(path); } catch { return 0; }
  return Object.keys(JSON.parse(await readFile(path, 'utf8')).properties).length;
}
const specBytes = (await readFile(SPEC, 'utf8')).length;
const perBoundary = await Promise.all(PAIRS.map(async ([producer, consumer]) => (await load(producer)) + (await load(consumer))));
let fields = 0;
for (const count of perBoundary) fields += count;
console.log('baseline: ' + (PAIRS.length * 2) + ' read, ' + fields + ' fields, ' + specBytes + ' spec bytes');
`;
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
  const specPath = join(taskDir, 'demo-spec.md');
  await writeFile(specPath, `# demo — Spec\n\n## Boundary contracts\n\n\`\`\`json\n${JSON.stringify({ version: 1, boundaries }, null, 2)}\n\`\`\`\n`);
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
  const baseline = join(binDir, 'equal-work-baseline.mjs');
  const pairs = boundaries.map(({ producer, consumer }) => [join(dir, producer.path), join(dir, consumer.path)]);
  await writeFile(baseline, baselineSource(specPath, pairs));
  return {
    dir,
    taskDir,
    baseline,
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH}`, HARNESS_TEAM_BIN: BIN },
  };
}

test(`boundary performance: cold check <${COLD_BUDGET}x and plan checkpoint <${CHECKPOINT_BUDGET}x an equal-work baseline for 10 x 10KiB local contracts`, async t => {
  const setup = await fixture();
  try {
    // A fixed wall-clock budget flakes under load, and so does one measured
    // against a bare `node -e ''` spawn: subtracting a spawn floor only cancels
    // spawn cost, while the CLI's own work (20 x 10KiB schema reads plus its
    // module graph) slows down too, and that part the floor cannot absorb. The
    // matrix jobs are not the culprit either — GitHub-hosted runners give each
    // matrix job its own VM, so there is nothing to serialize; the load is a
    // noisy neighbour on the host, which cannot be removed, only measured
    // around.
    //
    // So the budgets are ratios against an equal-work baseline. CPU starvation
    // multiplies both sides by roughly the same factor, so it cancels: measured
    // across no load, 16 and 24 busy loops on 12 cores, the cold ratio stayed
    // in 1.22-1.96 while the old spawn-floor delta swung 9.9ms -> 35.6ms and
    // the raw cold time swung 30ms -> 143ms.
    const bareMeasurements = [];
    const baselineMeasurements = [];
    const coldMeasurements = [];
    const checkpointMeasurements = [];
    const timed = async (measurements, work) => {
      const started = performance.now();
      const result = await work();
      measurements.push(performance.now() - started);
      return result;
    };
    const options = { cwd: setup.dir, env: setup.env };
    const checkpointInput = JSON.stringify({
      tool_name: 'Edit',
      tool_input: {
        file_path: join(setup.taskDir, 'demo-plan.md'),
        old_string: '- [ ] verify',
        new_string: '- [x] verify',
      },
    });
    const bare = () => run('node', ['-e', ''], '', options);
    const baseline = () => run('node', [setup.baseline], '', options);
    const cold = () => run('node', [BIN, 'boundary', 'check'], '', options);
    const checkpoint = () => run('sh', [HOOK], checkpointInput, options);

    // Untimed warmup of every spawn shape. The first run of each pays one-off
    // costs — fs cache, code signing, compiling this repo's module graph — that
    // say nothing about steady-state cost. The bare spawn was already warmed
    // for this reason; the CLI needs it far more, and without it the first cold
    // sample measured 453-541ms under load against 60-90ms steady, enough to
    // trip the absolute ceiling below on its own.
    const warmups = await Promise.all([bare(), baseline(), cold(), checkpoint()]
      .map((promise, index) => promise.then(result => [['bare', 'baseline', 'cold', 'checkpoint'][index], result])));
    for (const [name, result] of warmups) assert.equal(result.code, 0, `${name} warmup failed: ${result.stderr}`);
    // The ratios are only meaningful while the baseline really does the same
    // reading and parsing. Assert that deterministically rather than trusting
    // a timing comparison that would go quietly vacuous if it ever drifted.
    assert.match(warmups[1][1].stdout, /^baseline: 20 read, 1620 fields, \d+ spec bytes$/m);

    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      await timed(bareMeasurements, bare);
      await timed(baselineMeasurements, baseline);
      const coldResult = await timed(coldMeasurements, cold);
      assert.equal(coldResult.code, 0, coldResult.stderr);
      assert.match(coldResult.stdout, /boundary: pass \(10 checked\)/);
      const checkpointResult = await timed(checkpointMeasurements, checkpoint);
      assert.equal(checkpointResult.code, 0, checkpointResult.stderr);
      assert.match(checkpointResult.stdout, /boundary: pass \(10 checked\)/);
    }

    // Medians so one scheduler outlier does not fail the test or distort the baseline.
    const median = measurements => {
      const sorted = [...measurements].sort((a, b) => a - b);
      const half = sorted.length >> 1;
      return sorted.length % 2 ? sorted[half] : (sorted[half - 1] + sorted[half]) / 2;
    };
    const spawnFloorMs = median(bareMeasurements);
    const baselineMs = median(baselineMeasurements);
    const coldMs = median(coldMeasurements);
    const checkpointMs = median(checkpointMeasurements);
    const samples = measurements => measurements.map(ms => ms.toFixed(1)).join(', ');
    t.diagnostic(`spawn floor ${spawnFloorMs.toFixed(1)}ms (${samples(bareMeasurements)}); equal-work baseline ${baselineMs.toFixed(1)}ms (${samples(baselineMeasurements)}); cold ${coldMs.toFixed(1)}ms = ${(coldMs / baselineMs).toFixed(2)}x baseline (${samples(coldMeasurements)}); checkpoint ${checkpointMs.toFixed(1)}ms = ${(checkpointMs / baselineMs).toFixed(2)}x baseline (${samples(checkpointMeasurements)})`);
    assert.ok(coldMs / baselineMs < COLD_BUDGET, `median cold boundary CLI cost ${coldMs.toFixed(1)}ms is ${(coldMs / baselineMs).toFixed(2)}x the ${baselineMs.toFixed(1)}ms equal-work baseline (limit: ${COLD_BUDGET}x; cold samples: ${samples(coldMeasurements)}; baseline samples: ${samples(baselineMeasurements)})`);
    assert.ok(checkpointMs / baselineMs < CHECKPOINT_BUDGET, `median plan checkpoint cost ${checkpointMs.toFixed(1)}ms is ${(checkpointMs / baselineMs).toFixed(2)}x the ${baselineMs.toFixed(1)}ms equal-work baseline (limit: ${CHECKPOINT_BUDGET}x; checkpoint samples: ${samples(checkpointMeasurements)}; baseline samples: ${samples(baselineMeasurements)})`);
    assert.ok(Math.max(...coldMeasurements) < COLD_CEILING_MS, `cold boundary CLI exceeded the absolute ${COLD_CEILING_MS}ms ceiling (samples: ${samples(coldMeasurements)})`);
    assert.ok(Math.max(...checkpointMeasurements) < CHECKPOINT_CEILING_MS, `plan checkpoint exceeded the absolute ${CHECKPOINT_CEILING_MS}ms ceiling (samples: ${samples(checkpointMeasurements)})`);
  } finally {
    await rm(setup.dir, { recursive: true, force: true });
  }
});

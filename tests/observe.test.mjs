import assert from 'node:assert/strict';
import test from 'node:test';
import {
  percentile, windowDays, summarizeObservability, TRIP_WIRE_MIN_FINISHED, TRIP_WIRE_MIN_FAILURES,
} from '../src/commands/observe.mjs';

const NOW = new Date('2026-09-05T12:00:00.000Z');
let seq = 0;
// 훅 buildRecord와 같은 모양의 레코드. 필요한 필드만 덮어쓴다.
function rec(over = {}) {
  seq += 1;
  return {
    v: 1, recorded_at: '2026-09-05T10:00:00.000Z', agent: 'claude-code', vendor_event: 'PostToolUse', phase: 'succeeded',
    session_ref: 's'.repeat(32), task_ref: null, call_ref: `c${seq}`.padEnd(32, '0'), tool_ref: 't'.repeat(32),
    tool_category: 'shell', input_bytes: 10, input_bytes_capped: false, response_bytes: 20, response_bytes_capped: false,
    duration_ms: 100, signals: { interrupted: false, response_present: true, stderr_present: false, error_present: false, usage_present: false },
    ...over,
  };
}
function day(d, n, over) { return Array.from({ length: n }, () => rec({ recorded_at: `${d}T10:00:00.000Z`, ...over })); }

test('percentile: nearest-rank — p95 of 1..10 is 10, single value is itself, empty is null', () => {
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.95), 10);
  assert.equal(percentile([5, 1, 3], 0.5), 3);
  assert.equal(percentile([7], 0.95), 7);
  assert.equal(percentile([], 0.95), null);
});

test('windowDays: ascending UTC days ending today', () => {
  assert.deepEqual(windowDays(NOW, 3), ['2026-09-03', '2026-09-04', '2026-09-05']);
  assert.deepEqual(windowDays(new Date('2026-03-01T00:30:00.000Z'), 2), ['2026-02-28', '2026-03-01']);
});

test('summarize: by_day / by_task / by_category counts, failure_rate, p95, task label mapping', () => {
  const records = [
    rec({ phase: 'started', duration_ms: null }),
    rec({ phase: 'succeeded', duration_ms: 50 }),
    rec({ phase: 'failed', duration_ms: 150, tool_category: 'filesystem_write', task_ref: 'a'.repeat(32) }),
    rec({ phase: 'denied', duration_ms: null, signals: { interrupted: true } }),
    rec({ recorded_at: '2026-08-01T00:00:00.000Z' }), // 창 밖 — 무시
  ];
  const out = summarizeObservability(records, { now: NOW, days: 2, taskNames: new Map([['a'.repeat(32), 'hslee/demo']]) });
  assert.deepEqual(out.window, { days: 2, from: '2026-09-04', to: '2026-09-05' });
  const today = out.by_day.find(d => d.day === '2026-09-05');
  assert.equal(today.started, 1); assert.equal(today.finished, 3); assert.equal(today.failed, 1); assert.equal(today.denied, 1);
  assert.equal(today.failure_rate, 2 / 3); assert.equal(today.interrupted, 1);
  assert.equal(today.duration_p95_ms, 150); assert.equal(today.input_bytes, 40); assert.equal(today.usage, null);
  assert.equal(out.by_day.find(d => d.day === '2026-09-04').finished, 0);
  const labels = out.by_task.map(t => t.label).sort();
  assert.deepEqual(labels, ['(no task)', 'hslee/demo']);
  assert.equal(out.by_task.find(t => t.label === 'hslee/demo').failed, 1);
  assert.deepEqual(out.by_category.map(c => c.tool_category), ['filesystem_write', 'shell']);
});

test('summarize: unknown task_ref shows the 8-char prefix; usage tokens are summed when present', () => {
  const out = summarizeObservability(
    [rec({ task_ref: 'f'.repeat(32), usage: { input_tokens: 3, output_tokens: 4 } }), rec({ usage: { input_tokens: 1 } })],
    { now: NOW, days: 1 },
  );
  assert.equal(out.by_task.find(t => t.task_ref === 'f'.repeat(32)).label, 'ffffffff');
  assert.deepEqual(out.by_day[0].usage, { input_tokens: 4, output_tokens: 4, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 });
});

test('trip wire failure-rate-2x: fires at >=20 finished, >=5 failures, rate >= 2x baseline', () => {
  const baseline = [...day('2026-09-04', 95), ...day('2026-09-04', 5, { phase: 'failed' })]; // rate 0.05
  const fire = summarizeObservability(
    [...baseline, ...day('2026-09-05', 15), ...day('2026-09-05', 5, { phase: 'failed' })],
    { now: NOW, days: 7 },
  );
  const fr = fire.trip_wires.find(t => t.id === 'failure-rate-2x');
  assert.equal(fr.fired, true); assert.equal(fr.status, 'fired');
  assert.equal(fr.detail.finished, 20); assert.equal(fr.detail.failures, 5);
  assert.equal(fr.detail.baseline_rate, 0.05); assert.equal(fr.detail.baseline_days, 1);
  assert.equal(TRIP_WIRE_MIN_FINISHED, 20); assert.equal(TRIP_WIRE_MIN_FAILURES, 5);
});

test('trip wire failure-rate-2x: 19 finished, or 4 failures, or rate below 2x does not fire', () => {
  const baseline = [...day('2026-09-04', 95), ...day('2026-09-04', 5, { phase: 'failed' })];
  const tooFew = summarizeObservability(
    [...baseline, ...day('2026-09-05', 14), ...day('2026-09-05', 5, { phase: 'failed' })], { now: NOW, days: 7 },
  );
  assert.equal(tooFew.trip_wires[0].fired, false);
  const fewFailures = summarizeObservability(
    [...baseline, ...day('2026-09-05', 16), ...day('2026-09-05', 4, { phase: 'failed' })], { now: NOW, days: 7 },
  );
  assert.equal(fewFailures.trip_wires[0].fired, false);
  const lowRate = summarizeObservability(
    [...baseline, ...day('2026-09-05', 95), ...day('2026-09-05', 5, { phase: 'failed' })], { now: NOW, days: 7 },
  ); // 0.05 < 0.10
  assert.equal(lowRate.trip_wires[0].fired, false); assert.equal(lowRate.trip_wires[0].status, 'ok');
});

test('trip wire failure-rate-2x: no baseline day → insufficient-baseline; no records today → no-data', () => {
  const noBase = summarizeObservability(
    [...day('2026-09-05', 15), ...day('2026-09-05', 5, { phase: 'failed' })], { now: NOW, days: 7 },
  );
  assert.equal(noBase.trip_wires[0].status, 'insufficient-baseline'); assert.equal(noBase.trip_wires[0].fired, false);
  const empty = summarizeObservability(day('2026-09-04', 3), { now: NOW, days: 7 });
  assert.equal(empty.trip_wires[0].status, 'no-data');
});

test('trip wire repeat-failure-3x: 3 failed of the same session+tool fires; 2, or 3 across sessions, do not', () => {
  const three = day('2026-09-05', 3, { phase: 'failed', tool_category: 'network' });
  const out = summarizeObservability(three, { now: NOW, days: 1 });
  const rf = out.trip_wires.find(t => t.id === 'repeat-failure-3x');
  assert.equal(rf.fired, true);
  assert.deepEqual(rf.detail.hits[0], {
    session_ref: 'ssssssss', tool_ref: 'tttttttt', tool_category: 'network', count: 3, last_at: '2026-09-05T10:00:00.000Z',
  });
  assert.equal(summarizeObservability(three.slice(0, 2), { now: NOW, days: 1 }).trip_wires[1].fired, false);
  const spread = three.map((r, i) => ({ ...r, session_ref: String(i).repeat(32) }));
  assert.equal(summarizeObservability(spread, { now: NOW, days: 1 }).trip_wires[1].fired, false);
});

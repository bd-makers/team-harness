import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, symlink, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { observeToolEvent } from '../templates/.claude/hooks/observe-tools.mjs';
import {
  percentile, windowDays, summarizeObservability, TRIP_WIRE_MIN_FINISHED, TRIP_WIRE_MIN_FAILURES,
  readObservabilityRecords, resolveTaskRefs, hmacRef, OBSERVABILITY_BASE, runObserve,
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

// ---- codex 리뷰(2026-09-05) 반영: 타입 방어 · UTC 일 판정 · 정확한 2× 경계
test('summarize: a non-string task_ref never throws — it is treated as (no task)', () => {
  const out = summarizeObservability([rec({ task_ref: 123 }), rec({ task_ref: { x: 1 } })], { now: NOW, days: 1 });
  assert.deepEqual(out.by_task.map(t => t.label), ['(no task)']);
  assert.equal(out.by_task[0].finished, 2);
});

test('summarize: recorded_at is bucketed by its UTC instant, not by its first 10 characters', () => {
  // 2026-09-04T23:30-02:00 == 2026-09-05T01:30Z → 오늘
  const out = summarizeObservability([rec({ recorded_at: '2026-09-04T23:30:00.000-02:00' })], { now: NOW, days: 2 });
  assert.equal(out.by_day.find(d => d.day === '2026-09-05').finished, 1);
  assert.equal(out.by_day.find(d => d.day === '2026-09-04').finished, 0);
});

test('trip wire failure-rate-2x: exactly 2x baseline fires (>=), just under does not', () => {
  const baseline = [...day('2026-09-04', 15), ...day('2026-09-04', 5, { phase: 'failed' })]; // 0.25
  const exact = summarizeObservability([...baseline, ...day('2026-09-05', 10), ...day('2026-09-05', 10, { phase: 'failed' })], { now: NOW, days: 7 }); // 0.50
  assert.equal(exact.trip_wires[0].fired, true);
  const under = summarizeObservability([...baseline, ...day('2026-09-05', 11), ...day('2026-09-05', 9, { phase: 'failed' })], { now: NOW, days: 7 }); // 0.45
  assert.equal(under.trip_wires[0].fired, false);
});

// ---- 읽기 · 역매핑: fixture는 실제 훅으로 쓴다 (작성자와 같은 바이트를 보는지가 요점)
function hookPayload(event, over = {}) {
  seq += 1;
  return {
    hook_event_name: event, session_id: 'sess-1', tool_use_id: `call-${seq}`, tool_name: 'Bash',
    tool_input: { command: 'ls' }, tool_response: { stdout: 'x' }, duration_ms: 12, ...over,
  };
}
async function project() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-observe-'));
  return { dir, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

test('read: no observability dir → not-installed with zero records', async () => {
  const { dir, cleanup } = await project();
  try {
    const out = await readObservabilityRecords(dir, { now: NOW, days: 7 });
    assert.equal(out.status, 'not-installed'); assert.deepEqual(out.records, []); assert.equal(out.skippedLines, 0);
  } finally { await cleanup(); }
});

test('read: hook-written records are read back; malformed lines, symlinks, non-jsonl and out-of-window days are skipped', async () => {
  const { dir, cleanup } = await project();
  try {
    const now = new Date('2026-09-05T10:00:00.000Z');
    await observeToolEvent(hookPayload('PreToolUse'), { projectDir: dir, now });
    await observeToolEvent(hookPayload('PostToolUse'), { projectDir: dir, now });
    await observeToolEvent(hookPayload('PostToolUseFailure', { error: 'boom' }), { projectDir: dir, now: new Date('2026-09-04T10:00:00.000Z') });
    await observeToolEvent(hookPayload('PostToolUse'), { projectDir: dir, now: new Date('2026-08-20T10:00:00.000Z') }); // 창 밖
    const today = join(dir, OBSERVABILITY_BASE, '2026-09-05');
    await writeFile(join(today, 'zz-000.jsonl'), 'not json\n{"v":2,"phase":"succeeded"}\n{"v":1,"phase":"succeeded"}\n'
      + '{"v":1,"phase":"succeeded","session_ref":"x","tool_category":"shell","recorded_at":"2026-09-05T10:00:00.000Z","task_ref":123}\n'
      + '{"v":1,"phase":"succeeded","session_ref":"x","tool_category":"shell","recorded_at":"not-a-date"}\n');
    await writeFile(join(today, 'notes.txt'), '{"v":1}\n');
    await symlink(join(today, 'zz-000.jsonl'), join(today, 'link-000.jsonl'));
    const out = await readObservabilityRecords(dir, { now, days: 7 });
    assert.equal(out.status, 'ok');
    assert.deepEqual(out.records.map(r => r.phase).sort(), ['failed', 'started', 'succeeded']);
    assert.equal(out.skippedLines, 5, 'bad json + v2 + missing fields + non-string task_ref + unparseable date');
  } finally { await cleanup(); }
});

test('read: dir exists but window is empty → no-data', async () => {
  const { dir, cleanup } = await project();
  try {
    await observeToolEvent(hookPayload('PostToolUse'), { projectDir: dir, now: new Date('2026-08-01T00:00:00.000Z') });
    const out = await readObservabilityRecords(dir, { now: NOW, days: 7 });
    assert.equal(out.status, 'no-data'); assert.equal(out.records.length, 0);
  } finally { await cleanup(); }
});

test('resolveTaskRefs: hmac over docs/<user>/<task> meta matches the task_ref the hook wrote', async () => {
  const { dir, cleanup } = await project();
  try {
    await mkdir(join(dir, '.harness'), { recursive: true });
    await writeFile(join(dir, '.harness/active.json'), JSON.stringify({ user: 'hslee', task: 'demo' }));
    await mkdir(join(dir, 'docs/hslee/demo'), { recursive: true });
    await writeFile(join(dir, 'docs/hslee/demo/demo-meta.json'), JSON.stringify({ user: 'hslee', task: 'demo', status: 'active' }));
    const written = await observeToolEvent(hookPayload('PostToolUse'), { projectDir: dir, now: NOW });
    const refs = await resolveTaskRefs(dir);
    assert.equal(refs.get(written.record.task_ref), 'hslee/demo');
    const key = await readFile(join(dir, OBSERVABILITY_BASE, '.key'));
    assert.equal(hmacRef(key, 'task', 'hslee\u0000demo'), written.record.task_ref);
  } finally { await cleanup(); }
});

test('resolveTaskRefs: no key or no docs → empty map, never throws', async () => {
  const { dir, cleanup } = await project();
  try { assert.equal((await resolveTaskRefs(dir)).size, 0); } finally { await cleanup(); }
});

// ---- 러너: envelope · 종료 코드 · --days 검증
function captureStdout(fn) {
  const chunks = [];
  const original = console.log;
  console.log = (...args) => chunks.push(args.join(' '));
  return Promise.resolve().then(fn).finally(() => { console.log = original; }).then(() => chunks.join('\n'));
}

test('runObserve --json: not-installed envelope, exit 0, next action points at init', async () => {
  const { dir, cleanup } = await project();
  try {
    process.exitCode = 0;
    const out = JSON.parse(await captureStdout(() => runObserve({ targetDir: dir, flags: { json: true } })));
    assert.equal(out.schema, 'harness/observation/v1'); assert.equal(out.command, 'observe'); assert.equal(out.status, 'not-installed');
    assert.equal(out.error, null); assert.match(out.next_actions[0], /harness-team init/); assert.equal(process.exitCode, 0);
  } finally { await cleanup(); }
});

test('runObserve --json: ok envelope carries window, scorecard and trip wires; text mode prints ✓ lines', async () => {
  const { dir, cleanup } = await project();
  try {
    await observeToolEvent(hookPayload('PostToolUse'), { projectDir: dir, now: new Date() });
    const out = JSON.parse(await captureStdout(() => runObserve({ targetDir: dir, flags: { json: true, days: '3' } })));
    assert.equal(out.status, 'ok'); assert.equal(out.window.days, 3);
    assert.equal(out.scorecard.by_category[0].tool_category, 'shell'); assert.equal(out.trip_wires.length, 2); assert.equal(out.skipped_lines, 0);
    const text = await captureStdout(() => runObserve({ targetDir: dir, flags: { days: '3' } }));
    assert.match(text, /observe: 3일 창/); assert.match(text, /✓ failure-rate-2x/); assert.match(text, /shell/);
  } finally { await cleanup(); }
});

test('runObserve: three hook failures of one tool in one session → tripped, exitCode 1', async () => {
  const { dir, cleanup } = await project();
  try {
    for (let i = 0; i < 3; i += 1) {
      await observeToolEvent(hookPayload('PostToolUseFailure', { error: 'boom' }), { projectDir: dir, now: new Date() });
    }
    process.exitCode = 0;
    const out = JSON.parse(await captureStdout(() => runObserve({ targetDir: dir, flags: { json: true } })));
    assert.equal(out.status, 'tripped'); assert.equal(out.trip_wires[1].fired, true); assert.equal(process.exitCode, 1);
    process.exitCode = 0;
    const text = await captureStdout(() => runObserve({ targetDir: dir, flags: {} }));
    assert.match(text, /✗ repeat-failure-3x/);
    process.exitCode = 0;
  } finally { await cleanup(); }
});

test('runObserve: --days outside 1..14 or non-integer is a usage error (exit 2, status error)', async () => {
  const { dir, cleanup } = await project();
  try {
    for (const days of ['0', '15', 'abc', '2.5']) {
      process.exitCode = 0;
      const out = JSON.parse(await captureStdout(() => runObserve({ targetDir: dir, flags: { json: true, days } })));
      assert.equal(out.status, 'error', days); assert.match(out.error.root_cause, /1\.\.14/); assert.equal(process.exitCode, 2, days);
      // escalation packet (권고 ③) — 거부하면서 다른 경로와 무응답 시 남는 상태를 함께 준다.
      assert.ok(Array.isArray(out.error.alternatives) && out.error.alternatives.length === 1, `alternatives 1개 (${days})`);
      assert.match(out.error.alternatives[0], /--days 없이 실행하면 기본 창/);
      assert.ok(out.error.safe_default, `safe_default는 비어 있지 않다 (${days})`);
      assert.equal(typeof out.error.root_cause, 'string', `root_cause 는 string (${days})`);
    }
    process.exitCode = 0;
  } finally { await cleanup(); }
});

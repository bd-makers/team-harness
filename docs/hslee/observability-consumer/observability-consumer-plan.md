# observability-consumer — Plan

> **For agentic workers:** 이 저장소는 D4(단일 스레드 쓰기)라 **inline 실행**(superpowers:executing-plans)만 쓴다 — 서브에이전트 작성 금지.
> 각 Task는 RED→GREEN→커밋 사이클 하나. 체크박스는 실행하면서 `- [x]`로 닫는다(`done` 가드가 미완 박스를 막는다).

**Goal:** `.harness/observability` JSONL을 읽어 스코어카드와 트립와이어 2종을 출력하는 read-only 하위명령 `harness-team observe`를 만든다.

**Architecture:** `src/commands/observe.mjs` 한 모듈, 세 층 — 읽기(`readObservabilityRecords`) → 순수 집계(`summarizeObservability`, 파일·시계 무의존) → 렌더(text | `--json` envelope). task_ref 역매핑은 로컬 `.key`와 `docs/*/*/*-meta.json`으로만 만든다. 기존 훅·명령·SessionStart 계약 불변.

**Tech Stack:** Node ≥24 ESM, `node:test`, `node:crypto` HMAC, 기존 `src/observation.mjs` envelope.

**Spec:** `docs/hslee/observability-consumer/observability-consumer-spec.md`

## Global Constraints

- read-only: 로그 파일을 쓰거나 지우지 않는다. 심볼릭 링크·`.jsonl` 아닌 파일·창 밖 날짜 디렉터리는 읽지 않는다.
- 창: 기본 7일, 1..14(훅 `RETENTION_DAYS`=14), UTC 일 단위, 오늘 포함. `--days`는 정수만, 위반 시 usage 오류 exit 2.
- 트립와이어 상수: finished ≥ 20 · failed+denied ≥ 5 · 기준 평균 ×2 / 같은 session_ref·tool_ref failed ≥ 3. 발화 시 `process.exitCode = 1`.
- HMAC 동일성: `createHmac('sha256', key).update(`${ns}\u0000${value}`).digest('hex').slice(0, 32)` — 훅 `hmacRef`와 같아야 하며 테스트가 고정. 훅 파일을 CLI가 import하지 않는다(테스트만 import).
- `--json`은 GLOBAL 플래그(cli-args)라 명령 행에 적지 않는다. `days`는 `VALUE_FLAGS`에 추가한다.
- 신규 파일은 `git add` 후 `npm run docs:generate`(overview 인벤토리는 `git ls-files` 기준).

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/commands/observe.mjs` (신규) | 상수 · `percentile` · `windowDays` · `summarizeObservability` · `readObservabilityRecords` · `resolveTaskRefs` · `renderObserveText` · `runObserve` |
| `tests/observe.test.mjs` (신규) | 순수 집계·트립와이어 경계 · 읽기 견고성 · HMAC 역매핑 동일성 · `runObserve --json` 계약 |
| `src/cli-args.mjs` | `VALUE_FLAGS`에 `days`, `COMMANDS`에 `observe` 행 |
| `bin/harness-team.mjs` | import · `taskCmds`에 `observe` · `case 'observe'` |
| `tests/cli-args.test.mjs` | `observe --days 3` 파싱·dangling 거부 단언 추가 |
| `commands/harness-observe.md` · `skills/harness-observe/SKILL.md` · `skills/harness-observe/agents/openai.yaml` · `.claude-plugin/plugin.json` · `README.md` · `CHANGELOG.md` | 이름을 부르는 표면(manifest-sync 테스트가 고정) |

---

## 단계

- [x] Task 0: task 생성 · 브레인스토밍(형태 A, 트립와이어 2종, exit 1) · spec Ambiguity 게이트 · 다이어그램 옵트인 질문(아니오)

### Task 1: 순수 집계와 트립와이어 (`summarizeObservability`)

**Files:** Create `src/commands/observe.mjs`, Create `tests/observe.test.mjs`

**Interfaces (Produces):**
- `percentile(values: number[], p: number): number|null` — nearest-rank, 빈 배열 null.
- `windowDays(now: Date, days: number): string[]` — 오름차순 `YYYY-MM-DD`, 마지막이 `now`의 UTC 일.
- `summarizeObservability(records, { now, days, taskNames = new Map() })` → `{ window: { days, from, to }, by_day: [{ day, ...stats }], by_task: [{ task_ref, label, ...stats }], by_category: [{ tool_category, ...stats }], trip_wires: [failureRate, repeatFailure] }`
  - stats = `{ started, finished, succeeded, failed, denied, interrupted, failure_rate, duration_p50_ms, duration_p95_ms, input_bytes, response_bytes, usage|null }`
  - trip wire = `{ id: 'failure-rate-2x'|'repeat-failure-3x', fired: boolean, status: 'ok'|'fired'|'insufficient-baseline'|'no-data', detail }`

- [x] **Step 1.1: RED — 테스트 작성** `tests/observe.test.mjs`

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { percentile, windowDays, summarizeObservability, TRIP_WIRE_MIN_FINISHED, TRIP_WIRE_MIN_FAILURES } from '../src/commands/observe.mjs';

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
  assert.equal(percentile([1,2,3,4,5,6,7,8,9,10], 0.95), 10);
  assert.equal(percentile([5,1,3], 0.5), 3);
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
  const out = summarizeObservability([rec({ task_ref: 'f'.repeat(32), usage: { input_tokens: 3, output_tokens: 4 } }), rec({ usage: { input_tokens: 1 } })], { now: NOW, days: 1 });
  assert.equal(out.by_task.find(t => t.task_ref === 'f'.repeat(32)).label, 'ffffffff');
  assert.deepEqual(out.by_day[0].usage, { input_tokens: 4, output_tokens: 4, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 });
});

test('trip wire failure-rate-2x: fires at >=20 finished, >=5 failures, rate >= 2x baseline', () => {
  const baseline = [...day('2026-09-04', 95), ...day('2026-09-04', 5, { phase: 'failed' })]; // rate 0.05
  const fire = summarizeObservability([...baseline, ...day('2026-09-05', 15), ...day('2026-09-05', 5, { phase: 'failed' })], { now: NOW, days: 7 });
  const fr = fire.trip_wires.find(t => t.id === 'failure-rate-2x');
  assert.equal(fr.fired, true); assert.equal(fr.status, 'fired');
  assert.equal(fr.detail.finished, 20); assert.equal(fr.detail.failures, 5); assert.equal(fr.detail.baseline_rate, 0.05); assert.equal(fr.detail.baseline_days, 1);
  assert.equal(TRIP_WIRE_MIN_FINISHED, 20); assert.equal(TRIP_WIRE_MIN_FAILURES, 5);
});

test('trip wire failure-rate-2x: 19 finished, or 4 failures, or rate below 2x does not fire', () => {
  const baseline = [...day('2026-09-04', 95), ...day('2026-09-04', 5, { phase: 'failed' })];
  const tooFew = summarizeObservability([...baseline, ...day('2026-09-05', 14), ...day('2026-09-05', 5, { phase: 'failed' })], { now: NOW, days: 7 });
  assert.equal(tooFew.trip_wires[0].fired, false);
  const fewFailures = summarizeObservability([...baseline, ...day('2026-09-05', 16), ...day('2026-09-05', 4, { phase: 'failed' })], { now: NOW, days: 7 });
  assert.equal(fewFailures.trip_wires[0].fired, false);
  const lowRate = summarizeObservability([...baseline, ...day('2026-09-05', 95), ...day('2026-09-05', 5, { phase: 'failed' })], { now: NOW, days: 7 }); // 0.05 < 0.10
  assert.equal(lowRate.trip_wires[0].fired, false); assert.equal(lowRate.trip_wires[0].status, 'ok');
});

test('trip wire failure-rate-2x: no baseline day → insufficient-baseline; no records today → no-data', () => {
  const noBase = summarizeObservability([...day('2026-09-05', 15), ...day('2026-09-05', 5, { phase: 'failed' })], { now: NOW, days: 7 });
  assert.equal(noBase.trip_wires[0].status, 'insufficient-baseline'); assert.equal(noBase.trip_wires[0].fired, false);
  const empty = summarizeObservability(day('2026-09-04', 3), { now: NOW, days: 7 });
  assert.equal(empty.trip_wires[0].status, 'no-data');
});

test('trip wire repeat-failure-3x: 3 failed of the same session+tool fires; 2, or 3 across sessions, do not', () => {
  const three = day('2026-09-05', 3, { phase: 'failed', tool_category: 'network' });
  const out = summarizeObservability(three, { now: NOW, days: 1 });
  const rf = out.trip_wires.find(t => t.id === 'repeat-failure-3x');
  assert.equal(rf.fired, true);
  assert.deepEqual(rf.detail.hits[0], { session_ref: 'ssssssss', tool_ref: 'tttttttt', tool_category: 'network', count: 3, last_at: '2026-09-05T10:00:00.000Z' });
  assert.equal(summarizeObservability(three.slice(0, 2), { now: NOW, days: 1 }).trip_wires[1].fired, false);
  const spread = three.map((r, i) => ({ ...r, session_ref: String(i).repeat(32) }));
  assert.equal(summarizeObservability(spread, { now: NOW, days: 1 }).trip_wires[1].fired, false);
});
```

- [x] **Step 1.2: RED 확인** — `node --test tests/observe.test.mjs` → 모듈 없음(ERR_MODULE_NOT_FOUND)으로 실패해야 한다.

- [x] **Step 1.3: GREEN — `src/commands/observe.mjs` 순수 부분 작성**

```js
// Read-only consumer for the tool-observability JSONL written by
// templates/.claude/hooks/observe-tools.mjs. Three layers: read → pure summarize → render.
// The hook file is never imported here (it is copied into consumer projects); the HMAC
// derivation below must stay byte-identical to the hook's hmacRef — tests/observe.test.mjs
// pins that by writing a record with the real hook and resolving its task_ref.
import { createHmac } from 'node:crypto';
import { lstat, readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { buildEnvelope, emitObservation } from '../observation.mjs';

export const OBSERVABILITY_BASE = '.harness/observability/v1';
export const OBSERVE_DEFAULT_DAYS = 7;
export const OBSERVE_MAX_DAYS = 14; // == hook RETENTION_DAYS; older day dirs are gone anyway
export const TRIP_WIRE_MIN_FINISHED = 20;
export const TRIP_WIRE_MIN_FAILURES = 5;
export const TRIP_WIRE_RATE_FACTOR = 2;
export const TRIP_WIRE_REPEAT_COUNT = 3;
const FINISHED_PHASES = new Set(['succeeded', 'failed', 'denied']);
const USAGE_FIELDS = ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'];
const REQUIRED_FIELDS = ['phase', 'session_ref', 'tool_category', 'recorded_at'];

export function utcDay(date) { return date.toISOString().slice(0, 10); }

export function windowDays(now, days) {
  const out = [];
  for (let back = days - 1; back >= 0; back -= 1) {
    out.push(utcDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - back))));
  }
  return out;
}

// Nearest-rank percentile: the ceil(p·n)-th smallest value. No interpolation, so a
// reported p95 is always a duration that actually happened.
export function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(1, Math.ceil(p * sorted.length)) - 1];
}

function newBucket() {
  return { started: 0, finished: 0, succeeded: 0, failed: 0, denied: 0, interrupted: 0, durations: [], input_bytes: 0, response_bytes: 0, usage: null };
}

function addRecord(bucket, record) {
  if (record.phase === 'started') bucket.started += 1;
  if (FINISHED_PHASES.has(record.phase)) { bucket.finished += 1; bucket[record.phase] += 1; }
  if (record.signals?.interrupted === true) bucket.interrupted += 1;
  if (Number.isFinite(record.duration_ms)) bucket.durations.push(record.duration_ms);
  if (Number.isFinite(record.input_bytes)) bucket.input_bytes += record.input_bytes;
  if (Number.isFinite(record.response_bytes)) bucket.response_bytes += record.response_bytes;
  if (record.usage && typeof record.usage === 'object') {
    bucket.usage ??= Object.fromEntries(USAGE_FIELDS.map(f => [f, 0]));
    for (const field of USAGE_FIELDS) if (Number.isFinite(record.usage[field])) bucket.usage[field] += record.usage[field];
  }
}

function finishBucket(bucket) {
  const { durations, ...stats } = bucket;
  return {
    ...stats,
    failure_rate: stats.finished ? (stats.failed + stats.denied) / stats.finished : null,
    duration_p50_ms: percentile(durations, 0.5),
    duration_p95_ms: percentile(durations, 0.95),
  };
}

function groupBy(records, keyOf) {
  const groups = new Map();
  for (const record of records) {
    const key = keyOf(record);
    if (!groups.has(key)) groups.set(key, newBucket());
    addRecord(groups.get(key), record);
  }
  return groups;
}

// PDF TABLE VII "Cost exceeds 2x average" translated to the signal this log has: today's
// (failed+denied)/finished against the mean of the earlier days that had traffic. The two
// absolute floors stop a quiet day (or a zero baseline) from firing on a handful of calls.
function failureRateTripWire(byDay, window) {
  const today = byDay.find(d => d.day === window[window.length - 1]);
  const detail = { day: today.day, finished: today.finished, failures: today.failed + today.denied, failure_rate: today.failure_rate, baseline_rate: null, baseline_days: 0 };
  if (today.finished === 0) return { id: 'failure-rate-2x', fired: false, status: 'no-data', detail };
  const baseline = byDay.filter(d => d.day !== today.day && d.finished >= 1);
  detail.baseline_days = baseline.length;
  if (baseline.length === 0) return { id: 'failure-rate-2x', fired: false, status: 'insufficient-baseline', detail };
  detail.baseline_rate = baseline.reduce((sum, d) => sum + d.failure_rate, 0) / baseline.length;
  const fired = today.finished >= TRIP_WIRE_MIN_FINISHED
    && detail.failures >= TRIP_WIRE_MIN_FAILURES
    && today.failure_rate >= TRIP_WIRE_RATE_FACTOR * detail.baseline_rate;
  return { id: 'failure-rate-2x', fired, status: fired ? 'fired' : 'ok', detail };
}

// PDF TABLE VII "Same error repeats 3x → Escalate": the log has no error text, but a tool
// that failed three times in one session is the same signal. Refs are HMACs, so only the
// category is human-readable; the 8-char prefixes let a reader find the session file.
function repeatFailureTripWire(records) {
  const runs = new Map();
  for (const record of records) {
    if (record.phase !== 'failed' || typeof record.tool_ref !== 'string') continue;
    const key = `${record.session_ref}\u0000${record.tool_ref}`;
    const run = runs.get(key) ?? { session_ref: record.session_ref.slice(0, 8), tool_ref: record.tool_ref.slice(0, 8), tool_category: record.tool_category, count: 0, last_at: '' };
    run.count += 1;
    if (record.recorded_at > run.last_at) run.last_at = record.recorded_at;
    runs.set(key, run);
  }
  const hits = [...runs.values()].filter(r => r.count >= TRIP_WIRE_REPEAT_COUNT).sort((a, b) => b.count - a.count || a.last_at.localeCompare(b.last_at));
  return { id: 'repeat-failure-3x', fired: hits.length > 0, status: hits.length > 0 ? 'fired' : (records.length ? 'ok' : 'no-data'), detail: { hits } };
}

export function summarizeObservability(records, { now, days, taskNames = new Map() }) {
  const window = windowDays(now, days);
  const inWindow = records.filter(r => window.includes(String(r.recorded_at).slice(0, 10)));
  const dayGroups = groupBy(inWindow, r => r.recorded_at.slice(0, 10));
  const by_day = window.map(day => ({ day, ...finishBucket(dayGroups.get(day) ?? newBucket()) }));
  const by_task = [...groupBy(inWindow, r => r.task_ref ?? null)].map(([task_ref, bucket]) => ({
    task_ref,
    label: task_ref === null ? '(no task)' : (taskNames.get(task_ref) ?? task_ref.slice(0, 8)),
    ...finishBucket(bucket),
  })).sort((a, b) => b.started - a.started || a.label.localeCompare(b.label));
  const by_category = [...groupBy(inWindow, r => r.tool_category)].map(([tool_category, bucket]) => ({ tool_category, ...finishBucket(bucket) }))
    .sort((a, b) => a.tool_category.localeCompare(b.tool_category));
  return {
    window: { days, from: window[0], to: window[window.length - 1] },
    by_day, by_task, by_category,
    trip_wires: [failureRateTripWire(by_day, window), repeatFailureTripWire(inWindow)],
  };
}
```

- [x] **Step 1.4: GREEN 확인** — `node --test tests/observe.test.mjs` → 8 pass.
- [x] **Step 1.5: 커밋** — `git add src/commands/observe.mjs tests/observe.test.mjs && git commit -m "feat(observe): 관측 로그 순수 집계 + 트립와이어 2종 (failure-rate-2x · repeat-failure-3x)"`

### Task 2: 로그 읽기와 task_ref 역매핑

**Files:** Modify `src/commands/observe.mjs`, Modify `tests/observe.test.mjs`

**Interfaces (Produces):**
- `readObservabilityRecords(targetDir, { now, days })` → `{ status: 'not-installed'|'no-data'|'ok', baseDir, records, skippedLines }`
- `resolveTaskRefs(targetDir)` → `Map<hex32, 'user/task'>` (키 없음·docs 없음이면 빈 Map)
- `hmacRef(key: Buffer, namespace: string, value: string): string` (32 hex)

- [x] **Step 2.1: RED — 테스트 추가** (fixture는 실제 훅으로 쓴다 — 읽기·역매핑이 작성자와 같은 바이트를 보는지가 요점)

```js
import { mkdtemp, mkdir, writeFile, symlink, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { observeToolEvent } from '../templates/.claude/hooks/observe-tools.mjs';
import { readObservabilityRecords, resolveTaskRefs, hmacRef, OBSERVABILITY_BASE } from '../src/commands/observe.mjs';

function hookPayload(event, over = {}) {
  return { hook_event_name: event, session_id: 'sess-1', tool_use_id: `call-${seq += 1}`, tool_name: 'Bash', tool_input: { command: 'ls' }, tool_response: { stdout: 'x' }, duration_ms: 12, ...over };
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

test('read: records written by the real hook are read back; malformed lines, symlinks, non-jsonl and out-of-window days are skipped', async () => {
  const { dir, cleanup } = await project();
  try {
    const now = new Date('2026-09-05T10:00:00.000Z');
    await observeToolEvent(hookPayload('PreToolUse'), { projectDir: dir, now });
    await observeToolEvent(hookPayload('PostToolUse'), { projectDir: dir, now });
    await observeToolEvent(hookPayload('PostToolUseFailure', { error: 'boom' }), { projectDir: dir, now: new Date('2026-09-04T10:00:00.000Z') });
    await observeToolEvent(hookPayload('PostToolUse'), { projectDir: dir, now: new Date('2026-08-20T10:00:00.000Z') }); // 창 밖
    const today = join(dir, OBSERVABILITY_BASE, '2026-09-05');
    await writeFile(join(today, 'zz-000.jsonl'), 'not json\n{"v":2,"phase":"succeeded"}\n{"v":1,"phase":"succeeded"}\n');
    await writeFile(join(today, 'notes.txt'), '{"v":1}\n');
    await symlink(join(today, 'zz-000.jsonl'), join(today, 'link-000.jsonl'));
    const out = await readObservabilityRecords(dir, { now, days: 7 });
    assert.equal(out.status, 'ok');
    assert.deepEqual(out.records.map(r => r.phase).sort(), ['failed', 'started', 'succeeded']);
    assert.equal(out.skippedLines, 3, 'bad json + v2 + missing fields');
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
```

- [x] **Step 2.2: RED 확인** — `node --test tests/observe.test.mjs` → 신규 5건이 `readObservabilityRecords is not a function`류로 실패.

- [x] **Step 2.3: GREEN — 읽기·역매핑 구현** (observe.mjs에 추가)

```js
export function hmacRef(key, namespace, value) {
  return createHmac('sha256', key).update(`${namespace}\u0000${value}`).digest('hex').slice(0, 32);
}

async function regularEntry(path, { dir = false } = {}) {
  try {
    const info = await lstat(path);
    if (info.isSymbolicLink()) return false;
    return dir ? info.isDirectory() : info.isFile();
  } catch { return false; }
}

function validRecord(value) {
  return value !== null && typeof value === 'object' && value.v === 1
    && REQUIRED_FIELDS.every(field => typeof value[field] === 'string');
}

export async function readObservabilityRecords(targetDir, { now = new Date(), days = OBSERVE_DEFAULT_DAYS } = {}) {
  const baseDir = resolve(targetDir, OBSERVABILITY_BASE);
  if (!(await regularEntry(baseDir, { dir: true }))) return { status: 'not-installed', baseDir, records: [], skippedLines: 0 };
  const records = [];
  let skippedLines = 0;
  for (const day of windowDays(now, days)) {
    const dayDir = join(baseDir, day);
    if (!(await regularEntry(dayDir, { dir: true }))) continue;
    for (const name of (await readdir(dayDir)).sort()) {
      const file = join(dayDir, name);
      if (!name.endsWith('.jsonl') || !(await regularEntry(file))) continue;
      for (const line of (await readFile(file, 'utf8')).split('\n')) {
        if (line.trim() === '') continue;
        let parsed;
        try { parsed = JSON.parse(line); } catch { skippedLines += 1; continue; }
        if (validRecord(parsed)) records.push(parsed); else skippedLines += 1;
      }
    }
  }
  return { status: records.length ? 'ok' : 'no-data', baseDir, records, skippedLines };
}

// docs/<user>/<task>/<task>-meta.json → the same HMAC the hook computed from active.json.
// Built only from local files; refs never leave the machine.
export async function resolveTaskRefs(targetDir) {
  const refs = new Map();
  let key;
  try {
    key = await readFile(join(targetDir, OBSERVABILITY_BASE, '.key'));
    if (key.length !== 32) return refs;
  } catch { return refs; }
  const docs = join(targetDir, 'docs');
  let users = [];
  try { users = (await readdir(docs, { withFileTypes: true })).filter(e => e.isDirectory()).map(e => e.name); } catch { return refs; }
  for (const user of users) {
    let tasks = [];
    try { tasks = (await readdir(join(docs, user), { withFileTypes: true })).filter(e => e.isDirectory()).map(e => e.name); } catch { continue; }
    for (const task of tasks) {
      try {
        const meta = JSON.parse(await readFile(join(docs, user, task, `${task}-meta.json`), 'utf8'));
        const u = typeof meta.user === 'string' ? meta.user : user;
        const t = typeof meta.task === 'string' ? meta.task : task;
        refs.set(hmacRef(key, 'task', `${u}\u0000${t}`), `${u}/${t}`);
      } catch { /* not a task dir */ }
    }
  }
  return refs;
}
```

- [x] **Step 2.4: GREEN 확인** — `node --test tests/observe.test.mjs` → 13 pass.
- [x] **Step 2.5: 커밋** — `git add src/commands/observe.mjs tests/observe.test.mjs && git commit -m "feat(observe): JSONL 읽기(창·심볼릭 링크·깨진 줄 방어) + task_ref HMAC 역매핑"`

### Task 3: 러너 `runObserve` + CLI 배선

**Files:** Modify `src/commands/observe.mjs`, `src/cli-args.mjs:18,70-75`, `bin/harness-team.mjs:20,50-78`, `tests/observe.test.mjs`, `tests/cli-args.test.mjs:100-110`

**Interfaces:** `runObserve(ctx: { targetDir, flags: { days?, json? } })` — envelope status `ok|tripped|no-data|not-installed`; exitCode 1 when tripped, 2 on invalid `--days`.

- [x] **Step 3.1: RED — 러너·cli 테스트 추가**

```js
// tests/observe.test.mjs (추가)
import { runObserve } from '../src/commands/observe.mjs';
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
    for (let i = 0; i < 3; i += 1) await observeToolEvent(hookPayload('PostToolUseFailure', { error: 'boom' }), { projectDir: dir, now: new Date() });
    process.exitCode = 0;
    const out = JSON.parse(await captureStdout(() => runObserve({ targetDir: dir, flags: { json: true } })));
    assert.equal(out.status, 'tripped'); assert.equal(out.trip_wires[1].fired, true); assert.equal(process.exitCode, 1);
    process.exitCode = 0;
    const text = await captureStdout(() => runObserve({ targetDir: dir, flags: {} }));
    assert.match(text, /✗ repeat-failure-3x/); process.exitCode = 0;
  } finally { await cleanup(); }
});

test('runObserve: --days outside 1..14 or non-integer is a usage error (exit 2, status error)', async () => {
  const { dir, cleanup } = await project();
  try {
    for (const days of ['0', '15', 'abc', '2.5']) {
      process.exitCode = 0;
      const out = JSON.parse(await captureStdout(() => runObserve({ targetDir: dir, flags: { json: true, days } })));
      assert.equal(out.status, 'error', days); assert.match(out.error.root_cause, /1\.\.14/); assert.equal(process.exitCode, 2, days);
    }
    process.exitCode = 0;
  } finally { await cleanup(); }
});
```

```js
// tests/cli-args.test.mjs — 'real invocations still resolve to a run'에 추가
  assert.equal(resolveInvocation(['observe']).kind, 'run');
  assert.equal(resolveInvocation(['observe', '--days', '3']).flags.days, '3');
  assert.equal(resolveInvocation(['observe', '--days=14', '--json']).flags.days, '14');
  assert.equal(resolveInvocation(['observe', '--days']).kind, 'error');
```

- [x] **Step 3.2: RED 확인** — `node --test tests/observe.test.mjs tests/cli-args.test.mjs` → runObserve 미정의 4건 + cli-args `observe` unknown command 실패.

- [x] **Step 3.3: GREEN — 러너·렌더 구현** (observe.mjs에 추가)

```js
function fail(json, summary, rootCause, safeRetry) {
  if (json) {
    emitObservation(buildEnvelope({ command: 'observe', status: 'error', summary: `observe 실패: ${summary}`,
      error: { root_cause: rootCause, safe_retry: safeRetry, stop_condition: '원인을 해소하기 전에는 재시도하지 말 것' } }));
  } else {
    console.log(`✗ observe: ${summary}`); console.log(`cause: ${rootCause}`); console.log(`retry: ${safeRetry}`);
    console.log('stop: 원인을 해소하기 전에는 재시도하지 말 것');
  }
}

function parseDays(raw) {
  if (raw === undefined) return OBSERVE_DEFAULT_DAYS;
  if (!/^\d+$/.test(String(raw))) return null;
  const days = Number(raw);
  return days >= 1 && days <= OBSERVE_MAX_DAYS ? days : null;
}

const pct = v => (v === null ? '-' : `${(v * 100).toFixed(1)}%`);
const num = v => (v === null || v === undefined ? '-' : String(v));

function statsRow(label, s) {
  return [label.padEnd(22), num(s.started).padStart(7), num(s.finished).padStart(8), num(s.failed).padStart(6), num(s.denied).padStart(6), pct(s.failure_rate).padStart(7), num(s.duration_p95_ms).padStart(7), num(s.interrupted).padStart(5)].join(' ');
}
const HEADER = statsRow('', { started: 'started', finished: 'finished', failed: 'failed', denied: 'denied', failure_rate: null, duration_p95_ms: 'p95ms', interrupted: 'intr' }).replace('      -', '   rate');

export function renderObserveText(result, { records, skippedLines }) {
  const lines = [`observe: ${result.window.days}일 창 (${result.window.from} → ${result.window.to}) · 레코드 ${records} · 건너뜀 ${skippedLines}`];
  for (const wire of result.trip_wires) {
    const mark = wire.fired ? '✗' : '✓';
    if (wire.id === 'failure-rate-2x') {
      const d = wire.detail;
      lines.push(`${mark} ${wire.id}: ${wire.status} (오늘 ${pct(d.failure_rate)} vs 기준 ${pct(d.baseline_rate)} · finished ${d.finished} · failures ${d.failures} · 기준일 ${d.baseline_days})`);
    } else {
      const hits = wire.detail.hits.map(h => `session ${h.session_ref} ${h.tool_category} ×${h.count} (마지막 ${h.last_at})`).join('; ');
      lines.push(`${mark} ${wire.id}: ${wire.status}${hits ? ` — ${hits}` : ''}`);
    }
  }
  const section = (title, rows) => { lines.push('', title, HEADER); for (const [label, s] of rows) lines.push(statsRow(label, s)); };
  section('일별', result.by_day.map(d => [d.day, d]));
  section('task별', result.by_task.map(t => [t.label, t]));
  section('도구 분류별', result.by_category.map(c => [c.tool_category, c]));
  return lines.join('\n');
}

export async function runObserve(ctx) {
  const json = !!(ctx.flags && ctx.flags.json);
  const days = parseDays(ctx.flags && ctx.flags.days);
  if (days === null) {
    process.exitCode = 2;
    return fail(json, `--days 값이 잘못됨 (${ctx.flags.days})`, '--days는 1..14 정수만 허용 (훅 보존 기간 14일)', '`harness-team observe --days 7`처럼 정수를 지정');
  }
  const now = new Date();
  const read = await readObservabilityRecords(ctx.targetDir, { now, days });
  if (read.status === 'not-installed') {
    const summary = `관측 로그 없음 — ${OBSERVABILITY_BASE} 미존재 (observe-tools 훅이 아직 기록하지 않음)`;
    if (json) emitObservation(buildEnvelope({ command: 'observe', status: 'not-installed', summary, nextActions: ['harness-team init (observe-tools 훅 설치) 후 Claude Code 세션에서 도구를 사용하면 기록됨'] }));
    else console.log(`- observe: ${summary}`);
    return;
  }
  const result = summarizeObservability(read.records, { now, days, taskNames: await resolveTaskRefs(ctx.targetDir) });
  const tripped = result.trip_wires.some(w => w.fired);
  const status = tripped ? 'tripped' : read.status; // 'ok' | 'no-data'
  if (tripped) process.exitCode = 1;
  if (json) {
    emitObservation(buildEnvelope({
      command: 'observe', status,
      summary: tripped ? `트립와이어 발화: ${result.trip_wires.filter(w => w.fired).map(w => w.id).join(', ')}` : `${read.records.length}개 레코드, 트립와이어 없음`,
      nextActions: tripped ? ['해당 세션 로그(.harness/observability/v1/<day>/<session_ref>-NNN.jsonl)를 열어 실패한 도구 호출을 추적'] : [],
      extra: { window: result.window, scorecard: { by_day: result.by_day, by_task: result.by_task, by_category: result.by_category }, trip_wires: result.trip_wires, skipped_lines: read.skippedLines },
    }));
  } else {
    console.log(renderObserveText(result, { records: read.records.length, skippedLines: read.skippedLines }));
  }
}
```

```js
// src/cli-args.mjs
export const VALUE_FLAGS = new Set(['stack', 'member', 'target', 'backup-dir', 'backup-parent', 'days']);
// COMMANDS — `release` 행 앞에 추가
  { name: 'observe', args: '[--days <1..14>]',
    summary: 'Scorecard + trip wires from .harness/observability logs (read-only; exit 1 when a trip wire fires)',
    flags: ['days'] },
```

```js
// bin/harness-team.mjs
import { runObserve } from '../src/commands/observe.mjs';
// taskCmds에 'observe' 추가 (cwd 대상), 라우터에
    case 'observe': return runObserve(ctx);
```

- [x] **Step 3.4: GREEN 확인** — `node --test tests/observe.test.mjs tests/cli-args.test.mjs` 전부 pass. 수동: `node bin/harness-team.mjs observe`(이 저장소 → `- observe: 관측 로그 없음 …`), `node bin/harness-team.mjs observe --help`.
- [x] **Step 3.5: 커밋** — `git add src/commands/observe.mjs src/cli-args.mjs bin/harness-team.mjs tests/observe.test.mjs tests/cli-args.test.mjs && git commit -m "feat(cli): harness-team observe — 스코어카드·트립와이어 러너, --days 값 플래그, 라우터 배선"`

### Task 4: 이름을 부르는 표면 (manifest-sync가 고정)

**Files:** Create `commands/harness-observe.md`, `skills/harness-observe/SKILL.md`, `skills/harness-observe/agents/openai.yaml`; Modify `.claude-plugin/plugin.json`(commands), `README.md`(명령어 레퍼런스에 절 추가 + 설치 결과물 `.harness/observability/` 문장에 소비 명령 한 줄), `CHANGELOG.md`([Unreleased] Added)

- [x] **Step 4.1: RED 확인** — `node --test tests/manifest-sync.test.mjs`는 현재 통과한다(표면이 아직 없으므로). 이 Task의 RED는 "commands/harness-observe.md만 먼저 만들고 실행 → Codex 동등 스킬·plugin.json 미등록으로 2건 실패"로 확인한다.

- [x] **Step 4.2: 파일 작성**

`commands/harness-observe.md`:
```markdown
---
description: 관측 로그(.harness/observability) 스코어카드와 트립와이어 판정 — read-only, 발화 시 exit 1
phase: Validation
argument-hint: '[--days <1..14>] [--json]'
---

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" observe $ARGUMENTS
```

observe-tools 훅이 쓴 도구 관측 JSONL을 읽어 **일별·task별·도구 분류별 스코어카드**와 **트립와이어 2종**을 보고한다.
로그를 수정·삭제하지 않는다. 도구 이름·세션 id는 HMAC 참조라 복원하지 않고, task 참조만 로컬 `docs/<user>/<task>/`로 되돌린다.

- `failure-rate-2x` — 오늘(UTC) 완료 ≥ 20건·실패+거부 ≥ 5건이고 실패·거부율이 직전 날들 평균의 2배 이상.
- `repeat-failure-3x` — 한 세션에서 같은 도구가 3회 이상 실패.

발화하면 exit 1이다 — 결과를 사용자에게 보고하고, `next_actions`의 세션 로그 경로를 열어 실패한 호출을 추적한다. 로그가 없으면(`not-installed`) `harness-team init`으로 훅을 설치하라고 안내한다. `--json`은 `harness/observation/v1` envelope다.
```

`skills/harness-observe/SKILL.md`:
```markdown
---
name: harness-observe
description: Codex wrapper for the harness observability scorecard and trip wires. Use when the user asks for /harness-observe, harness observe, tool failure trends, trip wire status, or observability logs.
---

# Harness Observe

Use this skill as the Codex equivalent of Claude Code `/harness-observe`.

## Source of Truth

- Read `../../commands/harness-observe.md` before acting.
- Prefer the shared CLI instead of reimplementing behavior:
  - In this plugin source repo, run: `node bin/harness-team.mjs observe ...`
  - In a consumer project with `harness-team` on PATH, run: `harness-team observe ...`
- The command is read-only and never modifies logs. Exit 1 means a trip wire fired — report it, do not "fix" the logs.
- Do not create commits unless the user explicitly asks.
```

`skills/harness-observe/agents/openai.yaml`:
```yaml
interface:
  display_name: "Harness Observe"
  short_description: "Scorecard and trip wires from observability logs."
  default_prompt: "Use $harness-observe to report tool-call health and trip wires."
```

`.claude-plugin/plugin.json` commands에 `"./commands/harness-observe.md"` 추가(harness-doctor.md 다음).

README `## 명령어 레퍼런스` — `/harness-doctor` 절 뒤에:
```markdown
### `/harness-observe` — 관측 로그 스코어카드 · 트립와이어

observe-tools 훅이 쓴 `.harness/observability/` JSONL을 읽어 일별·task별·도구 분류별 호출·실패·거부·p95를 보고하고,
트립와이어 2종(실패·거부율이 기준의 2배 / 같은 도구 3회 실패)을 판정합니다. read-only이며 발화 시 exit 1입니다.

```bash
/harness-observe            # 기본 7일 창
harness-team observe --days 14 --json
```
```
README 설치 결과물 절(`.harness/observability/` 문장 뒤)에 한 줄: `harness-team observe`가 이 로그의 유일한 소비자입니다(스코어카드·트립와이어).

CHANGELOG `[Unreleased]`:
```markdown
### Added
- **`harness-team observe` — 관측 로그의 첫 소비자** — observe-tools 훅은 도구 호출마다 `.harness/observability/v1/<day>/*.jsonl`을
  써 왔지만 읽는 코드가 없었습니다(PDF 6층 비교 분석 권고 ①). 새 read-only 하위명령이 창(기본 7일, 1..14) 안의 레코드를 일별·task별·
  도구 분류별로 집계하고(호출·완료·failed·denied·실패거부율·p50/p95·바이트·usage 토큰), 트립와이어 2종 — `failure-rate-2x`(오늘 완료 ≥20·
  실패+거부 ≥5·비율이 직전 날 평균의 2배) · `repeat-failure-3x`(한 세션 같은 도구 3회 실패) — 를 판정합니다. 발화하면 exit 1이라 훅·CI가
  센서로 쓸 수 있습니다. task 참조는 로컬 `.key`와 `docs/<user>/<task>/`로만 되돌리고 도구 이름은 복원하지 않습니다.
  `/harness-observe` 슬래시 명령과 Codex `harness-observe` 스킬이 함께 들어갑니다. (task `observability-consumer`)
```

- [x] **Step 4.3: GREEN 확인** — `git add -A commands skills .claude-plugin README.md CHANGELOG.md && npm run docs:generate && node --test tests/manifest-sync.test.mjs tests/harness-overview-generation.test.mjs tests/documentation-inventory-pointers.test.mjs` pass → `npm test` 전체 pass, `npm run docs:check` 최신.
- [x] **Step 4.4: 커밋** — `git add -A && git commit -m "docs(observe): /harness-observe 명령·Codex 스킬·plugin.json·README·CHANGELOG + overview 재생성"`

### Task 5: 검증 · 리뷰 · ship

- [x] **Step 5.1: 실제 실행 증거** — 임시 프로젝트에 훅으로 레코드 30건(실패 5 포함)을 만들고 `node bin/harness-team.mjs observe`·`--json`·`--days 1` 출력을 artifact `## 결과`에 인용. 이 저장소에서는 `not-installed` 안내가 나오는 것을 인용.
- [x] **Step 5.2: 외부 read-only 리뷰** — `/harness-review codex` 절차(`-m gpt-5.6-sol`, `< /dev/null`), 발견 재현·판별 후 반영, artifact `## Reviews` 마커.
- [ ] **Step 5.3: ship** — spec·plan 최종 갱신, artifact 결과·검증 출력·리스크·학습, 다이어그램 건너뜀 기록 → 커밋·push·PR(사용자 지시 후) → CI pass 확인.
- [ ] **Step 5.4: 머지 후 `harness-team done` → 기본 브랜치에서 `summary --write`**

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-09-05: `finished`(succeeded+failed+denied)·`trip wire` 판정 객체·`task_ref 역매핑`을 spec Ontology에 정의.

## 참고
- spec 참고 절. 실행 스킬: superpowers:executing-plans(inline). 리뷰 절차: `commands/harness-review.md`.

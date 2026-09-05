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
  return {
    started: 0, finished: 0, succeeded: 0, failed: 0, denied: 0, interrupted: 0,
    durations: [], input_bytes: 0, response_bytes: 0, usage: null,
  };
}

function addRecord(bucket, record) {
  if (record.phase === 'started') bucket.started += 1;
  if (FINISHED_PHASES.has(record.phase)) { bucket.finished += 1; bucket[record.phase] += 1; }
  if (record.signals?.interrupted === true) bucket.interrupted += 1;
  if (Number.isFinite(record.duration_ms)) bucket.durations.push(record.duration_ms);
  if (Number.isFinite(record.input_bytes)) bucket.input_bytes += record.input_bytes;
  if (Number.isFinite(record.response_bytes)) bucket.response_bytes += record.response_bytes;
  if (record.usage && typeof record.usage === 'object') {
    bucket.usage ??= Object.fromEntries(USAGE_FIELDS.map(field => [field, 0]));
    for (const field of USAGE_FIELDS) {
      if (Number.isFinite(record.usage[field])) bucket.usage[field] += record.usage[field];
    }
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
  const detail = {
    day: today.day, finished: today.finished, failures: today.failed + today.denied,
    failure_rate: today.failure_rate, baseline_rate: null, baseline_days: 0,
  };
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
    const run = runs.get(key) ?? {
      session_ref: record.session_ref.slice(0, 8), tool_ref: record.tool_ref.slice(0, 8),
      tool_category: record.tool_category, count: 0, last_at: '',
    };
    run.count += 1;
    if (record.recorded_at > run.last_at) run.last_at = record.recorded_at;
    runs.set(key, run);
  }
  const hits = [...runs.values()]
    .filter(run => run.count >= TRIP_WIRE_REPEAT_COUNT)
    .sort((a, b) => b.count - a.count || a.last_at.localeCompare(b.last_at));
  const status = hits.length > 0 ? 'fired' : (records.length ? 'ok' : 'no-data');
  return { id: 'repeat-failure-3x', fired: hits.length > 0, status, detail: { hits } };
}

export function summarizeObservability(records, { now, days, taskNames = new Map() }) {
  const window = windowDays(now, days);
  const inWindow = records.filter(r => window.includes(String(r.recorded_at).slice(0, 10)));
  const dayGroups = groupBy(inWindow, r => r.recorded_at.slice(0, 10));
  const by_day = window.map(day => ({ day, ...finishBucket(dayGroups.get(day) ?? newBucket()) }));
  const by_task = [...groupBy(inWindow, r => r.task_ref ?? null)]
    .map(([task_ref, bucket]) => ({
      task_ref,
      label: task_ref === null ? '(no task)' : (taskNames.get(task_ref) ?? task_ref.slice(0, 8)),
      ...finishBucket(bucket),
    }))
    .sort((a, b) => b.started - a.started || a.label.localeCompare(b.label));
  const by_category = [...groupBy(inWindow, r => r.tool_category)]
    .map(([tool_category, bucket]) => ({ tool_category, ...finishBucket(bucket) }))
    .sort((a, b) => a.tool_category.localeCompare(b.tool_category));
  return {
    window: { days, from: window[0], to: window[window.length - 1] },
    by_day,
    by_task,
    by_category,
    trip_wires: [failureRateTripWire(by_day, window), repeatFailureTripWire(inWindow)],
  };
}

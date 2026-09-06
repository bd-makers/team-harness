// Read-only consumer for the tool-observability JSONL written by
// templates/.claude/hooks/observe-tools.mjs. Three layers: read → pure summarize → render.
// The hook file is never imported here (it is copied into consumer projects); the HMAC
// derivation below must stay byte-identical to the hook's hmacRef — tests/observe.test.mjs
// pins that by writing a record with the real hook and resolving its task_ref.
import { createHmac } from 'node:crypto';
import { lstat, readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../observation.mjs';

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
    if (run.last_at === '' || Date.parse(record.recorded_at) > Date.parse(run.last_at)) run.last_at = record.recorded_at;
    runs.set(key, run);
  }
  const hits = [...runs.values()]
    .filter(run => run.count >= TRIP_WIRE_REPEAT_COUNT)
    .sort((a, b) => b.count - a.count || a.last_at.localeCompare(b.last_at));
  const status = hits.length > 0 ? 'fired' : (records.length ? 'ok' : 'no-data');
  return { id: 'repeat-failure-3x', fired: hits.length > 0, status, detail: { hits } };
}

const REQUIRED_FIELDS = ['phase', 'session_ref', 'tool_category', 'recorded_at'];

// Same derivation as the hook's hmacRef (namespace NUL value → sha256 → 32 hex).
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

// A line that reaches summarize must not be able to crash it: task_ref is used as a
// string key and recorded_at as an instant, so both are checked here (codex P2, 2026-09-05).
function validRecord(value) {
  return value !== null && typeof value === 'object' && value.v === 1
    && REQUIRED_FIELDS.every(field => typeof value[field] === 'string')
    && (value.task_ref === null || value.task_ref === undefined || typeof value.task_ref === 'string')
    && !Number.isNaN(Date.parse(value.recorded_at));
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

// Day of a record = the UTC day of its instant. The hook writes toISOString() (always Z),
// but an offset timestamp near midnight must still land on the right UTC day (codex P3).
function recordDay(record) {
  const ms = typeof record.recorded_at === 'string' ? Date.parse(record.recorded_at) : NaN;
  return Number.isNaN(ms) ? null : utcDay(new Date(ms));
}

export function summarizeObservability(records, { now, days, taskNames = new Map() }) {
  const window = windowDays(now, days);
  const inWindow = records.filter(r => window.includes(recordDay(r)));
  const dayGroups = groupBy(inWindow, recordDay);
  const by_day = window.map(day => ({ day, ...finishBucket(dayGroups.get(day) ?? newBucket()) }));
  const by_task = [...groupBy(inWindow, r => (typeof r.task_ref === 'string' ? r.task_ref : null))]
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

function fail(json, summary, { cause, retry, alternatives = [], safeDefault }) {
  const packet = buildErrorPacket({
    cause, retry, alternatives, safeDefault,
    stop: '원인을 해소하기 전에는 재시도하지 말 것',
  });
  if (json) {
    emitObservation(buildEnvelope({
      command: 'observe', status: 'error', summary: `observe 실패: ${summary}`, error: packet,
    }));
  } else {
    console.log(`✗ observe: ${summary}`);
    for (const line of renderErrorPacket(packet)) console.log(line);
  }
}

function parseDays(raw) {
  if (raw === undefined) return OBSERVE_DEFAULT_DAYS;
  if (!/^\d+$/.test(String(raw))) return null;
  const days = Number(raw);
  return days >= 1 && days <= OBSERVE_MAX_DAYS ? days : null;
}

const pct = value => (value === null || value === undefined ? '-' : `${(value * 100).toFixed(1)}%`);
const num = value => (value === null || value === undefined ? '-' : String(value));
const COLUMNS = [['started', 7], ['finished', 8], ['failed', 6], ['denied', 6], ['rate', 7], ['p95ms', 7], ['intr', 5]];

function statsRow(label, cells) {
  return [label.padEnd(22), ...cells.map((cell, i) => String(cell).padStart(COLUMNS[i][1]))].join(' ');
}
const HEADER = statsRow('', COLUMNS.map(([name]) => name));
function statsCells(s) {
  return [num(s.started), num(s.finished), num(s.failed), num(s.denied), pct(s.failure_rate), num(s.duration_p95_ms), num(s.interrupted)];
}

// Stage-6 loopback as a nudge, not an emitter: a fired wire is a problem statement waiting for a
// task, so both output paths (text, --json next_actions) say how to open one. It only suggests —
// the thresholds are still uncalibrated against real usage, and auto-creating a task would mint
// false-positive tasks that the done guard then has to be talked out of.
//
// The task name keys on the day of the *event* the wire reports, not the day observe ran —
// repeat-failure-3x scans the whole window, so keying on the run day would suggest a fresh
// name every day for the same old incident and defeat the "re-run converges on `activated:`"
// contract (codex P2). failure-rate-2x is today's metric, so its detail.day is that day already;
// repeat-failure-3x takes the top-ranked hit's last failure, bucketed by UTC instant like by_day.
function wireDay(wire, fallback) {
  if (wire.id === 'failure-rate-2x' && wire.detail && wire.detail.day) return wire.detail.day;
  if (wire.id === 'repeat-failure-3x') {
    const top = wire.detail && wire.detail.hits && wire.detail.hits[0];
    const at = top ? Date.parse(top.last_at) : NaN;
    if (Number.isFinite(at)) return utcDay(new Date(at));
  }
  return fallback;
}

export function observeLoopbackNudge(fired, fallbackDay) {
  const ids = fired.map(wire => wire.id);
  const day = wireDay(fired[0], fallbackDay);
  return `트립와이어를 task로 이어가려면: harness-team task observe-${ids[0]}-${day} 후 spec 목적 절에 발화 id·수치(${ids.join(', ')})를 "오늘 무엇이 안 되는가" 문제 진술로 옮긴다 — 자동 생성은 하지 않는다`;
}

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
  const firedWires = result.trip_wires.filter(wire => wire.fired);
  if (firedWires.length) lines.push(`next: ${observeLoopbackNudge(firedWires, result.window.to)}`);
  const section = (title, rows) => {
    lines.push('', title, HEADER);
    for (const [label, stats] of rows) lines.push(statsRow(label, statsCells(stats)));
  };
  section('일별', result.by_day.map(d => [d.day, d]));
  section('task별', result.by_task.map(t => [t.label, t]));
  section('도구 분류별', result.by_category.map(c => [c.tool_category, c]));
  return lines.join('\n');
}

export async function runObserve(ctx) {
  const json = !!(ctx.flags && ctx.flags.json);
  const rawDays = ctx.flags && ctx.flags.days;
  const days = parseDays(rawDays);
  if (days === null) {
    process.exitCode = 2;
    return fail(json, `--days 값이 잘못됨 (${rawDays})`, {
      cause: `--days는 1..${OBSERVE_MAX_DAYS} 정수만 허용 (훅 보존 기간 ${OBSERVE_MAX_DAYS}일)`,
      retry: `1..${OBSERVE_MAX_DAYS} 범위의 정수를 주고 재실행`,
      alternatives: [`--days 없이 실행하면 기본 창(${OBSERVE_DEFAULT_DAYS}일)으로 스코어카드를 낸다`],
      safeDefault: '스코어카드를 내지 않고 종료한다 — 로그 파일은 읽지도 쓰지도 않는다',
    });
  }
  const now = new Date();
  const read = await readObservabilityRecords(ctx.targetDir, { now, days });
  if (read.status === 'not-installed') {
    const summary = `관측 로그 없음 — ${OBSERVABILITY_BASE} 미존재 (observe-tools 훅이 아직 기록하지 않음)`;
    if (json) {
      emitObservation(buildEnvelope({
        command: 'observe', status: 'not-installed', summary,
        nextActions: ['harness-team init (observe-tools 훅 설치) 후 Claude Code 세션에서 도구를 사용하면 기록됨'],
      }));
    } else {
      console.log(`- observe: ${summary}`);
    }
    return;
  }
  const result = summarizeObservability(read.records, { now, days, taskNames: await resolveTaskRefs(ctx.targetDir) });
  const fired = result.trip_wires.filter(wire => wire.fired);
  const status = fired.length ? 'tripped' : read.status; // 'ok' | 'no-data'
  if (fired.length) process.exitCode = 1;
  if (json) {
    emitObservation(buildEnvelope({
      command: 'observe',
      status,
      summary: fired.length ? `트립와이어 발화: ${fired.map(wire => wire.id).join(', ')}` : `${read.records.length}개 레코드, 트립와이어 없음`,
      nextActions: fired.length
        ? [
          `해당 세션 로그(${OBSERVABILITY_BASE}/<day>/<session_ref>-NNN.jsonl)를 열어 실패한 도구 호출을 추적`,
          observeLoopbackNudge(fired, result.window.to),
        ]
        : [],
      extra: {
        window: result.window,
        scorecard: { by_day: result.by_day, by_task: result.by_task, by_category: result.by_category },
        trip_wires: result.trip_wires,
        skipped_lines: read.skippedLines,
      },
    }));
  } else {
    console.log(renderObserveText(result, { records: read.records.length, skippedLines: read.skippedLines }));
  }
}

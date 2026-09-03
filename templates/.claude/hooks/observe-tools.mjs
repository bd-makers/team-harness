import { appendFile, chmod, lstat, mkdir, readFile, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { createHmac, randomBytes } from 'node:crypto';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

export const OBSERVABILITY_VERSION = 1;
export const RETENTION_DAYS = 14;
export const MAX_LOG_FILE_BYTES = 8 * 1024 * 1024;
const KEY_FILE = '.key';
const HEX_REF_LENGTH = 32;
const TOOL_EVENTS = new Map([
  ['PreToolUse', 'started'],
  ['PostToolUse', 'succeeded'],
  ['PostToolUseFailure', 'failed'],
  ['PermissionDenied', 'denied'],
]);

function isWithin(root, candidate) {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function safeError() {
  process.stderr.write('team-harness observability: logging skipped\n');
}

function byteMetadata(value) {
  if (value === undefined) return { bytes: null, capped: false };
  try {
    const bytes = Buffer.byteLength(JSON.stringify(value), 'utf8');
    return { bytes: Math.min(bytes, 1024 * 1024), capped: bytes > 1024 * 1024 };
  } catch {
    return { bytes: null, capped: false };
  }
}

function toolCategory(name) {
  if (name.startsWith('mcp__')) return 'mcp';
  if (['Read', 'Glob', 'Grep'].includes(name)) return 'filesystem_read';
  if (['Edit', 'Write', 'apply_patch'].includes(name)) return 'filesystem_write';
  if (['Bash', 'exec_command', 'write_stdin'].includes(name)) return 'shell';
  if (['WebFetch', 'WebSearch', 'web_search'].includes(name)) return 'network';
  if (['Agent', 'Task', 'spawn_agent'].includes(name)) return 'agent';
  return 'other';
}

function hmacRef(key, namespace, value) {
  return createHmac('sha256', key).update(`${namespace}\u0000${value}`).digest('hex').slice(0, HEX_REF_LENGTH);
}

async function ensurePrivateDirectory(path, parent) {
  await mkdir(path, { recursive: true, mode: 0o700 });
  const link = await lstat(path);
  if (!link.isDirectory() || link.isSymbolicLink()) throw new Error('unsafe directory');
  const realPath = await realpath(path);
  if (parent && !isWithin(parent, realPath)) throw new Error('unsafe directory');
  await chmod(realPath, 0o700);
  const info = await stat(realPath);
  if (!info.isDirectory() || (info.mode & 0o077) !== 0) throw new Error('unsafe directory');
  return realPath;
}

async function safeBase(projectDir) {
  if (!projectDir) throw new Error('missing project directory');
  const projectRoot = await realpath(projectDir);
  const harnessPath = resolve(projectRoot, '.harness');
  await mkdir(harnessPath, { recursive: true });
  const harnessRealPath = await realpath(harnessPath);
  if (!isWithin(projectRoot, harnessRealPath) || harnessRealPath === projectRoot) throw new Error('unsafe observability base');
  const observabilityPath = await ensurePrivateDirectory(join(harnessRealPath, 'observability'), harnessRealPath);
  const baseRealPath = await ensurePrivateDirectory(join(observabilityPath, `v${OBSERVABILITY_VERSION}`), observabilityPath);
  return { projectRoot, baseRealPath };
}

async function loadKey(base) {
  const keyPath = join(base, KEY_FILE);
  let info;
  try {
    info = await lstat(keyPath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const key = randomBytes(32);
    try {
      await writeFile(keyPath, key, { mode: 0o600, flag: 'wx' });
      await chmod(keyPath, 0o600);
      const created = await lstat(keyPath);
      if (!created.isFile() || created.isSymbolicLink() || (created.mode & 0o077) !== 0) throw new Error('unsafe key');
      return key;
    } catch (createError) {
      if (createError.code !== 'EEXIST') throw createError;
      info = await lstat(keyPath);
    }
  }

  if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077) !== 0) throw new Error('unsafe key');
  const key = await readFile(keyPath);
  if (key.length !== 32) throw new Error('invalid key');
  return key;
}

async function taskRef(projectRoot, key) {
  const activePath = join(projectRoot, '.harness', 'active.json');
  try {
    const active = JSON.parse(await readFile(activePath, 'utf8'));
    if (typeof active.user !== 'string' || typeof active.task !== 'string') return null;
    return hmacRef(key, 'task', `${active.user}\u0000${active.task}`);
  } catch {
    return null;
  }
}

function utcDay(now) {
  return now.toISOString().slice(0, 10);
}

function cutoffDay(now) {
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - RETENTION_DAYS));
  return utcDay(cutoff);
}

export async function cleanupExpiredLogs(baseRealPath, { now = new Date() } = {}) {
  const cutoff = cutoffDay(now);
  for (const entry of await readdir(baseRealPath, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d{4}-\d{2}-\d{2}$/.test(entry.name) || entry.name >= cutoff) continue;
    const candidate = join(baseRealPath, entry.name);
    const candidateRealPath = await realpath(candidate);
    if (!isWithin(baseRealPath, candidateRealPath) || candidateRealPath === baseRealPath) continue;
    await rm(candidateRealPath, { recursive: true, force: false });
  }
}

async function logPath(dayDir, sessionRef, maxLogFileBytes) {
  for (let sequence = 0; sequence < 10_000; sequence += 1) {
    const candidate = join(dayDir, `${sessionRef}-${String(sequence).padStart(3, '0')}.jsonl`);
    try {
      const info = await lstat(candidate);
      if (!info.isFile() || info.isSymbolicLink()) throw new Error('unsafe log file');
      if (info.size < maxLogFileBytes) return candidate;
    } catch (error) {
      if (error.code === 'ENOENT') return candidate;
      throw error;
    }
  }
  throw new Error('log rotation exhausted');
}

function buildRecord(input, key, task) {
  const phase = TOOL_EVENTS.get(input?.hook_event_name);
  if (!phase || typeof input?.session_id !== 'string' || typeof input?.tool_use_id !== 'string' || typeof input?.tool_name !== 'string') {
    return null;
  }
  const response = input.tool_response;
  const usage = numericUsage(response?.usage);
  const inputSize = byteMetadata(input.tool_input);
  const responseSize = byteMetadata(response);
  const record = {
    v: OBSERVABILITY_VERSION,
    recorded_at: new Date().toISOString(),
    agent: 'claude-code',
    vendor_event: input.hook_event_name,
    phase,
    session_ref: hmacRef(key, 'session', input.session_id),
    task_ref: task,
    call_ref: hmacRef(key, 'tool-use', input.tool_use_id),
    tool_ref: hmacRef(key, 'tool', input.tool_name),
    tool_category: toolCategory(input.tool_name),
    input_bytes: inputSize.bytes,
    input_bytes_capped: inputSize.capped,
    response_bytes: responseSize.bytes,
    response_bytes_capped: responseSize.capped,
    duration_ms: Number.isSafeInteger(input.duration_ms) && input.duration_ms >= 0 ? input.duration_ms : null,
    signals: {
      interrupted: input.is_interrupt === true || input.tool_response?.interrupted === true,
      response_present: response !== undefined,
      stderr_present: typeof input.tool_response?.stderr === 'string' && input.tool_response.stderr.length > 0,
      error_present: typeof input.error === 'string' && input.error.length > 0,
      usage_present: usage !== null,
    },
  };
  if (usage !== null) record.usage = usage;
  return record;
}

function numericUsage(value) {
  if (!value || typeof value !== 'object') return null;
  const usage = {};
  for (const field of ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens']) {
    if (Number.isSafeInteger(value[field]) && value[field] >= 0) usage[field] = value[field];
  }
  return Object.keys(usage).length > 0 ? usage : null;
}

export async function observeToolEvent(input, {
  projectDir = process.env.CLAUDE_PROJECT_DIR,
  now = new Date(),
  maxLogFileBytes = MAX_LOG_FILE_BYTES,
} = {}) {
  const { projectRoot, baseRealPath } = await safeBase(projectDir);
  if (input?.hook_event_name === 'SessionStart') {
    await cleanupExpiredLogs(baseRealPath, { now });
    return { written: false, reason: 'cleanup' };
  }

  const key = await loadKey(baseRealPath);
  const record = buildRecord(input, key, await taskRef(projectRoot, key));
  if (!record) return { written: false, reason: 'unsupported-event' };

  record.recorded_at = now.toISOString();
  const dayDir = join(baseRealPath, utcDay(now));
  await ensurePrivateDirectory(dayDir, baseRealPath);
  const file = await logPath(dayDir, record.session_ref, maxLogFileBytes);
  await appendFile(file, `${JSON.stringify(record)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'a' });
  await chmod(file, 0o600);
  const info = await stat(file);
  if ((info.mode & 0o077) !== 0) throw new Error('unsafe log file');
  return { written: true, file, record };
}

async function readStdin() {
  let source = '';
  for await (const chunk of process.stdin) source += chunk;
  return JSON.parse(source);
}

export async function runObserver() {
  try {
    await observeToolEvent(await readStdin());
  } catch {
    safeError();
  }
}

// Run the observer only when this file is the entry point (not when imported by
// tests). `URL.pathname` is percent-encoded, so on any path with a space or a
// non-ASCII character ("Mobile Documents", a Korean folder name) it never equalled
// the resolved argv path and the hook exited 0 without logging anything. Compare
// real filesystem paths instead.
function samePath(a, b) {
  const real = (p) => { try { return realpathSync(p); } catch { return p; } };
  return real(resolve(a)) === real(b);
}

if (process.argv[1] && samePath(process.argv[1], fileURLToPath(import.meta.url))) {
  await runObserver();
}

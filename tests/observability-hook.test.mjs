import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp } from 'node:fs/promises';
import { OBSERVABILITY_VERSION, RETENTION_DAYS, observeToolEvent } from '../templates/.claude/hooks/observe-tools.mjs';

const TOKEN = 'sk-test-secret-value-must-never-be-recorded';
const ABSOLUTE_PATH = '/Users/secret-person/private/project/.env';
const PROMPT = 'private prompt body must never be recorded';
const MAX_CAPTURED_BYTES = 1024 * 1024;

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-observe-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(join(dir, '.harness', 'active.json'), JSON.stringify({ user: 'secret-person', task: 'private-task' }));
  return dir;
}

async function logFiles(dir) {
  const base = join(dir, '.harness', 'observability', `v${OBSERVABILITY_VERSION}`);
  const days = await readdir(base, { withFileTypes: true });
  const files = [];
  for (const day of days) {
    if (!day.isDirectory()) continue;
    for (const file of await readdir(join(base, day.name))) {
      if (file.endsWith('.jsonl')) files.push(join(base, day.name, file));
    }
  }
  return files;
}

test('Claude template preserves existing hooks and registers every v1 observability event', async () => {
  const settings = JSON.parse(await readFile(new URL('../templates/.claude/settings.json', import.meta.url), 'utf8'));
  for (const event of ['PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PermissionDenied']) {
    const observer = settings.hooks[event].find(group => group.matcher === '*');
    assert.ok(observer, `${event} must match all tools`);
    assert.equal(observer.hooks[0].command, 'node "${CLAUDE_PROJECT_DIR}/.claude/hooks/observe-tools.mjs"');
  }
  assert.ok(settings.hooks.PreToolUse.some(group => group.matcher === 'Edit|Write'), 'protect-files hook must remain');
  assert.ok(settings.hooks.PreToolUse.some(group => group.matcher === 'Bash'), 'Bash guard hooks must remain');
  assert.ok(settings.hooks.PostToolUse.some(group => group.matcher === 'Edit|Write'), 'auto-format hook must remain');
  assert.ok(settings.hooks.SessionStart[0].hooks.some(hook => hook.command.includes('observe-tools.mjs')));
});

function payload(event) {
  return {
    hook_event_name: event,
    session_id: 'session-private-123',
    tool_use_id: 'call-private-456',
    tool_name: 'mcp__private-service__send_secret',
    transcript_path: ABSOLUTE_PATH,
    cwd: ABSOLUTE_PATH,
    tool_input: { prompt: PROMPT, token: TOKEN, file_path: ABSOLUTE_PATH },
    tool_response: { stdout: TOKEN, stderr: PROMPT, content: ABSOLUTE_PATH },
    error: TOKEN,
    duration_ms: 42,
  };
}

test('observeToolEvent: all tool event records are allowlisted and redact raw payloads', async () => {
  const dir = await fixture();
  try {
    const now = new Date('2026-07-30T05:18:09.402Z');
    for (const event of ['PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PermissionDenied']) {
      const result = await observeToolEvent(payload(event), { projectDir: dir, now });
      assert.equal(result.written, true);
    }

    const files = await logFiles(dir);
    assert.equal(files.length, 1);
    const output = await readFile(files[0], 'utf8');
    for (const secret of [TOKEN, ABSOLUTE_PATH, PROMPT, 'private-service', 'session-private-123', 'call-private-456', 'secret-person', 'private-task', 'tool_input', 'tool_response']) {
      assert.doesNotMatch(output, new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }

    const records = output.trim().split('\n').map(JSON.parse);
    assert.deepEqual(records.map(r => r.phase), ['started', 'succeeded', 'failed', 'denied']);
    assert.ok(records.every(r => r.tool_category === 'mcp' && r.v === OBSERVABILITY_VERSION));
    assert.ok(records.every(r => /^[a-f0-9]{32}$/.test(r.session_ref) && /^[a-f0-9]{32}$/.test(r.task_ref)));
    assert.ok(records.every(r => Object.keys(r).every(key => !['cwd', 'transcript_path', 'tool_input', 'tool_response'].includes(key))));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('observeToolEvent: extracts numeric usage only, never model text or output content', async () => {
  const dir = await fixture();
  try {
    const source = payload('PostToolUse');
    source.tool_response = {
      usage: { input_tokens: 12, output_tokens: 4, ignored: TOKEN },
      content: PROMPT,
      resolvedModel: 'private-model-name',
    };
    const result = await observeToolEvent(source, { projectDir: dir, now: new Date('2026-07-30T00:00:00.000Z') });
    assert.deepEqual(result.record.usage, { input_tokens: 12, output_tokens: 4 });
    assert.equal(result.record.signals.usage_present, true);
    const output = await readFile(result.file, 'utf8');
    assert.doesNotMatch(output, /private-model-name|private prompt|sk-test/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('observeToolEvent: exact 1 MiB payloads are not marked as capped', async () => {
  const dir = await fixture();
  try {
    const toolInput = { content: 'a'.repeat(MAX_CAPTURED_BYTES - Buffer.byteLength(JSON.stringify({ content: '' }), 'utf8')) };
    assert.equal(Buffer.byteLength(JSON.stringify(toolInput), 'utf8'), MAX_CAPTURED_BYTES);

    const result = await observeToolEvent({ ...payload('PostToolUse'), tool_input: toolInput }, { projectDir: dir });
    assert.equal(result.record.input_bytes, MAX_CAPTURED_BYTES);
    assert.equal(result.record.input_bytes_capped, false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('observeToolEvent: oversized payloads are capped without recording their full size', async () => {
  const dir = await fixture();
  try {
    const toolResponse = { content: 'a'.repeat(MAX_CAPTURED_BYTES) };
    assert.ok(Buffer.byteLength(JSON.stringify(toolResponse), 'utf8') > MAX_CAPTURED_BYTES);

    const result = await observeToolEvent({ ...payload('PostToolUse'), tool_response: toolResponse }, { projectDir: dir });
    assert.equal(result.record.response_bytes, MAX_CAPTURED_BYTES);
    assert.equal(result.record.response_bytes_capped, true);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('observeToolEvent: rotates files, creates private paths, and cleans only expired UTC day directories at SessionStart', async () => {
  const dir = await fixture();
  try {
    const now = new Date('2026-07-30T00:00:00.000Z');
    const first = await observeToolEvent(payload('PostToolUse'), { projectDir: dir, now, maxLogFileBytes: 1 });
    const second = await observeToolEvent(payload('PostToolUse'), { projectDir: dir, now, maxLogFileBytes: 1 });
    assert.notEqual(first.file, second.file, 'a full file must rotate to the next suffix');

    const base = join(dir, '.harness', 'observability', `v${OBSERVABILITY_VERSION}`);
    const expiredDay = join(base, '2026-07-15');
    const retainedDay = join(base, '2026-07-16');
    await mkdir(expiredDay, { recursive: true });
    await mkdir(retainedDay, { recursive: true });
    await writeFile(join(expiredDay, 'old.jsonl'), '{}\n');
    await writeFile(join(retainedDay, 'boundary.jsonl'), '{}\n');
    await observeToolEvent({ hook_event_name: 'SessionStart' }, { projectDir: dir, now });
    await assert.rejects(stat(expiredDay));
    await stat(retainedDay);

    if (process.platform !== 'win32') {
      for (const path of [base, join(base, '.key'), first.file, second.file]) {
        assert.equal((await stat(path)).mode & 0o077, 0, `${path} must not grant group/world access`);
      }
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('observeToolEvent: malformed or incomplete payload fails closed without creating a log record', async () => {
  const dir = await fixture();
  try {
    const result = await observeToolEvent({ hook_event_name: 'PostToolUse', session_id: 'only-session' }, { projectDir: dir });
    assert.deepEqual(result, { written: false, reason: 'unsupported-event' });
    const base = join(dir, '.harness', 'observability', `v${OBSERVABILITY_VERSION}`);
    assert.deepEqual((await readdir(base)).filter(name => name.endsWith('.jsonl')), []);
    assert.equal(RETENTION_DAYS, 14);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

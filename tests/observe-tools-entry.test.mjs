// The observability hook only runs `runObserver()` when it is the entry module. That
// gate compared `resolve(process.argv[1])` with `new URL(import.meta.url).pathname`,
// and `pathname` is percent-encoded — so from any path containing a space or a
// non-ASCII character ("Mobile Documents", a Korean folder name) the two never matched
// and the hook exited 0 having logged nothing. tests/observability-hook.test.mjs imports
// `observeToolEvent` directly and never crossed this gate, which is why it stayed green.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = join(ROOT, 'templates', '.claude', 'hooks', 'observe-tools.mjs');

function runHook(script, cwd, payload) {
  return new Promise((res, rej) => {
    // Claude Code sets CLAUDE_PROJECT_DIR for every hook; the observer reads its base from it.
    const child = spawn(process.execPath, [script], { cwd, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, CLAUDE_PROJECT_DIR: cwd } });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('error', rej);
    child.on('close', code => res({ code, stdout, stderr }));
    child.stdin.end(JSON.stringify(payload));
  });
}

async function logFiles(dir) {
  const base = join(dir, '.harness', 'observability');
  const out = [];
  async function walk(d) {
    for (const e of await readdir(d, { withFileTypes: true }).catch(() => [])) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name.endsWith('.jsonl')) out.push(p);
    }
  }
  await walk(base);
  return out;
}

for (const label of ['with space', '한글 경로']) {
  test(`entry gate: hook spawned from a path "${label}" records the event`, async () => {
    const project = await mkdtemp(join(tmpdir(), `harness obs ${label} `));
    try {
      const hooksDir = join(project, '.claude', 'hooks');
      await mkdir(hooksDir, { recursive: true });
      await mkdir(join(project, '.harness'), { recursive: true });
      await writeFile(join(project, '.harness', 'active.json'), JSON.stringify({ user: 'u', task: 't' }));
      const script = join(hooksDir, 'observe-tools.mjs');
      await copyFile(TEMPLATE, script);
      assert.ok(/[\sㄱ-힝]/.test(script), 'fixture path must contain a space or non-ASCII character');

      const r = await runHook(script, project, {
        hook_event_name: 'PostToolUse', session_id: 's1', tool_use_id: 'c1', tool_name: 'Read',
        tool_input: { file_path: 'x' }, tool_response: { content: 'y' }, duration_ms: 1,
      });
      assert.equal(r.code, 0, r.stderr);
      assert.doesNotMatch(r.stderr, /logging skipped/, 'the observer must run and succeed, not bail');
      const files = await logFiles(project);
      assert.ok(files.length > 0, 'a .jsonl record must be written under .harness/observability');
    } finally { await rm(project, { recursive: true, force: true }); }
  });
}

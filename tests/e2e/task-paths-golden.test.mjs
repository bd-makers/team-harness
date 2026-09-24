// Characterization — the byte-level shape of a task's files and the CLI's stdout across one lifecycle.
//
// Written BEFORE `src/task-paths.mjs` took over path assembly, and green on the code it replaced. It pins
// what the unit suites leave loose: `list` stdout, and the bytes `task` writes to `active.json` and
// `<task>-meta.json`. A refactor that moves a separator or a key order fails here even when every
// field-level assertion elsewhere still passes. Clock and sha noise is normalized; nothing else is.
//
// `list` prints in readdir order, which is the filesystem's (sorted on APFS, hash order on ext4 CI). The snapshot
// therefore stores `list` lines sorted, and the order itself is asserted separately against readdir — that is the
// pre-refactor contract (the scanners never sorted).
//
// Regenerate only for an intentional output change: GOLDEN_UPDATE=1 node --test tests/e2e/task-paths-golden.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm, mkdir, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, dirname } from 'node:path';
import { run, BIN, ROOT } from './sandbox.mjs';

const EXPECTED = join(ROOT, 'tests', 'fixtures', 'task-paths-golden', 'expected.txt');

function normalize(text, dir, realDir) {
  return text
    .split(realDir).join('<DIR>')
    .split(dir).join('<DIR>')
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g, '<ISO>')
    .replace(/\d{4}-\d{2}-\d{2}/g, '<DATE>')
    .replace(/\b[0-9a-f]{7,40}\b/g, '<SHA>');
}

async function listFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await listFiles(p));
    else out.push(p);
  }
  return out;
}

test('golden: task 경로·파일 바이트·stdout 이 한 생애주기 동안 고정돼 있다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-golden-'));
  const transcript = [];
  const cli = async (label, args) => {
    const r = await run(process.execPath, [BIN, ...args, '--target', dir, '--member', 'tester'], { cwd: dir });
    const out = r.stdout.trimEnd();
    transcript.push(`$ ${label} (exit ${r.code})`, args[0] === 'list' ? out.split('\n').sort().join('\n') : out, '');
    return r;
  };
  const git = (args) => run('git', ['-C', dir, ...args]);
  try {
    await git(['init', '-q', '-b', 'main']);
    await git(['config', 'user.email', 'tester@example.com']);
    await git(['config', 'user.name', 'tester']);

    await cli('task demo', ['task', 'demo']);
    await cli('task other --json', ['task', 'other', '--json']);
    await cli('task demo', ['task', 'demo']);
    // Non-task directories every scanner must skip: no `<name>-spec.md` marker.
    await mkdir(join(dir, 'docs/superpowers/plans'), { recursive: true });
    await writeFile(join(dir, 'docs/superpowers/plans/p.md'), '# p\n');
    await mkdir(join(dir, 'docs/tester/notes'), { recursive: true });
    await writeFile(join(dir, 'docs/tester/notes/n.md'), '# n\n');
    const listed = await cli('list', ['list']);
    const readdirOrder = [];
    for (const u of (await readdir(join(dir, 'docs'), { withFileTypes: true })).filter(e => e.isDirectory())) {
      for (const t of (await readdir(join(dir, 'docs', u.name), { withFileTypes: true })).filter(e => e.isDirectory())) {
        try { await readFile(join(dir, 'docs', u.name, t.name, `${t.name}-spec.md`)); readdirOrder.push(`${u.name}/${t.name}`); } catch { /* not a task */ }
      }
    }
    assert.deepEqual(listed.stdout.trimEnd().split('\n').map(l => l.slice(2)), readdirOrder, 'list 는 readdir 순서를 따른다');
    await cli('retro', ['retro', 'golden learning']);
    await cli('context check', ['context', 'check']);
    await cli('boundary check', ['boundary', 'check']);
    await cli('done (blocked: open plan box)', ['done']);

    const planPath = join(dir, 'docs/tester/demo/demo-plan.md');
    await writeFile(planPath, (await readFile(planPath, 'utf8')).replace('- [ ]', '- [x] step one'));
    await git(['add', '-A']);
    await git(['commit', '-q', '-m', 'feat: golden step']);
    await cli('handoff', ['handoff']);
    await cli('session-context', ['session-context']);
    await cli('done', ['done']);
    await cli('done --force', ['done', '--force']);
    await cli('summary', ['summary']);
    await cli('list', ['list']);
    await cli('session-context (no active: resume candidates)', ['session-context']);

    const files = [join(dir, '.harness', 'active.json'), ...(await listFiles(join(dir, 'docs'))).sort()];
    for (const f of files) {
      transcript.push(`=== ${relative(dir, f)}`, await readFile(f, 'utf8'), '');
    }
    const actual = normalize(transcript.join('\n'), dir, await realpath(dir));

    if (process.env.GOLDEN_UPDATE) {
      await mkdir(dirname(EXPECTED), { recursive: true });
      await writeFile(EXPECTED, actual);
    }
    assert.equal(actual, await readFile(EXPECTED, 'utf8'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildSessionContext } from '../src/commands/session-context.mjs';
import { CONTEXT_MAX_BYTES } from '../src/commands/context.mjs';
import { taskContextTemplate } from '../src/commands/task.mjs';

async function baseDir() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-sctx-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  return dir;
}
async function writeActive(dir, val) {
  await writeFile(join(dir, '.harness/active.json'), JSON.stringify(val));
}
async function writeTask(dir, user, name, plan) {
  const td = join(dir, 'docs', user, name);
  await mkdir(td, { recursive: true });
  await writeFile(join(td, `${name}-spec.md`), `# ${name} — Spec\n`);
  await writeFile(join(td, `${name}-plan.md`), plan);
}
async function writeCard(dir, user, name, content = taskContextTemplate(name)) {
  const td = join(dir, 'docs', user, name);
  await mkdir(td, { recursive: true });
  await writeFile(join(td, `${name}-context.md`), content);
}

test('활성 task + valid card → breadcrumb 다음에 card 전체만 주입', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, { user: 'chad', task: 'demo', path: 'docs/chad/demo' });
    const card = taskContextTemplate('demo');
    await writeCard(dir, 'chad', 'demo', card);
    const out = await buildSessionContext(dir);
    assert.equal(out, `[harness] 활성 task: chad/demo — 세션 시작 프로토콜대로 demo-plan.md 확인.\n${card}`);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('활성 task + missing card → breadcrumb와 context init 안내만 출력', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, { user: 'chad', task: 'demo', path: 'docs/chad/demo' });
    const out = await buildSessionContext(dir);
    assert.match(out, /활성 task: chad\/demo/);
    assert.match(out, /harness-team context init/);
    assert.doesNotMatch(out, /## Now/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('활성 task + over-budget card → 원문을 자르거나 주입하지 않고 check 안내', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, { user: 'chad', task: 'demo', path: 'docs/chad/demo' });
    const marker = 'DO_NOT_INJECT_OVER_BUDGET';
    const card = `${taskContextTemplate('demo')}\n${marker.repeat(CONTEXT_MAX_BYTES)}\n`;
    await writeCard(dir, 'chad', 'demo', card);
    const out = await buildSessionContext(dir);
    assert.match(out, /failure: size/);
    assert.match(out, /harness-team context check/);
    assert.doesNotMatch(out, new RegExp(marker));
    assert.doesNotMatch(out, /## Now/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('활성 task + malformed card → 원문을 주입하지 않고 check 안내', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, { user: 'chad', task: 'demo', path: 'docs/chad/demo' });
    const marker = 'MALFORMED_CARD_BODY';
    await writeCard(dir, 'chad', 'demo', `# demo — Context Card\n${marker}\n`);
    const out = await buildSessionContext(dir);
    assert.match(out, /failure: required-headings/);
    assert.match(out, /harness-team context check/);
    assert.doesNotMatch(out, new RegExp(marker));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('활성 task 없음 + 미완 task → nudge에 재개 후보로 나열', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, null);
    await writeTask(dir, 'chad', 'wip', '# wip — Plan\n- [ ] 미완\n');
    const out = await buildSessionContext(dir);
    assert.ok(out.includes('활성 task가 없습니다'), 'emits nudge');
    assert.ok(out.includes('재개: chad/wip'), 'lists incomplete task');
    assert.ok(out.includes('새 task 생성'), 'offers new task');
    assert.ok(out.includes('task 없이 진행'), 'offers escape hatch');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('활성 task 없음 + docs 없음 → 재개 줄 없이 새 task만', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, null);
    const out = await buildSessionContext(dir);
    assert.ok(out.includes('활성 task가 없습니다'), 'emits nudge');
    assert.ok(!out.includes('재개:'), 'no resume line when zero tasks');
    assert.ok(out.includes('새 task 생성'), 'still offers new task');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('done task(plan 전부 [x])는 재개 후보에서 제외', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, null);
    await writeTask(dir, 'chad', 'donetask', '# done — Plan\n- [x] 완료\n');
    const out = await buildSessionContext(dir);
    assert.ok(!out.includes('재개: chad/donetask'), 'completed task not resumable');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('인라인 산문의 `- [ ]`는 미완으로 오탐하지 않음', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, null);
    await writeTask(dir, 'chad', 'prose', '# prose — Plan\n- [x] 가드는 인라인 `- [ ]` 를 오탐 금지\n');
    const out = await buildSessionContext(dir);
    assert.ok(!out.includes('재개: chad/prose'), 'prose `- [ ]` is not an open box');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

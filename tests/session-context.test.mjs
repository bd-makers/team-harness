import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, utimes } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildSessionContext, SESSION_CONTEXT_MAX_TASKS } from '../src/commands/session-context.mjs';
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
async function writeMeta(dir, user, name, meta) {
  const td = join(dir, 'docs', user, name);
  await mkdir(td, { recursive: true });
  await writeFile(join(td, `${name}-meta.json`), JSON.stringify(meta, null, 2) + '\n');
}
async function setPlanMtime(dir, user, name, date) {
  const planPath = join(dir, 'docs', user, name, `${name}-plan.md`);
  await utimes(planPath, date, date);
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
    assert.match(out, /^next-action: harness-team context init$/m);
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
    assert.match(out, /활성 task: chad\/demo — 세션 시작 프로토콜대로 demo-plan\.md 확인\./);
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
    assert.match(out, /활성 task: chad\/demo — 세션 시작 프로토콜대로 demo-plan\.md 확인\./);
    assert.match(out, /failure: required-headings/);
    assert.match(out, /harness-team context check/);
    assert.doesNotMatch(out, new RegExp(marker));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('활성 task + 읽을 수 없는 card → breadcrumb는 유지하고 check 안내', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, { user: 'chad', task: 'demo', path: 'docs/chad/demo' });
    await mkdir(join(dir, 'docs', 'chad', 'demo', 'demo-context.md'), { recursive: true });
    const out = await buildSessionContext(dir);
    assert.match(out, /활성 task: chad\/demo — 세션 시작 프로토콜대로 demo-plan\.md 확인\./);
    assert.match(out, /^next-action: harness-team context check$/m);
    assert.doesNotMatch(out, /## Now/);
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

// 후보 판정의 정본은 meta.status다. 열린 체크박스만 보면 `done --force`로 닫았거나
// 다이어그램 옵트인 규약대로 미실행 단계를 열어 둔 채 닫은 task가 영구히 재개 후보로 뜬다.
test('완료된 task는 열린 체크박스가 남아 있어도 재개 후보에서 제외', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, null);
    await writeTask(dir, 'chad', 'forced', '# forced — Plan\n- [ ] 미실행(도구 없음)\n');
    await writeMeta(dir, 'chad', 'forced', {
      user: 'chad', task: 'forced', created: '2026-09-01',
      status: 'done', closedAt: '2026-09-02T00:00:00.000Z',
    });
    const out = await buildSessionContext(dir);
    assert.ok(!out.includes('재개: chad/forced'), '완료 상태가 후보 판정의 정본이어야 한다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 하위 호환: meta.json이 없는 구 task는 완료 여부를 알 수 없다 → 제외하지 않는다(현행 유지).
test('meta.json이 없는 구 task는 열린 체크박스만으로 재개 후보가 된다', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, null);
    await writeTask(dir, 'chad', 'legacy', '# legacy — Plan\n- [ ] 미완\n');
    const out = await buildSessionContext(dir);
    assert.ok(out.includes('재개: chad/legacy'), 'meta 없는 task를 잘라내면 안 된다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 만료된 완료(reopen)는 다시 후보가 된다 — status가 open으로 돌아갔기 때문이다.
test('만료된 완료(status open + reopenedAt)는 다시 재개 후보가 된다', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, null);
    await writeTask(dir, 'chad', 'revived', '# revived — Plan\n- [ ] 남은 일\n');
    await writeMeta(dir, 'chad', 'revived', {
      user: 'chad', task: 'revived', created: '2026-09-01',
      status: 'open', closedAt: null, reopenedAt: '2026-09-05T00:00:00.000Z',
    });
    const out = await buildSessionContext(dir);
    assert.ok(out.includes('재개: chad/revived'), '만료된 완료는 다시 열린 task다');
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

test('미완 task가 상한 초과 → 최신 plan mtime 순으로 8개만, 뒤에 외 N개 요약', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, null);
    const base = new Date('2026-01-01T00:00:00Z').getTime();
    const total = 10;
    for (let i = 0; i < total; i++) {
      const name = `t${String(i).padStart(2, '0')}`;
      await writeTask(dir, 'chad', name, `# ${name} — Plan\n- [ ] 미완\n`);
      // i가 클수록 최신(mtime이 큼) — task09가 가장 최근 활동.
      await setPlanMtime(dir, 'chad', name, new Date(base + i * 60_000));
    }
    const out = await buildSessionContext(dir);
    const resumeLines = out.split('\n').filter(l => l.includes('재개:'));
    assert.equal(resumeLines.length, SESSION_CONTEXT_MAX_TASKS, `상한(${SESSION_CONTEXT_MAX_TASKS}개)까지만 나열`);

    const expectedOrder = [];
    for (let i = total - 1; i >= total - SESSION_CONTEXT_MAX_TASKS; i--) expectedOrder.push(`t${String(i).padStart(2, '0')}`);
    const actualOrder = resumeLines.map(l => l.match(/재개: chad\/(t\d\d)/)[1]);
    assert.deepEqual(actualOrder, expectedOrder, 'plan.md mtime 내림차순(최신 먼저)');

    const omitted = total - SESSION_CONTEXT_MAX_TASKS;
    assert.ok(out.includes(`  · … 외 ${omitted}개 (harness-team list로 전체 확인)`), '생략된 개수를 요약 줄로 안내');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('미완 task가 상한 이하 → 외 N개 요약 없이 전부 나열(동작 불변)', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, null);
    const base = new Date('2026-01-01T00:00:00Z').getTime();
    for (let i = 0; i < SESSION_CONTEXT_MAX_TASKS; i++) {
      const name = `t${String(i).padStart(2, '0')}`;
      await writeTask(dir, 'chad', name, `# ${name} — Plan\n- [ ] 미완\n`);
      await setPlanMtime(dir, 'chad', name, new Date(base + i * 60_000));
    }
    const out = await buildSessionContext(dir);
    const resumeLines = out.split('\n').filter(l => l.includes('재개:'));
    assert.equal(resumeLines.length, SESSION_CONTEXT_MAX_TASKS, '상한과 같은 개수는 전부 나열');
    assert.doesNotMatch(out, /외 \d+개/, '상한 이하면 요약 줄이 없음');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('plan mtime 동률 → task명 오름차순으로 tie-break', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, null);
    const same = new Date('2026-01-01T00:00:00Z');
    await writeTask(dir, 'chad', 'bravo', '# bravo — Plan\n- [ ] 미완\n');
    await writeTask(dir, 'chad', 'alpha', '# alpha — Plan\n- [ ] 미완\n');
    await setPlanMtime(dir, 'chad', 'bravo', same);
    await setPlanMtime(dir, 'chad', 'alpha', same);
    const out = await buildSessionContext(dir);
    const order = out.split('\n').filter(l => l.includes('재개:')).map(l => l.match(/재개: chad\/(\w+)/)[1]);
    assert.deepEqual(order, ['alpha', 'bravo'], 'mtime 동률이면 task명 오름차순');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('plan mtime·task명 동률 → user 오름차순으로 tie-break (열거 순서 비의존)', async () => {
  const dir = await baseDir();
  try {
    await writeActive(dir, null);
    const same = new Date('2026-01-01T00:00:00Z');
    // 서로 다른 user의 같은 task명 + 같은 mtime — readdir 열거 순서와 무관하게 user 순이어야 한다.
    await writeTask(dir, 'zoe', 'same-name', '# same-name — Plan\n- [ ] 미완\n');
    await writeTask(dir, 'amy', 'same-name', '# same-name — Plan\n- [ ] 미완\n');
    await setPlanMtime(dir, 'zoe', 'same-name', same);
    await setPlanMtime(dir, 'amy', 'same-name', same);
    const out = await buildSessionContext(dir);
    const order = out.split('\n').filter(l => l.includes('재개:')).map(l => l.match(/재개: (\w+)\/same-name/)[1]);
    assert.deepEqual(order, ['amy', 'zoe'], 'mtime·task명 동률이면 user 오름차순');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

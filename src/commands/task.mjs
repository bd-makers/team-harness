import { join, relative } from 'node:path';
import { readdir, readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { detectMember } from '../member.mjs';
import { exists, writeText } from '../fsx.mjs';

const pexec = promisify(execFile);

async function readConfig(targetDir) {
  const p = join(targetDir, '.harness/config.json');
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return {}; }
}

async function readActive(targetDir) {
  const p = join(targetDir, '.harness/active.json');
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return null; }
}

async function writeActive(targetDir, data) {
  const p = join(targetDir, '.harness/active.json');
  await mkdir(join(targetDir, '.harness'), { recursive: true });
  await writeFile(p, JSON.stringify(data, null, 2) + '\n');
}

async function resolveUser(targetDir, flags) {
  const cfg = await readConfig(targetDir);
  return cfg.user || await detectMember(targetDir, flags);
}

function taskDir(targetDir, user, name) {
  return join(targetDir, 'docs', user, name);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function taskSpecTemplate(name) {
  return `# ${name} — Spec

## 목적 / 요구사항


## 설계 / 접근


## 참고
-
`;
}

function taskPlanTemplate(name) {
  return `# ${name} — Plan

## 목표


## 단계
- [ ]

## 참고
-
`;
}

function taskHandoffTemplate(name) {
  return `# ${name} — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)
`;
}

function userTaskIndexTemplate(user) {
  return `# ${user} — Tasks

## Active

## Completed
`;
}

function taskSummaryTemplate() {
  return `# Task Summary

| User | Task | Status | Created |
|------|------|--------|---------|
`;
}

async function ensureUserTaskIndex(targetDir, user) {
  const p = join(targetDir, 'docs', user, `${user}-task.md`);
  if (!(await exists(p))) {
    await mkdir(join(targetDir, 'docs', user), { recursive: true });
    await writeFile(p, userTaskIndexTemplate(user));
  }
  return p;
}

async function ensureTaskSummary(targetDir) {
  const p = join(targetDir, 'docs', 'task_summary.md');
  if (!(await exists(p))) {
    await mkdir(join(targetDir, 'docs'), { recursive: true });
    await writeFile(p, taskSummaryTemplate());
  }
  return p;
}

async function addToUserTaskIndex(indexPath, user, name, date) {
  let content = await readFile(indexPath, 'utf8');
  if (content.includes(`- ${name}`)) return;
  content = content.replace('## Active\n', `## Active\n- ${name} (created ${date})\n`);
  await writeFile(indexPath, content);
}

async function addToTaskSummary(summaryPath, user, name, date) {
  let content = await readFile(summaryPath, 'utf8');
  if (content.includes(`| ${user} | ${name} |`)) return;
  content = content.trimEnd() + `\n| ${user} | ${name} | 🔄 active | ${date} |\n`;
  await writeFile(summaryPath, content);
}

async function markDoneInUserTaskIndex(indexPath, name) {
  let content = await readFile(indexPath, 'utf8');
  const activeEntry = `- ${name}`;
  if (!content.includes(activeEntry)) return;
  content = content.replace(`${activeEntry} (created `, `~~${activeEntry}~~ (created `);
  content = content.replace('## Completed\n', `## Completed\n- ✅ ${name}\n`);
  const lines = content.split('\n');
  const filtered = lines.filter(l => !l.startsWith(`- ${name} (`) && !l.startsWith(`~~- ${name}~~`));
  await writeFile(indexPath, filtered.join('\n'));
}

async function markDoneInTaskSummary(summaryPath, user, name) {
  let content = await readFile(summaryPath, 'utf8');
  content = content.replace(
    new RegExp(`\\| ${user} \\| ${name} \\| 🔄 active \\|`),
    `| ${user} | ${name} | ✅ done |`
  );
  await writeFile(summaryPath, content);
}

export async function runTask(ctx) {
  const name = (ctx.taskArgs || [])[0];
  if (!name || !/^[\w.-]+$/.test(name)) {
    console.log(`usage: harness-team task <name>`);
    return;
  }

  const user = await resolveUser(ctx.targetDir, ctx.flags);
  const dir = taskDir(ctx.targetDir, user, name);
  const date = today();

  if (await exists(dir)) {
    await writeActive(ctx.targetDir, {
      user, task: name,
      path: `docs/${user}/${name}`,
      switchedAt: new Date().toISOString(),
    });
    console.log(`activated: ${user}/${name}`);
    return;
  }

  await mkdir(dir, { recursive: true });
  await writeText(join(dir, `${name}-spec.md`), taskSpecTemplate(name));
  await writeText(join(dir, `${name}-plan.md`), taskPlanTemplate(name));
  await writeText(join(dir, `${name}-handoff.md`), taskHandoffTemplate(name));

  await writeActive(ctx.targetDir, {
    user, task: name,
    path: `docs/${user}/${name}`,
    switchedAt: new Date().toISOString(),
  });

  const indexPath = await ensureUserTaskIndex(ctx.targetDir, user);
  await addToUserTaskIndex(indexPath, user, name, date);

  const summaryPath = await ensureTaskSummary(ctx.targetDir);
  await addToTaskSummary(summaryPath, user, name, date);

  console.log(`created: docs/${user}/${name}/`);
  console.log(`active: ${user}/${name}`);
}

export async function runList(ctx) {
  const docs = join(ctx.targetDir, 'docs');
  if (!(await exists(docs))) { console.log('(no docs/)'); return; }

  const active = await readActive(ctx.targetDir);
  const entries = await readdir(docs, { withFileTypes: true });
  const userDirs = entries.filter(e => e.isDirectory()).map(e => e.name);

  let found = false;
  for (const user of userDirs) {
    const userPath = join(docs, user);
    const userEntries = await readdir(userPath, { withFileTypes: true });
    const taskDirs = userEntries.filter(e => e.isDirectory()).map(e => e.name);
    for (const task of taskDirs) {
      const isActive = active && active.user === user && active.task === task;
      console.log(`${isActive ? '*' : ' '} ${user}/${task}`);
      found = true;
    }
  }
  if (!found) console.log('(no tasks)');
}

export async function runDone(ctx) {
  const active = await readActive(ctx.targetDir);
  if (!active || !active.task) { console.log('no active task'); return; }

  const { user, task } = active;
  const handoffPath = join(ctx.targetDir, 'docs', user, task, `${task}-handoff.md`);
  const ts = new Date().toISOString();

  await appendFile(handoffPath, `\n## ${ts} — 완료\n\n태스크 종료.\n`);

  const indexPath = join(ctx.targetDir, 'docs', user, `${user}-task.md`);
  if (await exists(indexPath)) {
    let content = await readFile(indexPath, 'utf8');
    const line = content.split('\n').find(l => l.includes(`- ${task}`));
    if (line) {
      content = content.replace(line, '');
      content = content.replace('## Completed\n', `## Completed\n- ✅ ${task}\n`);
      await writeFile(indexPath, content);
    }
  }

  const summaryPath = join(ctx.targetDir, 'docs', 'task_summary.md');
  if (await exists(summaryPath)) {
    await markDoneInTaskSummary(summaryPath, user, task);
  }

  await writeActive(ctx.targetDir, {});
  console.log(`done: ${user}/${task}`);
  console.log(`handoff updated: docs/${user}/${task}/${task}-handoff.md`);
}

export async function runHandoffAuto(ctx) {
  const active = await readActive(ctx.targetDir);
  if (!active || !active.task) return;

  const { user, task } = active;
  const ts = new Date().toISOString();

  let commitMsg = '';
  let diffStat = '';

  try {
    const { stdout } = await pexec('git', ['-C', ctx.targetDir, 'log', '-1', '--oneline'], { maxBuffer: 1024 * 1024 });
    commitMsg = stdout.trim();
  } catch { return; }

  try {
    const { stdout } = await pexec('git', ['-C', ctx.targetDir, 'diff', 'HEAD~1', '--stat'], { maxBuffer: 1024 * 1024 });
    diffStat = stdout.trim();
  } catch {}

  const taskHandoffPath = join(ctx.targetDir, 'docs', user, task, `${task}-handoff.md`);
  const taskEntry = `\n## ${ts} — ${commitMsg}\n${diffStat ? diffStat + '\n' : ''}\n`;
  await appendFile(taskHandoffPath, taskEntry);

  const userHandoffPath = join(ctx.targetDir, 'docs', user, `${user}-handoff.md`);
  const date = ts.slice(0, 10);
  const userHandoffContent = `# Session Handoff

## Active Task
${task}

## Last Commit (${date})
${commitMsg}

## Full Context
→ docs/${user}/${task}/${task}-handoff.md
`;
  await writeFile(userHandoffPath, userHandoffContent);

  try {
    const planPath = join(ctx.targetDir, 'docs', user, task, `${task}-plan.md`);
    const planContent = await readFile(planPath, 'utf8');
    const hasUnchecked = planContent.includes('- [ ]');
    const hasChecked = planContent.includes('- [x]');
    if (!hasUnchecked && hasChecked) {
      process.stdout.write('PLAN_COMPLETE\n');
    }
  } catch {}
}

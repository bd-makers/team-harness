import { join } from 'node:path';
import { readdir, readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { detectMember } from '../member.mjs';
import { exists, writeText } from '../fsx.mjs';

const pexec = promisify(execFile);

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

export function taskSpecTemplate(name) {
  return `# ${name} — Spec

## 목적 / 요구사항


## 설계 / 접근


## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **개념 A**:
- **개념 B**:

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [ ] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [ ] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [ ] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [ ] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [ ] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고
-
`;
}

export function taskPlanTemplate(name) {
  return `# ${name} — Plan

## 목표


## 단계
- [ ]

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
-
`;
}

function taskHandoffTemplate(name) {
  return `# ${name} — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)
`;
}

export function taskArtifactTemplate(name) {
  return `# ${name} — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과


## Learnings

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

async function addToUserTaskIndex(indexPath, name, date) {
  let content = await readFile(indexPath, 'utf8');
  if (content.split('\n').some(l => l === `- ${name}` || l.startsWith(`- ${name} (`))) return;
  content = content.replace('## Active\n', `## Active\n- ${name} (created ${date})\n`);
  await writeFile(indexPath, content);
}

async function addToTaskSummary(summaryPath, user, name, date) {
  let content = await readFile(summaryPath, 'utf8');
  if (content.includes(`| ${user} | ${name} |`)) return;
  content = content.trimEnd() + `\n| ${user} | ${name} | 🔄 active | ${date} |\n`;
  await writeFile(summaryPath, content);
}


async function markDoneInTaskSummary(summaryPath, user, name) {
  let content = await readFile(summaryPath, 'utf8');
  content = content.replace(
    new RegExp(`\\| ${escapeRegex(user)} \\| ${escapeRegex(name)} \\| 🔄 active \\|`),
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
  await writeText(join(dir, `${name}-artifact.md`), taskArtifactTemplate(name));

  await writeActive(ctx.targetDir, {
    user, task: name,
    path: `docs/${user}/${name}`,
    switchedAt: new Date().toISOString(),
  });

  const indexPath = await ensureUserTaskIndex(ctx.targetDir, user);
  await addToUserTaskIndex(indexPath, name, date);

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
    const line = content.split('\n').find(l => l === `- ${task}` || l.startsWith(`- ${task} (`) || l.startsWith(`- ✅ ${task}`));
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

  await writeActive(ctx.targetDir, null);
  console.log(`done: ${user}/${task}`);
  console.log(`handoff updated: docs/${user}/${task}/${task}-handoff.md`);
}

export async function runRetro(ctx) {
  const active = await readActive(ctx.targetDir);
  if (!active || !active.task) {
    process.exitCode = 1;
    console.log(`✗ retro: 활성 task 없음`);
    console.log(`cause: .harness/active.json 에 활성 task가 없어 append 대상 artifact.md를 찾을 수 없음`);
    console.log(`retry: \`harness-team task <name>\` 로 task를 활성화한 뒤 다시 실행`);
    console.log(`stop: task가 하나도 없으면 먼저 task를 생성하라`);
    return;
  }

  const { user, task } = active;
  const artifactPath = join(ctx.targetDir, 'docs', user, task, `${task}-artifact.md`);

  if (!(await exists(artifactPath))) {
    await writeText(artifactPath, taskArtifactTemplate(task));
  }

  const date = today();
  const text = (ctx.taskArgs || []).join(' ');
  const section = text
    ? `\n## Learnings (${date})\n\n- ${text}\n`
    : `\n## Learnings (${date})\n\n-\n`;

  await appendFile(artifactPath, section);

  const relPath = `docs/${user}/${task}/${task}-artifact.md`;
  console.log(`✓ retro: ${relPath} 에 ## Learnings (${date}) 추가`);
  console.log(`next: artifact.md를 열어 학습 내용을 채우거나, 추가 메모는 \`harness-team retro "<메모>"\` 재실행`);
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
  } catch { /* continue with empty commitMsg */ }

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

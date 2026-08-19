import { join } from 'node:path';
import { readdir, readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { detectMember } from '../member.mjs';
import { exists, writeText } from '../fsx.mjs';
import { buildEnvelope, emitObservation } from '../observation.mjs';
import { readTaskMeta, writeTaskMeta, taskMetaTemplate } from './summary.mjs';

const pexec = promisify(execFile);

// "미완"의 단일 정의 — done-guard와 session-task-gate가 공유.
// 줄 시작 체크박스만 매칭(인라인/산문 `- [ ]`는 미완 아님).
export function planHasOpenBoxes(content) {
  return /^\s*- \[ \]/m.test(content);
}

async function readConfig(targetDir) {
  const p = join(targetDir, '.harness/config.json');
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return {}; }
}

export async function readActive(targetDir) {
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

function printTaskNextActions(user, name, { activated = false } = {}) {
  const base = `docs/${user}/${name}/${name}`;
  if (activated) console.log(`next: 현재 단계는 ${base}-plan.md 에서 확인`);
  else console.log(`next: ${base}-spec.md 작성 (Ambiguity 자가진단 포함)`);
  console.log('next: /harness-interview → 구현 → 테스트 (/harness-unittest 계열) → 리뷰 → /harness-retro → done');
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


## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*


## Learnings

`;
}

export function taskContextTemplate(name) {
  return `# ${name} — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal:
- Current atomic step:
- Stop / human-decision condition:

## Constraints and settled decisions
-

## JIT retrieval map
- Identifiers / symbols:
- Narrow globs:
- Read next:
- Verification command:

## Failure capsules (max 3 unresolved)
### F-001
- Signal:
- Tried:
- Compact finding / current hypothesis:
- Next discriminator:
- Source (safe path or command):

## Resume checklist
-
`;
}

export async function runTask(ctx) {
  const json = !!(ctx.flags && ctx.flags.json);
  const name = (ctx.taskArgs || [])[0];
  if (!name || !/^[\w.-]+$/.test(name)) {
    process.exitCode = 1;
    const rootCause = name
      ? `task 이름 "${name}"에 허용되지 않는 문자가 있음 (허용: 영숫자·_·.·-)`
      : 'task 이름 인자가 없음';
    if (json) {
      emitObservation(buildEnvelope({
        command: 'task',
        status: 'error',
        summary: 'task 생성/활성화 실패: 잘못된 task 이름',
        error: {
          root_cause: rootCause,
          safe_retry: '`harness-team task <name>` 형식으로 영숫자·_·.·- 만 사용한 이름을 주고 재실행',
          stop_condition: '이름 규칙(^[\\w.-]+$)을 만족하지 못하면 생성하지 말 것',
        },
      }));
    } else {
      console.log(`✗ task: 잘못된 task 이름`);
      console.log(`cause: ${rootCause}`);
      console.log(`retry: \`harness-team task <name>\` 형식으로 유효한 이름을 주고 재실행`);
      console.log(`stop: 이름 규칙(^[\\w.-]+$) 위반 시 생성 금지`);
    }
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
    if (json) {
      emitObservation(buildEnvelope({
        command: 'task',
        status: 'success',
        summary: `activated: ${user}/${name}`,
        nextActions: [`docs/${user}/${name}/${name}-plan.md 의 현재 단계 확인`],
        artifacts: [`docs/${user}/${name}`],
      }));
    } else {
      console.log(`activated: ${user}/${name}`);
      printTaskNextActions(user, name, { activated: true });
    }
    return;
  }

  await mkdir(dir, { recursive: true });
  await writeText(join(dir, `${name}-spec.md`), taskSpecTemplate(name));
  await writeText(join(dir, `${name}-plan.md`), taskPlanTemplate(name));
  await writeText(join(dir, `${name}-handoff.md`), taskHandoffTemplate(name));
  await writeText(join(dir, `${name}-artifact.md`), taskArtifactTemplate(name));
  await writeText(join(dir, `${name}-context.md`), taskContextTemplate(name));

  await writeActive(ctx.targetDir, {
    user, task: name,
    path: `docs/${user}/${name}`,
    switchedAt: new Date().toISOString(),
  });

  // Per-task state only. The shared ledger (docs/task_summary.md and the user index)
  // is rendered by `harness-team summary`; writing it here is what made every parallel
  // branch collide on the same line.
  await writeText(join(dir, `${name}-meta.json`), taskMetaTemplate(user, name, date));

  if (json) {
    emitObservation(buildEnvelope({
      command: 'task',
      status: 'success',
      summary: `created: docs/${user}/${name}/`,
      nextActions: [`docs/${user}/${name}/${name}-spec.md 작성 (Ambiguity 자가진단 포함)`],
      artifacts: [
        `docs/${user}/${name}/${name}-spec.md`,
        `docs/${user}/${name}/${name}-plan.md`,
        `docs/${user}/${name}/${name}-handoff.md`,
        `docs/${user}/${name}/${name}-artifact.md`,
        `docs/${user}/${name}/${name}-context.md`,
        `docs/${user}/${name}/${name}-meta.json`,
      ],
    }));
  } else {
    console.log(`created: docs/${user}/${name}/`);
    console.log(`active: ${user}/${name}`);
    printTaskNextActions(user, name);
  }
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
      // Only list dirs carrying a task marker (<name>-spec.md); this skips non-task
      // dirs like docs/superpowers/{plans,specs} that are not user/task at all.
      if (!(await exists(join(userPath, task, `${task}-spec.md`)))) continue;
      const isActive = active && active.user === user && active.task === task;
      console.log(`${isActive ? '*' : ' '} ${user}/${task}`);
      found = true;
    }
  }
  if (!found) console.log('(no tasks)');
}

// Extract file paths from `git status --porcelain` output: strip the 2-char status +
// space prefix, resolve rename arrows (`old -> new` → new), and unquote core.quotepath
// paths. Used by the done-guard to tell real uncommitted work from hook-generated files.
export function parsePorcelainPaths(stdout) {
  return stdout.split('\n')
    .filter(l => l.length > 3)
    .map(l => {
      let p = l.slice(3);
      const arrow = p.indexOf(' -> ');
      if (arrow !== -1) p = p.slice(arrow + 4);
      if (p.startsWith('"') && p.endsWith('"')) p = p.slice(1, -1);
      return p;
    });
}

async function collectDoneIssues(targetDir, active) {
  const { user, task, switchedAt } = active;
  const issues = [];

  // plan.md: unchecked boxes remaining
  try {
    const planPath = join(targetDir, 'docs', user, task, `${task}-plan.md`);
    const planContent = await readFile(planPath, 'utf8');
    // Match only line-leading checkboxes, so inline/prose mentions of `- [ ]`
    // (e.g. text describing the guard itself) don't trigger a false positive.
    if (planHasOpenBoxes(planContent)) {
      issues.push('plan.md에 미완 체크박스(`- [ ]`)가 남아 있음');
    }
  } catch { /* no plan.md → not a positive signal, skip */ }

  // artifact.md: missing or still the untouched template
  const artifactPath = join(targetDir, 'docs', user, task, `${task}-artifact.md`);
  if (!(await exists(artifactPath))) {
    issues.push('artifact.md가 없음 (결과/학습 미기록)');
  } else {
    const artifactContent = await readFile(artifactPath, 'utf8');
    if (artifactContent.trim() === taskArtifactTemplate(task).trim()) {
      issues.push('artifact.md가 템플릿 그대로임 (내용 없음)');
    }
  }

  // git signals — degrade gracefully when this isn't a git repo (or git is absent):
  // skip the git checks entirely. Inside a real repo, an empty/HEAD-less log means
  // zero commits (which IS the problem we want to catch), not a reason to skip.
  let isGitRepo = false;
  try {
    await pexec('git', ['-C', targetDir, 'rev-parse', '--is-inside-work-tree'], { maxBuffer: 1024 * 1024 });
    isGitRepo = true;
  } catch { /* not a git repo / git absent → leave isGitRepo=false, skip all git checks */ }

  if (isGitRepo) {
    try {
      const { stdout } = await pexec('git', ['-C', targetDir, 'status', '--porcelain'], { maxBuffer: 1024 * 1024 });
      // The post-commit hook (`harness-team handoff`) regenerates these handoff files
      // after every commit, so they're ~always dirty at `done` time. Exclude them — the
      // guard should block on real uncommitted work, not the hook's own auto-output.
      const handoffRels = new Set([
        `docs/${user}/${task}/${task}-handoff.md`,
        `docs/${user}/${user}-handoff.md`,
      ]);
      const realDirty = parsePorcelainPaths(stdout).filter(p => !handoffRels.has(p));
      if (realDirty.length) issues.push('커밋되지 않은 변경이 있음');
    } catch { /* transient git error → don't fabricate a problem */ }

    if (switchedAt) {
      try {
        const { stdout } = await pexec('git', ['-C', targetDir, 'log', `--since=${switchedAt}`, '--oneline'], { maxBuffer: 1024 * 1024 });
        if (!stdout.trim()) issues.push('task 활성화 이후 커밋이 0개임');
      } catch {
        // HEAD-less repo (no commits at all) → git log throws → that IS zero commits.
        issues.push('task 활성화 이후 커밋이 0개임');
      }
    }
  }

  return issues;
}

export async function runDone(ctx) {
  const active = await readActive(ctx.targetDir);
  if (!active || !active.task) { console.log('no active task'); return; }

  const force = !!(ctx.flags && ctx.flags.force);
  const issues = await collectDoneIssues(ctx.targetDir, active);

  if (issues.length && !force) {
    process.exitCode = 1;
    console.log(`✗ done: 종결 가드에 걸림 (${issues.length}개)`);
    for (const i of issues) console.log(`cause: ${i}`);
    console.log(`retry: 위 항목을 해소한 뒤 다시 \`harness-team done\` 실행`);
    console.log(`stop: 의도적으로 무시하려면 \`harness-team done --force\``);
    return;
  }
  if (issues.length && force) {
    for (const i of issues) console.log(`⚠️ ${i}`);
    console.log(`(--force: 경고만 하고 진행)`);
  }

  const { user, task } = active;
  const handoffPath = join(ctx.targetDir, 'docs', user, task, `${task}-handoff.md`);
  const ts = new Date().toISOString();

  await appendFile(handoffPath, `\n## ${ts} — 완료\n\n태스크 종료.\n`);

  const meta = (await readTaskMeta(ctx.targetDir, user, task)) || { user, task, created: today() };
  await writeTaskMeta(ctx.targetDir, user, task, { ...meta, user, task, status: 'done', closedAt: ts });

  await writeActive(ctx.targetDir, null);
  console.log(`done: ${user}/${task}`);
  console.log(`handoff updated: docs/${user}/${task}/${task}-handoff.md`);
}

export async function runRetro(ctx) {
  const json = !!(ctx.flags && ctx.flags.json);
  const active = await readActive(ctx.targetDir);
  if (!active || !active.task) {
    process.exitCode = 1;
    if (json) {
      emitObservation(buildEnvelope({
        command: 'retro',
        status: 'error',
        summary: 'retro 실패: 활성 task 없음',
        error: {
          root_cause: '.harness/active.json 에 활성 task가 없어 append 대상 artifact.md를 찾을 수 없음',
          safe_retry: '`harness-team task <name>` 로 task를 활성화한 뒤 다시 실행',
          stop_condition: 'task가 하나도 없으면 먼저 task를 생성하라',
        },
      }));
    } else {
      console.log(`✗ retro: 활성 task 없음`);
      console.log(`cause: .harness/active.json 에 활성 task가 없어 append 대상 artifact.md를 찾을 수 없음`);
      console.log(`retry: \`harness-team task <name>\` 로 task를 활성화한 뒤 다시 실행`);
      console.log(`stop: task가 하나도 없으면 먼저 task를 생성하라`);
    }
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
  if (json) {
    emitObservation(buildEnvelope({
      command: 'retro',
      status: 'success',
      summary: `${relPath} 에 ## Learnings (${date}) 추가`,
      nextActions: ['artifact.md를 열어 학습 내용을 채우거나, 추가 메모는 `harness-team retro "<메모>"` 재실행'],
      artifacts: [relPath],
    }));
  } else {
    console.log(`✓ retro: ${relPath} 에 ## Learnings (${date}) 추가`);
    console.log(`next: artifact.md를 열어 학습 내용을 채우거나, 추가 메모는 \`harness-team retro "<메모>"\` 재실행`);
  }
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

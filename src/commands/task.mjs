import { join, relative } from 'node:path';
import { readdir, readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { detectMember } from '../member.mjs';
import { exists, writeText } from '../fsx.mjs';

const pexec = promisify(execFile);

const CATEGORIES = new Set(['feature', 'fix']);

const TEMPLATES = {
  'spec.md': ({ name, category }) => `# ${category}: ${name}

## 목적 / 요구사항


## 설계 / 접근


## 참고
-
`,
  'plan.md': () => `# Plan

## 목표


## 단계
- [ ]

## 참고
-
`,
  'handoff.md': () => `# Handoff

## 마지막 세션 요약


## 변경된 파일
-

## 검증 상태
- [ ] typecheck
- [ ] lint
- [ ] test

## 막힌 점 / 의사결정 필요


## 다음 단계
1.
`,
  'artifact.md': ({ name, category }) => `# Artifact: ${category}/${name}

완료 시 \`harness-team task done\` 실행 → 아래에 git log / diff / test 결과가 append됩니다.

## 수동 기록 (flow / sequence / test 설계 등)


## 자동 수집
`,
};

async function readActive(targetDir) {
  const p = join(targetDir, '.harness/active.json');
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return null; }
}

async function writeActive(targetDir, data) {
  const p = join(targetDir, '.harness/active.json');
  await mkdir(join(targetDir, '.harness'), { recursive: true });
  await writeFile(p, JSON.stringify(data, null, 2) + '\n');
}

function taskPath(targetDir, member, category, name) {
  return join(targetDir, 'docs', member, category, name);
}

async function createTask(ctx, category, name) {
  if (!CATEGORIES.has(category)) {
    throw new Error(`category must be one of: ${[...CATEGORIES].join(', ')}`);
  }
  if (!name || !/^[\w.-]+$/.test(name)) {
    throw new Error('name must be [word chars/dots/dashes], no spaces');
  }
  const member = await detectMember(ctx.targetDir, ctx.flags);
  const dir = taskPath(ctx.targetDir, member, category, name);
  if (await exists(dir)) {
    console.log(`task exists: ${relative(ctx.targetDir, dir)}`);
  } else {
    for (const [file, tpl] of Object.entries(TEMPLATES)) {
      await writeText(join(dir, file), tpl({ name, category, member }));
    }
    console.log(`created: ${relative(ctx.targetDir, dir)}/`);
  }
  await writeActive(ctx.targetDir, {
    member, category, name,
    path: relative(ctx.targetDir, dir),
    switchedAt: new Date().toISOString(),
  });
  console.log(`active: ${member}/${category}/${name}`);
}

async function listTasks(ctx) {
  const docs = join(ctx.targetDir, 'docs');
  if (!(await exists(docs))) { console.log('(no docs/)'); return; }
  const active = await readActive(ctx.targetDir);
  const members = (await readdir(docs, { withFileTypes: true }))
    .filter(e => e.isDirectory()).map(e => e.name);
  for (const m of members) {
    for (const cat of CATEGORIES) {
      const p = join(docs, m, cat);
      if (!(await exists(p))) continue;
      const names = (await readdir(p, { withFileTypes: true }))
        .filter(e => e.isDirectory()).map(e => e.name);
      for (const n of names) {
        const isActive = active && active.member === m && active.category === cat && active.name === n;
        console.log(`${isActive ? '*' : ' '} ${m}/${cat}/${n}`);
      }
    }
  }
}

async function switchTask(ctx, identifier) {
  // identifier: "<member>/<category>/<name>" or just "<name>" (searches current member)
  const parts = identifier.split('/');
  let member, category, name;
  if (parts.length === 3) {
    [member, category, name] = parts;
  } else if (parts.length === 2) {
    [category, name] = parts;
    member = await detectMember(ctx.targetDir, ctx.flags);
  } else if (parts.length === 1) {
    member = await detectMember(ctx.targetDir, ctx.flags);
    name = parts[0];
    // find category
    for (const cat of CATEGORIES) {
      if (await exists(taskPath(ctx.targetDir, member, cat, name))) { category = cat; break; }
    }
    if (!category) throw new Error(`task not found: ${member}/*/${name}`);
  } else throw new Error('invalid task identifier');

  const dir = taskPath(ctx.targetDir, member, category, name);
  if (!(await exists(dir))) throw new Error(`task not found: ${relative(ctx.targetDir, dir)}`);
  await writeActive(ctx.targetDir, {
    member, category, name,
    path: relative(ctx.targetDir, dir),
    switchedAt: new Date().toISOString(),
  });
  console.log(`active: ${member}/${category}/${name}`);
}

async function doneTask(ctx) {
  const active = await readActive(ctx.targetDir);
  if (!active) { console.log('no active task'); return; }
  const artifactPath = join(ctx.targetDir, active.path, 'artifact.md');

  const sections = [];
  sections.push(`\n---\n\n## ${new Date().toISOString()} — 자동 수집\n`);

  try {
    const { stdout } = await pexec('git', ['-C', ctx.targetDir, 'log', '--oneline', '-n', '20'], { maxBuffer: 1024 * 1024 });
    sections.push('### git log (최근 20)\n```\n' + stdout.trim() + '\n```\n');
  } catch { sections.push('### git log\n(git 저장소 아님 또는 실행 실패)\n'); }

  try {
    const { stdout } = await pexec('git', ['-C', ctx.targetDir, 'diff', '--stat', 'HEAD~5...HEAD'], { maxBuffer: 1024 * 1024 });
    if (stdout.trim()) sections.push('### diff --stat HEAD~5...HEAD\n```\n' + stdout.trim() + '\n```\n');
  } catch {}

  try {
    const { stdout } = await pexec('git', ['-C', ctx.targetDir, 'status', '--short'], { maxBuffer: 1024 * 1024 });
    if (stdout.trim()) sections.push('### 작업트리 상태\n```\n' + stdout.trim() + '\n```\n');
  } catch {}

  sections.push('### 테스트 결과\n(수동 입력 또는 CI 링크)\n');

  await appendFile(artifactPath, sections.join('\n'));
  console.log(`appended to: ${relative(ctx.targetDir, artifactPath)}`);
}

export async function runTask(ctx) {
  const remainingArgs = ctx.taskArgs || [];
  const [subcmd, ...rest] = remainingArgs;
  switch (subcmd) {
    case 'new': {
      const [category, name] = rest;
      if (!category || !name) throw new Error('usage: task new <feature|fix> <name>');
      return createTask(ctx, category, name);
    }
    case 'list': return listTasks(ctx);
    case 'switch': {
      const [id] = rest;
      if (!id) throw new Error('usage: task switch <member>/<category>/<name> | <category>/<name> | <name>');
      return switchTask(ctx, id);
    }
    case 'done': return doneTask(ctx);
    default:
      console.log(`usage:
  harness-team task new <feature|fix> <name>      # create + set active
  harness-team task list                          # list all tasks
  harness-team task switch <id>                   # set active
  harness-team task done                          # auto-collect git/test into artifact.md

Options:
  --member <name>     override member (default: git config user.name, else $USER)`);
  }
}

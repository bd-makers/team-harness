import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { exists, writeText } from '../fsx.mjs';
import { readActive, taskContextTemplate } from './task.mjs';

export const CONTEXT_MAX_BYTES = 6 * 1024;
export const CONTEXT_MAX_NONBLANK_LINES = 100;
export const CONTEXT_MAX_FAILURE_CAPSULES = 3;

const CAPSULE_HEADING = /^### F-[^\s].*$/;
const SECTION_HEADING = /^#{1,2}(\s|$)/;
const ATX_HEADING = /^#{1,6}(\s|$)/;
const CODE_FENCE = /^ {0,3}(`{3,}|~{3,})/;
const CODE_FENCE_CLOSE = /^ {0,3}(`+|~+)[ \t]*$/;

function codeFenceMarker(line) {
  const match = CODE_FENCE.exec(line);
  return match ? { char: match[1][0], length: match[1].length } : null;
}

function closesCodeFence(line, fence) {
  const match = CODE_FENCE_CLOSE.exec(line);
  return match !== null
    && match[1][0] === fence.char
    && match[1].length >= fence.length;
}

export function capsuleLineHasContent(line) {
  const body = line.trim().replace(/^[-*+]\s*/, '');
  if (body.length === 0) return false;
  if (ATX_HEADING.test(body) || CODE_FENCE.test(line)) return false;
  const colon = body.indexOf(':');
  return (colon === -1 ? body : body.slice(colon + 1)).trim().length > 0;
}

// 본문이 빈 capsule(템플릿 stub 포함)은 미해결로 세지 않는다.
function countUnresolvedCapsules(lines) {
  let count = 0;
  let open = false;
  let filled = false;
  let codeFence = null;
  const close = () => {
    if (open && filled) count += 1;
    open = false;
    filled = false;
  };
  for (const line of lines) {
    if (codeFence) {
      if (closesCodeFence(line, codeFence)) codeFence = null;
      else if (open && line.trim().length > 0) filled = true;
      continue;
    }
    codeFence = codeFenceMarker(line);
    if (codeFence) continue;
    if (CAPSULE_HEADING.test(line)) {
      close();
      open = true;
      continue;
    }
    if (!open) continue;
    if (SECTION_HEADING.test(line)) { close(); continue; }
    if (capsuleLineHasContent(line)) filled = true;
  }
  close();
  return count;
}

function requiredHeadings(task) {
  return [
    `# ${task} — Context Card`,
    '## Now',
    '## Constraints and settled decisions',
    '## JIT retrieval map',
    '## Failure capsules (max 3 unresolved)',
    '## Resume checklist',
  ];
}

export function contextCardPath(targetDir, active) {
  return join(targetDir, 'docs', active.user, active.task, `${active.task}-context.md`);
}

export function validateContextCard(content, task) {
  const bytes = Buffer.byteLength(content, 'utf8');
  const lines = content.split(/\r?\n/);
  const nonblankLines = lines.filter(line => line.trim().length > 0).length;
  const failureCapsules = countUnresolvedCapsules(lines);
  const headingSet = new Set(lines.map(line => line.trimEnd()));
  const missingHeadings = requiredHeadings(task).filter(heading => !headingSet.has(heading));
  const failures = [];

  if (bytes > CONTEXT_MAX_BYTES) {
    failures.push({
      code: 'size',
      actual: bytes,
      limit: CONTEXT_MAX_BYTES,
      message: `UTF-8 size ${bytes} bytes exceeds ${CONTEXT_MAX_BYTES} bytes`,
    });
  }
  if (nonblankLines > CONTEXT_MAX_NONBLANK_LINES) {
    failures.push({
      code: 'nonblank-lines',
      actual: nonblankLines,
      limit: CONTEXT_MAX_NONBLANK_LINES,
      message: `nonblank line count ${nonblankLines} exceeds ${CONTEXT_MAX_NONBLANK_LINES}`,
    });
  }
  if (missingHeadings.length > 0) {
    failures.push({
      code: 'required-headings',
      missing: missingHeadings,
      message: `missing required headings: ${missingHeadings.join(', ')}`,
    });
  }
  if (failureCapsules > CONTEXT_MAX_FAILURE_CAPSULES) {
    failures.push({
      code: 'failure-capsules',
      actual: failureCapsules,
      limit: CONTEXT_MAX_FAILURE_CAPSULES,
      message: `unresolved failure capsule count ${failureCapsules} exceeds ${CONTEXT_MAX_FAILURE_CAPSULES}`,
    });
  }

  return {
    valid: failures.length === 0,
    metrics: { bytes, nonblankLines, failureCapsules },
    failures,
  };
}

function printValidation(path, result) {
  console.log(`context: ${result.valid ? 'valid' : 'invalid'}`);
  console.log(`path: ${path}`);
  console.log(`bytes: ${result.metrics.bytes}/${CONTEXT_MAX_BYTES}`);
  console.log(`nonblank-lines: ${result.metrics.nonblankLines}/${CONTEXT_MAX_NONBLANK_LINES}`);
  console.log(`unresolved-failure-capsules: ${result.metrics.failureCapsules}/${CONTEXT_MAX_FAILURE_CAPSULES}`);
  for (const failure of result.failures) {
    console.log(`failure: ${failure.code} | ${failure.message}`);
  }
}

export async function runContextInit(ctx) {
  const active = await readActive(ctx.targetDir);
  if (!active || !active.task) {
    process.exitCode = 1;
    console.log('context: no-active-task');
    return { status: 'no-active-task' };
  }

  const path = contextCardPath(ctx.targetDir, active);
  if (await exists(path)) {
    console.log('context: exists');
    console.log(`path: ${path}`);
    return { status: 'exists', path };
  }

  await writeText(path, taskContextTemplate(active.task));
  console.log('context: initialized');
  console.log(`path: ${path}`);
  return { status: 'initialized', path };
}

export async function runContextCheck(ctx) {
  const active = await readActive(ctx.targetDir);
  if (!active || !active.task) {
    process.exitCode = 1;
    console.log('context: no-active-task');
    return { status: 'no-active-task' };
  }

  const path = contextCardPath(ctx.targetDir, active);
  if (!(await exists(path))) {
    process.exitCode = 1;
    console.log('context: missing');
    console.log(`path: ${path}`);
    console.log('next-action: harness-team context init');
    return { status: 'missing', path };
  }

  let content;
  try {
    content = await readFile(path, 'utf8');
  } catch (err) {
    process.exitCode = 1;
    console.log('context: unreadable');
    console.log(`path: ${path}`);
    console.log(`failure: unreadable | ${err.code || err.message}`);
    console.log('next-action: 카드 경로를 직접 복구한 뒤 harness-team context check 재실행');
    return { status: 'unreadable', path };
  }

  const result = validateContextCard(content, active.task);
  if (!result.valid) process.exitCode = 1;
  printValidation(path, result);
  return { status: result.valid ? 'valid' : 'invalid', path, ...result };
}

export async function runContext(ctx) {
  const action = (ctx.taskArgs || [])[0];
  if (action === 'init') return runContextInit(ctx);
  if (action === 'check') return runContextCheck(ctx);

  process.exitCode = 1;
  console.log('context: invalid-action');
  console.log('usage: harness-team context <init|check>');
  return { status: 'invalid-action' };
}

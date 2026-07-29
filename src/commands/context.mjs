import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { exists, writeText } from '../fsx.mjs';
import { readActive, taskContextTemplate } from './task.mjs';

export const CONTEXT_MAX_BYTES = 6 * 1024;
export const CONTEXT_MAX_NONBLANK_LINES = 100;
export const CONTEXT_MAX_FAILURE_CAPSULES = 3;

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
  const failureCapsules = lines.filter(line => /^### F-[^\s].*$/.test(line)).length;
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
      message: `failure capsule count ${failureCapsules} exceeds ${CONTEXT_MAX_FAILURE_CAPSULES}`,
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
  console.log(`failure-capsules: ${result.metrics.failureCapsules}/${CONTEXT_MAX_FAILURE_CAPSULES}`);
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

  const content = await readFile(path, 'utf8');
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

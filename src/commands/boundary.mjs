import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { exists } from '../fsx.mjs';
import { readActive } from './task.mjs';

const DECLARATION_RE = /^## Boundary contracts[ \t]*\r?\n(?:[ \t]*\r?\n)*```json[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/m;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function failure(id, code, message) {
  return { id, code, message };
}

function taskSpecPath(targetDir, active) {
  return resolve(targetDir, 'docs', active.user, active.task, `${active.task}-spec.md`);
}

export function parseBoundaryDeclaration(spec) {
  const match = spec.match(DECLARATION_RE);
  if (!match) return { status: 'not-configured' };

  let declaration;
  try {
    declaration = JSON.parse(match[1]);
  } catch (err) {
    return { status: 'invalid', failures: [failure('declaration', 'invalid-json', err.message)] };
  }

  if (!isRecord(declaration) || declaration.version !== 1 || !Array.isArray(declaration.boundaries)) {
    return {
      status: 'invalid',
      failures: [failure('declaration', 'invalid-shape', 'expected { "version": 1, "boundaries": [] }')],
    };
  }

  const ids = new Set();
  const failures = [];
  for (const boundary of declaration.boundaries) {
    const id = isRecord(boundary) && typeof boundary.id === 'string' ? boundary.id : 'declaration';
    if (!isRecord(boundary) || typeof boundary.id !== 'string' || boundary.id.length === 0) {
      failures.push(failure(id, 'invalid-boundary', 'boundary id must be a non-empty string'));
      continue;
    }
    if (ids.has(boundary.id)) failures.push(failure(id, 'duplicate-id', 'boundary id must be unique'));
    ids.add(boundary.id);
    for (const side of ['producer', 'consumer']) {
      const ref = boundary[side];
      if (!isRecord(ref) || typeof ref.path !== 'string' || ref.path.length === 0) {
        failures.push(failure(id, 'invalid-reference', `${side}.path must be a non-empty string`));
      } else if (ref.pointer !== undefined && (typeof ref.pointer !== 'string' || (!ref.pointer.startsWith('/') && ref.pointer !== ''))) {
        failures.push(failure(id, 'invalid-pointer', `${side}.pointer must be an empty string or JSON Pointer`));
      }
    }
  }
  return failures.length ? { status: 'invalid', failures } : { status: 'configured', boundaries: declaration.boundaries };
}

function resolveSchemaPath(targetDir, schemaPath) {
  if (isAbsolute(schemaPath)) throw new Error('schema path must be relative to the project root');
  const path = resolve(targetDir, schemaPath);
  const rel = relative(targetDir, path);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('schema path must stay inside the project root');
  if (!path.endsWith('.json')) throw new Error('schema path must reference a .json file');
  return path;
}

export function resolveJsonPointer(document, pointer = '') {
  if (pointer === '') return document;
  const segments = pointer.slice(1).split('/').map(rawSegment => rawSegment.replace(/~1/g, '/').replace(/~0/g, '~'));
  let value = document;
  for (const segment of segments) {
    if (!isRecord(value) && !Array.isArray(value)) return undefined;
    value = value[segment];
  }
  if (value !== undefined) return value;

  // JSON Schema describes an instance through `properties`. Support the concise
  // instance-root form (`/data`) while retaining standard document pointers
  // (`/properties/data`) above.
  value = document;
  for (const segment of segments) {
    if (!isRecord(value)) return undefined;
    if (isRecord(value.properties) && Object.hasOwn(value.properties, segment)) value = value.properties[segment];
    else value = value[segment];
  }
  return value;
}

async function loadObjectSchema(targetDir, ref, boundaryId, side, cache) {
  let path;
  try {
    path = resolveSchemaPath(targetDir, ref.path);
  } catch (err) {
    return { failures: [failure(boundaryId, 'invalid-path', `${side}: ${err.message}`)] };
  }
  const key = `${path}\u0000${ref.pointer || ''}`;
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      if (!(await exists(path))) return { error: 'missing-schema' };
      try {
        const document = JSON.parse(await readFile(path, 'utf8'));
        const schema = resolveJsonPointer(document, ref.pointer || '');
        if (!isRecord(schema) || schema.type !== 'object' || !isRecord(schema.properties)) return { error: 'invalid-object-schema' };
        return { schema };
      } catch (err) {
        return { error: 'invalid-schema-json', detail: err.message };
      }
    })());
  }
  const result = await cache.get(key);
  if (result.schema) return result;
  if (result.error === 'missing-schema') return { failures: [failure(boundaryId, result.error, `${side}: ${ref.path} does not exist`)] };
  if (result.error === 'invalid-object-schema') {
    return { failures: [failure(boundaryId, result.error, `${side}: ${ref.pointer || '/'} must reference an object schema with properties`)] };
  }
  return { failures: [failure(boundaryId, result.error, `${side}: ${result.detail}`)] };
}

function requiredNames(schema) {
  return Array.isArray(schema.required) ? schema.required.filter(name => typeof name === 'string') : [];
}

function basicType(schema) {
  return isRecord(schema) && typeof schema.type === 'string' ? schema.type : null;
}

export async function verifyBoundary(targetDir, boundary, cache = new Map()) {
  const producerResult = await loadObjectSchema(targetDir, boundary.producer, boundary.id, 'producer', cache);
  const consumerResult = await loadObjectSchema(targetDir, boundary.consumer, boundary.id, 'consumer', cache);
  const failures = [...(producerResult.failures || []), ...(consumerResult.failures || [])];
  if (failures.length) return failures;

  const producer = producerResult.schema;
  const consumer = consumerResult.schema;
  const producerRequired = new Set(requiredNames(producer));
  for (const field of requiredNames(consumer)) {
    const producerField = producer.properties[field];
    const consumerField = consumer.properties[field];
    if (!isRecord(producerField)) {
      failures.push(failure(boundary.id, 'missing-field', `consumer requires "${field}" but producer does not provide it`));
      continue;
    }
    if (!producerRequired.has(field)) {
      failures.push(failure(boundary.id, 'not-guaranteed', `consumer requires "${field}" but producer does not mark it required`));
    }
    const producerType = basicType(producerField);
    const consumerType = basicType(consumerField);
    if (!producerType) {
      failures.push(failure(boundary.id, 'unsupported-producer-type', `field "${field}" producer type must be a single string`));
    } else if (!consumerType) {
      failures.push(failure(boundary.id, 'unsupported-consumer-type', `field "${field}" consumer type must be a single string`));
    } else if (producerType !== consumerType) {
      failures.push(failure(boundary.id, 'type-mismatch', `field "${field}" is ${producerType} for producer but ${consumerType} for consumer`));
    }
  }
  return failures;
}

// Claude Code shows Claude only stderr when a PreToolUse hook exits 2, so the
// checkpoint mirrors every failure line there — a block with no visible reason is
// indistinguishable from a broken hook. The `boundary check` CLI keeps stdout only.
function printFailures(failures, ctx) {
  const emit = (line) => {
    console.log(line);
    if (ctx?.mirrorStderr) console.error(line);
  };
  emit('boundary: failed');
  for (const item of failures) emit(`failure: ${item.id} | ${item.code} | ${item.message}`);
}

export async function runBoundaryCheck(ctx) {
  const active = await readActive(ctx.targetDir);
  if (!active || !active.task) {
    process.exitCode = 2;
    printFailures([failure('declaration', 'no-active-task', 'activate a task before running boundary check')], ctx);
    return { status: 'error' };
  }

  const specPath = taskSpecPath(ctx.targetDir, active);
  let spec;
  try {
    spec = await readFile(specPath, 'utf8');
  } catch (err) {
    process.exitCode = 2;
    printFailures([failure('declaration', 'unreadable-spec', err.code || err.message)], ctx);
    return { status: 'error' };
  }

  const declaration = parseBoundaryDeclaration(spec);
  if (declaration.status === 'not-configured') {
    console.log('boundary: not-configured');
    return { status: 'not-configured' };
  }
  if (declaration.status === 'invalid') {
    process.exitCode = 2;
    printFailures(declaration.failures, ctx);
    return { status: 'error', failures: declaration.failures };
  }

  const schemaCache = new Map();
  const results = await Promise.all(declaration.boundaries.map(boundary => verifyBoundary(ctx.targetDir, boundary, schemaCache)));
  const failures = results.flat();
  if (failures.length) {
    process.exitCode = 2;
    printFailures(failures, ctx);
    return { status: 'error', failures };
  }
  console.log(`boundary: pass (${declaration.boundaries.length} checked)`);
  return { status: 'pass', checked: declaration.boundaries.length };
}

const CHECKED_BOX_RE = /- \[[xX]\]/;
// Checked items by their text, so a Write is judged per item rather than by count:
// counting let `[ ]→[x]` on one line slip past when another line went `[x]→[ ]` in the
// same rewrite (codex review P2, 2026-09-03).
const checkedItems = (text) => new Set(
  text.split('\n').map(line => line.match(/^\s*- \[[xX]\]\s*(.*\S)?/)).filter(Boolean).map(m => (m[1] || '').trim()),
);

export async function runBoundaryCheckpoint(ctx) {
  let input;
  try {
    let raw = '';
    for await (const chunk of process.stdin) raw += chunk;
    input = JSON.parse(raw);
  } catch {
    return { status: 'ignored' };
  }
  const tool = input?.tool_name;
  const toolInput = input?.tool_input;
  // The hook is wired for Edit|Write. A Write that rewrites the whole plan used to be
  // ignored outright, so completing a checkbox via Write skipped the check entirely.
  if ((tool !== 'Edit' && tool !== 'Write') || !isRecord(toolInput)) return { status: 'ignored' };
  if (typeof toolInput.file_path !== 'string') return { status: 'ignored' };
  const isEdit = tool === 'Edit';
  if (isEdit) {
    if (typeof toolInput.old_string !== 'string' || typeof toolInput.new_string !== 'string') return { status: 'ignored' };
    if (!toolInput.old_string.includes('- [ ]') || !CHECKED_BOX_RE.test(toolInput.new_string)) return { status: 'ignored' };
  } else if (typeof toolInput.content !== 'string' || !CHECKED_BOX_RE.test(toolInput.content)) {
    return { status: 'ignored' };
  }

  const active = await readActive(ctx.targetDir);
  if (!active || !active.task) return { status: 'ignored' };
  const planPath = resolve(ctx.targetDir, 'docs', active.user, active.task, `${active.task}-plan.md`);
  let editedPath;
  let canonicalPlanPath;
  try {
    [editedPath, canonicalPlanPath] = await Promise.all([realpath(resolve(ctx.targetDir, toolInput.file_path)), realpath(planPath)]);
    if (editedPath !== canonicalPlanPath) return { status: 'ignored' };
  } catch {
    return { status: 'ignored' };
  }
  if (!isEdit) {
    // A whole-file Write completes a checkbox only if some item is checked in the new
    // content and was not checked on disk — rewriting an already-complete plan is not
    // a completion, and swapping one item's check onto another still is.
    const existing = await readFile(planPath, 'utf8').catch(() => '');
    const before = checkedItems(existing);
    if (![...checkedItems(toolInput.content)].some(item => !before.has(item))) return { status: 'ignored' };
  }
  ctx.mirrorStderr = true;
  return runBoundaryCheck(ctx);
}

export async function runBoundary(ctx) {
  if ((ctx.taskArgs || [])[0] === 'check') return runBoundaryCheck(ctx);
  if ((ctx.taskArgs || [])[0] === 'checkpoint') return runBoundaryCheckpoint(ctx);
  process.exitCode = 2;
  console.log('boundary: invalid-action');
  console.log('usage: harness-team boundary check');
  return { status: 'invalid-action' };
}

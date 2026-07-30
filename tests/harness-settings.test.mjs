import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeClaudeSettings } from '../src/harness.mjs';

const protect = { type: 'command', command: './.claude/hooks/protect-files.sh', timeout: 10 };
const boundary = { type: 'command', command: './.claude/hooks/boundary-checkpoint.sh', timeout: 10 };

test('mergeClaudeSettings upgrades the known default Edit|Write group without duplicating protect-files', () => {
  const existing = { hooks: { PreToolUse: [{ matcher: 'Edit|Write', hooks: [protect] }] } };
  const incoming = { hooks: { PreToolUse: [{ matcher: 'Edit|Write', hooks: [protect, boundary] }] } };
  const result = mergeClaudeSettings(existing, incoming);
  assert.deepEqual(result.hooks.PreToolUse, [{ matcher: 'Edit|Write', hooks: [protect, boundary] }]);
});

test('mergeClaudeSettings preserves a customized Edit|Write group while adding the template group', () => {
  const custom = { type: 'command', command: './custom-hook.sh', timeout: 10 };
  const existing = { hooks: { PreToolUse: [{ matcher: 'Edit|Write', hooks: [protect, custom] }] } };
  const incoming = { hooks: { PreToolUse: [{ matcher: 'Edit|Write', hooks: [protect, boundary] }] } };
  const result = mergeClaudeSettings(existing, incoming);
  assert.deepEqual(result.hooks.PreToolUse, [
    { matcher: 'Edit|Write', hooks: [protect, custom] },
    { matcher: 'Edit|Write', hooks: [protect, boundary] },
  ]);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeClaudeSettings, settingsHasBoundaryCheckpoint } from '../src/harness.mjs';

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

test('mergeClaudeSettings preserves protect-files hooks with customized settings', () => {
  for (const customizedProtect of [
    { ...protect, timeout: 30 },
    { ...protect, continueOnError: true },
  ]) {
    const existingGroup = { matcher: 'Edit|Write', hooks: [customizedProtect] };
    const existing = { hooks: { PreToolUse: [existingGroup] } };
    const incoming = { hooks: { PreToolUse: [{ matcher: 'Edit|Write', hooks: [protect, boundary] }] } };
    const result = mergeClaudeSettings(existing, incoming);
    assert.deepEqual(result.hooks.PreToolUse, [
      existingGroup,
      { matcher: 'Edit|Write', hooks: [protect, boundary] },
    ]);
  }
});

test('settingsHasBoundaryCheckpoint ignores malformed custom hook groups', () => {
  const settings = { hooks: { PreToolUse: [{ matcher: 'Edit', hooks: {} }] } };
  assert.equal(settingsHasBoundaryCheckpoint(settings), false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCodexJsonl } from './sim/codex-agentloop.mjs';

test('parseCodexJsonl ignores non-json noise and extracts final message', () => {
  const parsed = parseCodexJsonl([
    '2026-07-08 WARN noisy plugin warning',
    '{"type":"thread.started","thread_id":"t_123"}',
    '{"type":"turn.started"}',
    '{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"CODEX_SMOKE_OK"}}',
    '{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":2}}',
    '',
  ].join('\n'));

  assert.equal(parsed.threadId, 't_123');
  assert.equal(parsed.turnCompleted, true);
  assert.equal(parsed.turnFailed, false);
  assert.equal(parsed.finalMessage, 'CODEX_SMOKE_OK');
  assert.equal(parsed.noise.length, 1);
  assert.equal(parsed.parseErrors.length, 0);
});

test('parseCodexJsonl reports malformed json event lines', () => {
  const parsed = parseCodexJsonl('{"type":"thread.started","thread_id":"t_123"}\n{"type":\n');

  assert.equal(parsed.events.length, 1);
  assert.equal(parsed.parseErrors.length, 1);
});

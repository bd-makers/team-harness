import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { appliedSandbox, run, STACKS } from './sandbox.mjs';

function objectSchema(properties, required = Object.keys(properties)) {
  return { type: 'object', properties, required };
}

test('L1 boundary checkpoint blocks a declared mismatch and allows it once schemas agree', async () => {
  const sb = await appliedSandbox(STACKS[0]);
  try {
    assert.equal(sb.initResult.code, 0, sb.initResult.stderr);
    assert.equal((await sb.cli(['task', 'boundary-demo'])).code, 0);
    const taskDir = join(sb.dir, 'docs', 'tester', 'boundary-demo');
    const planPath = join(taskDir, 'boundary-demo-plan.md');
    await mkdir(join(sb.dir, 'schemas'), { recursive: true });
    await writeFile(join(sb.dir, 'schemas', 'producer.json'), JSON.stringify(objectSchema({ user_id: { type: 'string' } })));
    await writeFile(join(sb.dir, 'schemas', 'consumer.json'), JSON.stringify(objectSchema({ userId: { type: 'string' } })));
    await writeFile(join(taskDir, 'boundary-demo-spec.md'), `# boundary-demo — Spec\n\n## Boundary contracts\n\n\`\`\`json\n${JSON.stringify({
      version: 1,
      boundaries: [{
        id: 'user-response',
        producer: { path: 'schemas/producer.json' },
        consumer: { path: 'schemas/consumer.json' },
      }],
    }, null, 2)}\n\`\`\`\n`);
    const input = JSON.stringify({
      tool_name: 'Edit',
      tool_input: { file_path: planPath, old_string: '- [ ] verify boundary', new_string: '- [x] verify boundary' },
    });
    const blocked = await run('bash', ['.claude/hooks/boundary-checkpoint.sh'], { cwd: sb.dir, env: sb.env, input });
    assert.equal(blocked.code, 2);
    assert.match(blocked.stdout, /boundary: failed/);
    assert.match(blocked.stdout, /missing-field/);

    await writeFile(join(sb.dir, 'schemas', 'consumer.json'), JSON.stringify(objectSchema({ user_id: { type: 'string' } })));
    const allowed = await run('bash', ['.claude/hooks/boundary-checkpoint.sh'], { cwd: sb.dir, env: sb.env, input });
    assert.equal(allowed.code, 0, allowed.stderr);
    assert.match(allowed.stdout, /boundary: pass \(1 checked\)/);
    assert.match(await readFile(planPath, 'utf8'), /- \[ \]$/m, 'hook checks before the editor applies the checkbox edit');
  } finally {
    await sb.cleanup();
  }
});

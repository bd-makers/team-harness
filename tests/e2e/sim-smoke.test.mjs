// The L5 sims live outside `npm test`, so their auth-free paths are pinned here: SC6 once went
// red unnoticed because nothing ran it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BIN, ROOT, STACKS, appliedSandbox } from './sandbox.mjs';
import { doctorGreen } from '../sim/codex-agentloop.mjs';

test('agentloop sc6 passes', async () => {
  const playground = await mkdtemp(join(tmpdir(), 'harness-sim-'));
  try {
    // A commit gate runs this suite with GIT_DIR set; it must not reach the sandbox's git calls.
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
    const r = spawnSync('node', [join(ROOT, 'tests/sim/agentloop.mjs'), 'sc6'], {
      encoding: 'utf8', env: { ...env, SIM_PLAYGROUND: playground },
    });
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  } finally {
    await rm(playground, { recursive: true, force: true });
  }
});

test('codex sim doctorGreen ignores the real CODEX_HOME that sb.env keeps for codex exec', async () => {
  const sb = await appliedSandbox(STACKS[0]);
  try {
    const realCodexHome = join(sb.dir, '.real-codex-home');
    await mkdir(realCodexHome);
    await writeFile(join(realCodexHome, 'config.toml'), 'model = "x"\n');
    const env = { ...sb.env, CODEX_HOME: realCodexHome };
    assert.equal(await doctorGreen({ dir: sb.dir, env, bin: BIN }), true);
    assert.equal(env.CODEX_HOME, realCodexHome);
  } finally {
    await sb.cleanup();
  }
});

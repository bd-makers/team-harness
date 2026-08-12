// L3 — multi-agent SSOT consistency: AGENTS.md is the single source (carries the
// section markers), CLAUDE.md / GEMINI.md IMPORT it via @AGENTS.md rather than
// duplicating the core, and the Cursor / OpenCode mirrors are present and valid.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { STACKS, appliedSandbox } from './sandbox.mjs';

for (const stack of STACKS) {
  test(`L3 SSOT [${stack.label}]: AGENTS source + @import + cursor/opencode mirrors`, async () => {
    const sb = await appliedSandbox(stack);
    try {
      // AGENTS.md is a real file (not a legacy alias symlink) carrying the markers
      const agentsStat = await lstat(join(sb.dir, 'AGENTS.md'));
      assert.ok(agentsStat.isFile() && !agentsStat.isSymbolicLink(), 'AGENTS.md must be a real file');
      const agents = await readFile(join(sb.dir, 'AGENTS.md'), 'utf8');
      assert.match(agents, /harness:section="roles"/, 'AGENTS.md should hold the SSOT section markers');

      // CLAUDE.md / GEMINI.md import the core, not duplicate it
      for (const f of ['CLAUDE.md', 'GEMINI.md']) {
        const body = await readFile(join(sb.dir, f), 'utf8');
        assert.match(body, /@AGENTS\.md/, `${f} should import @AGENTS.md`);
        assert.doesNotMatch(body, /harness:section="roles"/, `${f} must not duplicate the SSOT roles section`);
      }

      // OpenCode mirror is valid JSON; Cursor mirror has at least one .mdc rule
      const opencode = JSON.parse(await readFile(join(sb.dir, '.opencode/opencode.json'), 'utf8'));
      assert.ok(opencode && typeof opencode === 'object', '.opencode/opencode.json should be a JSON object');
      const cursorRules = await readdir(join(sb.dir, '.cursor/rules'));
      assert.ok(cursorRules.some((f) => f.endsWith('.mdc')), '.cursor/rules should contain mirrored .mdc rules');

      // The shipped rules are all path-scoped, so the mirror must translate `paths:`
      // into Cursor's auto-attach form — an always-on mirror would drop the scoping.
      const styling = await readFile(join(sb.dir, '.cursor/rules/styling.mdc'), 'utf8');
      assert.match(styling, /^globs: .+$/m, 'a path-scoped rule must mirror as Cursor globs');
      assert.doesNotMatch(styling, /alwaysApply: true/, 'a path-scoped rule must not become always-on in Cursor');
      assert.doesNotMatch(styling, /paths:/, 'source frontmatter must not survive into the .mdc body');
    } finally {
      await sb.cleanup();
    }
  });
}

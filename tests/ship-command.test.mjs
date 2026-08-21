// Guards the /harness-ship contract. The command exists to close the gap between
// the task documents and the moment a reviewer reads them (the PR), so the two
// things that make it safe are exactly the two a future edit could silently drop:
// it must never open the PR itself, and it must never hard-depend on a diagram
// tool that is installed per machine. Neither is expressible in the CLI, so it is
// asserted on the shipped contracts instead — the same way agent-files.test.mjs
// pins the AGENTS.md wording that D4 depends on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(join(ROOT, path), 'utf8');

test('ship: the command stops before creating the PR/MR', async () => {
  const command = await read('commands/harness-ship.md');
  assert.match(command, /PR\/MR을 만들지 않는다/, '커맨드가 PR을 만들지 않는다는 제약을 명시해야');
  assert.match(command, /준비 완료 보고에서 멈춘다/, '멈추는 지점이 명시돼야');
});

// done owns task completion and this repo releases by pushing a bump to main
// directly — a ship that ran done would fold a PR step into that flow.
test('ship: the command neither replaces nor runs harness-team done', async () => {
  const command = await read('commands/harness-ship.md');
  assert.match(command, /`harness-team done`을 대체하지 않는다/);
  assert.match(command, /이 명령 안에서 done을 실행하지 않는다/);
});

// The diagram tool is an external plugin installed per machine (it is not
// Claude Code-only — the upstream repo ships .codex-plugin/plugin.json too), so a
// hard dependency breaks ship on whichever machine has not installed it.
test('ship: the diagram step is opt-in and degrades instead of failing', async () => {
  const command = await read('commands/harness-ship.md');
  assert.match(command, /다이어그램은 옵트인이고 하드 의존이 아니다/);
  assert.match(command, /\*\*Probe\*\*/);
  assert.match(command, /\*\*Degrade\*\*/);
  assert.match(command, /\*\*Record\*\*/);
  assert.match(command, /ship을 실패로 만들지 않는다/, 'degrade 경로는 실패가 아니어야');
  assert.match(command, /미실행/, "건너뛴 사실을 artifact에 남기는 계약");
});

// AGENTS.md is read by Codex, Cursor and OpenCode too, so a Claude-only plugin
// skill named there would be an instruction those agents cannot follow.
test('ship: AGENTS.md carries the step tool-neutrally, in both halves of the pair', async () => {
  for (const path of ['AGENTS.md', 'templates/AGENTS.md.hbs']) {
    const body = await read(path);
    assert.match(body, /- \*\*PR\/MR 직전\(ship\)\*\*:/, `${path}: ship 단계 한 줄`);
    assert.doesNotMatch(body, /diagram-design/, `${path}: 특정 도구 이름 금지 (도구 중립 SSOT)`);
    assert.doesNotMatch(body, /\/harness-ship/, `${path}: Claude 전용 슬래시 호출 금지`);
  }
});

// The command is agent judgement, not a CLI wrapper. manifest-sync fails a
// documented `harness-team <sub>` with no router case, but only for commands/ —
// this covers the skill wrapper too, where the same invention would go unnoticed.
test('ship: no command or skill invents a harness-team ship subcommand', async () => {
  const dirs = [['commands', (f) => f.endsWith('.md')], ['skills', null]];
  const bodies = [];
  for (const [dir, filter] of dirs) {
    const entries = await readdir(join(ROOT, dir), { withFileTypes: true });
    for (const entry of entries) {
      if (filter && entry.isFile() && filter(entry.name)) bodies.push(await read(`${dir}/${entry.name}`));
      else if (!filter && entry.isDirectory()) bodies.push(await read(`${dir}/${entry.name}/SKILL.md`));
    }
  }
  assert.ok(bodies.length > 0, '스캔 대상이 비어 있으면 안 됨');
  for (const body of bodies) assert.doesNotMatch(body, /harness-team\s+ship\b/);
});

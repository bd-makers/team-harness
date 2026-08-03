import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFile(join(root, path), 'utf8');

function section(html, id) {
  const match = html.match(new RegExp(`<section id="${id}">([\\s\\S]*?)</section>`));
  assert.ok(match, `expected #${id} section`);
  return match[1];
}

test('README points to SSOTs while overview exposes generated inventories', async () => {
  const [readme, overview, agents, docsReadme, manifestText, commandFiles] = await Promise.all([
    read('README.md'),
    read('docs/harness-overview.html'),
    read('AGENTS.md'),
    read('templates/docs/README.md'),
    read('.claude-plugin/plugin.json'),
    readdir(join(root, 'commands')),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.match(readme, /task 파일 계약은 AGENTS\.md의 작업 프로토콜 및 templates\/docs\/README\.md 참조/);
  assert.doesNotMatch(readme, /docs\/<your-name>\/user-auth\/\{user-auth-spec\.md/);
  assert.match(agents, /각 task 디렉토리는 네 파일로 구성:/);
  assert.match(docsReadme, /task_summary\.md/);

  assert.match(readme, /설치되는 슬래시 명령과 설명은 `commands\/\*\.md` 및 `\.claude-plugin\/plugin\.json`에서 확인합니다\./);
  assert.match(readme, /아래는 전체 목록이 아니라 자주 쓰는 명령만 다루는 부분 안내/);
  assert.doesNotMatch(readme, /설치 후 다음 슬래시 명령 사용 가능:/);
  assert.doesNotMatch(readme, /Claude의 17개/);
  assert.ok(manifest.commands.every((entry) => commandFiles.includes(entry.replace('./commands/', ''))));

  assert.match(readme, /\.harness\/backup\.json`은 팀이 공유하는 설정이므로 commit을 권장합니다/);
  assert.match(readme, /harness-team release <minor\|patch\|major>/);
  assert.match(readme, /수동 절차/);
  assert.match(readme, /각 wrapper는 `commands\/harness-\*\.md`를 SSOT로 읽습니다\. 단, `harness-sim`은 방향이 반대로/);

  const commands = section(overview, 'commands');
  const task = section(overview, 'task');
  const files = section(overview, 'files');
  assert.match(commands, /commands\/\*\.md/);
  assert.match(commands, /\.claude-plugin\/plugin\.json/);
  assert.match(commands, /<table data-generated="commands">/);
  assert.equal((commands.match(/data-command-source=/g) ?? []).length, manifest.commands.length);
  for (const entry of manifest.commands) {
    assert.match(commands, new RegExp(`data-command-source="${entry.replace('./', '')}"`));
  }
  assert.doesNotMatch(commands, /17개의 slash command/);
  assert.match(task, /task 파일 계약과 Context Card 규약은 scaffold 되는/);
  assert.doesNotMatch(task, /class="card-grid"/);
  assert.match(files, /현재 소스 트리에서 생성됩니다/);
  assert.match(files, /<table data-generated="source-tree">/);
  assert.match(files, /scripts\/generate-harness-overview\.mjs/);
});

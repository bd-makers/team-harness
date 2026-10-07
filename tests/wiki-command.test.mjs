// Guards the /harness-wiki contract. The compile is LLM judgment driven by a prompt,
// so the properties that keep it safe live only in the shipped command text: it runs
// on the default branch after `done`, it stops on CLI blockers and on an existing
// compile, it copies the CLI's provenance marker verbatim, it falls back to
// wiki/99_inbox without project rules, it invents nothing, and it never pushes.
// Passages are compared whole (whitespace-collapsed) rather than by fragment — a
// fragment match misses a flipped or deleted clause (default-loop-skill Learnings).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(join(ROOT, path), 'utf8');
const squash = (text) => text.replace(/\s+/g, ' ').trim();

function section(doc, heading) {
  const start = doc.indexOf(`\n## ${heading}\n`);
  assert.ok(start >= 0, `## ${heading} 절이 있어야`);
  const rest = doc.slice(start + heading.length + 5);
  const end = rest.search(/\n## /);
  return end < 0 ? rest : rest.slice(0, end);
}

// A whole numbered item: from `<n>. ` to the next numbered item or blank line.
function item(text, n) {
  const start = text.indexOf(`\n${n}. `);
  assert.ok(start >= 0, `${n}번 항목이 있어야`);
  const rest = text.slice(start + 1);
  const end = rest.search(/\n(?:\n|\d+\. )/);
  return squash(end < 0 ? rest : rest.slice(0, end));
}

// A whole `- **<head>**` bullet up to the next top-level bullet or blank line.
function bullet(text, head) {
  const start = text.indexOf(`\n- **${head}**`);
  assert.ok(start >= 0, `- **${head}** bullet이 있어야`);
  const rest = text.slice(start + 1);
  const end = rest.search(/\n(?:- |\n)/);
  return squash(end < 0 ? rest : rest.slice(0, end));
}

test('wiki command: the compile contract stops on blockers and compiled, and never pushes', async () => {
  const doc = await read('commands/harness-wiki.md');

  assert.equal(squash(section(doc, '언제')), squash(`머지 후 종결 절차(\`commands/harness-task.md\` "머지 후 종결") 안에서 돈다 — 기본 브랜치에서 \`harness-team task <name>\` →
\`harness-team done\` → **\`/harness-wiki <user>/<task>\`(선택)** → \`harness-team summary --write\` → 종결 커밋 하나.
\`done\`이 끝나야 meta가 \`status: done\`이 되어 "머지된 task"가 확정된다. \`done\`은 활성 task를 비우므로 이때는 대상을 \`<user>/<task>\`로 명시한다.`));

  const steps = section(doc, '절차');
  assert.equal(item(steps, 1), '1. **기본 브랜치 확인** — 현재 브랜치가 기본 브랜치가 아니면 멈추고 묻는다. 위키 본문까지 PR 리뷰를 받으려고 PR 브랜치에서 돌리는 것은 사람이 명시적으로 지시한 경우뿐이다.');
  assert.equal(item(steps, 2), '2. **입력 받기** — `harness-team wiki sources [<user>/<task>] [--pr <N>] --json`을 실행한다. 이 명령은 아무 파일도 쓰지 않는다.');
  assert.equal(item(steps, 3), '3. **막힘이면 멈춘다** — `blockers`가 비어 있지 않으면 컴파일하지 않고 막힘마다 해소 방법을 알린 뒤 멈춘다. `not-done`은 `harness-team done`을 먼저, `no-pr`은 사람이 PR 번호를 확인해 `--pr <N>`으로 다시 실행, `no-commit`은 task 디렉터리를 이 브랜치에 커밋한 뒤 다시 실행이다. PR 번호를 추측해 채우지 않는다.');
  assert.equal(item(steps, 4), '4. **이미 컴파일됐으면 멈춘다** — `compiled`가 비어 있지 않고 재컴파일 명시 요청이 없으면 그 위치를 알리고 멈춘다. 재컴파일 요청이면 그 task의 마커가 연 단락(다음 `harness:wiki` 마커 또는 같은 수준 이상의 다음 제목 전까지)만 교체하고, 다른 단락은 건드리지 않는다.');
  assert.equal(item(steps, 6), '6. **쓰기** — `rules`가 비어 있으면 `wiki/99_inbox/<task>.md` 한 파일에 쓴다. 규칙이 있으면 규칙대로 항목을 고르고, 규칙으로 분류하지 못한 단락은 `wiki/99_inbox/`로 보낸다. 컴파일 단락의 첫 줄은 `marker` 문자열 그대로다 — 손으로 고치거나 다시 조립하지 않는다.');
  assert.equal(item(steps, 7), '7. **보고** — 쓴 파일과 단락 수, inbox로 보낸 것을 알린다. 커밋은 머지 후 종결 커밋에 함께 담는다. push하지 않는다.');
  // 순서가 계약이다 — 막힘·중복 판정이 읽기·쓰기보다 먼저다.
  for (let n = 1; n < 7; n++) assert.ok(steps.indexOf(`\n${n}. `) < steps.indexOf(`\n${n + 1}. `), `${n}번이 ${n + 1}번보다 먼저`);

  assert.equal(squash(section(doc, '멈춤 조건')), squash(`- 기본 브랜치가 아님(사람의 명시 지시가 없을 때)
- \`blockers\`가 있음
- 이미 컴파일됨(재컴파일 명시 요청이 없을 때)
- 작성 규칙이 서로 모순돼 항목을 고를 수 없음 — 규칙을 고치지 말고 사람에게 묻는다`));

  const content = section(doc, '컴파일 단락의 내용');
  assert.ok(squash(content).endsWith('task 문서에 없는 내용을 지어내지 않는다 — 단락은 원문 대조가 가능해야 한다. 출처는 마커의 PR·커밋이다. task 경로로 링크하지 않는다 — task 폴더는 나중에 사라진다(§4-4).'));

  assert.equal(bullet(doc, '추가만 한다.'), '- **추가만 한다.** task 폴더를 지우거나 옮기지 않는다. `done`·`summary`·handoff는 그대로다.');
  assert.equal(bullet(doc, 'push·PR을 하지 않는다.'), '- **push·PR을 하지 않는다.** 위키 변경은 머지 후 종결 커밋에 함께 담는다.');
  assert.equal(bullet(doc, '분류 체계는 프로젝트 데이터다.'), '- **분류 체계는 프로젝트 데이터다.** 어느 항목에 무엇을 넣을지는 `wiki/90_system/`의 작성 규칙을 따른다. 하네스는 폴더 구조를 정하지 않는다.');
});

test('wiki command: the post-merge closing procedure offers the compile as an optional step', async () => {
  const task = await read('commands/harness-task.md');
  const closing = squash(section(task, '머지 후 종결 — 커밋 하나'));
  assert.ok(closing.includes('위키 컴파일은 선택이다 — `harness-team done` 다음, `summary --write` 전에 `/harness-wiki <user>/<task>`를 돌리면 위키 변경도 같은 종결 커밋에 담긴다(`done`이 활성 task를 비우므로 대상을 명시한다, `commands/harness-wiki.md`).'),
    'harness-task 종결 절에 선택 단계 한 줄이 있어야');
});

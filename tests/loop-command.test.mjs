// Guards the /harness-loop contract. The loop is a prompt, not a runtime, so the
// properties that keep it safe live only in the shipped command text: the four
// stop conditions (with no numeric retry cap — docs/harness-cycle.md §4-3), the
// QA split (machine checks by the orchestrator, rubric by a read-only process —
// a read-only verifier cannot run tests), and the write/approval boundaries (D4,
// no push or PR). Sections are compared whole rather than by loose `includes`,
// because a partial match misses a deleted sentence (r2-scenario-evidence
// Learnings).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(join(ROOT, path), 'utf8');

function section(doc, heading) {
  const start = doc.indexOf(`\n## ${heading}\n`);
  assert.ok(start >= 0, `## ${heading} 절이 있어야`);
  const rest = doc.slice(start + heading.length + 5);
  const end = rest.search(/\n## /);
  return end < 0 ? rest : rest.slice(0, end);
}

// Collapses whitespace so a sentence wrapped across lines compares as one line.
const squash = (text) => text.replace(/\s+/g, ' ').trim();

// The whole `- **<head>**` bullet: from its marker to the next top-level bullet
// or the end of the section, whitespace-collapsed.
function bullet(text, head) {
  const start = text.indexOf(`\n- **${head}**`);
  assert.ok(start >= 0, `- **${head}** bullet이 있어야`);
  const rest = text.slice(start + 1);
  const end = rest.search(/\n- /);
  return squash(end < 0 ? rest : rest.slice(0, end));
}

function inOrder(text, needles) {
  let at = -1;
  for (const needle of needles) {
    const next = text.indexOf(needle, at + 1);
    assert.ok(next > at, `순서대로 나와야: ${needle}`);
    at = next;
  }
}

test('loop: the four stop conditions are pinned and no-progress has no numeric cap', async () => {
  const stops = section(await read('commands/harness-loop.md'), '멈춤 조건');
  const heads = [...stops.matchAll(/^- \*\*([^*]+)\*\*/gm)].map((m) => m[1]);
  assert.deepEqual(heads, ['성공', 'spec 공백', '진전 없음', '승인 필요'], '멈춤 조건은 정확히 이 넷이어야');
  assert.match(stops, /직전 Dev 턴 이후 실패 집합이 같고 diff에도 변화가 없으면 멈춘다/);
  assert.match(stops, /횟수 상한을 두지 않는다/);
  assert.doesNotMatch(stops, /\d+\s*(회|번)/, '임의 횟수 상한이 생기면 안 된다');
  assert.match(stops, /PR은 사람이 만든다/);
});

test('loop: QA runs machine checks before the read-only rubric and records named test output', async () => {
  const qa = section(await read('commands/harness-loop.md'), 'QA');
  inOrder(qa, [
    'harness-team gate commit',
    'harness-team boundary check',
    'harness-team scenario check',
    '테스트 이름이 찍힌 줄',
    'harness-team review <engine> --framing scenario',
  ]);
  assert.match(qa, /기계 검사는 오케스트레이터가 실행한다/);
  assert.match(qa, /read-only 검증자는 테스트를 실행하지 못한다/);
  assert.match(
    squash(qa),
    /(?:^|\. )판단이 필요한 루브릭만 별도 프로세스의 read-only 검증자가 맡는다\./,
    '루브릭은 별도 프로세스의 read-only 검증자가 맡아야',
  );
  assert.match(qa, /루브릭은 모든 단계가 끝난 뒤 한 번 돌린다/);
  assert.match(qa, /이번 단계 전에 증거가 없던 시나리오는 진전 판정에서 뺀다/);
});

test('loop: entry asks orchestrator-or-individual and the loop never pushes or opens a PR', async () => {
  const doc = await read('commands/harness-loop.md');
  const entry = section(doc, '진입');
  assert.match(entry, /오케스트레이터로 진행할까, 개별로 진행할까/);
  assert.match(entry, /개별을 고르면 아무것도 하지 않고 끝난다/);
  const dev = section(doc, 'Dev');
  assert.match(dev, /Dev는 커밋하지 않는다/);
  assert.match(dev, /Dev가 도는 동안 오케스트레이터는 쓰지 않는다/);
  assert.match(doc, /push·PR을 하지 않는다/);
  assert.equal(
    bullet(section(doc, '멈춤 조건'), '승인 필요'),
    '- **승인 필요** — push·PR·파괴적 변경·의존성 추가처럼 되돌리기 어려운 행위가 필요하다. 하지 않고 멈춘다.',
    '승인 필요 상황에서는 하지 않고 멈춰야',
  );
});

test('loop: README distinguishes a service orchestrator from the optional loop command', async () => {
  const readme = await read('README.md');
  assert.match(readme, /서비스형 런타임 오케스트레이터가 아닙니다/);
  assert.match(readme, /선택형 기본 루프 `\/harness-loop`/);
  assert.doesNotMatch(readme, /런타임 오케스트레이션이 아닙니다/, '선택형 루프까지 금지한 것처럼 읽히는 옛 문구가 남으면 안 된다');
});

// The dogfood scenario (spec S6) greps the artifact for this line, so the
// template the command tells the orchestrator to write must stay in that shape.
test('loop: the record line template matches the dogfood grep', async () => {
  const doc = await read('commands/harness-loop.md');
  assert.ok(
    doc.includes('`- loop: <YYYY-MM-DD> · 수단 <subagent|main> · 단계 <plan 단계 요약> · QA pass · commit <sha7>`'),
    '루프 기록 줄 템플릿',
  );
  const sample = '- loop: 2026-10-06 · 수단 subagent · 단계 README 정정 · QA pass · commit 1a2b3c4';
  assert.match(sample, /^- loop: [0-9]{4}-[0-9]{2}-[0-9]{2} · 수단 (subagent|main) · 단계 .+ · QA pass · commit [0-9a-f]{7}/);
});

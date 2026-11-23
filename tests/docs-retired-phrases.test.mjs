// 없앤 기능·사실의 옛 문구가 현행 문서에 남거나 되살아나면 실패한다.
//
// 사실이 같은지는 기계가 판단할 수 없으므로 docs-retired-phrases.json에 등록한 문구만 본다. 표면을 없애면 그 문구를 표에 더한다.
// 이력은 옛 동작을 적는 것이 맞으므로 CHANGELOG·what-changes·버전 스냅샷·task 문서는 보지 않고, 현행 문서 안의 릴리스 배너는 지우고 본다.
// 표의 `history`는 배너 밖에 남겨도 되는 이력 표기다(예: 가이드의 `0.54.0 TCC 폐지 반영` 라벨). 그 표기만 지우고 같은 줄의 나머지는 그대로 본다.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { classifyDocument } from '../scripts/docs-version-drift.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const retired = JSON.parse(await readFile(join(root, 'tests/docs-retired-phrases.json'), 'utf8'));

const SCOPE_DIRS = ['commands', 'skills', 'templates'];
const HISTORY_BANNER = /<div\b[^>]*>\s*<strong>(?:🆕|✅) \d[\s\S]*?<\/div>/g;

// 줄바꿈된 Markdown과 `<b>`로 갈린 HTML에서도 같은 문구다.
const phrasePattern = (phrase) => new RegExp(
  phrase.split(/\s+/).map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(?:\\s|<[^>]*>)+'),
  'g',
);
// 줄 번호가 어긋나지 않게 지운 자리의 줄바꿈은 남긴다.
const blank = (text) => text.replace(/[^\n]/g, ' ');

async function currentDocuments(base) {
  const nested = await Promise.all(SCOPE_DIRS.map(async (dir) => {
    const entries = await readdir(join(base, dir), { recursive: true, withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => relative(base, join(entry.parentPath, entry.name)));
  }));
  const html = (await readdir(join(base, 'docs')))
    .filter((name) => name.endsWith('.html') && !name.startsWith('what-changes-'))
    .map((name) => `docs/${name}`)
    .filter((path) => classifyDocument(path, '') !== 'snapshot');
  return [...nested.flat(), 'README.md', ...html].sort();
}

async function findRetired(base, table = retired) {
  const problems = [];
  for (const path of await currentDocuments(base)) {
    const body = (await readFile(join(base, path), 'utf8')).replace(HISTORY_BANNER, blank);
    for (const { phrases, history = [], replacement } of table) {
      const text = history.reduce((current, kept) => current.replace(phrasePattern(kept), blank), body);
      for (const phrase of phrases) {
        for (const { index } of text.matchAll(phrasePattern(phrase))) {
          const line = text.slice(0, index).split('\n').length;
          problems.push(`${path}:${line}: "${phrase}" → ${replacement}`);
        }
      }
    }
  }
  return problems;
}

async function withTree(files, run) {
  const base = await mkdtemp(join(tmpdir(), 'docs-retired-phrases-'));
  try {
    await Promise.all([...SCOPE_DIRS, 'docs'].map((dir) => mkdir(join(base, dir))));
    await writeFile(join(base, 'README.md'), '');
    for (const [path, body] of Object.entries(files)) {
      await mkdir(dirname(join(base, path)), { recursive: true });
      await writeFile(join(base, path), body);
    }
    return await run(base);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
}

const table = [{ phrases: ['옛 문구'], history: ['0.1.0 옛 문구 폐지'], replacement: '새 문구' }];
const banner = '<div style="x">\n  <strong>🆕 0.1.0 — 제목:</strong>\n  <code>0.1.0</code> 옛 문구를 없앴다\n</div>\n';

test('current docs repeat no retired phrase', async () => {
  const problems = await findRetired(root);
  if (problems.length > 0) assert.fail(`없앤 표면의 옛 문구가 현행 문서에 있습니다. 대체 표현으로 고치세요.\n${problems.join('\n')}`);
});

test('the scan reaches every scope and skips snapshots', async () => {
  const scanned = await currentDocuments(root);
  for (const path of [
    'README.md',
    'commands/harness-task.md',
    'skills/harness-team/SKILL.md',
    'templates/AGENTS.md.hbs',
    'docs/harness-cheatsheet.html',
    'docs/harness-overview.template.html',
  ]) assert.ok(scanned.includes(path), path);
  for (const path of [
    'docs/harness-overview-0.12.0.html',
    'docs/loop-graph-workflow-qna-0.13.html',
    'docs/what-changes-0.54.0.html',
    'docs/what-changes-latest-version.html',
  ]) assert.ok(!scanned.includes(path), path);
});

test('every registered phrase fails in every scope and names the file and the replacement', async () => {
  for (const { id, phrases, replacement } of retired) {
    assert.ok(phrases.length > 0 && replacement, id);
    for (const phrase of phrases) {
      const body = `첫 줄\n${phrase}을 쓴다\n`;
      const paths = ['README.md', 'commands/x.md', 'skills/x/SKILL.md', 'templates/x.md.hbs', 'docs/x.html'];
      const problems = await withTree(Object.fromEntries(paths.map((path) => [path, body])), (base) => findRetired(base));
      for (const path of paths) {
        assert.ok(
          problems.includes(`${path}:2: "${phrase}" → ${replacement}`),
          `${path}에서 "${phrase}"를 놓쳤다:\n${problems.join('\n')}`,
        );
      }
    }
  }
});

test('lines that shipped in past sweeps are caught', async () => {
  const incidents = [
    // 0e1479b가 고친 줄과 그 수정이 놓친 줄이다.
    '<td class="d"><b>하네스</b> · post-commit 훅이 갱신 → 다음 커밋에 담는다</td>',
    'HK-->>CC: task handoff append (다음 커밋에 포함)',
    '<li>handoff — 세션 인계 (task handoff는 훅이 append해 다음 커밋에 · user handoff는 로컬)</li>',
    '커밋 대상은 <code>&lt;name&gt;-handoff.md</code> 하나이고 다음 작업 커밋에 함께 담는다(0.42.1·0.44.4).',
    // 0.58.0 done-derive 뒤에도 머지 뒤 done·종결 커밋을 가르치던 줄이다(task task-guide-closure-flow).
    '<p class="section-sub"><code>done</code>은 <strong>PR이 머지된 뒤 기본 브랜치에서</strong> 돌립니다(0.44.0).',
    '<text class="svg-sub" x="855" y="221" text-anchor="middle">PR 머지 후 · done</text>',
    '<td class="d"><b>머지 후 기본 브랜치에서</b> 가드 통과 시 종결</td>',
    '<b>종결</b> 머지 후 기본 브랜치: 체크 → <code>done</code> → (<code>/harness-wiki</code>) → <code>summary --write</code> → <b>커밋 하나</b> ·',
    'CC->>HT: (선택) wiki → summary --write → 종결 커밋 1개',
    '<text x="500" y="724" text-anchor="middle">머지 후 · summary · 종결 커밋</text>',
    "[990,'done 가드','머지 후 종결 직전','#4df0aa']",
    '<p>통과 뒤 <strong>머지 후 종결 순서 — 커밋 하나</strong>(0.44.0)</p>',
    '세션 시작 → task 활성화 → spec 게이트(R1·Ambiguity) → 구현 루프 → 리뷰(R3) → ship(pr-check) → PR 머지 → done → summary.',
    "push('<code>/harness-task done</code>','<b>머지 후 기본 브랜치에서</b> plan 마지막 단계를 체크하고 실행', 'gate');",
  ];
  for (const line of incidents) {
    const problems = await withTree({ 'docs/x.html': line }, (base) => findRetired(base));
    assert.ok(problems.length > 0, line);
  }
});

test('the done-after-merge entry leaves the post-merge wiki and ledger batch alone', async () => {
  const lines = [
    '위키 컴파일은 선택이고 머지 후 기본 브랜치에서 한다(PR 출처가 머지 커밋에 있다).',
    '옛 절차(머지 뒤 기본 브랜치에서 `done` + 종결 커밋)를 그대로 해도 오류가 아니다.',
    '머지 뒤에 할 일(종결 커밋·종결 MR)이 없다.',
  ];
  for (const line of lines) {
    const problems = await withTree({ 'docs/x.html': line }, (base) => findRetired(base));
    assert.deepEqual(problems, [], line);
  }
});

test('a phrase split by a line wrap or a tag is the same phrase', async () => {
  const problems = await withTree({
    'commands/x.md': '첫 줄\n옛\n문구\n',
    'docs/x.html': '<p>옛 <b>문구</b></p>',
  }, (base) => findRetired(base, table));
  assert.deepEqual(problems, ['commands/x.md:2: "옛 문구" → 새 문구', 'docs/x.html:1: "옛 문구" → 새 문구']);
});

test('history surfaces may keep the old phrase', async () => {
  const problems = await withTree({
    'CHANGELOG.md': '옛 문구',
    'docs/what-changes-0.1.0.html': '옛 문구',
    'docs/what-changes-latest-version.html': '옛 문구',
    'docs/x-0.1.0.html': '옛 문구',
    'docs/x-0.1.html': '옛 문구',
    'docs/chad/x/x-artifact.md': '옛 문구',
    'docs/chad/x/x.html': '옛 문구',
    'docs/hslee/x/x.html': '옛 문구',
    'docs/banner.html': banner,
    'docs/label.html': '<span class="tag">기준 v0.0.9 · 0.1.0 옛 문구 폐지 반영</span>',
  }, (base) => findRetired(base, table));
  assert.deepEqual(problems, []);
});

test('the history exemptions stop where the history ends', async () => {
  const problems = await withTree({
    'docs/after-banner.html': `${banner}<p>옛 문구</p>`,
    'docs/after-label.html': '<span>0.1.0 옛 문구 폐지</span> 옛 문구',
    'docs/unversioned-box.html': '<div><strong>✅ 완료</strong> 옛 문구</div>',
  }, (base) => findRetired(base, table));
  assert.deepEqual(problems, [
    'docs/after-banner.html:5: "옛 문구" → 새 문구',
    'docs/after-label.html:1: "옛 문구" → 새 문구',
    'docs/unversioned-box.html:1: "옛 문구" → 새 문구',
  ]);
});

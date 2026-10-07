import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { wikiSources, wikiMarker, prFromCommit, wikiMarkersIn } from '../src/commands/wiki.mjs';

const pexec = promisify(execFile);
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BIN = join(ROOT, 'bin', 'harness-team.mjs');
const AT = '2026-10-07';

async function git(dir, ...args) {
  return (await pexec('git', ['-C', dir, ...args])).stdout.trim();
}

async function cli(dir, ...args) {
  return pexec('node', [BIN, ...args], { cwd: dir, timeout: 20000 });
}

// main 위에 task `chad/x` 를 feature 브랜치에서 만들고, `land` 방식으로 main 에 들여온다.
// 반환하는 sha 는 들여온 커밋(머지 또는 squash) — 출처가 가리켜야 하는 커밋이다.
async function repoWithLandedTask({ land = 'merge', subject, body = '', status = 'done', metaUser = 'chad' }) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-wiki-'));
  await git(dir, 'init', '-q', '-b', 'main');
  await git(dir, 'config', 'user.email', 'test@example.com');
  await git(dir, 'config', 'user.name', 'test');
  await writeFile(join(dir, '.gitignore'), '.harness/\n');
  await writeFile(join(dir, 'README.md'), '# seed\n');
  await git(dir, 'add', '-A');
  await git(dir, 'commit', '-qm', 'seed');

  await git(dir, 'checkout', '-qb', 'feature');
  const taskDir = join(dir, 'docs', 'chad', 'x');
  await mkdir(taskDir, { recursive: true });
  await writeFile(join(taskDir, 'x-spec.md'), '# x — Spec\n');
  await writeFile(join(taskDir, 'x-plan.md'), '# x — Plan\n');
  await writeFile(join(taskDir, 'x-artifact.md'), '# x — Artifact\n');
  await writeFile(join(taskDir, 'x-meta.json'), JSON.stringify({ user: metaUser, task: 'x', status }, null, 2) + '\n');
  await git(dir, 'add', '-A');
  await git(dir, 'commit', '-qm', 'docs(task): x');
  await git(dir, 'checkout', '-q', 'main');

  const message = body ? ['-m', subject, '-m', body] : ['-m', subject];
  if (land === 'squash') {
    await git(dir, 'merge', '-q', '--squash', 'feature');
    await git(dir, 'commit', '-q', ...message);
  } else {
    await git(dir, 'merge', '-q', '--no-ff', 'feature', ...message);
  }
  return { dir, sha7: (await git(dir, 'rev-parse', 'HEAD')).slice(0, 7) };
}

test('wiki sources: infers PR, merge commit and author from first-parent history', async () => {
  const cases = [
    { land: 'merge', subject: 'merge: x — 기능 (#12)' },
    { land: 'merge', subject: 'Merge pull request #12 from org/x' },
    { land: 'squash', subject: 'x 기능 추가 (#12)' },
  ];
  for (const c of cases) {
    // meta 의 user 를 경로의 user(chad)와 다르게 둔다 — 작성자가 경로가 아니라 meta 에서 온다는 것을 가른다.
    const { dir, sha7 } = await repoWithLandedTask({ ...c, metaUser: 'kim' });
    try {
      // 실제 CLI 로 돌린다 — 라우터가 `wiki` 의 positional 을 대상 디렉터리로 오인하면 여기서 깨진다.
      const { stdout } = await cli(dir, 'wiki', 'sources', 'chad/x', '--json');
      const out = JSON.parse(stdout);
      assert.equal(out.status, 'success', c.subject);
      assert.deepEqual(out.provenance, { pr: 12, commit: sha7, author: 'kim' }, c.subject);
      assert.deepEqual(out.blockers, [], c.subject);
      const at = /at=(\d{4}-\d{2}-\d{2}) -->$/.exec(out.marker)?.[1];
      assert.ok(at, `marker 에 at 날짜가 있어야 한다: ${out.marker}`);
      assert.equal(out.marker, wikiMarker({ task: 'chad/x', pr: 12, commit: sha7, author: 'kim', at }), c.subject);
      assert.equal(out.marker, `<!-- harness:wiki task=chad/x pr=12 commit=${sha7} author=kim at=${at} -->`);
      assert.deepEqual(out.docs, ['docs/chad/x/x-spec.md', 'docs/chad/x/x-plan.md', 'docs/chad/x/x-artifact.md']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

test('wiki sources: reads a GitLab merge request number from the commit body', async () => {
  const { dir, sha7 } = await repoWithLandedTask({
    subject: "Merge branch 'x' into 'main'",
    body: 'x 기능\n\nCloses #3\n\nSee merge request group/proj!7',
  });
  try {
    const out = await wikiSources(dir, 'chad', 'x', { at: AT });
    assert.equal(out.provenance.pr, 7, 'Closes #3 같은 이슈 번호가 아니라 MR 번호를 읽는다');
    assert.equal(out.provenance.commit, sha7);
    assert.equal(out.marker, `<!-- harness:wiki task=chad/x pr=7 commit=${sha7} author=chad at=${AT} -->`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  assert.equal(prFromCommit('Merge branch \'x\'', 'See merge request a/b/c!42\n'), 42);
});

test('wiki sources: no PR number blocks until --pr is given', async () => {
  const { dir, sha7 } = await repoWithLandedTask({ subject: "Merge branch 'feature'" });
  try {
    const first = JSON.parse((await cli(dir, 'wiki', 'sources', 'chad/x', '--json')).stdout);
    assert.equal(first.provenance.pr, null);
    assert.equal(first.marker, null);
    assert.ok(first.blockers.includes('no-pr'));
    assert.equal(first.status, 'warning');

    const second = JSON.parse((await cli(dir, 'wiki', 'sources', 'chad/x', '--pr', '9', '--json')).stdout);
    assert.equal(second.provenance.pr, 9);
    assert.equal(second.provenance.commit, sha7, '--pr 는 번호만 바꾸고 커밋은 그대로 추론한다');
    assert.ok(!second.blockers.includes('no-pr'));
    assert.match(second.marker, new RegExp(`^<!-- harness:wiki task=chad/x pr=9 commit=${sha7} author=chad at=\\d{4}-\\d{2}-\\d{2} -->$`));

    const bad = await cli(dir, 'wiki', 'sources', 'chad/x', '--pr', 'abc').then(() => null, e => e);
    assert.equal(bad?.code, 2, '--pr 는 양의 정수만 받는다');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('wiki sources: a task that is not done is blocked', async () => {
  const { dir } = await repoWithLandedTask({ subject: 'merge: x (#12)', status: 'open' });
  try {
    const out = await wikiSources(dir, 'chad', 'x', { at: AT });
    assert.equal(out.task_status, 'open');
    assert.deepEqual(out.blockers, ['not-done']);
    assert.equal(out.marker, null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('wiki sources: reports where the task is already compiled, ignoring fenced examples', async () => {
  const { dir } = await repoWithLandedTask({ subject: 'merge: x (#12)' });
  try {
    await mkdir(join(dir, 'wiki', '20_domain'), { recursive: true });
    await mkdir(join(dir, 'wiki', '90_system'), { recursive: true });
    await writeFile(join(dir, 'wiki', '20_domain', 'feature.md'),
      '# feature\n\n<!-- harness:wiki task=chad/x pr=12 commit=abc1234 author=chad at=2026-10-01 -->\n## x\n본문\n');
    await writeFile(join(dir, 'wiki', '90_system', 'rules.md'),
      '# 규칙\n\n```markdown\n<!-- harness:wiki task=chad/x pr=12 commit=abc1234 author=chad at=2026-10-01 -->\n```\n');
    await writeFile(join(dir, 'wiki', '20_domain', 'other.md'),
      '# other\n\n<!-- harness:wiki task=chad/x-v2 pr=13 commit=def5678 author=chad at=2026-10-02 -->\n');
    const out = await wikiSources(dir, 'chad', 'x', { at: AT });
    assert.deepEqual(out.compiled, ['wiki/20_domain/feature.md']);
    // 이미 컴파일됨은 막힘이 아니다 — 재컴파일 여부를 묻는 신호다.
    assert.deepEqual(out.blockers, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  assert.deepEqual(wikiMarkersIn('~~~\n<!-- harness:wiki task=a/b -->\n~~~\n'), []);
  // 4개 백틱 블록 안의 3개 백틱은 블록을 닫지 않는다 — 그 안의 마커는 예시다. 블록이 닫힌 뒤의 마커는 센다.
  const nested = '````markdown\n```\n<!-- harness:wiki task=a/b -->\n```\n````\n<!-- harness:wiki task=a/c -->\n';
  assert.deepEqual(wikiMarkersIn(nested).map(m => m.task), ['a/c']);
});

test('wiki sources: without wiki/90_system rules everything goes to 99_inbox', async () => {
  const { dir } = await repoWithLandedTask({ subject: 'merge: x (#12)' });
  try {
    const bare = await wikiSources(dir, 'chad', 'x', { at: AT });
    assert.deepEqual(bare.rules, []);
    assert.equal(bare.inbox, 'wiki/99_inbox');
    const { stdout } = await cli(dir, 'wiki', 'sources', 'chad/x');
    assert.match(stdout, /rules: \(없음 — wiki\/90_system\/ 에 작성 규칙이 없으므로 모든 단락은 wiki\/99_inbox\/ 로\)/);

    await mkdir(join(dir, 'wiki', '90_system', 'templates'), { recursive: true });
    await writeFile(join(dir, 'wiki', '90_system', 'compile-rules.md'), '# 규칙\n');
    await writeFile(join(dir, 'wiki', '90_system', 'templates', 'entry.md'), '# 템플릿\n');
    await writeFile(join(dir, 'wiki', '90_system', 'notes.txt'), 'md 아님\n');
    const ruled = await wikiSources(dir, 'chad', 'x', { at: AT });
    assert.deepEqual(ruled.rules, ['wiki/90_system/compile-rules.md', 'wiki/90_system/templates/entry.md']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('wiki sources: is read-only and summary ignores wiki/', async () => {
  const { dir } = await repoWithLandedTask({ subject: 'merge: x (#12)' });
  try {
    const before = (await cli(dir, 'summary')).stdout;
    await mkdir(join(dir, 'wiki', '99_inbox'), { recursive: true });
    await writeFile(join(dir, 'wiki', '99_inbox', 'x.md'),
      '<!-- harness:wiki task=chad/x pr=12 commit=abc1234 author=chad at=2026-10-01 -->\n# x\n');
    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-qm', 'wiki');

    await cli(dir, 'wiki', 'sources', 'chad/x');
    await cli(dir, 'wiki', 'sources', 'chad/x', '--json');
    assert.equal(await git(dir, 'status', '--porcelain', '--untracked-files=all'), '', 'wiki sources 는 아무 파일도 쓰지 않는다');
    assert.equal((await cli(dir, 'summary')).stdout, before, 'summary 렌더는 wiki/ 유무와 무관하다');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// dogfood: 이 저장소의 wiki/ 가 #134·#133 을 컴파일한 결과를 담고 있다. 출처는 저장소 자신의 first-parent 이력에서
// 추론된다 — CI 는 fetch-depth 0 이라 이력이 있다(.github/workflows/test.yml).
test('wiki dogfood: this repository compiled #134 and #133', async () => {
  for (const [task, pr, file] of [
    ['default-loop-skill', 134, 'wiki/20_domain/default-loop.md'],
    ['r2-scenario-evidence', 133, 'wiki/20_domain/review-gates.md'],
  ]) {
    const out = await wikiSources(ROOT, 'chad', task, { at: AT });
    assert.equal(out.provenance.pr, pr, task);
    assert.deepEqual(out.compiled, [file], task);
    assert.deepEqual(out.rules, ['wiki/90_system/compile-rules.md']);
  }
});

test('wiki sources: a shallow clone is blocked instead of guessing provenance', async () => {
  const { dir } = await repoWithLandedTask({ subject: 'merge: x (#12)' });
  const clone = await mkdtemp(join(tmpdir(), 'harness-wiki-shallow-'));
  try {
    // 깊이 1: 머지 커밋 하나만 받는다 — 이력이 잘려 있어 들여온 커밋을 확정할 수 없다.
    await pexec('git', ['clone', '-q', '--depth', '1', `file://${dir}`, clone]);
    const out = await wikiSources(clone, 'chad', 'x', { at: AT });
    assert.ok(out.blockers.includes('shallow-history'), JSON.stringify(out.blockers));
    assert.equal(out.marker, null);
    // 같은 저장소의 전체 이력에서는 막히지 않는다 — 막힘은 얕은 이력 때문이다.
    assert.deepEqual((await wikiSources(dir, 'chad', 'x', { at: AT })).blockers, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(clone, { recursive: true, force: true });
  }
});

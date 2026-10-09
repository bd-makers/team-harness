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

// 기본 브랜치에서 task 폴더를 다시 건드리는 종결 커밋(`done`이 meta를 바꾸는 자리)을 하나 더 쌓는다.
async function closeOnMain(dir) {
  const metaPath = join(dir, 'docs', 'chad', 'x', 'x-meta.json');
  await writeFile(metaPath, JSON.stringify({ user: 'chad', task: 'x', status: 'done', closedAt: '2026-10-08T00:00:00Z' }, null, 2) + '\n');
  await git(dir, 'commit', '-qam', 'chore(task): x 종결');
  return (await git(dir, 'rev-parse', 'HEAD')).slice(0, 7);
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

// PR 없이 기본 브랜치에 직접 커밋하는 저장소에는 `--pr`에 넣을 번호가 없다 — 막으면 그 저장소는 컴파일을 영영 못 한다.
test('wiki sources: without a PR number the marker cites the closing commit', async () => {
  const { dir, sha7: landed } = await repoWithLandedTask({ subject: "Merge branch 'feature'" });
  try {
    // 직접 커밋 저장소에서 들여온 커밋은 spec 초안이다 — 출처는 task 폴더를 마지막으로 건드린 종결 커밋이어야 한다.
    const sha7 = await closeOnMain(dir);
    assert.notEqual(sha7, landed);
    const out = JSON.parse((await cli(dir, 'wiki', 'sources', 'chad/x', '--json')).stdout);
    assert.deepEqual(out.blockers, []);
    assert.equal(out.status, 'success');
    assert.deepEqual(out.provenance, { pr: null, commit: sha7, author: 'chad' });
    assert.match(out.marker, new RegExp(`^<!-- harness:wiki task=chad/x commit=${sha7} author=chad at=\\d{4}-\\d{2}-\\d{2} -->$`));
    assert.equal(out.summary, '컴파일 가능 (PR 없음 — 커밋 출처)');
    assert.equal(wikiMarker({ task: 'chad/x', pr: null, commit: sha7, author: 'chad', at: AT }),
      `<!-- harness:wiki task=chad/x commit=${sha7} author=chad at=${AT} -->`);

    const { stdout } = await cli(dir, 'wiki', 'sources', 'chad/x');
    assert.match(stdout, /^ {2}note: PR 번호 없음 — 커밋 출처로 마커를 만든다\. PR로 들여온 task라면 번호를 확인해 `--pr <N>`으로 다시 실행$/m);
    assert.doesNotMatch(stdout, /✗/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// PR 출처의 커밋은 종결 커밋이 뒤에 있어도 들여온 커밋(머지·squash) 그대로다 — `--pr`든 커밋 메시지 추론이든.
test('wiki sources: --pr overrides the commit-only provenance', async () => {
  const { dir, sha7 } = await repoWithLandedTask({ subject: "Merge branch 'feature'" });
  try {
    const closing = await closeOnMain(dir);
    // 같은 저장소의 `--pr` 없는 첫 실행은 막힘이 아니라 커밋 출처다(종결된 wiki-compile S3의 첫 실행 증거).
    const first = await wikiSources(dir, 'chad', 'x', { at: AT });
    assert.deepEqual(first.blockers, []);
    assert.deepEqual(first.provenance, { pr: null, commit: closing, author: 'chad' });
    assert.equal(first.marker, `<!-- harness:wiki task=chad/x commit=${closing} author=chad at=${AT} -->`);

    const out = JSON.parse((await cli(dir, 'wiki', 'sources', 'chad/x', '--pr', '9', '--json')).stdout);
    assert.equal(out.provenance.pr, 9);
    assert.equal(out.provenance.commit, sha7, '--pr 는 번호만 바꾸고 커밋은 들여온 커밋으로 추론한다');
    assert.equal(out.summary, '컴파일 가능');
    assert.match(out.marker, new RegExp(`^<!-- harness:wiki task=chad/x pr=9 commit=${sha7} author=chad at=\\d{4}-\\d{2}-\\d{2} -->$`));
    const { stdout } = await cli(dir, 'wiki', 'sources', 'chad/x', '--pr', '9');
    assert.doesNotMatch(stdout, /note:/, 'PR 출처의 텍스트 출력은 종전 그대로다');

    const bad = await cli(dir, 'wiki', 'sources', 'chad/x', '--pr', 'abc').then(() => null, e => e);
    assert.equal(bad?.code, 2, '--pr 는 양의 정수만 받는다');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  const inferred = await repoWithLandedTask({ subject: 'merge: x (#12)' });
  try {
    await closeOnMain(inferred.dir);
    const out = await wikiSources(inferred.dir, 'chad', 'x', { at: AT });
    assert.deepEqual(out.provenance, { pr: 12, commit: inferred.sha7, author: 'chad' }, '추론한 PR 의 커밋도 들여온 커밋이다');
  } finally {
    await rm(inferred.dir, { recursive: true, force: true });
  }
});

// 멱등 키는 `task=` 뿐이다 — 커밋 출처로 컴파일한 뒤 PR 번호가 생겨도 같은 단락으로 잡혀 재컴파일이 그 단락을 교체한다.
test('wiki sources: a commit-only marker still counts as compiled when a PR number arrives later', async () => {
  const { dir, sha7 } = await repoWithLandedTask({ subject: "Merge branch 'feature'" });
  try {
    await mkdir(join(dir, 'wiki', '99_inbox'), { recursive: true });
    await writeFile(join(dir, 'wiki', '99_inbox', 'x.md'),
      `# x\n\n<!-- harness:wiki task=chad/x commit=${sha7} author=chad at=2026-10-01 -->\n## x\n본문\n`);
    const out = await wikiSources(dir, 'chad', 'x', { pr: 9, at: AT });
    assert.deepEqual(out.compiled, ['wiki/99_inbox/x.md']);
    assert.deepEqual(out.blockers, []);
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

test('wiki sources: fenced examples inside blockquotes and list items are not compiled markers', async () => {
  const { dir } = await repoWithLandedTask({ subject: 'merge: x (#12)' });
  try {
    await mkdir(join(dir, 'wiki', '20_domain'), { recursive: true });
    await mkdir(join(dir, 'wiki', '90_system'), { recursive: true });
    // 작성 규칙 문서가 마커 형식을 인용문·목록 안의 펜스로 예시한다 — 컴파일 흔적이 아니다.
    await writeFile(join(dir, 'wiki', '90_system', 'rules.md'),
      '# 규칙\n\n> 예시:\n>\n> ```markdown\n> <!-- harness:wiki task=chad/x pr=12 commit=abc1234 author=chad at=2026-10-01 -->\n> ```\n\n'
      + '- 단락 규칙\n  - 마커 예시\n    ~~~\n    <!-- harness:wiki task=chad/x pr=12 commit=abc1234 author=chad at=2026-10-01 -->\n    ~~~\n');
    let out = await wikiSources(dir, 'chad', 'x', { at: AT });
    assert.deepEqual(out.compiled, []);
    // 펜스 밖의 실제 마커는 여전히 센다.
    await writeFile(join(dir, 'wiki', '20_domain', 'feature.md'),
      '# feature\n\n<!-- harness:wiki task=chad/x pr=12 commit=abc1234 author=chad at=2026-10-01 -->\n## x\n본문\n');
    out = await wikiSources(dir, 'chad', 'x', { at: AT });
    assert.deepEqual(out.compiled, ['wiki/20_domain/feature.md']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  const tasks = text => wikiMarkersIn(text).map(m => m.task);
  // 중첩 인용문 · 목록 표지와 같은 줄의 펜스.
  assert.deepEqual(tasks('> > ~~~\n> > <!-- harness:wiki task=a/b -->\n> > ~~~\n'), []);
  assert.deepEqual(tasks('1. ```markdown\n   <!-- harness:wiki task=a/b -->\n   ```\n<!-- harness:wiki task=a/c -->\n'), ['a/c']);
  // 인용문 안에서 닫히지 않은 펜스는 인용문이 끝날 때 함께 끝난다 — 뒤의 실제 마커를 삼키지 않는다.
  assert.deepEqual(tasks('> ```\n> <!-- harness:wiki task=a/b -->\n\n<!-- harness:wiki task=a/c -->\n'), ['a/c']);
  // 펜스 밖의 인용문 안 마커는 실제 마커다.
  assert.deepEqual(tasks('> <!-- harness:wiki task=a/d -->\n'), ['a/d']);
  // 맨 위 펜스 안의 4칸 들여쓴 백틱은 닫는 펜스가 아니다(기존 동작 유지).
  assert.deepEqual(tasks('```\n    ```\n<!-- harness:wiki task=a/b -->\n```\n'), []);
  // 맨 위 4칸 들여쓰기는 들여쓴 코드지 여는 펜스가 아니다 — 뒤의 실제 마커를 삼키지 않는다.
  assert.deepEqual(tasks('    ```\n<!-- harness:wiki task=a/c -->\n'), ['a/c']);
  // 목록 항목 안 펜스의 빈 줄은 펜스를 닫지 않는다.
  assert.deepEqual(tasks('- a\n  ```\n  <!-- harness:wiki task=a/b -->\n\n  x\n  ```\n<!-- harness:wiki task=a/c -->\n'), ['a/c']);
  // 맨 위 4칸 들여쓴 목록 표지도 들여쓴 코드다 — 표지 뒤 펜스를 열지 않는다(codex R3 P2).
  assert.deepEqual(tasks('    - ~~~\n<!-- harness:wiki task=a/c -->\n'), ['a/c']);
  // 닫는 펜스 들여쓰기는 컨테이너 기준이다 — 1칸 여는 펜스 뒤 4칸 백틱은 내용이다(codex R3 P2).
  assert.deepEqual(tasks(' ```\n    ```\n<!-- harness:wiki task=a/b -->\n```\n'), []);
  // 목록 항목보다 내어 쓴 줄은 항목과 그 안의 펜스를 끝낸다 — 맨 위 백틱은 새 펜스를 연다(codex R3 재검 P2).
  assert.deepEqual(tasks('- ```\n  x\n```\n<!-- harness:wiki task=a/b -->\n```\n<!-- harness:wiki task=a/c -->\n'), ['a/c']);
  // 표지 뒤 5칸 이상 공백은 들여쓴 코드다 — 펜스를 열지 않는다(codex R3 재검 P2).
  assert.deepEqual(tasks('-     ~~~\n<!-- harness:wiki task=a/c -->\n'), ['a/c']);
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
// 추론된다 — CI 는 fetch-depth 0 이라 이력이 있다(test.yml·release.yml). 얕은 클론에서는 `wiki sources`가
// shallow-history 로 막으므로 출처를 판정할 수 없다 — 이력 완전성 테스트(migrate-templates·migrate-hooks)와 같이 건너뛴다.
test('wiki dogfood: this repository compiled #134 and #133', async (t) => {
  const { stdout: shallow } = await pexec('git', ['rev-parse', '--is-shallow-repository'], { cwd: ROOT });
  if (shallow.trim() === 'true') return t.skip('얕은 클론 — 출처 추론 불가');
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

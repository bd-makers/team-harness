import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  runDone, taskArtifactTemplate, taskPlanTemplate, taskSpecTemplate, parsePorcelainPaths,
  parseDoneEvidenceDeclaration, classifyChangedPaths, parseReviewMarkers, DONE_EVIDENCE_DEFAULT,
  VERIFY_KIND_SUFFIXES,
} from '../src/commands/task.mjs';

const pexec = promisify(execFile);

// Fixtures are plain tmpdirs (NOT git repos), so the git-based checks degrade and
// are skipped — done-guard then judges on plan/artifact signals deterministically.
async function makeFixture({ plan, artifact } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-done-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(
    join(dir, '.harness/active.json'),
    JSON.stringify({ user: 'tester', task: 'demo', path: 'docs/tester/demo' }),
  );
  const taskDir = join(dir, 'docs', 'tester', 'demo');
  await mkdir(taskDir, { recursive: true });
  await writeFile(join(taskDir, 'demo-handoff.md'), '# demo — Handoff\n');
  if (plan !== undefined) await writeFile(join(taskDir, 'demo-plan.md'), plan);
  if (artifact !== undefined) await writeFile(join(taskDir, 'demo-artifact.md'), artifact);
  return { dir, taskDir };
}

function captureLogs() {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  return { logs, restore: () => { console.log = orig; } };
}

test('미완 plan + 빈 artifact → 차단: exitCode=1, mutation 없음', async () => {
  const { dir, taskDir } = await makeFixture({
    plan: '# demo — Plan\n\n## 단계\n- [ ] 미완\n',
    artifact: taskArtifactTemplate('demo'),
  });
  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    assert.equal(process.exitCode, 1, 'exitCode should be 1');
    assert.ok(logs.some(l => l.startsWith('✗ done:')), 'status line');
    assert.ok(logs.some(l => l.startsWith('cause:')), 'cause hint');
    assert.ok(logs.some(l => l.startsWith('retry:')), 'retry hint');
    assert.ok(logs.some(l => l.startsWith('stop:')), 'stop condition');
    assert.ok(logs.some(l => l.includes('--force')), 'mentions --force escape hatch');

    // active.json must still exist (not nulled) and handoff must not get a 완료 entry
    await stat(join(dir, '.harness/active.json')); // throws if removed/nulled-out incorrectly
    const active = JSON.parse(await readFile(join(dir, '.harness/active.json'), 'utf8'));
    assert.ok(active && active.task === 'demo', 'active task unchanged');
    const handoff = await readFile(join(taskDir, 'demo-handoff.md'), 'utf8');
    assert.ok(!handoff.includes('완료'), 'handoff not mutated');
  } finally {
    restore();
    process.exitCode = prevExit;
    await rm(dir, { recursive: true, force: true });
  }
});

test('--force → 경고만 하고 진행: done 처리됨', async () => {
  const { dir, taskDir } = await makeFixture({
    plan: '# demo — Plan\n\n## 단계\n- [ ] 미완\n',
    artifact: taskArtifactTemplate('demo'),
  });
  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: { force: true } });
    assert.ok(logs.some(l => l.startsWith('⚠️')), 'warns instead of blocking');
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds to done');

    // active.json nulled out, handoff appended with 완료
    const active = JSON.parse(await readFile(join(dir, '.harness/active.json'), 'utf8'));
    assert.equal(active, null, 'active cleared');
    const handoff = await readFile(join(taskDir, 'demo-handoff.md'), 'utf8');
    assert.ok(handoff.includes('완료'), 'handoff mutated');
  } finally {
    restore();
    process.exitCode = prevExit;
    await rm(dir, { recursive: true, force: true });
  }
});

test('완료된 plan + 채워진 artifact → 가드 통과 (non-git, git 체크 skip)', async () => {
  const { dir } = await makeFixture({
    plan: '# demo — Plan\n\n## 단계\n- [x] 완료\n',
    artifact: taskArtifactTemplate('demo') + '\n- 실제 결과 기록\n',
  });
  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds to done');
    assert.ok(!logs.some(l => l.startsWith('✗ done:')), 'no block');
    const active = JSON.parse(await readFile(join(dir, '.harness/active.json'), 'utf8'));
    assert.equal(active, null, 'active cleared');
  } finally {
    restore();
    process.exitCode = prevExit;
    await rm(dir, { recursive: true, force: true });
  }
});

test('artifact.md 없음 → 차단 사유에 포함', async () => {
  const { dir } = await makeFixture({
    plan: taskPlanTemplate('demo').replace('- [ ]', '- [x] done'),
    // no artifact.md
  });
  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    assert.equal(process.exitCode, 1);
    assert.ok(logs.some(l => l.includes('artifact.md가 없음')), 'flags missing artifact');
  } finally {
    restore();
    process.exitCode = prevExit;
    await rm(dir, { recursive: true, force: true });
  }
});

test('git 레포에 커밋이 0개면 차단 사유에 포함 (HEAD-less repo)', async () => {
  const { dir, taskDir } = await makeFixture({
    plan: '# demo — Plan\n\n## 단계\n- [x] done\n',
    artifact: taskArtifactTemplate('demo') + '\n- 실제 결과\n', // plan/artifact pass → only git signals remain
  });
  // git repo with NO commits at all → `git log` is HEAD-less.
  await pexec('git', ['-C', dir, 'init', '-q']);
  // 판정 창이 있어야 커밋 0개 체크가 돈다 — 창의 기준은 meta.firstActivatedAt이다.
  await writeFile(join(taskDir, 'demo-meta.json'), JSON.stringify({
    user: 'tester', task: 'demo', created: '2026-08-25',
    firstActivatedAt: new Date().toISOString(), status: 'open', closedAt: null,
  }, null, 2) + '\n');

  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    assert.equal(process.exitCode, 1, 'blocks');
    assert.ok(logs.some(l => l.includes('커밋이 0개')), 'flags zero commits');
  } finally {
    restore();
    process.exitCode = prevExit;
    await rm(dir, { recursive: true, force: true });
  }
});

test('비-git 디렉토리는 git 체크를 skip (degradation, 오차단 없음)', async () => {
  // plan/artifact both pass; no git → guard must pass (no fabricated git issue).
  const { dir } = await makeFixture({
    plan: '# demo — Plan\n\n## 단계\n- [x] done\n',
    artifact: taskArtifactTemplate('demo') + '\n- 실제 결과\n',
  });
  const activePath = join(dir, '.harness/active.json');
  const active = JSON.parse(await readFile(activePath, 'utf8'));
  active.switchedAt = new Date().toISOString(); // present, but no git → must be ignored
  await writeFile(activePath, JSON.stringify(active));

  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds — git checks skipped');
    assert.ok(!logs.some(l => l.includes('커밋')), 'no fabricated commit issue');
  } finally {
    restore();
    process.exitCode = prevExit;
    await rm(dir, { recursive: true, force: true });
  }
});

test('no active task → 기존 동작 유지 (조기 return, 차단 아님)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-done-noactive-'));
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    assert.ok(logs.some(l => l === 'no active task'), 'keeps existing message');
  } finally {
    restore();
    await rm(dir, { recursive: true, force: true });
  }
});

// Set up a git repo fixture with one commit after switchedAt, so plan/artifact/zero-commit
// signals all pass and only the porcelain dirty check remains under test.
async function makeGitFixture() {
  const { dir, taskDir } = await makeFixture({
    plan: '# demo — Plan\n\n## 단계\n- [x] done\n',
    artifact: taskArtifactTemplate('demo') + '\n- 실제 결과\n',
  });
  await pexec('git', ['-C', dir, 'init', '-q']);
  await pexec('git', ['-C', dir, 'config', 'user.email', 'demo@test.io']);
  await pexec('git', ['-C', dir, 'config', 'user.name', 'demo']);
  const activePath = join(dir, '.harness/active.json');
  const active = JSON.parse(await readFile(activePath, 'utf8'));
  active.switchedAt = new Date(Date.now() - 60_000).toISOString();
  await writeFile(activePath, JSON.stringify(active));
  await pexec('git', ['-C', dir, 'add', '-A']);
  await pexec('git', ['-C', dir, 'commit', '-q', '-m', 'work']);
  return { dir, taskDir };
}

test('handoff 파일만 미커밋이면 가드 통과 (post-commit 훅 마찰 제거)', async () => {
  const { dir, taskDir } = await makeGitFixture();
  // 훅이 하듯 handoff만 더럽힌다 — 실제 작업 변경은 없음.
  await writeFile(join(taskDir, 'demo-handoff.md'), '# demo — Handoff\n\n## hook entry\n');
  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds — handoff-only dirty excluded');
    assert.ok(!logs.some(l => l.includes('커밋되지 않은 변경')), 'no uncommitted-change block');
    const active = JSON.parse(await readFile(join(dir, '.harness/active.json'), 'utf8'));
    assert.equal(active, null, 'active cleared');
  } finally {
    restore();
    process.exitCode = prevExit;
    await rm(dir, { recursive: true, force: true });
  }
});

test('handoff 외 실제 변경이 미커밋이면 여전히 차단', async () => {
  const { dir, taskDir } = await makeGitFixture();
  await writeFile(join(taskDir, 'demo-handoff.md'), '# demo — Handoff\n\n## hook entry\n');
  await writeFile(join(dir, 'src-change.txt'), 'real uncommitted work\n');
  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    assert.equal(process.exitCode, 1, 'blocks on real uncommitted work');
    assert.ok(logs.some(l => l.includes('커밋되지 않은 변경')), 'flags uncommitted change');
  } finally {
    restore();
    process.exitCode = prevExit;
    await rm(dir, { recursive: true, force: true });
  }
});

test('parsePorcelainPaths: 상태접두/rename/quotepath 파싱', () => {
  assert.deepEqual(parsePorcelainPaths(' M docs/a.md\n?? b.txt\n'), ['docs/a.md', 'b.txt']);
  assert.deepEqual(parsePorcelainPaths('R  old.md -> new.md\n'), ['new.md']);
  assert.deepEqual(parsePorcelainPaths(' M "한글 경로.md"\n'), ['한글 경로.md']);
  assert.deepEqual(parsePorcelainPaths(''), []);
});

test('plan 본문 인라인/설명 텍스트의 `- [ ]`는 미완으로 카운트하지 않는다 (줄 시작만 검사)', async () => {
  const { dir } = await makeFixture({
    // 실제 체크박스는 [x]. 인라인 코드 안의 `- [ ]` 리터럴은 미완이 아니다.
    plan: '# demo — Plan\n\n## 단계\n- [x] 가드는 인라인 `- [ ]` 를 미완으로 오인하면 안 된다\n',
    artifact: taskArtifactTemplate('demo') + '\n- 실제 결과\n',
  });
  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds — inline `- [ ]` not counted');
    assert.ok(!logs.some(l => l.includes('미완 체크박스')), 'no false positive on prose mention');
  } finally {
    restore();
    process.exitCode = prevExit;
    await rm(dir, { recursive: true, force: true });
  }
});

// ─── Done evidence: 선언 파싱 (순수 함수) ───────────────────────────────────

test('parseDoneEvidenceDeclaration: 선언 없음 → not-configured + 기본값', () => {
  const r = parseDoneEvidenceDeclaration('# spec\n\n## 참고\n');
  assert.deepEqual(r, { status: 'not-configured', ...DONE_EVIDENCE_DEFAULT });
  assert.equal(r.tests, 'required');
  assert.equal(r.review, 'optional');
});

test('parseDoneEvidenceDeclaration: spec 템플릿의 주석 처리된 예시는 미선언으로 취급', () => {
  // 템플릿은 선언을 <!-- --> 주석 안에 두므로, 벗기기 전에는 발동하면 안 된다.
  const r = parseDoneEvidenceDeclaration(taskSpecTemplate('demo'));
  assert.equal(r.status, 'not-configured');
});

test('parseDoneEvidenceDeclaration: 유효 선언 → configured + 부분 override', () => {
  const spec = '## Done evidence\n\n```json\n{ "version": 1, "review": "required" }\n```\n';
  const r = parseDoneEvidenceDeclaration(spec);
  assert.equal(r.status, 'configured');
  assert.equal(r.review, 'required');
  assert.equal(r.tests, 'required'); // 미지정 키는 기본값 유지
});

test('parseDoneEvidenceDeclaration: 깨진 선언은 invalid (조용한 폴백 금지)', () => {
  const broken = '## Done evidence\n```json\n{ not json\n```\n';
  assert.equal(parseDoneEvidenceDeclaration(broken).status, 'invalid');
  const noVersion = '## Done evidence\n```json\n{ "review": "required" }\n```\n';
  assert.equal(parseDoneEvidenceDeclaration(noVersion).status, 'invalid');
  const badValue = '## Done evidence\n```json\n{ "version": 1, "tests": "maybe" }\n```\n';
  assert.equal(parseDoneEvidenceDeclaration(badValue).status, 'invalid');
  const notObject = '## Done evidence\n```json\n[1]\n```\n';
  assert.equal(parseDoneEvidenceDeclaration(notObject).status, 'invalid');
});

test('parseDoneEvidenceDeclaration: 닫히지 않은 fence·미지 키도 invalid (fail-open 방지, codex 리뷰 P2)', () => {
  // 닫는 ``` 없음 — 선언을 쓰려던 흔적이므로 조용히 not-configured로 넘어가면 안 된다
  const unterminated = '## Done evidence\n```json\n{ "version": 1, "review": "required" }\n';
  assert.equal(parseDoneEvidenceDeclaration(unterminated).status, 'invalid');
  // 오타 키 — `rewiew`가 선언을 조용히 무력화하면 안 된다
  const typoKey = '## Done evidence\n```json\n{ "version": 1, "rewiew": "required" }\n```\n';
  assert.equal(parseDoneEvidenceDeclaration(typoKey).status, 'invalid');
});

// D6 4단계 — verify 키. review와 같은 required|optional 도메인이지만, 판정 시
// 검증 프레이밍 kind 접미사 allowlist를 대조하는 검증 전용 증거다.
test('parseDoneEvidenceDeclaration: verify 키 (기본 optional, 유효 선언, 잘못된 값은 invalid)', () => {
  assert.equal(parseDoneEvidenceDeclaration('# spec\n').verify, 'optional');
  const declared = '## Done evidence\n```json\n{ "version": 1, "verify": "required", "tests": "skip" }\n```\n';
  const d = parseDoneEvidenceDeclaration(declared);
  assert.equal(d.status, 'configured');
  assert.equal(d.verify, 'required');
  assert.equal(d.review, 'optional'); // 미지정 키는 기본값 유지
  const bad = '## Done evidence\n```json\n{ "version": 1, "verify": "always" }\n```\n';
  assert.equal(parseDoneEvidenceDeclaration(bad).status, 'invalid');
});

// ─── Done evidence: 변경 경로 분류 (순수 함수) ──────────────────────────────

test('classifyChangedPaths: 소스/테스트/문서 분류', () => {
  assert.deepEqual(classifyChangedPaths(['src/app.mjs']), { source: true, test: false });
  assert.deepEqual(classifyChangedPaths(['tests/app.test.mjs']), { source: false, test: true });
  assert.deepEqual(classifyChangedPaths(['docs/a.md', 'config.json']), { source: false, test: false });
  // 테스트 판정이 소스 판정보다 우선 — foo.test.ts는 소스로 세지 않는다
  assert.deepEqual(classifyChangedPaths(['foo.test.ts']), { source: false, test: true });
  // 언어별 파일명 관례
  assert.deepEqual(classifyChangedPaths(['pkg/foo_test.go']), { source: false, test: true });
  assert.deepEqual(classifyChangedPaths(['Sources/FooTests.swift']), { source: false, test: true });
  // 윈도우 구분자 정규화
  assert.deepEqual(classifyChangedPaths(['src\\app.ts']), { source: true, test: false });
  // git이 non-ASCII 경로를 C-quote로 감싼 경우 — 확장자가 `mjs"`로 오분류되면 안 된다 (codex 리뷰 P2)
  assert.deepEqual(classifyChangedPaths(['"docs/\\355\\225\\234.mjs"']), { source: true, test: false });
});

// 테스트 파일은 테스트 *코드*다. 이름·위치 관례만으로 문서를 테스트로 세면 "테스트 미작성"
// 가드가 죽는다 — 모든 task가 자기 `<name>-spec.md`를 커밋하기 때문이다.
test('classifyChangedPaths: 문서·설정은 이름·위치가 test/spec 관례여도 테스트가 아니다', () => {
  // 구멍 1 — basename 규칙의 `-spec.md`
  assert.deepEqual(classifyChangedPaths(['docs/chad/demo/demo-spec.md']), { source: false, test: false });
  // 구멍 2 — 디렉터리 규칙의 `specs/`. 구멍 1만 고치면 이 경로가 남는다
  assert.deepEqual(classifyChangedPaths(['docs/superpowers/specs/2026-04-23-design.md']), { source: false, test: false });
  // tests/ 아래여도 문서는 테스트 정의가 아니다
  assert.deepEqual(classifyChangedPaths(['tests/fixtures/stock-hooks/README.md']), { source: false, test: false });
  // 설정 파일도 마찬가지 — `test.yml`은 CI 설정이지 테스트가 아니다
  assert.deepEqual(classifyChangedPaths(['.github/workflows/test.yml']), { source: false, test: false });
  // 소스가 함께 바뀌어도 문서는 증거가 되지 않는다 — 이 줄이 무너지면 가드가 다시 죽는다
  assert.deepEqual(
    classifyChangedPaths(['src/app.mjs', 'docs/superpowers/specs/x.md']),
    { source: true, test: false },
  );
});

// 디렉터리 규칙은 basename 규칙보다 **강한** 신호다. 두 규칙에 같은 확장자 조건(코드 화이트리스트)을
// 걸면 `tests/foo.test.mts`·`tests/run-e2e`처럼 목록 밖 테스트가 증거에서 빠져 정직한 작업이
// 차단되고, 워커는 `--force`로 밀게 된다 — 가드가 죽는 것과 같은 결말이다 (codex 리뷰 P2).
test('classifyChangedPaths: tests/ 아래는 확장자가 화이트리스트 밖이어도 테스트다 (산문만 제외)', () => {
  assert.deepEqual(classifyChangedPaths(['tests/helpers/setup.mjs']), { source: false, test: true });
  assert.deepEqual(classifyChangedPaths(['tests/foo.test.mts']), { source: false, test: true });
  assert.deepEqual(classifyChangedPaths(['tests/e2e/login.feature']), { source: false, test: true });
  assert.deepEqual(classifyChangedPaths(['tests/run-e2e']), { source: false, test: true });
  assert.deepEqual(classifyChangedPaths(['tests/fixtures/case.json']), { source: false, test: true });
  // golden 파일 — `txt`를 산문 목록에 넣으면 fixture만 고친 정직한 작업이 차단된다
  assert.deepEqual(classifyChangedPaths(['tests/fixtures/expected.txt']), { source: false, test: true });
  // 반대로 tests/ 밖의 이름 관례는 **약한** 신호라 코드 확장자만 인정한다
  assert.deepEqual(classifyChangedPaths(['src/app.mts', 'src/app.test.mts']), { source: true, test: true });
  assert.deepEqual(classifyChangedPaths(['src/app.cts', 'src/app.test.cts']), { source: true, test: true });
  assert.deepEqual(classifyChangedPaths(['notes-spec.txt']), { source: false, test: false });
});

// dotfile의 **소스** 판정은 이 변경 이전과 동일하다. `dot > slash + 1`은 basename의 *마지막* 점을
// 봤으므로 `.eslintrc.js`는 예전에도 소스였다("숨김 파일은 소스가 아니었다"는 직관은 틀렸다).
// 비직관적이라 리뷰에서 회귀로 오인된 적이 있어 못 박아 둔다.
test('classifyChangedPaths: dotfile의 소스 판정은 변경 전과 동일하다', () => {
  assert.deepEqual(classifyChangedPaths(['.eslintrc.js']), { source: true, test: false });
  assert.deepEqual(classifyChangedPaths(['config/.babelrc.js']), { source: true, test: false });
  assert.deepEqual(classifyChangedPaths(['.prettierrc.mjs']), { source: true, test: false });
  // 점 하나뿐인 dotfile은 확장자가 없다 — 예전에도 지금도 소스가 아니다
  assert.deepEqual(classifyChangedPaths(['.env']), { source: false, test: false });
  assert.deepEqual(classifyChangedPaths(['foo/.env']), { source: false, test: false });
  // 단, `tests/` 아래 dotfile은 도구 설정이라 테스트 증거가 아니다 (이건 이 변경으로 바뀐 것)
  assert.deepEqual(classifyChangedPaths(['tests/.gitignore']), { source: false, test: false });
});

// 산문 판정을 빠져나가는 경로들 — 목록이 md 하나로 줄거나 정규화가 빠지면 여기서 걸린다.
test('classifyChangedPaths: tests/ 아래 산문·설정의 회피 경로도 테스트가 아니다', () => {
  // 산문 목록은 markdown 하나가 아니다
  assert.deepEqual(classifyChangedPaths(['tests/guide.rst']), { source: false, test: false });
  assert.deepEqual(classifyChangedPaths(['tests/notes.org']), { source: false, test: false });
  assert.deepEqual(classifyChangedPaths(['docs/specs/design.typ']), { source: false, test: false });
  // 대문자 확장자
  assert.deepEqual(classifyChangedPaths(['tests/GUIDE.MD']), { source: false, test: false });
  // 끝의 점 — 정규화가 없으면 "확장자 없는 파일"로 보여 산문 판정을 빠져나간다
  assert.deepEqual(classifyChangedPaths(['tests/README.md.']), { source: false, test: false });
  // dotfile은 도구 설정이지 테스트 정의가 아니다
  assert.deepEqual(classifyChangedPaths(['tests/.gitignore']), { source: false, test: false });
  // 소스와 함께 바뀌어도 증거가 되지 않는다 (가드가 통과하면 안 된다)
  assert.deepEqual(classifyChangedPaths(['src/app.ts', 'tests/.gitignore']), { source: true, test: false });
});

// ─── Done evidence: 리뷰 마커 파싱 (순수 함수) ──────────────────────────────

test('parseReviewMarkers: 유효 마커 파싱, 깨진 마커는 무시', () => {
  const artifact = [
    '## Reviews',
    '- 2026-08-20 codex: OK',
    '<!-- harness:review kind=codex scope=worktree tip=abc123 at=2026-08-20T09:00:00Z -->',
    '<!-- harness:review kind=codex-adversarial at="2026-08-21T10:00:00Z" -->',
    '<!-- harness:review kind=codex at=not-a-date -->', // 깨진 at → 무시
    '<!-- harness:review at=2026-08-21T10:00:00Z -->',  // kind 없음 → 무시
  ].join('\n');
  const markers = parseReviewMarkers(artifact);
  assert.equal(markers.length, 2);
  assert.equal(markers[0].kind, 'codex');
  assert.equal(markers[0].scope, 'worktree');
  assert.equal(markers[0].tip, 'abc123');
  assert.equal(markers[0].at, Date.parse('2026-08-20T09:00:00Z'));
  assert.equal(markers[1].kind, 'codex-adversarial'); // 따옴표 값 허용
  assert.equal(markers[1].scope, null);
});

test('parseReviewMarkers: 비-ISO8601 at은 무시 — Date.parse의 관대한 파싱 차단 (codex 리뷰 P2)', () => {
  // '9999'는 Date.parse로는 유효한 미래 시각이라 영구히 신선한 가짜 증거가 된다
  const artifact = '<!-- harness:review kind=codex at=9999 -->';
  assert.equal(parseReviewMarkers(artifact).length, 0);
});

// ─── Done evidence: 가드 통합 ───────────────────────────────────────────────

// makeGitFixture 위에 spec/추가 파일을 얹는 헬퍼. 커밋까지 마쳐 dirty 차단을 배제한다.
const ago = (ms) => new Date(Date.now() - ms).toISOString();

// 판정 창(evidence window)의 기준은 meta.firstActivatedAt이다. 새 하네스가 만든 task는
// 이 필드를 갖는다 — 기본값은 switchedAt과 같은 시각이라 기존 케이스의 판정이 변하지 않는다.
//   firstActivatedAt: null  → 필드 없는 구 task 재현(시각 비교 포기 경로)
//   switchedAt              → 재활성화 시각(가드가 더 이상 보지 않아야 하는 값)
//   commitDate              → 커밋을 백데이트해 "작업은 재활성화 이전에 끝났다"를 재현
async function makeEvidenceFixture({ spec, files = {}, firstActivatedAt, reopenedAt, switchedAt, commitDate } = {}) {
  const { dir, taskDir } = await makeFixture({
    plan: '# demo — Plan\n\n## 단계\n- [x] done\n',
    artifact: taskArtifactTemplate('demo') + '\n- 실제 결과\n',
  });
  if (spec !== undefined) await writeFile(join(taskDir, 'demo-spec.md'), spec);
  const first = firstActivatedAt === undefined ? ago(60_000) : firstActivatedAt;
  await writeFile(join(taskDir, 'demo-meta.json'), JSON.stringify({
    user: 'tester', task: 'demo', created: '2026-08-25',
    ...(first === null ? {} : { firstActivatedAt: first }),
    ...(reopenedAt === undefined ? {} : { reopenedAt }),
    status: 'open', closedAt: null,
  }, null, 2) + '\n');
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(dir, rel);
    await mkdir(join(abs, '..'), { recursive: true });
    await writeFile(abs, content);
  }
  await pexec('git', ['-C', dir, 'init', '-q']);
  await pexec('git', ['-C', dir, 'config', 'user.email', 'demo@test.io']);
  await pexec('git', ['-C', dir, 'config', 'user.name', 'demo']);
  const activePath = join(dir, '.harness/active.json');
  const active = JSON.parse(await readFile(activePath, 'utf8'));
  active.switchedAt = switchedAt ?? ago(60_000);
  await writeFile(activePath, JSON.stringify(active));
  await pexec('git', ['-C', dir, 'add', '-A']);
  // 커밋 이후에는 active.json/meta.json을 못 고친다 — dirty-tree 가드에 걸린다.
  // 시각 차이는 항상 분 단위 이상으로 둔다: `--since` 경계는 초 단위 동등에서 git 버전마다 다르다.
  const env = commitDate
    ? { ...process.env, GIT_AUTHOR_DATE: commitDate, GIT_COMMITTER_DATE: commitDate }
    : process.env;
  await pexec('git', ['-C', dir, 'commit', '-q', '-m', 'work'], { env });
  return { dir, taskDir };
}

async function runDoneCapture(dir, flags = {}) {
  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags });
    return { logs, exitCode: process.exitCode };
  } finally {
    restore();
    process.exitCode = prevExit;
  }
}

test('소스 변경 + 테스트 미변경 → 차단 (tests 기본 required)', async () => {
  const { dir } = await makeEvidenceFixture({ files: { 'src/app.mjs': 'export const x = 1;\n' } });
  try {
    const { logs, exitCode } = await runDoneCapture(dir);
    assert.equal(exitCode, 1, 'blocks');
    assert.ok(logs.some(l => l.includes('테스트 파일 변경이 없음')), 'flags missing tests');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 이 리포의 모든 task는 자기 `<name>-spec.md`를 커밋한다. 그 basename이 테스트 파일로
// 오분류되면 소스만 바꾸고 테스트를 한 줄도 안 써도 가드가 통과한다 — 가드가 이름만 남는다.
test('소스 변경 + 자기 spec.md만 동반 → 여전히 차단 (spec.md는 테스트 증거가 아니다)', async () => {
  const { dir } = await makeEvidenceFixture({
    spec: '# demo — Spec\n\n## 목적 / 요구사항\n- 데모\n',
    files: { 'src/app.mjs': 'export const x = 1;\n' },
  });
  try {
    const { logs, exitCode } = await runDoneCapture(dir);
    assert.equal(exitCode, 1, 'blocks — spec.md is not a test file');
    assert.ok(logs.some(l => l.includes('테스트 파일 변경이 없음')), 'flags missing tests');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 구멍 2 — 디렉터리 이름이 `specs/`인 문서. spec.md 규칙만 고치면 이 경로로 같은 오탐이 남는다.
test('소스 변경 + specs/ 하위 문서만 동반 → 여전히 차단 (디렉터리 이름은 테스트 증거가 아니다)', async () => {
  const { dir } = await makeEvidenceFixture({ files: {
    'src/app.mjs': 'export const x = 1;\n',
    'docs/superpowers/specs/2026-04-23-design.md': '# design\n',
  } });
  try {
    const { logs, exitCode } = await runDoneCapture(dir);
    assert.equal(exitCode, 1, 'blocks — a doc under specs/ is not a test file');
    assert.ok(logs.some(l => l.includes('테스트 파일 변경이 없음')), 'flags missing tests');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// codex 리뷰 P2 회귀 그물 — 화이트리스트 밖 확장자로 쓴 테스트도 증거로 인정되어야 한다.
// 이게 깨지면 가드가 정직한 작업을 막고 `--force`를 표준 절차로 만든다.
test('소스 변경 + tests/ 하위 비화이트리스트 확장자 테스트 → 통과', async () => {
  const { dir } = await makeEvidenceFixture({ files: {
    'src/app.ts': 'export const x = 1;\n',
    'tests/app.test.mts': 'import "node:test";\n',
  } });
  try {
    const { logs } = await runDoneCapture(dir);
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds');
    assert.ok(!logs.some(l => l.includes('테스트 파일 변경이 없음')), 'no false positive');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('소스 변경 + 테스트 동반 → 통과', async () => {
  const { dir } = await makeEvidenceFixture({ files: {
    'src/app.mjs': 'export const x = 1;\n',
    'tests/app.test.mjs': 'import "node:test";\n',
  } });
  try {
    const { logs } = await runDoneCapture(dir);
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds');
    assert.ok(!logs.some(l => l.includes('테스트 파일 변경이 없음')), 'no false positive');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('문서만 변경된 task는 테스트 체크 미발동', async () => {
  const { dir } = await makeEvidenceFixture({ files: { 'docs/note.md': '# note\n' } });
  try {
    const { logs } = await runDoneCapture(dir);
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds — no source change');
    assert.ok(!logs.some(l => l.includes('테스트 파일 변경이 없음')), 'check not triggered');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('spec이 tests: skip 선언 → 소스만 바뀌어도 통과', async () => {
  const spec = '# demo — Spec\n\n## Done evidence\n\n```json\n{ "version": 1, "tests": "skip" }\n```\n';
  const { dir } = await makeEvidenceFixture({ spec, files: { 'src/app.mjs': 'export const x = 1;\n' } });
  try {
    const { logs } = await runDoneCapture(dir);
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds — declared skip');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('review: required + 마커 없음 → 차단', async () => {
  const spec = '# demo — Spec\n\n## Done evidence\n\n```json\n{ "version": 1, "review": "required", "tests": "skip" }\n```\n';
  const { dir } = await makeEvidenceFixture({ spec });
  try {
    const { logs, exitCode } = await runDoneCapture(dir);
    assert.equal(exitCode, 1, 'blocks');
    assert.ok(logs.some(l => l.includes('리뷰 마커가 artifact에 없음')), 'flags missing review');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('review: required + task 기간 내 마커 → 통과', async () => {
  const spec = '# demo — Spec\n\n## Done evidence\n\n```json\n{ "version": 1, "review": "required", "tests": "skip" }\n```\n';
  // 마커는 fixture 커밋 전에 artifact에 넣는다 — 커밋 후 수정하면 dirty-tree 가드에 걸린다.
  const marker = `<!-- harness:review kind=codex scope=worktree tip=none at=${new Date().toISOString()} -->`;
  const { dir } = await makeEvidenceFixture({ spec, files: {
    'docs/tester/demo/demo-artifact.md': taskArtifactTemplate('demo') + `\n- 실제 결과\n\n${marker}\n`,
  } });
  try {
    const { logs } = await runDoneCapture(dir);
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds — fresh marker found');
    assert.ok(!logs.some(l => l.includes('리뷰 마커')), 'no review issue');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('이전 task 기간의 마커(at < 판정 창 시작)는 무효 → 차단', async () => {
  const spec = '# demo — Spec\n\n## Done evidence\n\n```json\n{ "version": 1, "review": "required", "tests": "skip" }\n```\n';
  const stale = new Date(Date.now() - 3_600_000).toISOString(); // switchedAt(-60s)보다 과거
  const { dir } = await makeEvidenceFixture({ spec, files: {
    'docs/tester/demo/demo-artifact.md':
      taskArtifactTemplate('demo') + `\n- 실제 결과\n\n<!-- harness:review kind=codex at=${stale} -->\n`,
  } });
  try {
    const { logs, exitCode } = await runDoneCapture(dir);
    assert.equal(exitCode, 1, 'blocks — marker predates this task');
    assert.ok(logs.some(l => l.includes('리뷰 마커가 artifact에 없음')), 'stale marker rejected');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

const REVIEW_ONLY_SPEC =
  '# demo — Spec\n\n## Done evidence\n\n```json\n{ "version": 1, "review": "required", "tests": "skip" }\n```\n';

// 이 task(done-guard-window)의 핵심 재현. `done`은 활성 task만 대상이라 끝난 task를 닫으려면
// 재활성화해야 하는데, 그 재활성화가 switchedAt을 현재 시각으로 밀어 원래 창의 증거를 밖으로 냈다.
// 판정 창이 firstActivatedAt 기준이면 재활성화는 창을 건드리지 못한다.
test('재활성화해도 원래 작업 구간의 증거가 인정된다 (창 = firstActivatedAt)', async () => {
  const { dir } = await makeEvidenceFixture({
    spec: REVIEW_ONLY_SPEC,
    firstActivatedAt: ago(2 * 3_600_000), // task 작업 시작: 2시간 전
    switchedAt: ago(60_000),              // 종결하려고 방금 재활성화
    commitDate: ago(90 * 60_000),         // 실제 작업 커밋: 재활성화 이전
    files: {
      'docs/tester/demo/demo-artifact.md':
        taskArtifactTemplate('demo') + `\n- 실제 결과\n\n<!-- harness:review kind=codex at=${ago(80 * 60_000)} -->\n`,
    },
  });
  try {
    const { logs } = await runDoneCapture(dir);
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds — 재활성화가 증거를 무효화하지 않는다');
    assert.ok(!logs.some(l => l.includes('리뷰 마커')), '리뷰 마커 오탐 없음');
    assert.ok(!logs.some(l => l.includes('커밋이 0개')), '커밋 0개 오탐 없음');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 창을 넓힌 대가로 진짜 누락까지 통과시키면 실패다(spec 요구사항 2). 아래 두 개가 그 그물이다.
test('창이 넓어져도 창 안에 리뷰 마커가 없으면 여전히 차단', async () => {
  const { dir } = await makeEvidenceFixture({
    spec: REVIEW_ONLY_SPEC,
    firstActivatedAt: ago(2 * 3_600_000),
  });
  try {
    const { logs, exitCode } = await runDoneCapture(dir);
    assert.equal(exitCode, 1, 'blocks');
    assert.ok(logs.some(l => l.includes('리뷰 마커가 artifact에 없음')), '리뷰 누락은 계속 잡는다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('창이 넓어져도 창 안에 테스트 변경이 없으면 여전히 차단', async () => {
  // spec 파일을 두지 않는다 — `demo-spec.md`의 basename이 test 경로 규칙(`-spec.md`)에
  // 걸려 테스트 변경으로 오분류되기 때문(이 task 범위 밖의 별개 결함, artifact에 기록).
  const { dir } = await makeEvidenceFixture({
    firstActivatedAt: ago(2 * 3_600_000),
    files: { 'src/app.mjs': 'export const x = 1;\n' },
  });
  try {
    const { logs, exitCode } = await runDoneCapture(dir);
    assert.equal(exitCode, 1, 'blocks');
    assert.ok(logs.some(l => l.includes('테스트 파일 변경이 없음')), '테스트 누락은 계속 잡는다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 완료가 만료되고(reopen) 다시 작업이 시작되면, 새 라운드의 완료는 **새 증거**로 판정해야 한다.
// 옛 firstActivatedAt을 그대로 창으로 쓰면 `git log --since`가 지난 라운드까지 훑어
// "커밋 0개" 가드가 사실상 통과 전용이 된다.
test('reopen된 task의 창은 reopenedAt에서 시작한다 — 만료 이전 커밋은 증거가 아니다', async () => {
  const { dir } = await makeEvidenceFixture({
    spec: REVIEW_ONLY_SPEC,
    firstActivatedAt: ago(4 * 3_600_000), // 첫 라운드 시작: 4시간 전
    reopenedAt: ago(30 * 60_000),         // 완료 만료(재개): 30분 전
    switchedAt: ago(30 * 60_000),
    commitDate: ago(2 * 3_600_000),       // 커밋은 지난 라운드의 것
  });
  try {
    const { logs, exitCode } = await runDoneCapture(dir);
    assert.equal(exitCode, 1, 'blocks');
    assert.ok(logs.some(l => l.includes('커밋이 0개')),
      `만료 이전 커밋을 새 라운드의 증거로 세면 안 된다: ${JSON.stringify(logs)}`);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('reopen 이후의 커밋은 새 라운드의 증거로 인정된다', async () => {
  const { dir } = await makeEvidenceFixture({
    spec: REVIEW_ONLY_SPEC,
    firstActivatedAt: ago(4 * 3_600_000),
    reopenedAt: ago(60 * 60_000),   // 만료: 1시간 전
    switchedAt: ago(60 * 60_000),
    commitDate: ago(30 * 60_000),   // 커밋: 만료 이후
    files: {
      'docs/tester/demo/demo-artifact.md':
        taskArtifactTemplate('demo') + `\n- 실제 결과\n\n<!-- harness:review kind=codex at=${ago(20 * 60_000)} -->\n`,
    },
  });
  try {
    const { logs } = await runDoneCapture(dir);
    assert.ok(logs.some(l => l.startsWith('done:')), `proceeds: ${JSON.stringify(logs)}`);
    assert.ok(!logs.some(l => l.includes('커밋이 0개')), '만료 이후 커밋은 증거다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 하위 호환: firstActivatedAt이 없는 기존 task는 창을 모른다. 다른 시각으로 대체하지 않고
// 시각 비교 자체를 포기한다(구 active.json에 switchedAt이 없을 때와 같은 degrade).
test('구 task(firstActivatedAt 없음) → 리뷰 마커는 존재만 확인', async () => {
  const { dir } = await makeEvidenceFixture({
    spec: REVIEW_ONLY_SPEC,
    firstActivatedAt: null,
    files: {
      'docs/tester/demo/demo-artifact.md':
        taskArtifactTemplate('demo') + `\n- 실제 결과\n\n<!-- harness:review kind=codex at=${ago(30 * 86_400_000)} -->\n`,
    },
  });
  try {
    const { logs } = await runDoneCapture(dir);
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds — 창을 모르면 시각 비교를 포기한다');
    assert.ok(!logs.some(l => l.includes('리뷰 마커')), '옛 마커라도 존재하면 통과');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('구 task(firstActivatedAt 없음) → 시각 기반 git 가드는 건너뜀', async () => {
  const { dir } = await makeEvidenceFixture({
    firstActivatedAt: null,
    files: { 'src/app.mjs': 'export const x = 1;\n' },
  });
  try {
    const { logs } = await runDoneCapture(dir);
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds — 구 task를 차단하지 않는다');
    assert.ok(!logs.some(l => l.includes('테스트 파일 변경이 없음')), '테스트 가드 건너뜀');
    assert.ok(!logs.some(l => l.includes('커밋이 0개')), '커밋 가드 건너뜀');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// `Date.parse('9999')`는 9999년으로, `'1'`은 2000-12-31로 성공한다. 형태 검사 없이 받으면
// 깨진 값이 degrade가 아니라 미래/과거로 어긋난 창이 된다 — 전자는 모든 커밋을 창 밖으로
// 밀어 전면 오탐, 후자는 리포 전체 이력을 창에 넣어 가드를 무력화한다.
test('firstActivatedAt이 ISO8601이 아니면 창으로 쓰지 않고 degrade한다', async () => {
  for (const bogus of ['9999', '1', 'yesterday']) {
    const { dir } = await makeEvidenceFixture({
      spec: REVIEW_ONLY_SPEC,
      firstActivatedAt: bogus,
      files: {
        'docs/tester/demo/demo-artifact.md':
          taskArtifactTemplate('demo') + `\n- 실제 결과\n\n<!-- harness:review kind=codex at=${ago(30 * 86_400_000)} -->\n`,
      },
    });
    try {
      const { logs } = await runDoneCapture(dir);
      assert.ok(logs.some(l => l.startsWith('done:')), `proceeds — ${bogus}는 창이 될 수 없다`);
      assert.ok(!logs.some(l => l.includes('커밋이 0개')), `${bogus}가 미래 창으로 해석되지 않는다`);
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
});

// 창 시작점이 깨졌을 때의 규칙: **더 넓지만 유효한 창으로 내려가고, 창을 아예 버리지 않는다.**
// 창이 null이면 리뷰 마커의 신선도 검사도 커밋·테스트 시각 가드도 전부 건너뛴다(fail-open) —
// 손상된 기계 상태가 가드를 무력화하면 안 된다. 유효한 firstActivatedAt이 남아 있으면 그것이
// 가장 약하지만 여전히 진짜인 창이다. (2026-09-06 Codex 리뷰 P2)
test('reopenedAt이 깨졌으면 firstActivatedAt 창으로 내려간다 (fail-open 금지)', async () => {
  const { dir } = await makeEvidenceFixture({
    spec: REVIEW_ONLY_SPEC,
    firstActivatedAt: ago(4 * 3_600_000),
    reopenedAt: 'not-a-date',
    switchedAt: ago(30 * 60_000),
    commitDate: ago(2 * 3_600_000),
    files: {
      // 리뷰 마커는 30일 전 — firstActivatedAt 창(4시간) 밖이다.
      'docs/tester/demo/demo-artifact.md':
        taskArtifactTemplate('demo') + `\n- 실제 결과\n\n<!-- harness:review kind=codex at=${ago(30 * 86_400_000)} -->\n`,
    },
  });
  try {
    const { logs, exitCode } = await runDoneCapture(dir);
    assert.equal(exitCode, 1, 'blocks — 창을 버리면 이 낡은 마커가 통과한다');
    assert.ok(logs.some(l => l.includes('리뷰 마커')), `창 밖 마커를 계속 잡아야 한다: ${JSON.stringify(logs)}`);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 내려갈 창조차 없을 때만 시각 비교를 포기한다 — 그 경우는 구 task와 구분되지 않는다.
test('reopenedAt·firstActivatedAt 둘 다 깨졌으면 그때 비로소 degrade한다', async () => {
  const { dir } = await makeEvidenceFixture({
    spec: REVIEW_ONLY_SPEC,
    firstActivatedAt: 'also-not-a-date',
    reopenedAt: 'not-a-date',
    switchedAt: ago(30 * 60_000),
    commitDate: ago(2 * 3_600_000),
    files: {
      'docs/tester/demo/demo-artifact.md':
        taskArtifactTemplate('demo') + `\n- 실제 결과\n\n<!-- harness:review kind=codex at=${ago(30 * 86_400_000)} -->\n`,
    },
  });
  try {
    const { logs } = await runDoneCapture(dir);
    assert.ok(logs.some(l => l.startsWith('done:')), `proceeds — 유효한 창이 하나도 없으면 시각 비교를 포기한다: ${JSON.stringify(logs)}`);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// ─── Done evidence: verify (검증 프레이밍 kind allowlist) — D6 4단계 ─────────

const VERIFY_SPEC =
  '# demo — Spec\n\n## Done evidence\n\n```json\n{ "version": 1, "verify": "required", "tests": "skip" }\n```\n';

// verify의 존재 이유: 일반 리뷰를 검증으로 오인 기록하는 것을 막는다. kind 비대조인
// review와 달리, 접미사 allowlist에 없는 마커는 있어도 증거가 아니다.
test('verify: required + 일반 리뷰 마커만 → 차단 (검증 프레이밍 kind가 아니다)', async () => {
  const { dir } = await makeEvidenceFixture({ spec: VERIFY_SPEC, files: {
    'docs/tester/demo/demo-artifact.md':
      taskArtifactTemplate('demo') + `\n- 실제 결과\n\n<!-- harness:review kind=codex at=${new Date().toISOString()} -->\n`,
  } });
  try {
    const { logs, exitCode } = await runDoneCapture(dir);
    assert.equal(exitCode, 1, 'blocks — plain review marker is not verify evidence');
    assert.ok(logs.some(l => l.includes('검증 마커가 artifact에 없음')), 'flags missing verify');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('verify: required + 창 내 검증 프레이밍 마커 → 통과 (allowlist 전 접미사)', async () => {
  for (const suffix of VERIFY_KIND_SUFFIXES) {
    const marker = `<!-- harness:review kind=codex-${suffix} scope=worktree tip=none at=${new Date().toISOString()} -->`;
    const { dir } = await makeEvidenceFixture({ spec: VERIFY_SPEC, files: {
      'docs/tester/demo/demo-artifact.md': taskArtifactTemplate('demo') + `\n- 실제 결과\n\n${marker}\n`,
    } });
    try {
      const { logs } = await runDoneCapture(dir);
      assert.ok(logs.some(l => l.startsWith('done:')), `proceeds — -${suffix} 마커 인정`);
      assert.ok(!logs.some(l => l.includes('검증 마커')), `-${suffix}: no verify issue`);
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
});

// 검증 마커도 리뷰 마커다(parseReviewMarkers가 모두 돌려준다) — 역만 성립하지 않는다.
test('verify 마커 하나가 review+verify 동시 required를 만족한다', async () => {
  const both =
    '# demo — Spec\n\n## Done evidence\n\n```json\n{ "version": 1, "review": "required", "verify": "required", "tests": "skip" }\n```\n';
  const marker = `<!-- harness:review kind=codex-adversarial at=${new Date().toISOString()} -->`;
  const { dir } = await makeEvidenceFixture({ spec: both, files: {
    'docs/tester/demo/demo-artifact.md': taskArtifactTemplate('demo') + `\n- 실제 결과\n\n${marker}\n`,
  } });
  try {
    const { logs } = await runDoneCapture(dir);
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds — one verify marker satisfies both');
    assert.ok(!logs.some(l => l.includes('리뷰 마커')) && !logs.some(l => l.includes('검증 마커')), 'no issue');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('창 밖(이전 task 기간)의 검증 마커는 무효 → 차단', async () => {
  const stale = new Date(Date.now() - 3_600_000).toISOString();
  const { dir } = await makeEvidenceFixture({ spec: VERIFY_SPEC, files: {
    'docs/tester/demo/demo-artifact.md':
      taskArtifactTemplate('demo') + `\n- 실제 결과\n\n<!-- harness:review kind=codex-adversarial at=${stale} -->\n`,
  } });
  try {
    const { logs, exitCode } = await runDoneCapture(dir);
    assert.equal(exitCode, 1, 'blocks — verify marker predates this task');
    assert.ok(logs.some(l => l.includes('검증 마커가 artifact에 없음')), 'stale verify marker rejected');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// verify 기본값은 optional — 미선언 task에 검증을 강제하면 --force 훈련이 된다(review와 같은 근거).
test('verify 미선언(기본 optional) → 검증 마커 없어도 미검사', async () => {
  const { dir } = await makeEvidenceFixture({ spec: REVIEW_ONLY_SPEC, files: {
    'docs/tester/demo/demo-artifact.md':
      taskArtifactTemplate('demo') + `\n- 실제 결과\n\n<!-- harness:review kind=codex at=${new Date().toISOString()} -->\n`,
  } });
  try {
    const { logs } = await runDoneCapture(dir);
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds');
    assert.ok(!logs.some(l => l.includes('검증 마커')), 'verify check not triggered');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// allowlist의 정본은 commands/harness-review.md 5단계 열거다(마커 계약 문서). src 상수가
// 문서와 어긋나면 가드가 문서에 없는 계약을 강제하거나 문서의 계약을 놓친다 — 양방향 대조.
test('VERIFY_KIND_SUFFIXES ↔ harness-review.md 접미사 열거 양방향 동기화', async () => {
  const doc = await readFile(new URL('../commands/harness-review.md', import.meta.url), 'utf8');
  for (const s of VERIFY_KIND_SUFFIXES) {
    assert.match(doc, new RegExp(`<engine>-${s}`), `문서 열거에 -${s} 존재`);
  }
  const enumerated = [...doc.matchAll(/<engine>-([a-z]+)/g)].map(m => m[1]);
  assert.ok(enumerated.length >= VERIFY_KIND_SUFFIXES.length, '문서 열거가 비어 있지 않다');
  for (const t of enumerated) {
    assert.ok(VERIFY_KIND_SUFFIXES.includes(t), `문서 열거 -${t}가 src allowlist에 존재`);
  }
});

test('Done evidence 선언이 깨져 있으면 그 자체가 차단 사유', async () => {
  const spec = '# demo — Spec\n\n## Done evidence\n\n```json\n{ broken\n```\n';
  const { dir } = await makeEvidenceFixture({ spec });
  try {
    const { logs, exitCode } = await runDoneCapture(dir);
    assert.equal(exitCode, 1, 'blocks');
    assert.ok(logs.some(l => l.includes('선언이 올바르지 않음')), 'invalid declaration reported');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// escalation packet (권고 ③) — 가드는 issue별 cause 줄을 유지하면서 대안과 무응답 시
// 남는 상태를 함께 준다. --force 안내는 stop_condition이 아니라 alternatives에 있다:
// stop은 "언제 멈춰야 하는가"이지 "어떻게 우회하는가"가 아니다.
test('done 가드: issue별 cause 줄을 보존하고 alternatives·default 줄을 낸다', async () => {
  // artifact 없음 + 미완 plan → 최소 2개 issue
  const { dir } = await makeFixture({ plan: '# demo — Plan\n\n## 단계\n- [ ] 미완\n' });
  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    const causes = logs.filter(l => l.startsWith('cause: '));
    assert.ok(causes.length >= 2, `issue마다 cause 줄 (got ${causes.length})`);
    const alternatives = logs.filter(l => l.startsWith('alternatives: '));
    assert.equal(alternatives.length, 1, 'alternatives 줄 1개');
    assert.match(alternatives[0], /--force/, '우회 경로는 alternatives에 있다');
    const defaults = logs.filter(l => l.startsWith('default: '));
    assert.equal(defaults.length, 1, 'default 줄 1개');
    const stops = logs.filter(l => l.startsWith('stop: '));
    assert.equal(stops.length, 1, 'stop 줄 1개');
    assert.doesNotMatch(stops[0], /--force/, 'stop은 우회 방법을 담지 않는다');
  } finally { restore(); process.exitCode = prevExit; await rm(dir, { recursive: true, force: true }); }
});

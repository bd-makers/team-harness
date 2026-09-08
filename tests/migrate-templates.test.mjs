import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve, dirname, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  refreshClaudeTemplates, REFRESHABLE_TEMPLATE_FILES, KNOWN_STOCK_TEMPLATE_SHA256,
} from '../src/commands/migrate.mjs';
import { copyStaticAssets } from '../src/harness.mjs';
import { execFileSync } from 'node:child_process';
import { symlink, lstat } from 'node:fs/promises';

// templates/의 스킬·규칙 수정이 기존 설치에 도달하는지 검증한다.
// copyStaticAssets는 skipExisting으로 복사하므로 migrate의 refreshClaudeTemplates가
// 유일한 배달 경로다 — 알려진 stock 버전(sha256)만 갱신, 커스터마이즈는 절대 보존.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(ROOT, 'tests/fixtures/stock-templates');
const TEMPLATES = join(ROOT, 'templates');

const sha256 = (body) => createHash('sha256').update(body).digest('hex');
const ctxFor = (dir) => ({ root: ROOT, targetDir: dir, flags: { yes: true } });
const tplBody = (rel) => readFile(join(TEMPLATES, rel), 'utf8');

async function walk(dir, base = dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p, base));
    else if (e.name.endsWith('.md')) out.push(relative(base, p));
  }
  return out;
}

async function plant(eraDir, rels) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-tplrefresh-'));
  for (const rel of rels) {
    const body = await readFile(join(eraDir, rel), 'utf8');
    await mkdir(dirname(join(dir, rel)), { recursive: true });
    await writeFile(join(dir, rel), body);
  }
  return dir;
}

test('KNOWN_STOCK_TEMPLATE_SHA256는 fixture의 실제 바이트와 일치한다 (테이블 드리프트 가드)', async () => {
  const eras = (await readdir(FIXTURES, { withFileTypes: true })).filter(e => e.isDirectory()).map(e => e.name);
  assert.ok(eras.length >= 3, `stock fixture era 디렉터리를 기대 — 실제: ${eras.join(', ')}`);
  let checked = 0;
  for (const era of eras) {
    for (const rel of await walk(join(FIXTURES, era))) {
      const body = await readFile(join(FIXTURES, era, rel), 'utf8');
      assert.ok((KNOWN_STOCK_TEMPLATE_SHA256[rel] || []).includes(sha256(body)),
        `${era}/${rel}의 sha256이 KNOWN_STOCK_TEMPLATE_SHA256에 없다 — fixture와 테이블이 어긋났다`);
      assert.notEqual(body, await tplBody(rel), `${era}/${rel}이 현재 템플릿과 같다 — stock fixture는 과거 버전이어야 한다`);
      checked++;
    }
  }
  assert.equal(checked, 20, `알려진 stock 버전 20개를 기대 — 실제: ${checked}`);
});

test('테이블의 모든 키가 REFRESHABLE_TEMPLATE_FILES에 있고, 현재 템플릿 sha는 테이블에 없다', async () => {
  for (const rel of Object.keys(KNOWN_STOCK_TEMPLATE_SHA256)) {
    assert.ok(REFRESHABLE_TEMPLATE_FILES.includes(rel), `${rel}이 refresh 목록에 없다`);
  }
  for (const rel of REFRESHABLE_TEMPLATE_FILES) {
    const cur = sha256(await tplBody(rel));
    assert.equal((KNOWN_STOCK_TEMPLATE_SHA256[rel] || []).includes(cur), false,
      `${rel}: 현재 템플릿 sha가 stock 테이블에 있다 — 갱신 후 테이블 정리를 빠뜨렸다`);
  }
});

// 이 task를 촉발한 실제 드리프트. 2026-09-07 이전 설치본은 Pocock 수직 슬라이스 규율이 없다.
test('수용 기준: Pocock 이전 new-feature 설치본 → refresh → Phase 3 수직 슬라이스 규율이 배달된다', async () => {
  const rel = '.claude/skills/new-feature/SKILL.md';
  const dir = await plant(join(FIXTURES, '2026-09-07-286ef8e9'), [rel]);
  try {
    const before = await readFile(join(dir, rel), 'utf8');
    assert.equal(before.includes('수직 슬라이스'), false, '재현 전제: 구버전에는 슬라이스 규율이 없다');

    assert.equal(await refreshClaudeTemplates(ctxFor(dir)), true);

    const after = await readFile(join(dir, rel), 'utf8');
    assert.equal(after, await tplBody(rel), '현재 템플릿으로 갱신돼야 한다');
    assert.match(after, /수직 슬라이스로 진행한다/, 'Phase 3 규율이 기존 설치에 도달해야 한다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('가장 오래된 stock 판(initial)도 스킬·규칙 전부 refresh 대상이다', async () => {
  const era = join(FIXTURES, '2026-04-16-6948aa73');
  const rels = await walk(era);
  const dir = await plant(era, rels);
  try {
    assert.equal(await refreshClaudeTemplates(ctxFor(dir)), true);
    for (const rel of rels) {
      assert.equal(await readFile(join(dir, rel), 'utf8'), await tplBody(rel), `${rel}은 현재 템플릿으로 갱신돼야 한다`);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('커스터마이즈된 스킬·규칙은 절대 덮지 않는다 — 나머지 stock만 refresh', async () => {
  const era = join(FIXTURES, '2026-04-16-6948aa73');
  const rels = await walk(era);
  const dir = await plant(era, rels);
  try {
    const customRel = '.claude/rules/testing.md';
    const custom = (await readFile(join(dir, customRel), 'utf8')) + '\n<!-- 팀 자체 규칙 -->\n';
    await writeFile(join(dir, customRel), custom);

    assert.equal(await refreshClaudeTemplates(ctxFor(dir)), true, '커스텀 1개를 빼고도 나머지는 refresh된다');
    assert.equal(await readFile(join(dir, customRel), 'utf8'), custom, '커스터마이즈된 파일은 바이트 그대로 보존');
    for (const rel of rels.filter(r => r !== customRel)) {
      assert.equal(await readFile(join(dir, rel), 'utf8'), await tplBody(rel));
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('현재 템플릿과 동일한 설치본 → false, 불변 (멱등)', async () => {
  const dir = await plant(TEMPLATES, REFRESHABLE_TEMPLATE_FILES);
  try {
    assert.equal(await refreshClaudeTemplates(ctxFor(dir)), false);
    for (const rel of REFRESHABLE_TEMPLATE_FILES) {
      assert.equal(await readFile(join(dir, rel), 'utf8'), await tplBody(rel));
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('미설치 프로젝트 → false (설치 없는 곳에 새로 깔지 않는다)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-tplrefresh-'));
  try {
    assert.equal(await refreshClaudeTemplates(ctxFor(dir)), false);
    assert.equal((await readdir(dir)).includes('.claude'), false, 'refresh가 .claude를 만들면 안 된다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// RN 전용 규칙 4종은 비-RN 프로젝트에 일부러 깔리지 않는다(copyStaticAssets의 stack 게이트).
// refresh가 "미설치는 건너뛴다"를 지키지 않으면 refresh가 그 게이트를 무력화한다.
test('refresh는 stack 게이트를 무력화하지 않는다 — 비-RN 프로젝트에 RN 규칙을 깔지 않는다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-tplrefresh-'));
  try {
    await copyStaticAssets({ root: ROOT, targetDir: dir, flags: { stack: 'node' } });
    const rnRules = REFRESHABLE_TEMPLATE_FILES.filter(r => r.startsWith('.claude/rules/'));
    for (const rel of rnRules) {
      assert.equal(await readFile(join(dir, rel), 'utf8').then(() => true, () => false), false,
        `${rel}은 node stack에 설치되지 않아야 한다 (재현 전제)`);
    }
    await refreshClaudeTemplates(ctxFor(dir));
    for (const rel of rnRules) {
      assert.equal(await readFile(join(dir, rel), 'utf8').then(() => true, () => false), false,
        `${rel}: refresh가 미설치 파일을 새로 깔았다`);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 이 refresh 경로가 존재하는 이유(전제)를 테스트로 고정한다.
// copyTree의 skipExisting은 파일 단위라 *신규* 템플릿은 도달하지만 *수정된* 템플릿은 도달하지 않는다.
test('전제: init 재실행(copyStaticAssets)은 수정된 템플릿을 배달하지 못한다', async () => {
  const rel = '.claude/skills/new-feature/SKILL.md';
  const dir = await plant(join(FIXTURES, '2026-09-07-286ef8e9'), [rel]);
  try {
    await copyStaticAssets({ root: ROOT, targetDir: dir, flags: {} });
    const after = await readFile(join(dir, rel), 'utf8');
    assert.notEqual(after, await tplBody(rel),
      'copyStaticAssets가 기존 파일을 갱신했다면 refresh 경로의 전제가 바뀐 것이다');
    assert.equal(after.includes('수직 슬라이스'), false);

    // 대조군: 같은 런에서 *신규* 파일(verify)은 도달한다 — 비대칭이 이 설계의 근거다.
    assert.equal(await readFile(join(dir, '.claude/skills/verify/SKILL.md'), 'utf8'),
      await tplBody('.claude/skills/verify/SKILL.md'),
      '신규 파일은 skipExisting을 통과해 도달해야 한다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// --- codex 리뷰(2026-09-08) 발견 재현 ---

// MAJOR: `.cursor/rules/*.mdc`는 `.claude/rules/*.md`에서 생성되는 별도 산출물이다.
// 미러를 다시 만들지 않으면 Claude만 새 규칙을 보고 Cursor는 옛 규칙을 계속 읽는데,
// doctor는 `.claude` 쪽만 보므로 정상으로 돌아와 드리프트가 숨는다.
test('codex MAJOR: 규칙 refresh는 .cursor 미러를 함께 재생성한다', async () => {
  const rel = '.claude/rules/testing.md';
  const dir = await plant(join(FIXTURES, '2026-04-16-6948aa73'), [rel]);
  try {
    // 미러를 옛 규칙 상태로 만들어 둔다
    await mkdir(join(dir, '.cursor/rules'), { recursive: true });
    await writeFile(join(dir, '.cursor/rules/testing.mdc'),
      await readFile(join(FIXTURES, '2026-04-16-6948aa73', rel), 'utf8'));

    assert.equal(await refreshClaudeTemplates(ctxFor(dir)), true);

    const mirror = await readFile(join(dir, '.cursor/rules/testing.mdc'), 'utf8');
    assert.match(mirror, /harness:rule origin=/, '미러도 최신 규칙을 반영해야 한다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// MAJOR: 판정과 쓰기 사이에 확인 프롬프트가 있다. leaf가 symlink면 링크 바깥 파일을 덮게 된다.
// 디렉터리 symlink(공식 구조)는 통과해야 하므로 둘을 함께 고정한다.
test('codex MAJOR: leaf 파일이 symlink면 쓰지 않는다 — 링크 바깥 파일 보존', async () => {
  const rel = '.claude/skills/new-feature/SKILL.md';
  const dir = await mkdtemp(join(tmpdir(), 'harness-tplrefresh-'));
  try {
    const outside = join(dir, 'outside.md');
    await writeFile(outside, await readFile(join(FIXTURES, '2026-09-07-286ef8e9', rel), 'utf8'));
    await mkdir(dirname(join(dir, rel)), { recursive: true });
    await symlink(outside, join(dir, rel));

    assert.equal(await refreshClaudeTemplates(ctxFor(dir)), false, '쓸 것이 없으면 false');
    assert.equal(await readFile(outside, 'utf8').then(b => b.includes('수직 슬라이스')), false,
      '링크 바깥 파일은 그대로여야 한다');
    assert.equal((await lstat(join(dir, rel))).isSymbolicLink(), true, 'symlink가 실제 파일로 바뀌면 안 된다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('codex MAJOR: 디렉터리 symlink(공식 구조)는 링크를 통해 정상 갱신된다', async () => {
  const rel = '.claude/skills/new-feature/SKILL.md';
  const dir = await mkdtemp(join(tmpdir(), 'harness-tplrefresh-'));
  try {
    const store = join(dir, 'store/new-feature');
    await mkdir(store, { recursive: true });
    await writeFile(join(store, 'SKILL.md'), await readFile(join(FIXTURES, '2026-09-07-286ef8e9', rel), 'utf8'));
    await mkdir(join(dir, '.claude/skills'), { recursive: true });
    await symlink(join(dir, 'store/new-feature'), join(dir, '.claude/skills/new-feature'));

    assert.equal(await refreshClaudeTemplates(ctxFor(dir)), true);
    assert.equal(await readFile(join(store, 'SKILL.md'), 'utf8'), await tplBody(rel),
      '링크를 통해 실제 파일이 갱신돼야 한다');
    assert.equal((await lstat(join(dir, '.claude/skills/new-feature'))).isSymbolicLink(), true, '링크 보존');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// MINOR: 테이블 → fixture 방향. 기존 가드는 fixture → 테이블만 봐서, 테이블에 근거 없는 sha를
// 추가해도 통과했다. 양방향을 다 걸어야 "배포한 적 있는 버전"이라는 주장이 유지된다.
test('codex MINOR: KNOWN_STOCK_TEMPLATE_SHA256의 모든 항목은 fixture와 git 이력에 근거가 있다', async () => {
  const fixtureShas = new Set();
  for (const era of (await readdir(FIXTURES, { withFileTypes: true })).filter(e => e.isDirectory()).map(e => e.name)) {
    for (const rel of await walk(join(FIXTURES, era))) {
      fixtureShas.add(`${rel}:${sha256(await readFile(join(FIXTURES, era, rel), 'utf8'))}`);
    }
  }
  for (const [rel, shas] of Object.entries(KNOWN_STOCK_TEMPLATE_SHA256)) {
    for (const sha of shas) {
      assert.ok(fixtureShas.has(`${rel}:${sha}`),
        `${rel}의 ${sha.slice(0, 12)}…에 대응하는 fixture가 없다 — 근거 없는 항목이거나 fixture를 빠뜨렸다`);
    }
  }
});

// 위 두 가드는 "테이블 ≡ fixture"만 증명한다. 둘이 함께 낡으면(과거 버전을 양쪽에서 누락) 통과한다.
// 실제 git 이력과 대조해 완전성까지 고정한다 — 이 저장소 안에서만 성립하는 검사다.
test('codex MINOR: 테이블이 templates/의 실제 git 이력을 빠짐없이 담는다 (완전성)', (t) => {
  let head;
  try { head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim(); }
  catch { return t.skip('git 이력 없음 — 소비자 설치본에서는 건너뛴다'); }
  assert.ok(head);

  // 얕은 클론은 이력이 잘려 있어 "빠짐없이 담는다"를 판정할 수 없다 — 실패가 아니라 미판정이다.
  // CI는 fetch-depth: 0으로 받으므로 여기서 걸리지 않는다(.github/workflows/test.yml).
  const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: ROOT }).toString().trim();
  if (shallow === 'true') return t.skip('얕은 클론 — 이력 완전성은 판정 불가');

  for (const rel of REFRESHABLE_TEMPLATE_FILES) {
    const p = `templates/${rel}`;
    const cur = sha256(execFileSync('git', ['show', `HEAD:${p}`], { cwd: ROOT, maxBuffer: 1 << 26 }));
    const commits = execFileSync('git', ['log', '--format=%H', '--', p], { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
    const historical = new Set();
    for (const c of commits) {
      let blob;
      try { blob = execFileSync('git', ['rev-parse', `${c}:${p}`], { cwd: ROOT, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim(); }
      catch { continue; }
      const s = sha256(execFileSync('git', ['cat-file', 'blob', blob], { cwd: ROOT, maxBuffer: 1 << 26 }));
      if (s !== cur) historical.add(s);
    }
    assert.deepEqual(new Set(KNOWN_STOCK_TEMPLATE_SHA256[rel] || []), historical,
      `${rel}: 테이블과 git 이력이 어긋난다 — 템플릿을 고쳤으면 이전 판 sha와 fixture를 함께 추가하라`);
  }
});

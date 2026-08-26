import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile, symlink, lstat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../src/render.mjs';
import { AGENT_FILE_TEMPLATES, planChanges, applyChanges } from '../src/harness.mjs';
import { mergeMarkdown, extractSections } from '../src/merge.mjs';
import { detectStack } from '../src/detect-stack.mjs';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tpl = (f) => readFile(join(ROOT, 'templates', f), 'utf8');
const repoStack = detectStack(ROOT);
const VARS = {
  projectName: 'demo', stackLabel: 'Node', packageManager: 'npm',
  language: 'ts', cmdInstall: 'npm i', cmdDev: 'npm run dev', cmdTest: 'npm test',
  cmdLint: 'npm run lint', cmdTypecheck: 'npm run tc',
};

// 루트 파일의 제목은 이 저장소 고유 이름을 쓸 수 있어 템플릿 전체와 같을 필요는 없다.
// 반면 harness:section 마커 블록은 apply가 템플릿에서 관리하는 영역이므로, 렌더된
// 템플릿의 모든 블록이 루트 적용본에도 내용까지 같아야 한다. 이는 새 샌드박스가 아닌
// 이 저장소 자체를 확인해 템플릿만 변경되어도 드리프트를 잡는다.
// AGENTS/CLAUDE/GEMINI 세 파일은 planChanges가 같은 루프에서 렌더·마커 병합하므로
// 드리프트 결함 부류가 같다 — 파일 목록을 harness.mjs와 공유해 셋 다 같은 기준으로 본다.
for (const [file, tplName] of AGENT_FILE_TEMPLATES) {
  test(`저장소 루트 ${file}는 렌더된 템플릿의 관리 절과 드리프트하지 않는다`, async () => {
    const [template, rootFile, stack] = await Promise.all([
      tpl(tplName),
      readFile(join(ROOT, file), 'utf8'),
      repoStack,
    ]);
    const expected = extractSections(render(template, { projectName: 'repository-root', ...stack }));
    const actual = extractSections(rootFile);

    assert.ok(Object.keys(expected).length > 0, `${tplName} 관리 절을 찾지 못함`);
    for (const [name, section] of Object.entries(expected)) {
      assert.equal(actual[name], section, `루트 ${file}의 ${name} 관리 절이 템플릿과 다름`);
    }
  });
}

test('AGENTS.md(core)는 protocol/roles/principles/stack 마커를 모두 포함', async () => {
  const out = render(await tpl('AGENTS.md.hbs'), VARS);
  for (const s of ['protocol', 'roles', 'principles', 'stack'])
    assert.match(out, new RegExp(`harness:section="${s}" begin`), `${s} 누락`);
  assert.doesNotMatch(out, /harness:section="workflow"/, 'workflow는 core에 없어야');
});

test('CLAUDE.md(thin)는 @AGENTS.md import + workflow 섹션 + user 영역만', async () => {
  const out = render(await tpl('CLAUDE.md.hbs'), VARS);
  assert.match(out, /^@AGENTS\.md\s*$/m, '최상단 @AGENTS.md import');
  assert.match(out, /harness:section="workflow" begin/);
  assert.match(out, /harness:user:begin/);
  assert.doesNotMatch(out, /harness:section="principles"/, 'core 섹션 복제 금지');
});

test('GEMINI.md(thin)는 @AGENTS.md import + reviewer 섹션', async () => {
  const out = render(await tpl('GEMINI.md.hbs'), VARS);
  assert.match(out, /^@AGENTS\.md\s*$/m);
  assert.match(out, /harness:section="reviewer" begin/);
});

test('어느 thin 파일도 core 본문을 복제하지 않는다 (중복 0)', async () => {
  const claude = render(await tpl('CLAUDE.md.hbs'), VARS);
  const gemini = render(await tpl('GEMINI.md.hbs'), VARS);
  assert.doesNotMatch(claude, /## 작업 프로토콜/);
  assert.doesNotMatch(gemini, /## 작업 프로토콜/);
});

test('AGENTS.md(core) roles 표는 D2 반영 — OpenCode=drive, Codex/Gemini=리뷰어', async () => {
  const out = render(await tpl('AGENTS.md.hbs'), VARS);
  assert.match(out, /OpenCode/, 'OpenCode 행 존재');
  assert.match(out, /drive/, 'drive 주체 명시');
  assert.match(out, /리뷰어/, '리뷰어 역할 명시');
});

// D4 (2026-07-28) — 쓰기는 단일 스레드. scaffold 되는 AGENTS.md/CLAUDE.md 쌍이
// 병렬 작성 여부에서 서로 모순되면 소비자 프로젝트가 자기모순 문서를 받는다.
const roleRows = (agentsMd) => agentsMd.split('\n').filter((l) => /^\|\s*\*\*/.test(l));

test('AGENTS.md(core) roles 표의 OpenCode 행은 순차 전환 세션 — "병렬 작성 세션" 회귀 금지', async () => {
  const out = render(await tpl('AGENTS.md.hbs'), VARS);
  const row = roleRows(out).find((l) => l.includes('**OpenCode**'));
  assert.ok(row, 'OpenCode 행 존재');
  assert.match(row, /순차/, 'OpenCode는 순차 전환 세션으로 표기');
  assert.doesNotMatch(row, /병렬 작성/, '역할 표가 병렬 작성 세션으로 되돌아가면 안 됨');
});

// 결정 로그 분리 (2026-08-21) — D-log 전문은 append-only로 자라 코어를 단조 증가시키므로
// docs/decisions.md 가 정본이다. 코어에는 현행 규범 + 포인터만 남는다. 규범이 코어에서 빠지면
// 규칙이 사라지고, 전문이 코어로 돌아오면 슬림화가 회귀한다 — 양쪽 다 고정한다.
test('AGENTS.md(core)는 D2/D4/D5 규범 요약 + decisions.md 포인터만 담는다', async () => {
  const out = render(await tpl('AGENTS.md.hbs'), VARS);
  assert.match(out, /`docs\/decisions\.md`가 정본/, '전문의 정본 포인터');
  assert.match(out, /\*\*D2\*\*/, 'D2 규범 요약');
  assert.match(out, /동시에 병렬로 쓰지 않는다/, 'D4 단일 스레드 쓰기 규범');
  assert.match(out, /PR\/MR로 병합하는 병렬 경로는 허용·권장/, 'D5 격리 병렬 규범');
  assert.doesNotMatch(out, /\*\*D4 \(2026-07-28\)/, 'D-log 전문(날짜·근거)은 코어로 되돌아오면 안 됨');
});

test('templates/docs/decisions.md는 D2/D4/D5 전문(날짜 포함)을 보존한다', async () => {
  const log = await readFile(join(ROOT, 'templates', 'docs', 'decisions.md'), 'utf8');
  assert.match(log, /## D2 \(2026-06-11\)/, 'D2 전문 보존');
  assert.match(log, /## D4 \(2026-07-28\)/, 'D4 전문 보존');
  assert.match(log, /## D5 \(2026-08-20\)/, 'D5 전문 보존');
  assert.match(log, /12-Factor Agents #8/, 'D4 근거(1차 소스) 보존');
  // 레포도 자기 하네스를 쓴다 — 스캐폴드본과 레포본이 어긋나면 드리프트다.
  assert.equal(await readFile(join(ROOT, 'docs', 'decisions.md'), 'utf8'), log,
    '레포 docs/decisions.md는 템플릿과 동일해야 함');
});

// D6 (2026-08-26) — 적대적 검증. 규범(decisions 전문 + AGENTS 요약)과 소비 표면(리뷰 마커
// kind 접미사)이 함께 움직여야 한다 — 어느 한쪽만 남으면 규범 없는 마커 또는 마커 없는 규범이 된다.
test('AGENTS.md(core)는 D6 요약을 담고 decisions.md는 D6 전문을 보존한다', async () => {
  const out = render(await tpl('AGENTS.md.hbs'), VARS);
  assert.match(out, /\*\*D6\*\*/, 'D6 규범 요약');
  assert.match(out, /read-only 검증자/, '검증자는 read-only');
  assert.doesNotMatch(out, /## D6 \(2026-08-26\)/, 'D-log 전문은 코어로 오지 않는다');
  const log = await readFile(join(ROOT, 'templates', 'docs', 'decisions.md'), 'utf8');
  assert.match(log, /## D6 \(2026-08-26\)/, 'D6 전문 보존');
  assert.match(log, /자동 수정 루프 금지/, '검증자→작업자 자동 반영 금지 규칙 보존');
});

test('검증 프레이밍 kind 접미사는 리뷰 마커 계약과 소비 표면 6곳에서 일치한다', async () => {
  const review = await readFile(join(ROOT, 'commands', 'harness-review.md'), 'utf8');
  assert.match(review, /kind=<engine>-<프레이밍>/, '접미사 규약 명문화');
  // 접미사 열거도 계약의 일부다 — 목록에서 지우면 소비 표면과 어긋난다 (codex 리뷰 P2).
  assert.match(review, /<engine>-contrarian/, '접미사 열거: contrarian');
  assert.match(review, /<engine>-simplifier/, '접미사 열거: simplifier');
  for (const [file, kind] of [
    ['harness-unittest.md', 'testcritic'],
    ['harness-comptest.md', 'testcritic'],
    ['harness-inttest.md', 'testcritic'],
    ['harness-ship.md', 'shipcheck'],
    ['harness-contrarian.md', 'contrarian'],
    ['harness-simplifier.md', 'simplifier'],
  ]) {
    const doc = await readFile(join(ROOT, 'commands', file), 'utf8');
    assert.match(doc, new RegExp(`kind=<engine>-${kind}`), `${file}: 마커 kind`);
    assert.match(doc, /BLOCKER/, `${file}: 루브릭 심각도`);
    assert.match(doc, /발견은 주장이다/, `${file}: 자동 반영 금지(재현·판별 후 반영)`);
  }
  // 페르소나 외부 엔진 모드의 대상은 diff가 아니라 task 문서다 — scope 값이 이를 구분한다.
  for (const file of ['harness-contrarian.md', 'harness-simplifier.md']) {
    const doc = await readFile(join(ROOT, 'commands', file), 'utf8');
    assert.match(doc, /scope=task-docs/, `${file}: task 문서 scope`);
  }
});

// interview의 판정 주체는 그대로 세션이지만, 판정 근거를 산문에서 채점표로 뒤집는다(D6 정직성 규칙).
// 이 순서(채점 → 질문 → 채점표 갱신 → 체크박스)가 빠지면 "감으로 체크"로 되돌아간다.
test('harness-interview는 선행 채점이 질문 선별과 체크박스 갱신을 지배한다', async () => {
  const doc = await readFile(join(ROOT, 'commands', 'harness-interview.md'), 'utf8');
  // 단계 번호로 순서를 고정한다 — 채점(2번)이 질문(3번)보다 앞이어야 scoring-first다 (codex 리뷰 P3).
  assert.match(doc, /2\. \*\*선행 채점\*\*/, '채점이 절차 2번(질문 전)에 존재');
  assert.match(doc, /3\. \*\*fail\/na 차원만\*\*/, '질문 생성은 절차 3번, fail/na 차원으로 제한');
  assert.match(doc, /Context\(brownfield 한정/, 'spec 체크박스와 짝 — Context 차원 포함(codex 리뷰 P2)');
  assert.match(doc, /pass가 아니라 na/, '증거 없는 pass 금지(D6 정직성 규칙)');
  assert.match(doc, /채점표에 없는 근거로 체크박스를 바꾸지 않는다/, '체크박스 갱신은 채점표에만 근거');
});

test('CLAUDE.md(thin) §2는 컨텍스트 격리 서브에이전트는 유지, 병렬 작성·결정은 금지', async () => {
  const out = render(await tpl('CLAUDE.md.hbs'), VARS);
  assert.match(out, /컨텍스트 격리 서브에이전트/, '조사용 서브에이전트는 표준 실무로 유지');
  assert.match(out, /병렬 작성·결정 에이전트는 두지 않는다/, '병렬 작성·결정 금지 규칙');
  assert.match(out, /쓰기는 단일 스레드로 유지한다/, '단일 스레드 쓰기 규칙');
  assert.doesNotMatch(out, /병렬 분석은 서브에이전트에게 위임/, '구 문구 회귀 금지');
});

test('scaffold 되는 AGENTS.md/CLAUDE.md 쌍은 병렬 쓰기 서술에서 모순되지 않는다', async () => {
  const agents = render(await tpl('AGENTS.md.hbs'), VARS);
  const claude = render(await tpl('CLAUDE.md.hbs'), VARS);
  assert.match(claude, /쓰기는 단일 스레드로 유지한다/, 'CLAUDE.md가 단일 스레드 쓰기를 규정');
  const rows = roleRows(agents);
  assert.ok(rows.length >= 4, `역할 표 행 파싱 실패 (${rows.length}행)`);
  for (const row of rows)
    assert.doesNotMatch(row, /병렬/, `역할 표가 병렬 실행을 기술해 CLAUDE.md와 충돌: ${row}`);
});

// 다이어그램 옵트인 (2026-08-20) — AGENTS.md는 Codex·Cursor·OpenCode도 네이티브로 읽는
// 멀티에이전트 SSOT다. Claude 전용 스킬 이름이 core로 새면 역할표의 다섯 에이전트 중 셋에게
// 실행 불가능한 규칙이 된다. 도구 이름은 CLAUDE.md/commands 쪽에만 있어야 한다.
test('AGENTS.md(core)는 다이어그램 산출물을 SSOT 제외 생성물로 선언하되 도구 중립적이다', async () => {
  const out = render(await tpl('AGENTS.md.hbs'), VARS);
  assert.match(out, /`<name>-diagram\.html`/, '다이어그램 산출물 선언');
  assert.match(out, /옵트인이라 없는 task가 정상이다/, 'SSOT 4파일이 아니라 옵트인 생성물임을 명시');
  assert.match(out, /inline SVG/, 'Obsidian이 script를 제거하므로 inline SVG여야 한다는 근거');
  assert.doesNotMatch(out, /diagram-design/, 'Claude 전용 스킬 이름은 멀티에이전트 core에 박지 않는다');
});

// 옵트인 상태는 plan.md 체크박스의 존재/부재다 — 별도 저장소를 만들면 SSOT가 둘이 된다.
test('AGENTS.md(core)는 옵트인 상태를 plan.md로 규정하고 별도 저장소를 만들지 않는다', async () => {
  const out = render(await tpl('AGENTS.md.hbs'), VARS);
  assert.match(out, /plan\.md에 그 단계가 있는지가 곧 상태다/, 'plan.md가 곧 상태');
  assert.match(out, /활성화할 때는 묻지 않는다/, '재활성화 시 재질문 금지');
});

// 지시 구조 슬림화 (2026-08-21) — 다이어그램 옵트인의 정본은 commands/harness-task.md 하나다.
// AGENTS.md는 도구 중립 요약 1블록만 유지하고(Codex·Cursor·OpenCode는 플러그인 commands/를
// 못 읽으므로 요약 자체는 남긴다), CLAUDE.md는 재서술하지 않는다 — 표면이 늘면 드리프트가 돌아온다.
test('CLAUDE.md(thin)는 다이어그램 옵트인을 재서술하지 않는다 (정본: commands/harness-task.md)', async () => {
  const out = render(await tpl('CLAUDE.md.hbs'), VARS);
  assert.doesNotMatch(out, /다이어그램 옵트인/, '§1-B 재서술 회귀 금지');
  assert.doesNotMatch(out, /diagram\.html/, '산출물 규격도 코어/커맨드에만');
});

test('CLAUDE.md(thin) §1은 Ambiguity 게이트 트리거를 유지한다 (규칙 본문은 spec 템플릿에 내장)', async () => {
  const out = render(await tpl('CLAUDE.md.hbs'), VARS);
  assert.match(out, /Ambiguity 자가진단 게이트/, '게이트 트리거 문장 유지');
  assert.match(out, /spec 템플릿에 내장/, '규칙 본문의 위치(문서 운반) 명시');
  assert.doesNotMatch(out, /### 1-A\./, '순간 결합 절차 섹션은 제거된 상태 유지');
});

// 옵트인 계약은 AGENTS(도구 중립 요약) · commands/harness-task.md(절차 정본) 두 표면에
// 걸쳐 있다. 문구 존재만 보는 테스트는 두 표면이 서로 어긋나도 통과하므로, 실제 command 문서를
// 읽어 (1) created/activated 분기와 (2) 건너뛴 단계의 종결 규칙을 확인한다. (2)가 빠지면
// done-guard(planHasOpenBoxes)가 열린 체크박스에서 완료를 영구히 막는다 — 2026-08-20 Codex 리뷰 P2.
test('commands/harness-task.md는 created/activated를 구분하고 건너뛴 단계의 종결 규칙을 준다', async () => {
  const doc = await readFile(join(ROOT, 'commands', 'harness-task.md'), 'utf8');
  assert.match(doc, /`created:`/, '신규 생성일 때만 묻는다');
  assert.match(doc, /`activated:`/, '재활성화 분기를 명시');
  assert.match(doc, /재활성화\)면 \*\*묻지 않는다\*\*/, '재활성화 시 재질문 금지');
  assert.match(doc, /- \[x\] spec\/plan 다이어그램 — 미실행\(도구 없음\)/, '건너뛴 단계를 닫는 방법');
  assert.match(doc, /지우면 옵트인했다는 사실 자체가 사라지고/, '단계 삭제 금지 근거');
  assert.match(doc, /docs\/<user>\/<name>\/<name>-diagram\.html/, '산출물 경로');
  assert.match(doc, /`AskUserQuestion`으로 한 번만 묻는다/, 'AskUserQuestion으로 1회만 묻는 계약');
  assert.match(doc, /설치 명령을 단정해 안내하지 말고/, 'preflight에서 설치 명령을 단정해 안내하지 않는 계약');
  assert.match(doc, /자립형 \*\*inline SVG\*\*로 쓴다/, '산출물은 inline SVG 요구');
  assert.match(doc, /"다이어그램 미실행 — 도구 없음"을 날짜와 함께 한 줄 남긴다/, '도구 없을 때 artifact 기록 계약');
});

// 두 표면이 같은 종결 규칙을 말해야 한다 — 요약(AGENTS)이 절차(command)와 어긋나면
// 코어만 읽는 에이전트가 done-guard에 걸린다.
test('AGENTS.md와 commands/harness-task.md는 건너뛴 다이어그램 단계를 지우지 않고 닫으라고 말한다', async () => {
  const agents = render(await tpl('AGENTS.md.hbs'), VARS);
  const command = await readFile(join(ROOT, 'commands', 'harness-task.md'), 'utf8');
  for (const [label, out] of [['AGENTS.md', agents], ['commands/harness-task.md', command]]) {
    assert.match(out, /\*\*지우지 말고\*\*/, `${label}: 단계 삭제 금지`);
    assert.match(out, /미실행\(도구 없음\)/, `${label}: 사유를 붙여 닫는 형식`);
  }
});

test('AGENTS.md(core) stack 명령이 vars로 렌더된다', async () => {
  const out = render(await tpl('AGENTS.md.hbs'), VARS);
  assert.match(out, /npm test/, 'cmdTest 치환');
  assert.doesNotMatch(out, /\{\{cmdTest\}\}/, '미치환 토큰 없음');
});

test('planChanges: 신규 프로젝트에 AGENTS/CLAUDE/GEMINI 3개 markdown change 생성', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-af-'));
  try {
    const ctx = { root: ROOT, targetDir: dir, backupDir: null, flags: {} };
    const { changes } = await planChanges(ctx, { stack: VARS });
    const md = changes.filter(c => c.kind === 'markdown').map(c => c.path);
    assert.ok(md.some(p => p.endsWith('AGENTS.md')), 'AGENTS.md');
    assert.ok(md.some(p => p.endsWith('CLAUDE.md')), 'CLAUDE.md');
    assert.ok(md.some(p => p.endsWith('GEMINI.md')), 'GEMINI.md');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('mergeMarkdown: 기존 thin CLAUDE.md 재머지 시 @AGENTS.md 최상단 라인 생존', async () => {
  const incoming = render(await tpl('CLAUDE.md.hbs'), VARS);
  const existing = '@AGENTS.md\n\n# demo — Claude Code\n\n<!-- harness:user:begin -->\n내 메모\n<!-- harness:user:end -->\n';
  const merged = mergeMarkdown(existing, incoming);
  assert.match(merged, /^@AGENTS\.md/m, 'import 라인 보존');
  assert.match(merged, /내 메모/, '사용자 텍스트 보존');
});

test('planChanges: 레거시 alias symlink 에이전트 파일은 건너뛰고 legacyAgentFiles로 보고 (CLAUDE.md 보호)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-legacy-apply-'));
  try {
    await writeFile(join(dir, 'CLAUDE.md'), '# legacy master\nLEGACY_SENTINEL\n');
    await symlink('CLAUDE.md', join(dir, 'AGENTS.md'));
    await symlink('CLAUDE.md', join(dir, 'GEMINI.md'));
    const ctx = { root: ROOT, targetDir: dir, backupDir: null, flags: {} };
    const { changes, legacyAgentFiles } = await planChanges(ctx, { stack: VARS });
    assert.ok(!changes.some(c => c.path.endsWith('AGENTS.md')), 'AGENTS.md symlink 건너뜀');
    assert.ok(!changes.some(c => c.path.endsWith('GEMINI.md')), 'GEMINI.md symlink 건너뜀');
    assert.deepEqual([...legacyAgentFiles].sort(), ['AGENTS.md', 'GEMINI.md']);
    // CLAUDE.md change은 정상 생성되더라도, apply가 symlink 타깃을 오염시키지 않아야(아래 applyChanges 테스트)
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('applyChanges: 심볼릭 링크 경로는 unlink 후 실파일로 써서 타깃을 오염시키지 않는다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-apply-symlink-'));
  try {
    await writeFile(join(dir, 'target.txt'), 'ORIGINAL');
    await symlink('target.txt', join(dir, 'link.txt'));
    await applyChanges([{ path: join(dir, 'link.txt'), kind: 'markdown', after: 'NEW' }]);
    assert.equal(await readFile(join(dir, 'target.txt'), 'utf8'), 'ORIGINAL', 'symlink 타깃 보존');
    const st = await lstat(join(dir, 'link.txt'));
    assert.equal(st.isSymbolicLink(), false, 'link은 실파일로 교체');
    assert.equal(await readFile(join(dir, 'link.txt'), 'utf8'), 'NEW');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

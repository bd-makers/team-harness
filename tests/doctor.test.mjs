import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, dirname, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, chmod } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { classifyHookCommand, collectHookCommands, checkCommand, checkSelfCli, checkHookCli, hookCliInstallCommand, HOOK_CLI_MARKETPLACE_DIR, checkActiveSpecGate, detectLegacyStructure, checkSessionStartHook, checkBoundaryCheckpointHook, checkDecisionLog, DECISION_HEADINGS, checkObserveTripWires, checkEagerTierSize, globalClaudeMdPath, EAGER_TIER_MAX_BYTES, isPluginDevRepo, jqFallbackGaps, jqInstallAction, JQ_FALLBACK_MARKER } from '../src/commands/doctor.mjs';
import { POST_COMMIT_HOOK } from '../src/git-hooks.mjs';
import { cloudSyncPathWarning } from '../src/harness.mjs';
import { taskSpecTemplate } from '../src/commands/task.mjs';
import { observeToolEvent } from '../templates/.claude/hooks/observe-tools.mjs';
import { OBSERVABILITY_BASE } from '../src/commands/observe.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pexec = promisify(execFile);

// Run the real doctor CLI against a target dir and return the parsed --json envelope.
async function doctorJson(targetDir, env) {
  const opts = { timeout: 20000, ...(env ? { env } : {}) };
  const { stdout } = await pexec('node', [join(ROOT, 'bin/harness-team.mjs'), 'doctor', '--json', '--target', targetDir], opts)
    .catch(e => ({ stdout: e.stdout || '' })); // doctor exits 1 on fail — keep the envelope
  return JSON.parse(stdout);
}
const checkOf = (env, label) => (env.checks || []).find(c => c.label === label);

// Installing by package name 404s — this package is not on the public npm registry.
// Cover the variants a doc edit could reintroduce (install/-g spellings, quoting);
// the trailing lookahead keeps the legitimate ...-marketplace path from matching.
const FORBIDDEN_NPM_INSTALL = /npm\s+(?:i|install)\s+(?:-g|--global)\s+["']?harness-aijient-team(?![-\w])/;

async function makeActiveFixture(specContent) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-gate-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(
    join(dir, '.harness/active.json'),
    JSON.stringify({ user: 'tester', task: 'demo', path: 'docs/tester/demo' }),
  );
  const taskDir = join(dir, 'docs', 'tester', 'demo');
  await mkdir(taskDir, { recursive: true });
  if (specContent !== undefined) await writeFile(join(taskDir, 'demo-spec.md'), specContent);
  return dir;
}

test('checkCommand: node --version → true (node는 항상 존재)', async () => {
  const result = await checkCommand('node', ['--version']);
  assert.equal(result, true);
});

test('checkCommand: 존재하지 않는 명령어 → false (ENOENT 처리)', async () => {
  const result = await checkCommand('definitely-not-a-real-command-xyz-123');
  assert.equal(result, false);
});

test('checkSelfCli: 실제 bin으로 실행 → true (harness-team 출력 포함)', async () => {
  const result = await checkSelfCli(ROOT);
  assert.equal(result, true);
});

test('checkHookCli: PATH의 CLI가 세 hook 명령(session-context·handoff·boundary)을 광고할 때만 통과한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-cli-'));
  try {
    const shim = join(dir, 'harness-team');
    await writeFile(shim, '#!/bin/sh\nif [ "$1" != "--help" ]; then exit 1; fi\nprintf "%s\\n" "harness-team" "  handoff" "  session-context" "  boundary check"\n');
    await chmod(shim, 0o755);
    assert.equal(await checkHookCli({ PATH: dir }), true);
    await writeFile(shim, '#!/bin/sh\nprintf "%s\\n" "harness-team" "  session-context"\n');
    assert.equal(await checkHookCli({ PATH: dir }), false);
    assert.equal(await checkHookCli({ PATH: join(dir, 'missing') }), false);
    assert.match(POST_COMMIT_HOOK, /harness-team handoff/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// The real bin — not a shim. checkSelfCli asserts a loose substring while checkHookCli
// line-anchors two command names, so a --help reformat could pass one and fail the other.
// This pins the actual help output to the stricter contract.
test('checkHookCli: 실제 bin을 PATH에 링크해도 통과한다 (--help 포맷 계약)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-realcli-'));
  try {
    // env-shebang needs node on the same PATH; link it here so nothing else leaks in.
    await symlink(process.execPath, join(dir, 'node'));
    await symlink(join(ROOT, 'bin/harness-team.mjs'), join(dir, 'harness-team'));
    assert.equal(await checkHookCli({ PATH: dir }), true,
      'real --help must keep advertising session-context and handoff at line start');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// #16 shipped `npm i -g harness-aijient-team`, which 404s — this package is not on the
// public registry. Pin the working form so the recovery command cannot regress.
test('hookCliInstallCommand: 마켓플레이스 클론 경로를 링크한다 (패키지명 직접 설치 금지)', () => {
  const scoped = hookCliInstallCommand({ CLAUDE_PLUGINS_ROOT: '/tmp/plugins-root' });
  assert.equal(scoped, `npm i -g "${join('/tmp/plugins-root', 'marketplaces', HOOK_CLI_MARKETPLACE_DIR)}"`);

  const fallback = hookCliInstallCommand({});
  assert.equal(fallback, `npm i -g "${join(homedir(), '.claude/plugins', 'marketplaces', HOOK_CLI_MARKETPLACE_DIR)}"`,
    'CLAUDE_PLUGINS_ROOT 미설정 시 ~/.claude/plugins로 폴백해야 한다');

  for (const cmd of [scoped, fallback]) {
    assert.doesNotMatch(cmd, FORBIDDEN_NPM_INSTALL,
      'npm 공개 배포가 없으므로 패키지명 직접 설치는 404 — 경로 링크여야 한다');
  }
});

test('README는 doctor와 같은 복구 경로를 안내한다', async () => {
  const readme = await readFile(join(ROOT, 'README.md'), 'utf8');
  assert.ok(readme.includes(`marketplaces/${HOOK_CLI_MARKETPLACE_DIR}`),
    'README가 doctor와 같은 마켓플레이스 클론 경로를 안내해야 한다');
  assert.doesNotMatch(readme, FORBIDDEN_NPM_INSTALL,
    'README에 404가 되는 패키지명 직접 설치 안내가 있으면 안 된다');
});

test('FORBIDDEN_NPM_INSTALL: 404 변형은 잡고 정상 경로는 통과시킨다', () => {
  for (const bad of [
    'npm i -g harness-aijient-team',
    'npm install -g harness-aijient-team',
    'npm i -g "harness-aijient-team"',
    'npm i --global harness-aijient-team',
  ]) assert.match(bad, FORBIDDEN_NPM_INSTALL, `404 변형을 놓쳤다: ${bad}`);

  for (const good of [
    'npm i -g "${CLAUDE_PLUGINS_ROOT:-$HOME/.claude/plugins}/marketplaces/harness-aijient-team-marketplace"',
    hookCliInstallCommand({ CLAUDE_PLUGINS_ROOT: '/tmp/plugins-root' }),
  ]) assert.doesNotMatch(good, FORBIDDEN_NPM_INSTALL, `정상 경로를 오탐했다: ${good}`);
});

test('checkActiveSpecGate: 활성 task 없으면 null (조용히 skip)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-noactive-'));
  try {
    assert.equal(await checkActiveSpecGate(dir), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('checkActiveSpecGate: 정상 spec(자가진단 포함) → null', async () => {
  const dir = await makeActiveFixture(taskSpecTemplate('demo'));
  try {
    assert.equal(await checkActiveSpecGate(dir), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('checkActiveSpecGate: 포인터 껍데기 spec(자가진단 없음) → 경고 문자열', async () => {
  const dir = await makeActiveFixture('# demo\n\n→ docs/tester/big-spec.md\n');
  try {
    const w = await checkActiveSpecGate(dir);
    assert.ok(typeof w === 'string', 'returns a warning string');
    assert.match(w, /게이트 우회/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('checkActiveSpecGate: spec.md 부재 → 경고 문자열', async () => {
  const dir = await makeActiveFixture(undefined); // no spec written
  try {
    const w = await checkActiveSpecGate(dir);
    assert.ok(typeof w === 'string', 'returns a warning string');
    assert.match(w, /spec\.md 없음/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

async function makeDecisionLogFixture(body) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-dlog-'));
  if (body !== undefined) {
    await mkdir(join(dir, 'docs'), { recursive: true });
    await writeFile(join(dir, 'docs/decisions.md'), body);
  }
  return dir;
}

// The shipped template is the strongest "존재" fixture: renaming a heading there
// without touching DECISION_HEADINGS would silently warn on every fresh scaffold.
test('checkDecisionLog: 템플릿 원본(D2/D4/D5 포함) → null (템플릿↔검사 계약)', async () => {
  const dir = await makeDecisionLogFixture(await readFile(join(ROOT, 'templates/docs/decisions.md'), 'utf8'));
  try {
    assert.equal(await checkDecisionLog(dir), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 위 ⊆ 계약은 템플릿에 절이 추가됐는데 검사 목록이 그대로여도 통과한다 — 바로 D6·D7 드리프트가
// 그렇게 생겼다(codex 리뷰 P2). 템플릿의 모든 `## D<n>` 헤딩과 DECISION_HEADINGS를 집합으로 대조한다.
test('checkDecisionLog: 템플릿 D-log의 ## D<n> 헤딩 집합 == DECISION_HEADINGS (드리프트 가드)', async () => {
  const log = await readFile(join(ROOT, 'templates/docs/decisions.md'), 'utf8');
  const inTemplate = [...log.matchAll(/^## D\d+\b/gm)].map(m => m[0]);
  assert.deepEqual([...inTemplate].sort(), [...DECISION_HEADINGS].sort(),
    '템플릿 D-log에 절을 추가·삭제했으면 DECISION_HEADINGS도 함께 갱신하라');
});

test('checkDecisionLog: docs/decisions.md 부재 → 경고 (init 스캐폴드 유도)', async () => {
  const dir = await makeDecisionLogFixture(undefined);
  try {
    const w = await checkDecisionLog(dir);
    assert.ok(typeof w === 'string', 'returns a warning string');
    assert.match(w, /없음/);
    assert.match(w, /harness-team init/, '부재는 init 스캐폴드가 해결하므로 init로 유도');
    assert.match(w, /D2\/D4\/D5\/D6\/D7/, '검사 대상 절 ID를 DECISION_HEADINGS에서 파생해 나열');
    assert.match(w, /templates\/docs\/decisions\.md/, '가져올 원본 위치를 안내');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkDecisionLog: 일부 절 누락 → 누락 절만 나열 + 템플릿 병합 안내 (init 아님)', async () => {
  // 본문 중간의 `## D4` 언급과 `## D20` 제목은 각각 라인 앵커·\b 덕에 제목으로 안 쳐야 한다.
  const dir = await makeDecisionLogFixture(
    '# Team Decision Log\n\n## D2 (2026-06-11) — drive/리뷰어 역할 분리\n\n본문에서 ## D4 를 언급만 한다.\n\n## D20 (2027-01-01) — 별개 결정\n',
  );
  try {
    const w = await checkDecisionLog(dir);
    assert.ok(typeof w === 'string', 'returns a warning string');
    assert.match(w, /## D4, ## D5, ## D6, ## D7, ## D8 절 없음/, '누락된 절만 정확히 나열');
    assert.doesNotMatch(w, /## D2/, '존재하는 D2는 누락 목록에 없어야 한다');
    // 원래 이 단언은 /init/ 부분일치였다. "init로 유도하지 말 것"이 의도인데, 문구가
    // "init·migrate 어느 쪽도 덮어쓰지 않는다"고 *설명*하는 것까지 막고 있었다 —
    // 유도 여부는 실행 명령형(harness-team init)으로 판정한다(부재 분기의 단언과 같은 형태).
    assert.doesNotMatch(w, /harness-team init/, 'skipExisting이라 init로는 해결 불가 — 실행 유도 금지');
    assert.match(w, /init·migrate 어느 쪽도 덮어쓰지 않는다/, '왜 명령으로 안 고쳐지는지 설명해야 한다');
    assert.match(w, /templates\/docs\/decisions\.md/, '가져올 원본 위치를 안내');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// codex 리뷰 P2(2026-09-05, doctor-decision-headings)에서 기각·후속으로 남긴 건: 라인 앵커는 fenced code block
// 안의 `## D<n>` 줄(복사용 예시·인용)도 절로 인정한다 — 절이 실제로 없어도 doctor가 침묵하는 false negative.
// 펜스 안은 산문이 헤딩을 *인용*한 것이지 절이 아니다. ``` 와 ~~~ 두 종류 모두, 그리고 펜스가 닫힌 뒤의
// 진짜 헤딩은 계속 절로 세야 한다(제거가 뒤 본문까지 먹으면 안 된다).
test("checkDecisionLog: fenced code block 안의 ## D<n>은 절이 아니다 (펜스 뒤 진짜 헤딩은 유지)", async () => {
  const dir = await makeDecisionLogFixture([
    "# Team Decision Log", "",
    "## D2 (2026-06-11) — a", "",
    "복사용 예시:", "",
    "```md", "## D4 (2026-07-28) — 예시일 뿐", "```", "",
    "~~~", "## D5 (2026-08-20) — 이것도 예시", "~~~", "",
    "## D6 (2026-08-26) — 진짜 절", "",
  ].join("\n"));
  try {
    const w = await checkDecisionLog(dir);
    assert.ok(typeof w === "string", "returns a warning string");
    assert.match(w, /## D4, ## D5, ## D7, ## D8 절 없음/, "펜스 안 D4·D5는 누락으로, 펜스 뒤 D6은 존재로");
    assert.doesNotMatch(w, /## D[26]\b/, "존재하는 D2/D6은 누락 목록에 없어야 한다");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 닫히지 않은 펜스는 문서 끝까지 코드다(CommonMark) — 그 안의 헤딩도 절이 아니다.
test("checkDecisionLog: 닫히지 않은 fenced code block은 문서 끝까지 코드로 본다", async () => {
  const dir = await makeDecisionLogFixture(
    "# Team Decision Log\n\n## D2 (2026-06-11) — a\n\n```\n## D4 (2026-07-28) — 닫히지 않은 펜스 안\n## D5 (2026-08-20) — 역시 안\n",
  );
  try {
    const w = await checkDecisionLog(dir);
    assert.ok(typeof w === "string", "returns a warning string");
    assert.match(w, /## D4, ## D5, ## D6, ## D7, ## D8 절 없음/, "D2 외 전부 누락");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 펜스 계약을 mutation이 못 뚫게 표로 고정한다(2026-09-09 codex P2·P3). 각 행: D2는 항상 진짜 절,
// 가운데 줄들이 케이스, 끝의 D8은 "제거가 문서 끝까지 먹지 않았다"의 감시자. expect = D4~D7 중 누락으로
// 보고돼야 하는 것. 근거는 CommonMark §4.5: 여는 펜스는 백틱·물결 3개 이상(들여쓰기 0~3), 닫는 펜스는
// 같은 문자로 여는 것 이상 길이(뒤에 공백만 허용), 백틱 펜스의 info string에는 백틱이 올 수 없고,
// 줄 끝은 LF·CRLF·단독 CR 모두다.
const FENCE_CASES = [
  ['4자 opener는 3자 closer로 안 닫힌다', ['````', '## D4', '```', '## D5', '````', '## D6'], ['D4', 'D5', 'D7']],
  ['다른 문자 closer로는 안 닫힌다', ['```', '## D4', '~~~', '## D5', '```', '## D6'], ['D4', 'D5', 'D7']],
  ['더 긴 closer로는 닫힌다', ['```', '## D4', '`````', '## D5'], ['D4', 'D6', 'D7']],
  // `\`\`\` x`는 닫지 못하므로 D7까지 펜스 안이고, 감시자 D8을 살리려면 그 뒤에 진짜 closer가 필요하다.
  ['closer 뒤 공백은 허용, 다른 글자는 불허', ['```', '## D4', '```  ', '## D5', '```', '## D6', '``` x', '## D7', '```'], ['D4', 'D6', 'D7']],
  ['들여쓰기 3칸까지는 펜스다', ['   ```', '## D4', '   ```', '## D5'], ['D4', 'D6', 'D7']],
  ['들여쓰기 4칸은 펜스가 아니다(코드 블록 줄일 뿐)', ['    ```', '## D4', '    ```', '## D5'], ['D6', 'D7']],
  ['백틱 펜스 info string에 백틱이 있으면 펜스가 아니다', ['```md `x', '## D4', '## D5'], ['D6', 'D7']],
  ['물결 펜스 info string에는 백틱이 와도 된다', ['~~~md `x', '## D4', '~~~', '## D5'], ['D4', 'D6', 'D7']],
];
for (const [name, mid, expect] of FENCE_CASES) {
  test(`checkDecisionLog fence 계약: ${name}`, async () => {
    const dir = await makeDecisionLogFixture(['# Team Decision Log', '', '## D2 — a', ...mid, '## D8 — tail', ''].join('\n'));
    try {
      const w = await checkDecisionLog(dir);
      const want = expect.map(d => '## ' + d).join(', ');
      assert.ok(typeof w === 'string', 'returns a warning string');
      assert.equal(/에 (.+?) 절 없음/.exec(w)?.[1], want, name);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
}

// 줄 끝 종류는 stripping의 줄 나누기와 헤딩 정규식(m 플래그는 CR도 줄 끝으로 본다)이 같은 줄 모델을
// 써야 한다 — 어긋나면 CRLF·CR 문서에서만 펜스 안 헤딩이 절로 새어 나온다.
for (const [name, eol] of [['CRLF', '\r\n'], ['단독 CR', '\r']]) {
  test(`checkDecisionLog fence 계약: ${name} 줄 끝에서도 펜스를 걷어낸다`, async () => {
    const dir = await makeDecisionLogFixture(['# Team Decision Log', '', '## D2 — a', '```', '## D4', '```', '## D5', '## D8 — tail', ''].join(eol));
    try {
      const w = await checkDecisionLog(dir);
      assert.equal(/에 (.+?) 절 없음/.exec(w ?? '')?.[1], '## D4, ## D6, ## D7', name);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
}

// D6(2026-08-26)·D7(2026-09-03)이 D-log에 추가된 뒤에도 검사 목록은 D2/D4/D5에 머물러 있었다 —
// D6 이후에 스캐폴드된 소비자는 AGENTS.md 코어가 가리키는 절이 없어도 doctor가 침묵했다.
// 검사 목록이 템플릿 D-log와 함께 움직이는지 고정한다.
test('checkDecisionLog: 옛 스캐폴드(D2/D4/D5만) → 이후 절 전부 누락 경고', async () => {
  const dir = await makeDecisionLogFixture(
    '# Team Decision Log\n\n## D2 (2026-06-11) — a\n\n## D4 (2026-07-28) — b\n\n## D5 (2026-08-20) — c\n',
  );
  try {
    const w = await checkDecisionLog(dir);
    assert.ok(typeof w === 'string', 'returns a warning string');
    assert.match(w, /## D6, ## D7, ## D8 절 없음/, '옛 스캐폴드 이후 절만 누락으로 나열');
    assert.doesNotMatch(w, /## D[245]\b/, '존재하는 D2/D4/D5는 누락 목록에 없어야 한다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// Codex 리뷰 P2 회귀 방지: warn 수준 검사가 doctor를 crash 시키면 envelope 자체가 안 나온다.
test('checkDecisionLog: docs/decisions.md가 디렉터리(읽기 불가) → 경고, throw 금지', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-dlog-'));
  try {
    await mkdir(join(dir, 'docs/decisions.md'), { recursive: true });
    const w = await checkDecisionLog(dir);
    assert.ok(typeof w === 'string', 'returns a warning string, not a throw');
    assert.match(w, /읽기 실패/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('detectLegacyStructure: AGENTS.md가 CLAUDE.md로의 symlink면 레거시 경고', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-legacy-'));
  try {
    await writeFile(join(dir, 'CLAUDE.md'), '# old master\n');
    await symlink('CLAUDE.md', join(dir, 'AGENTS.md'));
    const w = await detectLegacyStructure(dir);
    assert.ok(typeof w === 'string' && /migrate/.test(w), '레거시→migrate 안내');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('detectLegacyStructure: .cursorrules 존재만으로도 레거시 경고', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-legacy2-'));
  try {
    await writeFile(join(dir, 'AGENTS.md'), '# core\n');
    await writeFile(join(dir, 'CLAUDE.md'), '@AGENTS.md\n');
    await writeFile(join(dir, '.cursorrules'), 'x\n');
    const w = await detectLegacyStructure(dir);
    assert.ok(typeof w === 'string' && /migrate/.test(w));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

async function makeSettingsFixture(settings) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-hook-'));
  if (settings !== undefined) {
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(join(dir, '.claude/settings.json'), JSON.stringify(settings, null, 2));
  }
  return dir;
}

test('checkSessionStartHook: SessionStart task-gate 없음 → 경고(init 유도)', async () => {
  const dir = await makeSettingsFixture({
    hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: './x.sh' }] }] },
  });
  try {
    const w = await checkSessionStartHook(dir);
    assert.ok(typeof w === 'string', 'returns a warning string');
    assert.match(w, /init/, 'init로 유도');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkSessionStartHook: task-gate 있음 → null', async () => {
  const dir = await makeSettingsFixture({
    hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'harness-team session-context 2>/dev/null || true' }] }] },
  });
  try {
    assert.equal(await checkSessionStartHook(dir), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkSessionStartHook: settings.json 부재 → null (CHECKS가 담당, 중복 fail 금지)', async () => {
  const dir = await makeSettingsFixture(undefined);
  try {
    assert.equal(await checkSessionStartHook(dir), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkBoundaryCheckpointHook: Edit PreToolUse 경계 훅 없음 → 경고(init 유도)', async () => {
  const dir = await makeSettingsFixture({
    hooks: { PreToolUse: [{ matcher: 'Edit|Write', hooks: [{ type: 'command', command: './x.sh' }] }] },
  });
  try {
    const w = await checkBoundaryCheckpointHook(dir);
    assert.ok(typeof w === 'string', 'returns a warning string');
    assert.match(w, /init/, 'init로 유도');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkBoundaryCheckpointHook: Edit PreToolUse 경계 훅 있음 → null', async () => {
  const dir = await makeSettingsFixture({
    hooks: { PreToolUse: [{ matcher: 'Edit|Write', hooks: [{ type: 'command', command: './.claude/hooks/boundary-checkpoint.sh' }] }] },
  });
  try {
    assert.equal(await checkBoundaryCheckpointHook(dir), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// Every eager-tier test must pin CLAUDE_CONFIG_DIR at an isolated directory. Without it
// the check reads the *running machine's* real ~/.claude/CLAUDE.md, which would make these
// assertions depend on the maintainer's own global file — green here, red on a laptop with
// a large one. `makeConfigHome()` with no argument is the "no global file" case;
// pass bytes to add one.
async function makeConfigHome(globalBytes) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-cfghome-'));
  if (globalBytes !== undefined) await writeFile(join(dir, 'CLAUDE.md'), globalBytes);
  return dir;
}

async function makeEagerTierFixture({ agents, claude, dotClaude } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-eager-'));
  if (agents !== undefined) await writeFile(join(dir, 'AGENTS.md'), agents);
  if (claude !== undefined) await writeFile(join(dir, 'CLAUDE.md'), claude);
  if (dotClaude !== undefined) {
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(join(dir, '.claude/CLAUDE.md'), dotClaude);
  }
  return dir;
}

const withConfigHome = home => ({ CLAUDE_CONFIG_DIR: home });

test('checkEagerTierSize: 프로젝트·전역 모두 없음 → null (조용히 skip)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-eager-none-'));
  const home = await makeConfigHome();
  try {
    assert.equal(await checkEagerTierSize(dir, withConfigHome(home)), null);
  } finally { await rm(dir, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
});

test('checkEagerTierSize: 합계가 24 KiB 이내 → null', async () => {
  const dir = await makeEagerTierFixture({ agents: 'x'.repeat(1000), claude: 'y'.repeat(1000) });
  const home = await makeConfigHome('g'.repeat(1000));
  try {
    assert.equal(await checkEagerTierSize(dir, withConfigHome(home)), null);
  } finally { await rm(dir, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
});

test('checkEagerTierSize: 합계가 24 KiB 초과 → 측정치·예산·파일별 내역을 담은 경고', async () => {
  const dir = await makeEagerTierFixture({ agents: 'x'.repeat(EAGER_TIER_MAX_BYTES), claude: 'y'.repeat(1) });
  const home = await makeConfigHome();
  try {
    const total = EAGER_TIER_MAX_BYTES + 1;
    const w = await checkEagerTierSize(dir, withConfigHome(home));
    assert.ok(typeof w === 'string', 'returns a warning string');
    assert.match(w, /^eager 계층 /);
    assert.match(w, new RegExp(`${total.toLocaleString('en-US')} B > ${EAGER_TIER_MAX_BYTES.toLocaleString('en-US')} B\\(24 KiB\\)`));
    assert.match(w, new RegExp(`AGENTS\\.md ${EAGER_TIER_MAX_BYTES.toLocaleString('en-US')} B`), '파일별 내역이 있어야 한다');
    assert.match(w, /CLAUDE\.md 1 B/);
    assert.match(w, /lazy 정본\(커맨드 문서·스킬\)/, '절차를 lazy 정본으로 옮기라는 안내가 있어야 한다');
  } finally { await rm(dir, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
});

test('checkEagerTierSize: 한쪽 파일만 존재해도 초과분은 합산한다 (누락 파일은 0바이트)', async () => {
  const dir = await makeEagerTierFixture({ agents: 'x'.repeat(EAGER_TIER_MAX_BYTES + 1) });
  const home = await makeConfigHome();
  try {
    assert.ok(typeof (await checkEagerTierSize(dir, withConfigHome(home))) === 'string');
  } finally { await rm(dir, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
});

// --- the blind spot this check exists to close ---

test('checkEagerTierSize: 프로젝트만으로는 통과하지만 전역을 더하면 초과 → 경고 (사각지대)', async () => {
  // Neither tier crosses 24 KiB on its own; only the sum does. A per-file budget would
  // report green here — that is exactly the defect.
  const half = Math.floor(EAGER_TIER_MAX_BYTES / 2) + 1;
  const dir = await makeEagerTierFixture({ agents: 'x'.repeat(half) });
  const home = await makeConfigHome('g'.repeat(half));
  const emptyHome = await makeConfigHome();
  try {
    assert.equal(await checkEagerTierSize(dir, withConfigHome(emptyHome)), null,
      '전역이 비면 프로젝트만으로는 예산 안이어야 한다 (전제 확인)');
    const w = await checkEagerTierSize(dir, withConfigHome(home));
    assert.ok(typeof w === 'string', '합계가 넘으면 경고해야 한다');
    assert.match(w, new RegExp((half * 2).toLocaleString('en-US') + ' B'), '합계를 보고해야 한다');
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
    await rm(emptyHome, { recursive: true, force: true });
  }
});

test('checkEagerTierSize: 전역이 주범이면 해결된 실제 경로와 "읽기만 한다"는 사실을 알린다', async () => {
  const dir = await makeEagerTierFixture({ agents: 'x'.repeat(10) });
  const home = await makeConfigHome('g'.repeat(EAGER_TIER_MAX_BYTES));
  try {
    const w = await checkEagerTierSize(dir, withConfigHome(home));
    assert.ok(w.includes(join(home, 'CLAUDE.md')),
      '라벨이 아니라 해결된 실제 경로여야 사용자가 조치 대상을 찾는다');
    assert.match(w, /전역 파일은 프로젝트 밖\(사용자 소유\)이라 하네스가 읽기만 합니다/);
  } finally { await rm(dir, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
});

test('checkEagerTierSize: 처방은 기여 바이트가 큰 계층부터 말한다', async () => {
  // Leading with "프로젝트 파일은 …" when the project tier contributed 10 B sends the
  // reader to the wrong file. The tier that caused the overage speaks first.
  const dir = await makeEagerTierFixture({ agents: 'x'.repeat(10) });
  const home = await makeConfigHome('g'.repeat(EAGER_TIER_MAX_BYTES));
  try {
    const w = await checkEagerTierSize(dir, withConfigHome(home));
    assert.ok(w.indexOf('전역 파일은') < w.indexOf('프로젝트 파일은'),
      '전역이 주범이면 전역 안내가 먼저 나와야 한다');
  } finally { await rm(dir, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
});

test('checkEagerTierSize: 프로젝트가 주범이면 프로젝트 처방이 먼저 나온다', async () => {
  const dir = await makeEagerTierFixture({ agents: 'x'.repeat(EAGER_TIER_MAX_BYTES) });
  const home = await makeConfigHome('g'.repeat(10));
  try {
    const w = await checkEagerTierSize(dir, withConfigHome(home));
    assert.ok(w.indexOf('프로젝트 파일은') < w.indexOf('전역 파일은'));
  } finally { await rm(dir, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
});

test('checkEagerTierSize: 전역 파일이 없으면 조용히 건너뛰고 프로젝트만 잰다', async () => {
  const dir = await makeEagerTierFixture({ agents: 'x'.repeat(EAGER_TIER_MAX_BYTES + 1) });
  const home = await makeConfigHome(); // config home exists, CLAUDE.md does not
  try {
    const w = await checkEagerTierSize(dir, withConfigHome(home));
    assert.ok(!w.includes(home), '없는 전역 파일은 내역에 등장하지 않아야 한다');
    assert.ok(!w.includes('전역 파일은 프로젝트 밖'), '전역 관련 안내도 붙지 않아야 한다');
  } finally { await rm(dir, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
});

test('checkEagerTierSize: 전역 config home 자체가 없어도 기존 동작을 그대로 유지한다', async () => {
  const dir = await makeEagerTierFixture({ agents: 'x'.repeat(EAGER_TIER_MAX_BYTES + 1) });
  try {
    const w = await checkEagerTierSize(dir, { CLAUDE_CONFIG_DIR: join(tmpdir(), 'harness-doctor-no-such-home-이건없음') });
    assert.match(w, /^eager 계층 /, 'config home 부재는 경고가 아니라 무음 skip이다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkEagerTierSize: 전역 CLAUDE.md가 읽기 불가(디렉터리)여도 조용히 건너뛴다', async () => {
  // A directory named CLAUDE.md makes readFile fail with EISDIR deterministically.
  // chmod 000 would not: it is a no-op for root, and CI containers often run as root.
  const dir = await makeEagerTierFixture({ agents: 'x'.repeat(EAGER_TIER_MAX_BYTES + 1) });
  const home = await makeConfigHome();
  await mkdir(join(home, 'CLAUDE.md'), { recursive: true });
  try {
    const w = await checkEagerTierSize(dir, withConfigHome(home));
    assert.match(w, /^eager 계층 /, '읽기 불가는 검사를 깨뜨리지 않는다');
    assert.ok(!w.includes(join(home, 'CLAUDE.md')), '읽지 못한 파일은 내역에서 빠진다');
  } finally { await rm(dir, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
});

test('checkEagerTierSize: 프로젝트 .claude/CLAUDE.md도 eager 계층으로 합산한다', async () => {
  // Project scope loads join(dir, ".claude", "CLAUDE.md") alongside join(dir, "CLAUDE.md").
  const half = Math.floor(EAGER_TIER_MAX_BYTES / 2) + 1;
  const dir = await makeEagerTierFixture({ agents: 'x'.repeat(half), dotClaude: 'z'.repeat(half) });
  const home = await makeConfigHome();
  try {
    const w = await checkEagerTierSize(dir, withConfigHome(home));
    assert.ok(typeof w === 'string', '.claude/CLAUDE.md를 더하면 예산을 넘는다');
    assert.match(w, new RegExp(`\\.claude/CLAUDE\\.md ${half.toLocaleString('en-US')} B`));
  } finally { await rm(dir, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
});

test('checkEagerTierSize: config home이 target 자체여도 같은 파일을 두 번 세지 않는다', async () => {
  // Running doctor on the config home itself makes join(target,"CLAUDE.md") and
  // join(configHome,"CLAUDE.md") the same file. Sized just over half the budget so the
  // two outcomes are opposite: deduped stays under and returns null, double-counted
  // would cross the budget and warn. Without the dedupe this assertion fails.
  const half = 13 * 1024;
  const dir = await makeEagerTierFixture({ claude: 'x'.repeat(half) });
  try {
    assert.ok(half * 2 > EAGER_TIER_MAX_BYTES, '이 fixture가 두 결과를 갈라야 검사가 성립한다');
    assert.equal(await checkEagerTierSize(dir, withConfigHome(dir)), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkEagerTierSize: config home이 절대경로가 아니면 전역 항목을 건너뛴다', async () => {
  // Claude Code itself refuses a non-absolute configuration home. Resolving it relative to
  // cwd could re-read the project's own CLAUDE.md and double-count it.
  assert.equal(globalClaudeMdPath({ CLAUDE_CONFIG_DIR: 'relative/dir' }), null);
  assert.equal(globalClaudeMdPath({ CLAUDE_CONFIG_DIR: '' }), null);
});

test('globalClaudeMdPath: CLAUDE_CONFIG_DIR 미설정이면 ~/.claude/CLAUDE.md로 해석한다', async () => {
  assert.equal(globalClaudeMdPath({}), join(homedir(), '.claude', 'CLAUDE.md'));
  assert.equal(globalClaudeMdPath({ CLAUDE_CONFIG_DIR: join(tmpdir(), 'cfg') }), join(tmpdir(), 'cfg', 'CLAUDE.md'));
});

test('detectLegacyStructure: AGENTS.md 실파일 + .cursorrules 없으면 null(신구조)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-new-'));
  try {
    await writeFile(join(dir, 'AGENTS.md'), '# core\n');
    await writeFile(join(dir, 'CLAUDE.md'), '@AGENTS.md\n');
    assert.equal(await detectLegacyStructure(dir), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('isPluginDevRepo: 3개 마커(.claude-plugin/plugin.json·templates·bin) 모두 있으면 true', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-plugindev-'));
  try {
    await mkdir(join(dir, '.claude-plugin'), { recursive: true });
    await writeFile(join(dir, '.claude-plugin/plugin.json'), '{}');
    await mkdir(join(dir, 'templates'), { recursive: true });
    await mkdir(join(dir, 'bin'), { recursive: true });
    await writeFile(join(dir, 'bin/harness-team.mjs'), '// cli\n');
    assert.equal(await isPluginDevRepo(dir), true);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('isPluginDevRepo: 마커 하나라도 빠지면 false (소비자 프로젝트 오탐 방지)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-consumer-'));
  try {
    // consumer has AGENTS.md/.claude but never .claude-plugin/plugin.json + templates + bin
    await writeFile(join(dir, 'AGENTS.md'), '# core\n');
    await mkdir(join(dir, 'templates'), { recursive: true });
    assert.equal(await isPluginDevRepo(dir), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('cloudSyncPathWarning: iCloud/Dropbox/Google Drive/OneDrive 경로 → 경고', () => {
  assert.match(cloudSyncPathWarning('/Users/x/Library/Mobile Documents/iCloud~md~obsidian/p'), /iCloud/);
  assert.match(cloudSyncPathWarning('/Users/x/Dropbox/p'), /Dropbox/);
  assert.match(cloudSyncPathWarning('/Users/x/Google Drive/p'), /Google Drive/);
  assert.match(cloudSyncPathWarning('/Users/x/OneDrive-Corp/p'), /OneDrive/);
});

test('cloudSyncPathWarning: 로컬 경로/빈값 → null', () => {
  assert.equal(cloudSyncPathWarning('/Users/x/projects/p'), null);
  assert.equal(cloudSyncPathWarning(''), null);
  assert.equal(cloudSyncPathWarning(null), null);
});

// --- runDoctor integration (real CLI) — guards item 5/6 branching that the pure
//     helper tests don't reach. Mirrors the manual --json checks used in dev. ---

test('runDoctor: 플러그인 소스 레포 → plugin-dev 모드, backup 체크 skip, fail 0', async () => {
  const env = await doctorJson(ROOT);
  assert.equal(env.mode, 'plugin-dev', 'top-level mode must flag plugin-dev');
  const failCount = (env.checks || []).filter(c => c.status === 'fail').length;
  assert.equal(failCount, 0, `plugin-dev repo must have 0 fails, got ${failCount}`);
  const skipCount = (env.checks || []).filter(c => c.status === 'skip').length;
  assert.ok(skipCount >= 5, `expected ≥5 skipped backup checks, got ${skipCount}`);
  assert.equal(checkOf(env, '.harness/backup.json')?.status, 'skip', 'backup.json check must be skipped, not failed');
  // Consumer-only: plugin-dev runs `node bin/harness-team.mjs` and installs no consumer
  // hooks, so a PATH miss here would be a false alarm rather than a real breakage.
  assert.equal(checkOf(env, 'SessionStart/post-commit hook CLI')?.status, 'skip',
    'hook CLI PATH check must be skipped in plugin-dev, not evaluated');
});

test('runDoctor: 깨진(dangling) symlink → "broken symlink"로 구분 fail', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-broken-'));
  try {
    await symlink(join(dir, 'nope-target.md'), join(dir, 'AGENTS.md')); // dangling
    const env = await doctorJson(dir);
    assert.equal(env.mode, 'project', 'a bare consumer dir is not plugin-dev');
    const c = checkOf(env, 'AGENTS.md');
    assert.equal(c?.status, 'fail');
    assert.match(c.detail, /broken symlink/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runDoctor: backup dir이 설정됐지만 디스크에 없으면 fail (iCloud eviction)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-nobackup-'));
  try {
    await mkdir(join(dir, '.harness'), { recursive: true });
    await writeFile(join(dir, '.harness/backup.json'), JSON.stringify({ dir: '/tmp/harness-definitely-absent-xyz' }));
    const env = await doctorJson(dir);
    const c = checkOf(env, 'backup clone dir');
    assert.equal(c?.status, 'fail');
    assert.match(c.detail, /missing on disk/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runDoctor: boundary checkpoint가 settings에 없으면 init 경고를 노출한다', async () => {
  const dir = await makeSettingsFixture({ hooks: {} });
  try {
    const env = await doctorJson(dir);
    const c = checkOf(env, 'PreToolUse boundary checkpoint');
    assert.equal(c?.status, 'warning');
    assert.match(c.detail, /harness-team init/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// jq가 없으면 Claude 훅은 fail-open 대신 저정밀 모드로 내려간다(templates/.claude/hooks/*.sh).
// "optional"이라고 보고하면 사용자가 그 사실을 알 방법이 없다 — 나머지 외부 도구와 구분해 경고한다.
test('runDoctor: jq 부재는 optional이 아니라 warning으로 보고한다 (다른 외부 도구는 종전대로)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-nojq-'));
  try {
    // node만 있는 PATH — jq/gh/codex 등은 모두 미탐지 상태가 된다.
    const env = { PATH: dirname(process.execPath), HOME: homedir() };
    const envelope = await doctorJson(dir, env);
    const jq = checkOf(envelope, 'jq (JSON processor)');
    assert.equal(jq?.status, 'warning', 'jq는 보안 통제 정밀도에 영향을 주므로 경고여야 한다');
    assert.match(jq.detail, /저정밀/);
    const gh = checkOf(envelope, 'gh (GitHub CLI)');
    assert.equal(gh?.status, 'missing', '나머지 외부 도구의 optional 표기는 그대로');
    assert.match(gh.detail, /optional/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// --- jq 경고 정직성: 설치본 훅에 폴백 블록이 있는지에 따라 문구·처방이 갈린다 ---
// "차단은 유지"는 harness:jq-fallback 마커가 있는 훅에서만 참이다. 마커 없는
// pre-#29 설치본은 jq 부재 시 조용히 무력화(fail-open)되므로 migrate로 보낸다.

test('jqFallbackGaps: 마커 없는 설치 훅만 나열한다 (마커 있음·미설치는 제외)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-gaps-'));
  try {
    await mkdir(join(dir, '.claude/hooks'), { recursive: true });
    await writeFile(join(dir, '.claude/hooks/block-dangerous-git.sh'), '#!/bin/bash\n# old, no fallback\n');
    await writeFile(join(dir, '.claude/hooks/auto-format.sh'), `#!/bin/bash\n# --- ${JQ_FALLBACK_MARKER} ---\n`);
    // protect-files.sh / pre-commit-check.sh 미설치 — gap이 아니다 (실행될 훅이 없음)
    assert.deepEqual(await jqFallbackGaps(dir), ['block-dangerous-git.sh']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('jqFallbackGaps: 훅 미설치 프로젝트 → 빈 배열', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-nogaps-'));
  try {
    assert.deepEqual(await jqFallbackGaps(dir), []);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('jqInstallAction: 플랫폼별 실행 가능한 설치 명령을 준다', () => {
  assert.equal(jqInstallAction('darwin'), 'brew install jq');
  assert.match(jqInstallAction('linux'), /apt-get install/);
});

// fail이 하나라도 있으면 next_actions가 ['harness-team sync']로 대체되므로,
// 경고 경로를 보려면 fail 0인 소비자 fixture가 필요하다 (CHECKS의 required 항목 충족).
async function healthyConsumerFixture(hooks = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-jqhon-'));
  await writeFile(join(dir, 'AGENTS.md'), '# core\n<!-- harness:section="protocol" -->\n');
  await writeFile(join(dir, 'CLAUDE.md'), '@AGENTS.md\n');
  await mkdir(join(dir, '.claude/hooks'), { recursive: true });
  await writeFile(join(dir, '.claude/settings.json'), '{}\n');
  for (const name of ['clone.sh', 'symlink.sh', 'delete.sh']) {
    await writeFile(join(dir, name), '#!/bin/sh\n', { mode: 0o755 });
  }
  const backup = join(dir, 'backup-clone');
  await mkdir(backup, { recursive: true });
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(join(dir, '.harness/backup.json'), JSON.stringify({ dir: backup }));
  for (const [name, body] of Object.entries(hooks)) {
    await writeFile(join(dir, '.claude/hooks', name), body, { mode: 0o755 });
  }
  return dir;
}

const noJqEnvFor = (dir) => ({
  PATH: dirname(process.execPath),
  HOME: homedir(),
  CLAUDE_PLUGINS_ROOT: join(dir, 'no-plugins-root'), // 머신의 실제 설치 기록과 격리
});

test('runDoctor: jq 부재 + 폴백 블록 없는 훅 → fail-open 경고와 migrate 처방 ("차단 유지" 주장 금지)', async () => {
  const oldHook = await readFile(join(ROOT, 'tests/fixtures/stock-hooks/pre-jq-fallback/block-dangerous-git.sh'), 'utf8');
  const dir = await healthyConsumerFixture({ 'block-dangerous-git.sh': oldHook });
  try {
    const envelope = await doctorJson(dir, noJqEnvFor(dir));
    const failCount = (envelope.checks || []).filter(c => c.status === 'fail').length;
    assert.equal(failCount, 0, 'fixture는 fail 0이어야 경고 next_actions가 노출된다');
    const jq = checkOf(envelope, 'jq (JSON processor)');
    assert.equal(jq?.status, 'warning', 'fail-open이어도 jq 경고는 warning (exit code 계약 유지)');
    assert.match(jq.detail, /fail-open|무력화/, '무방비 상태를 명시해야 한다');
    assert.match(jq.detail, /migrate/, '처방(migrate)을 함께 안내해야 한다');
    assert.doesNotMatch(jq.detail, /차단은 유지/, '폴백 블록 없는 설치본에 "차단 유지" 주장은 거짓이다');
    assert.ok(envelope.next_actions.includes('harness-team migrate'),
      `next_actions에 migrate가 있어야 한다: ${JSON.stringify(envelope.next_actions)}`);
    assert.ok(envelope.next_actions.includes(jqInstallAction()), 'jq 설치 명령도 함께 안내');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runDoctor: jq 부재 + 폴백 블록 있는 훅 → 저정밀 문구 유지, next_actions는 jq 설치만', async () => {
  const currentHook = await readFile(join(ROOT, 'templates/.claude/hooks/block-dangerous-git.sh'), 'utf8');
  const dir = await healthyConsumerFixture({ 'block-dangerous-git.sh': currentHook });
  try {
    const envelope = await doctorJson(dir, noJqEnvFor(dir));
    const jq = checkOf(envelope, 'jq (JSON processor)');
    assert.equal(jq?.status, 'warning');
    assert.match(jq.detail, /저정밀/, '폴백이 있으면 현행 저정밀 문구를 유지한다');
    assert.ok(!envelope.next_actions.includes('harness-team migrate'),
      '폴백이 있는 설치본에 migrate를 강요하지 않는다');
    assert.ok(envelope.next_actions.includes(jqInstallAction()),
      `jq 경고에는 항상 설치 remedy가 따른다: ${JSON.stringify(envelope.next_actions)}`);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runDoctor: docs/decisions.md 없는 프로젝트 → decision log 경고 배선', async () => {
  const dir = await makeDecisionLogFixture(undefined);
  try {
    const env = await doctorJson(dir);
    const c = checkOf(env, 'decision log');
    assert.equal(c?.status, 'warning');
    assert.match(c.detail, /decisions\.md/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// --- eager tier size — runDoctor wiring ---
//
// These spawn the real CLI, so they must pin CLAUDE_CONFIG_DIR in the subprocess env too:
// otherwise doctor reads the running machine's own ~/.claude/CLAUDE.md and the assertions
// swing with whatever the maintainer happens to have in it.
const doctorEnv = home => ({ ...process.env, CLAUDE_CONFIG_DIR: home });

test('runDoctor: eager 계층이 24 KiB 초과 → 경고, doctor는 여전히 성공한다', async () => {
  const dir = await healthyConsumerFixture();
  const home = await makeConfigHome();
  try {
    // healthyConsumerFixture's AGENTS.md already carries the required CHECKS marker —
    // keep it and pad past the budget so this only exercises the size check.
    await writeFile(join(dir, 'AGENTS.md'), '# core\n<!-- harness:section="protocol" -->\n' + 'x'.repeat(EAGER_TIER_MAX_BYTES));
    const env = await doctorJson(dir, doctorEnv(home));
    const c = checkOf(env, 'eager tier size');
    assert.equal(c?.status, 'warning');
    assert.match(c.detail, /^eager 계층 /);
    assert.match(c.detail, /내역: AGENTS\.md /, '파일별 내역이 배선을 통과해야 한다');
    const failCount = (env.checks || []).filter(x => x.status === 'fail').length;
    assert.equal(failCount, 0, '이 경고만으로 다른 필수 점검이 fail 처리되면 안 된다');
    assert.notEqual(env.status, 'error', '경고는 fail이 아니므로 doctor의 exit code(0)에 영향을 주면 안 된다');
  } finally { await rm(dir, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
});

test('runDoctor: eager 계층이 24 KiB 이내면 경고를 노출하지 않는다', async () => {
  const dir = await healthyConsumerFixture();
  const home = await makeConfigHome();
  try {
    const env = await doctorJson(dir, doctorEnv(home));
    assert.equal(checkOf(env, 'eager tier size'), undefined);
  } finally { await rm(dir, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
});

test('runDoctor: 프로젝트는 예산 안이지만 전역을 더하면 초과 → 경고가 배선을 통과한다', async () => {
  // The reported defect, end to end: doctor used to report green here.
  const dir = await healthyConsumerFixture();
  const half = Math.floor(EAGER_TIER_MAX_BYTES / 2) + 1;
  const home = await makeConfigHome('g'.repeat(half));
  const emptyHome = await makeConfigHome();
  try {
    await writeFile(join(dir, 'AGENTS.md'), '# core\n<!-- harness:section="protocol" -->\n' + 'x'.repeat(half));
    assert.equal(checkOf(await doctorJson(dir, doctorEnv(emptyHome)), 'eager tier size'), undefined,
      '전역이 비면 프로젝트만으로는 예산 안이어야 한다 (전제 확인)');
    const c = checkOf(await doctorJson(dir, doctorEnv(home)), 'eager tier size');
    assert.equal(c?.status, 'warning', '합계가 넘으면 경고해야 한다');
    assert.ok(c.detail.includes(join(home, 'CLAUDE.md')), '전역 파일의 해결된 경로를 알려야 한다');
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
    await rm(emptyHome, { recursive: true, force: true });
  }
});

// --- stale skill/rule templates (D8) ---
//
// init은 skipExisting이라 *수정된* 템플릿을 배달하지 못한다. 갱신 경로(migrate)가 있어도
// 발견성이 없으면 아무도 부르지 않는다 — 이 경고가 그 발견성이다.
// jq 경고와 같은 이유로 healthyConsumerFixture를 쓴다: fail이 있으면 next_actions가
// ['harness-team sync']로 대체돼 라우팅을 검증할 수 없다.
test('runDoctor: 낡은 스킬 설치본 → stale 경고 + migrate 라우팅', async () => {
  const dir = await healthyConsumerFixture();
  try {
    const stale = await readFile(join(ROOT,
      'tests/fixtures/stock-templates/2026-09-07-286ef8e9/.claude/skills/new-feature/SKILL.md'), 'utf8');
    await mkdir(join(dir, '.claude/skills/new-feature'), { recursive: true });
    await writeFile(join(dir, '.claude/skills/new-feature/SKILL.md'), stale);

    const envelope = await doctorJson(dir);
    assert.equal((envelope.checks || []).filter(c => c.status === 'fail').length, 0,
      'fixture는 fail 0이어야 경고 next_actions가 노출된다');
    const check = checkOf(envelope, 'stale skill/rule templates');
    assert.equal(check?.status, 'warning');
    assert.match(check.detail, /new-feature\/SKILL\.md/, '낡은 파일을 지목해야 한다');
    assert.match(check.detail, /migrate/, '처방을 함께 안내해야 한다');
    assert.ok(envelope.next_actions.includes('harness-team migrate'),
      `next_actions에 migrate가 있어야 한다: ${JSON.stringify(envelope.next_actions)}`);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runDoctor: 최신 스킬 설치본 → stale 경고 없음 (멱등)', async () => {
  const dir = await healthyConsumerFixture();
  try {
    await mkdir(join(dir, '.claude/skills/new-feature'), { recursive: true });
    await writeFile(join(dir, '.claude/skills/new-feature/SKILL.md'),
      await readFile(join(ROOT, 'templates/.claude/skills/new-feature/SKILL.md'), 'utf8'));
    assert.equal(checkOf(await doctorJson(dir), 'stale skill/rule templates'), undefined);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 사용자가 편집한 파일은 stock이 아니라 refresh 대상이 아니다 — 경고도 내지 않는다.
// 경고를 내면 "migrate 하라"는 뜻인데 migrate는 그 파일을 건드리지 않으므로 거짓 안내가 된다.
test('runDoctor: 커스터마이즈된 스킬 → stale 경고 없음 (migrate가 안 고치는 것을 시키지 않는다)', async () => {
  const dir = await healthyConsumerFixture();
  try {
    const stale = await readFile(join(ROOT,
      'tests/fixtures/stock-templates/2026-09-07-286ef8e9/.claude/skills/new-feature/SKILL.md'), 'utf8');
    await mkdir(join(dir, '.claude/skills/new-feature'), { recursive: true });
    await writeFile(join(dir, '.claude/skills/new-feature/SKILL.md'), stale + '\n<!-- 팀 커스텀 -->\n');
    assert.equal(checkOf(await doctorJson(dir), 'stale skill/rule templates'), undefined);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 안내 문구가 가리키는 원본이 실제로 존재하고 누락 절을 담고 있는지 — 경로가 옮겨지면 안내가
// 허공을 가리키는데, 문구는 사람이 읽는 산문이라 아무 테스트도 안 깨진다.
// 경로에 공백이 있을 수 있으므로(플러그인이 iCloud 경로에 설치되는 실제 사례) 백틱으로 구분한다.
test('checkDecisionLog: 안내가 가리키는 templates 원본이 실제로 존재하고 누락 절을 담는다', async () => {
  const dir = await makeDecisionLogFixture('# Team Decision Log\n\n## D2 (2026-06-11) — a\n');
  try {
    const w = await checkDecisionLog(dir, ROOT);
    const quoted = /`([^`]+)`/.exec(w);
    assert.ok(quoted, '원본 경로는 백틱으로 구분해야 한다 — 공백 있는 경로에서 끝을 알 수 없다');
    const source = quoted[1];
    assert.equal(isAbsolute(source), true, `root를 주면 절대 경로로 안내한다: ${source}`);

    const body = await readFile(source, 'utf8');
    for (const h of DECISION_HEADINGS) {
      assert.match(body, new RegExp(`^${h}\\b`, 'm'), `안내 원본에 ${h} 절이 있어야 복사가 성립한다`);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkDecisionLog: root 없이 호출하면 상대 경로로 안내한다 (하위호환)', async () => {
  const dir = await makeDecisionLogFixture('# Team Decision Log\n\n## D2 (2026-06-11) — a\n');
  try {
    assert.match(await checkDecisionLog(dir), /templates\/docs\/decisions\.md/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// observe-surfacing plan 2: 판정(트립와이어)을 doctor 경고 1건으로 표면화한다 — warn 수준(fail 아님),
// 발화가 없으면(not-installed·no-data·ok) 침묵. fixture는 실제 훅(observeToolEvent)이 쓴 레코드다.
let observeSeq = 0;
function observePayload(event, over = {}) {
  observeSeq += 1;
  return {
    hook_event_name: event, session_id: 'sess-doc', tool_use_id: `call-${observeSeq}`, tool_name: 'Bash',
    tool_input: { command: 'ls' }, tool_response: { stdout: 'x' }, duration_ms: 12, ...over,
  };
}
async function makeObserveFixture(failures) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-observe-'));
  for (let i = 0; i < failures; i += 1) {
    await observeToolEvent(observePayload('PostToolUseFailure', { error: 'boom' }), { projectDir: dir, now: new Date() });
  }
  return dir;
}

test('checkObserveTripWires: 로그 디렉터리 없음(not-installed) → null', async () => {
  const dir = await makeObserveFixture(0);
  try { assert.equal(await checkObserveTripWires(dir), null); } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkObserveTripWires: 창에 레코드 없음(no-data)·성공만(ok) → null', async () => {
  const dir = await makeObserveFixture(0);
  try {
    await mkdir(join(dir, OBSERVABILITY_BASE), { recursive: true });
    assert.equal(await checkObserveTripWires(dir), null, 'no-data');
    await observeToolEvent(observePayload('PostToolUse'), { projectDir: dir, now: new Date() });
    assert.equal(await checkObserveTripWires(dir), null, 'ok');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkObserveTripWires: 같은 도구 3회 실패(tripped) → wire id·수치·observe 안내·루프백 nudge를 담은 한 줄 경고', async () => {
  const dir = await makeObserveFixture(3);
  try {
    const w = await checkObserveTripWires(dir);
    assert.ok(typeof w === 'string', 'returns a warning string');
    assert.match(w, /^observe 트립와이어 발화: repeat-failure-3x\(/, 'wire id로 시작');
    assert.match(w, /×3/, '핵심 수치(반복 횟수)');
    assert.match(w, /harness-team observe/, '상세는 observe 명령으로 안내');
    assert.match(w, /harness-team task observe-repeat-failure-3x-\d{4}-\d{2}-\d{2} /, '루프백 nudge 인용');
    assert.match(w, /자동 생성은 하지 않는다/, 'nudge는 제안일 뿐');
    assert.doesNotMatch(w, /\n/, '경고는 한 줄');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// warn 검사가 doctor를 crash 시키면 envelope 자체가 안 나온다(checkDecisionLog와 같은 계약).
// 잘못된 `now`는 판정 안쪽(windowDays)에서 TypeError를 내는 가장 짧은 예외 경로다.
test('checkObserveTripWires: 판정 중 예외 → null, throw 금지', async () => {
  const dir = await makeObserveFixture(3);
  try {
    assert.equal(await checkObserveTripWires(dir, { now: 'not-a-date' }), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// runDoctor 배선(e2e, 실제 CLI): 발화 fixture에서 doctor --json의 checks[]에 warn 1건이 실리고(fail 아님),
// 로그가 없는 fixture에서는 그 항목 자체가 없다 — 침묵 계약. 필수 파일이 없는 bare 디렉터리라 exit는 0이
// 아니므로 stdout만 취한다.
test('doctor --json: tripped 로그 → checks에 observe trip wires warning 1건, 로그 없음 → 항목 없음', async () => {
  const tripped = await makeObserveFixture(3);
  const bare = await makeObserveFixture(0);
  const run = dir => pexec('node', [join(ROOT, 'bin/harness-team.mjs'), 'doctor', '--json', '--target', dir], { timeout: 30000 })
    .then(r => r.stdout).catch(error => error.stdout || '');
  try {
    const hotEnvelope = JSON.parse(await run(tripped));
    const coldEnvelope = JSON.parse(await run(bare));
    const hotChecks = hotEnvelope.checks;
    const coldChecks = coldEnvelope.checks;
    const hot = hotChecks.filter(c => c.label === 'observe trip wires');
    assert.equal(hot.length, 1, 'exactly one entry');
    assert.equal(hot[0].status, 'warning', 'warn, never fail');
    assert.match(hot[0].detail, /repeat-failure-3x/);
    assert.equal(coldChecks.filter(c => c.label === 'observe trip wires').length, 0, 'not-installed is silent');
    // codex P2(2026-09-09): bare fixture는 어차피 필수 검사로 exit 1이라 exit code로는 "warn이 fail로 새지 않는다"를
    // 증명할 수 없다 — 두 실행의 fail 수가 같음으로 대신 고정한다(observe 경고가 fail 수를 늘리면 여기서 걸린다).
    const fails = checks => checks.filter(c => c.status === 'fail').length;
    assert.equal(fails(hotChecks), fails(coldChecks), 'observe 경고는 checks[]의 fail 항목을 늘리지 않는다');
    // checks[]는 fail *항목*만 보여 준다 — exit code를 정하는 것은 runDoctor의 fail 카운터이고, 그 값은 envelope의
    // status와 error.root_cause("N개 필수 점검 항목 실패")에만 드러난다. 둘이 같아야 카운터도 같다(fail++ 변이 검출).
    assert.equal(hotEnvelope.status, coldEnvelope.status, 'envelope status 동일');
    assert.equal(hotEnvelope.error?.root_cause, coldEnvelope.error?.root_cause, 'fail 카운터(root_cause의 N)가 동일');
  } finally {
    await rm(tripped, { recursive: true, force: true });
    await rm(bare, { recursive: true, force: true });
  }
});

// codex P3: 오늘 실패만 심으면 창을 days:1로 좁혀도 통과한다 — 3일 전 실패가 뜨는지로 observe CLI와 같은 창임을 고정.
test('checkObserveTripWires: 3일 전 실패도 창(7일) 안이면 경고 — observe CLI와 같은 창', async () => {
  const dir = await makeObserveFixture(0);
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);
    for (let i = 0; i < 3; i += 1) {
      await observeToolEvent(observePayload('PostToolUseFailure', { error: 'boom' }), { projectDir: dir, now: threeDaysAgo });
    }
    assert.match((await checkObserveTripWires(dir)) ?? '', /repeat-failure-3x/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// --- 결함 3: dangling 훅 참조 / 판정 불가 (migrate-init-gaps plan 5) ---

test('classifyHookCommand: 상대경로 → project-path', () => {
  assert.deepEqual(classifyHookCommand('./.claude/hooks/protect-files.sh'),
    { kind: 'project-path', rel: '.claude/hooks/protect-files.sh' });
});

test('classifyHookCommand: ${CLAUDE_PROJECT_DIR} 접두 → project-path', () => {
  assert.deepEqual(classifyHookCommand('node "${CLAUDE_PROJECT_DIR}/.claude/hooks/observe-tools.mjs"'),
    { kind: 'project-path', rel: '.claude/hooks/observe-tools.mjs' });
});

test('classifyHookCommand: 전역 CLI → global-cli (검사 대상 아님)', () => {
  assert.equal(classifyHookCommand('harness-team session-context 2>/dev/null || true').kind, 'global-cli');
});

test('classifyHookCommand: 해석 불가 → unknown (침묵하지 않는다)', () => {
  assert.equal(classifyHookCommand('cat foo | awk "{print}" > /tmp/x').kind, 'unknown');
});

test('collectHookCommands: 모든 이벤트·그룹에서 command를 모은다', () => {
  const settings = { hooks: {
    SessionStart: [{ hooks: [{ type: 'command', command: 'a' }, { type: 'command', command: 'b' }] }],
    PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'c' }] }],
  } };
  assert.deepEqual(collectHookCommands(settings).sort(), ['a', 'b', 'c']);
});

test('doctor: settings가 없는 프로젝트 내부 훅을 가리키면 경고한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-dangling-'));
  try {
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(join(dir, '.claude/settings.json'), JSON.stringify({
      hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PROJECT_DIR}/.claude/hooks/ghost.mjs"' }] }] },
    }, null, 2));
    const env = await doctorJson(dir);
    const hit = (env.checks || []).find(c => c.status === 'warning' && /ghost\.mjs/.test(c.detail ?? ''));
    assert.ok(hit, 'dangling 참조가 warning으로 보고된다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('doctor: 해석하지 못한 command는 판정 불가로 보고한다 (침묵 금지)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-unknown-'));
  try {
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(join(dir, '.claude/settings.json'), JSON.stringify({
      hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'cat foo | awk "{print}"' }] }] },
    }, null, 2));
    const env = await doctorJson(dir);
    const hit = (env.checks || []).find(c => c.status === 'warning' && /판정 불가/.test(c.detail ?? ''));
    assert.ok(hit, '해석 못 한 command가 보고된다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

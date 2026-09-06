import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { renderDoneMarker, hasDoneMarker } from '../src/handoff-marker.mjs';
import { runDone, taskArtifactTemplate } from '../src/commands/task.mjs';
import { collectTasks } from '../src/commands/summary.mjs';

// task handoff 의 완료 마커는 **파일에 남는 완료 증거**다. meta.json 이 없는 레거시 task 에서는
// `inferLegacyMeta` 가 원장과 함께 이것만 보고 done 을 판정한다.
//
// 이 파일이 생기기 전에는 생산자(`runDone`)와 소비자(`inferLegacyMeta`)가 서로 다른 모듈에
// 손으로 복사한 리터럴로만 묶여 있었다. 실측: 생산자의 em-dash 를 하이픈으로 바꾸면
// 완료된 레거시 task 가 `open` 으로 오분류되는데 609개 테스트가 전부 통과했다.
//
// 아래 테스트는 두 방향의 드리프트를 각각 막는다 —
// 왕복/바이트 모양은 **생산자** 드리프트를, 동결 fixture 는 **소비자** 드리프트를 잡는다.

test('왕복: 렌더러가 만든 마커를 파서가 반드시 알아본다', () => {
  assert.ok(hasDoneMarker(renderDoneMarker('2026-01-01T00:00:00.000Z')));
});

test('왕복: 어떤 ISO 타임스탬프에도 성립한다', () => {
  for (const ts of [
    '2026-01-01T00:00:00.000Z',
    '2026-09-06T11:22:45.611Z',
    '1999-12-31T23:59:59.999Z',
  ]) {
    assert.ok(hasDoneMarker(renderDoneMarker(ts)), ts);
  }
});

// 아래 두 fixture 는 **렌더러에서 생성하지 않는다.** 이미 디스크에 쓰인 과거 형태를 그대로
// 못박아 두는 것이 목적이므로, 렌더러가 바뀌어도 이 리터럴은 따라 바뀌면 안 된다.
// 파서를 좁히면(예: ISO 형태만 허용) 여기서 깨진다 — 그것이 지금 고치려는 사고와 같은 사고다.

test('동결 fixture: ISO 형태의 과거 마커를 계속 읽는다', () => {
  const historical = '# demo — Handoff\n\n## 2026-01-01T00:00:00.000Z — 완료\n\n태스크 종료.\n';
  assert.ok(hasDoneMarker(historical));
});

test('동결 fixture: 날짜만 있는 과거 마커도 계속 읽는다', () => {
  // tests/summary.test.mjs 가 실제로 쓰는 형태 — 타임스탬프가 아니라 날짜뿐이다.
  assert.ok(hasDoneMarker('## 2026-01-01 — 완료\n'));
});

test('마커가 없는 handoff 는 완료가 아니다', () => {
  const fresh = '# demo — Handoff\n\n(세션 종료 시 post-commit hook이 자동 갱신합니다)\n';
  assert.equal(hasDoneMarker(fresh), false);
});

// post-commit 훅이 커밋마다 쌓는 항목은 같은 `## <시각> — <텍스트>` 모양이다. 커밋 메시지가
// 하필 "완료" 로 끝나도 종결로 읽히면 안 된다 — 파서를 `/완료/` 같은 단순 포함 검사로
// "정리" 하려는 시도를 여기서 막는다.
test('커밋 항목은 메시지가 완료로 끝나도 완료 마커가 아니다', () => {
  const entry = '# demo — Handoff\n\n## 2026-01-01T00:00:00.000Z — abc1234 리팩터링 완료\n';
  assert.equal(hasDoneMarker(entry), false);
});

test('본문에 완료라는 단어가 있어도 헤딩이 아니면 완료가 아니다', () => {
  assert.equal(hasDoneMarker('# demo — Handoff\n\n이 단계는 완료\n'), false);
});

// append-only 파일에 과거 항목과 섞여 쌓이므로 출력 바이트가 바뀌면 이력이 어긋난다.
// `renderUserHandoff` 의 바이트 모양 테스트와 같은 이유로 못박는다.
test('바이트 모양: 오늘의 출력을 그대로 고정한다', () => {
  const ts = '2026-01-01T00:00:00.000Z';
  assert.equal(renderDoneMarker(ts), '\n## 2026-01-01T00:00:00.000Z — 완료\n\n태스크 종료.\n');
});

// ─────────────────────────────────────────────────────────────────────────────
// 위 테스트들은 **모듈의 계약**만 고정한다 — 호출부가 helper 를 버리고 제 문자열을 쓰거나
// 판정을 그만두면 전부 통과한다 (2026-09-06 Codex 리뷰 P2 2건, 뮤테이션으로 재현 확인).
// 아래 두 개가 그 구멍을 막는다: 생산자·소비자를 **실제로 실행해** 계약을 확인한다.
// ─────────────────────────────────────────────────────────────────────────────

const HANDOFF_HEAD = '# demo — Handoff\n';

// non-git tmpdir 이라 done 가드의 git 검사는 degrade 되어 건너뛴다 — plan/artifact 신호만으로 통과.
async function makeDoneFixture() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-marker-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(
    join(dir, '.harness/active.json'),
    JSON.stringify({ user: 'tester', task: 'demo', path: 'docs/tester/demo' }),
  );
  const taskDir = join(dir, 'docs', 'tester', 'demo');
  await mkdir(taskDir, { recursive: true });
  await writeFile(join(taskDir, 'demo-handoff.md'), HANDOFF_HEAD);
  await writeFile(join(taskDir, 'demo-plan.md'), '# demo — Plan\n\n## 단계\n- [x] 완료\n');
  await writeFile(join(taskDir, 'demo-artifact.md'), taskArtifactTemplate('demo') + '\n- 실제 결과 기록\n');
  return { dir, taskDir };
}

function captureLogs() {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  return { logs, restore: () => { console.log = orig; } };
}

// 생산자 통합: `runDone` 이 **실제로 append 하는 바이트**가 렌더러 출력과 같아야 한다.
// runDone 이 helper 를 버리고 비호환 리터럴을 직접 쓰면 여기서 깨진다.
test('생산자 통합: runDone 이 append 하는 바이트가 renderDoneMarker 출력과 같다', async () => {
  const { dir, taskDir } = await makeDoneFixture();
  const prevExit = process.exitCode;
  const { restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    const content = await readFile(join(taskDir, 'demo-handoff.md'), 'utf8');

    assert.ok(hasDoneMarker(content), 'runDone 의 출력이 파서에 잡혀야 한다');

    const appended = content.slice(HANDOFF_HEAD.length);
    const ts = appended.match(/^\n## (\S+) /)?.[1];
    assert.ok(ts, `append 된 블록에서 시각을 못 읽었다: ${JSON.stringify(appended)}`);
    assert.equal(appended, renderDoneMarker(ts));
  } finally {
    restore();
    process.exitCode = prevExit;
    await rm(dir, { recursive: true, force: true });
  }
});

// 소비자 통합: meta.json 도 원장 행도 없어 **마커가 유일한 증거**인 레거시 task.
// `inferLegacyMeta` 가 마커 판정을 그만두면 여기서 깨진다.
// handoff 본문은 렌더러가 아니라 동결 리터럴이다 — 과거에 쓰인 파일을 재현하는 것이 목적이다.
test('소비자 통합: 마커만 있는 레거시 task 를 collectTasks 가 done 으로 읽는다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-marker-'));
  try {
    const taskDir = join(dir, 'docs', 'tester', 'old');
    await mkdir(taskDir, { recursive: true });
    await writeFile(join(taskDir, 'old-spec.md'), '# old — Spec\n');
    await writeFile(
      join(taskDir, 'old-handoff.md'),
      '# old — Handoff\n\n## 2026-01-01T00:00:00.000Z — 완료\n\n태스크 종료.\n',
    );
    // 원장 파일을 쓰지 않는다 — summaryRow·completedNames 가 비어야 마커가 유일 증거가 된다.

    const tasks = await collectTasks(dir);
    const old = tasks.find(t => t.task === 'old');
    assert.ok(old, 'task 가 수집되어야 한다');
    assert.equal(old.status, 'done', '마커가 유일한 증거일 때 done 으로 읽혀야 한다');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

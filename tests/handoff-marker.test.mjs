import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { hasDoneMarker } from '../src/handoff-marker.mjs';
import { runDone, taskArtifactTemplate } from '../src/commands/task.mjs';
import { collectTasks } from '../src/commands/summary.mjs';

// 옛 task handoff 의 완료 마커는 meta.json 이 없는 레거시 task 의 완료 증거다. 새 종결은 마커를 쓰지 않으므로
// 파서는 이미 디스크에 쓰인 형태만 읽으면 된다. 아래 fixture 는 그 과거 형태를 그대로 못박는다.
// 파서를 좁히면(예: ISO 형태만 허용) 여기서 깨진다.

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

test('runDone 은 handoff 에 마커를 쓰지 않고 meta.json 만으로 완료를 남긴다', async () => {
  const { dir, taskDir } = await makeDoneFixture();
  await writeFile(join(taskDir, 'demo-spec.md'), '# demo — Spec\n');
  const prevExit = process.exitCode;
  const { restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    assert.equal(await readFile(join(taskDir, 'demo-handoff.md'), 'utf8'), HANDOFF_HEAD);
    const demo = (await collectTasks(dir)).find(t => t.task === 'demo');
    assert.equal(demo.status, 'done');
    assert.ok(demo.closedAt, '종결 시각이 meta 에 있다');
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

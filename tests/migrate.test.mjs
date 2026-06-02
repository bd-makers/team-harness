import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { migrateTaskTo07 } from '../src/commands/migrate.mjs';

// A 0.6.0 task = <name>-{spec,plan,handoff}.md present, <name>-artifact.md absent.
async function make06Task(name, { handoff, spec, plan } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-mig07-'));
  const taskDir = join(dir, 'docs', 'tester', name);
  await mkdir(taskDir, { recursive: true });
  await writeFile(join(taskDir, `${name}-spec.md`), spec ?? `# ${name} — Spec\n\n## 목적\n\n사용자가 직접 쓴 내용\n`);
  await writeFile(join(taskDir, `${name}-plan.md`), plan ?? `# ${name} — Plan\n\n## 단계\n- [x] 완료된 단계\n`);
  await writeFile(join(taskDir, `${name}-handoff.md`), handoff ?? `# ${name} — Handoff\n\n핸드오프 본문\n`);
  return { dir, taskDir };
}

const ctxFor = (dir) => ({ targetDir: dir, flags: { yes: true }, taskArgs: [] });

test('A: handoff의 ## Artifact 섹션을 artifact.md로 분리하고 내용을 보존한다', async () => {
  const { dir, taskDir } = await make06Task('demo', {
    handoff: `# demo — Handoff\n\n작업 핸드오프 내용입니다.\n\n## Artifact\n\n최종 결과: 기능 완성됨.\n배운 점: X.\n`,
  });
  try {
    await migrateTaskTo07(ctxFor(dir));

    const artifact = await readFile(join(taskDir, 'demo-artifact.md'), 'utf8');
    assert.match(artifact, /최종 결과: 기능 완성됨/);
    assert.match(artifact, /배운 점: X/);

    const handoff = await readFile(join(taskDir, 'demo-handoff.md'), 'utf8');
    assert.match(handoff, /작업 핸드오프 내용/);
    assert.doesNotMatch(handoff, /## Artifact/, 'handoff에서 Artifact 섹션 제거');
    assert.doesNotMatch(handoff, /최종 결과: 기능 완성됨/, 'artifact 본문은 handoff에 남지 않음');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('B: handoff에 Artifact 섹션이 없으면 빈 artifact.md scaffold를 생성한다', async () => {
  const { dir, taskDir } = await make06Task('plain', {
    handoff: `# plain — Handoff\n\n(세션 종료 시 post-commit hook이 자동 갱신합니다)\n`,
  });
  try {
    await migrateTaskTo07(ctxFor(dir));

    const artifact = await readFile(join(taskDir, 'plain-artifact.md'), 'utf8');
    assert.match(artifact, /# plain — Artifact/);
    assert.match(artifact, /## Learnings/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('C: artifact.md가 이미 있으면(0.7 task) 덮어쓰지 않고 skip한다', async () => {
  const { dir, taskDir } = await make06Task('already', {
    handoff: `# already — Handoff\n\n본문\n\n## Artifact\n\n새 내용\n`,
  });
  try {
    const artifactPath = join(taskDir, 'already-artifact.md');
    await writeFile(artifactPath, '# already — Artifact\n\nSENTINEL 기존내용\n');
    const handoffBefore = await readFile(join(taskDir, 'already-handoff.md'), 'utf8');

    await migrateTaskTo07(ctxFor(dir));

    const artifact = await readFile(artifactPath, 'utf8');
    assert.match(artifact, /SENTINEL 기존내용/, 'artifact 덮어쓰기 금지');
    const handoffAfter = await readFile(join(taskDir, 'already-handoff.md'), 'utf8');
    assert.equal(handoffAfter, handoffBefore, '이미 0.7이면 handoff도 불변');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('D: spec.md / plan.md는 절대 건드리지 않는다 (Ambiguity·Ontology 주입 없음)', async () => {
  const { dir, taskDir } = await make06Task('nospill');
  try {
    const specBefore = await readFile(join(taskDir, 'nospill-spec.md'), 'utf8');
    const planBefore = await readFile(join(taskDir, 'nospill-plan.md'), 'utf8');

    await migrateTaskTo07(ctxFor(dir));

    const specAfter = await readFile(join(taskDir, 'nospill-spec.md'), 'utf8');
    const planAfter = await readFile(join(taskDir, 'nospill-plan.md'), 'utf8');
    assert.equal(specAfter, specBefore, 'spec.md 불변');
    assert.equal(planAfter, planBefore, 'plan.md 불변');
    assert.doesNotMatch(specAfter, /Ambiguity/, 'Ambiguity 섹션 주입 안 됨');
    assert.doesNotMatch(specAfter, /Ontology/, 'Ontology 섹션 주입 안 됨');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('E: 멱등 — 두 번 실행해도 두 번째는 변경 없음', async () => {
  const { dir, taskDir } = await make06Task('twice', {
    handoff: `# twice — Handoff\n\n본문\n\n## Artifact\n\n결과물\n`,
  });
  try {
    await migrateTaskTo07(ctxFor(dir));
    const artifact1 = await readFile(join(taskDir, 'twice-artifact.md'), 'utf8');
    const handoff1 = await readFile(join(taskDir, 'twice-handoff.md'), 'utf8');

    await migrateTaskTo07(ctxFor(dir));
    const artifact2 = await readFile(join(taskDir, 'twice-artifact.md'), 'utf8');
    const handoff2 = await readFile(join(taskDir, 'twice-handoff.md'), 'utf8');

    assert.equal(artifact2, artifact1, 'artifact 멱등');
    assert.equal(handoff2, handoff1, 'handoff 멱등');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('F: 반환값 — 마이그레이션 수행 시 true, 대상 없으면 false', async () => {
  const { dir } = await make06Task('ret', {
    handoff: `# ret — Handoff\n\n본문\n`,
  });
  try {
    const first = await migrateTaskTo07(ctxFor(dir));
    assert.equal(first, true, '대상 있으면 true');
    const second = await migrateTaskTo07(ctxFor(dir));
    assert.equal(second, false, '대상 없으면 false');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

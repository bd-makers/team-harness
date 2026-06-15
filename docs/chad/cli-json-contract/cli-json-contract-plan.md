# cli-json-contract — Plan

> **For agentic workers:** TDD task-by-task. Steps use checkbox (`- [ ]`) syntax. spec: [cli-json-contract-spec.md](./cli-json-contract-spec.md).

**Goal:** drive 4커맨드(`task`/`retro`/`release`/`doctor`)에 opt-in `--json` 통합 observation 엔벨로프를 추가한다 (human 출력 무수정, 회귀 0).

**Architecture:** 신규 `src/observation.mjs`가 `{schema, command, status, summary, next_actions, artifacts, error, ...extra}` 엔벨로프를 빌드/emit. 각 커맨드는 출력 분기점에서 `ctx.flags.json`이면 envelope 1회 emit, 아니면 기존 human path. `--json`은 기존 파서가 boolean으로 통과(파서 무수정).

**Tech Stack:** Node.js ESM, `node --test` 빌트인 러너, `node:assert/strict`. 테스트는 temp dir + console.log 캡처(override→restore) + exitCode 저장/복원 패턴(`tests/retro.test.mjs` 참조).

**Test runner:** `npm test` = `node --test tests/*.test.mjs`. Baseline: **71 pass, 0 fail**.

## 목표

수용기준(spec): (1) `<cmd> --json` 통합 엔벨로프, (2) 모든 에러 경로 root_cause+safe_retry+stop_condition(task 포함), (3) doctor per-check machine-readable, (4) stdout 단일 JSON 객체+exitCode, (5) 회귀 0.

## File Structure

- **Create** `src/observation.mjs` — 엔벨로프 빌더/emitter (단일 책임).
- **Create** `tests/observation.test.mjs` — 빌더 단위 테스트.
- **Modify** `src/commands/task.mjs` — `runTask`/`runRetro`에 json 분기 + task human 에러계약.
- **Modify** `src/commands/release.mjs` — `runRelease`에 json 분기 + `releaseArtifacts` 헬퍼.
- **Modify** `src/commands/doctor.mjs` — `runDoctor`를 reporter 패턴으로 리팩토링 + checks 배열.
- **Modify** `bin/harness-team.mjs` — HELP Options에 `--json` 1줄.
- **Modify** `tests/task-templates.test.mjs` — (필요 시) json 경로 회귀 보강.
- **Create** `tests/observation-commands.test.mjs` — 커맨드별 `--json` 성공/에러 경로 통합 테스트.

---

## 단계

### Task 1: observation 헬퍼 (foundation)

**Files:**
- Create: `src/observation.mjs`
- Test: `tests/observation.test.mjs`

- [ ] **Step 1: 실패 테스트 작성** — `tests/observation.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OBSERVATION_SCHEMA, buildEnvelope, emitObservation } from '../src/observation.mjs';

test('buildEnvelope: 성공 기본값 (error null, 배열 기본 [])', () => {
  const env = buildEnvelope({ command: 'task', status: 'success', summary: 'created' });
  assert.equal(env.schema, OBSERVATION_SCHEMA);
  assert.equal(env.command, 'task');
  assert.equal(env.status, 'success');
  assert.equal(env.summary, 'created');
  assert.deepEqual(env.next_actions, []);
  assert.deepEqual(env.artifacts, []);
  assert.equal(env.error, null);
});

test('buildEnvelope: 에러 객체 매핑 (root_cause/safe_retry/stop_condition)', () => {
  const env = buildEnvelope({
    command: 'release', status: 'error', summary: 'failed',
    error: { root_cause: 'rc', safe_retry: 'sr', stop_condition: 'sc' },
  });
  assert.equal(env.status, 'error');
  assert.deepEqual(env.error, { root_cause: 'rc', safe_retry: 'sr', stop_condition: 'sc' });
});

test('buildEnvelope: extra 병합 (doctor checks)', () => {
  const env = buildEnvelope({
    command: 'doctor', status: 'warning', summary: '1 warning',
    extra: { checks: [{ label: 'AGENTS.md', status: 'pass' }] },
  });
  assert.equal(env.checks.length, 1);
  assert.equal(env.checks[0].label, 'AGENTS.md');
});

test('emitObservation: stdout에 단일 유효 JSON 객체만', () => {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  try {
    emitObservation(buildEnvelope({ command: 'task', status: 'success', summary: 's' }));
  } finally { console.log = orig; }
  assert.equal(logs.length, 1, '정확히 한 번 출력');
  const parsed = JSON.parse(logs[0]);
  assert.equal(parsed.schema, OBSERVATION_SCHEMA);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/observation.test.mjs` · Expected: FAIL (`Cannot find module ../src/observation.mjs`)

- [ ] **Step 3: 구현** — `src/observation.mjs`

```js
// Structured observation envelope for agent-facing --json output.
// CLI stdout = agent observation. One stable schema; error is null on success.
export const OBSERVATION_SCHEMA = 'harness/observation/v1';

export function buildEnvelope({
  command,
  status,
  summary,
  nextActions = [],
  artifacts = [],
  error = null,
  extra = {},
}) {
  return {
    schema: OBSERVATION_SCHEMA,
    command,
    status,
    summary,
    next_actions: nextActions,
    artifacts,
    error,
    ...extra,
  };
}

export function emitObservation(env) {
  console.log(JSON.stringify(env, null, 2));
}
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/observation.test.mjs` · Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/observation.mjs tests/observation.test.mjs
git commit -m "feat(observation): add --json envelope builder + emitter (harness/observation/v1)"
```

---

### Task 2: HELP에 --json 노출

**Files:**
- Modify: `bin/harness-team.mjs:44-52` (Options 블록)

- [ ] **Step 1: 구현** — Options 블록 끝(`--no-gitignore-ai` 줄 다음)에 추가:

```
  --json               drive 커맨드(task/retro/release/doctor) 출력을 구조화 JSON 엔벨로프로
```

- [ ] **Step 2: 확인** — Run: `node bin/harness-team.mjs --help | grep -- --json` · Expected: 위 줄 출력.

- [ ] **Step 3: Commit**

```bash
git add bin/harness-team.mjs
git commit -m "docs(help): document --json structured output flag"
```

---

### Task 3: release --json

**Files:**
- Modify: `src/commands/release.mjs` (`runRelease` 237-268, `fmtTargets` 위에 `releaseArtifacts` 추가)
- Test: `tests/observation-commands.test.mjs` (생성)

- [ ] **Step 1: 실패 테스트 작성** — `tests/observation-commands.test.mjs` (release 블록)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runRelease } from '../src/commands/release.mjs';
import { OBSERVATION_SCHEMA } from '../src/observation.mjs';

function captureJson() {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  return {
    logs,
    restore() { console.log = orig; },
    soleEnvelope() {
      assert.equal(logs.length, 1, `정확히 한 객체여야 함, got ${logs.length}`);
      const env = JSON.parse(logs[0]);
      assert.equal(env.schema, OBSERVATION_SCHEMA);
      return env;
    },
  };
}

test('release --json: 에러(version-mismatch) → status error + error 계약', async () => {
  // 매니페스트 버전 불일치를 유도하기 위해 빈 temp repo에서 실행 → release()가 throw.
  const dir = await mkdtemp(join(tmpdir(), 'harness-rel-json-'));
  const cap = captureJson();
  const prev = process.exitCode;
  try {
    await runRelease({ targetDir: dir, flags: { json: true, 'dry-run': true }, taskArgs: ['patch'] });
    const env = cap.soleEnvelope();
    assert.equal(env.command, 'release');
    assert.equal(env.status, 'error');
    assert.ok(env.error && env.error.root_cause && env.error.safe_retry && env.error.stop_condition);
    assert.equal(process.exitCode, 1);
  } finally {
    cap.restore(); process.exitCode = prev;
    await rm(dir, { recursive: true, force: true });
  }
});
```

> NOTE: 빈 temp dir에서 `release()`는 매니페스트 부재로 throw → catch 경로(error 엔벨로프) 검증. 성공 경로는 실제 매니페스트 fixture가 필요해 무겁다 → 성공 경로는 `buildEnvelope` 단위테스트(Task 1)로 커버되며, 여기선 **error 엔벨로프 구조**만 통합 검증한다(범위 한정, 로그로 명시).

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/observation-commands.test.mjs` · Expected: FAIL (json 분기 미구현 → 사람용 prose가 여러 줄 출력되어 `soleEnvelope` 어서션 실패).

- [ ] **Step 3: 구현** — `src/commands/release.mjs`

`fmtTargets` 함수 위에 추가:

```js
function releaseArtifacts(res) {
  if (res.dryRun) return [];
  const a = ['package.json', 'plugin.json', 'marketplace.json'];
  if (!res.skipCache) {
    a.push(res.cacheDir, res.marketplaceDir);
    if (res.installedUpdated) a.push('installed_plugins.json');
  }
  return a;
}
```

파일 상단 import에 추가:

```js
import { buildEnvelope, emitObservation } from '../observation.mjs';
```

`runRelease` 전체 교체:

```js
export async function runRelease(ctx) {
  const bump = (ctx.taskArgs || [])[0] || 'patch';
  const json = !!(ctx.flags && ctx.flags.json);
  try {
    const res = await release({
      bump,
      root: ctx.targetDir,
      dryRun: !!ctx.flags['dry-run'],
      skipCache: !!ctx.flags['skip-cache'],
    });

    if (json) {
      emitObservation(buildEnvelope({
        command: 'release',
        status: 'success',
        summary: res.dryRun
          ? `release dry-run: ${res.oldVersion} → ${res.newVersion} (변경 없음)`
          : `release: ${res.oldVersion} → ${res.newVersion}`,
        nextActions: res.dryRun
          ? [`harness-team release ${bump}`]
          : [`git add -A && git commit -m "chore(release): 버전 ${res.newVersion}으로 범프" && git tag v${res.newVersion} && git push && git push --tags`],
        artifacts: releaseArtifacts(res),
      }));
      return res;
    }

    if (res.dryRun) {
      console.log(`ⓘ release (dry-run): ${res.oldVersion} → ${res.newVersion} — 변경 없음`);
      console.log(fmtTargets(res));
      console.log(`next: 계획을 검토한 뒤 \`harness-team release ${bump}\` (--dry-run 제거) 로 실제 적용`);
    } else {
      console.log(`✓ release: ${res.oldVersion} → ${res.newVersion}`);
      console.log(fmtTargets(res));
      console.log(
        `next: git add -A && git commit -m "chore(release): 버전 ${res.newVersion}으로 범프" && ` +
        `git tag v${res.newVersion} && git push && git push --tags`,
      );
    }
    return res;
  } catch (err) {
    process.exitCode = 1;
    const advice = ERROR_ADVICE[err.kind] || ERROR_ADVICE.generic;
    if (json) {
      emitObservation(buildEnvelope({
        command: 'release',
        status: 'error',
        summary: `release 실패: ${err.message}`,
        error: { root_cause: advice.cause, safe_retry: advice.retry, stop_condition: advice.stop },
      }));
    } else {
      console.log(`✗ release: ${err.message}`);
      console.log(`cause: ${advice.cause}`);
      console.log(`retry: ${advice.retry}`);
      console.log(`stop: ${advice.stop}`);
    }
  }
}
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/observation-commands.test.mjs` · Expected: PASS. 그리고 전체 회귀: `npm test` · Expected: 기존 release 테스트 green.

- [ ] **Step 5: Commit**

```bash
git add src/commands/release.mjs tests/observation-commands.test.mjs
git commit -m "feat(release): --json observation envelope (success/dry-run/error)"
```

---

### Task 4: retro --json

**Files:**
- Modify: `src/commands/task.mjs` (`runRetro` 344-373, 상단 import)
- Test: `tests/observation-commands.test.mjs` (retro 블록 추가)

- [ ] **Step 1: 실패 테스트 작성** — `tests/observation-commands.test.mjs`에 추가

```js
import { runRetro } from '../src/commands/task.mjs';

test('retro --json: 성공 → status success + artifacts에 artifact 경로', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-retro-json-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(join(dir, '.harness/active.json'),
    JSON.stringify({ user: 'tester', task: 'demo', path: 'docs/tester/demo' }));
  await mkdir(join(dir, 'docs', 'tester', 'demo'), { recursive: true });
  const cap = captureJson();
  try {
    await runRetro({ targetDir: dir, flags: { json: true }, taskArgs: ['note'] });
    const env = cap.soleEnvelope();
    assert.equal(env.command, 'retro');
    assert.equal(env.status, 'success');
    assert.ok(env.artifacts.some(a => a.endsWith('demo-artifact.md')));
  } finally { cap.restore(); await rm(dir, { recursive: true, force: true }); }
});

test('retro --json: 활성 task 없음 → status error + 에러 계약 + exitCode 1', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-retro-json-noactive-'));
  const cap = captureJson();
  const prev = process.exitCode;
  try {
    await runRetro({ targetDir: dir, flags: { json: true }, taskArgs: [] });
    const env = cap.soleEnvelope();
    assert.equal(env.status, 'error');
    assert.ok(env.error.root_cause && env.error.safe_retry && env.error.stop_condition);
    assert.equal(process.exitCode, 1);
  } finally { cap.restore(); process.exitCode = prev; await rm(dir, { recursive: true, force: true }); }
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/observation-commands.test.mjs` · Expected: FAIL (retro json 분기 미구현).

- [ ] **Step 3: 구현** — `src/commands/task.mjs`

상단 import에 추가:

```js
import { buildEnvelope, emitObservation } from '../observation.mjs';
```

`runRetro` 전체 교체:

```js
export async function runRetro(ctx) {
  const json = !!(ctx.flags && ctx.flags.json);
  const active = await readActive(ctx.targetDir);
  if (!active || !active.task) {
    process.exitCode = 1;
    if (json) {
      emitObservation(buildEnvelope({
        command: 'retro',
        status: 'error',
        summary: 'retro 실패: 활성 task 없음',
        error: {
          root_cause: '.harness/active.json 에 활성 task가 없어 append 대상 artifact.md를 찾을 수 없음',
          safe_retry: '`harness-team task <name>` 로 task를 활성화한 뒤 다시 실행',
          stop_condition: 'task가 하나도 없으면 먼저 task를 생성하라',
        },
      }));
    } else {
      console.log(`✗ retro: 활성 task 없음`);
      console.log(`cause: .harness/active.json 에 활성 task가 없어 append 대상 artifact.md를 찾을 수 없음`);
      console.log(`retry: \`harness-team task <name>\` 로 task를 활성화한 뒤 다시 실행`);
      console.log(`stop: task가 하나도 없으면 먼저 task를 생성하라`);
    }
    return;
  }

  const { user, task } = active;
  const artifactPath = join(ctx.targetDir, 'docs', user, task, `${task}-artifact.md`);

  if (!(await exists(artifactPath))) {
    await writeText(artifactPath, taskArtifactTemplate(task));
  }

  const date = today();
  const text = (ctx.taskArgs || []).join(' ');
  const section = text
    ? `\n## Learnings (${date})\n\n- ${text}\n`
    : `\n## Learnings (${date})\n\n-\n`;

  await appendFile(artifactPath, section);

  const relPath = `docs/${user}/${task}/${task}-artifact.md`;
  if (json) {
    emitObservation(buildEnvelope({
      command: 'retro',
      status: 'success',
      summary: `${relPath} 에 ## Learnings (${date}) 추가`,
      nextActions: ['artifact.md를 열어 학습 내용을 채우거나, 추가 메모는 `harness-team retro "<메모>"` 재실행'],
      artifacts: [relPath],
    }));
  } else {
    console.log(`✓ retro: ${relPath} 에 ## Learnings (${date}) 추가`);
    console.log(`next: artifact.md를 열어 학습 내용을 채우거나, 추가 메모는 \`harness-team retro "<메모>"\` 재실행`);
  }
}
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/observation-commands.test.mjs` · 그리고 `npm test` · Expected: PASS, 기존 `tests/retro.test.mjs` green.

- [ ] **Step 5: Commit**

```bash
git add src/commands/task.mjs tests/observation-commands.test.mjs
git commit -m "feat(retro): --json observation envelope (success/no-active error)"
```

---

### Task 5: task --json + human 에러계약 정합

**Files:**
- Modify: `src/commands/task.mjs` (`runTask` 174-215)
- Test: `tests/observation-commands.test.mjs` (task 블록 추가)

- [ ] **Step 1: 실패 테스트 작성** — `tests/observation-commands.test.mjs`에 추가

```js
import { runTask } from '../src/commands/task.mjs';

test('task --json: 생성 → status success + 4파일 artifacts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-task-json-'));
  const cap = captureJson();
  try {
    await runTask({ targetDir: dir, flags: { json: true, member: 'tester' }, taskArgs: ['demo'] });
    const env = cap.soleEnvelope();
    assert.equal(env.command, 'task');
    assert.equal(env.status, 'success');
    assert.equal(env.artifacts.length, 4);
    assert.ok(env.artifacts.some(a => a.endsWith('demo-spec.md')));
  } finally { cap.restore(); await rm(dir, { recursive: true, force: true }); }
});

test('task --json: 잘못된 이름 → status error + 에러 계약 + exitCode 1', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-task-json-bad-'));
  const cap = captureJson();
  const prev = process.exitCode;
  try {
    await runTask({ targetDir: dir, flags: { json: true, member: 'tester' }, taskArgs: ['bad name!'] });
    const env = cap.soleEnvelope();
    assert.equal(env.status, 'error');
    assert.ok(env.error.root_cause && env.error.safe_retry && env.error.stop_condition);
    assert.equal(process.exitCode, 1);
  } finally { cap.restore(); process.exitCode = prev; await rm(dir, { recursive: true, force: true }); }
});

test('task (human): 잘못된 이름 → cause/retry/stop + exitCode 1', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-task-human-bad-'));
  const logs = [];
  const orig = console.log; console.log = (...a) => logs.push(a.join(' '));
  const prev = process.exitCode;
  try {
    await runTask({ targetDir: dir, flags: { member: 'tester' }, taskArgs: [''] });
    assert.equal(process.exitCode, 1);
    assert.ok(logs.some(l => l.startsWith('cause:')));
    assert.ok(logs.some(l => l.startsWith('retry:')));
    assert.ok(logs.some(l => l.startsWith('stop:')));
  } finally { console.log = orig; process.exitCode = prev; await rm(dir, { recursive: true, force: true }); }
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/observation-commands.test.mjs` · Expected: FAIL (task json/에러계약 미구현; 기존은 `usage:` 한 줄 + exitCode 미설정).

- [ ] **Step 3: 구현** — `src/commands/task.mjs` `runTask`의 (a) bad-name 가드, (b) 활성화 분기, (c) 생성 분기 교체

bad-name 가드(176-179) 교체:

```js
  const json = !!(ctx.flags && ctx.flags.json);
  const name = (ctx.taskArgs || [])[0];
  if (!name || !/^[\w.-]+$/.test(name)) {
    process.exitCode = 1;
    const rootCause = name
      ? `task 이름 "${name}"에 허용되지 않는 문자가 있음 (허용: 영숫자·_·.·-)`
      : 'task 이름 인자가 없음';
    if (json) {
      emitObservation(buildEnvelope({
        command: 'task',
        status: 'error',
        summary: 'task 생성/활성화 실패: 잘못된 task 이름',
        error: {
          root_cause: rootCause,
          safe_retry: '`harness-team task <name>` 형식으로 영숫자·_·.·- 만 사용한 이름을 주고 재실행',
          stop_condition: '이름 규칙(^[\\w.-]+$)을 만족하지 못하면 생성하지 말 것',
        },
      }));
    } else {
      console.log(`✗ task: 잘못된 task 이름`);
      console.log(`cause: ${rootCause}`);
      console.log(`retry: \`harness-team task <name>\` 형식으로 유효한 이름을 주고 재실행`);
      console.log(`stop: 이름 규칙(^[\\w.-]+$) 위반 시 생성 금지`);
    }
    return;
  }
```

활성화 분기(185-193) 의 `console.log(\`activated: ...\`)` 교체:

```js
  if (await exists(dir)) {
    await writeActive(ctx.targetDir, {
      user, task: name,
      path: `docs/${user}/${name}`,
      switchedAt: new Date().toISOString(),
    });
    if (json) {
      emitObservation(buildEnvelope({
        command: 'task',
        status: 'success',
        summary: `activated: ${user}/${name}`,
        nextActions: [`docs/${user}/${name}/${name}-plan.md 의 현재 단계 확인`],
        artifacts: [`docs/${user}/${name}`],
      }));
    } else {
      console.log(`activated: ${user}/${name}`);
    }
    return;
  }
```

생성 분기 끝(213-214) 의 두 `console.log` 교체:

```js
  if (json) {
    emitObservation(buildEnvelope({
      command: 'task',
      status: 'success',
      summary: `created: docs/${user}/${name}/`,
      nextActions: [`docs/${user}/${name}/${name}-spec.md 작성 (Ambiguity 자가진단 포함)`],
      artifacts: [
        `docs/${user}/${name}/${name}-spec.md`,
        `docs/${user}/${name}/${name}-plan.md`,
        `docs/${user}/${name}/${name}-handoff.md`,
        `docs/${user}/${name}/${name}-artifact.md`,
      ],
    }));
  } else {
    console.log(`created: docs/${user}/${name}/`);
    console.log(`active: ${user}/${name}`);
  }
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/observation-commands.test.mjs` · 그리고 `npm test` · Expected: PASS, `tests/task-templates.test.mjs` green(유효 이름 경로 무영향).

- [ ] **Step 5: Commit**

```bash
git add src/commands/task.mjs tests/observation-commands.test.mjs
git commit -m "feat(task): --json envelope + cause/retry/stop error contract for bad name"
```

---

### Task 6: doctor --json (reporter 리팩토링 + per-check)

**Files:**
- Modify: `src/commands/doctor.mjs` (`runDoctor` 89-180, 상단 import)
- Test: `tests/observation-commands.test.mjs` (doctor 블록 추가)

- [ ] **Step 1: 실패 테스트 작성** — `tests/observation-commands.test.mjs`에 추가

```js
import { runDoctor } from '../src/commands/doctor.mjs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('doctor --json: 단일 envelope + checks 배열 + status error(빈 dir)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-json-'));
  const cap = captureJson();
  const prev = process.exitCode;
  try {
    await runDoctor({ targetDir: dir, root: ROOT_DIR, flags: { json: true } });
    const env = cap.soleEnvelope();
    assert.equal(env.command, 'doctor');
    assert.equal(env.status, 'error'); // 빈 dir → 필수 파일 missing
    assert.ok(Array.isArray(env.checks) && env.checks.length > 0);
    // 누락 도구/파일을 프로그램적으로 식별 가능해야 함
    assert.ok(env.checks.some(c => c.status === 'fail'));
    assert.ok(env.checks.every(c => typeof c.label === 'string' && typeof c.status === 'string'));
    assert.equal(process.exitCode, 1);
  } finally { cap.restore(); process.exitCode = prev; await rm(dir, { recursive: true, force: true }); }
});
```

> NOTE: `captureJson().soleEnvelope()`는 stdout에 객체 1개만 나오는지(=human 라인 누출 0)도 함께 검증한다 → 수용기준 #4.

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/observation-commands.test.mjs` · Expected: FAIL (doctor가 human 멀티라인 출력 → soleEnvelope 실패).

- [ ] **Step 3: 구현** — `src/commands/doctor.mjs`

상단 import에 추가:

```js
import { buildEnvelope, emitObservation } from '../observation.mjs';
```

`runDoctor` 시작부에 reporter 도입. 함수 본문을 reporter 패턴으로 교체 — 각 출력 지점에서 `rep.add(label, status, detail, humanLine)`(체크 기록) 또는 `rep.line(humanLine)`(헤더/공백, json에서 억제). 전체 교체:

```js
export async function runDoctor(ctx) {
  const json = !!(ctx.flags && ctx.flags.json);
  const checks = [];
  const add = (label, status, detail, humanLine) => {
    if (json) checks.push(detail ? { label, status, detail } : { label, status });
    else console.log(humanLine);
  };
  const line = (humanLine) => { if (!json) console.log(humanLine); };

  line(`harness-team doctor → ${ctx.targetDir}\n`);
  let fail = 0;
  for (const c of CHECKS) {
    const p = join(ctx.targetDir, c.path);
    const ok = await exists(p);
    if (!ok) {
      if (c.required) { add(c.path, 'fail', 'missing', `✗ ${c.path}  (missing)`); fail++; }
      else add(c.path, 'optional', 'not present, optional', `- ${c.path}  (not present, optional)`);
      continue;
    }
    if (c.realFile) {
      const st = await lstat(p);
      if (st.isSymbolicLink()) {
        add(c.path, 'fail', 'symlink — 신구조는 실파일이어야 함, run: harness-team migrate',
          `✗ ${c.path}  (symlink — 신구조는 실파일이어야 함, run: harness-team migrate)`);
        fail++; continue;
      }
      if (c.contains) {
        const body = await readFile(p, 'utf8');
        if (!body.includes(c.contains)) {
          add(c.path, 'fail', `"${c.contains}" 없음 — 손상/레거시 의심`,
            `✗ ${c.path}  ("${c.contains}" 없음 — 손상/레거시 의심)`);
          fail++; continue;
        }
      }
      add(c.path, 'pass', undefined, `✓ ${c.path}`);
      continue;
    }
    if (c.json) {
      try {
        JSON.parse(await readFile(p, 'utf8'));
        add(c.path, 'pass', 'valid JSON', `✓ ${c.path}  (valid JSON)`);
      } catch (e) {
        add(c.path, 'fail', `invalid JSON: ${e.message}`, `✗ ${c.path}  (invalid JSON: ${e.message})`);
        fail++;
      }
      continue;
    }
    if (c.executable) {
      const st = await lstat(p);
      if (!(st.mode & 0o100)) { add(c.path, 'fail', 'not executable', `✗ ${c.path}  (not executable)`); fail++; continue; }
      add(c.path, 'pass', 'exec', `✓ ${c.path}  (exec)`);
      continue;
    }
    add(c.path, 'pass', undefined, `✓ ${c.path}`);
  }

  line('');
  for (const name of BACKUP_SCRIPTS) {
    const p = join(ctx.targetDir, name);
    if (!(await exists(p))) { add(name, 'fail', 'missing in project root', `✗ ${name}  (missing in project root)`); fail++; continue; }
    const st = await lstat(p);
    if (!(st.mode & 0o100)) { add(name, 'fail', 'not executable', `✗ ${name}  (not executable)`); fail++; continue; }
    add(name, 'pass', 'exec', `✓ ${name}  (exec)`);
  }

  const backupDir = await loadBackupDir(ctx.targetDir);
  if (backupDir) {
    add('backup clone dir', 'pass', backupDir, `\nbackup clone dir: ${backupDir}`);
  } else {
    add('backup clone dir', 'fail', 'missing .harness/backup.json',
      `\n✗ backup clone dir is not configured (missing .harness/backup.json)`);
    fail++;
  }

  line('\nexternal tools:');
  const toolResults = await Promise.all(
    EXTERNAL_TOOLS.map(({ cmd, label }) => checkCommand(cmd).then(ok => ({ ok, label }))),
  );
  for (const { ok, label } of toolResults) {
    if (ok) add(label, 'pass', undefined, `✓ ${label}`);
    else add(label, 'optional', 'not found, optional', `- ${label}  (not found, optional)`);
  }

  const selfOk = await checkSelfCli(ctx.root);
  if (selfOk) add('harness-team CLI', 'pass', '--help OK', '✓ harness-team CLI  (--help OK)');
  else { add('harness-team CLI', 'fail', '--help failed', '✗ harness-team CLI  (--help failed)'); fail++; }

  const legacyWarning = await detectLegacyStructure(ctx.targetDir);
  if (legacyWarning) add('legacy structure', 'warning', legacyWarning, `\n⚠️ ${legacyWarning}`);

  const specGateWarning = await checkActiveSpecGate(ctx.targetDir);
  if (specGateWarning) {
    add('spec gate', 'warning', specGateWarning, `\n⚠️ ${specGateWarning}`);
    line(`hint: spec은 \`harness-team task <name>\`로 생성해 자가진단 게이트를 포함시켜라`);
  }

  if (json) {
    const warnCount = checks.filter(c => c.status === 'warning').length;
    const status = fail ? 'error' : (warnCount ? 'warning' : 'success');
    emitObservation(buildEnvelope({
      command: 'doctor',
      status,
      summary: fail ? `${fail} problem(s)` : (warnCount ? `${warnCount} warning(s)` : 'All checks passed'),
      nextActions: fail ? ['harness-team sync'] : (warnCount ? ['harness-team migrate'] : []),
      extra: { checks },
    }));
  } else {
    console.log(fail ? `\n${fail} problem(s). Run: harness-team sync` : '\nAll checks passed.');
  }
  if (fail) process.exitCode = 1;
}
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/observation-commands.test.mjs` · 그리고 `npm test` · Expected: PASS, `tests/doctor.test.mjs`(헬퍼 단위) green. 추가 수동 확인: `node bin/harness-team.mjs doctor` (human 출력 기존과 동일) + `node bin/harness-team.mjs doctor --json | head` (단일 JSON).

- [ ] **Step 5: Commit**

```bash
git add src/commands/doctor.mjs tests/observation-commands.test.mjs
git commit -m "feat(doctor): --json per-check machine-readable envelope (reporter refactor)"
```

---

### Task 7: 전체 검증 + dogfood + 산출물 기록

- [ ] **Step 1: 전체 테스트** — Run: `npm test` · Expected: 기존 71 + 신규(observation ~4, observation-commands ~7) = **~82 pass, 0 fail**.

- [ ] **Step 2: dogfood 수동 확인** — 실제 레포에서:
  - `node bin/harness-team.mjs doctor --json` → 단일 JSON, checks 배열, status.
  - `node bin/harness-team.mjs release patch --dry-run --json` → success 엔벨로프(artifacts=[]).
  - `node bin/harness-team.mjs task '' --json` → error 엔벨로프 + exitCode 1.
  각 출력이 `python3 -c "import sys,json; json.load(sys.stdin)"` 또는 `jq .` 로 파싱되는지 확인(stdout 단일 객체 증명).

- [ ] **Step 3: artifact.md 기록** — `## 결과`에 구현 요약, 변경 파일, 테스트 수치(before/after) 기록.

- [ ] **Step 4: 리뷰** — 중요 변경(새 계약·다파일)이므로 코드 리뷰(feature-dev:code-reviewer 또는 Codex/Gemini) 실행 → 결과를 artifact.md `## Reviews`에 날짜와 함께 기록.

- [ ] **Step 5: plan 전체 체크 확인 후 done** — plan `- [ ]` 0개 확인 → `node bin/harness-team.mjs done` (종결 가드 통과).

---

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록.*

- (2026-06-15) **observation envelope** / **error contract** / **reporter(doctor)** — spec.md Ontology에 정의됨.

## 참고
- spec: [cli-json-contract-spec.md](./cli-json-contract-spec.md)
- 백로그 P2: [2026-05-29-0.8.0-improvements.md](../../superpowers/plans/2026-05-29-0.8.0-improvements.md)

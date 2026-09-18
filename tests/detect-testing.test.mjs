// commands/harness-{unittest,comptest,inttest}.md의 0단계가 같은 의존성 조회를 세 벌 산문으로
// 들고 있었고, 이미 드리프트가 났다(단계 번호가 밀리고, 예외 참조가 §4/§5로 갈리고, 러너 추천
// 문구가 각자 진화). 그 조회를 detect-testing.mjs로 내렸으므로 판정이 여기서 고정된다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectTesting } from '../src/detect-testing.mjs';
import { renderSummary, packSummary, SUMMARY_MAX_LINES } from '../src/commands/stack.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BIN = join(ROOT, 'bin', 'harness-team.mjs');

async function project(files) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-testing-'));
  for (const [name, body] of Object.entries(files)) {
    await writeFile(join(dir, name), typeof body === 'string' ? body : JSON.stringify(body));
  }
  return dir;
}

async function withProject(files, fn) {
  const dir = await project(files);
  try { return await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}

function cli(args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [BIN, ...args], { cwd: ROOT });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('error', reject);
    child.on('close', code => resolvePromise({ code, stdout, stderr }));
  });
}

test('web React: vitest + RTL + msw + jsdom 을 각 축으로 나눠 보고한다', async () => {
  await withProject({
    'package.json': {
      name: 'web',
      dependencies: { react: '19.0.0', '@tanstack/react-query': '5.0.0', 'react-router-dom': '7.0.0' },
      devDependencies: {
        vitest: '3.0.0',
        jsdom: '25.0.0',
        msw: '2.0.0',
        '@testing-library/react': '16.0.0',
        '@testing-library/user-event': '14.0.0',
        '@vitest/coverage-v8': '3.0.0',
      },
      scripts: { test: 'vitest run', 'test:coverage': 'vitest run --coverage' },
    },
  }, async (dir) => {
    const t = await detectTesting(dir);
    assert.equal(t.runner, 'vitest');
    assert.equal(t.runnerSource, 'dependency');
    assert.equal(t.domEnv, 'jsdom');
    assert.deepEqual(t.testingLibrary, ['react', 'user-event']);
    assert.deepEqual(t.outboundMock, ['msw']);
    assert.deepEqual(t.providers, ['react-query', 'react-router']);
    assert.deepEqual(t.coverage, { provider: '@vitest/coverage-v8', script: 'test:coverage' });
    assert.equal(t.server, null);
    assert.equal(t.rnPreset, null);
  });
});

test('React Native: jest-expo 프리셋과 RNTL 을 잡고, web 전용 축은 비운다', async () => {
  await withProject({
    'package.json': {
      name: 'rn',
      dependencies: { expo: '52.0.0', 'react-native': '0.76.0', '@react-navigation/native': '7.0.0' },
      devDependencies: { jest: '29.0.0', 'jest-expo': '52.0.0', '@testing-library/react-native': '12.0.0' },
      scripts: { test: 'jest' },
    },
  }, async (dir) => {
    const t = await detectTesting(dir);
    assert.equal(t.runner, 'jest');
    assert.equal(t.rnPreset, 'jest-expo');
    assert.deepEqual(t.testingLibrary, ['react-native']);
    assert.deepEqual(t.providers, ['react-navigation']);
    assert.equal(t.domEnv, null, 'RN 에는 DOM 환경이 없다');
    assert.equal(t.storybook, false);
  });
});

test('통합: 서버 프레임워크에 인프로세스 호출 수단이 따라붙고 DB·아웃바운드·인프라 흔적을 나눈다', async () => {
  await withProject({
    'package.json': {
      name: 'api',
      dependencies: { fastify: '5.0.0', '@prisma/client': '6.0.0', pg: '8.0.0' },
      devDependencies: { vitest: '3.0.0', nock: '14.0.0', testcontainers: '10.0.0' },
      scripts: { test: 'vitest run' },
    },
    '.env.test': 'DATABASE_URL=postgres://localhost/test\n',
  }, async (dir) => {
    const t = await detectTesting(dir);
    assert.equal(t.server, 'fastify');
    assert.equal(t.inProcessCall, 'app.inject()');
    assert.deepEqual(t.orm, ['prisma']);
    assert.deepEqual(t.dbDriver, ['pg']);
    assert.deepEqual(t.outboundMock, ['nock']);
    assert.deepEqual(t.infraMarkers, ['testcontainers', '.env.test']);
  });
});

// 의존성 없이 `node --test` 만 쓰는 저장소가 실재한다 — 이 플러그인 자신이 그렇다. 의존성만
// 보면 "러너 없음"이 되어 문서의 러너 부재 분기가 잘못 발동한다.
test('의존성 없는 node --test 도 러너로 인정하고 출처를 script 로 표시한다', async () => {
  await withProject({
    'package.json': { name: 'plain', scripts: { test: 'node --test tests/*.test.mjs' } },
  }, async (dir) => {
    const t = await detectTesting(dir);
    assert.equal(t.runner, 'node:test');
    assert.equal(t.runnerSource, 'script');
  });
});

test('러너가 없으면 runner 는 null 이고, package.json 이 없거나 깨져도 던지지 않는다', async () => {
  await withProject({ 'package.json': { name: 'bare', dependencies: { react: '19.0.0' } } }, async (dir) => {
    assert.equal((await detectTesting(dir)).runner, null);
  });
  await withProject({ 'README.md': '# go away' }, async (dir) => {
    const t = await detectTesting(dir);
    assert.equal(t.runner, null);
    assert.deepEqual(t.providers, []);
  });
  await withProject({ 'package.json': '{ not json' }, async (dir) => {
    assert.equal((await detectTesting(dir)).runner, null);
  });
});

// codex P2: readTextSafe 는 부재에 null, 빈 파일에 '' 을 준다. `!raw` 로 합치면 **빈
// package.json** 이 "매니페스트 없음"으로 분류돼 수리 안내를 건너뛰었다.
test('빈 package.json 은 부재가 아니라 깨진 매니페스트로 분류한다', async () => {
  await withProject({ 'package.json': '' }, async (dir) => {
    assert.equal((await detectTesting(dir)).manifest, 'unreadable');
    const { stdout } = await cli(['stack', '--json', '--target', dir]);
    const env = JSON.parse(stdout);
    assert.equal(env.status, 'warning');
    assert.match(env.next_actions[0], /파싱할 수 없습니다/);
  });
  await withProject({ 'README.md': '# none' }, async (dir) => {
    assert.equal((await detectTesting(dir)).manifest, null, '진짜 부재는 여전히 null 이다');
  });
});

// codex P2: 모든 축이 감지되면 축이 13개까지 늘어나 text 모드가 13줄을 찍었고, 문서들의
// "스택 요약 5줄 이내" 계약이 깨졌다. 포장은 축 개수와 무관하게 상한을 지켜야 한다.
test('packSummary: 축이 몇 개든 5줄을 넘지 않는다', async () => {
  await withProject({
    'package.json': {
      name: 'rich',
      dependencies: {
        next: '15.0.0', '@prisma/client': '6.0.0', pg: '8.0.0',
        '@tanstack/react-query': '5.0.0', 'react-router-dom': '7.0.0', 'react-i18next': '15.0.0',
      },
      devDependencies: {
        vitest: '3.0.0', jsdom: '25.0.0', msw: '2.0.0', testcontainers: '10.0.0',
        '@testing-library/react': '16.0.0', '@testing-library/user-event': '14.0.0',
        '@vitest/coverage-v8': '3.0.0', '@storybook/react': '8.0.0',
      },
      scripts: { test: 'vitest run', 'test:coverage': 'vitest run --coverage' },
    },
    '.env.test': 'X=1\n',
  }, async (dir) => {
    const testing = await detectTesting(dir);
    const parts = renderSummary({ stackLabel: 'Next.js', language: 'TypeScript', packageManager: 'npm' }, testing);
    assert.ok(parts.length > SUMMARY_MAX_LINES, '이 fixture 는 축이 상한보다 많아야 의미가 있다');
    assert.ok(packSummary(parts).length <= SUMMARY_MAX_LINES);
    assert.equal(packSummary(parts).join(' · '), parts.join(' · '), '포장이 축을 잃거나 순서를 바꾸지 않는다');
  });
});

// 문서들이 요구하던 "5줄 이내 요약". 빈 축이 줄을 차지하면 예산이 금방 넘는다.
test('renderSummary: 빈 축은 줄을 만들지 않는다', async () => {
  await withProject({
    'package.json': { name: 'plain', scripts: { test: 'node --test' } },
  }, async (dir) => {
    const testing = await detectTesting(dir);
    const lines = renderSummary({ stackLabel: 'Node.js', language: 'JavaScript', packageManager: 'npm' }, testing);
    assert.ok(lines.length <= 5, `요약이 5줄을 넘었다: ${lines.length}`);
    assert.ok(!lines.some(l => l.includes('없음') && l.startsWith('프로바이더')));
  });
});

test('CLI: stack --json 은 observation envelope 에 stack·testing 두 프로필을 싣는다', async () => {
  await withProject({
    'package.json': { name: 'web', devDependencies: { vitest: '3.0.0' }, scripts: { test: 'vitest run' } },
  }, async (dir) => {
    const { code, stdout } = await cli(['stack', '--json', '--target', dir]);
    assert.equal(code, 0);
    const env = JSON.parse(stdout);
    assert.equal(env.command, 'stack');
    assert.equal(env.status, 'success');
    assert.equal(env.testing.runner, 'vitest');
    assert.equal(env.stack.id, 'node');
  });
});

// 러너 부재는 CLI 가 고칠 수 없는 상태다 — 설치를 대신하지 않고 warning + next_actions 로 넘긴다.
test('CLI: 러너가 없으면 warning 과 부재 분기 안내를 내되 exit 0 이다', async () => {
  await withProject({ 'package.json': { name: 'bare' } }, async (dir) => {
    const { code, stdout } = await cli(['stack', '--json', '--target', dir]);
    assert.equal(code, 0, 'read-only 관측이라 종료 코드는 성공이다');
    const env = JSON.parse(stdout);
    assert.equal(env.status, 'warning');
    assert.match(env.next_actions.join('\n'), /러너 부재 분기/);
  });
});

// 실측(job-scraper, Python/uv): package.json 이 없는 저장소에 "러너를 설치하라"고 안내하면
// Python 저장소에 JS 러너를 권하게 된다. 거기서 러너 부재는 결함이 아니라 해당 없음이다.
test('CLI: JS 매니페스트가 없는 저장소는 러너 부재를 warning 으로 올리지 않는다', async () => {
  await withProject({ 'pyproject.toml': '[project]\nname = "x"\n' }, async (dir) => {
    const { stdout } = await cli(['stack', '--json', '--target', dir]);
    const env = JSON.parse(stdout);
    assert.equal(env.stack.id, 'python');
    assert.equal(env.testing.manifest, null);
    assert.equal(env.status, 'success', 'JS 러너가 없는 것은 Python 저장소의 결함이 아니다');
    assert.doesNotMatch(env.next_actions.join('\n'), /러너 부재 분기/);
  });
});

// codex P2: 깨진 매니페스트가 "러너 없음"과 같은 문장으로 보고돼 envelope 가 자기모순이었다 —
// summary 는 러너를 설치하라 하고 next_actions 는 매니페스트를 고치라고 했다.
test('CLI: 깨진 package.json 은 매니페스트 수리를 안내하고 러너 부재로 말하지 않는다', async () => {
  await withProject({ 'package.json': '{ not json' }, async (dir) => {
    const { stdout } = await cli(['stack', '--json', '--target', dir]);
    const env = JSON.parse(stdout);
    assert.equal(env.testing.manifest, 'unreadable');
    assert.equal(env.status, 'warning');
    assert.match(env.next_actions[0], /파싱할 수 없습니다/);
    assert.match(env.summary, /파싱할 수 없어/);
    assert.doesNotMatch(env.summary, /러너 부재 분기/, 'summary 와 next_actions 가 다른 조치를 가리키면 안 된다');
  });
});

// codex P2: readTextSafe 는 ENOENT 와 권한·EISDIR 같은 관측 실패를 모두 null 로 삼킨다.
// 후자를 "매니페스트 없음"으로 부르면 고쳐야 할 프로젝트가 success 로 지나간다.
// (디렉터리로 EISDIR 을 만든다 — chmod 와 달리 실행 uid 와 무관하게 재현된다.)
test('읽히지 않는 package.json 은 부재가 아니라 unreadable 이다', async () => {
  const dir = await project({});
  try {
    await mkdir(join(dir, 'package.json'));
    assert.equal((await detectTesting(dir)).manifest, 'unreadable');
    const { code, stdout } = await cli(['stack', '--json', '--target', dir]);
    assert.equal(code, 0);
    assert.equal(JSON.parse(stdout).status, 'warning');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// codex P2: `null`·`[]`·`"x"` 는 유효한 JSON 이라 parse 를 통과하고, 그 뒤 `pkg.dependencies`
// 접근에서 CLI 가 TypeError 로 죽었다.
test('객체가 아닌 유효 JSON 매니페스트도 unreadable 로 떨어지고 CLI 가 죽지 않는다', async () => {
  for (const body of ['null', '[]', '"just a string"', '42']) {
    await withProject({ 'package.json': body }, async (dir) => {
      assert.equal((await detectTesting(dir)).manifest, 'unreadable', `${body} 에서 실패`);
      const { code, stdout } = await cli(['stack', '--json', '--target', dir]);
      assert.equal(code, 0, `${body} 에서 CLI 가 죽었다`);
      assert.equal(JSON.parse(stdout).status, 'warning');
    });
  }
});

// codex P2: 오타가 그대로 통과하면 실제 Node 프로젝트를 generic/success 로 보고해,
// 감지 실패를 감지 결과처럼 보이게 한다. `init` 과 같은 가드를 쓴다.
test('CLI: 알 수 없는 --stack 은 감지 결과를 내지 않고 exit 2 로 거절한다', async () => {
  await withProject({
    'package.json': { name: 'web', devDependencies: { vitest: '3.0.0' }, scripts: { test: 'vitest run' } },
  }, async (dir) => {
    const { code, stdout, stderr } = await cli(['stack', '--json', '--stack', 'not-a-stack', '--target', dir]);
    assert.equal(code, 2);
    assert.equal(stdout, '', '거절했으면 관측을 내지 않는다');
    assert.match(stderr, /unknown --stack "not-a-stack"/);
  });
});

// `stack` 은 taskCmds 가 아니라 `doctor` 처럼 `[dir]` positional 을 target 으로 받는다.
// 이 배선은 조용히 퇴화하기 쉬워서 두 형태가 같은 결과를 내는지 고정한다.
test('CLI: [dir] positional 형태가 --target 과 같은 결과를 낸다', async () => {
  await withProject({
    'package.json': { name: 'web', devDependencies: { vitest: '3.0.0' }, scripts: { test: 'vitest run' } },
  }, async (dir) => {
    const viaTarget = JSON.parse((await cli(['stack', '--json', '--target', dir])).stdout);
    const viaPositional = JSON.parse((await cli(['stack', '--json', dir])).stdout);
    assert.equal(viaPositional.testing.runner, viaTarget.testing.runner);
    assert.deepEqual(viaPositional.stack, viaTarget.stack);
  });
});

test('CLI: --stack 오버라이드는 stack profile 에만 적용되고 testing profile 은 실측 그대로다', async () => {
  await withProject({
    'package.json': { name: 'web', devDependencies: { vitest: '3.0.0' }, scripts: { test: 'vitest run' } },
  }, async (dir) => {
    const { stdout } = await cli(['stack', '--json', '--stack', 'react-native', '--target', dir]);
    const env = JSON.parse(stdout);
    assert.equal(env.stack.id, 'react-native');
    assert.equal(env.testing.runner, 'vitest');
    assert.equal(env.testing.rnPreset, null, '--stack 은 설비를 지어내지 않는다');
  });
});

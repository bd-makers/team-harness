// 테스트 설비 감지 — `harness-team stack`이 에이전트에게 돌려주는 "testing profile".
//
// 이 모듈이 detect-stack.mjs와 분리된 이유는 소비자가 다르기 때문이다. detect-stack의
// buildProfile 출력은 init/migrate가 AGENTS.md 템플릿 변수로 렌더한다 — 거기에 러너·프로바이더
// 같은 필드를 섞으면 프로젝트 문서에 그대로 샌다. 여기 출력은 에이전트만 읽는다.
//
// 출처: commands/harness-{unittest,comptest,inttest}.md의 0단계가 산문으로 지시하던 의존성 조회.
// 같은 절차가 세 벌 있었고 이미 드리프트가 났다(단계 번호, 예외 참조 §4/§5, 러너 추천 문구).
// 판단이 없는 부분만 여기로 내려왔다 — 기존 테스트 샘플링(팀 컨벤션 귀납), 러너 부재 분기
// (AskUserQuestion·웹 검색), Docker 분기(대안 선택)는 세션 전용 입력이라 산문에 남는다.
import { join } from 'node:path';
import { exists, readTextSafe } from './fsx.mjs';

// 의존성 이름 → 우리가 쓰는 라벨. 배열 순서가 곧 우선순위다(먼저 맞는 것 하나만 고르는 축에서).
const RUNNERS = [['vitest', 'vitest'], ['jest', 'jest']];
const DOM_ENVS = [['jsdom', 'jsdom'], ['happy-dom', 'happy-dom'], ['@vitest/browser', 'vitest-browser']];
const SERVERS = [
  ['@trpc/server', 'trpc'],
  ['@nestjs/core', 'nest'],
  ['fastify', 'fastify'],
  ['hono', 'hono'],
  ['express', 'express'],
  ['next', 'next'],
];

// 서버 프레임워크별 인프로세스 호출 수단 — harness-inttest.md 0단계가 산문으로 나열하던 대응표다.
// 소켓을 열지 않고 핸들러를 직접 때리는 방법이 프레임워크마다 다르고, 이걸 모르면 통합 테스트가
// 곧바로 supertest + 실제 listen으로 흘러 느려진다.
const IN_PROCESS_CALL = {
  fastify: 'app.inject()',
  hono: 'app.request()',
  nest: 'Test.createTestingModule() + app.getHttpServer()',
  trpc: 'createCaller()',
  next: '핸들러 직접 호출',
  express: 'supertest(app)',
};

const TESTING_LIBRARIES = [
  ['@testing-library/react-native', 'react-native'],
  ['@testing-library/react', 'react'],
  ['@testing-library/user-event', 'user-event'],
  ['@testing-library/jest-dom', 'jest-dom'],
];

const PROVIDERS = [
  ['@tanstack/react-query', 'react-query'],
  ['react-query', 'react-query'],
  ['swr', 'swr'],
  ['@reduxjs/toolkit', 'redux'],
  ['redux', 'redux'],
  ['zustand', 'zustand'],
  ['jotai', 'jotai'],
  ['recoil', 'recoil'],
  ['react-router-dom', 'react-router'],
  ['react-router', 'react-router'],
  ['expo-router', 'expo-router'],
  ['@react-navigation/native', 'react-navigation'],
  ['styled-components', 'styled-components'],
  ['@emotion/react', 'emotion'],
  ['tamagui', 'tamagui'],
  ['react-i18next', 'react-i18next'],
  ['i18next', 'i18next'],
];

const ORMS = [
  ['@prisma/client', 'prisma'],
  ['prisma', 'prisma'],
  ['drizzle-orm', 'drizzle'],
  ['typeorm', 'typeorm'],
  ['knex', 'knex'],
  ['sequelize', 'sequelize'],
  ['mongoose', 'mongoose'],
];

const DB_DRIVERS = [['pg', 'pg'], ['mysql2', 'mysql2'], ['better-sqlite3', 'better-sqlite3'], ['mongodb', 'mongodb']];

const OUTBOUND_MOCKS = [['msw', 'msw'], ['nock', 'nock'], ['undici', 'undici']];

const COVERAGE_PROVIDERS = [
  ['@vitest/coverage-v8', '@vitest/coverage-v8'],
  ['@vitest/coverage-istanbul', '@vitest/coverage-istanbul'],
];

// 한 축에서 "맞는 것 전부"를 순서대로, 라벨 중복 없이 모은다.
function collect(table, has) {
  const out = [];
  for (const [dep, label] of table) {
    if (has(dep) && !out.includes(label)) out.push(label);
  }
  return out;
}

// 한 축에서 "먼저 맞는 것 하나"만.
function pick(table, has) {
  for (const [dep, label] of table) if (has(dep)) return label;
  return null;
}

// package.json이 없는 프로젝트(python·go·generic)도 같은 모양으로 답한다. 호출부가 null 체크
// 대신 빈 축을 그대로 읽게 해서, "감지 못 했다"와 "그런 설비가 없다"를 한 형태로 합친다.
//
// `manifest`만은 합치지 않는다. "JS 매니페스트가 아예 없다"(python·go)와 "있는데 러너가 없다"는
// 호출부에서 다른 행동으로 갈린다 — 전자에 "러너를 설치하라"고 안내하면 Python 저장소에
// JS 러너를 권하게 된다(실측: job-scraper).
function emptyProfile(manifest = null) {
  return {
    manifest,
    runner: null,
    runnerSource: null,
    coverage: { provider: null, script: null },
    testingLibrary: [],
    domEnv: null,
    storybook: false,
    rnPreset: null,
    providers: [],
    server: null,
    inProcessCall: null,
    orm: [],
    dbDriver: [],
    outboundMock: [],
    infraMarkers: [],
  };
}

// 러너는 의존성이 정본이지만, 의존성 없이 `node --test`만 쓰는 저장소가 실재한다(이 플러그인 자신이
// 그렇다). 그 경우까지 "러너 없음"으로 답하면 문서의 "러너 부재 분기"가 잘못 발동한다.
function detectRunner(deps, scripts) {
  const has = (k) => Object.prototype.hasOwnProperty.call(deps, k);
  const fromDep = pick(RUNNERS, has);
  if (fromDep) return { runner: fromDep, runnerSource: 'dependency' };
  const testScript = scripts.test ?? '';
  if (/\bnode\b.*--test/.test(testScript)) return { runner: 'node:test', runnerSource: 'script' };
  return { runner: null, runnerSource: null };
}

// jest 는 coverage 플래그가 설정이나 스크립트에 흩어져 있어 의존성 하나로 판정되지 않는다.
function detectCoverage(deps, scripts, pkg) {
  const has = (k) => Object.prototype.hasOwnProperty.call(deps, k);
  const provider = pick(COVERAGE_PROVIDERS, has);
  const script = Object.keys(scripts).find(name => name === 'test:coverage' || name === 'coverage') ?? null;
  const jestFlag = pkg?.jest?.collectCoverage === true
    || Object.values(scripts).some(s => typeof s === 'string' && s.includes('--coverage'));
  return { provider: provider ?? (jestFlag ? 'jest --coverage' : null), script };
}

// 테스트 인프라의 "이미 있는 흔적". 통합 테스트에서 DB 전략을 새로 세울지 기존 것을 따를지
// 가르는 신호라 파일 존재 여부까지 본다(harness-inttest.md 0단계 2번).
async function detectInfraMarkers(dir, deps) {
  const markers = [];
  if (Object.prototype.hasOwnProperty.call(deps, 'testcontainers')) markers.push('testcontainers');
  for (const file of ['.env.test', 'docker-compose.test.yml', 'docker-compose.test.yaml']) {
    if (await exists(join(dir, file))) markers.push(file);
  }
  return markers;
}

export async function detectTesting(dir) {
  const manifestPath = join(dir, 'package.json');
  const raw = await readTextSafe(manifestPath);
  // `readTextSafe`는 읽을 수 없으면 null, 빈 파일이면 ''을 준다. `!raw`로 합치면 **빈
  // package.json**이 "매니페스트 없음"으로 분류돼 수리 안내를 건너뛴다(codex P2). 빈 파일은
  // 부재가 아니라 깨진 매니페스트다 — JSON.parse에 그대로 넘겨 'unreadable'로 떨어지게 둔다.
  //
  // null도 한 가지 뜻이 아니다: ENOENT(진짜 부재)와 권한·EISDIR 같은 관측 실패를 같이 삼킨다.
  // 후자를 "없음"으로 부르면 고쳐야 할 프로젝트가 success로 지나간다(codex P2). 파일이 거기
  // 있는데 못 읽었으면 그것은 부재가 아니라 읽기 실패다.
  if (raw === null) return emptyProfile(await exists(manifestPath) ? 'unreadable' : null);
  let pkg;
  // 깨진 package.json 에서 던지면 stack 커맨드 전체가 죽는다. 읽을 수 없는 매니페스트는
  // "설비 없음"과 같은 관측이다 — 호출부는 detect-stack 쪽 결과로 여전히 답할 수 있다.
  try { pkg = JSON.parse(raw); } catch { return emptyProfile('unreadable'); }
  // `null`·`[]`·`"x"` 는 전부 유효한 JSON이라 parse를 통과한다. 객체가 아니면 그 뒤의
  // `pkg.dependencies` 접근에서 CLI가 죽는다(codex P2: `package.json` 이 `null` 일 때 실측).
  // 매니페스트로 쓸 수 없다는 점에서 파싱 실패와 같은 관측이다.
  if (pkg === null || typeof pkg !== 'object' || Array.isArray(pkg)) return emptyProfile('unreadable');

  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const scripts = pkg.scripts ?? {};
  const has = (k) => Object.prototype.hasOwnProperty.call(deps, k);
  const server = pick(SERVERS, has);

  return {
    manifest: 'package.json',
    ...detectRunner(deps, scripts),
    coverage: detectCoverage(deps, scripts, pkg),
    testingLibrary: collect(TESTING_LIBRARIES, has),
    domEnv: pick(DOM_ENVS, has),
    storybook: Object.keys(deps).some(d => d.startsWith('@storybook/')),
    rnPreset: has('jest-expo') ? 'jest-expo' : null,
    providers: collect(PROVIDERS, has),
    server,
    inProcessCall: server ? IN_PROCESS_CALL[server] : null,
    orm: collect(ORMS, has),
    dbDriver: collect(DB_DRIVERS, has),
    outboundMock: collect(OUTBOUND_MOCKS, has),
    infraMarkers: await detectInfraMarkers(dir, deps),
  };
}

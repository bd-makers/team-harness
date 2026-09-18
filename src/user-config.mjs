import { join } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { confirm, ask } from './prompt.mjs';

const pexec = promisify(execFile);

function configPathOf(targetDir) {
  return join(targetDir, '.harness', 'config.json');
}

// 관대한 읽기 — 없음도 malformed 도 `{}`. init/sync 의 username 흐름이 쓴다. malformed 를 여기서
// 거부하면 init 재실행이 깨진 config 에서 멈추게 되므로 그 동작 변화는 이 모듈이 정하지 않는다
// (task `config-rmw-cli` 의 (open) 항목). 새 코드는 `readConfigStrict` 를 쓴다.
async function readConfig(targetDir) {
  try {
    return JSON.parse(await readFile(configPathOf(targetDir), 'utf8'));
  } catch { return {}; } // file may not exist yet
}

// 엄격한 읽기 — **없음**은 `{}`, **malformed** 는 throw. `commands/harness-spec.md` 4단계의 "malformed JSON
// 이면 덮어쓰지 말고 중단" 을 코드가 지키려면 두 상태를 구분해야 한다. 종전 `readConfig` 두 벌
// (이 파일 · `task.mjs`)은 둘 다 `{}` 로 삼켜 read-modify-write 가 깨진 파일 위에 그대로 덮어썼다.
export async function readConfigStrict(targetDir) {
  let raw;
  try {
    raw = await readFile(configPathOf(targetDir), 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') return {};
    throw err;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`.harness/config.json 이 malformed JSON 입니다: ${err.message}`);
  }
  if (!isPlainObject(parsed)) throw new Error('.harness/config.json 이 malformed 입니다: 최상위가 객체가 아님');
  return parsed;
}

// 유일한 쓰기 지점. `saveUsername` 과 `config set` 이 같은 바이트(2-space JSON + 개행)를 낸다.
export async function writeConfig(targetDir, config) {
  await mkdir(join(targetDir, '.harness'), { recursive: true });
  await writeFile(configPathOf(targetDir), JSON.stringify(config, null, 2) + '\n', 'utf8');
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// 점으로 이은 키 경로. 세그먼트는 `[A-Za-z0-9_-]+` 만 — 파싱한 객체에 `__proto__` 를 대입하면 프로토타입이
// 바뀌므로(prototype pollution) 그 셋은 이름으로 거부한다. 빈 세그먼트(`a..b`, `a.`)도 오타이므로 거부.
const SEGMENT_RE = /^[A-Za-z0-9_-]+$/;
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

export function parseConfigKey(key) {
  if (typeof key !== 'string' || key.length === 0) throw new Error('키 경로가 비어 있음');
  const segments = key.split('.');
  for (const segment of segments) {
    if (!SEGMENT_RE.test(segment)) throw new Error(`키 경로 "${key}" 의 세그먼트 "${segment}" 가 부정 (허용: [A-Za-z0-9_-]+)`);
    if (FORBIDDEN_SEGMENTS.has(segment)) throw new Error(`키 경로 "${key}" 의 세그먼트 "${segment}" 는 허용하지 않음`);
  }
  return segments;
}

export function getConfigValue(config, key) {
  let node = config;
  for (const segment of parseConfigKey(key)) {
    if (!isPlainObject(node) || !Object.prototype.hasOwnProperty.call(node, segment)) return undefined;
    node = node[segment];
  }
  return node;
}

// 경로 하나만 바꾸고 나머지는 건드리지 않는다. 중간 객체는 없으면 만들고, 있는데 객체가 아니면
// (`user` 가 문자열인데 `user.x`) 덮어쓰지 않고 throw — 그 덮어쓰기가 바로 산문이 막으려던 키 손실이다.
export function setConfigValue(config, key, value) {
  const segments = parseConfigKey(key);
  let node = config;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (!Object.prototype.hasOwnProperty.call(node, segment) || node[segment] === undefined) {
      node[segment] = {};
    } else if (!isPlainObject(node[segment])) {
      throw new Error(`키 경로 "${key}" 의 "${segments.slice(0, i + 1).join('.')}" 가 객체가 아님 — 덮어쓰지 않음`);
    }
    node = node[segment];
  }
  const leaf = segments[segments.length - 1];
  // leaf 가 이미 객체면 거부 — `specSources.confluence` 에 문자열을 넣으면 `baseUrl`·`spaceKey` 가 조용히
  // 사라진다. 그것이 바로 이 함수가 지키려는 "기존 키 보존" 의 반대다(codex 리뷰 P2 3회차).
  if (isPlainObject(node[leaf])) {
    throw new Error(`키 경로 "${key}" 는 객체(하위 키: ${Object.keys(node[leaf]).join(', ') || '없음'}) — 하위 키를 지정하거나 파일을 직접 편집`);
  }
  node[leaf] = value;
  return config;
}

// 결정만 한다 — 파일을 쓰지 않는다. 이미 user가 있으면 null(저장할 것 없음).
// init은 이 값을 계획 단계에서 들고 있다가 최종 Apply 뒤에 saveUsername으로 저장한다 —
// 그전에 쓰면 "Apply?"에 n을 답해도 .harness/config.json이 남는다(2026-09-13 Codex 분석 P2).
export async function resolveUsername(targetDir, flags = {}) {
  const config = await readConfig(targetDir);
  if (config.user) return null; // already configured

  let name;
  if (flags.yes) {
    // silent fallback: git config → $USER → 'unknown'
    try {
      const { stdout } = await pexec('git', ['-C', targetDir, 'config', 'user.name']);
      name = stdout.trim() || null;
    } catch { /* ignore */ }
    name = name || process.env.USER || process.env.USERNAME || 'unknown';
  } else {
    let gitName = null;
    try {
      const { stdout } = await pexec('git', ['-C', targetDir, 'config', 'user.name']);
      gitName = stdout.trim() || null;
    } catch { /* ignore */ }

    if (gitName) {
      const ok = await confirm(
        `\ndocs/ 경로에 사용할 이름이 '${gitName}'으로 설정됩니다. 맞나요?`,
        { defaultYes: true },
      );
      name = ok ? gitName : await ask('사용할 이름을 입력하세요:');
    } else {
      name = await ask('docs/ 경로에 사용할 이름을 입력하세요:');
    }
  }
  console.log(`  user: ${name}`);
  return name;
}

export async function saveUsername(targetDir, name) {
  const config = await readConfig(targetDir);
  config.user = name;
  await writeConfig(targetDir, config);
}

// 종전 동작: 결정 즉시 저장. 계획/적용 분기가 없는 sync가 쓴다.
export async function ensureUsername(targetDir, flags = {}) {
  const name = await resolveUsername(targetDir, flags);
  if (name) await saveUsername(targetDir, name);
}

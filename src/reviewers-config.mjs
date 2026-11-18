// `.harness/reviewers.json` — 팀이 커밋해 공유하는 리뷰어 설정. 스키마의 정본은 commands/harness-review.md custom 절이다.
//
//   { "custom": { "command": "…" }, "profiles": { "<name>": { "engine": "codex", "model": "<id>" } }, "default": "<name>" }
//
// `review`(엔진 결정)와 `task --reviewer`(생성 시 프로필 확인)가 같은 판정을 쓴다. review.mjs 에 두면 task.mjs 가
// review.mjs 를, review.mjs 가 task.mjs 를 import 하는 순환이 생겨 여기로 뺐다.

import { join } from 'node:path';
import { readFile } from 'node:fs/promises';

export const ENGINES = ['codex', 'claude', 'custom'];

export const REVIEWERS_REL = '.harness/reviewers.json';

const PROFILE_KEYS = ['engine', 'model'];

// 모델 id 는 argv 한 칸으로 엔진 CLI 에 넘어간다(`codex exec -m <id>`·`claude --model <id>`). 선행 `-` 는 엔진이
// 다음 플래그로 읽고(argv 주입), 공백·제어문자는 id 가 아니다. `--model` 과 프로필 `model` 이 이 하나를 쓴다.
export function modelIssue(model) {
  if (typeof model !== 'string' || !model.length) return '비어 있지 않은 문자열이어야 함';
  if (/[\s\x00-\x1f\x7f]/.test(model)) return '공백·제어문자를 포함할 수 없음';
  if (model.startsWith('-')) return '`-` 로 시작할 수 없음 (엔진 CLI 가 플래그로 읽는다)';
  return null;
}

// profiles·default 만 검사한다. 최상위의 다른 키(custom 포함 — custom 은 자기 경로가 따로 검사한다)는 보지 않는다:
// 기존 파일과 앞으로 더할 키를 깨뜨리지 않기 위해서다. 프로필 안의 키는 닫혀 있다 — `modle` 같은 오타가
// 조용히 "엔진 기본 모델"로 도는 것을 막는다.
export function reviewersConfigIssue(cfg) {
  if (cfg === null || typeof cfg !== 'object' || Array.isArray(cfg)) return 'object 가 아님';
  const { profiles, default: defaultName } = cfg;
  if (profiles !== undefined) {
    if (profiles === null || typeof profiles !== 'object' || Array.isArray(profiles)) return '"profiles" 는 object 여야 함';
    for (const [name, profile] of Object.entries(profiles)) {
      if (profile === null || typeof profile !== 'object' || Array.isArray(profile)) return `profiles.${name} 가 object 가 아님`;
      const unknown = Object.keys(profile).filter(k => !PROFILE_KEYS.includes(k));
      if (unknown.length) return `profiles.${name}: 알 수 없는 키 ${unknown.join(', ')} (허용: ${PROFILE_KEYS.join('·')})`;
      if (!ENGINES.includes(profile.engine)) return `profiles.${name}.engine 은 ${ENGINES.join('|')} 중 하나여야 함`;
      if (profile.model === undefined) continue;
      if (profile.engine === 'custom') return `profiles.${name}: custom 프로필은 model 을 가질 수 없음 (셸 템플릿에 실을 자리가 없다)`;
      const issue = modelIssue(profile.model);
      if (issue) return `profiles.${name}.model 은 ${issue}`;
    }
  }
  if (defaultName !== undefined) {
    if (typeof defaultName !== 'string' || !defaultName) return '"default" 는 프로필 이름(문자열)이어야 함';
    if (!profiles || !Object.hasOwn(profiles, defaultName)) return `"default" 가 가리키는 프로필 "${defaultName}" 이 profiles 에 없음`;
  }
  return null;
}

// 반환: { config: null }(파일 없음) | { config }(스키마 통과) | { error }. 파일이 있는데 깨져 있으면 error 다 —
// 이 함수를 부르는 경로는 프로필을 **고르려는** 경로라, 조용히 null 로 보면 명시 선택이 probe 로 내려간다.
export async function loadReviewersConfig(targetDir) {
  let text;
  try {
    text = await readFile(join(targetDir, REVIEWERS_REL), 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return { config: null };
    return { error: `${REVIEWERS_REL} 을 읽을 수 없음: ${err.code || err.message}` };
  }
  let config;
  try { config = JSON.parse(text); } catch (err) {
    return { error: `${REVIEWERS_REL} JSON 파싱 실패: ${err.message}` };
  }
  const issue = reviewersConfigIssue(config);
  return issue ? { error: `${REVIEWERS_REL} 스키마 오류: ${issue}` } : { config };
}

export function findProfile(config, name) {
  const profiles = config && config.profiles;
  return profiles && Object.hasOwn(profiles, name) ? profiles[name] : null;
}

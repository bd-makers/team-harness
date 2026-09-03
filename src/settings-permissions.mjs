// init이 쓰는 .claude/settings.json의 permissions 중 패키지 매니저·스택에 의존하는 항목을
// 스택 프로필(detect-stack buildProfile 출력)에서 생성한다. 템플릿 JSON에는 pm·RN 무관 항목만
// 남고, planChanges가 이 결과를 합성한 뒤 기존 settings와 deep-merge한다.
// 계약의 정본은 tests/settings-permissions.test.mjs.

export const RN_STACK_IDS = new Set(['react-native', 'expo']);

const CONFIGURE = '(configure)';
// pm별 "패키지 추가" 명령과 로컬 바이너리 실행 접두(expo·tsc). 여기 없는 pm(pip·go·(none))은
// pm 의존 항목을 만들지 않는다.
const ADD_CMD = { npm: 'npm install *', yarn: 'yarn add *', pnpm: 'pnpm add *', bun: 'bun add *' };
const EXEC_PREFIX = { npm: 'npx', yarn: 'yarn', pnpm: 'pnpm', bun: 'bunx' };

export function isRnStack(stackId) {
  return RN_STACK_IDS.has(stackId);
}

const bash = (cmd) => `Bash(${cmd})`;
const configured = (cmd) => typeof cmd === 'string' && cmd !== '' && cmd !== CONFIGURE;

// stackId: 유효 stack id(명시 --stack > 감지값). 생략하면 프로필의 id를 쓴다 — excludesRnRules와 같은 입력.
export function stackPermissions(profile, { stackId } = {}) {
  const allow = [];
  const deny = [];
  if (!profile) return { allow, deny };
  const pm = profile.packageManager;

  // pm 게이트 — 지원하는 pm(npm·yarn·pnpm·bun)일 때만 pm 의존 항목을 만든다.
  if (ADD_CMD[pm]) {
    if (configured(profile.cmdInstall)) allow.push(bash(profile.cmdInstall));
    allow.push(bash(ADD_CMD[pm]));
    if (configured(profile.cmdTest)) allow.push(bash(profile.cmdTest), bash(`${profile.cmdTest} -- *`));
    if (configured(profile.cmdLint)) allow.push(bash(profile.cmdLint));
    if (configured(profile.cmdTypecheck)) allow.push(bash(profile.cmdTypecheck));
    else if (profile.language === 'TypeScript') allow.push(bash(`${EXEC_PREFIX[pm]} tsc --noEmit`));
  }

  // RN 게이트 — pm 게이트와 독립이다(codex 리뷰 P2, 2026-09-04): package.json 없는 디렉터리에
  // --stack expo를 강제해도 excludesRnRules가 RN rules를 넣는 것과 같이 네이티브 deny는 들어가야 한다.
  // pm을 모르면 exec 접두는 npx로 둔다.
  if (isRnStack(stackId ?? profile.id)) {
    const exec = EXEC_PREFIX[pm] ?? 'npx';
    allow.push(bash(`${exec} expo start`), bash(`${exec} expo prebuild *`), bash('npx expo install *'));
    deny.push('Edit(./ios/**)', 'Edit(./android/**)');
  }
  return { allow, deny };
}

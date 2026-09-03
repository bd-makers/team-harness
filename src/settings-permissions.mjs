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
  if (!ADD_CMD[pm]) return { allow, deny };

  if (configured(profile.cmdInstall)) allow.push(bash(profile.cmdInstall));
  allow.push(bash(ADD_CMD[pm]));
  if (configured(profile.cmdTest)) allow.push(bash(profile.cmdTest), bash(`${profile.cmdTest} -- *`));
  if (configured(profile.cmdLint)) allow.push(bash(profile.cmdLint));
  if (configured(profile.cmdTypecheck)) allow.push(bash(profile.cmdTypecheck));
  else if (profile.language === 'TypeScript') allow.push(bash(`${EXEC_PREFIX[pm]} tsc --noEmit`));

  if (isRnStack(stackId ?? profile.id)) {
    allow.push(bash(`${EXEC_PREFIX[pm]} expo start`), bash(`${EXEC_PREFIX[pm]} expo prebuild *`), bash('npx expo install *'));
    deny.push('Edit(./ios/**)', 'Edit(./android/**)');
  }
  return { allow, deny };
}

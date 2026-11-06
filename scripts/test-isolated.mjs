#!/usr/bin/env node
// `npm test` 의 유일한 진입점 — 인자를 그대로 `node` 에 넘기되, 메인테이너 머신의 전역 상태를 가린다.
//
// 테스트가 실제 `~/.claude`·`~/.codex` 를 읽으면 로컬에서는 통과하고 러너에서만 깨진다(8bcef1b 의 e2e doctor,
// global-cli-drift artifact). 그 실수는 개별 테스트를 고쳐서는 또 나오므로 환경을 여기서 한 번에 비운다.
// HOME 만 바꾸고 나머지는 지운다 — 소스의 기본값이 전부 HOME 에서 나오므로 빈 값이 곧 "설치 없음"이다.
// git identity 도 여기서 준다. CI 가 따로 설정하면 로컬과 CI 가 다른 명령을 돌리게 된다.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// GIT_DIR·GIT_INDEX_FILE·GIT_WORK_TREE 가 남으면 픽스처의 git 명령이 실제 저장소의 index·config 를 덮어쓴다.
// git 훅 안에서는 git 이 이 변수들을 export 한다.
const MACHINE_ENV = [
  'CLAUDE_CONFIG_DIR', 'CLAUDE_PLUGINS_ROOT', 'CODEX_HOME', 'XDG_CONFIG_HOME', 'GIT_CONFIG_GLOBAL',
  'GIT_DIR', 'GIT_INDEX_FILE', 'GIT_WORK_TREE',
];

const home = realpathSync(mkdtempSync(join(tmpdir(), 'harness-test-home-')));
writeFileSync(join(home, '.gitconfig'), `[user]
\temail = ci@harness.test
\tname = harness-ci
[init]
\tdefaultBranch = main
`);

const env = { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1' };
for (const name of MACHINE_ENV) delete env[name];

const result = spawnSync(process.execPath, process.argv.slice(2), { env, stdio: 'inherit' });
rmSync(home, { recursive: true, force: true });
if (result.error) throw result.error;
process.exit(result.status ?? 1);

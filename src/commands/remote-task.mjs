import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readTaskMeta } from './summary.mjs';

const pexec = promisify(execFile);

// "이 task는 main에서 이미 종결됐는가"의 판정 한 곳. session-context(SessionStart)·doctor·task 가 공유한다.
//
// 배경(2026-09-10): 09-07 클론에서 구현한 task가 main에는 09-08에 이미 종결·릴리스돼 있었고 6커밋을 폐기했다.
// `.harness/active.json`은 gitignore라 클론은 그 사실을 모르고, task-gate는 로컬 meta만 본다.
// 여기서는 **fetch하지 않는다** — 로컬 `refs/remotes/origin/<default>` 기준이라 "마지막 fetch 시점의 main"이다.
// 그보다 새 사실은 모르지만, SessionStart마다 네트워크를 타는 것보다 낫다. 어떤 실패도 null(조용히 건너뜀):
// git이 없거나, 저장소가 아니거나, origin이 없거나, 그 경로에 meta가 없는 경우 전부 "모른다"이지 오류가 아니다.

// "fetch 없음" 계약을 git 쪽에서도 강제한다 — partial clone(`--filter=blob:none`)에서는 `git show`가 없는 blob을
// promisor remote에서 **암묵적으로** 가져온다(2026-09-11 codex 리뷰 P2). GIT_NO_LAZY_FETCH=1(git ≥ 2.45)이면 그 대신
// 실패하고 → null(모른다). 구 git은 이 변수를 무시하지만 그때도 timeout이 SessionStart 10초 예산을 지킨다.
export const GIT_TIMEOUT_MS = 2000;
async function git(targetDir, args) {
  const { stdout } = await pexec('git', ['-C', targetDir, ...args], {
    maxBuffer: 1024 * 1024,
    timeout: GIT_TIMEOUT_MS,
    env: { ...process.env, GIT_NO_LAZY_FETCH: '1' },
  });
  return stdout;
}

// origin/HEAD → 그 브랜치(예: origin/main). 없으면 origin/main. 그것도 없으면 null.
export async function resolveDefaultRef(targetDir, { git: run = git } = {}) {
  try {
    const head = (await run(targetDir, ['symbolic-ref', '-q', 'refs/remotes/origin/HEAD'])).trim();
    if (head.startsWith('refs/remotes/')) return head.slice('refs/remotes/'.length);
  } catch { /* origin/HEAD 미설정 — 폴백 */ }
  try {
    await run(targetDir, ['rev-parse', '--verify', '--quiet', 'origin/main']);
    return 'origin/main';
  } catch { return null; }
}

// 원격 default 브랜치 커밋의 `<task>-meta.json`. { ref, meta } 또는 null.
export async function readRemoteTaskMeta(targetDir, user, task, { git: run = git } = {}) {
  const ref = await resolveDefaultRef(targetDir, { git: run });
  if (!ref) return null;
  try {
    const raw = await run(targetDir, ['show', `${ref}:docs/${user}/${task}/${task}-meta.json`]);
    const meta = JSON.parse(raw);
    if (meta && typeof meta === 'object') return { ref, meta };
  } catch { /* 경로 없음(exit 128)·JSON 아님 — 모른다 */ }
  return null;
}

// 판정 표(spec Ontology). 원격 done && 로컬 미종결 && 고의 재개 아님 → { ref, closedAt }.
// - 로컬 done: 재개 후보 판정(session-context)이 이미 처리하므로 여기서 다시 말하지 않는다.
// - 고의 재개: 로컬 `reopenedAt`이 원격 `closedAt`보다 나중이면 사용자가 main의 종결을 보고 다시 연 것이다
//   (`task <name>`이 done meta를 열 때만 생기는 값). 매 세션 반복되는 소음을 막는다.
export function doneOnMainVerdict({ localMeta, remote }) {
  if (!remote || !remote.meta || remote.meta.status !== 'done') return null;
  if (localMeta && localMeta.status === 'done') return null;
  const closedAt = typeof remote.meta.closedAt === 'string' ? remote.meta.closedAt : null;
  const reopenedAt = localMeta && typeof localMeta.reopenedAt === 'string' ? localMeta.reopenedAt : null;
  if (reopenedAt && closedAt && Date.parse(reopenedAt) > Date.parse(closedAt)) return null;
  return { ref: remote.ref, closedAt };
}

// 한 줄. 복구 경로가 곧 침묵 조건이다 — main을 가져오면 로컬 meta가 done이 되고, 그 위에서 `task <name>`으로
// 다시 열면 `reopenedAt`이 생겨 다음 세션부터 이 nudge가 사라진다.
export function renderDoneOnMainNudge({ user, task, ref, closedAt }) {
  const when = closedAt ?? '(시각 미기록)';
  return `[harness] ⚠ task ${user}/${task} 는 ${ref} 에서 ${when} 에 이미 종결됨 — 재개할 것인지 확인. `
    + `이어가면 main과 구현이 갈릴 수 있다. 근거: git log ${ref} -- docs/${user}/${task} · `
    + `고의로 이어가려면 main을 가져온 뒤 harness-team task ${task} 로 다시 연다(reopened).`;
}

// 세 소비자가 부르는 원콜. 절대 throw하지 않는다.
export async function checkDoneOnMain(targetDir, user, task, { git: run, readLocalMeta = readTaskMeta } = {}) {
  try {
    const remote = await readRemoteTaskMeta(targetDir, user, task, run ? { git: run } : {});
    if (!remote) return null;
    const localMeta = await readLocalMeta(targetDir, user, task);
    return doneOnMainVerdict({ localMeta, remote });
  } catch { return null; }
}

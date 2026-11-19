import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { taskDirRel, taskFileRel, taskFilePath } from './task-paths.mjs';

const pexec = promisify(execFile);

// "종결"의 단일 정의(task done-derive, spec R1). 종결은 기록이 아니라 계산값이다 — 어떤 ref(보통 기본 브랜치)의
// plan·meta 를 읽어 판정한다. 그래서 머지가 곧 종결이고, 머지 뒤 종결 커밋이 필요 없다.

// "미완"의 단일 정의 — done 가드·session-context·종결 판정이 공유한다.
// 줄 시작 체크박스만 매칭(인라인/산문 `- [ ]`는 미완 아님). 내용 없는 `- [ ]`도 미완이다.
export function planHasOpenBoxes(content) {
  return /^\s*- \[ \]/m.test(content);
}

function planHasCheckedBoxes(content) {
  return /^\s*- \[[xX]\]/m.test(content);
}

const isTime = v => typeof v === 'string' && Number.isFinite(Date.parse(v));
// a 가 b 보다 나중인가. b 가 없으면(재개 이력 없음) 참이다.
const after = (a, b) => !isTime(b) || Date.parse(a) > Date.parse(b);

// 유효한 우회 기록 — `forcedAt` 이 `reopenedAt` 보다 나중(또는 재개 이력 없음). 종결 판정과 원장의 ⚠️ 표시가 공유한다:
// 우회로 닫았다가 재개해 정상 종결한 task 에 남은 옛 `forcedAt` 은 이번 종결의 표시가 아니다.
export function forcedIsValid(meta) {
  return Boolean(meta) && isTime(meta.forcedAt) && after(meta.forcedAt, meta.reopenedAt);
}

// 순수 판정. plan 이 우선이고, 그다음 유효한 `--force` 우회 기록, 마지막으로 레거시 meta `status: done`이다.
// - plan: 미완 체크박스가 없고 **체크된 체크박스가 하나 이상** — plan 없음·빈 plan·체크박스 없는 plan 은 open 이다.
// - forced: `forcedAt` 이 `reopenedAt` 보다 나중(또는 재개 이력 없음). 우회로 닫은 task 는 미완 단계를 남긴 채 닫힌다.
// - legacy-meta: 옛 CLI 의 `done` 이 쓴 `status: done`. 재개 뒤 다시 닫았으면 `closedAt > reopenedAt` 이다.
export function closureFromContent({ plan, meta }) {
  if (typeof plan === 'string' && !planHasOpenBoxes(plan) && planHasCheckedBoxes(plan)) {
    return { closed: true, source: 'plan' };
  }
  const m = meta && typeof meta === 'object' ? meta : {};
  if (forcedIsValid(m)) return { closed: true, source: 'forced' };
  if (m.status === 'done' && (!isTime(m.reopenedAt) || (isTime(m.closedAt) && after(m.closedAt, m.reopenedAt)))) {
    return { closed: true, source: 'legacy-meta' };
  }
  return { closed: false, source: null };
}

// git 호출 정책은 `remote-task.mjs` 와 같다 — fetch 하지 않는다(partial clone 의 암묵 fetch 도 막는다),
// 2초 timeout. 어떤 실패도 "모른다"이지 오류가 아니다.
export const GIT_TIMEOUT_MS = 2000;
export async function gitAt(targetDir, args) {
  const { stdout } = await pexec('git', ['-C', targetDir, ...args], {
    maxBuffer: 1024 * 1024,
    timeout: GIT_TIMEOUT_MS,
    env: { ...process.env, GIT_NO_LAZY_FETCH: '1' },
  });
  return stdout;
}

// `<ref>:./<rel>` — `./` 는 `-C targetDir` 기준이다. 하네스를 저장소 하위 디렉터리에 설치해도 docs/ 를 그 기준으로 찾는다
// (pr-check 와 같은 규약). `<ref>:<rel>` 은 저장소 루트 기준이라 하위 설치에서 task 를 놓친다(codex 리뷰 P1, 2026-11-19).
export const refPath = (ref, rel) => `${ref}:./${rel}`;

async function readAt(targetDir, user, task, kind, ref, run) {
  try {
    if (ref) return await run(targetDir, ['show', refPath(ref, taskFileRel(user, task, kind))]);
    return await readFile(taskFilePath(targetDir, user, task, kind), 'utf8');
  } catch { return null; }
}

function parseMeta(raw) {
  if (raw == null) return null;
  try {
    const meta = JSON.parse(raw);
    return meta && typeof meta === 'object' ? meta : null;
  } catch { return null; }
}

// ref 를 주면 그 커밋의 파일을, 안 주면 작업 트리를 읽는다. ref 는 전체 이름으로 준다
// (`refs/remotes/origin/main` — 짧은 이름은 같은 이름의 로컬 브랜치로 먼저 풀린다, remote-task.mjs 참고).
// closedAt: meta 에 남은 시각(레거시 closedAt → 우회 forcedAt)이 있으면 그것을, 없으면 그 task 디렉터리를
// 마지막으로 건드린 커밋의 committer 시각(작업 트리 판정이면 HEAD 기준). git 이 아니거나 실패하면 null.
export async function taskClosure(targetDir, user, task, { ref, git: run = gitAt } = {}) {
  const [plan, metaRaw] = await Promise.all([
    readAt(targetDir, user, task, 'plan.md', ref, run),
    readAt(targetDir, user, task, 'meta.json', ref, run),
  ]);
  const meta = parseMeta(metaRaw);
  const { closed, source } = closureFromContent({ plan, meta });
  if (!closed) return { closed, source, closedAt: null };
  // 재개 전 시각은 이번 종결의 시각이 아니다 — `reopenedAt` 보다 나중인 기록만 쓴다.
  const m = meta || {};
  const recorded = [source === 'forced' ? m.forcedAt : null, m.closedAt].find(v => isTime(v) && after(v, m.reopenedAt));
  if (recorded) return { closed, source, closedAt: new Date(recorded).toISOString() };
  let closedAt = null;
  try {
    // `%cI` 의 UTC 표기(`Z`·`+00:00`)는 git 버전마다 다르다 — ISO 로 정규화한다.
    const at = Date.parse((await run(targetDir, ['log', '-1', '--format=%cI', ref || 'HEAD', '--', taskDirRel(user, task)])).trim());
    if (Number.isFinite(at)) closedAt = new Date(at).toISOString();
  } catch { /* git 아님·얕은 클론·timeout — 시각 미기록 */ }
  return { closed, source, closedAt };
}

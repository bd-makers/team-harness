import { readTaskMeta, parseSummaryRows, readTextOrNull, inferLegacyMeta, readLedger } from './summary.mjs';
import { readOriginHead } from '../git-default-branch.mjs';
import { DOCS_DIR, taskDirRel, taskFileRel, taskLabel, taskFilePath } from '../task-paths.mjs';
import { taskClosure, closureFromContent, refPath, gitAt as git, GIT_TIMEOUT_MS } from '../task-closure.mjs';

// "이 task는 main에서 이미 종결됐는가"의 판정 한 곳. session-context(SessionStart)·doctor·task 가 공유한다.
//
// 배경(2026-09-10): 09-07 클론에서 구현한 task가 main에는 09-08에 이미 종결·릴리스돼 있었고 6커밋을 폐기했다.
// `.harness/active.json`은 gitignore라 클론은 그 사실을 모르고, task-gate는 로컬 meta만 본다.
// 여기서는 **fetch하지 않는다** — 로컬 `refs/remotes/origin/<default>` 기준이라 "마지막 fetch 시점의 main"이다.
// 그보다 새 사실은 모르지만, SessionStart마다 네트워크를 타는 것보다 낫다. 어떤 실패도 null(조용히 건너뜀):
// git이 없거나, 저장소가 아니거나, origin이 없거나, 그 경로에 task가 없는 경우 전부 "모른다"이지 오류가 아니다.
//
// git 호출은 `task-closure.mjs` 의 `gitAt` 하나를 쓴다 — "fetch 없음" 계약을 git 쪽에서도 강제한다:
// partial clone(`--filter=blob:none`)에서는 `git show`가 없는 blob을 promisor remote에서 **암묵적으로** 가져온다
// (2026-09-11 codex 리뷰 P2). GIT_NO_LAZY_FETCH=1(git ≥ 2.45)이면 그 대신 실패하고 → null(모른다).
// 구 git은 이 변수를 무시하지만 그때도 timeout이 SessionStart 10초 예산을 지킨다.
export { GIT_TIMEOUT_MS };

// origin/HEAD → 그 브랜치(예: origin/main). 없으면 origin/main. 그것도 없으면 null.
export async function resolveDefaultRef(targetDir, { git: run = git } = {}) {
  // 읽기는 공용 프리미티브가, 폴백은 여기가 정한다. `run` 을 그대로 넘겨 이 모듈의
  // GIT_NO_LAZY_FETCH·timeout 정책이 유지되게 한다.
  const name = await readOriginHead(args => run(targetDir, args));
  if (name) return `origin/${name}`;
  try {
    // 원격 추적 ref 만 본다 — 로컬 브랜치 `origin/main` 이 있으면 짧은 이름 검증이 그쪽으로 통과한다.
    await run(targetDir, ['rev-parse', '--verify', '--quiet', 'refs/remotes/origin/main']);
    return 'origin/main';
  } catch { return null; }
}

// git pathspec·`<rev>:<path>` 용 POSIX 경로 — `SUMMARY_REL` 은 OS 구분자로 조립돼 여기 쓸 수 없다.
const SUMMARY_GIT_PATH = `${DOCS_DIR}/task_summary.md`;

// `<rev>` 커밋 원장(`task_summary.md`)의 `✅ done` 행 label 집합. 원장이 없거나 읽지 못하면 빈 집합(모른다).
export async function readDoneLabelsAt(targetDir, rev, { git: run = git } = {}) {
  try {
    const rows = parseSummaryRows(await run(targetDir, ['show', refPath(rev, SUMMARY_GIT_PATH)]));
    return new Set(rows.filter(r => r.done).map(r => taskLabel(r.user, r.task)));
  } catch { return new Set(); }
}

// 판정 기준 ref(R, done-derive R2) — 원격 추적 기본 브랜치, origin 이 없으면 로컬 `main`/`master`, 둘 다 없으면 null(호출자가
// 작업 트리로 대신한다). origin 없는 저장소의 기본 브랜치가 다른 이름(`develop` 등)이면 작업 트리로 떨어진다 — `defaultBranchCandidates` 와
// 같은 한계다(origin 이 없으면 기본 브랜치 이름을 알 출처가 없다). 전체 ref 이름으로 돌려준다. 재개·clean 이 공유한다(원격 nudge 는 다른 클론의 종결을 알리는 것이라 origin 만 본다).
export async function resolveClosureRef(targetDir, { resolveRef = resolveDefaultRef, git: run = git } = {}) {
  let ref = null;
  try { ref = await resolveRef(targetDir, { git: run }); } catch { ref = null; }
  for (const full of ref ? [`refs/remotes/${ref}`] : ['refs/heads/main', 'refs/heads/master']) {
    try { await run(targetDir, ['rev-parse', '--verify', '--quiet', `${full}^{commit}`]); return full; } catch { /* 다음 후보 */ }
  }
  return null;
}

async function lastTouchedAt(targetDir, user, task, full, run) {
  try {
    // meta 의 `closedAt` 과 같은 형식으로 맞춘다 — `%cI` 의 UTC 표기(`Z`·`+00:00`)는 git 버전마다 다르다.
    const at = Date.parse((await run(targetDir, ['log', '-1', '--format=%cI', full, '--', taskDirRel(user, task)])).trim());
    return Number.isFinite(at) ? new Date(at).toISOString() : null;
  } catch { return null; } // 얕은 클론·timeout — 시각 미기록
}

// 커밋 `full`(전체 ref 이름)에서의 종결 — R1 판정(`taskClosure`)에 레거시 원장 폴백을 더한 한 곳. 재개·clean·원격 nudge 가 공유한다.
// R 에 meta 가 없는 task 는 R 의 원장 `✅ done` 행이 종결 기록이다(inferLegacyMeta 와 같은 출처) — 폴더를 지운 task(`ledger`)든
// meta 없이 폴더만 남은 구 task(`legacy-ledger`)든. R 에 meta 가 있으면 그것이 정본이다 — 재개가 meta 를 쓰므로, 머지된 재개 뒤
// 낡은 원장 행이 다시 닫지 못한다. 원장에는 시각이 없어 `closedAt` 은 그 task 디렉터리를 마지막으로 건드린 커밋 시각이다.
// 반환 { closed, closedAt, source }. 절대 throw 하지 않는다(모르면 open).
export async function closureAtRef(targetDir, user, task, full, { git: run = git } = {}) {
  const open = { closed: false, closedAt: null, source: null };
  try {
    const closure = await taskClosure(targetDir, user, task, { ref: full, git: run });
    if (closure.closed) return closure;
    try {
      await run(targetDir, ['cat-file', '-e', refPath(full, taskFileRel(user, task, 'meta.json'))]);
      return open;
    } catch { /* R 에 meta 없음 — 원장으로 */ }
    if (!(await readDoneLabelsAt(targetDir, full, { git: run })).has(taskLabel(user, task))) return open;
    // 폴더(spec 마커)가 남았으면 "지워짐"이 아니다 — nudge 문구가 갈린다(R3 P2, 2026-10-09 codex).
    // blob 이 아니라 트리 항목을 본다 — partial clone(blob:none)에도 트리는 있으므로 "blob 없음"을 "폴더 없음"으로 오판하지 않는다.
    let folder = false;
    try { folder = Boolean((await run(targetDir, ['ls-tree', '--name-only', full, '--', taskFileRel(user, task, 'spec.md')])).trim()); } catch { return open; }
    return { closed: true, closedAt: await lastTouchedAt(targetDir, user, task, full, run), source: folder ? 'legacy-ledger' : 'ledger' };
  } catch { return open; }
}

// R 의 종결이 마지막 재개 뒤의 것인가 — 재개 이력이 없으면 참. 재개보다 앞선(또는 시각을 모르는) 종결은 이미 다시 연 옛 종결이다
// (재개 MR 이 머지될 때까지 R 은 closed 다). 재개·clean 이 공유한다(codex·claude 리뷰, 2026-11-19).
// 경계: 커밋 시각(`%cI`)은 초 단위다. 재개와 그 뒤 마지막 커밋이 같은 초면 "재개보다 앞"으로 본다 — 초 해상도로는 둘을 가를 수 없고,
// 그때 실패 방향은 재개하지 않음(activate·clean 은 `--base` 분기)이라 안전한 쪽이다. `reopenedAt` 을 초로 내려도 엄격 비교 결과는 같다.
export function closedSinceReopen(closure, meta) {
  if (!closure || !closure.closed) return false;
  const reopenedAt = meta && typeof meta.reopenedAt === 'string' ? Date.parse(meta.reopenedAt) : NaN;
  if (!Number.isFinite(reopenedAt)) return true;
  const closedAt = typeof closure.closedAt === 'string' ? Date.parse(closure.closedAt) : NaN;
  return Number.isFinite(closedAt) && closedAt > reopenedAt;
}

// 원격 default 브랜치(R)에서의 종결 판정(done-derive R1·R9). R 에서 종결이면 { ref, closedAt, source }, 아니면 null.
// `source: 'ledger'` = R 에서 task 폴더가 지워졌고 원장 행으로 읽었다(nudge 복구 안내가 "새 이름"으로 바뀐다).
export async function readRemoteClosure(targetDir, user, task, { git: run = git } = {}) {
  const ref = await resolveDefaultRef(targetDir, { git: run });
  if (!ref) return null;
  // 전체 ref 로 읽는다 — 짧은 `origin/main` 은 같은 이름의 로컬 브랜치(`refs/heads/origin/main`)로 먼저 풀린다(list --remote 와 같은 이유).
  const closure = await closureAtRef(targetDir, user, task, `refs/remotes/${ref}`, { git: run });
  return closure.closed ? { ref, closedAt: closure.closedAt, source: closure.source } : null;
}

// 판정 표(spec Ontology). R 에서 종결 && 작업 트리 미종결 && 고의 재개 아님 → { ref, closedAt }.
// - 작업 트리 종결(같은 R1 판정): 재개 후보 판정(session-context)·`task <name>` 의 재개가 처리하므로 여기서 다시 말하지 않는다.
//   main 을 가져온 클론은 plan 이 전부 체크돼 있어 여기서 조용해지고, `task <name>` 이 그대로 재개한다.
// - 고의 재개: 로컬 `reopenedAt`이 원격 `closedAt`보다 나중이면 사용자가 main의 종결을 보고 다시 연 것이다
//   (재개 전이에서만 생기는 값). 매 세션 반복되는 소음을 막는다.
export function doneOnMainVerdict({ localMeta, localPlan = null, remote }) {
  if (!remote) return null;
  if (closureFromContent({ plan: localPlan, meta: localMeta }).closed) return null;
  const closedAt = typeof remote.closedAt === 'string' ? remote.closedAt : null;
  const reopenedAt = localMeta && typeof localMeta.reopenedAt === 'string' ? localMeta.reopenedAt : null;
  if (reopenedAt && closedAt && Date.parse(reopenedAt) > Date.parse(closedAt)) return null;
  // `source` 는 원장 출처일 때만 싣는다 — 그 밖의 verdict 모양(`--json` envelope 포함)은 종전 그대로다.
  return { ref: remote.ref, closedAt, ...(remote.source === 'ledger' ? { source: 'ledger' } : {}) };
}

// 한 줄. 복구 경로가 곧 침묵 조건이다 — main을 가져오면 작업 트리 plan 도 종결이 되고, 그 위에서 `task <name>`으로
// 다시 열면 `reopenedAt`이 생겨 다음 세션부터 이 nudge가 사라진다.
// 원장 출처(main 에서 폴더가 지워짐)는 복구 안내만 다르다 — "main 을 가져온 뒤 다시 연다"를 따르면 가져오는 순간
// 폴더가 지워지고 `task` 의 이름 재사용 가드가 그 이름을 거부한다. 막힌 길을 안내하지 않는다.
export function renderDoneOnMainNudge({ user, task, ref, closedAt, source }) {
  const when = closedAt ?? '(시각 미기록)';
  if (source === 'ledger') {
    return `[harness] ⚠ task ${taskLabel(user, task)} 는 ${ref} 에서 ${when} 에 이미 종결되고 task 폴더가 지워짐 — 재개할 것인지 확인. `
      + `이어가면 main과 구현이 갈릴 수 있다. 근거: git log ${ref} -- ${taskDirRel(user, task)} · `
      + `이어가려면 새 이름으로 harness-team task <새 이름> 을 만든다(원문은 위 git log).`;
  }
  return `[harness] ⚠ task ${taskLabel(user, task)} 는 ${ref} 에서 ${when} 에 이미 종결됨 — 재개할 것인지 확인. `
    + `이어가면 main과 구현이 갈릴 수 있다. 근거: git log ${ref} -- ${taskDirRel(user, task)} · `
    + `고의로 이어가려면 main을 가져온 뒤 harness-team task ${task} 로 다시 연다(reopened).`;
}

// `list --remote`: 머지되지 않은 원격 브랜치에만 있는 task.
//
// 배경(2026-09-08): 열린 task 가 `origin/claude/agent-harness-core-elements-fqankc` 에만 있었고, `list` 는 체크아웃한
// 브랜치만 봐서 그 브랜치가 "머지된 브랜치"로 오인돼 지워질 뻔했다. 계약은 위와 같다 — fetch 하지 않고 로컬
// `refs/remotes/origin/*`(마지막 fetch 기준)만 읽는다. default ref 의 조상인 브랜치는 머지된 것으로 보고 건너뛴다
// (squash 머지는 조상이 아니라 남지만, 그 task 는 default ref 트리에 있어 걸러진다).
// task 판정은 `listTaskRefs` 와 같다: `docs/<user>/<task>/<task>-spec.md` 마커.
// 반환 `{ ok: true, tasks: [{ user, task, branches, meta }] }`(label 정렬) 또는 `{ ok: false }`. 절대 throw 하지 않는다.
// `exclude`: 로컬에 이미 있는 task 의 label 집합. `withMeta`: 첫 브랜치의 `<task>-meta.json`(없거나 깨지면 null).
export async function listBranchOnlyTasks(targetDir, { git: run = git, exclude = new Set(), withMeta = false } = {}) {
  try {
    const defaultRef = await resolveDefaultRef(targetDir, { git: run });
    if (!defaultRef) return { ok: false };
    // 전체 ref 로 쓴다 — 짧은 `origin/main` 은 `refs/heads/origin/main` 같은 로컬 브랜치가 있으면 그쪽으로 풀린다.
    const defaultFull = `refs/remotes/${defaultRef}`;
    const skip = new Set(['refs/remotes/origin/HEAD', defaultFull]);
    const refs = (await run(targetDir, ['for-each-ref', '--format=%(refname)', 'refs/remotes/origin/']))
      .split('\n').filter(ref => ref && !skip.has(ref));
    // `-z`: 비-ASCII 경로가 C-style 로 인용되지 않게 한다(parsePorcelainPaths 와 같은 이유).
    const specMarkers = async (ref) => {
      const out = [];
      for (const path of (await run(targetDir, ['ls-tree', '-r', '-z', '--name-only', ref, '--', `${DOCS_DIR}/`])).split('\0')) {
        const parts = path.split('/');
        if (parts.length !== 4 || parts[0] !== DOCS_DIR) continue;
        const [, user, task, file] = parts;
        if (file === `${task}-spec.md`) out.push({ user, task, label: taskLabel(user, task) });
      }
      return out;
    };
    // default ref 에 이미 있는 task 도 "브랜치에만" 이 아니다 — 새 main 에서 딴 브랜치는 main 의 task 를 전부 싣고 있고,
    // 로컬이 옛 브랜치면 `exclude` 만으로는 그것들이 branch-only 로 보인다.
    // 폴더를 지운 done task 는 spec 마커가 없다 — default ref 원장의 `✅ done` 행도 "default 에 있다"로 센다(task-folder-removal).
    const onDefault = new Set([
      ...(await specMarkers(defaultFull)).map(({ label }) => label),
      ...(await readDoneLabelsAt(targetDir, defaultFull, { git: run })),
    ]);
    const found = new Map();
    for (const ref of refs) {
      try {
        await run(targetDir, ['merge-base', '--is-ancestor', ref, defaultFull]);
        continue; // exit 0 = 조상 = 머지됨
      } catch (err) {
        if (err?.code !== 1) throw err; // exit 1 = 조상 아님. 그 외는 git 오류
      }
      const branch = ref.slice('refs/remotes/'.length);
      for (const { user, task, label } of await specMarkers(ref)) {
        if (exclude.has(label) || onDefault.has(label)) continue;
        if (!found.has(label)) found.set(label, { user, task, ref, branches: [] });
        found.get(label).branches.push(branch);
      }
    }
    const tasks = [];
    for (const label of [...found.keys()].sort()) {
      const { user, task, ref, branches } = found.get(label);
      let meta = null;
      if (withMeta) {
        try {
          const parsed = JSON.parse(await run(targetDir, ['show', refPath(ref, taskFileRel(user, task, 'meta.json'))]));
          if (parsed && typeof parsed === 'object') meta = parsed;
        } catch { /* 없음·JSON 아님 — area 없음 */ }
      }
      tasks.push({ user, task, branches, meta });
    }
    return { ok: true, tasks };
  } catch { return { ok: false }; }
}

// 세 소비자가 부르는 원콜. 절대 throw하지 않는다.
export async function checkDoneOnMain(targetDir, user, task, { git: run, readLocalMeta = readTaskMeta } = {}) {
  try {
    const remote = await readRemoteClosure(targetDir, user, task, run ? { git: run } : {});
    if (!remote) return null;
    // meta 없는 구 task 는 원장·handoff 에서 추론한 값으로 작업 트리를 판정한다(재개 판정과 같은 입력) — 원격이 원장으로 닫은 구 task 를
    // 로컬도 같은 원장으로 닫았으면 조용하다. 로컬에 task 폴더(spec)가 없으면 추론하지 않는다 — 원장 행만 남은 지워진 task 는
    // 작업 트리에 "종결된 task"가 있는 것이 아니다(폴더 삭제 nudge 를 끄지 않는다).
    const [meta, localPlan, hasSpec] = await Promise.all([
      readLocalMeta(targetDir, user, task),
      readTextOrNull(taskFilePath(targetDir, user, task, 'plan.md')),
      readTextOrNull(taskFilePath(targetDir, user, task, 'spec.md')).then(t => t !== null),
    ]);
    const localMeta = meta || (hasSpec ? await inferLegacyMeta(targetDir, user, task, await readLedger(targetDir)) : null);
    return doneOnMainVerdict({ localMeta, localPlan, remote });
  } catch { return null; }
}

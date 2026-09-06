import { join, dirname, resolve } from 'node:path';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { exists, writeText } from '../fsx.mjs';
import { buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../observation.mjs';
import { hasDoneMarker } from '../handoff-marker.mjs';

const pexec = promisify(execFile);

// The two aggregate files. Historically `task`/`done` edited these on every task,
// which made every parallel branch collide on the same line: the summary row is
// appended at EOF and the index entry is inserted right under a fixed header.
// They are rendered from the task directories now — nothing writes them per task.
export const SUMMARY_REL = join('docs', 'task_summary.md');
export const userIndexRel = (user) => join('docs', user, `${user}-task.md`);

export const metaRel = (user, task) => join('docs', user, task, `${task}-meta.json`);

// Machine-owned per-task state. Lives beside the four SSOT files but is not one of
// them: agents rewrite spec.md wholesale and the post-commit hook rewrites handoff.md,
// so neither can hold data the harness must be able to read back.
// `firstActivatedAt`은 done 가드의 판정 창 시작점이다. 생성 시 1회만 기록하고 이후 누구도
// 덮어쓰지 않는다 — active.json의 `switchedAt`은 재활성화마다 갱신되므로 창 기준이 될 수 없다.
// 없이 쓰인 meta(구 task·migrate 복원분)는 키가 빠지고, 가드는 시각 비교를 포기한다.
export function taskMetaTemplate(user, task, created, firstActivatedAt) {
  return JSON.stringify({ user, task, created, firstActivatedAt, status: 'open', closedAt: null }, null, 2) + '\n';
}

export async function readTaskMeta(targetDir, user, task) {
  try {
    const raw = await readFile(join(targetDir, metaRel(user, task)), 'utf8');
    const meta = JSON.parse(raw);
    if (meta && typeof meta === 'object') return meta;
  } catch { /* missing or unparseable → fall back to inference below */ }
  return null;
}

export async function writeTaskMeta(targetDir, user, task, meta) {
  await writeText(join(targetDir, metaRel(user, task)), JSON.stringify(meta, null, 2) + '\n');
}

// user/task both match ^[\w.-]+$ (enforced by runTask), so `/` cannot appear inside
// either half and the joined key stays unambiguous.
const key = (user, task) => `${user}/${task}`;

// Recover a pre-meta.json task's facts from whatever the older harness left behind.
// Order matters: the committed ledger is the ONLY surviving source of `created` for a
// completed task, because `done` used to overwrite `- <name> (created …)` with `- ✅ <name>`.
export async function inferLegacyMeta(targetDir, user, task, ledger) {
  const summaryRow = ledger.summaryRows.get(key(user, task));
  const handoff = await readTextOrNull(join(targetDir, 'docs', user, task, `${task}-handoff.md`));

  const done = Boolean(
    (handoff && hasDoneMarker(handoff)) ||
    (summaryRow && summaryRow.done) ||
    ledger.completedNames.has(key(user, task))
  );

  return {
    user,
    task,
    created: summaryRow ? summaryRow.created : (ledger.openCreated.get(key(user, task)) || ''),
    status: done ? 'done' : 'open',
    closedAt: null,
  };
}

async function readTextOrNull(p) {
  try { return await readFile(p, 'utf8'); } catch { return null; }
}

// Parse the committed ledger so legacy facts survive the switch to meta.json.
export async function readLedger(targetDir) {
  const summaryRows = new Map();
  const completedNames = new Set();
  const openCreated = new Map();

  const summary = await readTextOrNull(join(targetDir, SUMMARY_REL));
  if (summary) {
    for (const line of summary.split('\n')) {
      const m = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(✅ done|🔄 (?:open|active))\s*\|\s*([^|]*?)\s*\|/);
      if (!m) continue;
      if (m[1] === 'User') continue;
      summaryRows.set(key(m[1], m[2]), { done: m[3] === '✅ done', created: m[4] });
    }
  }

  const docs = join(targetDir, 'docs');
  if (await exists(docs)) {
    for (const entry of await readdir(docs, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const user = entry.name;
      const index = await readTextOrNull(join(targetDir, userIndexRel(user)));
      if (!index) continue;
      for (const line of index.split('\n')) {
        const doneMatch = line.match(/^-\s*✅\s*(\S+)/);
        if (doneMatch) { completedNames.add(key(user, doneMatch[1])); continue; }
        const openMatch = line.match(/^-\s*(\S+)\s*\(created\s+([^)]+)\)/);
        if (openMatch) openCreated.set(key(user, openMatch[1]), openMatch[2]);
      }
    }
  }

  return { summaryRows, completedNames, openCreated };
}

// A directory is a task when it carries the `<name>-spec.md` marker — the same rule
// `list` uses, so docs/superpowers/{plans,specs} and similar non-task dirs stay out.
export async function collectTasks(targetDir) {
  const docs = join(targetDir, 'docs');
  if (!(await exists(docs))) return [];

  const ledger = await readLedger(targetDir);
  const tasks = [];

  for (const userEntry of await readdir(docs, { withFileTypes: true })) {
    if (!userEntry.isDirectory()) continue;
    const user = userEntry.name;
    const userPath = join(docs, user);
    for (const taskEntry of await readdir(userPath, { withFileTypes: true })) {
      if (!taskEntry.isDirectory()) continue;
      const task = taskEntry.name;
      if (!(await exists(join(userPath, task, `${task}-spec.md`)))) continue;
      const meta = (await readTaskMeta(targetDir, user, task))
        || await inferLegacyMeta(targetDir, user, task, ledger);
      tasks.push({ ...meta, user, task });
    }
  }

  return tasks;
}

// Deterministic order or every regeneration churns the diff. The summary table keeps
// creation order (what the old append produced); the per-user index keeps newest-first
// (what the old header-insert produced).
function byCreatedAscThenName(a, b) {
  return (a.created || '').localeCompare(b.created || '') || a.user.localeCompare(b.user) || a.task.localeCompare(b.task);
}

function byCreatedDescThenName(a, b) {
  return (b.created || '').localeCompare(a.created || '') || a.task.localeCompare(b.task);
}

export function renderTaskSummary(tasks) {
  const rows = [...tasks].sort(byCreatedAscThenName)
    .map(t => `| ${t.user} | ${t.task} | ${t.status === 'done' ? '✅ done' : '🔄 open'} | ${t.created || ''} |`);
  return `# Task Summary

| User | Task | Status | Created |
|------|------|--------|---------|
${rows.join('\n')}${rows.length ? '\n' : ''}`;
}

export function renderUserIndex(user, tasks) {
  const mine = tasks.filter(t => t.user === user);
  const open = mine.filter(t => t.status !== 'done').sort(byCreatedDescThenName)
    .map(t => `- ${t.task}${t.created ? ` (created ${t.created})` : ''}`);
  const done = mine.filter(t => t.status === 'done').sort(byCreatedDescThenName)
    .map(t => `- ✅ ${t.task}`);
  return `# ${user} — Tasks

## Open
${open.join('\n')}${open.length ? '\n' : ''}
## Completed
${done.join('\n')}${done.length ? '\n' : ''}`;
}

export function renderAll(tasks) {
  const files = new Map();
  files.set(SUMMARY_REL, renderTaskSummary(tasks));
  for (const user of [...new Set(tasks.map(t => t.user))].sort()) {
    files.set(userIndexRel(user), renderUserIndex(user, tasks));
  }
  return files;
}

// Three outcomes, not two. "not a git repository" is safe to write in — there are no
// branches to collide across. Any other git failure (git missing, repo unreadable) must
// NOT be read as "no branches": that silently turns the guard off exactly when we cannot
// tell where we are.
//
// `branch --show-current` rather than `rev-parse --abbrev-ref HEAD`: the latter fails on
// an unborn HEAD (a fresh repo with no commits), which is a perfectly ordinary place to
// render the ledger. `--show-current` names the branch there, and prints nothing when
// HEAD is detached — which stays refused.
//
// Repo-ness is decided on the filesystem, not by a second git call, so that a missing or
// broken git binary cannot masquerade as "no repository here".
async function branchState(targetDir) {
  try {
    const { stdout } = await pexec('git', ['-C', targetDir, 'branch', '--show-current']);
    const name = stdout.trim();
    return name ? { kind: 'branch', name } : { kind: 'error' };
  } catch {
    return (await findGitDir(targetDir)) ? { kind: 'error' } : { kind: 'none' };
  }
}

async function findGitDir(startDir) {
  let dir = resolve(startDir);
  for (;;) {
    if (await exists(join(dir, '.git'))) return true;
    const parent = dirname(dir);
    if (parent === dir) return false;
    dir = parent;
  }
}

// Which branch names count as "the default". Only `origin/HEAD` actually names THIS
// repository's default branch, so it answers alone. With no origin/HEAD — a local-only
// repo, or a clone that never fetched it — both conventional names are accepted:
// refusing a `master` repo would block the legitimate use while protecting nothing,
// since a feature branch is refused either way.
//
// `init.defaultBranch` is deliberately NOT consulted: it is usually global config and
// states which name the user prefers for NEW repos, not what this repo's default is.
// Someone with init.defaultBranch=main working in a master repo would be refused.
export async function defaultBranchCandidates(targetDir) {
  try {
    const { stdout } = await pexec('git', ['-C', targetDir, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD']);
    const ref = stdout.trim();
    if (ref) return [ref.replace(/^origin\//, '')];
  } catch { /* no origin/HEAD → conventional names below */ }
  return ['main', 'master'];
}

// A branch whose HEAD is the *same commit* as the default branch has no local commits of
// its own: the ledger commit it produces lands directly on top of that branch, which is
// exactly what writing from the default branch produces. The collision this guard exists to
// prevent cannot happen there, so the name alone must not refuse it — a git worktree session
// cannot check out the default branch at all (the primary checkout holds it) and would
// otherwise need `--force` every single time, which turns the guard into noise.
//
// Exact identity only; ancestry is deliberately not accepted. Ahead means real local commits
// — a genuine feature branch, still refused. Behind would render the ledger onto a stale base
// and then fail to push as non-fast-forward, which is more confusing, not less.
//
// `origin/HEAD` alone answers, and its absence closes this path. It is the only ref that names
// THIS repository's default branch; `defaultBranchCandidates` falls back to both conventional
// names, and comparing against all of them would accept a branch sitting on a *stale*
// `origin/master` in a `main` repository — whose ledger commit cannot fast-forward onto the
// real default, which is the very situation `behind` is refused for. Tolerating that looseness
// for NAMES protects nothing (a feature branch is refused either way); tolerating it for
// COMMITS opens a write. So the name path keeps its fallback and this one does not.
//
// Fail-closed throughout: any failure — no `origin/HEAD`, no such remote ref, no commits yet
// (unborn HEAD), git error — returns false and the existing refusal stands. A repository with
// no origin therefore behaves exactly as before.
async function isSyncedWithDefault(targetDir) {
  const rev = async (...args) => {
    const { stdout } = await pexec('git', ['-C', targetDir, ...args]);
    return stdout.trim();
  };
  try {
    // `origin/main` shape. Spelled back as `refs/remotes/origin/main` below so that a local
    // branch or tag literally named `origin/main` cannot answer in its place.
    const base = await rev('symbolic-ref', '--short', 'refs/remotes/origin/HEAD');
    if (!base) return false;
    const head = await rev('rev-parse', 'HEAD');
    if (!head) return false;
    return (await rev('rev-parse', '--verify', `refs/remotes/${base}`)) === head;
  } catch {
    return false;
  }
}

export async function runSummary(ctx) {
  const json = !!(ctx.flags && ctx.flags.json);
  const write = !!(ctx.flags && ctx.flags.write);
  const check = !!(ctx.flags && ctx.flags.check);
  const force = !!(ctx.flags && ctx.flags.force);

  if (write && check) {
    process.exitCode = 1;
    return fail(json, 'summary', '--write와 --check는 함께 쓸 수 없음', {
      cause: '--check는 mutation 없이 검사만 하고 --write는 파일을 고치므로 동시에 성립하지 않음',
      retry: '검사만 하려면 `--check`, 갱신하려면 `--write` 중 하나만 지정',
      alternatives: ['플래그 없이 실행하면 렌더 결과를 stdout으로만 내보낸다 — 파일은 건드리지 않는다'],
      safeDefault: '원장 파일은 하나도 바뀌지 않는다',
    });
  }

  const tasks = await collectTasks(ctx.targetDir);
  const files = renderAll(tasks);

  if (!write && !check) {
    if (json) {
      emitObservation(buildEnvelope({
        command: 'summary',
        status: 'success',
        summary: `${tasks.length}개 task`,
        artifacts: [...files.keys()],
      }));
    } else {
      process.stdout.write(files.get(SUMMARY_REL));
    }
    return;
  }

  if (check) {
    const stale = [];
    for (const [rel, rendered] of files) {
      const committed = await readTextOrNull(join(ctx.targetDir, rel));
      if (committed !== rendered) stale.push(rel);
    }
    if (stale.length) {
      process.exitCode = 1;
      return fail(json, 'summary', `원장이 task 디렉터리와 어긋남 (${stale.length}개)`, {
        cause: `${stale.join(', ')} 의 내용이 렌더 결과와 다름`,
        retry: '기본 브랜치에서 `harness-team summary --write` 실행 후 커밋',
        alternatives: ['어긋난 내용을 먼저 보려면 플래그 없이 실행해 렌더 결과를 stdout으로 받아 비교한다'],
        safeDefault: '원장은 어긋난 상태 그대로 남는다 — 검사만 했고 아무것도 쓰지 않았다',
      });
    }
    if (json) {
      emitObservation(buildEnvelope({ command: 'summary', status: 'success', summary: '원장이 최신 상태' }));
    } else {
      console.log(`summary: 최신 상태 (${tasks.length}개 task)`);
    }
    return;
  }

  // --write. Guarded to the default branch: writing the shared ledger from a feature
  // branch is exactly the collision this command was built to remove.
  const state = await branchState(ctx.targetDir);
  if (state.kind === 'error' && !force) {
    process.exitCode = 1;
    return fail(json, 'summary', '현재 브랜치를 확인할 수 없어 원장을 쓰지 않음', {
      cause: 'git 저장소로 보이지만 브랜치 조회가 실패함 — feature 브랜치일 수 있고, 그렇다면 병렬 브랜치끼리 충돌이 되살아남',
      retry: 'git 상태를 복구한 뒤 재실행',
      alternatives: ['기본 브랜치임을 확신하면 `--force`로 가드를 무시한다 — 병렬 브랜치 충돌은 사용자 책임이 된다'],
      safeDefault: '원장 파일은 하나도 바뀌지 않는다',
    });
  }
  const bases = await defaultBranchCandidates(ctx.targetDir);
  const offDefault = state.kind === 'branch' && !bases.includes(state.name) && !force;
  if (offDefault && !(await isSyncedWithDefault(ctx.targetDir))) {
    process.exitCode = 1;
    return fail(json, 'summary', `기본 브랜치가 아니라 원장을 쓰지 않음 (현재: ${state.name})`, {
      cause: `공유 원장을 feature 브랜치에서 갱신하면 병렬 브랜치끼리 다시 충돌함 (기본 브랜치: ${bases.join(' 또는 ')})`,
      retry: `\`${bases[0]}\` 로 전환한 뒤 \`harness-team summary --write\` 실행`,
      // 우회 경로는 이 명령의 escape hatch(--force)까지만 안내한다 — 어떻게 반영할지(직접 push냐
      // PR이냐)는 프로젝트 정책이라 범용 CLI가 처방하지 않는다.
      alternatives: ['기본 브랜치로 옮기기 어려운 상황이면 `--force`로 가드를 무시한다 — 반영 경로는 프로젝트의 브랜치 정책을 따를 것'],
      safeDefault: '원장 파일은 하나도 바뀌지 않는다',
    });
  }

  const written = [];
  for (const [rel, rendered] of files) {
    const committed = await readTextOrNull(join(ctx.targetDir, rel));
    if (committed === rendered) continue;
    await writeText(join(ctx.targetDir, rel), rendered);
    written.push(rel);
  }

  if (json) {
    emitObservation(buildEnvelope({
      command: 'summary',
      status: 'success',
      summary: written.length ? `${written.length}개 파일 갱신` : '변경 없음',
      artifacts: written,
    }));
  } else {
    if (!written.length) console.log(`summary: 변경 없음 (${tasks.length}개 task)`);
    for (const rel of written) console.log(`updated: ${rel}`);
  }
}

function fail(json, command, summary, { cause, retry, alternatives = [], safeDefault }) {
  const packet = buildErrorPacket({
    cause, retry, alternatives, safeDefault,
    stop: '원인을 해소하기 전에는 재시도하지 말 것',
  });
  if (json) {
    emitObservation(buildEnvelope({
      command,
      status: 'error',
      summary: `summary 실패: ${summary}`,
      error: packet,
    }));
  } else {
    console.log(`✗ ${command}: ${summary}`);
    for (const line of renderErrorPacket(packet)) console.log(line);
  }
}

export { readTextOrNull };

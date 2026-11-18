// `harness-team clean [<name>] [--base <ref>] [--yes]` — task 하나를 시작 전 상태로 되돌린다.
//
// 상태를 남기지 않는다(`dropped` 같은 status 없음): 코드·문서를 시작점(anchor)으로 되돌리고 활성 포인터를 비우는 것이 전부다.
// 폴더가 사라진 open task 는 원장에서 빠지고 이름도 다시 쓸 수 있다(summary 의 collectTasks, task 의 이름 가드).
//
// 기본은 dry-run 이다. `--yes` 는 되돌릴 수 없는 `reset --hard` 를 부르므로 그 전에 작업 트리 전체(ignored 제외,
// untracked 포함)를 `refs/harness/trash/<user>/<task>/<ts>` 커밋으로 남긴다 — 복구 경로는 그 ref 하나다.
// 원격(push 된 브랜치·MR)에는 쓰지 않는다. 안내만 한다.
import { mkdtemp, rm, rmdir, copyFile, lstat, realpath } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { exists, writeText } from '../fsx.mjs';
import { buildErrorPacket, renderErrorPacket } from '../observation.mjs';
import { readTaskMeta, inferLegacyMeta, readLedger, defaultBranchCandidates } from './summary.mjs';
import { resolveScope } from './review.mjs';
import { readActive, writeActive, resolveUser, repoPrefix, parsePorcelainPaths } from './task.mjs';
import { taskDirRel, taskFilePath, taskDirPath, taskLabel, userHandoffPath } from '../task-paths.mjs';

const pexec = promisify(execFile);
const BIG = 64 * 1024 * 1024;
const LIST_LIMIT = 50;
const UNCHANGED = 'HEAD·작업 트리·ref·.harness/active.json 어느 것도 바뀌지 않는다';

async function git(dir, args, env) {
  const { stdout } = await pexec('git', ['-C', dir, ...args], { maxBuffer: BIG, ...(env ? { env } : {}) });
  return stdout;
}

class Refusal extends Error {
  constructor(summary, packet) { super(summary); this.packet = packet; }
}

function refuse(summary, cause, retry, alternatives = [], safeDefault = UNCHANGED) {
  throw new Refusal(summary, buildErrorPacket({
    cause, retry, alternatives, safeDefault, stop: '시작점·대상이 확실하지 않으면 되돌리지 말 것',
  }));
}

// ref 이름 한 칸. task·user 는 `^[\w.-]+$`·한 세그먼트로 검증돼 오지만 `.` 시작·`..`·`.lock` 은 refname 규칙에 걸린다.
function refSegment(s) {
  return String(s).replace(/[^A-Za-z0-9_-]/g, '-') || 'x';
}

// `:` 는 refname 에 쓸 수 없다 — ISO 시각을 그대로 넣으면 update-ref 가 죽는다. 밀리초까지 넣어 같은 초의 충돌을 피한다.
export function backupRefName(user, task, now = new Date()) {
  const ts = now.toISOString().replace(/[-:]/g, '').replace('.', '');
  return `refs/harness/trash/${refSegment(user)}/${refSegment(task)}/${ts}`;
}

export function renderCleanedHandoff({ task, date, ref }) {
  return `# Session Handoff

## Active Task
없음 — \`.harness/active.json\` 은 \`null\` 이다.
새 작업은 \`harness-team task <name>\` 으로 시작한다.

## Last Cleaned Task (${date})
\`${task}\` — cleaned (백업: \`${ref}\`)
`;
}

async function resolveTarget(ctx) {
  const flags = ctx.flags || {};
  const active = await readActive(ctx.targetDir);
  const name = (ctx.taskArgs || [])[0];
  if (!name) {
    if (!active || !active.task) {
      refuse('대상 task 없음', '인자도 활성 task 도 없음', '`harness-team clean <name>` 으로 대상을 명시해 재실행');
    }
    return { user: active.user, task: active.task, active };
  }
  if (!/^[\w.-]+$/.test(name) || name === '.' || name === '..') {
    refuse('잘못된 task 이름', `task 이름 "${name}" 이 규칙(영숫자·_·.·-, \`.\`·\`..\` 제외)에 맞지 않음`, '`harness-team list` 로 이름을 확인해 재실행');
  }
  if (!flags.member && active && active.task === name && active.user) return { user: active.user, task: name, active };
  const { user, error } = await resolveUser(ctx.targetDir, flags);
  if (error) refuse('user 가 docs/<user>/ 경로 규칙 위반', error, '`--member <이름>` 으로 명시해 재실행');
  return { user, task: name, active };
}

async function resolveAnchor(targetDir, meta, base) {
  if (base) {
    const r = await resolveScope({ targetDir, scope: 'worktree', base });
    if (r.error || !r.mergeBase) {
      refuse('--base 로 시작점을 정하지 못함', r.error || `${base} 와 HEAD 의 merge-base 가 없음`, 'HEAD 와 공통 조상이 있는 `--base <ref>` 로 재실행');
    }
    return { anchor: r.mergeBase, source: `merge-base(${r.base}, HEAD) — --base` };
  }
  if (meta && typeof meta.baseSha === 'string' && meta.baseSha) {
    let ok = false;
    try { await git(targetDir, ['merge-base', '--is-ancestor', meta.baseSha, 'HEAD']); ok = true; } catch { /* 없는 커밋이거나 조상 아님 */ }
    if (!ok) {
      refuse('시작점이 HEAD 의 조상이 아님', `meta.baseSha ${meta.baseSha.slice(0, 12)} 가 HEAD 의 조상이 아님(rebase·다른 브랜치·없는 커밋)`,
        '`harness-team clean <name> --base <ref>` 로 시작점을 명시해 재실행 (예: `--base origin/main`)');
    }
    return { anchor: meta.baseSha, source: 'meta.baseSha — task 생성 시점' };
  }
  const r = await resolveScope({ targetDir, scope: 'worktree' });
  if (r.error || !r.mergeBase) {
    refuse('시작점을 정하지 못함', `meta.baseSha 가 없고(구 task) 기본 브랜치와의 merge-base 도 없음${r.degraded ? ` — ${r.degraded}` : ''}`,
      '`harness-team clean <name> --base <ref>` 로 시작점을 명시해 재실행');
  }
  return { anchor: r.mergeBase, source: `merge-base(${r.base}, HEAD) — baseSha 없는 구 task` };
}

// anchor 이후 바뀐 경로(커밋 범위 + 미커밋 + untracked + 플래그로 가려진 경로) 중 **다른 task 폴더**에 속한 것. 저장소 루트 기준이다.
// task 폴더는 저장소 전체에서 찾는다 — reset·정리는 저장소 전체에 걸리므로 targetDir 의 docs 만 보면 다른 하네스 루트
// (모노레포의 `pkg/docs/…`)를 놓친다(codex 2·3차 P2). `<…>/docs/<u>/<t>/<t>-spec.md` 가 인덱스·시작점·바뀐 경로 어디에든
// 있으면 그 폴더 전체가 보호 대상이다.
const SPEC_PATH = /^((?:.*\/)?docs\/[^/]+\/([^/]+))\/\2-spec\.md$/;
const TASK_FILE = /^((?:.*\/)?docs\/[^/]+\/([^/]+))\/\2-(spec|plan|handoff|artifact|meta|diagram)\.(md|json|html)$/;

async function otherTaskPaths(targetDir, user, task, paths, anchor) {
  const own = `${await repoPrefix(targetDir)}${taskDirRel(user, task)}`;
  const sources = [
    ...nulList(await git(targetDir, ['ls-files', '-z', '--full-name', '--', ':/'])),
    ...nulList(await git(targetDir, ['ls-tree', '-r', '-z', '--name-only', '--full-tree', anchor])),
    ...paths,
  ];
  const dirs = new Set();
  for (const p of sources) {
    const m = SPEC_PATH.exec(p);
    if (m && m[1] !== own) dirs.add(`${m[1]}/`);
  }
  return paths.filter(p => {
    for (const d of dirs) if (p.startsWith(d)) return true;
    const m = TASK_FILE.exec(p);
    return Boolean(m) && m[1] !== own;
  });
}

// assume-unchanged(소문자 태그)·skip-worktree(`S`) 플래그가 있고 디스크에 있는 경로. 저장소 루트 기준이다.
// 이 경로의 로컬 수정은 `status`·`add -A` 에 보이지 않는다.
async function flaggedPaths(top, env) {
  const out = [];
  for (const entry of nulList(await git(top, ['ls-files', '-v', '-z'], env))) {
    const tag = entry[0];
    const path = entry.slice(2);
    if ((/[a-z]/.test(tag) || tag === 'S') && await pathExists(join(top, path))) out.push(path);
  }
  return out;
}

function listLines(lines) {
  const shown = lines.slice(0, LIST_LIMIT).map(l => `  ${l}`);
  if (lines.length > LIST_LIMIT) shown.push(`  … ${lines.length - LIST_LIMIT}개 더`);
  return shown;
}

// `git status --porcelain -z` 에서 untracked(`??`, ignored 제외) 경로만. 저장소 루트 기준이다.
// rename/copy 항목은 다음 필드가 원본 경로라 건너뛴다.
function untrackedPaths(stdout) {
  const fields = stdout.split('\0');
  const out = [];
  for (let i = 0; i < fields.length; i++) {
    const entry = fields[i];
    if (entry.length < 4) continue;
    const xy = entry.slice(0, 2);
    if (xy === '??') out.push(entry.slice(3));
    else if (/[RC]/.test(xy)) i++;
  }
  return out;
}

const nulList = stdout => stdout.split('\0').filter(Boolean);

// 깨진 symlink 도 "있다"로 친다.
const pathExists = p => lstat(p).then(() => true, () => false);

async function anchorIsFile(targetDir, anchor, path) {
  try { return (await git(targetDir, ['cat-file', '-t', `${anchor}:${path}`])).trim() === 'blob'; } catch { return false; }
}

// 백업은 stash 와 같은 모양이다 — 첫 부모 HEAD, 둘째 부모 **실제 인덱스** 커밋, 트리 = 작업 트리.
// 인덱스를 HEAD 에서 다시 만들면 `git add -f` 한 ignored 파일과 스테이지에만 있던 내용이 빠진다(codex P1).
// 시작점이 추적하는 경로에 지금 untracked(ignored 포함) 파일이 있으면 reset --hard 가 덮어쓰므로 그것도 강제로 담는다.
async function snapshot(targetDir, user, task, ref, anchor) {
  let indexTree;
  try { indexTree = (await git(targetDir, ['write-tree'])).trim(); } catch {
    refuse('인덱스에 충돌이 남아 있음', 'merge·rebase 충돌이 해소되지 않아 인덱스를 백업할 수 없음', '충돌을 해소하거나 merge/rebase 를 중단한 뒤 재실행');
  }
  const label = taskLabel(user, task);
  const indexCommit = (await git(targetDir, ['commit-tree', indexTree, '-p', 'HEAD', '-m', `harness clean backup (index): ${label}`])).trim();

  const tmp = await mkdtemp(join(tmpdir(), 'harness-clean-'));
  try {
    const realIndex = resolve(targetDir, (await git(targetDir, ['rev-parse', '--git-path', 'index'])).trim());
    const env = { ...process.env, GIT_INDEX_FILE: join(tmp, 'index') };
    await copyFile(realIndex, env.GIT_INDEX_FILE);
    const top = (await git(targetDir, ['rev-parse', '--show-toplevel'])).trim();

    // assume-unchanged·skip-worktree 플래그가 있으면 `add -A` 가 로컬 수정을 보지 않는다(codex 2차 P1). 임시 인덱스에서만
    // 푼다 — 디스크에 없는 경로(sparse checkout)는 풀면 삭제로 기록되므로 그대로 둔다. update-index 는 pathspec 이 아니라
    // 파일 경로를 받으므로 저장소 루트에서 부른다.
    const flagged = await flaggedPaths(top, env);
    for (let i = 0; i < flagged.length; i += 200) {
      await git(top, ['update-index', '--no-assume-unchanged', '--no-skip-worktree', '--', ...flagged.slice(i, i + 200)], env);
    }
    await git(targetDir, ['add', '-A', '--', ':/'], env);

    // reset --hard 가 덮어쓸 untracked(ignored 포함) 경로: 시작점이 추적하는 경로 자체와, 그 **조상**이 지금 디렉터리가 아닌
    // 것(파일·symlink — 시작점의 `cache/config.json` 자리에 ignored 파일 `cache`, codex 2차 P1).
    const tracked = new Set(nulList(await git(targetDir, ['ls-files', '-z', '--full-name', '--', ':/'], env)));
    const candidates = new Set();
    for (const p of nulList(await git(targetDir, ['ls-tree', '-r', '-z', '--name-only', '--full-tree', anchor]))) {
      candidates.add(p);
      for (let d = dirname(p); d && d !== '.'; d = dirname(d)) candidates.add(d);
    }
    const overwritten = [];
    for (const p of candidates) {
      if (tracked.has(p)) continue;
      const st = await lstat(join(top, p)).catch(() => null);
      if (!st) continue;
      // 시작점의 디렉터리 자리에 있는 지금의 디렉터리는 그 안의 파일들이 따로 후보가 된다.
      if (st.isDirectory() && !(await anchorIsFile(targetDir, anchor, p))) continue;
      overwritten.push(p);
    }
    for (let i = 0; i < overwritten.length; i += 200) {
      await git(targetDir, ['add', '-f', '--', ...overwritten.slice(i, i + 200).map(p => `:(top,literal)${p}`)], env);
    }

    const tree = (await git(targetDir, ['write-tree'], env)).trim();
    const sha = (await git(targetDir, ['commit-tree', tree, '-p', 'HEAD', '-p', indexCommit, '-m', `harness clean backup: ${label}`])).trim();
    // 빈 old value: 같은 이름의 ref 가 이미 있으면 덮지 않고 실패한다.
    await git(targetDir, ['update-ref', '-m', 'harness clean backup', ref, sha, '']);
    return { sha, top, flagged };
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

// `git clean -fd` 대신 **백업 시점의 untracked 목록**만 지운다. reset 이 `.gitignore` 를 되돌리면 ignored 였던 파일이
// `clean` 대상으로 바뀌는데, 그 파일은 백업에 없다(codex P1). 시작점이 추적하는 경로는 reset 이 이미 썼으므로 남긴다.
async function removeUntracked(targetDir, paths, anchor) {
  const top = (await git(targetDir, ['rev-parse', '--show-toplevel'])).trim();
  const atAnchor = new Set(nulList(await git(targetDir, ['ls-tree', '-r', '-z', '--name-only', '--full-tree', anchor])));
  const realTop = await realpath(top);
  const dirs = new Set();
  for (const p of paths) {
    if (atAnchor.has(p)) continue;
    // 조상 중 하나라도 symlink 로 바뀌었으면(시작점이 `cache` 를 링크로 되돌림) 지우기가 저장소 밖으로 나간다 — 건너뛴다.
    // reset 이 그 자리를 이미 바꿨으므로 원래 파일은 백업에만 있다.
    const parent = dirname(p);
    const real = await realpath(join(top, parent)).catch(() => null);
    if (real !== (parent === '.' ? realTop : join(realTop, parent))) continue;
    await rm(join(top, p), { force: true });
    for (let d = dirname(p); d && d !== '.'; d = dirname(d)) dirs.add(d);
  }
  // 비게 된 디렉터리만 지운다 — 깊은 것부터. 비어 있지 않으면(ignored 파일 등) 그대로 둔다.
  for (const d of [...dirs].sort((a, b) => b.length - a.length)) {
    try { await rmdir(join(top, d)); } catch { /* 비어 있지 않음 */ }
  }
}

export async function runClean(ctx) {
  try {
    await clean(ctx);
  } catch (err) {
    if (!(err instanceof Refusal)) throw err;
    process.exitCode = 1;
    console.log(`✗ clean: ${err.message}`);
    for (const line of renderErrorPacket(err.packet)) console.log(line);
  }
}

async function clean(ctx) {
  const { targetDir } = ctx;
  const flags = ctx.flags || {};

  try { await git(targetDir, ['rev-parse', '--verify', '--quiet', 'HEAD^{commit}']); } catch {
    refuse('git 저장소가 아니거나 커밋이 없음', 'clean 은 git 이력으로 시작점을 되돌린다', 'git 저장소의 task 브랜치에서 재실행');
  }

  const { user, task, active } = await resolveTarget(ctx);
  const label = taskLabel(user, task);
  if (!(await exists(taskFilePath(targetDir, user, task, 'spec.md')))) {
    refuse('task 폴더 없음', `${taskDirRel(user, task)}/ 에 spec 이 없음`, '`harness-team list` 로 이름·member 를 확인해 재실행');
  }
  const meta = await readTaskMeta(targetDir, user, task)
    || await inferLegacyMeta(targetDir, user, task, await readLedger(targetDir));
  if (meta && meta.status === 'done') {
    refuse('done 된 task', `${label} 은 이미 done — clean 은 done 이전 task 만 되돌린다`,
      '머지된 변경을 되돌리려면 `git revert` 로 새 MR 을 만든다', ['로컬 기록만 다시 열려면 `harness-team task <name>` (reopen)']);
  }
  if (meta && meta.reopenedAt && !flags.base) {
    refuse('재개된 task 의 시작점이 모호함', `${label} 은 ${meta.reopenedAt} 에 재개됨 — baseSha 는 이미 머지된 작업보다 앞이다`,
      '`harness-team clean <name> --base <ref>` 로 시작점을 명시해 재실행');
  }

  let branch = null;
  try { branch = (await git(targetDir, ['symbolic-ref', '--quiet', '--short', 'HEAD'])).trim(); } catch { /* detached */ }
  if (!branch) refuse('detached HEAD', '브랜치가 아닌 곳에서는 되돌릴 대상이 불분명함', 'task 브랜치를 체크아웃한 뒤 재실행');
  const defaults = await defaultBranchCandidates(targetDir);
  if (defaults.includes(branch)) {
    refuse('기본 브랜치에서는 실행하지 않음', `현재 브랜치 ${branch} 가 기본 브랜치 후보(${defaults.join(', ')})`,
      'task 브랜치(또는 worktree)에서 재실행', ['기본 브랜치의 작업을 되돌리려면 `git revert` 를 쓴다']);
  }

  const { anchor, source } = await resolveAnchor(targetDir, meta, flags.base);

  const commits = (await git(targetDir, ['log', '--format=%h %s', `${anchor}..HEAD`])).split('\n').filter(Boolean);
  const committedPaths = (await git(targetDir, ['diff', '--name-only', '--no-renames', '-z', anchor, 'HEAD'])).split('\0').filter(Boolean);
  const porcelain = await git(targetDir, ['status', '--porcelain', '-z', '--untracked-files=all']);
  const dirtyPaths = parsePorcelainPaths(porcelain);
  const dirtyLines = (await git(targetDir, ['status', '--short', '--untracked-files=all'])).split('\n').filter(Boolean);

  const repoTop = (await git(targetDir, ['rev-parse', '--show-toplevel'])).trim();
  const hidden = await flaggedPaths(repoTop);
  const foreign = await otherTaskPaths(targetDir, user, task, [...new Set([...committedPaths, ...dirtyPaths, ...hidden])], anchor);
  if (foreign.length) {
    refuse('다른 task 의 변경이 섞여 있음', [`시작점 이후 다른 task 폴더가 바뀜 — 되돌리면 그 작업도 사라진다:`, ...foreign.slice(0, LIST_LIMIT)],
      '다른 task 의 변경을 먼저 분리(다른 브랜치로 옮기기)한 뒤 재실행', ['이 브랜치를 통째로 버리려면 git 으로 직접 정리한다']);
  }

  const anchorShort = (await git(targetDir, ['rev-parse', '--short', anchor])).trim();
  const ref = backupRefName(user, task);
  console.log(`clean${flags.yes ? '' : ' (dry-run)'}: ${label} (브랜치 ${branch})`);
  console.log(`시작점: ${anchorShort} — ${source}`);
  console.log(`버릴 커밋 (${commits.length}):`);
  for (const l of listLines(commits)) console.log(l);
  console.log(`버릴 미커밋·untracked 변경 (${dirtyLines.length}) — task 시작 전부터 있던 변경도 포함된다:`);
  for (const l of listLines(dirtyLines)) console.log(l);
  console.log('gitignore 된 파일은 지우지 않는다(시작점이 추적하던 경로라 reset 이 덮어쓰는 파일만 백업에 담는다).');

  if (!flags.yes) {
    console.log(`backup: --yes 면 ${ref} 에 현재 상태 전체를 남긴 뒤 되돌린다`);
    console.log(`next: 위 목록을 확인한 뒤 \`harness-team clean ${task}${flags.base ? ` --base ${flags.base}` : ''} --yes\``);
    return;
  }

  const { sha: backup, top, flagged } = await snapshot(targetDir, user, task, ref, anchor);
  try {
    // 플래그가 남으면 reset --hard 가 "not uptodate" 로 멈춘다. 그 내용은 이미 백업에 있다.
    for (let i = 0; i < flagged.length; i += 200) {
      await git(top, ['update-index', '--no-assume-unchanged', '--no-skip-worktree', '--', ...flagged.slice(i, i + 200)]);
    }
    await git(targetDir, ['reset', '--hard', anchor]);
    // `git clean` 을 부르지 않는다 — ignored(node_modules·.harness/config.json·.env)는 어떤 경우에도 지우지 않는다.
    await removeUntracked(targetDir, untrackedPaths(porcelain), anchor);
  } catch (err) {
    refuse('되돌리는 중 실패 — 백업은 남아 있음', [`${String(err.stderr || err.message).trim().split('\n').pop()}`, `백업: ${ref} (${backup.slice(0, 12)})`],
      `작업 트리를 확인한 뒤 필요하면 \`git reset --hard '${ref}^' && git restore --source '${ref}' --worktree -- :/\` 로 복구`,
      [], '백업 ref 는 만들어졌고 reset·정리는 중간에 멈췄을 수 있다 — .harness/active.json 은 바뀌지 않았다');
  }

  if (active && active.user === user && active.task === task) {
    await writeActive(targetDir, null);
    // 시작점이 handoff 자리를 symlink 로 되돌렸으면 쓰기가 링크를 따라 저장소 밖을 덮는다(codex 3차 P1) — 쓰지 않는다.
    const handoff = userHandoffPath(targetDir, user);
    const st = await lstat(handoff).catch(() => null);
    if (st && st.isSymbolicLink()) console.log(`note: ${handoff} 가 symlink 라 handoff 를 쓰지 않았다`);
    else await writeText(handoff, renderCleanedHandoff({ task, date: new Date().toISOString().slice(0, 10), ref }));
  }

  console.log(`cleaned: ${label} → ${anchorShort}`);
  console.log(`backup: ${ref} (${backup.slice(0, 12)})`);
  if (await exists(taskDirPath(targetDir, user, task))) {
    console.log(`note: 시작점에 ${taskDirRel(user, task)}/ 가 이미 있어 남았다(--base·merge-base 폴백)`);
  }
  console.log(`restore: git reset --hard '${ref}^' && git restore --source '${ref}' --worktree -- :/ && harness-team task ${task}`);
  console.log(`  스테이지 상태까지: git restore --source '${ref}^2' --staged -- :/`);
  console.log('backups: git for-each-ref refs/harness/trash   (지우기: git update-ref -d <ref>)');
  let upstream = null;
  try { upstream = (await git(targetDir, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])).trim(); } catch { /* upstream 없음 */ }
  if (upstream) {
    const remote = upstream.split('/')[0];
    console.log(`remote: ${upstream} 은 그대로다(clean 은 원격에 쓰지 않는다). 직접 정리:`);
    console.log(`  MR/PR 을 닫고 원격 브랜치 삭제 → git push ${remote} --delete ${branch}`);
    console.log(`  또는 이 브랜치로 계속하려면 → git push --force-with-lease`);
  }
}

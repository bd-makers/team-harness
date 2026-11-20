// `harness-team pr-check` — read-only. 하네스가 강제하는 유일한 것(D11)을 판정한다: 이 브랜치가 PR로 담을
// task 마다 spec·plan·artifact 가 템플릿이 아닌 채로 있는가. 다이어그램은 권장이라(2026-10-06 결정)
// 없으면 막지 않고 안내(notes)만 낸다. pre-push 에서는 plan 이 전부 체크된 task 에 done 가드를 더한다(done-derive R7,
// `applyDoneGuard` 참고) — 머지가 곧 종결이라 가드가 머지 전에 돌아야 한다.
//
// 호출처는 셋이다(docs/harness-cycle.md §4-6): ship 준비 보고, init 이 설치하는 git pre-push 훅, 원하는 팀의 CI.
// 셋이 같은 판정을 보도록 두 가지를 고정한다.
// - 대상 task 는 `.harness/active.json` 이 아니라 `base...rev` diff 가 건드린 task 디렉터리다. active.json 은
//   gitignore 라 CI·다른 clone 에는 없다.
// - 내용은 작업 트리가 아니라 rev 의 git 객체에서 읽는다. push·CI 가 보는 것은 커밋이다.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolveScope } from './review.mjs';
import { taskSpecTemplate, taskPlanTemplate, taskArtifactTemplate, repoPrefix, reviewGateStep, collectDoneIssues } from './task.mjs';
import { closureFromContent, forcedIsValid } from '../task-closure.mjs';
import { DIAGRAM_SKIPPED_PREFIX, svgSelfContainmentViolations } from './diagram.mjs';
import { DOCS_DIR, taskFileRel, taskLabel, diagramKind } from '../task-paths.mjs';
import { DIAGRAM_VIEWS } from '../cli-args.mjs';
import { buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../observation.mjs';

const pexec = promisify(execFile);

// env 는 호출 하나에만 준다 — 기본값(undefined)은 process.env 그대로다.
const git = async (targetDir, args, env) =>
  (await pexec('git', ['-C', targetDir, '-c', 'core.quotepath=false', ...args], { maxBuffer: 16 * 1024 * 1024, env })).stdout;

// `rev:./path` 는 -C 디렉터리 기준이다 — targetDir 가 저장소 하위 디렉터리여도 docs/ 를 그 기준으로 찾는다.
async function showAt(targetDir, rev, rel) {
  try { return await git(targetDir, ['show', `${rev}:./${rel}`]); } catch { return null; }
}

const DOCS = [
  { kind: 'spec.md', template: taskSpecTemplate, hint: '요구사항·Ambiguity 자가진단을 채워 커밋' },
  { kind: 'plan.md', template: taskPlanTemplate, hint: '목표·단계를 채워 커밋' },
  { kind: 'artifact.md', template: taskArtifactTemplate, hint: '결과·검증 증거를 채워 커밋' },
];

// 새 plan 은 검토 게이트 줄(human-review-gate)을 품고 생긴다. 빈 문서·템플릿 판정은 그 줄을 — 켠 것까지 — 뺀 본문으로 한다.
// 그러지 않으면 손대지 않은 plan, 게이트만 켠 plan, 게이트 줄만 남은 plan 이 "채워진 문서"로 통과한다.
function judgedBody(doc, content, user) {
  if (doc.kind !== 'plan.md') return content;
  const gate = [reviewGateStep(user), reviewGateStep(user).replace('- [ ]', '- [x]')];
  return content.split('\n').filter(line => !gate.includes(line)).join('\n');
}

const TASK_MARKER_KINDS = ['spec.md', 'plan.md', 'handoff.md', 'artifact.md', 'meta.json'];

// diff 가 건드린 `docs/<user>/<task>/…` 중 rev 에 `<task>-<kind>` 이름의 task 문서가 하나라도 있는 것.
// spec 만 마커로 쓰면 spec 이 빠진 task 가 통째로 검사에서 빠진다(codex P2) — 디렉터리 이름을 접두로 가진 파일은
// task 의 흔적이고, `docs/superpowers/plans/x.md` 같은 비-task 디렉터리는 그런 파일이 없어 걸리지 않는다.
// 디렉터리를 통째로 지운 변경(rev 에 아무 문서도 없음)은 의도된 삭제라 대상이 아니다.
// 사용자 handoff(`docs/<user>/<user>-handoff.md`)는 깊이가 2라 여기에 걸리지 않는다.
async function changedTaskRefs(targetDir, rev, paths) {
  const seen = new Map();
  for (const p of paths) {
    const parts = p.split('/');
    if (parts.length < 4 || parts[0] !== DOCS_DIR) continue;
    const [, user, task] = parts;
    seen.set(taskLabel(user, task), { user, task });
  }
  const refs = [];
  for (const ref of seen.values()) {
    for (const kind of TASK_MARKER_KINDS) {
      if ((await showAt(targetDir, rev, taskFileRel(ref.user, ref.task, kind))) !== null) { refs.push(ref); break; }
    }
  }
  return refs.sort((a, b) => taskLabel(a.user, a.task).localeCompare(taskLabel(b.user, b.task)));
}

// rev 에 있는 다이어그램 파일 — 레거시 HTML 과 뷰 SVG(`<task>-diagram-<view>.svg`). 권장 판정과 PR 링크 안내가 같은 목록을 쓴다.
async function diagramsAt(targetDir, rev, user, task) {
  const present = [];
  for (const view of [null, ...DIAGRAM_VIEWS]) {
    const rel = taskFileRel(user, task, diagramKind(view));
    const content = await showAt(targetDir, rev, rel);
    if (content !== null) present.push({ view, rel, content });
  }
  return present;
}

async function taskFindings(targetDir, rev, { user, task }) {
  const issues = [];
  const notes = [];
  let artifact = null;
  for (const doc of DOCS) {
    const rel = taskFileRel(user, task, doc.kind);
    const content = await showAt(targetDir, rev, rel);
    // 빈 문서(0바이트·공백뿐)는 템플릿과 달라 통과했다 — 미완 plan 이 0바이트로 커밋된 실례(bb93755, task empty-doc-guard).
    const body = content === null ? null : judgedBody(doc, content, user).trim();
    if (body === null) issues.push(`${rel} 없음 — ${doc.hint}`);
    else if (!body) issues.push(`${rel} 가 비어 있음 — ${doc.hint}`);
    else if (body === doc.template(task).trim()) issues.push(`${rel} 가 템플릿 그대로 — ${doc.hint}`);
    if (doc.kind === 'artifact.md') artifact = content;
  }
  const diagramRel = taskFileRel(user, task, diagramKind());
  const skipped = (artifact ?? '').split('\n').some(line => line.startsWith(DIAGRAM_SKIPPED_PREFIX) && line.length > DIAGRAM_SKIPPED_PREFIX.length);
  const diagrams = await diagramsAt(targetDir, rev, user, task);
  // 레거시 파일이나 뷰 SVG 중 하나라도 있으면 다이어그램이 있는 것이다.
  if (!skipped && !diagrams.length) {
    notes.push(`권장: 다이어그램 없음 — 로직·구조 변화가 있으면 /harness-diagram 으로 ${diagramRel}(또는 뷰별 ${task}-diagram-<view>.svg) 을 만들어 커밋`);
  }
  // 뷰 SVG 는 PR 리뷰어가 이미지로 볼 수 있다 — 본문에 걸 경로를 알린다(막지 않음, diagram-svg). 레거시 HTML 은 forge 가 소스로
  // 보이므로 안내하지 않는다. 경로는 저장소 **루트** 기준이다(모노레포 하위 설치 — codex 1차 P2) — forge URL 로 바꾸는 것은
  // ship 6단계의 몫이다. 커밋된 SVG 가 자립성 검사에 걸리면 링크하지 않고 그 사실을 알린다(codex 1차 P2 — 깨진 그림을 걸지 않는다).
  const prefix = diagrams.some(d => d.view) ? await repoPrefix(targetDir) : '';
  for (const d of diagrams) {
    if (!d.view) continue;
    const violations = svgSelfContainmentViolations(d.content);
    notes.push(violations.length
      ? `뷰 SVG 가 자립형이 아님 — 링크하지 않음: ${prefix}${d.rel} (${violations[0]}${violations.length > 1 ? ` 외 ${violations.length - 1}` : ''}; \`harness-team diagram record --view ${d.view}\` 로 확인)`
      : `PR 본문에 링크: ${prefix}${d.rel}`);
  }
  return { issues, notes };
}

// 순수 판정. `empty` = diff 가 비었다(새 브랜치를 커밋 전에 push) — 담을 변경이 없으므로 통과다.
export async function collectPrCheck({ targetDir, base, rev = 'HEAD' }) {
  const paths = (await git(targetDir, ['diff', '--name-only', '--relative', `${base}...${rev}`])).split('\n').filter(Boolean);
  if (!paths.length) return { empty: true, tasks: [] };
  const refs = await changedTaskRefs(targetDir, rev, paths);
  const tasks = [];
  for (const ref of refs) tasks.push({ ...ref, ...(await taskFindings(targetDir, rev, ref)) });
  return { empty: false, tasks };
}

// done 가드(done-derive R7) — plan 이 전부 체크된 변경 task 는 머지되는 순간 종결이다. 체크박스만 켜고 `done` 을 건너뛰는
// 경로를 pre-push 에서 막는다. 가드(`collectDoneIssues`)는 작업 트리·`git log` 를 읽으므로 push 되는 sha 가 HEAD 이고
// 작업 트리가 깨끗할 때만 돌린다 — 그 밖(다른 브랜치 push·미정리 트리)과 CI 는 종전대로 문서만 본다(가드를 rev 기준으로
// 리팩터하지 않는다). 유효한 우회 기록(`forcedAt` > `reopenedAt`)이 있으면 issue 를 경고로만 낸다.
// plan 에 미완 단계가 남은 task(진행 중·다중 MR)는 대상이 아니다.
const GUARD_PREFIX = 'done 가드 — ';
const GUARD_NEXT = '`harness-team done` 으로 확인해 고친 뒤 커밋하고 다시 push 하거나, 의도한 우회면 `done --force` 기록을 커밋';
async function applyDoneGuard(targetDir, rev, t, canRun) {
  const plan = await showAt(targetDir, rev, taskFileRel(t.user, t.task, 'plan.md'));
  if (!closureFromContent({ plan, meta: null }).closed) return;
  if (!canRun) {
    t.notes.push('done 가드 건너뜀 — plan 이 전부 체크됐지만 push 되는 커밋이 HEAD 이고 작업 트리가 깨끗할 때만 돈다');
    return;
  }
  let meta = null;
  try { meta = JSON.parse(await showAt(targetDir, rev, taskFileRel(t.user, t.task, 'meta.json'))); } catch { /* 없음·깨짐 */ }
  const { issues } = await collectDoneIssues(targetDir, { user: t.user, task: t.task });
  if (!issues.length) return;
  if (forcedIsValid(meta)) {
    for (const issue of issues) t.notes.push(`경고: done 가드 — ${issue} (우회 기록 forcedAt ${meta.forcedAt})`);
    return;
  }
  t.guardFailed = true;
  for (const issue of issues) t.issues.push(`${GUARD_PREFIX}${issue}`);
}

// pre-push 가드 실행 조건: HEAD sha 와 작업 트리 상태(untracked 포함, ignored 제외). 어떤 실패도 "돌리지 않음"이다.
async function headIfClean(targetDir) {
  try {
    if ((await git(targetDir, ['status', '--porcelain'])).trim()) return null;
    return (await git(targetDir, ['rev-parse', 'HEAD'])).trim();
  } catch { return null; }
}

export const passed = result => result.empty || (result.tasks.length > 0 && result.tasks.every(t => !t.issues.length));

const NO_TASK = `이 브랜치의 변경에 task 문서(${DOCS_DIR}/<user>/<task>/)가 없음 — \`harness-team task <name>\` 으로 task 를 만들고 문서를 커밋`;

function renderResult(label, result) {
  const lines = [];
  if (result.empty) return [`✓ pr-check ${label}: base 대비 변경 없음`];
  if (!result.tasks.length) return [`✗ pr-check ${label}: ${NO_TASK}`];
  for (const t of result.tasks) {
    lines.push(`${t.issues.length ? '✗' : '✓'} pr-check ${label}: ${taskLabel(t.user, t.task)}`);
    for (const issue of t.issues) lines.push(`  - ${issue}`);
    for (const note of t.notes) lines.push(`  · ${note}`);
  }
  return lines;
}

function toJsonTasks(result) {
  return result.tasks.map(t => ({ task: taskLabel(t.user, t.task), issues: t.issues, notes: t.notes }));
}

// 기본 브랜치 이름 — base 사다리가 준 ref 에서 얻는다(`refs/remotes/origin/main` → `main`, 로컬 `main` → `main`).
export function branchName(ref) {
  return ref.replace(/^refs\/remotes\/[^/]+\//, '').replace(/^refs\/heads\//, '');
}

// git 이 pre-push 훅의 stdin 으로 주는 `<local ref> <local sha> <remote ref> <remote sha>` 줄 중 검사할 것.
// 삭제(local sha 가 0)·브랜치가 아닌 ref(태그 등)·기본 브랜치로의 push 는 PR 이 아니므로 건너뛴다.
export function prePushTargets(stdin, defaultBranch) {
  const targets = [];
  for (const line of stdin.split('\n')) {
    const [localRef, localSha, remoteRef] = line.trim().split(/\s+/);
    if (!localSha || !remoteRef) continue;
    if (/^0+$/.test(localSha)) continue;
    if (!remoteRef.startsWith('refs/heads/')) continue;
    if (defaultBranch && remoteRef === `refs/heads/${defaultBranch}`) continue;
    targets.push({ localRef, rev: localSha, remoteRef });
  }
  return targets;
}

async function readAllStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

// base 오류 retry 는 원인 종류(`resolveScope` 의 errorKind)로 고른다. 한 문장일 때는 없는 `--base`·git 저장소 아님·merge-base 없음에도
// set-head 를 권했다 — set-head 는 기본 base 를 못 찾았을 때만 고친다(followups 21). pr-check 는 diff scope 고정이라 worktree 대안은 없다.
// 모르는 종류는 'default-base' 문장으로 떨어진다.
const BASE_ERROR_RETRY = {
  'base-missing': '존재하는 `--base <ref>` 로 기준을 직접 주고 다시 실행',
  'default-base': '`--base <ref>` 로 기준을 직접 주거나 `git remote set-head origin -a` 로 origin/HEAD 를 설정',
  'not-git': 'git 저장소 안에서 실행하거나 `--target <저장소 경로>` 로 저장소를 가리켜 다시 실행',
  'diff-failed': 'HEAD 와 공통 조상이 있는 `--base <ref>` 를 주고 다시 실행(`git merge-base <ref> HEAD` 로 확인)',
};

// 훅은 `--base` 없이 부르므로 base 를 주라는 안내는 소용없다 — 훅이 닿는 두 종류만 덮는다. diff-failed 는 gh-pages 같은 orphan 브랜치나
// 커밋 없는 HEAD 를 체크아웃한 채 push 할 때 온다(base 판정은 push 되는 sha 가 아니라 HEAD 로 한다). 없는 `--base` 는 수동
// `--pre-push --base` 에서만, git 저장소 아님은 훅이 설치되지 않는 bare 저장소에서만 닿아 위 문장을 그대로 쓴다.
const PRE_PUSH_BASE_ERROR_RETRY = {
  ...BASE_ERROR_RETRY,
  'default-base': '`git remote set-head origin -a` 로 origin/HEAD 를 설정한 뒤 다시 push',
  'diff-failed': '기본 브랜치와 공통 조상이 있는 브랜치를 체크아웃한 뒤 다시 push — 훅은 체크아웃된 HEAD 로 base 를 판정한다(`git merge-base <기본 브랜치> HEAD` 로 확인)',
};

function emitBaseError(json, error, errorKind, prePush) {
  const retries = prePush ? PRE_PUSH_BASE_ERROR_RETRY : BASE_ERROR_RETRY;
  const packet = buildErrorPacket({
    cause: error,
    retry: retries[errorKind] ?? retries['default-base'],
    alternatives: prePush ? ['검사 없이 push 하려면 `git push --no-verify` (git 표준 우회)'] : [],
    safeDefault: '아무것도 바뀌지 않았다 — 이 명령은 판정만 한다',
    stop: '판정하지 못한 base 로 통과시키지 않는다 — 하네스가 강제하는 유일한 검사다(D11)',
  });
  process.exitCode = 1;
  if (json) emitObservation(buildEnvelope({ command: 'pr-check', status: 'error', summary: error, error: packet }));
  else {
    console.log(`✗ pr-check: ${error}`);
    for (const line of renderErrorPacket(packet)) console.log(line);
  }
}

// 첫 push 처럼 origin 에 브랜치가 하나도 없으면 비교할 기본 브랜치가 없다 — PR 이 열릴 수 없는 상태라 통과다.
// `git remote set-head origin -a` 도 빈 원격에서는 실패해 차단하면 `--no-verify` 외에 길이 없었다(리뷰 2026-10-06).
async function originIsEmpty(targetDir) {
  try {
    if (!(await git(targetDir, ['remote'])).split('\n').includes('origin')) return false;
    return !(await git(targetDir, ['for-each-ref', '--count=1', 'refs/remotes/origin'])).trim();
  } catch { return false; }
}

// `--base origin/main` 처럼 짧은 이름이 오면 `branchName` 이 접두를 못 떼어 기본 브랜치 push 를 검사했다 — 전체 ref 로 푼다.
async function fullRefName(targetDir, ref) {
  try { return (await git(targetDir, ['rev-parse', '--symbolic-full-name', ref])).trim() || ref; } catch { return ref; }
}

// 기본 브랜치와 공통 조상이 없는 브랜치(gh-pages 등)는 그 기본 브랜치로 PR 을 열 수 없다(GitHub 은 비교를 거부한다) — D11 의
// 대상이 아니라 기본 브랜치 push 처럼 건너뛴다(followups 23, 방향 A). base 판정은 HEAD 로 하므로 HEAD 가 관련 브랜치면 통과하고,
// 이 sha 의 diff 가 throw 해 스택 트레이스로 죽었다. `git merge-base` 의 exit 1 = 공통 조상 없음일 때만 건너뛴다 — 그 밖의
// 실패(exit 128 등)는 삼키지 않고 종전대로 둔다. gh-pages 를 체크아웃한 채 push 하면 base 판정에서 diff-failed 패킷이 먼저 난다.
async function sharesHistory(targetDir, base, rev) {
  // 판정은 exit code 로 하지만 rethrow 되는 오류의 stderr 는 사람이 읽으므로 C 로케일로 부른다(diff-failed cause 와 같이).
  try { await git(targetDir, ['merge-base', base, rev], { ...process.env, LC_ALL: 'C' }); return true; } catch (err) {
    if (err.code === 1) return false;
    throw err;
  }
}

const listRemotes = async targetDir => (await git(targetDir, ['remote'])).split('\n').map(r => r.trim()).filter(Boolean);

// base 의 원격과 기본 브랜치 이름. git 은 원격 이름에 `/` 를 허용하므로(`team/origin`) 첫 경로 조각이 아니라 가장 긴 원격 이름
// 접두로 고른다 — 첫 조각으로 자르면 `team/origin/main` 이 `origin/main` 브랜치가 되어 기본 브랜치 push 를 검사했다(리뷰 2026-11-20 P3).
// 원격 추적 ref 가 아니거나 원격 목록을 못 읽으면 remote 는 null 이고 branch 는 종전 `branchName` 이다.
async function baseRemoteBranch(targetDir, baseFullRef) {
  let remotes = [];
  try { remotes = await listRemotes(targetDir); } catch { /* 판정 근거 없음 */ }
  const remote = remotes.filter(r => baseFullRef.startsWith(`refs/remotes/${r}/`)).sort((a, b) => b.length - a.length)[0] ?? null;
  return { remote, branch: remote ? baseFullRef.slice(`refs/remotes/${remote}/`.length) : branchName(baseFullRef) };
}

// 기본 브랜치 이름으로의 push 가 base 원격이 아닌 원격(fork 등)으로 가는가 — 그렇다고 **확인될 때만** true 다(task pr-check-fork-main).
// base 원격으로의 기본 브랜치 push 는 base 자체를 올리는 것이라 PR 이 아니지만, fork 의 main 은 PR 원천이다. 원격 정보는 훅이
// git 의 `$1`(원격 이름, 이름 없는 push 면 URL)을 `HARNESS_PUSH_REMOTE` 로 넘긴다 — 플래그는 구버전 CLI 가 exit 1 로 거부해 push 를
// 막으므로 쓰지 않는다. 정보 없음(옛 훅 블록)·base 가 로컬 브랜치·어떤 원격으로도 안 풀리는 URL(같은 저장소의 다른 표기일 수 있다)은
// 판정 근거가 없어 종전대로 건너뛴다. 로컬 git 명령만 쓴다 — pre-push 는 네트워크 없이 끝나야 한다.
async function pushGoesElsewhere(targetDir, baseRemote, pushRemote) {
  if (!pushRemote || !baseRemote) return false;
  try {
    const remotes = await listRemotes(targetDir);
    let resolved = remotes.includes(pushRemote) ? pushRemote : null;
    for (const r of remotes) {
      if (resolved) break;
      const urls = `${await git(targetDir, ['remote', 'get-url', '--all', r])}\n${await git(targetDir, ['remote', 'get-url', '--push', '--all', r])}`;
      if (urls.split('\n').some(u => u.trim() === pushRemote)) resolved = r;
    }
    return !!resolved && resolved !== baseRemote;
  } catch { return false; }
}

function emitQuietPass(json) {
  if (json) emitObservation(buildEnvelope({ command: 'pr-check', status: 'success', summary: 'pre-push: 검사할 브랜치 push 없음', extra: { base: null, checks: [] } }));
}

export async function runPrCheck(ctx, { readStdin = readAllStdin, pushRemote = process.env.HARNESS_PUSH_REMOTE } = {}) {
  const json = !!(ctx.flags && ctx.flags.json);
  const prePush = !!(ctx.flags && ctx.flags['pre-push']);

  // pre-push 는 git 이 준 ref 목록이 먼저다 — 삭제·태그만 push 하거나 push 할 것이 없으면(git 은 그때도 빈 stdin 으로
  // 훅을 부른다) base 를 판정할 필요도 없다. 훅 블록이 stdin 을 먼저 받아 두므로 빈 입력은 "push 할 것 없음" 뿐이다.
  const pushes = prePush ? prePushTargets(await readStdin(), null) : [];
  if (prePush && !pushes.length) { emitQuietPass(json); return; }

  // 사다리는 review·scope 와 같은 것을 쓴다. scope 'diff' 는 작업 트리 상태 분기를 타지 않는다.
  const resolved = await resolveScope({ targetDir: ctx.targetDir, scope: 'diff', base: ctx.flags.base });
  if (resolved.error) {
    if (prePush && (await originIsEmpty(ctx.targetDir))) { emitQuietPass(json); return; }
    emitBaseError(json, resolved.error, resolved.errorKind, prePush);
    return;
  }
  const base = resolved.base;

  const runs = [];
  if (prePush) {
    const { remote: baseRemote, branch: baseBranch } = await baseRemoteBranch(ctx.targetDir, await fullRefName(ctx.targetDir, base));
    const defaultRef = `refs/heads/${baseBranch}`;
    const skipDefault = !(await pushGoesElsewhere(ctx.targetDir, baseRemote, pushRemote));
    for (const t of pushes) {
      if (skipDefault && t.remoteRef === defaultRef) continue;
      if (!(await sharesHistory(ctx.targetDir, base, t.rev))) continue;
      runs.push({ label: t.remoteRef.replace(/^refs\/heads\//, ''), rev: t.rev });
    }
  } else {
    runs.push({ label: 'HEAD', rev: 'HEAD' });
  }

  const results = [];
  for (const r of runs) results.push({ ...r, result: await collectPrCheck({ targetDir: ctx.targetDir, base, rev: r.rev }) });
  if (prePush) {
    const head = await headIfClean(ctx.targetDir);
    for (const r of results) {
      for (const t of r.result.tasks) await applyDoneGuard(ctx.targetDir, r.rev, t, head !== null && r.rev === head);
    }
  }
  const ok = results.every(r => passed(r.result));
  const guardFailed = results.some(r => r.result.tasks.some(t => t.guardFailed));
  const docsFailed = results.some(r => !r.result.empty
    && (!r.result.tasks.length || r.result.tasks.some(t => t.issues.some(i => !i.startsWith(GUARD_PREFIX)))));
  const failSummary = [docsFailed && 'PR 필수 task 문서가 빠짐', guardFailed && 'plan 이 전부 체크된 task 가 done 가드를 통과하지 못함']
    .filter(Boolean).join(' · ');
  const failActions = [
    ...(docsFailed ? ['빠진 문서를 채워 커밋한 뒤 `harness-team pr-check` 를 다시 실행'] : []),
    ...(guardFailed ? [GUARD_NEXT] : []),
  ];
  if (!ok) process.exitCode = 1;

  if (json) {
    emitObservation(buildEnvelope({
      command: 'pr-check',
      status: ok ? 'success' : 'failure',
      summary: ok ? `PR 필수 task 문서 확인 (base ${base})` : `${failSummary} (base ${base})`,
      nextActions: ok ? [] : failActions,
      extra: { base, checks: results.map(r => ({ ref: r.label, rev: r.rev, empty: r.result.empty, tasks: toJsonTasks(r.result) })) },
    }));
    return;
  }

  if (!results.length) return; // pre-push 가 기본 브랜치만 push — 조용히 통과
  for (const r of results) for (const line of renderResult(r.label, r.result)) console.log(line);
  if (!ok) {
    if (guardFailed) console.log(`→ plan 이 전부 체크된 task 가 done 가드를 통과하지 못했습니다 — ${GUARD_NEXT}.`);
    if (docsFailed) {
      console.log(`→ PR 에 담을 task 문서가 빠졌습니다 (D11, base ${base}).`);
    }
    if (prePush) console.log('→ 검사 없이 push 하려면 `git push --no-verify`');
  }
}

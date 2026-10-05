// `harness-team pr-check` — read-only. 하네스가 강제하는 유일한 것(D11)을 판정한다: 이 브랜치가 PR로 담을
// task 마다 spec·plan·handoff·artifact 가 템플릿이 아닌 채로 있는가. 다이어그램은 권장이라(2026-10-06 결정)
// 없으면 막지 않고 안내(notes)만 낸다.
//
// 호출처는 셋이다(docs/harness-cycle.md §4-6): ship 준비 보고, init 이 설치하는 git pre-push 훅, 원하는 팀의 CI.
// 셋이 같은 판정을 보도록 두 가지를 고정한다.
// - 대상 task 는 `.harness/active.json` 이 아니라 `base...rev` diff 가 건드린 task 디렉터리다. active.json 은
//   gitignore 라 CI·다른 clone 에는 없다.
// - 내용은 작업 트리가 아니라 rev 의 git 객체에서 읽는다. push·CI 가 보는 것은 커밋이다.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolveScope } from './review.mjs';
import { taskSpecTemplate, taskPlanTemplate, taskHandoffTemplate, taskArtifactTemplate } from './task.mjs';
import { DIAGRAM_SKIPPED_PREFIX } from './diagram.mjs';
import { DOCS_DIR, taskFileRel, taskLabel } from '../task-paths.mjs';
import { buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../observation.mjs';

const pexec = promisify(execFile);

const git = async (targetDir, args) =>
  (await pexec('git', ['-C', targetDir, '-c', 'core.quotepath=false', ...args], { maxBuffer: 16 * 1024 * 1024 })).stdout;

// `rev:./path` 는 -C 디렉터리 기준이다 — targetDir 가 저장소 하위 디렉터리여도 docs/ 를 그 기준으로 찾는다.
async function showAt(targetDir, rev, rel) {
  try { return await git(targetDir, ['show', `${rev}:./${rel}`]); } catch { return null; }
}

const DOCS = [
  { kind: 'spec.md', template: taskSpecTemplate, hint: '요구사항·Ambiguity 자가진단을 채워 커밋' },
  { kind: 'plan.md', template: taskPlanTemplate, hint: '목표·단계를 채워 커밋' },
  // post-commit 훅은 커밋 *뒤에* handoff 를 갱신한다 — 커밋 하나뿐인 브랜치에는 템플릿이 담긴다.
  { kind: 'handoff.md', template: taskHandoffTemplate, hint: 'post-commit 훅이 갱신한 handoff 를 다음 커밋에 담기' },
  { kind: 'artifact.md', template: taskArtifactTemplate, hint: '결과·검증 증거를 채워 커밋' },
];

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

async function taskFindings(targetDir, rev, { user, task }) {
  const issues = [];
  const notes = [];
  let artifact = null;
  for (const doc of DOCS) {
    const rel = taskFileRel(user, task, doc.kind);
    const content = await showAt(targetDir, rev, rel);
    if (content === null) issues.push(`${rel} 없음 — ${doc.hint}`);
    else if (content.trim() === doc.template(task).trim()) issues.push(`${rel} 가 템플릿 그대로 — ${doc.hint}`);
    if (doc.kind === 'artifact.md') artifact = content;
  }
  const diagramRel = taskFileRel(user, task, 'diagram.html');
  const skipped = (artifact ?? '').split('\n').some(line => line.startsWith(DIAGRAM_SKIPPED_PREFIX) && line.length > DIAGRAM_SKIPPED_PREFIX.length);
  if (!skipped && (await showAt(targetDir, rev, diagramRel)) === null) {
    notes.push(`권장: 다이어그램 없음 — 로직·구조 변화가 있으면 /harness-diagram 으로 ${diagramRel} 을 만들어 커밋`);
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

function emitBaseError(json, error, prePush) {
  const packet = buildErrorPacket({
    cause: error,
    retry: prePush
      ? '`git remote set-head origin -a` 로 origin/HEAD 를 설정한 뒤 다시 push'
      : '`--base <ref>` 로 기준을 직접 주거나 `git remote set-head origin -a` 로 origin/HEAD 를 설정',
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

function emitQuietPass(json) {
  if (json) emitObservation(buildEnvelope({ command: 'pr-check', status: 'success', summary: 'pre-push: 검사할 브랜치 push 없음', extra: { base: null, checks: [] } }));
}

export async function runPrCheck(ctx, { readStdin = readAllStdin } = {}) {
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
    emitBaseError(json, resolved.error, prePush);
    return;
  }
  const base = resolved.base;

  const runs = [];
  if (prePush) {
    const defaultRef = `refs/heads/${branchName(await fullRefName(ctx.targetDir, base))}`;
    for (const t of pushes) {
      if (t.remoteRef !== defaultRef) runs.push({ label: t.remoteRef.replace(/^refs\/heads\//, ''), rev: t.rev });
    }
  } else {
    runs.push({ label: 'HEAD', rev: 'HEAD' });
  }

  const results = [];
  for (const r of runs) results.push({ ...r, result: await collectPrCheck({ targetDir: ctx.targetDir, base, rev: r.rev }) });
  const ok = results.every(r => passed(r.result));
  if (!ok) process.exitCode = 1;

  if (json) {
    emitObservation(buildEnvelope({
      command: 'pr-check',
      status: ok ? 'success' : 'failure',
      summary: ok ? `PR 필수 task 문서 확인 (base ${base})` : `PR 필수 task 문서가 빠짐 (base ${base})`,
      nextActions: ok ? [] : ['빠진 문서를 채워 커밋한 뒤 `harness-team pr-check` 를 다시 실행'],
      extra: { base, checks: results.map(r => ({ ref: r.label, rev: r.rev, empty: r.result.empty, tasks: toJsonTasks(r.result) })) },
    }));
    return;
  }

  if (!results.length) return; // pre-push 가 기본 브랜치만 push — 조용히 통과
  for (const r of results) for (const line of renderResult(r.label, r.result)) console.log(line);
  if (!ok) {
    console.log(`→ PR 에 담을 task 문서가 빠졌습니다 (D11, base ${base}).`);
    if (prePush) console.log('→ 검사 없이 push 하려면 `git push --no-verify`');
  }
}

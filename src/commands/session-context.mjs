import { join } from 'node:path';
import { readdir, readFile, stat } from 'node:fs/promises';
import { exists } from '../fsx.mjs';
import { readActive, planHasOpenBoxes } from './task.mjs';
import { readTaskMeta } from './summary.mjs';
import { contextCardPath, validateContextCard } from './context.mjs';
import { evaluateObserveVerdict } from './observe.mjs';
import { checkDoneOnMain, renderDoneOnMainNudge } from './remote-task.mjs';

// "task-gate가 있다"의 단일 정의 — migrate(보강)와 doctor(감지)가 공유.
// .claude/settings.json의 SessionStart hook 중 `session-context`를 호출하는 항목이 있으면 true.
export function settingsHasSessionGate(settings) {
  return (settings?.hooks?.SessionStart || []).some(group =>
    (group.hooks || []).some(h => typeof h.command === 'string' && h.command.includes('session-context')));
}

// "활성 task 없음" nudge는 task마다 한 줄을 찍는 유일한 무제한 주입 경로다 — SessionStart 출력을
// lean하게 유지하기 위해 상한을 두고, 전체 목록은 `harness-team list`로 안내한다.
export const SESSION_CONTEXT_MAX_TASKS = 8;

// 재개 가능 = 완료되지 않았고(meta.status) plan.md에 열린 체크박스가 남은 task.
// (marker: <name>-spec.md, `list`와 동일 규약)
// 최신 활동(plan.md mtime) 내림차순, 동률이면 user/name 오름차순으로 정렬해 반환한다.
export async function listIncompleteTasks(targetDir) {
  const docs = join(targetDir, 'docs');
  if (!(await exists(docs))) return [];
  const out = [];
  for (const ue of await readdir(docs, { withFileTypes: true })) {
    if (!ue.isDirectory()) continue;
    const user = ue.name;
    const userPath = join(docs, user);
    for (const te of await readdir(userPath, { withFileTypes: true })) {
      if (!te.isDirectory()) continue;
      const name = te.name;
      if (!(await exists(join(userPath, name, `${name}-spec.md`)))) continue;
      // 후보 판정의 정본은 meta.status다. 열린 체크박스만 보면 `done --force`로 닫았거나
      // 다이어그램 옵트인 규약대로 미실행 단계를 열어 둔 채 닫은 task가 영구히 후보로 뜬다.
      // meta가 없거나 읽히지 않으면(구 task) 완료 여부를 알 수 없으므로 잘라내지 않는다.
      const meta = await readTaskMeta(targetDir, user, name);
      if (meta && meta.status === 'done') continue;
      const planPath = join(userPath, name, `${name}-plan.md`);
      // 스캔 중 task가 이동·삭제될 수 있다 — readFile·stat 어느 쪽이 실패해도 그 task만 건너뛴다.
      let plan, mtimeMs;
      try {
        plan = await readFile(planPath, 'utf8');
        ({ mtimeMs } = await stat(planPath));
      } catch { continue; }
      if (!planHasOpenBoxes(plan)) continue;
      out.push({ user, name, mtimeMs });
    }
  }
  out.sort((a, b) => b.mtimeMs - a.mtimeMs
    || (a.user < b.user ? -1 : a.user > b.user ? 1 : 0)
    || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return out;
}

// The task-gate half of the SessionStart injection (active-task breadcrumb + card, or the
// "no active task" nudge). Untouched by observe surfacing — see buildSessionContext below.
async function buildTaskGateContext(targetDir, { doneOnMain = checkDoneOnMain } = {}) {
  const active = await readActive(targetDir);
  if (active && active.task) {
    // 원격 done 감지(done-on-main-nudge): 이 task가 origin/<default>에서 이미 종결됐으면 breadcrumb·TCC 대신
    // nudge만 낸다 — 재개 여부가 먼저다. 판정은 fetch 없이 로컬 ref 기준이고, 어떤 실패도 기존 경로로 떨어진다
    // (SessionStart 출력은 판정 때문에 깨지지 않는다 — observe 표면화와 같은 계약).
    let verdict = null;
    try { verdict = await doneOnMain(targetDir, active.user, active.task); } catch { verdict = null; }
    if (verdict) {
      return [
        renderDoneOnMainNudge({ user: active.user, task: active.task, ...verdict }),
        `next-action: AskUserQuestion — 재개(main을 가져온 뒤 harness-team task ${active.task}) / 폐기(harness-team list 로 다른 task 선택)`,
      ].join('\n');
    }
    const breadcrumb = `[harness] 활성 task: ${active.user}/${active.task} — 세션 시작 프로토콜대로 ${active.task}-plan.md 확인.`;
    const path = contextCardPath(targetDir, active);
    if (!(await exists(path))) {
      return [
        breadcrumb,
        '[harness] Context Card가 없습니다.',
        'next-action: harness-team context init',
      ].join('\n');
    }

    let card;
    try {
      card = await readFile(path, 'utf8');
    } catch {
      return [
        breadcrumb,
        `[harness] Context Card를 읽을 수 없습니다: ${active.user}/${active.task}.`,
        'next-action: harness-team context check',
      ].join('\n');
    }

    const validation = validateContextCard(card, active.task);
    if (!validation.valid) {
      const lines = [
        breadcrumb,
        `[harness] Context Card가 유효하지 않습니다: ${active.user}/${active.task}.`,
        ...validation.failures.map(failure => `failure: ${failure.code} | ${failure.message}`),
        'next-action: harness-team context check',
      ];
      return lines.join('\n');
    }

    return `${breadcrumb}\n${card}`;
  }
  const incomplete = await listIncompleteTasks(targetDir);
  // Plain stdout (SessionStart injects it into context). No literal <system-reminder>
  // tag — the harness already labels injected hook output; faking that framing here
  // would be redundant/confusing.
  const lines = [
    '[harness] ⚠ 활성 task가 없습니다.',
    '이 세션의 첫 프롬프트가 실질 작업(기능/수정/리팩토링/디버깅)이면, 코드를 건드리기 전에',
    '반드시 AskUserQuestion으로 다음 중 하나를 확인하세요:',
  ];
  const shown = incomplete.slice(0, SESSION_CONTEXT_MAX_TASKS);
  for (const t of shown) lines.push(`  · 재개: ${t.user}/${t.name}   (plan 미완)`);
  if (incomplete.length > SESSION_CONTEXT_MAX_TASKS) {
    lines.push(`  · … 외 ${incomplete.length - SESSION_CONTEXT_MAX_TASKS}개 (harness-team list로 전체 확인)`);
  }
  lines.push('  · 새 task 생성');
  lines.push('  · task 없이 진행');
  lines.push('(단순 질문·조회·잡일이면 무시.)');
  return lines.join('\n');
}

// observe-surfacing: when a trip wire fired, ONE line is appended to whichever branch above
// produced the context. Built from the same evaluateObserveVerdict the observe CLI and doctor
// use, so the three cannot disagree. Silent otherwise — not-installed / no-data / ok, and any
// exception: SessionStart output must never break because the verdict could not be computed.
// Lean by design (SESSION_CONTEXT_MAX_TASKS above): ids and window only; the numbers and the
// loopback nudge stay in `harness-team observe`, which the line points at. `now` is injectable
// for tests, like everywhere in observe.mjs.
async function observeSurfacingLine(targetDir, now) {
  let verdict;
  try { verdict = await evaluateObserveVerdict(targetDir, { now }); } catch { return null; }
  if (verdict.status !== 'tripped') return null;
  const ids = verdict.fired.map(wire => wire.id).join(', ');
  return `[harness] ⚠ observe 트립와이어 발화: ${ids} (창 ${verdict.window.from}→${verdict.window.to}) — harness-team observe로 확인하고 그 출력의 next: 줄로 task를 잇는다.`;
}

// Combined form (tests, and anyone who wants the whole injection as one string). Joined the
// way runSessionContext prints it: gate, newline, observe line.
export async function buildSessionContext(targetDir, { now = new Date(), doneOnMain } = {}) {
  const gate = await buildTaskGateContext(targetDir, doneOnMain ? { doneOnMain } : {});
  const observe = await observeSurfacingLine(targetDir, now);
  return observe ? `${gate}\n${observe}` : gate;
}

// Codex 훅은 **평문 stdout 을 주입하지 않는다** — 훅은 실행되지만 출력이 어디에도 닿지 않는다
// (2026-09-12 실측: 마커 파일은 생기는데 모델은 그 문자열을 못 본다). 주입되는 것은 이 봉투 하나뿐이다.
// Claude 훅은 종전대로 평문을 읽으므로 기본 출력은 바꾸지 않는다 — `--codex-hook` 일 때만 감싼다.
export function renderCodexHookEnvelope(context) {
  return JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context },
  });
}

export async function runSessionContext(ctx) {
  // The task-gate half goes out BEFORE the observe verdict is computed: if the SessionStart
  // hook timeout (10 s) ever hits during the log scan, only the observe line is lost, never
  // the task context (codex P2 2026-09-09). Measured 0.34 s at 140k records / 71 MB, so this
  // is a safety ordering, not a budget — no cap or deadline is added.
  const codexHook = !!(ctx.flags && ctx.flags['codex-hook']);
  const gate = await buildTaskGateContext(ctx.targetDir);
  if (gate && !codexHook) console.log(gate);
  // codex 봉투는 **한 덩어리**라 여기서 버퍼링한다 — 그래서 위 주석의 "gate 를 먼저 흘린다" 보호가
  // codex 경로에는 없다. observe 계산이 훅 타임아웃(10 s)에 걸리면 gate 까지 함께 잃는다.
  // 그 대신 observe 가 **던지는** 경우에는 gate 만이라도 내보낸다.
  let observe = null;
  try { observe = await observeSurfacingLine(ctx.targetDir, new Date()); } catch { /* gate 는 살린다 */ }
  if (!codexHook) {
    if (observe) console.log(observe);
    return;
  }
  const context = [gate, observe].filter(Boolean).join('\n');
  // 빈 컨텍스트에 봉투만 씌우지 않는다 — Codex 에 빈 블록을 주입하는 것과 같다.
  if (context) console.log(renderCodexHookEnvelope(context));
}

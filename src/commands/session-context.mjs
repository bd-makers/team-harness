import { join } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { exists } from '../fsx.mjs';
import { readActive, planHasOpenBoxes } from './task.mjs';
import { contextCardPath, validateContextCard } from './context.mjs';

// "task-gate가 있다"의 단일 정의 — migrate(보강)와 doctor(감지)가 공유.
// .claude/settings.json의 SessionStart hook 중 `session-context`를 호출하는 항목이 있으면 true.
export function settingsHasSessionGate(settings) {
  return (settings?.hooks?.SessionStart || []).some(group =>
    (group.hooks || []).some(h => typeof h.command === 'string' && h.command.includes('session-context')));
}

// plan.md에 열린 체크박스가 남은 task = 재개 가능. (marker: <name>-spec.md, `list`와 동일 규약)
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
      let plan;
      try { plan = await readFile(join(userPath, name, `${name}-plan.md`), 'utf8'); }
      catch { continue; }
      if (planHasOpenBoxes(plan)) out.push({ user, name });
    }
  }
  return out;
}

export async function buildSessionContext(targetDir) {
  const active = await readActive(targetDir);
  if (active && active.task) {
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
  for (const t of incomplete) lines.push(`  · 재개: ${t.user}/${t.name}   (plan 미완)`);
  lines.push('  · 새 task 생성');
  lines.push('  · task 없이 진행');
  lines.push('(단순 질문·조회·잡일이면 무시.)');
  return lines.join('\n');
}

export async function runSessionContext(ctx) {
  const text = await buildSessionContext(ctx.targetDir);
  if (text) console.log(text);
}

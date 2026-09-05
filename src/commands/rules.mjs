import { join } from 'node:path';
import { lstat, unlink } from 'node:fs/promises';
import { exists, readTextSafe, writeText } from '../fsx.mjs';
import { buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../observation.mjs';
import { collectRuleFiles, mirrorCursorRules, splitRulePaths } from '../harness.mjs';
import { readActive } from './task.mjs';

// ── 순수 부분 ──────────────────────────────────────────────────────────────

// 규칙 파일의 유래 마커. `harness:review`와 같은 key=value 속성 문법이고 `harness:mirror`처럼 HTML 주석이다 —
// Cursor는 렌더하지 않고, Claude Code는 block-level 주석을 컨텍스트 주입 전에 벗긴다(공식 memory 문서).
// frontmatter 키로 두지 않는 이유: rules frontmatter의 공인 키는 `paths`뿐이라 임의 키 처리가 미명시다.
export const RULE_MARKER_RE = /<!--\s*harness:rule\s+([^>]*?)\s*-->/;
// task 이름과 같은 규칙 — `/`·`..`가 못 들어오므로 `.claude/rules` 밖으로 나갈 수 없다.
export const RULE_NAME_RE = /^[\w.-]+$/;
export const TEMPLATE_RULE_ORIGIN = 'harness-aijient-team/templates';
// artifact 항목 마지막 줄 끝의 승격 표기 — 목록 표시와 재승격 거부의 유일한 근거.
export const PROMOTED_SUFFIX_RE = /\s*\(→ rules\/([\w.-]+)\.md, (\d{4}-\d{2}-\d{2})\)\s*$/;

const LEARNINGS_HEADING_RE = /^## Learnings(?:\s*\((\d{4}-\d{2}-\d{2})\))?\s*$/;
// `#`·`##`만 절을 끝낸다 — Learnings 안의 `###` 소제목은 절의 일부다.
const SECTION_END_RE = /^#{1,2}\s/;
const BULLET_RE = /^- (.*)$/;
const CONTINUATION_RE = /^\s+(\S.*)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function ruleMarker({ origin, since }) {
  return `<!-- harness:rule origin=${origin} since=${since} -->`;
}

export function parseRuleMarker(content) {
  // 마커는 frontmatter 뒤 본문 *첫 줄*(앞 빈 줄 허용)에 있어야 유래다 — 본문 중간이나 fenced 예시에 적힌
  // 마커 문자열을 유래로 치면 doctor가 유래 없는 규칙을 놓친다(codex 리뷰 P2, 2026-09-05).
  const { body } = splitRulePaths(content ?? '');
  const match = RULE_MARKER_RE.exec(body.trimStart());
  if (!match || match.index !== 0) return null;
  const attrs = {};
  for (const kv of match[1].matchAll(/([a-z][a-z0-9-]*)=("[^"]*"|\S+)/gi)) {
    attrs[kv[1].toLowerCase()] = kv[2].replace(/^"|"$/g, '');
  }
  if (!attrs.origin || !DATE_RE.test(attrs.since ?? '')) return null;
  return { origin: attrs.origin, since: attrs.since };
}

export function parseLearnings(artifact) {
  const lines = artifact.split(/\r?\n/);
  const entries = [];
  let inLearnings = false;
  let date = null;
  let current = null;
  const flush = () => {
    if (!current) return;
    const raw = current.parts.join(' ').trim();
    const promotedMatch = PROMOTED_SUFFIX_RE.exec(raw);
    const text = promotedMatch ? raw.slice(0, promotedMatch.index).trim() : raw;
    // retro가 인수 없이 만든 빈 불릿은 승격할 본문이 없다 — 세지 않는다.
    if (text) {
      entries.push({
        date: current.date, start: current.start, end: current.end, text,
        promoted: promotedMatch ? { rule: promotedMatch[1], at: promotedMatch[2] } : null,
      });
    }
    current = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heading = LEARNINGS_HEADING_RE.exec(line);
    if (heading) { flush(); inLearnings = true; date = heading[1] ?? null; continue; }
    if (SECTION_END_RE.test(line)) { flush(); inLearnings = false; continue; }
    if (!inLearnings) continue;
    const bullet = BULLET_RE.exec(line);
    if (bullet) { flush(); current = { date, start: i, end: i, parts: [bullet[1]] }; continue; }
    const continuation = current ? CONTINUATION_RE.exec(line) : null;
    if (continuation) { current.end = i; current.parts.push(continuation[1]); continue; }
    flush();
  }
  flush();
  return entries.map((entry, idx) => ({ index: idx + 1, ...entry }));
}

export function renderRule({ slug, text, origin, since, paths = [] }) {
  const frontmatter = paths.length
    ? `---\npaths:\n${paths.map(p => `  - "${p.replace(/"/g, '\\"')}"`).join('\n')}\n---\n`
    : '';
  return `${frontmatter}${ruleMarker({ origin, since })}\n# ${slug}\n\n- ${text}\n`;
}

// 표기는 항목의 *마지막* 줄에 붙는다 — 이어지는 줄이 있는 항목의 첫 줄에 붙이면 합친 본문 한가운데에 들어가
// PROMOTED_SUFFIX_RE(`$` 앵커)가 못 본다. 줄바꿈은 파일이 쓰던 것(LF/CRLF)을 그대로 쓴다 — LF로 재조립하면
// 표기 한 건 외의 모든 줄이 diff에 잡힌다(codex 리뷰 P2).
export function annotatePromoted(artifact, index, slug, date) {
  const entry = parseLearnings(artifact).find(e => e.index === index);
  if (!entry) throw new RangeError(`no Learnings entry at index ${index}`);
  const eol = artifact.includes('\r\n') ? '\r\n' : '\n';
  const lines = artifact.split(/\r?\n/);
  lines[entry.end] = `${lines[entry.end].replace(/\s+$/, '')} (→ rules/${slug}.md, ${date})`;
  return lines.join(eol);
}

export function parsePathsFlag(value) {
  if (typeof value !== 'string') return [];
  return value.split(',').map(p => p.trim()).filter(Boolean);
}

// ── I/O 부분 ───────────────────────────────────────────────────────────────

// doctor용. 마커가 없거나 origin·since 중 하나라도 빠진 규칙을 나열한다. `.claude/rules`가 없으면 검사할 것이 없다(null).
// 읽기 실패도 경고로 돌려준다 — warn 수준 검사가 doctor를 crash 시키면 envelope 자체가 안 나온다.
export async function checkRuleProvenance(targetDir) {
  const dir = join(targetDir, '.claude/rules');
  if (!(await exists(dir))) return null;
  let files;
  try {
    files = await collectRuleFiles(dir);
  } catch (error) {
    return `.claude/rules 읽기 실패(${error?.code ?? error?.message}) — 디렉터리 상태를 확인하라`;
  }
  const missing = [];
  const unreadable = [];
  for (const rel of files) {
    const content = await readTextSafe(join(dir, rel));
    // 읽기 실패(권한·dangling symlink)는 "유래 없음"과 처방이 다르다 — 스탬프를 권하면 잘못된 안내다(codex 리뷰 P3).
    if (content === null) unreadable.push(rel);
    else if (!parseRuleMarker(content)) missing.push(rel);
  }
  if (!missing.length && !unreadable.length) return null;
  const parts = [];
  if (missing.length) {
    const stamp = ruleMarker({ origin: '<user>/<task>', since: '<YYYY-MM-DD>' });
    parts.push(`유래 없는 규칙 ${missing.length}개: ${missing.sort().join(', ')} — 각 파일 본문 첫 줄(frontmatter 뒤)에 \`${stamp}\`를 추가하거나 \`harness-team rules promote\`로 승격한 규칙만 두라`);
  }
  if (unreadable.length) {
    parts.push(`읽을 수 없는 규칙 ${unreadable.length}개: ${unreadable.sort().join(', ')} — 권한이나 심볼릭 링크 대상을 확인하라`);
  }
  return `.claude/rules에 ${parts.join('; ')}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const USAGE = 'harness-team rules promote [<n>] [--name <slug>] [--paths <a,b>]';

// retro·task와 같은 escalation packet 계약. exitCode 기본 2(인수·상태 거부), 활성 task 없음만 1(retro와 동일).
function fail(ctx, { code, cause, retry, alternatives = [], safeDefault, stop, exitCode = 2 }) {
  process.exitCode = exitCode;
  const packet = buildErrorPacket({ cause, retry, alternatives, safeDefault, stop });
  if (ctx.flags?.json) {
    emitObservation(buildEnvelope({
      command: 'rules',
      status: 'error',
      summary: `rules promote 실패: ${code}`,
      error: packet,
      extra: { action: 'promote', code },
    }));
  } else {
    console.log(`✗ rules promote: ${code}`);
    for (const line of renderErrorPacket(packet)) console.log(line);
  }
  return { status: 'error', code };
}

function listLearnings(ctx, { entries, relArtifact }) {
  const status = entries.length ? 'listed' : 'no-data';
  const summary = entries.length
    ? `${relArtifact} — Learnings ${entries.length}개`
    : `${relArtifact} — Learnings 항목 없음`;
  const nextActions = entries.length
    ? [`승격할 항목을 골라 \`${USAGE}\` 실행 — 선택은 사용자 승인`]
    : ['`harness-team retro "<학습>"` 으로 Learnings를 먼저 기록'];
  if (ctx.flags?.json) {
    emitObservation(buildEnvelope({
      command: 'rules', status, summary, nextActions, artifacts: [relArtifact],
      extra: { action: 'promote', learnings: entries.map(({ index, date, text, promoted }) => ({ index, date, text, promoted })) },
    }));
  } else {
    console.log(`${entries.length ? '✓' : '-'} rules promote: ${summary}`);
    for (const e of entries) {
      const flag = e.promoted ? `  [promoted → rules/${e.promoted.rule}.md, ${e.promoted.at}]` : '';
      console.log(`  ${e.index}. [${e.date ?? '날짜 없음'}] ${e.text}${flag}`);
    }
    console.log(`next: ${nextActions[0]}`);
  }
  return { status, entries };
}

export async function runRulesPromote(ctx) {
  // 값 플래그는 `flags.<key>` 리터럴로 읽는다 — cli-args 가드 테스트가 선언된 플래그의 소비를 이 형태로 확인한다.
  const flags = ctx.flags ?? {};
  const active = await readActive(ctx.targetDir);
  if (!active || !active.task) {
    return fail(ctx, {
      code: 'no-active-task', exitCode: 1,
      cause: '.harness/active.json 에 활성 task가 없어 승격 원천 artifact.md를 찾을 수 없음',
      retry: '`harness-team task <name>` 로 task를 활성화한 뒤 다시 실행',
      alternatives: ['다른 task의 artifact에서 승격하려면 그 task를 먼저 활성화한다 — 활성 task 없이 승격하는 경로는 없다'],
      safeDefault: '규칙 파일도 artifact 표기도 만들어지지 않는다',
      stop: 'task가 하나도 없으면 먼저 task를 생성하라',
    });
  }
  const { user, task } = active;
  const relArtifact = `docs/${user}/${task}/${task}-artifact.md`;
  const artifactPath = join(ctx.targetDir, relArtifact);
  const artifact = await readTextSafe(artifactPath);
  if (artifact === null) {
    return fail(ctx, {
      code: 'no-artifact',
      cause: `${relArtifact} 이(가) 없음`,
      retry: '`harness-team retro "<학습>"` 으로 Learnings를 먼저 기록한 뒤 다시 실행',
      alternatives: ['artifact.md 없이 규칙을 바로 쓰려면 `.claude/rules/<slug>.md` 를 직접 만들고 `harness-team sync` 로 미러한다 — 유래 마커는 수동으로 붙여야 한다'],
      safeDefault: '규칙 파일도 artifact 표기도 만들어지지 않는다',
      stop: 'artifact.md가 없으면 승격할 항목이 없다',
    });
  }
  const entries = parseLearnings(artifact);
  const selector = (ctx.taskArgs || [])[1];
  if (selector === undefined) return listLearnings(ctx, { entries, relArtifact });

  if (!/^\d+$/.test(selector) || Number(selector) < 1 || Number(selector) > entries.length) {
    return fail(ctx, {
      code: 'invalid-index',
      cause: `"${selector}" 은(는) 1..${entries.length} 범위의 정수가 아님`,
      retry: '`harness-team rules promote` 로 번호 목록을 확인한 뒤 다시 실행',
      alternatives: ['번호 대신 목록을 먼저 보려면 `harness-team rules promote` 를 인자 없이 실행한다'],
      safeDefault: '규칙 파일도 artifact 표기도 만들어지지 않는다',
      stop: '항목이 0개면 승격할 것이 없다',
    });
  }
  const entry = entries[Number(selector) - 1];
  if (entry.promoted) {
    return fail(ctx, {
      code: 'already-promoted',
      cause: `#${entry.index} 은(는) 이미 rules/${entry.promoted.rule}.md 로 승격됨 (${entry.promoted.at})`,
      retry: '다른 항목 번호를 고르거나, 되돌리려면 규칙 파일 삭제 + artifact 표기 제거를 수동으로',
      alternatives: ['같은 학습을 다른 각도로 승격하려면 artifact에 새 Learnings 항목을 추가한 뒤 그 번호를 고른다'],
      safeDefault: '기존 규칙 파일과 artifact 표기가 그대로 남는다',
      stop: '같은 항목을 두 번 승격하지 않는다',
    });
  }
  const name = flags.name;
  if (typeof name !== 'string' || !RULE_NAME_RE.test(name)) {
    return fail(ctx, {
      code: 'invalid-name',
      cause: `--name 이 없거나 이름 규칙(^[\\w.-]+$)을 만족하지 않음: ${JSON.stringify(name ?? null)}`,
      retry: '`--name <slug>` 를 영문·숫자·`_`·`.`·`-` 만으로 지정',
      alternatives: ['이름을 정하기 어려우면 artifact의 학습 제목을 kebab-case로 옮겨 쓴다'],
      safeDefault: '규칙 파일도 artifact 표기도 만들어지지 않는다',
      stop: '경로 구분자가 들어간 이름으로는 만들지 않는다',
    });
  }
  const relRule = `.claude/rules/${name}.md`;
  const rulePath = join(ctx.targetDir, relRule);
  // lstat: 무엇이든 그 이름을 차지하고 있으면 거부한다. exists()는 symlink를 따라가므로 dangling symlink를
  // "없음"으로 보고, 이어지는 writeFile이 링크 대상(디렉터리 밖일 수 있다)을 만들어 버린다(codex 리뷰 P1).
  const occupied = await lstat(rulePath).then(() => true, () => false);
  if (occupied) {
    return fail(ctx, {
      code: 'rule-exists',
      cause: `${relRule} 이(가) 이미 있음 — 덮어쓰지 않는다`,
      retry: '다른 `--name` 을 쓰거나 기존 규칙을 직접 편집',
      alternatives: ['기존 규칙을 대체할 의도면 그 파일을 직접 편집하고 유래 마커에 이번 항목을 덧붙인다'],
      safeDefault: '기존 규칙 파일이 그대로 보존된다 — 덮어쓰지 않았다',
      stop: '기존 규칙 파일은 보존한다',
    });
  }

  const paths = parsePathsFlag(flags.paths);
  const since = today();
  const origin = `${user}/${task}`;
  // 검증은 위에서 끝났다. 쓰기 순서: 규칙 → artifact 표기 → 미러. 표기가 먼저면 규칙 쓰기 실패 시 유령 표기가 남는다.
  await writeText(rulePath, renderRule({ slug: name, text: entry.text, origin, since, paths }));
  try {
    await writeText(artifactPath, annotatePromoted(artifact, entry.index, name, since));
  } catch (error) {
    // 표기 없이 규칙만 남으면 재시도가 rule-exists로 막힌다 — 방금 쓴 규칙을 되돌려 재시도 가능하게 한다(codex 리뷰 P2).
    await unlink(rulePath).catch(() => {});
    return fail(ctx, {
      code: 'artifact-write-failed',
      cause: `${relArtifact} 쓰기 실패(${error?.code ?? error?.message}) — 방금 쓴 ${relRule} 은 되돌리려 시도했다`,
      retry: 'artifact.md 의 권한·잠금을 확인한 뒤 같은 명령을 다시 실행',
      alternatives: ['artifact 쓰기가 계속 실패하면 규칙 파일만 수동으로 만들고 표기를 손으로 추가한다 — 표기 없는 규칙은 재승격을 막지 못한다'],
      // unlink 실패는 삼켜지고 writeText는 원자적이지 않다 — 보장하지 못하는 상태를 주장하지 않는다.
      safeDefault: `artifact 표기는 기록되지 않았다. ${relRule} 은 되돌리기까지 실패했으면 남아 있을 수 있고 ${relArtifact} 도 일부만 쓰였을 수 있다 — 재실행 전에 두 파일을 확인하라`,
      stop: 'artifact 표기 없이 규칙만 남기지 않는다',
    });
  }
  // 미러는 파생물이라 실패해도 승격을 되돌리지 않는다 — `harness-team sync`가 같은 결과를 다시 만든다.
  let mirrored = null;
  let mirrorError = null;
  try {
    mirrored = (await mirrorCursorRules(ctx)).filter(r => r.action === 'mirror').length;
  } catch (error) {
    mirrorError = error?.code ?? error?.message ?? String(error);
  }

  const summary = `${relRule} 승격 (origin=${origin} since=${since}${paths.length ? `, paths=${paths.join(',')}` : ''})`;
  const nextActions = ['규칙 본문을 다듬고 커밋하라', '되돌리려면 규칙 파일 삭제 + artifact 표기 제거 + `harness-team sync`'];
  if (mirrorError) nextActions.unshift('`harness-team sync` 로 cursor 미러를 다시 만들어라');
  if (ctx.flags?.json) {
    emitObservation(buildEnvelope({
      command: 'rules', status: 'success', summary, nextActions, artifacts: [relRule, relArtifact],
      extra: { action: 'promote', index: entry.index, rule: relRule, origin, since, paths, mirrored, mirror_error: mirrorError },
    }));
  } else {
    console.log(`✓ rules promote: ${summary}`);
    console.log(`✓ artifact: ${relArtifact} #${entry.index} 에 승격 표기`);
    if (mirrorError) console.log(`⚠️ cursor mirror: 실패(${mirrorError}) — \`harness-team sync\` 로 재생성하라`);
    else console.log(`✓ cursor mirror: ${mirrored} rule(s)`);
    console.log(`next: ${nextActions[0]}`);
  }
  return { status: 'success', rule: relRule, index: entry.index, origin, since, paths, mirrored, mirrorError };
}

export async function runRules(ctx) {
  const action = (ctx.taskArgs || [])[0];
  if (action === 'promote') return runRulesPromote(ctx);
  process.exitCode = 2;
  if (ctx.flags?.json) {
    // --json 계약은 명령 전체에 걸친다 — 잘못된 하위동작도 envelope로 답한다(codex 리뷰 P2).
    emitObservation(buildEnvelope({
      command: 'rules',
      status: 'error',
      summary: 'rules 실패: invalid-action',
      // text 분기는 usage 안내를 유지한다 — 사용법 오류는 escalation이 아니다(tests/rules.test.mjs).
      error: buildErrorPacket({
        cause: `알 수 없는 하위동작 ${JSON.stringify(action ?? null)} — 지원: promote`,
        retry: `\`${USAGE}\` 로 다시 실행`,
        alternatives: ['하위동작 목록만 보려면 인자 없이 `harness-team rules promote` 를 실행한다'],
        safeDefault: '아무 파일도 읽거나 쓰지 않고 종료한다',
        stop: '하위동작이 promote 가 아니면 아무것도 쓰지 않는다',
      }),
      extra: { action: action ?? null, code: 'invalid-action' },
    }));
  } else {
    console.log('rules: invalid-action');
    console.log(`usage: ${USAGE}`);
  }
  return { status: 'invalid-action' };
}

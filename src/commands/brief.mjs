// `harness-team brief` — 구현 전 사람 검토용 슬라이드를 활성 task spec 에서만 뽑아 `<name>-brief.html` 로 쓴다
// (결정 A3-1, task task-brief).
//
// 에이전트가 슬라이드를 쓰면 spec 에 없는 사실이 섞일 수 있다. 이 결정론 렌더러는 정해진 spec 절을 **그대로** 옮기고
// 장식 글자(슬라이드 번호·"출처:" 라벨·생성 시각)를 두지 않는다 — 출처 표지는 spec 제목 글자 그대로다. 그래서 렌더 결과의
// 텍스트 노드는 모두 spec 원문의 부분 문자열이다("새 사실 0" — tests/brief-command.test.mjs 가 판정한다). 같은 spec 이면 같은 바이트다.
// probe 할 외부 도구가 없으므로 probe → degrade 계약은 적용하지 않는다.
//
// 렌더하지 않는 것: 코드 펜스 밖 HTML 주석(Done evidence 의 주석 처리된 예시가 선언된 요건처럼 보인다)과 템플릿 안내 문단
// (제목 아래 단일 `*` 기울임 문단) — 둘 다 spec 안의 글자지만 이 task 의 사실이 아니다. 마크다운은 작은 부분집합(문단·목록·굵게·
// 인라인 코드·표·코드 펜스·제목)만 렌더하고, 링크·이미지·기울임·인용은 글자 그대로 둔다(앵커를 만들지 않는다 — 외부 참조 0).
import { readFile } from 'node:fs/promises';
import { exists, writeText } from '../fsx.mjs';
import { readActive, parseDoneEvidenceDeclaration, SCENARIO_KEYS } from './task.mjs';
import { taskFileRel, taskFilePath } from '../task-paths.mjs';
import { BRIEF_STAGES } from '../cli-args.mjs';
import { buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../observation.mjs';

const USAGE = `usage: harness-team brief [--stage ${BRIEF_STAGES.join('|')}]   (위치 인자 없음 — 활성 task 의 spec 을 렌더한다)`;

// 슬라이드로 옮기는 spec 절 — spec 문서 순서대로 렌더한다. 제목 머리 글자로 찾으므로 `## 목적 / 요구사항` 과 옛 `## 목적` 이 같다.
// `only` 가 있으면 그 절의 `###` 하위 절 중 맞는 것만(R1 은 `### 발견` 만 — `### 원천` 목록은 검토 대상이 아니다).
const SECTIONS = [
  { label: '## 목적', match: (t) => t.startsWith('목적') },
  { label: '## 범위', match: (t) => t.startsWith('범위') },
  { label: '## 원천 검토 › ### 발견', match: (t) => t.startsWith('원천 검토'), only: (t) => t.startsWith('발견') },
  { label: '## 설계', match: (t) => t.startsWith('설계') },
  { label: '## Ontology', match: (t) => t.startsWith('Ontology') },
];

// 열린 항목 — 목록 항목에 **맨 글자로** 붙은 표기(commands/harness-interview.md 표기/언급 구분). 백틱 안은 언급이라 먼저 걷어 낸다.
// 태그 모양만 센다 — `(open)`·`(open → <대상>)`, 외부 질의는 역할이 있어야 한다(`(ask:)` 는 태그가 아니다). "(open 아님, …)" 같은 산문은 태그가 아니다.
// `(open…)` 은 이월 `(open → <대상>)` 도 포함한다 — 게이트는 통과하지만 답은 아직 없어, 검토자가 보고 승인해야 한다(spec R1).
const OPEN_MARK_RE = /\((?:open(?=\)|\s*→)|unresolved\)|[^()]*,\s*unresolved\)|ask:[^\s)]+\)|asked:[^\s)]+[\s)]|answered(?=[\s)]))/;

const LIST_ITEM_RE = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const HEADING_RE = /^(#{1,6})\s+(.*?)\s*$/;
const TABLE_SEPARATOR_RE = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;
// 백틱 info string 에는 백틱이 올 수 없다(CommonMark) — "```x```" 한 줄은 펜스가 아니라 인라인 코드다.
const FENCE_OPEN_RE = /^\s*(`{3,}(?=[^`]*$)|~{3,})/;
const CODE_SPAN_RE = /(?<!`)(`+)(?!`)([\s\S]*?[^`])\1(?!`)/g;
const BOLD_RE = /(?<!\\)\*\*(?=[^\s*])([\s\S]*?\S)\*\*/g;
// 템플릿 안내 문단: 단일 `*` 로 시작하고 단일 `*` 로 끝난다(`**굵게**` 로 시작·끝나는 문단은 아니다).
const GUIDE_RE = /^\*(?!\*)[\s\S]*[^*]\*$/;

const STYLE = `:root{color-scheme:light dark;--bg:#ffffff;--fg:#1d1d1f;--muted:#6e6e73;--line:#d2d2d7;--code:#f2f2f5;--accent:#0a5bb5}
@media (prefers-color-scheme:dark){:root{--bg:#111113;--fg:#f2f2f2;--muted:#a1a1a6;--line:#3a3a3c;--code:#1f1f22;--accent:#6aaeff}}
html{scroll-snap-type:y mandatory}
body{margin:0;background:var(--bg);color:var(--fg);font:18px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif}
.slide{box-sizing:border-box;min-height:100vh;padding:7vh 8vw;scroll-snap-align:start;border-bottom:1px solid var(--line);overflow-wrap:anywhere}
.cover{display:flex;align-items:center}
h1{font-size:2.4em;line-height:1.25;margin:0}
h2{font-size:1.6em;line-height:1.3;margin:0 0 .8em;color:var(--accent)}
h3{font-size:1.15em;margin:1.2em 0 .4em}
.src{margin:0 0 .3em;color:var(--muted);font-size:.9em}
.src+ul{margin-top:0}
ul,ol{padding-left:1.4em}
li{margin:.25em 0}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.88em;background:var(--code);padding:.08em .32em;border-radius:4px}
pre{background:var(--code);padding:.9em 1.1em;border-radius:6px;overflow:auto}
pre code{background:none;padding:0}
table{border-collapse:collapse;margin:.6em 0}
th,td{border:1px solid var(--line);padding:.35em .65em;text-align:left;vertical-align:top}
th{background:var(--code)}
@media print{html{scroll-snap-type:none}.slide{min-height:auto;break-after:page}}`;

const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 닫는 펜스는 여는 펜스와 같은 글자로 그 길이 이상이어야 한다.
function closesFence(line, open) {
  const close = line.match(/^\s*(`{3,}|~{3,})\s*$/);
  return Boolean(close) && close[1][0] === open[0] && close[1].length >= open.length;
}

// 코드 펜스 안팎을 가르는 마스크(여는·닫는 펜스 줄 포함).
function fenceMask(lines) {
  const mask = [];
  let open = null;
  for (const line of lines) {
    if (open) {
      mask.push(true);
      if (closesFence(line, open)) open = null;
      continue;
    }
    const m = line.match(FENCE_OPEN_RE);
    if (m) open = m[1];
    mask.push(Boolean(m));
  }
  return mask;
}

// 줄머리에서 시작하는 HTML 주석 블록을 걷어 낸다(코드 펜스 안은 글자다). 걷은 자리는 빈 줄로 남긴다 — 앞뒤 줄이 한 문단으로 붙으면
// 원문에 없는 문자열이 된다(codex 1차 P1). 닫는 `-->` 뒤에 글자가 남으면 그 꼬리는 남긴다 — 원문 줄의 접미사라 판정을 깨지 않는다. 줄 중간의 주석은 글자 그대로 둔다(걷어 내면 앞뒤 글자가 붙어 원문에 없는 문자열이 된다).
export function stripComments(lines) {
  const out = [];
  let fence = null;
  let inComment = false;
  for (const line of lines) {
    if (inComment) {
      const end = line.indexOf('-->');
      if (end === -1) continue;
      inComment = false;
      out.push('');
      const tail = line.slice(end + 3);
      if (tail.trim()) out.push(tail);
      continue;
    }
    if (fence) {
      out.push(line);
      if (closesFence(line, fence)) fence = null;
      continue;
    }
    const open = line.match(FENCE_OPEN_RE);
    if (open) { fence = open[1]; out.push(line); continue; }
    if (/^\s*<!--/.test(line)) {
      const end = line.indexOf('-->', line.indexOf('<!--') + 4);
      if (end === -1) { inComment = true; continue; }
      out.push('');
      const tail = line.slice(end + 3);
      if (tail.trim()) out.push(tail);
      continue;
    }
    out.push(line);
  }
  return out;
}

// `# H1`, `## 절`, `### 하위 절` 로 나눈다. 펜스 안의 `#` 줄은 제목이 아니다.
export function splitDocument(lines) {
  const mask = fenceMask(lines);
  const doc = { h1: null, preamble: [], sections: [] };
  let section = null;
  let sub = null;
  lines.forEach((line, i) => {
    const h = mask[i] ? null : line.match(HEADING_RE);
    if (h && h[1].length === 1 && doc.h1 === null && !section) { doc.h1 = h[2]; return; }
    if (h && h[1].length === 2) { section = { title: h[2], lines: [], subs: [] }; sub = null; doc.sections.push(section); return; }
    if (h && h[1].length === 3 && section) { sub = { title: h[2], lines: [] }; section.subs.push(sub); return; }
    (sub ? sub.lines : section ? section.lines : doc.preamble).push(line);
  });
  return doc;
}

// GFM: 구분 줄의 칸 수가 헤더와 같아야 표다 — 아니면 글자 그대로 둔다(codex 1차 P2).
function isTableStart(lines, i) {
  return lines[i].trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].includes('-') && TABLE_SEPARATOR_RE.test(lines[i + 1])
    && splitRow(lines[i]).length === splitRow(lines[i + 1]).length;
}

function splitRow(line) {
  let row = line.trim();
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1);
  return row.split(/(?<!\\)\|/).map(cell => cell.trim());
}

// 목록·펜스·제목·표가 시작되는 줄인가 — 문단과 목록 이음 줄이 여기서 끊긴다.
function startsBlock(lines, i, mask) {
  const line = lines[i];
  return mask[i] || HEADING_RE.test(line) || isTableStart(lines, i);
}

function parseList(lines, start, mask) {
  const first = lines[start].match(LIST_ITEM_RE);
  const root = { type: 'list', ordered: /\d/.test(first[2]), items: [] };
  const stack = [{ indent: first[1].length, list: root }];
  let last = null;
  let i = start;
  const rootIndent = first[1].length;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      // 빈 줄 뒤에도 목록이 이어진다: 같은 종류의 다음 항목, 또는 첫 항목보다 들여 쓴 줄(하위 목록·항목 안 문단) — CommonMark 의 느슨한 목록.
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      if (j >= lines.length || mask[j] || startsBlock(lines, j, mask)) break;
      const next = lines[j].match(LIST_ITEM_RE);
      const indent = (next ? next[1] : lines[j].match(/^\s*/)[0]).length;
      if (indent > rootIndent || (next && indent === rootIndent && /\d/.test(next[2]) === root.ordered)) { i = j - 1; continue; }
      break;
    }
    const m = mask[i] ? null : line.match(LIST_ITEM_RE);
    if (m) {
      const indent = m[1].length;
      while (stack.length > 1 && indent < stack[stack.length - 1].indent) stack.pop();
      // 맨 위 수준에서 글머리표 ↔ 번호가 바뀌면 새 목록이다.
      if (stack.length === 1 && indent <= rootIndent && /\d/.test(m[2]) !== root.ordered) break;
      if (indent > stack[stack.length - 1].indent && last) {
        last.children = { type: 'list', ordered: /\d/.test(m[2]), items: [] };
        stack.push({ indent, list: last.children });
      }
      last = { text: m[3], children: null };
      stack[stack.length - 1].list.items.push(last);
      continue;
    }
    if (startsBlock(lines, i, mask)) break;
    last.text += `\n${line.trim()}`;
  }
  return { block: root, next: i };
}

// 블록 목록으로 바꾼다. 절 첫 블록인 안내 문단은 여기서 버린다.
export function parseBlocks(lines) {
  const mask = fenceMask(lines);
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (mask[i]) {
      // 마스크는 여는 펜스 줄에서만 false → true 로 바뀌므로 여기는 언제나 여는 펜스다. 닫히지 않은 펜스는 끝까지가 코드다.
      const open = line.match(FENCE_OPEN_RE)[1];
      const body = [];
      for (i++; i < lines.length; i++) {
        if (closesFence(lines[i], open)) { i++; break; }
        body.push(lines[i]);
      }
      blocks.push({ type: 'code', text: body.join('\n') });
      continue;
    }
    const h = line.match(HEADING_RE);
    if (h) { blocks.push({ type: 'heading', text: h[2] }); i++; continue; }
    if (isTableStart(lines, i)) {
      const header = splitRow(line);
      const rows = [];
      for (i += 2; i < lines.length && lines[i].trim().startsWith('|'); i++) rows.push(splitRow(lines[i]));
      blocks.push({ type: 'table', header, rows });
      continue;
    }
    if (LIST_ITEM_RE.test(line)) {
      const { block, next } = parseList(lines, i, mask);
      blocks.push(block);
      i = next;
      continue;
    }
    const para = [line.trim()];
    for (i++; i < lines.length && lines[i].trim() && !LIST_ITEM_RE.test(lines[i]) && !startsBlock(lines, i, mask); i++) para.push(lines[i].trim());
    const text = para.join('\n');
    // 안내 문단은 절 첫 블록(제목 바로 아래 — 템플릿이 넣는 자리)일 때만 버린다. 본문 중간의 기울임 문단은 작성자 글이다(codex 1차 P2).
    if (!(blocks.length === 0 && GUIDE_RE.test(text))) blocks.push({ type: 'paragraph', text });
  }
  return blocks;
}

function renderCodeSpans(md) {
  let out = '';
  let last = 0;
  for (const m of md.matchAll(CODE_SPAN_RE)) {
    out += `${escapeHtml(md.slice(last, m.index))}<code>${escapeHtml(m[2])}</code>`;
    last = m.index + m[0].length;
  }
  return out + escapeHtml(md.slice(last));
}

// 굵게는 코드 밖의 `**` 쌍만 본다 — 코드 구간을 같은 길이의 NUL 로 가린 문자열에서 찾으면 위치가 원문과 그대로 맞는다.
// 그래서 `**\`x\` 설명**` 처럼 굵게 안의 코드도 렌더된다.
export function renderInline(md) {
  const masked = md.replace(CODE_SPAN_RE, (span) => '\u0000'.repeat(span.length));
  let out = '';
  let last = 0;
  for (const m of masked.matchAll(BOLD_RE)) {
    out += `${renderCodeSpans(md.slice(last, m.index))}<strong>${renderCodeSpans(md.slice(m.index + 2, m.index + m[0].length - 2))}</strong>`;
    last = m.index + m[0].length;
  }
  return out + renderCodeSpans(md.slice(last));
}

function renderList(list) {
  const tag = list.ordered ? 'ol' : 'ul';
  const items = list.items.map(item => `<li>${renderInline(item.text)}${item.children ? renderList(item.children) : ''}</li>`);
  return `<${tag}>${items.join('')}</${tag}>`;
}

function renderBlock(block) {
  switch (block.type) {
    case 'paragraph': return `<p>${renderInline(block.text)}</p>`;
    case 'heading': return `<h3>${renderInline(block.text)}</h3>`;
    case 'code': return `<pre><code>${escapeHtml(block.text)}</code></pre>`;
    case 'list': return renderList(block);
    case 'table': {
      const head = `<thead><tr>${block.header.map(c => `<th>${renderInline(c)}</th>`).join('')}</tr></thead>`;
      const body = block.rows.map(r => `<tr>${r.map(c => `<td>${renderInline(c)}</td>`).join('')}</tr>`).join('');
      return `<table>${head}<tbody>${body}</tbody></table>`;
    }
    default: throw new Error(`unknown block ${block.type}`);
  }
}

function collectOpenItems(blocks, group, out) {
  const walk = (list) => {
    for (const item of list.items) {
      if (OPEN_MARK_RE.test(item.text.replace(CODE_SPAN_RE, ''))) out.push({ group, text: item.text });
      if (item.children) walk(item.children);
    }
  };
  for (const block of blocks) if (block.type === 'list') walk(block);
}

// spec 텍스트 → { html, slides, missing, openItems, scenarios, scenarioIssue }. 순수 함수 — 같은 입력이면 같은 바이트.
export function renderBrief(spec) {
  const doc = splitDocument(stripComments(spec.split(/\r?\n/)));
  const slides = [];
  const titles = [];
  const missing = [];
  const seen = new Set();

  for (const section of doc.sections) {
    const def = SECTIONS.find(d => d.match(section.title));
    if (!def) continue;
    const parts = def.only
      ? section.subs.filter(s => def.only(s.title)).map(s => ({ parent: section.title, title: s.title, lines: s.lines }))
      : [{ parent: null, title: section.title, lines: section.lines },
        ...section.subs.map(s => ({ parent: section.title, title: s.title, lines: s.lines }))];
    for (const part of parts) {
      const blocks = parseBlocks(part.lines);
      if (!blocks.length) continue;
      seen.add(def);
      const src = part.parent === null ? '' : `<p class="src">${renderInline(part.parent)}</p>`;
      slides.push(`<section class="slide">${src}<h2>${renderInline(part.title)}</h2>${blocks.map(renderBlock).join('')}</section>`);
      titles.push(part.parent === null ? part.title : `${part.parent} › ${part.title}`);
    }
  }
  for (const def of SECTIONS) if (!seen.has(def)) missing.push(def.label);

  const open = [];
  if (doc.preamble.length) collectOpenItems(parseBlocks(doc.preamble), doc.h1, open);
  for (const section of doc.sections) {
    collectOpenItems(parseBlocks(section.lines), section.title, open);
    for (const s of section.subs) collectOpenItems(parseBlocks(s.lines), s.title, open);
  }
  if (open.length) {
    const groups = [];
    for (const item of open) {
      const g = groups.find(x => x.group === item.group) ?? (groups.push({ group: item.group, items: [] }), groups[groups.length - 1]);
      g.items.push(item.text);
    }
    const body = groups.map(g => `${g.group === null ? '' : `<p class="src">${renderInline(g.group)}</p>`}<ul>${g.items.map(t => `<li>${renderInline(t)}</li>`).join('')}</ul>`);
    slides.push(`<section class="slide">${body.join('')}</section>`);
    titles.push('(open)');
  }

  // done 가드와 같은 판정 — 주석 처리된 예시나 invalid 선언의 시나리오는 선언이 아니다(파서는 configured 일 때만 scenarios 를 싣는다).
  const declaration = parseDoneEvidenceDeclaration(spec);
  const scenarios = declaration.scenarios ?? [];
  const scenarioIssue = declaration.status === 'invalid' ? declaration.reason : null;
  if (scenarios.length) {
    const doneTitle = doc.sections.find(s => s.title.startsWith('Done evidence'))?.title ?? 'Done evidence';
    const tables = scenarios.map(s => `<table><tbody>${SCENARIO_KEYS.map(k => `<tr><th>${k}</th><td>${escapeHtml(s[k])}</td></tr>`).join('')}</tbody></table>`);
    slides.push(`<section class="slide"><p class="src">${renderInline(doneTitle)}</p><h2>scenarios</h2>${tables.join('')}</section>`);
    titles.push(`${doneTitle} › scenarios`);
  }

  const cover = doc.h1 === null ? '' : `<section class="slide cover"><h1>${renderInline(doc.h1)}</h1></section>\n`;
  const html = `<!doctype html>
<!-- 생성물 — harness-team brief 가 spec 에서 렌더한다. 손으로 고치지 말고 spec 을 고친 뒤 다시 생성한다. -->
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${doc.h1 === null ? '' : escapeHtml(doc.h1)}</title>
<style>
${STYLE}
</style>
</head>
<body>
<main>
${cover}${slides.join('\n')}
</main>
</body>
</html>
`;
  return { html, slides: slides.length, titles, missing, openItems: open.length, scenarios: scenarios.length, scenarioIssue };
}

function usage(json, message) {
  process.exitCode = 2;
  if (json) {
    emitObservation(buildEnvelope({
      command: 'brief',
      status: 'error',
      summary: `brief 실패: ${message}`,
      error: buildErrorPacket({
        cause: message,
        retry: USAGE,
        safeDefault: '아무 파일도 쓰지 않았다',
        stop: '인자를 고치기 전에는 다시 실행하지 말 것',
      }),
    }));
    return;
  }
  console.error(`brief: ${message}`);
  console.error(USAGE);
}

function emitError(json, summary, packet) {
  process.exitCode = 1;
  if (json) {
    emitObservation(buildEnvelope({ command: 'brief', status: 'error', summary, error: packet }));
    return;
  }
  console.log(`✗ brief: ${summary}`);
  for (const line of renderErrorPacket(packet)) console.log(line);
}

export async function runBrief(ctx) {
  const json = !!(ctx.flags && ctx.flags.json);
  const stage = (ctx.flags && ctx.flags.stage) || 'spec';
  // CLI 는 FLAG_CHOICES 가 먼저 거른다. 직접 호출도 모르는 단계를 조용히 spec 으로 렌더하지 않게 여기서 한 번 더 막는다.
  if (!BRIEF_STAGES.includes(stage)) { usage(json, `알 수 없는 --stage "${stage}" (허용: ${BRIEF_STAGES.join('|')})`); return; }
  if ((ctx.taskArgs || []).length) { usage(json, `위치 인자를 받지 않음: ${ctx.taskArgs.join(' ')}`); return; }

  const active = await readActive(ctx.targetDir);
  if (!active || !active.task) {
    emitError(json, '활성 task 없음', buildErrorPacket({
      cause: '.harness/active.json 에 활성 task가 없어 렌더할 spec 을 찾을 수 없음',
      retry: '`harness-team task <name>` 로 task를 활성화한 뒤 다시 실행',
      safeDefault: '아무 파일도 쓰지 않았다',
      stop: 'task가 하나도 없으면 먼저 task를 생성하라',
    }));
    return;
  }
  const { user, task } = active;
  const specRel = taskFileRel(user, task, 'spec.md');
  const briefRel = taskFileRel(user, task, 'brief.html');
  const specPath = taskFilePath(ctx.targetDir, user, task, 'spec.md');
  if (!(await exists(specPath))) {
    emitError(json, `${specRel} 이 없음`, buildErrorPacket({
      cause: `${specRel} 이 없음`,
      retry: '`/harness-spec` 으로 spec 을 쓴 뒤 다시 실행',
      safeDefault: '아무 파일도 쓰지 않았다',
      stop: 'spec 없이 슬라이드를 만들지 말 것 — 슬라이드의 사실은 spec 에서만 온다',
    }));
    return;
  }

  const result = renderBrief(await readFile(specPath, 'utf8'));
  if (!result.slides) {
    emitError(json, `${specRel} 에 렌더할 절이 없음`, buildErrorPacket({
      cause: `${SECTIONS.map(d => d.label).join(' · ')} 가 모두 없거나 비어 있고, 열린 항목·scenarios 도 없음`,
      retry: 'spec 의 그 절들을 채운 뒤 다시 실행',
      safeDefault: '아무 파일도 쓰지 않았다',
      stop: '빈 슬라이드를 만들지 말 것',
    }));
    return;
  }
  await writeText(taskFilePath(ctx.targetDir, user, task, 'brief.html'), result.html);

  const summary = `${briefRel} 에 슬라이드 ${result.slides}장 (spec 절만 — 새 사실 0)`;
  if (json) {
    emitObservation(buildEnvelope({
      command: 'brief',
      status: 'success',
      summary,
      artifacts: [briefRel],
      extra: {
        stage, spec: specRel, brief: briefRel, slides: result.slides, sections: result.titles,
        missing: result.missing, openItems: result.openItems, scenarios: result.scenarios, scenarioIssue: result.scenarioIssue,
      },
    }));
    return;
  }
  console.log(`✓ brief: ${summary}`);
  console.log(`  출처: ${specRel}`);
  if (result.missing.length) console.log(`  빠진 절(없거나 비어 있음): ${result.missing.join(' · ')}`);
  if (result.openItems) console.log(`  열린 항목 ${result.openItems}개 — 마지막 쪽 슬라이드`);
  if (result.scenarioIssue) console.log(`  scenarios 생략: Done evidence 선언 invalid — ${result.scenarioIssue}`);
  console.log('  열람: 로컬 브라우저로 연다 (Obsidian 은 .html 을 네이티브로 열지 않는다)');
}

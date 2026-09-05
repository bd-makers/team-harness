import { join } from 'node:path';
import { exists, readTextSafe, writeText } from '../fsx.mjs';
import { buildEnvelope, emitObservation } from '../observation.mjs';
import { collectRuleFiles, mirrorCursorRules } from '../harness.mjs';
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
  const match = RULE_MARKER_RE.exec(content ?? '');
  if (!match) return null;
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
// PROMOTED_SUFFIX_RE(`$` 앵커)가 못 본다. 줄 단위로 다시 합치므로 CRLF 파일은 LF로 정규화된다.
export function annotatePromoted(artifact, index, slug, date) {
  const entry = parseLearnings(artifact).find(e => e.index === index);
  if (!entry) throw new RangeError(`no Learnings entry at index ${index}`);
  const lines = artifact.split(/\r?\n/);
  lines[entry.end] = `${lines[entry.end].replace(/\s+$/, '')} (→ rules/${slug}.md, ${date})`;
  return lines.join('\n');
}

export function parsePathsFlag(value) {
  if (typeof value !== 'string') return [];
  return value.split(',').map(p => p.trim()).filter(Boolean);
}

// Non-destructive merge utilities.
//
// CLAUDE.md merge strategy:
//   Sections managed by the harness are bracketed by HTML comment markers:
//     <!-- harness:section="NAME" begin --> ... <!-- harness:section="NAME" end -->
//   On init (also the re-run path):
//     - If the existing file has the marker pair, replace content INSIDE it.
//     - If the marker is missing, append the new section to the end.
//     - A user-owned region <!-- harness:user:begin --> ... <!-- harness:user:end -->
//       is never touched.
//
// JSON merge strategy (settings.json / .codex/hooks.json):
//   Deep-merge objects; arrays become the union (de-duped by stringified value).

import { createHash } from 'node:crypto';

const SECTION_RE = (name) =>
  new RegExp(
    `<!--\\s*harness:section="${name}"\\s*begin\\s*-->[\\s\\S]*?<!--\\s*harness:section="${name}"\\s*end\\s*-->`,
    'g'
  );

const SECTION_EXTRACT_RE = /<!--\s*harness:section="([\w-]+)"\s*begin\s*-->([\s\S]*?)<!--\s*harness:section="\1"\s*end\s*-->/g;

const BEGIN_RE = (name) => new RegExp(`<!--\\s*harness:section="${name}"\\s*begin\\s*-->`, 'g');
const END_RE = (name) => new RegExp(`<!--\\s*harness:section="${name}"\\s*end\\s*-->`, 'g');
// Thrown instead of merging when a section's begin/end markers do not pair up.
// The caller (planChanges) reports the file and skips it; nothing is written.
export class MarkerMismatchError extends Error {
  constructor(section, begins, ends, detail) {
    super(`harness:section="${section}" 마커가 짝이 맞지 않습니다 (begin ${begins}개 / end ${ends}개 — ${detail}) — 마커를 복구한 뒤 다시 실행하세요`);
    this.code = 'HARNESS_MARKER_MISMATCH';
    this.section = section;
    this.begins = begins;
    this.ends = ends;
  }
}

// Markers must alternate begin, end, begin, end … in document order. Counting alone
// let `end … begin` and `begin begin end end` through, and the next merge then
// spanned from a begin to the wrong end — deleting whatever sat between (codex review
// P2, 2026-09-03).
function assertMarkerPairs(text, name) {
  const marks = [];
  for (const m of text.matchAll(BEGIN_RE(name))) marks.push({ at: m.index, kind: 'begin' });
  for (const m of text.matchAll(END_RE(name))) marks.push({ at: m.index, kind: 'end' });
  marks.sort((a, b) => a.at - b.at);
  const begins = marks.filter(m => m.kind === 'begin').length;
  const ends = marks.length - begins;
  const fail = (detail) => { throw new MarkerMismatchError(name, begins, ends, detail); };
  let open = false;
  for (const { kind } of marks) {
    if (kind === 'begin' && open) fail('begin 다음에 end 없이 begin이 다시 나옵니다');
    if (kind === 'end' && !open) fail('begin 없이 end가 먼저 나옵니다');
    open = kind === 'begin';
  }
  if (open) fail('마지막 begin에 짝이 되는 end가 없습니다');
  // 짝이 맞더라도 같은 이름의 블록이 둘 이상이면 거부한다. extractSections는 **마지막** 블록만
  // 남기는데 SECTION_RE의 replace는 **전부** 교체하므로, 앞 블록만 편집하면 해시는 마지막 블록
  // 기준으로 일치해 "우리 렌더"로 판정되고 앞 블록의 사용자 편집이 조용히 지워진다
  // (codex 리뷰 P2). 어느 블록이 정본인지 기계가 정할 수 없으니 사람에게 넘긴다.
  if (begins > 1) fail(`같은 이름의 블록이 ${begins}개입니다 — 어느 것이 정본인지 알 수 없습니다`);
}

export function extractSections(markdown) {
  const out = {};
  for (const m of markdown.matchAll(SECTION_EXTRACT_RE)) {
    out[m[1]] = m[0]; // full block including markers
  }
  return out;
}

// 관리 절의 provenance 가드(opts.lastRender)는 D8의 설치 측 대응물이다.
//   - lastRender 생략/null → 종전 동작(전부 교체). 기존 호출자 계약을 유지한다.
//   - 절 이름이 lastRender에 없다 → 부트스트랩. stock으로 간주해 교체한다. "사용자 편집으로 간주"를
//     기각한 이유: 그 설치본은 관리 절을 영영 건너뛰고, 해시를 남길 렌더가 일어나지 않아
//     스스로 빠져나오지 못한다(spec 설계 절).
//   - 해시가 있는데 현재 바이트와 다르다 → 사용자가 고친 것. 그 절만 건너뛰고 onSkip으로 보고한다.
export function mergeMarkdown(existing, incoming, opts = {}) {
  if (!existing) return incoming;
  const { lastRender = null, onSkip = null } = opts;
  const incomingSections = extractSections(incoming);
  const existingBlocks = lastRender ? extractSections(existing) : null;
  let result = existing;
  const appended = [];

  for (const [name, block] of Object.entries(incomingSections)) {
    // An unbalanced or mis-ordered pair (a user deleted or moved one marker) used to
    // read as "section absent": the block was appended, and the *next* merge matched
    // from a begin to the wrong end and replaced everything in between — the user
    // region included. Refuse instead.
    assertMarkerPairs(result, name);
    if (SECTION_RE(name).test(result)) {
      if (lastRender && Object.hasOwn(lastRender, name)) {
        const current = existingBlocks[name];
        const currentSha = createHash('sha256').update(current ?? '').digest('hex');
        if (currentSha !== lastRender[name]) {
          onSkip?.(name, current, block);
          continue;
        }
      }
      result = result.replace(SECTION_RE(name), block);
    } else {
      appended.push(block);
    }
  }

  if (appended.length) {
    result = result.replace(/\s*$/, '\n\n') + appended.join('\n\n') + '\n';
  }
  return result;
}

export function deepMergeJson(existing, incoming) {
  if (existing === undefined || existing === null) return incoming;
  if (incoming === undefined || incoming === null) return existing;
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    const seen = new Set(existing.map(v => JSON.stringify(v)));
    const merged = [...existing];
    for (const v of incoming) {
      const key = JSON.stringify(v);
      if (!seen.has(key)) { seen.add(key); merged.push(v); }
    }
    return merged;
  }
  if (typeof existing === 'object' && typeof incoming === 'object' && !Array.isArray(existing) && !Array.isArray(incoming)) {
    const out = { ...existing };
    for (const k of Object.keys(incoming)) {
      out[k] = deepMergeJson(existing[k], incoming[k]);
    }
    return out;
  }
  return incoming; // scalar override
}

export function simpleDiff(oldText, newText) {
  if (oldText === newText) return '(identical)';
  const oldLines = (oldText ?? '').split('\n');
  const newLines = (newText ?? '').split('\n');
  const out = [];
  const max = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < max; i++) {
    if (oldLines[i] !== newLines[i]) {
      if (oldLines[i] !== undefined) out.push(`- ${oldLines[i]}`);
      if (newLines[i] !== undefined) out.push(`+ ${newLines[i]}`);
    }
  }
  return out.slice(0, 200).join('\n') + (out.length > 200 ? `\n... (+${out.length - 200} more)` : '');
}

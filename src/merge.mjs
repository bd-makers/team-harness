// Non-destructive merge utilities.
//
// CLAUDE.md merge strategy:
//   Sections managed by the harness are bracketed by HTML comment markers:
//     <!-- harness:section="NAME" begin --> ... <!-- harness:section="NAME" end -->
//   On apply:
//     - If the existing file has the marker pair, replace content INSIDE it.
//     - If the marker is missing, append the new section to the end.
//     - A user-owned region <!-- harness:user:begin --> ... <!-- harness:user:end -->
//       is never touched.
//
// JSON merge strategy (settings.json / opencode.json):
//   Deep-merge objects; arrays become the union (de-duped by stringified value).

const SECTION_RE = (name) =>
  new RegExp(
    `<!--\\s*harness:section="${name}"\\s*begin\\s*-->[\\s\\S]*?<!--\\s*harness:section="${name}"\\s*end\\s*-->`,
    'g'
  );

const SECTION_EXTRACT_RE = /<!--\s*harness:section="([\w-]+)"\s*begin\s*-->([\s\S]*?)<!--\s*harness:section="\1"\s*end\s*-->/g;

export function extractSections(markdown) {
  const out = {};
  for (const m of markdown.matchAll(SECTION_EXTRACT_RE)) {
    out[m[1]] = m[0]; // full block including markers
  }
  return out;
}

export function mergeMarkdown(existing, incoming) {
  if (!existing) return incoming;
  const incomingSections = extractSections(incoming);
  let result = existing;
  const appended = [];

  for (const [name, block] of Object.entries(incomingSections)) {
    if (SECTION_RE(name).test(result)) {
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

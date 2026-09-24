// task 경로·식별자는 src/task-paths.mjs 한 곳에서만 조립한다 — 흩어진 `join(targetDir, 'docs', user, task)` 가
// 경로 규칙을 바꾸지 못하게 만든 근본 원인이었다(docs/spec-monorepo-scope.md §2). 새 조립 지점이 생기면 여기서 빨개진다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// `'docs'`·`"docs"` 를 join/resolve 에 넣거나, `docs/${…}` 를 쓰거나, `${…user}/${…task|name}` 식별자를 직접 만드는 줄.
// 줄 단위 트립와이어라 증명이 아니다 — 여러 줄에 걸친 join 호출이나 `DOCS_DIR` 를 import 해 우회한 조립은 못 잡는다.
const ASSEMBLY_RE = /(?:join|resolve)\([^)\n]*['"]docs['"]|docs\/\$\{|\$\{[\w.]*user\}\/\$\{[\w.]*(?:task|name)\}/;

// 허용: task 경로가 아닌 docs 템플릿 시드 복사.
const ALLOWED_LINES = new Map([
  ['src/harness.mjs', [/copyTree\(join\(tplDir, 'docs'\), join\(ctx\.targetDir, 'docs'\)/]],
]);
// 허용: migrate 의 동결된 레거시 구간 — 옛 구조를 서술하므로 헬퍼 모양과 달라야 한다.
const LEGACY_START = '// --- Task structure migration (pre-0.6.0 → 0.6.0) ---';
const LEGACY_END = '// --- Backup dir script migration';

async function sourceFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await sourceFiles(p));
    else if (e.name.endsWith('.mjs')) out.push(p);
  }
  return out;
}

test('task 경로 조립은 src/task-paths.mjs 밖에 없다 (허용 목록 제외)', async () => {
  const offenders = [];
  for (const file of [...await sourceFiles(join(ROOT, 'src')), ...await sourceFiles(join(ROOT, 'bin'))]) {
    const rel = relative(ROOT, file).split('\\').join('/');
    if (rel === 'src/task-paths.mjs') continue;
    const lines = (await readFile(file, 'utf8')).split('\n');
    let legacy = false;
    lines.forEach((line, i) => {
      if (rel === 'src/commands/migrate.mjs') {
        if (line.startsWith(LEGACY_START)) legacy = true;
        if (line.startsWith(LEGACY_END)) legacy = false;
      }
      if (legacy || /^\s*\/\//.test(line) || !ASSEMBLY_RE.test(line)) return;
      if ((ALLOWED_LINES.get(rel) || []).some(re => re.test(line))) return;
      offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, [], 'src/task-paths.mjs 의 헬퍼를 쓰세요');
});

test('migrate 레거시 구간 표지가 둘 다 있다 — 없으면 위 허용 구간이 조용히 넓어지거나 사라진다', async () => {
  const src = await readFile(join(ROOT, 'src/commands/migrate.mjs'), 'utf8');
  const start = src.indexOf(LEGACY_START);
  const end = src.indexOf(LEGACY_END);
  assert.ok(start >= 0 && end > start);
});

// docs/prerequisites.md는 `harness-team doctor`가 런타임에 검사하는 외부 도구를 설명한다.
// 두 목록이 어긋나면 문서가 거짓말이 되므로 여기서 양방향으로 고정한다:
//   1) doctor가 검사하는 도구가 문서에 없다  → 새 도구를 doctor에만 추가한 드리프트
//   2) 문서에 있는 도구를 doctor가 검사하지 않는다 → "doctor가 확인해 준다"는 거짓 안내
// 방향 1만으로는 영원히 통과하므로 실제로 잡아 주는 쪽은 방향 2다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { EXTERNAL_TOOLS } from '../src/commands/doctor.mjs';

const ROOT = resolve(dirname(dirname(fileURLToPath(import.meta.url))));
const DOC = 'docs/prerequisites.md';
const read = (path) => readFile(join(ROOT, path), 'utf8');

// 표는 한국어 제목이 아니라 주석 마커로 감싸 찾는다 — 제목 문구를 다듬어도 테스트가 깨지지 않는다.
function externalToolRows(doc) {
  const block = doc.match(
    /<!-- prerequisites:external-tools[\s\S]*?-->\n([\s\S]*?)<!-- \/prerequisites:external-tools -->/,
  );
  assert.ok(block, `${DOC}: prerequisites:external-tools 마커 블록을 찾지 못했습니다`);

  return block[1]
    .split('\n')
    .filter((line) => line.startsWith('|'))
    // 헤더행(| 도구 | …)과 구분행(|---|)을 제외하고, 첫 열이 백틱으로 감싼 명령인 행만 취한다.
    .map((line) => line.match(/^\|\s*`([^`]+)`\s*\|/))
    .filter(Boolean)
    .map((match) => match[1]);
}

test('prerequisites 문서의 외부 도구 표는 doctor의 EXTERNAL_TOOLS와 1:1이다', async () => {
  const doc = await read(DOC);
  const documented = externalToolRows(doc);
  const checked = EXTERNAL_TOOLS.map(({ cmd }) => cmd);

  assert.ok(checked.length > 0, 'EXTERNAL_TOOLS가 비어 있습니다');
  assert.equal(
    new Set(documented).size, documented.length,
    `${DOC}: 외부 도구 표에 중복 행이 있습니다 — ${documented.join(', ')}`,
  );

  // 방향 1 — doctor가 검사하는 도구는 전부 문서에 있어야 한다.
  for (const cmd of checked) {
    assert.ok(
      documented.includes(cmd),
      `doctor는 \`${cmd}\`를 검사하는데 ${DOC}의 능력 매트릭스에 행이 없습니다`,
    );
  }

  // 방향 2 — 문서가 나열한 도구는 전부 doctor가 실제로 검사해야 한다.
  for (const cmd of documented) {
    assert.ok(
      checked.includes(cmd),
      `${DOC}가 \`${cmd}\`를 나열하지만 doctor의 EXTERNAL_TOOLS에 없습니다 — doctor가 확인해 주지 않습니다`,
    );
  }
});

test('README 사전 준비 절이 상세 문서를 가리킨다', async () => {
  const readme = await read('README.md');

  assert.match(readme, /^## 사전 준비$/m, 'README에 "## 사전 준비" 절이 필요합니다');
  assert.match(
    readme, /\.\/docs\/prerequisites\.md/,
    'README 사전 준비 절은 docs/prerequisites.md로 링크해야 합니다',
  );
  // 새 절이 생기기 전의 문구. 남아 있으면 두 곳이 서로 모순된 요구사항을 말한다.
  assert.doesNotMatch(
    readme, /Node\.js 18\+\. 외부 의존성 없음/,
    'README의 옛 "### 요구사항" 문구가 새 사전 준비 절과 모순됩니다',
  );
});

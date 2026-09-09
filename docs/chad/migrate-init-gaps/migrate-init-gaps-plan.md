# migrate-init-gaps — Plan

> **For agentic workers:** 이 plan은 `superpowers:subagent-driven-development` 또는
> `superpowers:executing-plans`로 task 단위 실행한다. `## 단계`의 체크박스는 산문이 아니라
> `harness-team done` 가드의 기계 입력이다 — **하지 않은 단계를 미리 `- [x]`로 켜지 않는다.**

**Goal:** `migrate` → `init` 경로에서 (1) 배선했지만 설치하지 않은 훅, (2) 관리 절의 사용자 편집 소실,
(3) doctor의 dangling 참조 침묵 — 세 결함을 없앤다.

**Architecture:** 관리 절에 **렌더 provenance**를 도입한다 — 마지막으로 하네스가 렌더한 절의 sha256을
`.harness/render-state.json`(커밋 대상)에 기록하고, `init` 재실행은 **절의 현재 바이트가 그 해시와 일치할 때만**
교체한다. 불일치하면 그 절만 건너뛰고 경고한다(`--yes` 포함). 해시가 없는 기존 설치본은 stock으로 간주해
1회 교체하되, `migrate`가 그 전에 원본을 백업하고 diff를 경고로 보여준다. `migrate`의 SessionStart 병합은
`session-context` 항목으로 좁히고 그 훅이 필요로 하는 파일을 함께 설치한다. `doctor`는 settings의
`command`에서 프로젝트 내부 경로만 골라 존재를 검사하고, 해석 못 한 command는 `unknown`으로 보고한다.

**Tech Stack:** Node.js (ESM, `node:test` + `node:assert/strict`), npm. 외부 의존성 추가 없음.

**Spec:** [`migrate-init-gaps-spec.md`](./migrate-init-gaps-spec.md)

## Global Constraints

- 사용자 편집 보존 원칙(D8) 유지. 새 플래그보다 기존 명령의 계약 수정을 우선.
- `--yes` = **"묻지 말고 안전한 기본값으로 진행"**. 사용자 텍스트를 지우게 되는 절은 `--yes`에서도
  건너뛰고 경고한다. **실패시키지 않는다**(exit code 유지).
- `migrate`의 정의 = **"구조를 최신으로 옮긴다"**. "설치를 템플릿과 동일하게 만든다"가 아니다.
  사용자가 의도적으로 지운 선택적 훅(`observe-tools` 등)은 되살리지 않는다.
- `refreshClaudeHooks`의 `installed === null → continue` 불변식은 **유지**한다. 결함 1의 파일 설치는
  그 함수가 아니라 `migrateSessionStartHook`이 자기가 배선한 항목에 한해 책임진다.
- 관리 절은 다섯: `protocol` · `roles` · `workflow` · `stack` · `principles`.
- 테스트: `npm test`. 개발 중 CLI는 `node bin/harness-team.mjs`(전역 `harness-team`은 마켓플레이스 clone).
- iCloud 저장소 — 커밋마다 `git show --stat HEAD`로 실린 파일을 대조한다.

## 파일 구조

| 파일 | 책임 | 신규/수정 |
|---|---|---|
| `src/render-state.mjs` | `.harness/render-state.json` 읽기·쓰기, 관리 절 sha256 계산 | **신규** |
| `src/merge.mjs` | `mergeMarkdown`에 provenance 가드(옵션) 추가 — 기본 동작 불변 | 수정 |
| `src/harness.mjs` | `planChanges`가 가드를 통과시키고, 쓴 절의 해시를 반환 | 수정 |
| `src/commands/init.mjs` | 건너뛴 절 경고 · 렌더 상태 저장 | 수정 |
| `src/commands/migrate.mjs` | SessionStart 병합 좁히기 + 훅 파일 설치, 관리 절 백업·diff | 수정 |
| `src/commands/doctor.mjs` | settings `command`의 dangling·unknown 검사 | 수정 |
| `tests/render-state.test.mjs` | Task 1 | **신규** |
| `tests/managed-section-provenance.test.mjs` | Task 2·3 | **신규** |
| `tests/migrate-session-hook.test.mjs` | Task 4 (기존 파일에 추가) | 수정 |
| `tests/doctor.test.mjs` | Task 5 (기존 파일에 추가) | 수정 |
| `tests/migrate-managed-backup.test.mjs` | Task 6 | **신규** |
| `tests/e2e/legacy-migrate-init.test.mjs` | Task 7 통합 재현 | **신규** |

## 단계

### Task 1: 렌더 상태 저장소 (`src/render-state.mjs`)

**Files:**
- Create: `src/render-state.mjs`
- Create: `tests/render-state.test.mjs`

**Interfaces:**
- Produces:
  - `sectionHashes(markdown: string): Record<string, string>` — 마커 블록 **전체**(마커 포함)의 sha256
  - `loadRenderState(targetDir: string): Promise<{version:number, sections:Record<string,Record<string,string>>}>`
    — 파일이 없거나 깨졌으면 `{ version: 1, sections: {} }`
  - `saveRenderState(targetDir: string, state): Promise<void>` — `.harness/render-state.json`, 2-space JSON + 개행
  - `RENDER_STATE_REL = '.harness/render-state.json'`
- Consumes: `extractSections`(`src/merge.mjs`), `readTextSafe`·`writeText`(`src/fsx.mjs`)

- [x] **Step 1: 실패하는 테스트 작성** — `tests/render-state.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { sectionHashes, loadRenderState, saveRenderState, RENDER_STATE_REL } from '../src/render-state.mjs';

const BLOCK = '<!-- harness:section="stack" begin -->\n- npm\n<!-- harness:section="stack" end -->';
const DOC = `# T\n\n${BLOCK}\n\ntail\n`;

test('sectionHashes: 마커 포함 블록 전체의 sha256', () => {
  const h = sectionHashes(DOC);
  assert.deepEqual(Object.keys(h), ['stack']);
  assert.equal(h.stack, createHash('sha256').update(BLOCK).digest('hex'));
});

test('sectionHashes: 마커 없는 문서는 빈 객체', () => {
  assert.deepEqual(sectionHashes('# nothing here\n'), {});
});

test('loadRenderState: 파일 없음 → 빈 기본값', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-rs-'));
  assert.deepEqual(await loadRenderState(dir), { version: 1, sections: {} });
});

test('loadRenderState: 깨진 JSON → 빈 기본값 (throw 하지 않는다)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-rs-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(join(dir, RENDER_STATE_REL), '{ not json');
  assert.deepEqual(await loadRenderState(dir), { version: 1, sections: {} });
});

test('saveRenderState → loadRenderState 왕복', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-rs-'));
  const state = { version: 1, sections: { 'AGENTS.md': { stack: 'abc' } } };
  await saveRenderState(dir, state);
  assert.deepEqual(await loadRenderState(dir), state);
  const raw = await readFile(join(dir, RENDER_STATE_REL), 'utf8');
  assert.ok(raw.endsWith('\n'), '파일은 개행으로 끝난다');
});
```

- [x] **Step 2: 실패 확인**

Run: `node --test tests/render-state.test.mjs`
Expected: FAIL — `Cannot find module '../src/render-state.mjs'`

- [x] **Step 3: 최소 구현** — `src/render-state.mjs`

```js
// 관리 절의 "마지막 렌더 결과" 해시 저장소.
//
// D8의 provenance refresh는 **출하 sha 테이블**로 판정한다(migrate.mjs). 관리 절에는 그 테이블을
// 만들 수 없다 — 렌더 결과가 프로젝트마다 다르기 때문이다(stack은 감지 결과, roles는 사용자명).
// 그래서 판정 근거를 설치 측에 둔다. 목적은 D8과 같고 소재지만 출하 측 → 설치 측으로 옮긴 것이다.
//
// 이 파일은 **커밋 대상**이다. .gitignore가 `.harness/`를 통째로 무시하면 팀원이 clone한 뒤
// 첫 init마다 부트스트랩 판정(= stock 간주 = 1회 덮어쓰기)이 다시 일어난다.
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { readTextSafe, writeText } from './fsx.mjs';
import { extractSections } from './merge.mjs';

export const RENDER_STATE_REL = '.harness/render-state.json';

const EMPTY = () => ({ version: 1, sections: {} });

// 마커를 포함한 블록 전체를 해싱한다 — mergeMarkdown이 교체하는 단위가 바로 그 블록이다.
export function sectionHashes(markdown) {
  const out = {};
  for (const [name, block] of Object.entries(extractSections(markdown ?? ''))) {
    out[name] = createHash('sha256').update(block).digest('hex');
  }
  return out;
}

export async function loadRenderState(targetDir) {
  const raw = await readTextSafe(join(targetDir, RENDER_STATE_REL));
  if (!raw) return EMPTY();
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || typeof data.sections !== 'object' || data.sections === null) return EMPTY();
    return { version: data.version ?? 1, sections: data.sections };
  } catch { return EMPTY(); }
}

export async function saveRenderState(targetDir, state) {
  await writeText(join(targetDir, RENDER_STATE_REL), JSON.stringify(state, null, 2) + '\n');
}
```

- [x] **Step 4: 통과 확인**

Run: `node --test tests/render-state.test.mjs`
Expected: PASS (5 tests)

- [x] **Step 5: 커밋**

```bash
git add src/render-state.mjs tests/render-state.test.mjs
git commit -m "feat(render-state): 관리 절 렌더 해시 저장소 추가 (migrate-init-gaps plan 1)"
git show --stat HEAD
```

---

### Task 2: `mergeMarkdown` provenance 가드

**Files:**
- Modify: `src/merge.mjs:66-89` (`mergeMarkdown`)
- Create: `tests/managed-section-provenance.test.mjs`

**Interfaces:**
- Consumes: `sectionHashes`(Task 1)
- Produces: `mergeMarkdown(existing, incoming, opts?)`
  - `opts.lastRender?: Record<string,string> | null` — 절 이름 → 마지막 렌더 sha256.
    `null`/생략이면 **기존 동작 그대로**(전부 교체) — 기존 호출자·테스트를 깨지 않는다.
  - `opts.onSkip?: (name: string, currentBlock: string, renderedBlock: string) => void`
  - 반환값은 종전대로 **문자열**이다.

- [x] **Step 1: 실패하는 테스트 작성** — `tests/managed-section-provenance.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeMarkdown } from '../src/merge.mjs';
import { sectionHashes } from '../src/render-state.mjs';

const block = (body) => `<!-- harness:section="stack" begin -->\n${body}\n<!-- harness:section="stack" end -->`;
const doc = (body) => `# P\n\n${block(body)}\n`;

const RENDERED = doc('- pip');
const OURS = doc('- npm');          // 하네스가 지난번에 렌더한 것
const EDITED = doc('- uv (사용자)'); // 사용자가 고친 것

test('lastRender 없음 → 종전 동작(전부 교체)', () => {
  assert.equal(mergeMarkdown(EDITED, RENDERED), RENDERED);
});

test('현재 내용이 lastRender와 일치 → 교체', () => {
  const merged = mergeMarkdown(OURS, RENDERED, { lastRender: sectionHashes(OURS) });
  assert.equal(merged, RENDERED);
});

test('현재 내용이 lastRender와 불일치 → 그 절만 건너뛰고 onSkip 보고', () => {
  const skipped = [];
  const merged = mergeMarkdown(EDITED, RENDERED, {
    lastRender: sectionHashes(OURS),
    onSkip: (name) => skipped.push(name),
  });
  assert.equal(merged, EDITED, '사용자 편집이 그대로 남는다');
  assert.deepEqual(skipped, ['stack']);
});

test('lastRender에 그 절이 없음(부트스트랩) → stock 간주, 교체', () => {
  const skipped = [];
  const merged = mergeMarkdown(EDITED, RENDERED, { lastRender: {}, onSkip: (n) => skipped.push(n) });
  assert.equal(merged, RENDERED);
  assert.deepEqual(skipped, [], '부트스트랩은 건너뛰기가 아니다');
});

test('마커가 아예 없는 파일 → 종전대로 append (가드와 무관)', () => {
  const merged = mergeMarkdown('# P\n', RENDERED, { lastRender: {} });
  assert.ok(merged.includes('- pip'));
});
```

- [x] **Step 2: 실패 확인**

Run: `node --test tests/managed-section-provenance.test.mjs`
Expected: FAIL — 3번째 테스트에서 `merged`가 `RENDERED`가 되어 `assert.equal(merged, EDITED)` 실패

- [x] **Step 3: 구현** — `src/merge.mjs`의 `mergeMarkdown` 교체

```js
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
```

`src/merge.mjs` 맨 위에 import 한 줄 추가:

```js
import { createHash } from 'node:crypto';
```

> `render-state.mjs`가 `merge.mjs`를 import하므로 역방향 import는 순환이 된다 —
> 해시 계산은 `createHash`를 직접 쓴다.

- [x] **Step 4: 통과 확인**

Run: `node --test tests/managed-section-provenance.test.mjs tests/agent-files.test.mjs`
Expected: PASS — 신규 5개 + 기존 agent-files 테스트 전부(3번째 인자 없는 호출은 동작 불변)

- [x] **Step 5: 커밋**

```bash
git add src/merge.mjs tests/managed-section-provenance.test.mjs
git commit -m "feat(merge): 관리 절 provenance 가드 — 사용자 편집 절은 건너뛴다 (migrate-init-gaps plan 2)"
git show --stat HEAD
```

---

### Task 3: `init` 배선 — 경고·dry-run·상태 저장

**Files:**
- Modify: `src/harness.mjs:81-117` (`planChanges`의 agent 파일 루프), 반환 객체
- Modify: `src/commands/init.mjs` (경고 출력 · `saveRenderState` 호출)
- Modify: `tests/managed-section-provenance.test.mjs` (통합 케이스 추가)

**Interfaces:**
- Consumes: `mergeMarkdown(…, {lastRender, onSkip})`(Task 2), `loadRenderState`·`saveRenderState`·`sectionHashes`(Task 1)
- Produces: `planChanges(...)` 반환 객체에 두 필드 추가
  - `skippedSections: Array<{ file: string, section: string, diff: string }>`
  - `renderState: { version: 1, sections: Record<string, Record<string,string>> }`
    — **하네스가 방금 렌더한 블록과 최종 내용이 일치하는 절만** 담는다. 건너뛴 절은 담지 않는다
    (사용자 편집을 "우리 렌더"로 각인시키면 다음 실행이 그것을 덮는다).

- [x] **Step 1: 실패하는 테스트 추가** — `tests/managed-section-provenance.test.mjs` 끝에

```js
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { planChanges } from '../src/harness.mjs';
import { saveRenderState, RENDER_STATE_REL } from '../src/render-state.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ctxFor = (dir) => ({ root: ROOT, targetDir: dir, flags: {} });

async function projectWithAgents(body) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-prov-init-'));
  await mkdir(join(dir, '.claude'), { recursive: true });
  await writeFile(join(dir, 'AGENTS.md'), body);
  return dir;
}

test('planChanges: 해시 있고 사용자가 고친 절 → skippedSections에 담기고 변경에서 빠진다', async () => {
  const dir = await projectWithAgents('# P\n\n<!-- harness:section="stack" begin -->\n- 사용자가 고침\n<!-- harness:section="stack" end -->\n');
  await saveRenderState(dir, { version: 1, sections: { 'AGENTS.md': { stack: 'deadbeef' } } });
  const { skippedSections } = await planChanges(ctxFor(dir), { stack: {} });
  const hit = skippedSections.find(s => s.file === 'AGENTS.md' && s.section === 'stack');
  assert.ok(hit, 'stack 절이 건너뛰기로 보고된다');
  assert.ok(hit.diff.length > 0, 'diff가 함께 온다');
});

test('planChanges: 건너뛴 절은 이전 렌더 해시를 그대로 이어받는다', async () => {
  const dir = await projectWithAgents('# P\n\n<!-- harness:section="stack" begin -->\n- 사용자가 고침\n<!-- harness:section="stack" end -->\n');
  await saveRenderState(dir, { version: 1, sections: { 'AGENTS.md': { stack: 'deadbeef' } } });
  const { renderState } = await planChanges(ctxFor(dir), { stack: {} });
  // 두 가지를 동시에 지켜야 한다:
  //  (1) 사용자 편집의 해시를 기록하지 않는다 — 기록하면 다음 실행이 "우리 렌더"로 보고 덮는다.
  //  (2) 이전 렌더 해시를 지우지도 않는다 — 지우면 다음 실행이 부트스트랩으로 판정해 역시 덮는다.
  // 즉 보호가 딱 한 번만 걸리는 버그를 (2)가 막는다.
  assert.equal(renderState.sections['AGENTS.md'].stack, 'deadbeef',
    '건너뛴 절의 이전 해시는 보존된다 (지우면 다음 실행이 부트스트랩으로 덮는다)');
});
```

- [x] **Step 2: 실패 확인**

Run: `node --test tests/managed-section-provenance.test.mjs`
Expected: FAIL — `skippedSections` / `renderState`가 `undefined`

- [x] **Step 3: `planChanges` 수정** — `src/harness.mjs`

import 추가:

```js
import { loadRenderState, sectionHashes } from './render-state.mjs';
```

`planChanges` 본문 — `changes`/`legacyAgentFiles`/`brokenMarkerFiles` 선언 다음에:

```js
  const skippedSections = [];
  const priorState = await loadRenderState(targetDir);
  // 이전 상태를 기본값으로 깔고 시작한다. 루프가 어떤 이유로든 파일을 건너뛰어도
  // (symlink 레거시 · 마커 깨짐 · 템플릿 없음 → continue) 그 파일의 해시가 통째로
  // 지워지지 않는다 — 지우면 다음 실행이 부트스트랩으로 판정해 덮는다.
  const renderState = { version: 1, sections: { ...priorState.sections } };
```

agent 파일 루프의 `merged = mergeMarkdown(existing, rendered);` 를 다음으로 교체:

```js
      merged = mergeMarkdown(existing, rendered, {
        lastRender: priorState.sections[file] ?? null,
        onSkip: (section, current, incoming) => {
          skippedSections.push({ file, section, diff: simpleDiff(current, incoming) });
        },
      });
```

루프 끝(`if (existing !== merged) { … }` 다음)에 해시 기록 추가:

```js
    // 최종 내용이 방금 렌더한 블록과 같은 절만 "우리 것"으로 새로 기록한다.
    // 건너뛴 절은 owned에 들어가지 않는다 — 사용자 편집을 "우리 렌더"로 각인시키면
    // 다음 실행이 그것을 stock으로 보고 덮기 때문이다.
    //
    // 그러나 **이전 해시를 지워서도 안 된다**: saveRenderState는 파일 전체를 교체하므로,
    // 건너뛴 절을 빼고 저장하면 다음 실행에서 그 절이 lastRender에 없어 부트스트랩으로 판정되고
    // 결국 덮인다 — 보호가 딱 한 번만 걸린다. prior를 먼저 깔고 owned를 덮어씌운다.
    const finalHashes = sectionHashes(merged);
    const renderedHashes = sectionHashes(rendered);
    const owned = {};
    for (const [name, sha] of Object.entries(finalHashes)) {
      if (renderedHashes[name] === sha) owned[name] = sha;
    }
    const carried = { ...(priorState.sections[file] ?? {}), ...owned };
    if (Object.keys(carried).length) renderState.sections[file] = carried;
```

반환문 교체:

```js
  return { changes, vars, legacyAgentFiles, brokenMarkerFiles, skippedSections, renderState };
```

- [x] **Step 4: `init` 출력·저장 배선** — `src/commands/init.mjs`

`planChanges` 결과를 구조분해하는 지점에 `skippedSections`, `renderState`를 추가하고,
변경 목록을 보여주는 부분 **뒤**, 확인 프롬프트 **앞**에 경고를 넣는다:

```js
  if (skippedSections.length) {
    console.log('\n⚠️  관리 절에 사용자 편집이 있어 건너뜁니다 (사용자 텍스트를 지우지 않습니다):');
    for (const { file, section, diff } of skippedSections) {
      console.log(`  - ${file} → harness:section="${section}"`);
      console.log(diff.split('\n').map(l => `      ${l}`).join('\n'));
    }
    console.log('  → 템플릿 변경을 반영하려면 위 diff를 보고 직접 옮긴 뒤 다시 실행하세요.');
  }
```

`applyChanges(changes)` **성공 뒤**에 상태를 저장한다:

```js
  await saveRenderState(ctx.targetDir, renderState);
```

import 추가: `import { saveRenderState } from '../render-state.mjs';`

> `--yes`에서도 이 경고는 출력되고 건너뛰기도 그대로 일어난다 — 프롬프트만 생략된다.
> 종료 코드는 바꾸지 않는다(Global Constraints).

**배선 위치를 손으로 확인한다** — 이 단계는 e2e가 잡지 못한다(e2e는 `planChanges`/`saveRenderState`를
직접 부르므로 `init.mjs`가 어디서 저장하든 통과한다). 셋 다 확인할 것:
1. `saveRenderState`가 `applyChanges` **성공 뒤**에 있는가 (앞에 있으면 쓰기 실패 시 거짓 기록이 남는다)
2. 사용자가 확인 프롬프트를 **거절한 경로에서는 저장하지 않는가** (아무것도 안 썼는데 기록하면
   다음 실행이 부트스트랩을 놓친다)
3. `--yes` 경로에서도 저장되는가

Run: `node bin/harness-team.mjs init --yes < /dev/null` (임시 디렉터리에서) → `.harness/render-state.json` 생성 확인

- [x] **Step 5: 통과 확인**

Run: `npm test`
Expected: PASS — 기존 전부 + 신규. 실패하면 `planChanges` 반환값을 구조분해하는 다른 호출자
(`grep -rn "planChanges(" src/ tests/`)를 먼저 확인한다.

- [x] **Step 6: 커밋**

```bash
git add src/harness.mjs src/commands/init.mjs tests/managed-section-provenance.test.mjs
git commit -m "feat(init): 관리 절 사용자 편집 보존 — 건너뛰기 경고 + 렌더 상태 저장 (migrate-init-gaps plan 3)"
git show --stat HEAD
```

---

### Task 4: 결함 1 — SessionStart 배선을 좁히고 훅 파일을 함께 설치

**Files:**
- Modify: `src/commands/migrate.mjs:695-735` (`migrateSessionStartHook`)
- Modify: `tests/migrate-session-hook.test.mjs` (케이스 추가)

**배경(실측):** 템플릿의 `hooks.SessionStart`는 **그룹 하나에 훅 두 개**다 —
`harness-team session-context 2>/dev/null || true` 와 `node "${CLAUDE_PROJECT_DIR}/.claude/hooks/observe-tools.mjs"`.
그룹 통째로 deep-merge하면 두 번째가 함께 들어가는데 `refreshClaudeHooks`는 없는 파일을 설치하지 않는다
(`installed === null → continue`, 유지할 불변식). 그래서 **병합 대상을 첫 번째 항목으로 좁힌다.**

**Interfaces:**
- Produces: `narrowToSessionContext(sessionStartGroups): Array` — 각 그룹의 `hooks`를
  `command`에 `harness-team session-context`가 들어간 항목만 남기고, 빈 그룹은 제거. `migrate.mjs`에서 export.

- [x] **Step 1: 실패하는 테스트 추가** — `tests/migrate-session-hook.test.mjs`

```js
test('SessionStart 병합은 session-context만 — observe-tools를 배선하지 않는다', async () => {
  const dir = await fixture(PRE_GATE);
  try {
    await migrateSessionStartHook(ctxYes(dir));
    const wired = JSON.stringify((await readSettings(dir)).hooks.SessionStart);
    assert.ok(wired.includes('harness-team session-context'), 'task-gate는 배선된다');
    assert.ok(!wired.includes('observe-tools'),
      'migrate는 설치하지 않는 훅을 배선하지 않는다 — init이 설치한다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('migrate가 배선한 훅이 파일을 요구하면 그 파일이 존재한다', async () => {
  const dir = await fixture(PRE_GATE);
  try {
    await migrateSessionStartHook(ctxYes(dir));
    const groups = (await readSettings(dir)).hooks.SessionStart;
    const cmds = groups.flatMap(g => g.hooks.map(h => h.command));
    for (const cmd of cmds) {
      const m = cmd.match(/\$\{CLAUDE_PROJECT_DIR\}\/([^"'\s]+)|(?:^|\s)(\.\/[^"'\s]+)/);
      if (!m) continue; // 전역 CLI — 검사 대상 아님
      const rel = m[1] ?? m[2].replace(/^\.\//, '');
      await stat(join(dir, rel)); // 없으면 throw → 테스트 실패
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
```

- [x] **Step 2: 실패 확인**

Run: `node --test tests/migrate-session-hook.test.mjs`
Expected: FAIL — 첫 테스트가 `observe-tools`를 발견

- [x] **Step 3: 구현** — `src/commands/migrate.mjs`

`migrateSessionStartHook` 위에 헬퍼 추가:

```js
// migrate는 "구조를 최신으로 옮기는" 명령이지 "설치를 템플릿과 동일하게 만드는" 명령이 아니다.
// 템플릿의 SessionStart 그룹에는 task-gate(전역 CLI)와 observe-tools(프로젝트 내부 파일)가 함께 있다.
// 그룹 통째로 병합하면 후자까지 배선되는데, refreshClaudeHooks는 없는 파일을 설치하지 않으므로
// (installed === null → continue — 사용자가 일부러 지운 훅을 되살리지 않기 위한 불변식)
// settings가 없는 파일을 가리키는 상태로 남았다. 배선을 task-gate로 좁혀 그 상태를 없앤다.
// 사용자가 observe-tools를 원하면 init이 설치하며 배선한다.
export function narrowToSessionContext(groups) {
  if (!Array.isArray(groups)) return groups;
  return groups
    .map(group => ({
      ...group,
      hooks: (group?.hooks ?? []).filter(hook =>
        typeof hook?.command === 'string' && hook.command.includes('harness-team session-context')),
    }))
    .filter(group => group.hooks.length > 0);
}
```

`migrateSessionStartHook` 안에서 템플릿을 읽는 줄 다음에 좁히기를 적용:

```js
  const tplRaw = await readTextSafe(join(root, 'templates/.claude/settings.json'));
  const tplSessionStart = narrowToSessionContext(tplRaw ? JSON.parse(tplRaw).hooks?.SessionStart : null);
  if (!tplSessionStart || tplSessionStart.length === 0) {
    console.log('  SessionStart task-gate: 템플릿에 session-context 훅 없음 — 건너뜀');
    return false;
  }
```

- [x] **Step 4: 통과 확인**

Run: `node --test tests/migrate-session-hook.test.mjs tests/migrate.test.mjs tests/observe-tools-entry.test.mjs`
Expected: PASS. `observe-tools-entry` 계열이 "migrate가 observe를 배선한다"를 단언한다면
그 단언이 이번 결정으로 무효가 된 것이다 — 테스트를 `init` 경로로 옮기고 이유를 주석에 남긴다.

- [x] **Step 5: 커밋**

```bash
git add src/commands/migrate.mjs tests/migrate-session-hook.test.mjs
git commit -m "fix(migrate): SessionStart 병합을 session-context로 좁힘 — 설치 안 한 훅을 배선하지 않는다 (migrate-init-gaps plan 4)"
git show --stat HEAD
```

---

### Task 5: 결함 3 — `doctor`의 dangling / unknown 훅 참조 검사

**Files:**
- Modify: `src/commands/doctor.mjs` (CHECKS 루프 뒤에 새 검사 추가)
- Modify: `tests/doctor.test.mjs` (케이스 추가)

**판정 범위(spec 확정):**
1. 프로젝트 상대경로 — `./.claude/hooks/x.sh`
2. `${CLAUDE_PROJECT_DIR}` 접두 경로 — `node "${CLAUDE_PROJECT_DIR}/.claude/hooks/observe-tools.mjs"`
3. 그 외(`harness-team session-context 2>/dev/null || true` 같은 전역 CLI) — **검사하지 않는다.**
   하네스가 `|| true`로 스스로 부재를 허용한다.
4. 1·2·3 어디에도 안 맞는 command — **`unknown`으로 보고한다. 침묵 금지.**
   "경고 0"이 "검사한 범위 안에서만 문제 없음"을 뜻하게 되는 것이 이번 결함의 본질이다.

**Interfaces:**
- Produces (`src/commands/doctor.mjs`에서 export, 테스트가 직접 부른다):
  - `classifyHookCommand(command: string): { kind: 'project-path', rel: string } | { kind: 'global-cli' } | { kind: 'unknown' }`
  - `collectHookCommands(settings): string[]` — `settings.hooks`의 모든 이벤트·그룹을 훑어 `command` 문자열 수집

- [x] **Step 1: 실패하는 테스트 추가** — `tests/doctor.test.mjs`

```js
import { classifyHookCommand, collectHookCommands } from '../src/commands/doctor.mjs';

test('classifyHookCommand: 상대경로 → project-path', () => {
  assert.deepEqual(classifyHookCommand('./.claude/hooks/protect-files.sh'),
    { kind: 'project-path', rel: '.claude/hooks/protect-files.sh' });
});

test('classifyHookCommand: ${CLAUDE_PROJECT_DIR} 접두 → project-path', () => {
  assert.deepEqual(classifyHookCommand('node "${CLAUDE_PROJECT_DIR}/.claude/hooks/observe-tools.mjs"'),
    { kind: 'project-path', rel: '.claude/hooks/observe-tools.mjs' });
});

test('classifyHookCommand: 전역 CLI → global-cli (검사 대상 아님)', () => {
  assert.equal(classifyHookCommand('harness-team session-context 2>/dev/null || true').kind, 'global-cli');
});

test('classifyHookCommand: 해석 불가 → unknown (침묵하지 않는다)', () => {
  assert.equal(classifyHookCommand('cat foo | awk "{print}" > /tmp/x').kind, 'unknown');
});

test('collectHookCommands: 모든 이벤트·그룹에서 command를 모은다', () => {
  const settings = { hooks: {
    SessionStart: [{ hooks: [{ type: 'command', command: 'a' }, { type: 'command', command: 'b' }] }],
    PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: 'c' }] }],
  } };
  assert.deepEqual(collectHookCommands(settings).sort(), ['a', 'b', 'c']);
});
```

그리고 doctor 실행 수준의 재현 케이스(기존 doctor.test.mjs의 프로젝트 fixture 헬퍼를 그대로 쓴다):

```js
test('doctor: settings가 없는 프로젝트 내부 훅을 가리키면 경고한다', async () => {
  const dir = await makeProject(); // 기존 헬퍼
  await writeFile(join(dir, '.claude/settings.json'), JSON.stringify({
    hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'node "${CLAUDE_PROJECT_DIR}/.claude/hooks/ghost.mjs"' }] }] },
  }, null, 2));
  const out = await runDoctorJson(dir); // 기존 헬퍼 (--json)
  const hit = out.checks.find(c => c.status === 'warning' && /ghost\.mjs/.test(c.detail ?? ''));
  assert.ok(hit, 'dangling 참조가 warning으로 보고된다');
});
```

- [x] **Step 2: 실패 확인**

Run: `node --test tests/doctor.test.mjs`
Expected: FAIL — `classifyHookCommand is not a function`

- [x] **Step 3: 구현** — `src/commands/doctor.mjs`

```js
// settings.json의 hook `command`는 세 모양이다(templates/.claude/settings.json):
//   1. ./.claude/hooks/x.sh                                  — 프로젝트 상대경로
//   2. node "${CLAUDE_PROJECT_DIR}/.claude/hooks/x.mjs"      — 변수 접두 경로
//   3. harness-team session-context 2>/dev/null || true      — 전역 CLI + 셸 연산자
// 3번은 하네스가 `|| true`로 스스로 부재를 허용하므로 dangling이 아니다 — 검사하면 오탐이다.
// 어디에도 안 맞는 command는 침묵하지 않고 unknown으로 보고한다: "경고 0"이 "문제 없음"이 아니라
// "검사한 범위 안에서는 문제 없음"을 뜻하게 되는 것이 결함 3의 본질이었다.
const PROJECT_DIR_RE = /\$\{CLAUDE_PROJECT_DIR\}\/([^"'\s]+)/;
const RELATIVE_RE = /(?:^|\s)\.\/([^"'\s]+)/;
const GLOBAL_CLI_RE = /(?:^|\s|\|\||&&|;)\s*harness-team(?:\s|$)/;

export function classifyHookCommand(command) {
  if (typeof command !== 'string' || command.trim() === '') return { kind: 'unknown' };
  const varMatch = command.match(PROJECT_DIR_RE);
  if (varMatch) return { kind: 'project-path', rel: varMatch[1] };
  const relMatch = command.match(RELATIVE_RE);
  if (relMatch) return { kind: 'project-path', rel: relMatch[1] };
  if (GLOBAL_CLI_RE.test(command)) return { kind: 'global-cli' };
  return { kind: 'unknown' };
}

export function collectHookCommands(settings) {
  const events = settings?.hooks;
  if (!events || typeof events !== 'object') return [];
  const out = [];
  for (const groups of Object.values(events)) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      for (const hook of group?.hooks ?? []) {
        if (hook?.type === 'command' && typeof hook.command === 'string') out.push(hook.command);
      }
    }
  }
  return out;
}

// runDoctor 안에서 CHECKS 루프가 끝난 뒤 호출한다.
async function checkWiredHooks(ctx, add) {
  const raw = await readFile(join(ctx.targetDir, '.claude/settings.json'), 'utf8').catch(() => null);
  if (raw === null) return;
  let settings;
  try { settings = JSON.parse(raw); } catch { return; } // 파싱 실패는 기존 json 체크가 이미 보고한다
  for (const command of collectHookCommands(settings)) {
    const c = classifyHookCommand(command);
    if (c.kind === 'global-cli') continue;
    if (c.kind === 'unknown') {
      add('hook command', 'warning', `판정 불가 — 이 command가 가리키는 대상을 검사하지 못했습니다: ${command}`,
        `⚠️  hook command  (판정 불가: ${command})`);
      continue;
    }
    if (await exists(join(ctx.targetDir, c.rel))) continue;
    add(`hook → ${c.rel}`, 'warning',
      `settings.json이 배선한 훅 파일이 없습니다 (dangling) — run: harness-team init`,
      `⚠️  hook → ${c.rel}  (settings.json이 배선했지만 파일 없음 — run: harness-team init)`);
  }
}
```

새 import는 필요 없다 — `doctor.mjs:1-6`이 이미 `readFile`·`join`·`exists`를 가지고 있다.

`runDoctor`의 `for (const c of CHECKS) { … }` 루프가 끝난 직후:

```js
  await checkWiredHooks(ctx, add);
```

- [x] **Step 4: 통과 확인**

Run: `node --test tests/doctor.test.mjs`
Expected: PASS. `observe-tools.mjs`가 실제로 없는 fixture에서 기존 `not present, optional` 줄과
새 dangling 경고가 **둘 다** 나오는 것이 정상이다 — 전자는 "파일 유무", 후자는 "배선 정합성"이다.

- [x] **Step 5: 커밋**

```bash
git add src/commands/doctor.mjs tests/doctor.test.mjs
git commit -m "feat(doctor): dangling 훅 참조 경고 + 해석 불가 command를 unknown으로 보고 (migrate-init-gaps plan 5)"
git show --stat HEAD
```

---

### Task 6: 부트스트랩 안전망 — `migrate`의 관리 절 백업 + diff 경고

**Files:**
- Modify: `src/commands/migrate.mjs` (신규 `migrateManagedSectionBackup`, `runMigrate`에 배선)
- Create: `tests/migrate-managed-backup.test.mjs`

**왜 `migrate`인가:** 해시가 없는 기존 설치본에서 첫 `init`은 stock으로 간주해 관리 절을 1회 덮어쓴다
(spec 설계 절 — 그 대안은 절이 영영 갱신되지 않는 상태다). 그 1회를 **복구 가능·가시**로 만드는 것이
이 task다. `migrate`는 원본과 템플릿 렌더 결과를 **동시에 볼 수 있는 유일한 지점**이다.

**Interfaces:**
- Consumes: `detectStack`(`src/detect-stack.mjs`), `render`(`src/render.mjs`), `extractSections`·`simpleDiff`(`src/merge.mjs`),
  `AGENT_FILE_TEMPLATES`(`src/harness.mjs`), `loadRenderState`(`src/render-state.mjs`)
- Produces: `migrateManagedSectionBackup(ctx): Promise<boolean>` — 백업했으면 `true`
  - 백업 위치: `.harness/backup/managed-sections-<YYYYMMDD-HHmmss>/<file>` (원본 **파일 전체** 바이트)
  - **누적**이다(타임스탬프 디렉터리). 덮어쓰지 않는다 — 복구 대상이 유실되면 안전망의 의미가 없다.
  - 이미 `render-state.json`이 있으면(= 부트스트랩이 아니면) 아무것도 하지 않고 `false`

- [x] **Step 1: 실패하는 테스트 작성** — `tests/migrate-managed-backup.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { migrateManagedSectionBackup } from '../src/commands/migrate.mjs';
import { saveRenderState } from '../src/render-state.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ctxYes = (dir) => ({ root: ROOT, targetDir: dir, flags: { yes: true } });
const EDITED = '# P\n\n<!-- harness:section="stack" begin -->\n- uv sync (사용자가 고침)\n<!-- harness:section="stack" end -->\n';

function captureLogs() {
  const lines = []; const original = console.log;
  console.log = (...a) => lines.push(a.join(' '));
  return { lines, restore: () => { console.log = original; } };
}

async function project(body) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-mig-backup-'));
  await writeFile(join(dir, 'AGENTS.md'), body);
  return dir;
}

test('render-state 없음(부트스트랩) → 원본을 백업하고 diff를 경고로 남긴다', async () => {
  const dir = await project(EDITED);
  const cap = captureLogs();
  try {
    const ret = await migrateManagedSectionBackup(ctxYes(dir));
    cap.restore();
    assert.equal(ret, true);
    const dirs = await readdir(join(dir, '.harness/backup'));
    assert.equal(dirs.length, 1, '백업 디렉터리 하나가 생긴다');
    const saved = await readFile(join(dir, '.harness/backup', dirs[0], 'AGENTS.md'), 'utf8');
    assert.equal(saved, EDITED, '원본 바이트가 그대로 보존된다');
    const log = cap.lines.join('\n');
    assert.ok(/uv sync/.test(log), 'diff에 사라질 내용이 보인다');
  } finally { cap.restore(); await rm(dir, { recursive: true, force: true }); }
});

test('render-state 있음 → 부트스트랩이 아니므로 아무것도 하지 않는다', async () => {
  const dir = await project(EDITED);
  try {
    await saveRenderState(dir, { version: 1, sections: { 'AGENTS.md': { stack: 'abc' } } });
    assert.equal(await migrateManagedSectionBackup(ctxYes(dir)), false);
    await assert.rejects(() => readdir(join(dir, '.harness/backup')));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
```

- [x] **Step 2: 실패 확인**

Run: `node --test tests/migrate-managed-backup.test.mjs`
Expected: FAIL — `migrateManagedSectionBackup is not a function`

- [x] **Step 3: 구현** — `src/commands/migrate.mjs`

```js
// 부트스트랩 1회 손실의 안전망.
//
// render-state.json이 없는 설치본에서 다음 init은 관리 절을 stock으로 간주해 한 번 덮어쓴다
// (spec 설계 절: "사용자 편집으로 간주"를 고르면 그 설치본은 영영 갱신되지 않는다).
// migrate는 원본과 템플릿 렌더 결과를 동시에 볼 수 있는 유일한 지점이므로, 그 1회를
// 복구 가능(백업)·가시(diff)로 만든다. 백업은 타임스탬프 디렉터리에 **누적**한다.
//
// 렌더에 쓰는 vars는 init이 --stack 없이 쓰는 것과 같다(detectStack + projectName).
// 사용자가 나중에 `init --stack X`를 주면 diff가 조금 달라질 수 있다 — 경고는 참고용이고
// 실제 보존 판정은 init의 provenance 가드가 한다.
export async function migrateManagedSectionBackup(ctx) {
  const { root, targetDir } = ctx;
  const prior = await loadRenderState(targetDir);
  if (Object.keys(prior.sections).length > 0) return false; // 부트스트랩이 아니다

  const stack = await detectStack(targetDir);
  const vars = { projectName: basename(targetDir), ...stack };
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15).replace(/(\d{8})(\d{6})/, '$1-$2');
  const backupDir = join(targetDir, '.harness/backup', `managed-sections-${stamp}`);

  const reports = [];
  let backed = false;
  for (const [file, tplName] of AGENT_FILE_TEMPLATES) {
    // 레거시(0.7.x) 설치는 AGENTS.md가 CLAUDE.md를 가리키는 symlink다 — readTextSafe는 링크를
    // 따라가므로 엉뚱한 파일을 원본으로 삼게 된다. migrateToAgentsMd가 곧 실파일로 바꿀 것이니
    // 여기서는 건드리지 않는다(백업할 고유 내용이 링크 대상 쪽에 이미 있다).
    const st = await lstat(join(targetDir, file)).catch(() => null);
    if (st?.isSymbolicLink()) continue;
    const existing = await readTextSafe(join(targetDir, file));
    if (existing === null) continue;
    const tpl = await readTextSafe(join(root, 'templates', tplName));
    if (!tpl) continue;
    const rendered = render(tpl, vars);
    const current = extractSections(existing);
    const incoming = extractSections(rendered);
    for (const [name, block] of Object.entries(incoming)) {
      if (current[name] === undefined || current[name] === block) continue;
      reports.push({ file, name, diff: simpleDiff(current[name], block) });
    }
    if (reports.some(r => r.file === file)) {
      await mkdir(backupDir, { recursive: true });
      await writeText(join(backupDir, file), existing);
      backed = true;
    }
  }

  if (!backed) return false;

  console.log('\n⚠️  관리 절이 템플릿 렌더 결과와 다릅니다 — 다음 `init`이 이 절들을 한 번 교체합니다.');
  console.log(`  원본 백업: ${backupDir}`);
  for (const { file, name, diff } of reports) {
    console.log(`\n  ${file} → harness:section="${name}"`);
    console.log(diff.split('\n').map(l => `      ${l}`).join('\n'));
  }
  console.log('\n  → 남기고 싶은 내용은 init 뒤에 백업에서 옮기세요. 이후 실행부터는 자동으로 보존됩니다.');
  return true;
}
```

import 조정 — `migrate.mjs:1-13`은 이미 `join`·`basename`·`mkdir`·`readTextSafe`·`writeText`·
`exists`·`extractSections`·`render`·`lstat`을 가지고 있다. **추가·수정할 것은 넷뿐이다:**

```js
// 기존 줄 수정 (simpleDiff 추가)
import { extractSections, deepMergeJson, simpleDiff } from '../merge.mjs';
// 기존 줄 수정 (AGENT_FILE_TEMPLATES 추가)
import { loadBackupDir, mergeClaudeSettings, settingsHasBoundaryCheckpoint, mirrorCursorRules, AGENT_FILE_TEMPLATES } from '../harness.mjs';
// 새 줄 둘
import { detectStack } from '../detect-stack.mjs';
import { loadRenderState } from '../render-state.mjs';
```

> 순환 아님을 확인했다 — `harness.mjs`는 `commands/migrate.mjs`를 import하지 않고,
> `migrate.mjs`는 이미 `../harness.mjs`를 import한다(`migrate.mjs:6`). 방향이 한쪽뿐이다.

`runMigrate`에서 **가장 먼저** 부른다 (`migrateToAgentsMd`가 파일을 다시 쓰기 전에):

```js
  const managedBackedUp = await migrateManagedSectionBackup(ctx);
  const agentsMigrated = await migrateToAgentsMd(ctx);
```

그리고 "Nothing to migrate" 판정식에 `!managedBackedUp`를 추가한다.

- [x] **Step 4: 통과 확인**

Run: `node --test tests/migrate-managed-backup.test.mjs tests/migrate.test.mjs tests/migrate-agents.test.mjs`
Expected: PASS

- [x] **Step 5: 커밋**

```bash
git add src/commands/migrate.mjs tests/migrate-managed-backup.test.mjs
git commit -m "feat(migrate): 부트스트랩 전 관리 절 원본 백업 + diff 경고 (migrate-init-gaps plan 6)"
git show --stat HEAD
```

---

### Task 7: 통합 재현 — 레거시 설치 fixture에 `migrate` → `init`

**Files:**
- Create: `tests/e2e/legacy-migrate-init.test.mjs`

**목적:** spec의 Success 기준 4개를 한 경로에서 증명한다. 단위 테스트가 각 결함을 잡고,
이 테스트가 **실측 시나리오 자체**(레거시 설치 → migrate → init)를 재현한다.

- [x] **Step 1: 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { runMigrate } from '../../src/commands/migrate.mjs';
import { planChanges, applyChanges } from '../../src/harness.mjs';
import { loadRenderState, saveRenderState } from '../../src/render-state.mjs';
import { collectHookCommands, classifyHookCommand } from '../../src/commands/doctor.mjs';
import { exists } from '../../src/fsx.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ctx = (dir) => ({ root: ROOT, targetDir: dir, flags: { yes: true } });

// 0.9 이전 설치본: SessionStart 없는 settings + 사용자가 고친 stack 절
const LEGACY_AGENTS = '# proj\n\n<!-- harness:section="stack" begin -->\n- uv sync\n- uv run pytest\n<!-- harness:section="stack" end -->\n';

async function legacyProject() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-legacy-'));
  await mkdir(join(dir, '.claude'), { recursive: true });
  await writeFile(join(dir, 'AGENTS.md'), LEGACY_AGENTS);
  await writeFile(join(dir, '.claude/settings.json'), JSON.stringify({
    hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: './x.sh' }] }] },
  }, null, 2));
  return dir;
}

test('레거시 설치 → migrate → init: settings가 가리키는 프로젝트 내부 훅이 모두 존재한다', async () => {
  const dir = await legacyProject();
  try {
    await runMigrate(ctx(dir));
    const settings = JSON.parse(await readFile(join(dir, '.claude/settings.json'), 'utf8'));
    for (const cmd of collectHookCommands(settings)) {
      const c = classifyHookCommand(cmd);
      if (c.kind !== 'project-path') continue;
      assert.ok(await exists(join(dir, c.rel)), `migrate 직후 dangling: ${c.rel}`);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('migrate가 관리 절 원본을 백업한다', async () => {
  const dir = await legacyProject();
  try {
    await runMigrate(ctx(dir));
    assert.ok(await exists(join(dir, '.harness/backup')), '백업 디렉터리가 생긴다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('init 재실행: 해시 기록 뒤 사용자가 고친 절은 보존된다', async () => {
  const dir = await legacyProject();
  try {
    // 1회차 init — 부트스트랩(stock 간주), 해시 기록
    const first = await planChanges(ctx(dir), { stack: {} });
    await applyChanges(first.changes);
    await saveRenderState(dir, first.renderState);
    assert.ok(Object.keys((await loadRenderState(dir)).sections).length > 0, '해시가 기록된다');

    // 사용자가 stack 절을 고친다
    const body = await readFile(join(dir, 'AGENTS.md'), 'utf8');
    const edited = body.replace(
      /(<!-- harness:section="stack" begin -->)[\s\S]*?(<!-- harness:section="stack" end -->)/,
      '$1\n- uv sync (사용자)\n$2');
    await writeFile(join(dir, 'AGENTS.md'), edited);

    // 2회차 init — 그 절은 건너뛴다
    const second = await planChanges(ctx(dir), { stack: {} });
    await applyChanges(second.changes);
    assert.ok(second.skippedSections.some(s => s.section === 'stack'), 'stack이 건너뛰기로 보고된다');
    assert.match(await readFile(join(dir, 'AGENTS.md'), 'utf8'), /uv sync \(사용자\)/,
      '사용자 편집이 살아남는다');
    await saveRenderState(dir, second.renderState);

    // 3회차 — 보호가 "딱 한 번"이 아니어야 한다. 2회차가 건너뛴 절의 이전 해시를 지워 버리면
    // 여기서 부트스트랩으로 판정되어 덮인다. 이 단언이 그 회귀를 잡는 유일한 지점이다.
    const third = await planChanges(ctx(dir), { stack: {} });
    await applyChanges(third.changes);
    assert.ok(third.skippedSections.some(s => s.section === 'stack'), '3회차에도 건너뛴다');
    assert.match(await readFile(join(dir, 'AGENTS.md'), 'utf8'), /uv sync \(사용자\)/,
      '반복 실행해도 사용자 편집이 살아남는다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
```

- [x] **Step 2: 실행**

Run: `node --test tests/e2e/legacy-migrate-init.test.mjs`
Expected: PASS. 실패하면 Task 3~6 중 어느 배선이 빠졌는지 실패 메시지가 지목한다 —
**여기서 프로덕션 코드를 고친다. 테스트를 완화하지 않는다.**

- [x] **Step 3: 전체 테스트**

Run: `npm test`
Expected: PASS (직전 릴리스 기준 665 pass + 신규)

- [x] **Step 4: 커밋**

```bash
git add tests/e2e/legacy-migrate-init.test.mjs
git commit -m "test(e2e): 레거시 설치 migrate→init 재현 — 결함 3건 회귀 방지 (migrate-init-gaps plan 7)"
git show --stat HEAD
```

---

### Task 8: 문서

**Files:**
- Modify: `commands/harness-init.md` — 관리 절 provenance, 건너뛰기 경고, `.harness/render-state.json`
- Modify: `commands/harness-migrate.md` — SessionStart 배선 범위 축소, 관리 절 백업·diff
- Modify: `commands/harness-doctor.md` — dangling / unknown 훅 검사
- Modify: `README.md` — `.harness/render-state.json`이 **커밋 대상**임을 팀 상태 목록에 추가
- Modify: `CHANGELOG.md` — `[Unreleased]`

- [x] **Step 1: 명령 문서 3종 갱신**

각 문서에 넣을 사실(문장은 문서 톤에 맞춰 쓴다):
- `harness-init.md` — "관리 절은 **마지막으로 하네스가 렌더한 내용과 같을 때만** 교체한다.
  다르면 그 절만 건너뛰고 diff를 경고로 보여준다. `--yes`에서도 같다(프롬프트만 생략).
  판정 근거는 `.harness/render-state.json`이며 커밋 대상이다."
- `harness-migrate.md` — "SessionStart 병합은 `session-context` 항목만 대상으로 한다 —
  `migrate`는 자기가 설치하지 않는 훅을 배선하지 않는다. `observe-tools`는 `init`이 설치하며 배선한다.
  `render-state.json`이 없는 설치본에서는 관리 절 원본을 `.harness/backup/managed-sections-<stamp>/`에
  백업하고 diff를 보여준다."
- `harness-doctor.md` — "settings.json이 배선한 훅 중 **프로젝트 내부 경로**(상대경로·`${CLAUDE_PROJECT_DIR}`)를
  가리키는 것은 파일 존재를 검사해 없으면 ⚠️. 전역 CLI는 검사하지 않는다. 해석하지 못한 command는
  `판정 불가`로 보고한다 — 침묵하지 않는다."

- [x] **Step 2: `CHANGELOG.md`의 `[Unreleased]`에 추가**

```markdown
### Fixed
- `migrate`가 설치하지 않는 훅(`observe-tools`)을 `settings.json`에 배선해 SessionStart가 없는 파일을
  가리키던 문제 — 병합 대상을 `session-context` 항목으로 좁혔다.
- `init` 재실행이 관리 절(`stack`·`principles` 등)의 사용자 편집을 말없이 지우던 문제 — 렌더 provenance를
  도입해 마지막 렌더 결과와 다른 절은 건너뛰고 diff를 경고한다(`--yes` 포함).
- `doctor`가 dangling 훅 참조를 `not present, optional`로만 보고하던 문제 — 프로젝트 내부 경로를 가리키는
  배선은 파일 존재를 검사해 경고하고, 해석 못 한 command는 `판정 불가`로 보고한다.

### Added
- `.harness/render-state.json` — 관리 절의 마지막 렌더 해시. **커밋 대상**이다.
- `migrate`가 부트스트랩 설치본의 관리 절 원본을 `.harness/backup/managed-sections-<stamp>/`에 백업한다.
```

- [x] **Step 3: 문서 검사**

Run: `npm run docs:check`
Expected: PASS. 실패하면 `npm run docs:generate`로 생성 문서를 갱신한다.
생성 문서가 green이어도 **overview 산문은 따로 낡는다** — 관리 절·`.harness/` 설명이 있으면 함께 고친다.

- [x] **Step 4: 커밋**

```bash
git add commands/ README.md CHANGELOG.md docs/
git commit -m "docs: 관리 절 provenance·migrate 배선 범위·doctor dangling 검사 반영 (migrate-init-gaps plan 8)"
git show --stat HEAD
```

---

### Task 9: 외부 리뷰 · retro · 종결

- [ ] **Step 1: codex read-only 리뷰**

`/harness-review` (엔진 `codex`). 백그라운드 10~25분, 모델 폴백은 `-m gpt-5.6-sol`
(메모리 `codex-exec-model-fallback-home-machine`). 결과는 `<name>-artifact.md`의 `## Reviews` 절에
날짜와 함께 남긴다 — 남기지 않은 리뷰는 "안 한 것"이다.

- [ ] **Step 2: 리뷰 반영**

지적을 재현·판별한 뒤 단일 스레드로 반영한다(D6). 반영하지 않기로 한 항목은 이유를 artifact에 남긴다.

- [ ] **Step 3: `npm test` 최종 확인**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: retro**

`/harness-retro` — 학습을 `<name>-artifact.md`에 append.

- [ ] **Step 5: `harness-team done`**

`AskUserQuestion`으로 확인받은 뒤 실행한다. `## 단계`에 미완 `- [ ]`가 남아 있으면 가드가 막는다.

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- **렌더 provenance** (신규, Task 1·2) — 관리 절의 마지막 렌더 결과 해시를 설치 측(`.harness/render-state.json`)에
  기록해 대조하는 정책. D8과 목적은 같고 판정 근거의 소재지만 출하 측 → 설치 측으로 옮긴 것. spec 반영 완료.
- **판정 불가(unknown)** (신규, Task 5) — doctor가 hook `command`의 모양을 해석하지 못한 상태.
  "문제 없음"과 구분해 보고한다. spec 반영 완료.
- **`migrate`의 정의** (의미 확정, Task 4) — "구조를 최신으로 옮긴다". "설치를 템플릿과 동일하게 만든다"가
  아니다. 사용자가 지운 선택적 훅은 되살리지 않는다. spec 반영 완료.
- **부트스트랩(bootstrap)** (신규, Task 6) — 렌더 해시가 없는 설치본에서의 첫 판정. stock으로 간주하되
  `migrate`의 백업·diff가 안전망이다. spec 반영 완료.

## 참고
- spec의 이월 항목 두 건이 이 plan에 걸린다:
  - `(open → plan.md)` 백업 파일의 위치·이름·수명 → **Task 6에서 확정**:
    `.harness/backup/managed-sections-<YYYYMMDD-HHmmss>/<file>`, 원본 파일 전체 바이트, **누적**(덮어쓰지 않음).
  - `(open → 소비자 조치)` 소비자 3곳의 `.gitignore`가 `.harness/`를 통째로 무시한다 —
    `render-state.json`이 커밋되지 않으면 팀원마다 부트스트랩이 반복된다. **이 task 범위 밖**이며
    별도 조치가 필요하다(이 저장소의 `appendGitignore`는 이미 `.harness/` 통째 무시를 하지 않는다 —
    `src/harness.mjs:317-325`의 `harnessNeeded` 목록이 정본).
- 다이어그램: 이 task는 옵트인을 거절했으므로 단계가 없다 — 없는 것이 곧 상태다.
- Task 4의 테스트 충돌 위험은 **실측으로 해소됐다** — `observe-tools`를 언급하는 테스트 중
  `migrateSessionStartHook`/`runMigrate`를 부르는 것은 없다(2026-09-10 확인). Step 4의 회귀 실행은 그대로 둔다.
- Task 5는 doctor의 종료 코드를 바꾸지 않는다 — `doctor.mjs:778`은 `if (fail) process.exitCode = 1`이고
  warning은 세기만 한다(2026-09-10 확인).

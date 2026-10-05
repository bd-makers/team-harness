# Symlink Migration Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 구버전(실제 파일) → 신버전(symlink) 전환을 안전하게 수행할 수 있도록 `delete --include-real`, `symlink --backup-dir` fallback, `upgrade` 원스텝 명령을 추가한다.

**Architecture:** `src/backup-dir.mjs`의 `resolveBackupDir`에 explicit override + auto-detect fallback을 추가하고, `delete` 명령에 `--include-real` 플래그를 추가하고, 새 `src/commands/upgrade.mjs`가 clone → delete-real → restore-config → symlink 순서를 오케스트레이션한다.

**Tech Stack:** Node.js 18+ ESM, `node:test` (built-in), `node:fs/promises`

---

## File Structure

| 역할 | 변경 | 파일 |
|------|------|------|
| Backup dir 탐색 (override + auto-detect 추가) | Modify | `src/backup-dir.mjs` |
| `--include-real` 플래그로 실제 파일/디렉토리 삭제 | Modify | `src/commands/delete.mjs` |
| `--backup-dir` 옵션을 resolveBackupDir에 전달 | Modify | `src/commands/symlink.mjs` |
| 구버전→신버전 마이그레이션 오케스트레이터 | Create | `src/commands/upgrade.mjs` |
| upgrade 등록, HELP 업데이트 | Modify | `bin/harness-team.mjs` |
| upgrade 슬래시 커맨드 | Create | `commands/harness-upgrade.md` |
| 버전 범프 0.3.0 → 0.4.0 | Modify | `package.json` |
| backup-dir 단위 테스트 | Create | `tests/backup-dir.test.mjs` |
| delete --include-real 통합 테스트 | Create | `tests/delete.test.mjs` |

---

### Task 1: `src/backup-dir.mjs` — opts override + auto-detect fallback

**Files:**
- Modify: `src/backup-dir.mjs`
- Create: `tests/backup-dir.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/backup-dir.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveBackupDir } from '../src/backup-dir.mjs';

test('opts.backupDir override를 즉시 반환', async () => {
  const result = await resolveBackupDir('/nonexistent', { backupDir: '/custom/path' });
  assert.equal(result, '/custom/path');
});

test('.harness/backup.json의 dir 필드를 읽음', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-test-'));
  try {
    await mkdir(join(dir, '.harness'), { recursive: true });
    await writeFile(join(dir, '.harness/backup.json'), JSON.stringify({ dir: '/some/backup' }));
    assert.equal(await resolveBackupDir(dir), '/some/backup');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('../harness-backup/<projectName> 디렉토리가 있으면 auto-detect', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'harness-parent-'));
  const projectDir = join(parent, 'my-project');
  const backupDir = join(parent, 'harness-backup', 'my-project');
  try {
    await mkdir(projectDir, { recursive: true });
    await mkdir(backupDir, { recursive: true });
    assert.equal(await resolveBackupDir(projectDir), backupDir);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test('아무것도 없으면 null 반환', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-test-'));
  try {
    assert.equal(await resolveBackupDir(dir), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
node --test tests/backup-dir.test.mjs
```
Expected: `opts.backupDir override` 테스트와 `auto-detect` 테스트가 FAIL (함수 시그니처 불일치)

- [ ] **Step 3: `src/backup-dir.mjs` 구현**

`src/backup-dir.mjs` 전체 교체:
```js
import { join, resolve, dirname, basename } from 'node:path';
import { lstat, readlink } from 'node:fs/promises';
import { readTextSafe, exists } from './fsx.mjs';

const PROBE_ITEMS = ['CLAUDE.md', '.claude'];
const DEFAULT_BACKUP_PARENT = 'harness-backup';

export async function resolveBackupDir(targetDir, { backupDir } = {}) {
  if (backupDir) return backupDir;

  // 1. .harness/backup.json
  const cfg = await readTextSafe(join(targetDir, '.harness/backup.json'));
  if (cfg) {
    try {
      const data = JSON.parse(cfg);
      if (data.dir) return data.dir;
      const { parent, name } = data;
      if (parent && name) return join(targetDir, '..', parent, name);
    } catch {}
  }

  // 2. 기존 symlink에서 역추적
  for (const item of PROBE_ITEMS) {
    const p = join(targetDir, item);
    try {
      const st = await lstat(p);
      if (st.isSymbolicLink()) {
        const raw = await readlink(p);
        const resolved = resolve(targetDir, raw);
        return dirname(resolved);
      }
    } catch {}
  }

  // 3. ../harness-backup/<projectName> auto-detect
  const autoPath = join(targetDir, '..', DEFAULT_BACKUP_PARENT, basename(targetDir));
  if (await exists(autoPath)) return autoPath;

  return null;
}
```

- [ ] **Step 4: 테스트 재실행 — 전부 통과 확인**

```bash
node --test tests/backup-dir.test.mjs
```
Expected: 4개 테스트 모두 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/backup-dir.mjs tests/backup-dir.test.mjs
git commit -m "feat(backup-dir): opts.backupDir override + harness-backup auto-detect fallback"
```

---

### Task 2: `src/commands/delete.mjs` — `--include-real` 플래그

**Files:**
- Modify: `src/commands/delete.mjs`
- Create: `tests/delete.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/delete.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runDelete } from '../src/commands/delete.mjs';

async function makeFixture() {
  const parent = await mkdtemp(join(tmpdir(), 'harness-del-'));
  const projectDir = join(parent, 'my-project');
  const backupDir = join(parent, 'harness-backup', 'my-project');

  await mkdir(join(projectDir, '.harness'), { recursive: true });
  await writeFile(
    join(projectDir, '.harness/backup.json'),
    JSON.stringify({ dir: backupDir }),
  );
  await mkdir(backupDir, { recursive: true });
  return { parent, projectDir, backupDir };
}

test('--include-real이 없으면 실제 디렉토리는 skip', async () => {
  const { parent, projectDir } = await makeFixture();
  try {
    await mkdir(join(projectDir, '.claude'), { recursive: true });
    await writeFile(join(projectDir, '.claude/settings.json'), '{}');
    await runDelete({ targetDir: projectDir, flags: { yes: true } });
    // .claude is a real dir, should NOT be deleted without --include-real
    await lstat(join(projectDir, '.claude')); // must still exist → no throw
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test('--include-real이면 실제 디렉토리도 삭제', async () => {
  const { parent, projectDir } = await makeFixture();
  try {
    await mkdir(join(projectDir, '.claude'), { recursive: true });
    await writeFile(join(projectDir, '.claude/settings.json'), '{}');
    await runDelete({ targetDir: projectDir, flags: { yes: true, 'include-real': true } });
    // .claude should be deleted
    const st = await lstat(join(projectDir, '.claude')).catch(() => null);
    assert.equal(st, null);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test('--include-real: .harness 삭제 후 backup.json 내용 반환', async () => {
  const { parent, projectDir, backupDir } = await makeFixture();
  try {
    // .harness is a real dir (already created in makeFixture)
    const result = await runDelete({ targetDir: projectDir, flags: { yes: true, 'include-real': true } });
    const st = await lstat(join(projectDir, '.harness')).catch(() => null);
    assert.equal(st, null);
    // result should contain the saved backup config
    assert.ok(result?.savedBackupConfig?.dir === backupDir);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
node --test tests/delete.test.mjs
```
Expected: `--include-real이면 실제 디렉토리도 삭제` 테스트 FAIL

- [ ] **Step 3: `src/commands/delete.mjs` 구현**

`src/commands/delete.mjs` 전체:
```js
import { join, resolve } from 'node:path';
import { lstat, readlink, unlink, rm } from 'node:fs/promises';
import { resolveBackupDir } from '../backup-dir.mjs';
import { readTextSafe } from '../fsx.mjs';
import { confirm } from '../prompt.mjs';

const MOVE_ITEMS = ['CLAUDE.md', '.claude', '.cursor', '.opencode', 'docs', '.harness', 'clone.sh', 'delete.sh'];
const ALIAS_ITEMS = ['AGENTS.md', 'GEMINI.md', '.cursorrules'];

export async function runDelete(ctx) {
  const includeReal = !!ctx.flags['include-real'];
  const backupDir = await resolveBackupDir(ctx.targetDir, { backupDir: ctx.flags['backup-dir'] });
  if (!backupDir) {
    console.error('No backup dir found. Run `harness-team init` or `harness-team backup` first.');
    process.exit(1);
  }

  console.log(`harness-team delete → ${ctx.targetDir}`);
  console.log(`  backup dir: ${backupDir}`);

  const toRemove = [];
  let savedBackupConfig = null;

  for (const item of MOVE_ITEMS) {
    const p = join(ctx.targetDir, item);
    const st = await lstat(p).catch(() => null);
    if (!st) continue;
    if (st.isSymbolicLink()) {
      const raw = await readlink(p);
      const resolved = resolve(ctx.targetDir, raw);
      if (resolved === backupDir || resolved.startsWith(backupDir + '/')) {
        toRemove.push({ item, p, kind: 'symlink' });
      } else {
        console.log(`  skip: ${item} (local symlink → ${raw})`);
      }
    } else if (includeReal) {
      if (item === '.harness') {
        const cfg = await readTextSafe(join(p, 'backup.json'));
        if (cfg) {
          try { savedBackupConfig = JSON.parse(cfg); } catch {}
        }
      }
      toRemove.push({ item, p, kind: 'real', isDir: st.isDirectory() });
    } else {
      console.log(`  skip: ${item} (not a symlink)`);
    }
  }

  for (const item of ALIAS_ITEMS) {
    const p = join(ctx.targetDir, item);
    const st = await lstat(p).catch(() => null);
    if (!st) continue;
    if (st.isSymbolicLink()) {
      toRemove.push({ item, p, kind: 'symlink' });
    } else {
      console.log(`  skip: ${item} (not a symlink, leaving untouched)`);
    }
  }

  if (toRemove.length === 0) { console.log('Nothing to remove.'); return { savedBackupConfig }; }

  console.log('\nItems to remove:');
  for (const op of toRemove) {
    const label = op.kind === 'real' ? ' (real file/dir — PERMANENT)' : '';
    console.log(`  ${op.item}${label}`);
  }

  const hasReal = toRemove.some(o => o.kind === 'real');
  const question = hasReal
    ? '\nThis will PERMANENTLY delete real files/dirs. Proceed?'
    : '\nProceed?';

  const ok = ctx.flags.yes || await confirm(question, { defaultYes: !hasReal });
  if (!ok) { console.log('Aborted.'); return { savedBackupConfig: null }; }

  for (const op of toRemove) {
    if (op.kind === 'real') {
      await rm(op.p, { recursive: true, force: true });
    } else {
      await unlink(op.p);
    }
    console.log(`  ✓ removed: ${op.item}`);
  }

  console.log('\n✓ Delete complete.');
  return { savedBackupConfig };
}
```

- [ ] **Step 4: 테스트 재실행 — 통과 확인**

```bash
node --test tests/delete.test.mjs
```
Expected: 3개 테스트 모두 PASS

- [ ] **Step 5: 커밋**

```bash
git add src/commands/delete.mjs tests/delete.test.mjs
git commit -m "feat(delete): --include-real 플래그로 실제 파일/디렉토리 삭제 지원"
```

---

### Task 3: `src/commands/symlink.mjs` — `--backup-dir` 전달

**Files:**
- Modify: `src/commands/symlink.mjs`

- [ ] **Step 1: `resolveBackupDir` 호출에 opts 추가**

`src/commands/symlink.mjs` line 11의 `resolveBackupDir` 호출을 교체:
```js
// Before:
const backupDir = await resolveBackupDir(ctx.targetDir);

// After:
const backupDir = await resolveBackupDir(ctx.targetDir, { backupDir: ctx.flags['backup-dir'] });
```

- [ ] **Step 2: 기존 동작 수동 검증**

```bash
node bin/harness-team.mjs symlink --help 2>&1 || true
```
Expected: no crash (파일이 정상 로드됨)

- [ ] **Step 3: 커밋**

```bash
git add src/commands/symlink.mjs
git commit -m "fix(symlink): --backup-dir 플래그를 resolveBackupDir에 전달"
```

---

### Task 4: `src/commands/upgrade.mjs` — 마이그레이션 오케스트레이터 (신규)

**Files:**
- Create: `src/commands/upgrade.mjs`

- [ ] **Step 1: 파일 생성**

`src/commands/upgrade.mjs`:
```js
import { join, resolve } from 'node:path';
import { lstat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolveBackupDir } from '../backup-dir.mjs';
import { writeText } from '../fsx.mjs';
import { confirm } from '../prompt.mjs';
import { runClone } from './clone.mjs';
import { runDelete } from './delete.mjs';
import { runSymlink } from './symlink.mjs';

const MOVE_ITEMS = ['CLAUDE.md', '.claude', '.cursor', '.opencode', 'docs', '.harness', 'clone.sh', 'delete.sh'];

export async function runUpgrade(ctx) {
  console.log(`harness-team upgrade → ${ctx.targetDir}`);

  // 1. Resolve backup dir
  const rawBackupDir = ctx.flags['backup-dir']
    ? resolve((ctx.flags['backup-dir']).replace(/^~/, homedir()))
    : null;
  const backupDir = rawBackupDir || await resolveBackupDir(ctx.targetDir);
  if (!backupDir) {
    console.error(
      'No backup dir found.\n' +
      '  Option A: harness-team upgrade --backup-dir <path>\n' +
      '  Option B: harness-team init (new project setup)'
    );
    process.exit(1);
  }
  console.log(`  backup dir: ${backupDir}`);

  // 2. Clone project → backup (creates backup if missing, merges if exists)
  console.log('\n[1/3] Syncing project files to backup dir...');
  await runClone({ ...ctx, flags: { ...ctx.flags, yes: true }, targetDir: ctx.targetDir });

  // 3. Detect real (non-symlink) items in project root
  const realItems = [];
  let savedBackupConfig = null;

  for (const item of MOVE_ITEMS) {
    const p = join(ctx.targetDir, item);
    const st = await lstat(p).catch(() => null);
    if (!st) continue;
    if (!st.isSymbolicLink()) {
      realItems.push({ item, p });
    }
  }

  if (realItems.length === 0) {
    console.log('\nNo real files detected — already migrated. Running symlink...');
    await runSymlink({ ...ctx, flags: { ...ctx.flags, 'backup-dir': backupDir } });
    return;
  }

  // 4. Confirm with the user
  console.log('\n[2/3] Real files/dirs to replace with symlinks:');
  for (const op of realItems) console.log(`  ${op.item}`);

  const ok = ctx.flags.yes || await confirm(
    '\nDelete these and replace with symlinks from backup? (backup was just synced)',
    { defaultYes: false },
  );
  if (!ok) { console.log('Aborted.'); return; }

  // 5. Delete real items; delete --include-real returns savedBackupConfig
  console.log('\n[3/3] Replacing real files with symlinks...');
  const { savedBackupConfig: cfg } = await runDelete({
    ...ctx,
    flags: { ...ctx.flags, yes: true, 'include-real': true, 'backup-dir': backupDir },
  });
  savedBackupConfig = cfg;

  // 6. Restore .harness/backup.json so symlink step can find the backup dir
  if (savedBackupConfig) {
    await writeText(
      join(ctx.targetDir, '.harness/backup.json'),
      JSON.stringify(savedBackupConfig, null, 2) + '\n',
    );
    console.log('  ✓ restored .harness/backup.json');
  } else {
    // Write a fresh config pointing to the resolved backup dir
    await writeText(
      join(ctx.targetDir, '.harness/backup.json'),
      JSON.stringify({ dir: backupDir }, null, 2) + '\n',
    );
    console.log('  ✓ wrote .harness/backup.json');
  }

  // 7. Create symlinks
  await runSymlink({ ...ctx, flags: { ...ctx.flags, yes: true, 'backup-dir': backupDir } });

  console.log('\n✓ Upgrade complete — project is now on symlink structure.');
}
```

- [ ] **Step 2: 동작 확인 (dry-run 형태)**

```bash
node -e "import('./src/commands/upgrade.mjs').then(m => console.log('OK:', typeof m.runUpgrade))"
```
Expected: `OK: function`

- [ ] **Step 3: 커밋**

```bash
git add src/commands/upgrade.mjs
git commit -m "feat(upgrade): 구버전→symlink 원스텝 마이그레이션 커맨드"
```

---

### Task 5: `bin/harness-team.mjs` + `commands/harness-upgrade.md` — 등록

**Files:**
- Modify: `bin/harness-team.mjs`
- Create: `commands/harness-upgrade.md`

- [ ] **Step 1: `bin/harness-team.mjs`에 upgrade import + case 추가**

`bin/harness-team.mjs` 상단 import에 추가:
```js
import { runUpgrade } from '../src/commands/upgrade.mjs';
```

HELP 문자열에 upgrade 추가 (migrate 줄 아래):
```
  upgrade [dir]                     Migrate real files → symlinks in one step (v0.3.x → v0.4+)
```

switch 블록에 case 추가 (migrate case 아래):
```js
case 'upgrade': return runUpgrade(ctx);
```

`parseArgs` flags 파싱: `--include-real` 플래그는 값 없는 boolean이므로 기존 로직으로 자동 처리됨. 변경 불필요.

- [ ] **Step 2: `commands/harness-upgrade.md` 생성**

```markdown
---
description: 구버전 구조(실제 파일)를 신버전(symlink)으로 원스텝 마이그레이션
argument-hint: [--yes] [--backup-dir <path>] [--target <dir>]
---

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" upgrade $ARGUMENTS
```
```

- [ ] **Step 3: CLI smoke test**

```bash
node bin/harness-team.mjs help
```
Expected: HELP에 `upgrade` 줄이 출력됨

- [ ] **Step 4: 커밋**

```bash
git add bin/harness-team.mjs commands/harness-upgrade.md
git commit -m "feat(cli): upgrade 커맨드 등록 + 슬래시 커맨드 추가"
```

---

### Task 6: `package.json` 버전 범프 + 로컬 캐시 동기화

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 버전 범프**

`package.json`의 `"version"` 필드를 `"0.3.0"` → `"0.4.0"` 으로 변경.

- [ ] **Step 2: 전체 테스트 실행**

```bash
node --test tests/*.test.mjs
```
Expected: 모든 테스트 PASS

- [ ] **Step 3: 버전 범프 커밋**

```bash
git add package.json
git commit -m "chore(release): 버전 0.4.0으로 범프"
```

- [ ] **Step 4: plugin.json 버전 동기화 확인**

```bash
cat .claude-plugin/plugin.json | grep version
```
Expected: 별도 버전 필드가 없거나 package.json과 맞는지 확인. 만약 `plugin.json`에 `"version"` 필드가 있으면 `0.4.0`으로 업데이트 후 커밋.

- [ ] **Step 5: 로컬 플러그인 캐시 동기화**

```bash
CACHE_DIR=~/.claude/plugins/cache/harness-aijient-team-marketplace/harness-aijient-team/0.4.0
mkdir -p "$CACHE_DIR"
rsync -a --exclude='.git' --exclude='.claude-plugin' --exclude='docs/superpowers' --exclude='node_modules' --exclude='.harness' \
  "/Users/chad/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/03-Projects/Harness/harness-aijient-team-plugin/" \
  "$CACHE_DIR/"
echo "Synced to $CACHE_DIR"
ls "$CACHE_DIR/commands/"
```
Expected: `harness-upgrade.md` 포함 명령 파일 목록 출력

---

## Self-Review

### Spec Coverage

| 스펙 요구사항 | 구현 태스크 |
|--------------|------------|
| Bug 1: delete --include-real | Task 2 |
| Bug 2: symlink backup-dir fallback (3단계) | Task 1 (auto-detect), Task 3 (--backup-dir 전달) |
| harness-team upgrade 신규 커맨드 | Task 4, Task 5 |
| upgrade 내부 동작: clone → detect → confirm → delete-real → restore-config → symlink | Task 4 |
| .harness 삭제 전 backup.json 임시 보존 후 복원 | Task 2 (`runDelete` return), Task 4 (restore step) |
| 버전 범프 0.3.0 → 0.4.0 | Task 6 |

### 타입/함수명 일관성

- `resolveBackupDir(targetDir, { backupDir } = {})` — Task 1에서 정의, Task 2·3·4에서 동일 시그니처 사용
- `runDelete` return value `{ savedBackupConfig }` — Task 2에서 정의, Task 4에서 소비
- `runUpgrade` — Task 4에서 정의, Task 5에서 import
- MOVE_ITEMS 목록: `delete.mjs`와 `upgrade.mjs` 모두 `['CLAUDE.md', '.claude', '.cursor', '.opencode', 'docs', '.harness', 'clone.sh', 'delete.sh']` (동일)

---
tags:
  - project
  - ai
  - obsidian
created: 2026-04-23
modified: 2026-04-23
---

# Backup Scripts as Harness CLI Commands — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `clone.sh`, `symlink.sh`, `delete.sh` 를 `harness-team clone/symlink/delete` CLI 서브커맨드 및 `/harness-clone` 등 Claude Code slash command로 대체한다.

**Architecture:** `src/backup-dir.mjs` 에서 `.harness/backup.json` → symlink 역추적 순서로 backup dir를 해결한다. 각 커맨드는 Node.js ESM으로 구현하고 CLI는 `bin/harness-team.mjs`에 연결하며, Claude Code commands는 기존 `commands/` 패턴을 따른다.

**Tech Stack:** Node.js ESM (no build), `node:fs/promises`, `node:path`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/backup-dir.mjs` | backup dir 해결 (json → symlink fallback → null) |
| Create | `src/commands/clone.mjs` | project → backup dir 동기화 |
| Create | `src/commands/symlink.mjs` | backup → project symlink 생성/교체 |
| Create | `src/commands/delete.mjs` | project 에서 harness symlink 제거 |
| Modify | `bin/harness-team.mjs` | clone/symlink/delete 케이스 + help 추가 |
| Create | `commands/harness-clone.md` | `/harness-clone` slash command |
| Create | `commands/harness-symlink.md` | `/harness-symlink` slash command |
| Create | `commands/harness-delete.md` | `/harness-delete` slash command |
| Modify | `templates/clone.sh` | deprecated 주석 추가 |
| Modify | `templates/symlink.sh` | deprecated 주석 추가 |
| Modify | `templates/delete.sh` | deprecated 주석 추가 |

---

## Task 1: `src/backup-dir.mjs` — backup dir 해결 유틸

**Files:**
- Create: `src/backup-dir.mjs`

- [ ] **Step 1: 파일 생성**

```js
import { join, resolve, dirname } from 'node:path';
import { lstat, readlink } from 'node:fs/promises';
import { readTextSafe } from './fsx.mjs';

const PROBE_ITEMS = ['CLAUDE.md', '.claude'];

export async function resolveBackupDir(targetDir) {
  const cfg = await readTextSafe(join(targetDir, '.harness/backup.json'));
  if (cfg) {
    try {
      const data = JSON.parse(cfg);
      if (data.dir) return data.dir;
      const { parent, name } = data;
      if (parent && name) return join(targetDir, '..', parent, name);
    } catch {}
  }

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

  return null;
}
```

- [ ] **Step 2: 수동 확인 — backup.json 경로**

```bash
cd <프로젝트루트>
node -e "
import { resolveBackupDir } from './src/backup-dir.mjs';
resolveBackupDir(process.cwd()).then(d => console.log('backup dir:', d));
"
```

기대: `.harness/backup.json` 이 있으면 해당 경로 출력.

- [ ] **Step 3: 수동 확인 — symlink fallback**

```bash
# backup.json 임시 제거 후 테스트
mv .harness/backup.json .harness/backup.json.bak
node -e "
import { resolveBackupDir } from './src/backup-dir.mjs';
resolveBackupDir(process.cwd()).then(d => console.log('fallback dir:', d));
"
mv .harness/backup.json.bak .harness/backup.json
```

기대: CLAUDE.md 또는 .claude symlink가 있으면 그 dirname 출력.

- [ ] **Step 4: 커밋**

```bash
git add src/backup-dir.mjs
git commit -m "feat(backup-dir): backup dir 해결 유틸 추가 (json → symlink fallback)"
```

---

## Task 2: `src/commands/clone.mjs` — project → backup 동기화

**Files:**
- Create: `src/commands/clone.mjs`

- [ ] **Step 1: 파일 생성**

```js
import { join, resolve } from 'node:path';
import { lstat, readlink, mkdir, copyFile, readdir, symlink as makeSymlink } from 'node:fs/promises';
import { resolveBackupDir } from '../backup-dir.mjs';
import { confirm } from '../prompt.mjs';

const ITEMS = ['CLAUDE.md', 'AGENTS.md', 'GEMINI.md', '.claude', '.cursor', '.opencode', '.cursorrules', 'docs', '.harness'];

async function mergeDirNewer(src, dst) {
  await mkdir(dst, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === '.DS_Store') continue;
    const s = join(src, e.name);
    const d = join(dst, e.name);
    if (e.isDirectory()) {
      await mergeDirNewer(s, d);
    } else {
      const srcSt = await lstat(s);
      const dstSt = await lstat(d).catch(() => null);
      if (!dstSt || srcSt.mtimeMs > dstSt.mtimeMs) await copyFile(s, d);
    }
  }
}

export async function runClone(ctx) {
  const backupDir = await resolveBackupDir(ctx.targetDir);
  if (!backupDir) {
    console.error('No backup dir found. Run `harness-team init` or `harness-team backup` first.');
    process.exit(1);
  }

  console.log(`harness-team clone → ${ctx.targetDir}`);
  console.log(`  backup dir: ${backupDir}`);

  const ops = [];
  for (const item of ITEMS) {
    const src = join(ctx.targetDir, item);
    const dst = join(backupDir, item);
    const st = await lstat(src).catch(() => null);
    if (!st) { ops.push({ item, kind: 'skip', reason: 'not found' }); continue; }

    if (st.isSymbolicLink()) {
      const raw = await readlink(src);
      const resolved = resolve(ctx.targetDir, raw);
      if (resolved === backupDir || resolved.startsWith(backupDir + '/')) {
        ops.push({ item, kind: 'skip', reason: 'harness symlink' });
      } else {
        ops.push({ item, kind: 'symlink', src, dst, target: resolved });
      }
    } else if (st.isDirectory()) {
      ops.push({ item, kind: 'dir', src, dst });
    } else {
      ops.push({ item, kind: 'file', src, dst });
    }
  }

  const toProcess = ops.filter(o => o.kind !== 'skip');
  if (toProcess.length === 0) {
    console.log('Nothing to clone — all items are harness symlinks.');
    return;
  }

  console.log('\nItems to sync to backup dir:');
  for (const op of toProcess) console.log(`  ${op.kind}: ${op.item}`);

  const ok = ctx.flags.yes || await confirm('\nProceed?', { defaultYes: true });
  if (!ok) { console.log('Aborted.'); return; }

  await mkdir(backupDir, { recursive: true });

  for (const op of toProcess) {
    if (op.kind === 'symlink') {
      if (!await lstat(op.dst).catch(() => null)) await makeSymlink(op.target, op.dst);
      console.log(`  ✓ synced symlink: ${op.item} → ${op.target}`);
    } else if (op.kind === 'dir') {
      await mergeDirNewer(op.src, op.dst);
      console.log(`  ✓ merged dir: ${op.item}`);
    } else {
      const srcSt = await lstat(op.src);
      const dstSt = await lstat(op.dst).catch(() => null);
      if (!dstSt || srcSt.mtimeMs > dstSt.mtimeMs) {
        await copyFile(op.src, op.dst);
        console.log(`  ✓ copied (newer): ${op.item}`);
      } else {
        console.log(`  skip: ${op.item} (backup newer or equal)`);
      }
    }
  }

  console.log('\n✓ Clone complete.');
}
```

- [ ] **Step 2: 수동 확인**

```bash
node bin/harness-team.mjs clone --yes
```

기대: `harness-team clone → ...` 출력 후 항목별 결과 표시.

- [ ] **Step 3: 커밋**

```bash
git add src/commands/clone.mjs
git commit -m "feat(clone): project→backup 동기화 커맨드 추가"
```

---

## Task 3: `src/commands/symlink.mjs` — backup → project symlink 생성

**Files:**
- Create: `src/commands/symlink.mjs`

- [ ] **Step 1: 파일 생성**

```js
import { join, resolve } from 'node:path';
import { lstat, readlink, rm, symlink as makeSymlink } from 'node:fs/promises';
import { resolveBackupDir } from '../backup-dir.mjs';
import { confirm } from '../prompt.mjs';

const MOVE_ITEMS = ['CLAUDE.md', '.claude', '.cursor', '.opencode', 'docs', '.harness'];
const ALIAS_ITEMS = ['AGENTS.md', 'GEMINI.md', '.cursorrules'];
const SCRIPT_ITEMS = ['clone.sh', 'delete.sh'];

export async function runSymlink(ctx) {
  const backupDir = await resolveBackupDir(ctx.targetDir);
  if (!backupDir) {
    console.error('No backup dir found. Run `harness-team init` or `harness-team backup` first.');
    process.exit(1);
  }

  const allItems = [...MOVE_ITEMS, ...ALIAS_ITEMS];
  for (const s of SCRIPT_ITEMS) {
    if (await lstat(join(backupDir, s)).catch(() => null)) allItems.push(s);
  }

  console.log(`harness-team symlink → ${ctx.targetDir}`);
  console.log(`  backup dir: ${backupDir}`);

  const ops = [];
  for (const item of allItems) {
    const backup = join(backupDir, item);
    if (!await lstat(backup).catch(() => null)) {
      ops.push({ item, kind: 'skip', reason: 'not in backup' });
      continue;
    }

    const link = join(ctx.targetDir, item);
    const linkSt = await lstat(link).catch(() => null);

    if (!linkSt) {
      ops.push({ item, kind: 'link', link, backup });
    } else if (linkSt.isSymbolicLink()) {
      const raw = await readlink(link);
      const resolved = resolve(ctx.targetDir, raw);
      if (resolved === backup) {
        ops.push({ item, kind: 'skip', reason: 'already linked' });
      } else {
        ops.push({ item, kind: 'replace', link, backup });
      }
    } else {
      ops.push({ item, kind: 'replace', link, backup });
    }
  }

  const toProcess = ops.filter(o => o.kind !== 'skip');
  if (toProcess.length === 0) {
    console.log('Nothing to symlink — all already linked.');
    return;
  }

  console.log('\nItems to link:');
  for (const op of toProcess) console.log(`  ${op.kind}: ${op.item} → ${op.backup}`);

  const ok = ctx.flags.yes || await confirm('\nProceed?', { defaultYes: true });
  if (!ok) { console.log('Aborted.'); return; }

  for (const op of toProcess) {
    if (op.kind === 'replace') await rm(op.link, { recursive: true, force: true });
    await makeSymlink(op.backup, op.link);
    console.log(`  ✓ linked: ${op.item} → ${op.backup}`);
  }

  console.log('\n✓ Symlink complete.');
}
```

- [ ] **Step 2: 수동 확인**

```bash
node bin/harness-team.mjs symlink --yes
```

기대: backup dir 항목들이 project root에 절대경로 symlink로 생성됨. `ls -la` 로 확인.

- [ ] **Step 3: 커밋**

```bash
git add src/commands/symlink.mjs
git commit -m "feat(symlink): backup→project symlink 생성 커맨드 추가"
```

---

## Task 4: `src/commands/delete.mjs` — harness symlink 제거

**Files:**
- Create: `src/commands/delete.mjs`

- [ ] **Step 1: 파일 생성**

```js
import { join, resolve } from 'node:path';
import { lstat, readlink, unlink } from 'node:fs/promises';
import { resolveBackupDir } from '../backup-dir.mjs';
import { confirm } from '../prompt.mjs';

const MOVE_ITEMS = ['CLAUDE.md', '.claude', '.cursor', '.opencode', 'docs', '.harness', 'clone.sh', 'delete.sh'];
const ALIAS_ITEMS = ['AGENTS.md', 'GEMINI.md', '.cursorrules'];

export async function runDelete(ctx) {
  const backupDir = await resolveBackupDir(ctx.targetDir);
  if (!backupDir) {
    console.error('No backup dir found. Run `harness-team init` or `harness-team backup` first.');
    process.exit(1);
  }

  console.log(`harness-team delete → ${ctx.targetDir}`);
  console.log(`  backup dir: ${backupDir}`);

  const toRemove = [];

  for (const item of MOVE_ITEMS) {
    const p = join(ctx.targetDir, item);
    const st = await lstat(p).catch(() => null);
    if (!st) continue;
    if (st.isSymbolicLink()) {
      const raw = await readlink(p);
      const resolved = resolve(ctx.targetDir, raw);
      if (resolved === backupDir || resolved.startsWith(backupDir + '/')) {
        toRemove.push({ item, p });
      } else {
        console.log(`  skip: ${item} (local symlink → ${raw})`);
      }
    } else {
      console.log(`  skip: ${item} (not a symlink)`);
    }
  }

  for (const item of ALIAS_ITEMS) {
    const p = join(ctx.targetDir, item);
    const st = await lstat(p).catch(() => null);
    if (!st) continue;
    if (st.isSymbolicLink()) {
      toRemove.push({ item, p });
    } else {
      console.log(`  skip: ${item} (not a symlink, leaving untouched)`);
    }
  }

  if (toRemove.length === 0) { console.log('Nothing to remove.'); return; }

  console.log('\nItems to remove:');
  for (const op of toRemove) console.log(`  ${op.item}`);

  const ok = ctx.flags.yes || await confirm('\nProceed?', { defaultYes: true });
  if (!ok) { console.log('Aborted.'); return; }

  for (const op of toRemove) {
    await unlink(op.p);
    console.log(`  ✓ removed: ${op.item}`);
  }

  console.log('\n✓ Delete complete.');
}
```

- [ ] **Step 2: 수동 확인 — symlink 후 delete**

```bash
node bin/harness-team.mjs symlink --yes
ls -la CLAUDE.md  # symlink 확인
node bin/harness-team.mjs delete --yes
ls -la CLAUDE.md  # 사라졌는지 확인
```

기대: symlink 생성 → 제거 정상 동작.

- [ ] **Step 3: 커밋**

```bash
git add src/commands/delete.mjs
git commit -m "feat(delete): harness symlink 제거 커맨드 추가"
```

---

## Task 5: `bin/harness-team.mjs` — CLI 연결

**Files:**
- Modify: `bin/harness-team.mjs`

- [ ] **Step 1: import 3개 추가** (기존 import 블록 바로 아래에)

```js
import { runClone } from '../src/commands/clone.mjs';
import { runSymlink } from '../src/commands/symlink.mjs';
import { runDelete } from '../src/commands/delete.mjs';
```

- [ ] **Step 2: HELP 문자열에 3개 커맨드 추가**

`backup [dir]` 줄 바로 아래에:

```
  clone [dir]                       Sync project items to backup dir (merge, newer-wins)
  symlink [dir]                     Create backup→project symlinks
  delete [dir]                      Remove harness symlinks from project
```

- [ ] **Step 3: switch 블록에 케이스 추가**

`case 'backup': return runBackup(ctx);` 바로 아래에:

```js
case 'clone': return runClone(ctx);
case 'symlink': return runSymlink(ctx);
case 'delete': return runDelete(ctx);
```

- [ ] **Step 4: 수동 확인**

```bash
node bin/harness-team.mjs help
```

기대: `clone`, `symlink`, `delete` 항목이 help에 표시됨.

- [ ] **Step 5: 커밋**

```bash
git add bin/harness-team.mjs
git commit -m "feat(cli): clone/symlink/delete 서브커맨드 등록"
```

---

## Task 6: Claude Code slash commands 추가

**Files:**
- Create: `commands/harness-clone.md`
- Create: `commands/harness-symlink.md`
- Create: `commands/harness-delete.md`

- [ ] **Step 1: `commands/harness-clone.md` 생성**

```markdown
---
description: project → backup dir 동기화 (merge, newer-wins)
argument-hint: [--yes] [--target <dir>]
---

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" clone $ARGUMENTS
```
```

- [ ] **Step 2: `commands/harness-symlink.md` 생성**

```markdown
---
description: backup dir → project symlink 생성/교체
argument-hint: [--yes] [--target <dir>]
---

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" symlink $ARGUMENTS
```
```

- [ ] **Step 3: `commands/harness-delete.md` 생성**

```markdown
---
description: project에서 harness symlink 제거
argument-hint: [--yes] [--target <dir>]
---

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" delete $ARGUMENTS
```
```

- [ ] **Step 4: 커밋**

```bash
git add commands/harness-clone.md commands/harness-symlink.md commands/harness-delete.md
git commit -m "feat(commands): /harness-clone /harness-symlink /harness-delete slash commands 추가"
```

---

## Task 7: `.sh` 템플릿에 deprecated 주석 추가

**Files:**
- Modify: `templates/clone.sh`
- Modify: `templates/symlink.sh`
- Modify: `templates/delete.sh`

- [ ] **Step 1: 각 파일 shebang 다음 줄에 주석 추가**

`templates/clone.sh` — `#!/bin/bash` 다음 줄:
```bash
# DEPRECATED: Use `harness-team clone` or /harness-clone instead.
```

`templates/symlink.sh` — `#!/bin/bash` 다음 줄:
```bash
# DEPRECATED: Use `harness-team symlink` or /harness-symlink instead.
```

`templates/delete.sh` — `#!/bin/bash` 다음 줄:
```bash
# DEPRECATED: Use `harness-team delete` or /harness-delete instead.
```

- [ ] **Step 2: 커밋**

```bash
git add templates/clone.sh templates/symlink.sh templates/delete.sh
git commit -m "chore: .sh 템플릿 deprecated 주석 추가"
```

---

## Task 8: 버전 범프 및 통합 확인

- [ ] **Step 1: 전체 워크플로우 확인**

```bash
# 테스트 프로젝트 루트에서
node <plugin-root>/bin/harness-team.mjs clone --yes
node <plugin-root>/bin/harness-team.mjs symlink --yes
node <plugin-root>/bin/harness-team.mjs delete --yes
```

기대: 3단계 모두 에러 없이 정상 완료.

- [ ] **Step 2: 구버전 호환 확인 (backup.json 없는 경우)**

```bash
mv .harness/backup.json /tmp/backup.json.bak
node <plugin-root>/bin/harness-team.mjs clone --yes
# 기대: symlink 역추적으로 backup dir 찾아 동작
mv /tmp/backup.json.bak .harness/backup.json
```

- [ ] **Step 3: `package.json` 버전 범프** (`0.2.2` → `0.2.3`)

```json
"version": "0.2.3"
```

- [ ] **Step 4: 최종 커밋 + 태그**

```bash
git add package.json
git commit -m "chore(release): 버전 0.2.3으로 범프"
git tag v0.2.3
git push origin main --tags
```

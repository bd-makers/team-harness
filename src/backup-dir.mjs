import { join, resolve, dirname, basename } from 'node:path';
import { homedir } from 'node:os';
import { lstat, readlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readTextSafe, exists } from './fsx.mjs';

const pexec = promisify(execFile);

const PROBE_ITEMS = ['CLAUDE.md', '.claude'];
const DEFAULT_BACKUP_PARENT = 'harness-backup';

// targetDir 에 대응하는 **메인 체크아웃 쪽** 경로. 백업 경로의 `..`·자동 탐지 이름은 이 기준으로 푼다.
// 링크된 워크트리(`<repo>/.claude/worktrees/<w>` 등)에서 targetDir 기준으로 풀면 `..`가 워크트리 부모를 가리킨다.
// `--show-toplevel`은 워크트리에서 그 워크트리를 돌려주므로 쓰지 않는다 — common-dir(= 메인 `.git`)의 부모에
// `--show-prefix`(하위 디렉터리 설치본의 상대 위치)를 붙인다. 메인 체크아웃·비-git·bare(`.git`에 둔 bare 포함)·
// submodule 처럼 메인 체크아웃을 특정할 수 없으면 targetDir 그대로(종전 동작, 문자열까지 같다).
// 저장소 선택 환경변수(GIT_DIR 등 — git 훅 안에서 설정된다)는 떼어 낸다: 남기면 `-C targetDir` 탐색을 무시하고
// 그 저장소를 답해 비-git 대상까지 메인 체크아웃으로 오인한다.
export async function backupAnchor(targetDir) {
  const { GIT_DIR, GIT_WORK_TREE, GIT_COMMON_DIR, ...env } = process.env;
  const git = (cwd, ...args) => pexec('git', ['-C', cwd, ...args], { env, maxBuffer: 1024 * 1024 });
  try {
    const { stdout } = await git(targetDir, 'rev-parse', '--git-dir', '--git-common-dir', '--show-prefix');
    const [gitDir, commonDir, prefix = ''] = stdout.split('\n');
    const gitAbs = resolve(targetDir, gitDir);
    const commonAbs = resolve(targetDir, commonDir);
    if (gitAbs === commonAbs || basename(commonAbs) !== '.git') return targetDir;
    // 부모가 정말 이 common-dir 의 작업 트리인지 직접 묻는다 — `.git`이라는 이름의 bare 저장소,
    // `core.worktree`로 작업 트리를 딴 곳에 둔 저장소(worktreeConfig 포함)는 부모가 체크아웃이 아니다.
    const mainRoot = dirname(commonAbs);
    const isMain = await git(mainRoot, 'rev-parse', '--is-inside-work-tree', '--git-common-dir').then(({ stdout }) => {
        const [inside, common] = stdout.split('\n');
        return inside === 'true' && resolve(mainRoot, common) === commonAbs;
      }, () => false);
    if (!isMain) return targetDir;
    return join(mainRoot, prefix.replace(/\/$/, ''));
  } catch { return targetDir; }
}

// `.harness/backup.json` 내용 → 백업 경로. `{dir}`은 그대로, `{parent,name}`은 anchor 의 형제 폴더. 해석 불가면 null.
export async function backupDirFromConfig(targetDir, data) {
  if (data?.dir) return data.dir;
  const { parent, name } = data ?? {};
  if (!parent || !name) return null;
  return resolve(join(await backupAnchor(targetDir), '..', parent, name));
}

export async function resolveBackupDir(targetDir, { backupDir } = {}) {
  if (backupDir) return resolve(backupDir.replace(/^~/, homedir()));

  // 1. Try .harness/backup.json
  const cfg = await readTextSafe(join(targetDir, '.harness/backup.json'));
  if (cfg) {
    try {
      const fromCfg = await backupDirFromConfig(targetDir, JSON.parse(cfg));
      if (fromCfg) return fromCfg;
    } catch {}
  }

  // 2. Fallback: probe existing symlinks to reverse-engineer backup dir
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

  // 3. Auto-detect ../harness-backup/<projectName>
  const anchor = await backupAnchor(targetDir);
  const autoPath = join(anchor, '..', DEFAULT_BACKUP_PARENT, basename(anchor));
  if (await exists(autoPath)) return autoPath;

  return null;
}

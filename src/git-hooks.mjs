import { join, relative, resolve } from 'node:path';
import { readFile, writeFile, access, appendFile, chmod, stat, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const pexec = promisify(execFile);

export const POST_COMMIT_HOOK = `#!/bin/sh
# harness: auto-update handoff on commit
harness-team handoff 2>/dev/null || true
`;

// The line that proves the hook is installed. `includes('harness')` used to count a
// stray comment containing the word as "already installed" and skip the install.
export const POST_COMMIT_MARKER = 'harness-team handoff';

// Where git will actually read hooks from. Honours `core.hooksPath` (husky, lefthook,
// a shared hooks dir) and worktrees, whose `.git` is a file pointing at the main
// repository. Joining `.git/hooks` by hand covered neither: the hook was written where
// git never looks, or the install was skipped without a word. `null` = not a git repo.
export async function resolveHooksDir(targetDir) {
  try {
    const { stdout } = await pexec('git', ['-C', targetDir, 'rev-parse', '--git-path', 'hooks'], { timeout: 5000 });
    const out = stdout.trim();
    return out ? resolve(targetDir, out) : null;
  } catch {
    return null;
  }
}

// Whether the repository points git at its own hooks directory. A missing directory means
// two different things, and only one of them is ours to fix.
async function hasCustomHooksPath(targetDir) {
  try {
    const { stdout } = await pexec('git', ['-C', targetDir, 'config', '--get', 'core.hooksPath'], { timeout: 5000 });
    return stdout.trim().length > 0;
  } catch {
    return false; // exit 1 = not set
  }
}

// pre-push: 하네스가 강제하는 유일한 검사(D11 — PR 에 담을 task 문서)를 push 앞에 건다.
// PATH 의 CLI 가 없거나 `pr-check` 를 모르는 구버전이면 건너뛴다 — 구버전의 "Unknown command"(exit 1)가 push 를
// 막지 않게 한다. 그 상태는 doctor 의 hook CLI 검사가 알린다.
//
// 이 블록은 기존 훅의 **맨 위**(shebang 바로 다음)에 들어간다. 뒤에 붙이면 세 가지가 깨졌다(리뷰 2026-10-06):
// 앞선 줄(git-lfs 의 `git lfs pre-push` 등)이 stdin 의 ref 목록을 소비해 빈 입력을 받고, 앞선 `exit 0`·`exec` 뒤에서는
// 아예 실행되지 않으며, 앞선 명령의 실패 rc 를 덮는다. 맨 위에서 stdin 을 임시 파일로 받아 검사한 뒤 `exec <` 로
// 되돌리므로 뒤의 기존 줄은 같은 입력을 그대로 읽는다. `exit 0` 은 쓰지 않는다 — 기존 줄을 막지 않는다.
//
// 훅 관리자(husky 등) 사용자에게도 이 블록을 그대로 관리자 설정의 맨 위에 넣으라고 처방한다(README). 맨 명령 한 줄은
// CLI 부재·구버전 팀원의 push 를 막고(husky 는 `sh -e`), stdin 을 소비해 뒤 명령이 EOF 를 받는다(2026-10-06 실측·codex P2).
export const PRE_PUSH_BLOCK =`# harness: PR 필수 task 문서 검사 (D11) — 우회: git push --no-verify
if command -v harness-team >/dev/null 2>&1 && harness-team --help </dev/null 2>/dev/null | grep -q '^ *pr-check' \\
  && harness_in=$(mktemp "\${TMPDIR:-/tmp}/harness-pre-push.XXXXXX"); then
  cat > "$harness_in"
  harness-team pr-check --pre-push < "$harness_in" || { rm -f "$harness_in"; exit 1; }
  exec < "$harness_in"
  rm -f "$harness_in"
fi
`;

export const PRE_PUSH_HOOK = `#!/bin/sh\n${PRE_PUSH_BLOCK}`;

// 맨 위 삽입은 기존 훅이 sh 계열일 때만 안전하다. python·node 훅에 셸 줄을 넣으면 그 훅이 문법 오류로 죽고, pre-push
// 에서는 그것이 모든 push 를 막는다(리뷰 2026-10-06 재현). shebang 이 없으면 git 이 sh 로 실행한다.
const SH_SHEBANG = /^#!\s*(?:\/usr\/bin\/env\s+)?(?:\S*\/)?(?:sh|bash|dash|zsh|ksh)\b/;

export const PRE_PUSH_MARKER = 'harness-team pr-check';

// Only a live (non-comment) line counts — a comment that merely mentions the
// command must not pass for an install (codex review P2, 2026-09-03).
export function hasLiveMarker(text, marker) {
  return text.split('\n').some(line => !/^\s*#/.test(line) && line.includes(marker));
}

async function installGitHook(targetDir, { name, body, marker, prepend = null }) {
  const hooksDir = await resolveHooksDir(targetDir);
  if (!hooksDir) return; // not a git repo (or no git) — nothing to hook into
  try {
    await access(hooksDir);
  } catch {
    if (await hasCustomHooksPath(targetDir)) {
      // The repository declared its own hooks directory (husky, lefthook, a shared dir) and it
      // is not there yet. That directory belongs to that tool, so creating it would install our
      // hook into a manager that has not run its own setup. Say so instead of vanishing.
      console.log(`  ${name} hook: hooks dir not found (${hooksDir}) — skipping`);
      return;
    }
    // Default `.git/hooks`, simply absent — git creates it from a template at init time and a
    // repository can end up without one (empty `init.templateDir`, a pruned clone). git still
    // reads hooks from there, so the directory is ours to create. Skipping here is how bodoc4
    // ended up with `--mirror` reporting success while no hook was ever installed (2026-09-21).
    await mkdir(hooksDir, { recursive: true });
  }

  const hookPath = join(hooksDir, name);
  let existing = null;
  try {
    existing = await readFile(hookPath, 'utf8');
  } catch { /* doesn't exist */ }

  if (existing !== null) {
    if (hasLiveMarker(existing, marker)) return;
    if (prepend) {
      const firstLine = existing.split('\n', 1)[0];
      if (firstLine.startsWith('#!') && !SH_SHEBANG.test(firstLine)) {
        console.log(`  ${name} hook: 기존 훅이 셸 스크립트가 아님 (${firstLine}) — 건너뜀; 그 훅에서 \`${marker} --pre-push\` 를 직접 부르세요`);
        return;
      }
      const at = firstLine.startsWith('#!') ? firstLine.length + 1 : 0;
      await writeFile(hookPath, existing.slice(0, at) + prepend + '\n' + existing.slice(at), 'utf8');
    } else {
      await appendFile(hookPath, '\n' + body);
    }
    const st = await stat(hookPath);
    if (!(st.mode & 0o111)) await chmod(hookPath, st.mode | 0o755);
    console.log(`  ${name} hook: ${prepend ? 'inserted harness block at top' : 'appended harness line'}`);
  } else {
    await writeFile(hookPath, body, 'utf8');
    await chmod(hookPath, 0o755);
    console.log(`  ${name} hook: installed`);
  }
}

export function installPostCommitHook(targetDir) {
  return installGitHook(targetDir, { name: 'post-commit', body: POST_COMMIT_HOOK, marker: POST_COMMIT_MARKER });
}

export function installPrePushHook(targetDir) {
  return installGitHook(targetDir, { name: 'pre-push', body: PRE_PUSH_HOOK, marker: PRE_PUSH_MARKER, prepend: PRE_PUSH_BLOCK });
}

// doctor 용: push 때 pr-check 가 실제로 도는가. 훅 관리자(husky·lefthook 등)가 훅 파일을 다시 쓰면 블록이 조용히
// 사라지므로 파일 자체를 본다(followups 11). 처방은 sync 가 실제로 고칠 수 있는 경우에만 sync 다 — core.hooksPath 는
// 관리자 소유라 판정하지 않고(husky v9 는 `.husky/_/pre-push` 가 `.husky/pre-push` 를 부르므로 거기 넣은 사용자를
// 오경보하게 된다) 안내만 하고, 비-셸 훅은 설치기가 다시 건너뛰므로 직접 부르라고 한다.
// null = git 저장소 아님. status: 'pass' | 'warning' | 'skip'(판정하지 않음 — 경고로 세지 않는다).
export async function checkPrePushHook(targetDir) {
  const hooksDir = await resolveHooksDir(targetDir);
  if (!hooksDir) return null;
  const hookPath = join(hooksDir, 'pre-push');
  const shown = relative(targetDir, hookPath) || hookPath;
  const call = `\`${PRE_PUSH_MARKER} --pre-push\``;
  const managerFix = '관리자 설정의 pre-push 맨 위에 하네스 pre-push 블록(README `pr-check` 절)을 넣으세요';
  let existing = null;
  try {
    existing = await readFile(hookPath, 'utf8');
  } catch { /* doesn't exist */ }

  if (existing !== null && hasLiveMarker(existing, PRE_PUSH_MARKER)) {
    return { status: 'pass', detail: `${shown}에 pr-check 실행 줄 있음` };
  }
  if (await hasCustomHooksPath(targetDir)) {
    return { status: 'skip', detail: `core.hooksPath 설정됨 (${shown}에 pr-check 줄 없음) — 훅 관리자 소유라 판정하지 않음; 아직 안 했다면 ${managerFix}` };
  }
  const firstLine = existing === null ? '' : existing.split('\n', 1)[0];
  if (firstLine.startsWith('#!') && !SH_SHEBANG.test(firstLine)) {
    return { status: 'warning', detail: `${shown}이 셸 스크립트가 아님 (${firstLine}) — push 때 pr-check가 돌지 않음; sync는 이 훅을 건너뛰므로 그 훅에서 ${call}를 직접 부르세요` };
  }
  const what = existing === null ? `pre-push 훅 없음 (${shown})` : `${shown}에 pr-check 실행 줄 없음`;
  return { status: 'warning', detail: `${what} — push 때 PR 필수 문서 검사가 돌지 않음; run: harness-team sync (훅 관리자가 이 파일을 다시 쓴다면 ${managerFix})` };
}

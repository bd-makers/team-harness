import { readFile, writeFile, mkdir, cp, readdir, rm, stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../observation.mjs';

const pexec = promisify(execFile);

const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

// Path segments that must never be copied into the plugin cache.
const EXCLUDE_SEGMENTS = new Set(['.git', 'node_modules', 'tests', 'scripts']);

function tagged(kind, msg) {
  return Object.assign(new Error(msg), { kind });
}

// Surgically replace the single `"version": "<old>"` field in raw manifest text,
// preserving all other formatting (inline arrays, indentation, trailing newline).
// Throws (kind: 'manifest-format') if the exact substring does not occur exactly once.
function surgicalVersionReplace(text, oldVersion, newVersion, label) {
  const needle = `"version": "${oldVersion}"`;
  let count = 0;
  let idx = text.indexOf(needle);
  while (idx !== -1) {
    count += 1;
    idx = text.indexOf(needle, idx + needle.length);
  }
  if (count !== 1) {
    throw tagged(
      'manifest-format',
      `release: ${label} 의 \`"version": "${oldVersion}"\` 출현 횟수가 1이 아님 (${count}) — 형식이 예상과 달라 안전하게 치환 불가`,
    );
  }
  return text.replace(needle, `"version": "${newVersion}"`);
}

// Post-check for the surgical rewrite: the version field we meant to move must
// actually read as the new version after the replacement.
function assertBumped(actual, newVersion, label) {
  if (actual !== newVersion) {
    throw tagged(
      'manifest-format',
      `release: ${label} 의 version 이 치환 후에도 ${newVersion} 이 아님 (현재 ${actual ?? '없음'}) — ` +
      `\`"version": "..."\` 표기가 파일 안에서 일관되지 않아 다른 항목이 치환됐을 수 있다`,
    );
  }
}

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

function computeNewVersion(bump, current) {
  if (SEMVER_RE.test(bump)) return bump;
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!m) throw tagged('bad-bump', `release: 현재 버전이 semver 형식이 아님 — ${current}`);
  let [maj, min, pat] = m.slice(1).map(Number);
  if (bump === 'major') { maj += 1; min = 0; pat = 0; }
  else if (bump === 'minor') { min += 1; pat = 0; }
  else if (bump === 'patch') { pat += 1; }
  else throw tagged('bad-bump', `release: 알 수 없는 bump — "${bump}" (major|minor|patch|x.y.z 중 하나여야 함)`);
  return `${maj}.${min}.${pat}`;
}

// Exclude .git, node_modules, tests, scripts (any path segment) and docs/superpowers (rooted).
function cacheFilter(root) {
  return (src) => {
    const rel = path.relative(root, src);
    if (rel === '') return true;
    const segs = rel.split(path.sep);
    if (segs.some(s => EXCLUDE_SEGMENTS.has(s))) return false;
    if (segs[0] === 'docs' && segs[1] === 'superpowers') return false;
    return true;
  };
}

async function deriveGitSha(root) {
  try {
    const { stdout } = await pexec('git', ['-C', root, 'rev-parse', 'HEAD'], { maxBuffer: 1024 * 1024 });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

// Best-effort detection of a running Claude Code process (CLI or desktop app).
// release rewrites ~/.claude/plugins/installed_plugins.json, which Claude Code
// owns; editing it live can race (see MAINTAINING.md). Advisory only — this NEVER
// throws and returns [] on any unsupported platform or error, so release is never
// blocked by detection. Own PID is excluded so the release process can't match.
export async function detectClaudeCodeProcs(exec = pexec) {
  if (process.platform === 'win32') return []; // no ps; skip silently
  try {
    const { stdout } = await exec('ps', ['-A', '-o', 'pid=,args='], { timeout: 3000, maxBuffer: 1 << 22 });
    const self = String(process.pid);
    const hits = [];
    for (const raw of stdout.split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      const sp = line.indexOf(' ');
      const pid = sp === -1 ? line : line.slice(0, sp);
      const args = sp === -1 ? '' : line.slice(sp + 1);
      if (pid === self) continue;
      // Match the desktop app (Claude.app), the CLI package (claude-code), or the
      // `claude` binary as a path/command token. `claude-<other>` won't match the
      // last alternative, avoiding false hits on unrelated "claude*" paths.
      if (/Claude\.app|claude-code|(^|\/|\s)claude(\s|$)/.test(args)) hits.push({ pid, args });
    }
    return hits;
  } catch {
    return [];
  }
}

// In the destination commands/ dir ONLY, remove files absent from the source.
async function syncCommandsDir(srcCommands, dstCommands) {
  await mkdir(dstCommands, { recursive: true });
  const srcEntries = await readdir(srcCommands, { withFileTypes: true });
  const srcNames = new Set(srcEntries.filter(e => e.isFile()).map(e => e.name));

  const dstEntries = await readdir(dstCommands, { withFileTypes: true });
  for (const e of dstEntries) {
    if (e.isFile() && !srcNames.has(e.name)) {
      await rm(path.join(dstCommands, e.name), { force: true });
    }
  }
  for (const name of srcNames) {
    await cp(path.join(srcCommands, name), path.join(dstCommands, name));
  }
}

async function sameDirectory(a, b) {
  try {
    const [ra, rb] = await Promise.all([realpath(a), realpath(b)]);
    return ra === rb;
  } catch {
    return path.resolve(a) === path.resolve(b);
  }
}

export async function release({
  bump,
  root = process.cwd(),
  pluginsRoot,
  dryRun = false,
  skipCache = false,
  gitSha,
  detectClaude = true,
} = {}) {
  pluginsRoot = pluginsRoot ?? (process.env.CLAUDE_PLUGINS_ROOT ?? path.join(os.homedir(), '.claude/plugins'));

  const pkgPath = path.join(root, 'package.json');
  const pluginPath = path.join(root, '.claude-plugin/plugin.json');
  const marketplacePath = path.join(root, '.claude-plugin/marketplace.json');
  const codexPluginPath = path.join(root, '.codex-plugin/plugin.json');

  // Read raw text once; parse from that same text. Raw text feeds the surgical
  // write (FIX 1); the parsed objects feed the agreement/schema checks.
  const pkgText = await readFile(pkgPath, 'utf8');
  const pluginText = await readFile(pluginPath, 'utf8');
  const marketplaceText = await readFile(marketplacePath, 'utf8');
  const codexPluginText = await readFile(codexPluginPath, 'utf8');
  const pkg = JSON.parse(pkgText);
  const plugin = JSON.parse(pluginText);
  const marketplace = JSON.parse(marketplaceText);
  const codexPlugin = JSON.parse(codexPluginText);

  // 1. Marketplace schema guard (run first so the version check can safely read the
  // self entry). The catalog may also list COMPANION plugins we neither own nor
  // version — external plugins pinned by `source.sha` (see MAINTAINING.md). So the
  // invariant is not "exactly one entry" but "exactly one entry named like us":
  // zero (empty array / renamed) and duplicates both still throw.
  if (!Array.isArray(marketplace.plugins)) {
    throw tagged('schema', 'release: marketplace.json.plugins 가 배열이 아님');
  }
  // Every entry must be a named object and names must be unique. The self-entry
  // count alone would wave through a null entry or a duplicated COMPANION name,
  // and release is the last gate before this catalog is synced to the clone.
  const seen = new Set();
  for (const [i, entry] of marketplace.plugins.entries()) {
    if (!entry || typeof entry !== 'object' || typeof entry.name !== 'string' || entry.name === '') {
      throw tagged('schema', `release: marketplace.json.plugins[${i}] 에 문자열 name 이 없음`);
    }
    if (seen.has(entry.name)) {
      throw tagged('schema', `release: marketplace.json.plugins 에 중복된 이름 "${entry.name}"`);
    }
    seen.add(entry.name);
  }
  const selfEntries = marketplace.plugins.filter(p => p.name === plugin.name);
  if (selfEntries.length !== 1) {
    const listed = marketplace.plugins.map(p => p?.name ?? '(no name)').join(', ') || '(비어 있음)';
    throw tagged(
      'schema',
      `release: marketplace.json.plugins 안에 "${plugin.name}" 항목이 정확히 1개여야 함 — ` +
      `현재 ${selfEntries.length}개 (등재된 이름: ${listed})`,
    );
  }
  const selfEntry = selfEntries[0];
  if (codexPlugin.name !== plugin.name) {
    throw tagged(
      'schema',
      `release: 플러그인 이름 불일치 — plugin.json.name=${plugin.name}, .codex-plugin/plugin.json.name=${codexPlugin.name}`,
    );
  }

  // 2. All manifests must agree on the current version.
  const pkgV = pkg.version;
  const pluginV = plugin.version;
  const mktV = selfEntry.version;
  const codexPluginV = codexPlugin.version;
  if (!(pkgV === pluginV && pluginV === mktV && mktV === codexPluginV)) {
    throw tagged(
      'version-mismatch',
      `release: 매니페스트 버전 불일치 — package.json=${pkgV}, .claude-plugin/plugin.json=${pluginV}, .claude-plugin/marketplace.json=${mktV}, .codex-plugin/plugin.json=${codexPluginV}`,
    );
  }

  // 3. Compute and validate new version.
  const oldVersion = pkgV;
  const newVersion = computeNewVersion(bump, oldVersion);
  if (!SEMVER_RE.test(newVersion)) {
    throw tagged('bad-bump', `release: 계산된 버전이 semver 형식이 아님 — ${newVersion}`);
  }

  const marketplaceName = marketplace.name;
  const pluginName = plugin.name;
  const key = `${pluginName}@${marketplaceName}`;
  const cacheDir = path.join(pluginsRoot, 'cache', marketplaceName, pluginName, newVersion);
  const marketplaceDir = path.join(pluginsRoot, 'marketplaces', marketplaceName);

  const result = {
    oldVersion,
    newVersion,
    manifests: [pkgPath, pluginPath, marketplacePath, codexPluginPath],
    cacheDir,
    marketplaceDir,
    installedUpdated: false,
    dryRun,
    skipCache,
  };

  // Advisory race guard: a live Claude Code process owns installed_plugins.json.
  // Detect early so dry-run also surfaces the heads-up (quit before the real run).
  // Only relevant when we'd touch installed_plugins.json (i.e. not --skip-cache).
  if (detectClaude && !skipCache) {
    const procs = await detectClaudeCodeProcs();
    if (procs.length > 0) {
      result.claudeRunning = true;
      result.claudeProcs = procs.map(p => p.pid);
    }
  }

  // 4. Compute the SURGICAL rewrites — only the version field on the raw text,
  // never a re-serialize, so inline arrays/indentation/trailing newline survive
  // byte-for-byte. The single-occurrence guard throws (kind: 'manifest-format')
  // rather than risk silent corruption.
  //
  // Computed BEFORE the dry-run return on purpose: `--dry-run` is documented as
  // the release preflight, and a preflight that skips format validation reports
  // success on a tree where the real run throws.
  const newPkgText = surgicalVersionReplace(pkgText, oldVersion, newVersion, 'package.json');
  const newPluginText = surgicalVersionReplace(pluginText, oldVersion, newVersion, '.claude-plugin/plugin.json');
  const newMarketplaceText = surgicalVersionReplace(marketplaceText, oldVersion, newVersion, '.claude-plugin/marketplace.json');
  const newCodexPluginText = surgicalVersionReplace(codexPluginText, oldVersion, newVersion, '.codex-plugin/plugin.json');

  // The needle is a raw substring, so "occurs exactly once" does not by itself
  // prove it occurred on OUR field. A self entry written `"version":"x"` (no
  // space) paired with a companion written `"version": "x"` would satisfy the
  // count and bump the COMPANION, silently leaving the harness version stale.
  // Verify the intended target actually moved.
  assertBumped(JSON.parse(newPkgText).version, newVersion, 'package.json');
  assertBumped(JSON.parse(newPluginText).version, newVersion, '.claude-plugin/plugin.json');
  assertBumped(JSON.parse(newCodexPluginText).version, newVersion, '.codex-plugin/plugin.json');
  assertBumped(
    JSON.parse(newMarketplaceText).plugins.find(p => p?.name === plugin.name)?.version,
    newVersion,
    `.claude-plugin/marketplace.json (plugins."${plugin.name}")`,
  );

  // 5. Dry run: everything above is validation; write nothing.
  if (dryRun) return result;

  await writeFile(pkgPath, newPkgText);
  await writeFile(pluginPath, newPluginText);
  await writeFile(marketplacePath, newMarketplaceText);
  await writeFile(codexPluginPath, newCodexPluginText);

  // 6. skipCache short-circuits cache, marketplace sync, and installed_plugins.
  if (skipCache) return result;

  // 7. Cache copy.
  await mkdir(cacheDir, { recursive: true });
  await cp(root, cacheDir, { recursive: true, filter: cacheFilter(root) });

  // 8. Marketplace sync. The authoritative marketplace manifest lives at
  // <marketplaceDir>/.claude-plugin/marketplace.json (matching every other
  // installed marketplace) — NOT the marketplace root.
  //
  // A maintainer often develops *inside* the marketplace clone, so root and
  // marketplaceDir are the same directory. Copying a file onto itself throws
  // EINVAL and aborted the release after the manifests were already bumped,
  // leaving a half-applied tree. Nothing to sync in that case — the clone is
  // the source.
  // realpath, not string equality: the source is often opened through a symlink
  // (the global CLI links into this clone), and two different strings can name the
  // same directory. A false negative here re-triggers the self-copy EINVAL.
  result.marketplaceIsSource = await sameDirectory(root, marketplaceDir);
  if (!result.marketplaceIsSource) {
    const destMarketplaceJson = path.join(marketplaceDir, '.claude-plugin', 'marketplace.json');
    await mkdir(path.dirname(destMarketplaceJson), { recursive: true });
    await cp(marketplacePath, destMarketplaceJson);
    const srcCommands = path.join(root, 'commands');
    if (await exists(srcCommands)) {
      await syncCommandsDir(srcCommands, path.join(marketplaceDir, 'commands'));
    }
  }

  // The clone is a catalog: `/plugin marketplace update` (a git pull) owns its
  // code, and release only refreshes the manifest and commands. That leaves the
  // clone claiming the new version while its bin/ and src/ stay at whatever it
  // last pulled — and on machines where the global `harness-team` is a symlink
  // into this clone, that stale code is what hooks and the terminal actually
  // run. Release cannot fix it (pulling someone else's checkout is not this
  // command's business) but it must not stay quiet about causing it.
  result.marketplaceStaleVersion = await readJsonVersion(path.join(marketplaceDir, 'package.json'));
  if (!result.marketplaceIsSource && result.marketplaceStaleVersion && result.marketplaceStaleVersion !== newVersion) {
    result.marketplaceStaleDir = marketplaceDir;
  }

  // 9. installed_plugins.json.
  const installedPath = path.join(pluginsRoot, 'installed_plugins.json');
  if (await exists(installedPath)) {
    // Preserve the file's trailing-newline convention: the live
    // ~/.claude/plugins/installed_plugins.json (owned by Claude Code) has NO
    // trailing newline, so match whatever the original used.
    const installedText = await readFile(installedPath, 'utf8');
    const installed = JSON.parse(installedText);
    const hadTrailingNewline = installedText.endsWith('\n');
    const records = installed.plugins?.[key];
    if (Array.isArray(records) && records.length > 0) {
      let rec = records.find(r => r.scope === 'user');
      if (!rec) rec = records[0];
      rec.version = newVersion;
      rec.installPath = cacheDir;
      rec.lastUpdated = new Date().toISOString();
      rec.gitCommitSha = gitSha === undefined ? await deriveGitSha(root) : gitSha;
      await writeFile(installedPath, JSON.stringify(installed, null, 2) + (hadTrailingNewline ? '\n' : ''));
      result.installedUpdated = true;
    } else {
      result.installedNote = `installed_plugins.json 에 "${key}" 키 없음 — 스킵`;
    }
  } else {
    result.installedNote = `installed_plugins.json 없음 (${installedPath}) — 스킵`;
  }

  return result;
}

async function readJsonVersion(file) {
  const raw = await readFile(file, 'utf8').catch(() => null);
  if (!raw) return null;
  try { return JSON.parse(raw).version ?? null; } catch { return null; }
}

// Emitted after the git `next:` line because it is a separate follow-up: the
// release itself succeeded, and this is about the clone the global CLI is
// symlinked into. Returns lines so the CLI and the JSON envelope share wording.
export function marketplaceStaleHints(res) {
  if (!res.marketplaceStaleDir) return [];
  return [
    `⚠️ marketplace clone이 ${res.marketplaceStaleVersion} 코드에 머물러 있음 (${res.marketplaceStaleDir}) — ` +
    `release는 카탈로그(marketplace.json·commands)만 갱신한다. 전역 harness-team이 이 clone을 가리키면 훅과 터미널이 구버전으로 실행된다.`,
    `next: 커밋·태그를 push한 뒤 clone을 갱신하라 — /plugin marketplace update 또는 git -C "${res.marketplaceStaleDir}" pull`,
  ];
}

function releaseArtifacts(res) {
  if (res.dryRun) return [];
  const a = ['package.json', '.claude-plugin/plugin.json', '.claude-plugin/marketplace.json', '.codex-plugin/plugin.json'];
  if (!res.skipCache) {
    a.push(res.cacheDir, res.marketplaceDir);
    if (res.installedUpdated) a.push('installed_plugins.json');
  }
  return a;
}

const CLAUDE_RUNNING_WARNING =
  'Claude Code 실행 중 감지 — release가 installed_plugins.json을 수정하면 경쟁 조건이 발생할 수 있습니다. ' +
  '가급적 Claude Code 종료 후 실행하세요. 중단 시 복구: harness-team release <x.y.z> (명시적 버전 재실행).';

function fmtTargets(res) {
  const lines = [`  manifests: package.json, .claude-plugin/plugin.json, .claude-plugin/marketplace.json, .codex-plugin/plugin.json (→ ${res.newVersion})`];
  if (!res.skipCache) {
    lines.push(`  cache: ${res.cacheDir}`);
    lines.push(`  marketplace: ${res.marketplaceDir}`);
    lines.push(`  installed_plugins.json: ${res.installedUpdated ? '갱신됨' : (res.installedNote || '스킵')}`);
  } else {
    lines.push(`  cache/marketplace/installed_plugins.json: 스킵 (--skip-cache)`);
  }
  return lines.join('\n');
}

export async function runRelease(ctx) {
  const bump = (ctx.taskArgs || [])[0] || 'patch';
  const json = !!(ctx.flags && ctx.flags.json);
  try {
    const res = await release({
      bump,
      root: ctx.targetDir,
      dryRun: !!ctx.flags['dry-run'],
      skipCache: !!ctx.flags['skip-cache'],
    });

    if (json) {
      emitObservation(buildEnvelope({
        command: 'release',
        status: res.claudeRunning ? 'warning' : 'success',
        summary: (res.claudeRunning ? '⚠️ Claude Code 실행 중 — ' : '') + (res.dryRun
          ? `release dry-run: ${res.oldVersion} → ${res.newVersion} (변경 없음)`
          : `release: ${res.oldVersion} → ${res.newVersion}`),
        nextActions: res.dryRun
          ? [`harness-team release ${bump}`]
          : [
              `git add -A && git commit -m "chore(release): 버전 ${res.newVersion}으로 범프" && git tag v${res.newVersion} && git push && git push --tags`,
              ...marketplaceStaleHints(res).filter(line => line.startsWith('next: ')).map(line => line.slice('next: '.length)),
            ],
        artifacts: releaseArtifacts(res),
        extra: res.claudeRunning ? { claudeRunning: true, claudeProcs: res.claudeProcs, warning: CLAUDE_RUNNING_WARNING } : undefined,
      }));
      return res;
    }

    if (res.claudeRunning) console.log(`⚠️ ${CLAUDE_RUNNING_WARNING}\n`);

    if (res.dryRun) {
      console.log(`ⓘ release (dry-run): ${res.oldVersion} → ${res.newVersion} — 변경 없음`);
      console.log(fmtTargets(res));
      console.log(`next: 계획을 검토한 뒤 \`harness-team release ${bump}\` (--dry-run 제거) 로 실제 적용`);
    } else {
      console.log(`✓ release: ${res.oldVersion} → ${res.newVersion}`);
      console.log(fmtTargets(res));
      console.log(
        `next: git add -A && git commit -m "chore(release): 버전 ${res.newVersion}으로 범프" && ` +
        `git tag v${res.newVersion} && git push && git push --tags`,
      );
      for (const line of marketplaceStaleHints(res)) console.log(line);
    }
    return res;
  } catch (err) {
    process.exitCode = 1;
    const packet = buildErrorPacket(ERROR_ADVICE[err.kind] || ERROR_ADVICE.generic);
    if (json) {
      emitObservation(buildEnvelope({
        command: 'release',
        status: 'error',
        summary: `release 실패: ${err.message}`,
        error: packet,
      }));
    } else {
      console.log(`✗ release: ${err.message}`);
      for (const line of renderErrorPacket(packet)) console.log(line);
    }
  }
}

// Per-kind escalation packet so the catch block never misdirects the user. 아래 4개 kind는
// 전부 첫 writeFile(‘4. Compute the SURGICAL rewrites’ 블록 뒤) 이전에 throw하므로 '무변경'이
// 사실이다. generic만 쓰기 이후의 예기치 못한 오류를 포함할 수 있어 문구가 다르다.
const ERROR_ADVICE = {
  'version-mismatch': {
    cause: '4개 매니페스트(package.json/.claude-plugin/plugin.json/.claude-plugin/marketplace.json/.codex-plugin/plugin.json)의 version이 서로 다름',
    retry: '네 파일의 version을 동일한 현재 버전으로 맞춘 뒤 재실행',
    alternatives: ['`git log -p -- package.json` 으로 마지막 합의된 버전을 확인해 네 파일을 그 값으로 맞춘다'],
    safeDefault: '매니페스트·태그·커밋 어느 것도 만들어지지 않는다',
    stop: '어느 값이 옳은지 모호하면 git history로 마지막 합의된 버전을 확인하라',
  },
  'bad-bump': {
    cause: 'bump 인자가 major|minor|patch 또는 유효한 x.y.z(선행 0 불가)가 아님',
    retry: 'major|minor|patch 또는 올바른 semver를 인자로 주고 재실행',
    alternatives: ['버전을 직접 고르지 말고 `major|minor|patch` 중 하나를 주어 자동 계산에 맡긴다'],
    safeDefault: '버전은 현재 값 그대로 남는다',
    stop: '명시적 버전은 선행 0 없는 정수 3개여야 한다 (예: 1.2.3, not 01.02.03)',
  },
  schema: {
    cause: '플러그인 매니페스트 스키마 위반 — marketplace.json에 자기 항목(plugin.json.name과 같은 이름)이 정확히 1개가 아니거나 Claude/Codex plugin name이 불일치',
    retry: 'marketplace.json.plugins 안에서 자기 항목을 정확히 1개로 만들고(동반 플러그인 항목은 그대로 둔다) .claude-plugin/plugin.json 및 .codex-plugin/plugin.json의 name을 일치시킨 뒤 재실행',
    alternatives: ['동반 플러그인 항목이 원인이면 그 항목은 그대로 두고 자기 항목만 1개로 정리한다 — 핀은 source.sha로 표현한다'],
    safeDefault: '매니페스트·마켓플레이스 파일 모두 바뀌지 않는다',
    stop: '스키마는 수동 점검이 필요하다 — 자동 수정하지 말 것. 동반 항목에는 version 필드를 넣지 않는다(핀은 source.sha로 표현한다)',
  },
  'manifest-format': {
    cause: '매니페스트의 `"version": "x"` 필드가 정확히 1회 나타나지 않음 — 형식이 예상과 다름',
    retry: '해당 파일에서 version 필드를 표준 형식(`"version": "x.y.z"`, 공백 1개)으로 정규화한 뒤 재실행',
    alternatives: ['손으로 정규화하기 어려우면 마지막 정상 커밋에서 그 파일만 복원한 뒤 재실행한다'],
    safeDefault: '자동 치환을 중단했으므로 파일은 원래 내용 그대로다',
    stop: '안전을 위해 자동 치환을 중단했다 — 파일 포맷을 직접 확인하라',
  },
  generic: {
    cause: '파일 시스템 오류 또는 예기치 못한 오류 가능 — 경로/권한 확인',
    retry: '원인 메시지를 확인하고 수정 후 재실행',
    alternatives: [],
    safeDefault: '실패 시점까지의 변경이 남을 수 있다 — `git status` 로 확인한 뒤 되돌리고 재실행',
    stop: '반복 실패 시 수동 점검',
  },
};

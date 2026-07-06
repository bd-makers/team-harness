import { readFile, writeFile, mkdir, cp, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { buildEnvelope, emitObservation } from '../observation.mjs';

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

  // Read raw text once; parse from that same text. Raw text feeds the surgical
  // write (FIX 1); the parsed objects feed the agreement/schema checks.
  const pkgText = await readFile(pkgPath, 'utf8');
  const pluginText = await readFile(pluginPath, 'utf8');
  const marketplaceText = await readFile(marketplacePath, 'utf8');
  const pkg = JSON.parse(pkgText);
  const plugin = JSON.parse(pluginText);
  const marketplace = JSON.parse(marketplaceText);

  // 1. Marketplace schema guard (run first so the version check can safely read plugins[0]).
  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length !== 1) {
    throw tagged(
      'schema',
      `release: marketplace.json.plugins 길이는 정확히 1이어야 함 — 현재 ${marketplace.plugins?.length ?? 0}`,
    );
  }
  if (marketplace.plugins[0].name !== plugin.name) {
    throw tagged(
      'schema',
      `release: 플러그인 이름 불일치 — plugin.json.name=${plugin.name}, marketplace.json.plugins[0].name=${marketplace.plugins[0].name}`,
    );
  }

  // 2. All 3 manifests must agree on the current version.
  const pkgV = pkg.version;
  const pluginV = plugin.version;
  const mktV = marketplace.plugins[0].version;
  if (!(pkgV === pluginV && pluginV === mktV)) {
    throw tagged(
      'version-mismatch',
      `release: 매니페스트 버전 불일치 — package.json=${pkgV}, plugin.json=${pluginV}, marketplace.json=${mktV}`,
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
    manifests: [pkgPath, pluginPath, marketplacePath],
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

  // 4. Dry run: write nothing.
  if (dryRun) return result;

  // 5. Write the 3 manifests via SURGICAL string replacement of only the version
  // field on the raw text — never re-serialize, so inline arrays/indentation/
  // trailing newline survive byte-for-byte. The single-occurrence guard throws
  // (kind: 'manifest-format') rather than risk silent corruption.
  const newPkgText = surgicalVersionReplace(pkgText, oldVersion, newVersion, 'package.json');
  const newPluginText = surgicalVersionReplace(pluginText, oldVersion, newVersion, '.claude-plugin/plugin.json');
  const newMarketplaceText = surgicalVersionReplace(marketplaceText, oldVersion, newVersion, '.claude-plugin/marketplace.json');
  await writeFile(pkgPath, newPkgText);
  await writeFile(pluginPath, newPluginText);
  await writeFile(marketplacePath, newMarketplaceText);

  // 6. skipCache short-circuits cache, marketplace sync, and installed_plugins.
  if (skipCache) return result;

  // 7. Cache copy.
  await mkdir(cacheDir, { recursive: true });
  await cp(root, cacheDir, { recursive: true, filter: cacheFilter(root) });

  // 8. Marketplace sync. The authoritative marketplace manifest lives at
  // <marketplaceDir>/.claude-plugin/marketplace.json (matching every other
  // installed marketplace) — NOT the marketplace root.
  const destMarketplaceJson = path.join(marketplaceDir, '.claude-plugin', 'marketplace.json');
  await mkdir(path.dirname(destMarketplaceJson), { recursive: true });
  await cp(marketplacePath, destMarketplaceJson);
  const srcCommands = path.join(root, 'commands');
  if (await exists(srcCommands)) {
    await syncCommandsDir(srcCommands, path.join(marketplaceDir, 'commands'));
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

function releaseArtifacts(res) {
  if (res.dryRun) return [];
  const a = ['package.json', 'plugin.json', 'marketplace.json'];
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
  const lines = [`  manifests: package.json, plugin.json, marketplace.json (→ ${res.newVersion})`];
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
          : [`git add -A && git commit -m "chore(release): 버전 ${res.newVersion}으로 범프" && git tag v${res.newVersion} && git push && git push --tags`],
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
    }
    return res;
  } catch (err) {
    process.exitCode = 1;
    const advice = ERROR_ADVICE[err.kind] || ERROR_ADVICE.generic;
    if (json) {
      emitObservation(buildEnvelope({
        command: 'release',
        status: 'error',
        summary: `release 실패: ${err.message}`,
        error: { root_cause: advice.cause, safe_retry: advice.retry, stop_condition: advice.stop },
      }));
    } else {
      console.log(`✗ release: ${err.message}`);
      console.log(`cause: ${advice.cause}`);
      console.log(`retry: ${advice.retry}`);
      console.log(`stop: ${advice.stop}`);
    }
  }
}

// Per-kind cause/retry/stop advice so the catch block never misdirects the user.
const ERROR_ADVICE = {
  'version-mismatch': {
    cause: '3개 매니페스트(package.json/plugin.json/marketplace.json)의 version이 서로 다름',
    retry: '세 파일의 version을 동일한 현재 버전으로 맞춘 뒤 재실행',
    stop: '어느 값이 옳은지 모호하면 git history로 마지막 합의된 버전을 확인하라',
  },
  'bad-bump': {
    cause: 'bump 인자가 major|minor|patch 또는 유효한 x.y.z(선행 0 불가)가 아님',
    retry: 'major|minor|patch 또는 올바른 semver를 인자로 주고 재실행',
    stop: '명시적 버전은 선행 0 없는 정수 3개여야 한다 (예: 1.2.3, not 01.02.03)',
  },
  schema: {
    cause: 'marketplace.json 스키마 위반 — plugins 길이가 1이 아니거나 plugins[0].name이 plugin.json.name과 불일치',
    retry: 'marketplace.json.plugins를 정확히 1개로 만들고 name을 plugin.json.name과 일치시킨 뒤 재실행',
    stop: '스키마는 수동 점검이 필요하다 — 자동 수정하지 말 것',
  },
  'manifest-format': {
    cause: '매니페스트의 `"version": "x"` 필드가 정확히 1회 나타나지 않음 — 형식이 예상과 다름',
    retry: '해당 파일에서 version 필드를 표준 형식(`"version": "x.y.z"`, 공백 1개)으로 정규화한 뒤 재실행',
    stop: '안전을 위해 자동 치환을 중단했다 — 파일 포맷을 직접 확인하라',
  },
  generic: {
    cause: '파일 시스템 오류 또는 예기치 못한 오류 가능 — 경로/권한 확인',
    retry: '원인 메시지를 확인하고 수정 후 재실행',
    stop: '반복 실패 시 수동 점검',
  },
};

import { readFile, writeFile, mkdir, cp, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const pexec = promisify(execFile);

const SEMVER_RE = /^\d+\.\d+\.\d+$/;

// Path segments that must never be copied into the plugin cache.
const EXCLUDE_SEGMENTS = new Set(['.git', 'node_modules', 'tests', 'scripts']);

async function readJson(p) {
  return JSON.parse(await readFile(p, 'utf8'));
}

async function writeJson(p, data) {
  await writeFile(p, JSON.stringify(data, null, 2) + '\n');
}

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

function computeNewVersion(bump, current) {
  if (SEMVER_RE.test(bump)) return bump;
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!m) throw new Error(`release: 현재 버전이 semver 형식이 아님 — ${current}`);
  let [maj, min, pat] = m.slice(1).map(Number);
  if (bump === 'major') { maj += 1; min = 0; pat = 0; }
  else if (bump === 'minor') { min += 1; pat = 0; }
  else if (bump === 'patch') { pat += 1; }
  else throw new Error(`release: 알 수 없는 bump — "${bump}" (major|minor|patch|x.y.z 중 하나여야 함)`);
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
} = {}) {
  pluginsRoot = pluginsRoot ?? (process.env.CLAUDE_PLUGINS_ROOT ?? path.join(os.homedir(), '.claude/plugins'));

  const pkgPath = path.join(root, 'package.json');
  const pluginPath = path.join(root, '.claude-plugin/plugin.json');
  const marketplacePath = path.join(root, '.claude-plugin/marketplace.json');

  const pkg = await readJson(pkgPath);
  const plugin = await readJson(pluginPath);
  const marketplace = await readJson(marketplacePath);

  // 1. Marketplace schema guard (run first so the version check can safely read plugins[0]).
  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length !== 1) {
    throw new Error(
      `release: marketplace.json.plugins 길이는 정확히 1이어야 함 — 현재 ${marketplace.plugins?.length ?? 0}`,
    );
  }
  if (marketplace.plugins[0].name !== plugin.name) {
    throw new Error(
      `release: 플러그인 이름 불일치 — plugin.json.name=${plugin.name}, marketplace.json.plugins[0].name=${marketplace.plugins[0].name}`,
    );
  }

  // 2. All 3 manifests must agree on the current version.
  const pkgV = pkg.version;
  const pluginV = plugin.version;
  const mktV = marketplace.plugins[0].version;
  if (!(pkgV === pluginV && pluginV === mktV)) {
    throw new Error(
      `release: 매니페스트 버전 불일치 — package.json=${pkgV}, plugin.json=${pluginV}, marketplace.json=${mktV}`,
    );
  }

  // 3. Compute and validate new version.
  const oldVersion = pkgV;
  const newVersion = computeNewVersion(bump, oldVersion);
  if (!SEMVER_RE.test(newVersion)) {
    throw new Error(`release: 계산된 버전이 semver 형식이 아님 — ${newVersion}`);
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

  // 4. Dry run: write nothing.
  if (dryRun) return result;

  // 5. Write the 3 manifests.
  pkg.version = newVersion;
  plugin.version = newVersion;
  marketplace.plugins[0].version = newVersion;
  await writeJson(pkgPath, pkg);
  await writeJson(pluginPath, plugin);
  await writeJson(marketplacePath, marketplace);

  // 6. skipCache short-circuits cache, marketplace sync, and installed_plugins.
  if (skipCache) return result;

  // 7. Cache copy.
  await mkdir(cacheDir, { recursive: true });
  await cp(root, cacheDir, { recursive: true, filter: cacheFilter(root) });

  // 8. Marketplace sync.
  await mkdir(marketplaceDir, { recursive: true });
  await cp(marketplacePath, path.join(marketplaceDir, 'marketplace.json'));
  const srcCommands = path.join(root, 'commands');
  if (await exists(srcCommands)) {
    await syncCommandsDir(srcCommands, path.join(marketplaceDir, 'commands'));
  }

  // 9. installed_plugins.json.
  const installedPath = path.join(pluginsRoot, 'installed_plugins.json');
  if (await exists(installedPath)) {
    const installed = await readJson(installedPath);
    const records = installed.plugins?.[key];
    if (Array.isArray(records) && records.length > 0) {
      let rec = records.find(r => r.scope === 'user');
      if (!rec) rec = records[0];
      rec.version = newVersion;
      rec.installPath = cacheDir;
      rec.lastUpdated = new Date().toISOString();
      rec.gitCommitSha = gitSha === undefined ? await deriveGitSha(root) : gitSha;
      await writeJson(installedPath, installed);
      result.installedUpdated = true;
    } else {
      result.installedNote = `installed_plugins.json 에 "${key}" 키 없음 — 스킵`;
    }
  } else {
    result.installedNote = `installed_plugins.json 없음 (${installedPath}) — 스킵`;
  }

  return result;
}

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
  try {
    const res = await release({
      bump,
      root: ctx.targetDir,
      dryRun: !!ctx.flags['dry-run'],
      skipCache: !!ctx.flags['skip-cache'],
    });

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
    console.log(`✗ release: ${err.message}`);
    console.log(`cause: 3개 매니페스트(package.json/plugin.json/marketplace.json) 버전 불일치 또는 marketplace 스키마 위반일 가능성이 높음`);
    console.log(`retry: 세 파일의 version을 동일하게 맞추고 marketplace.json.plugins[0].name이 plugin.json.name과 같은지 확인한 뒤 재실행`);
    console.log(`stop: Claude Code가 실행 중이면 installed_plugins.json 경쟁이 발생할 수 있으니 종료 후 실행하라`);
  }
}

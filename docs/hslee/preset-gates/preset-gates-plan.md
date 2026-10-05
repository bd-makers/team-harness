# preset-gates — Plan

> 실행: superpowers:executing-plans(Native) 또는 subagent-driven-development. `## 단계`의 체크박스가 `done` 가드의 입력이다 —
> 각 단계는 아래 `## 태스크 상세`의 같은 번호를 끝까지 마치고 테스트가 통과한 뒤에만 `- [x]`로 켠다.

## 목표
커밋 게이트·포맷의 언어 지식을 프리셋 데이터(`templates/presets/*.json`)로 옮기고, 훅은 `.harness/config.json`에 확정된
명령 목록만 `harness-team gate commit|format`으로 실행한다. init·migrate·`gate suggest`가 같은 제안 함수로 제안·확정하고,
doctor는 지문이 바뀌면 제안만 한다. 정본 spec: `docs/hslee/preset-gates/preset-gates-spec.md`.

**Architecture**: `src/presets.mjs`(데이터 로드·조건 평가·제안·기록) ← `src/commands/gate.mjs`(commit·format·suggest) ← 훅 2개(얇은 래퍼)·init·migrate·doctor.
**Tech**: Node ≥ 24 ESM·plain JS, `node --test`, `path.matchesGlob`(내장 — 새 의존성 없음), bash 훅.

## 단계
- [x] spec/plan 다이어그램 작성 → docs/hslee/preset-gates/preset-gates-diagram.html
- [x] 1. 프리셋 데이터 3종 + `src/presets.mjs` 제안 엔진 (+ `tests/presets.test.mjs`)
- [x] 2. `harness-team gate commit|format` 실행기 + 라우터·명령표 등록 (+ `tests/gate-command.test.mjs`)
- [x] 3. `harness-team gate suggest` (+ 같은 테스트 파일)
- [x] 4. 훅 2개 래퍼화 + stock sha·fixture 등록 — **한 커밋** (+ `hooks-jq-fallback`·`migrate-hooks` 테스트 갱신)
- [x] 5. init 제안·확정 단계 (+ `tests/init-gates.test.mjs`)
- [x] 6. migrate 이행 단계 `migrateGates` (+ `tests/migrate-gates.test.mjs`)
- [x] 7. doctor 지문 비교 (+ `tests/doctor.test.mjs`)
- [x] 8. 문서: overview 카드·hooks.mmd 재생성, task.mjs 주석, CHANGELOG `[Unreleased]`
- [x] 9. 검증: `npm run test`·`npm run docs:check` PASS + 소비자 3곳 읽기 전용 제안 결과를 artifact에 기록
- [x] 10. codex 리뷰(`review --scope diff --base origin/main`) → 반영 → artifact `## Reviews` 기록

## Global Constraints
- D8: 커스터마이즈된 훅·이미 있는 `gates`는 덮지 않는다(명시 확인한 `gate suggest`만 예외).
- D11: 훅·CLI 코드에 언어·PM 분기 금지 — PM별 실행 형태도 프리셋 JSON의 `pm` 표에 둔다.
- `harness:jq-fallback` 블록은 4개 훅에서 바이트 동일 유지, 두 훅 모두 `json_input_field`·`command -v jq`를 계속 쓴다.
- 새 npm 의존성 없음. 런타임 Node ≥ 24(`package.json` engines).
- 훅 출력 문구 계약: 게이트 진입 `커밋 전 검증 실행 중`, 실패 `커밋 게이트 실패`, 통과 `검증 통과`, 미설정 `커밋 게이트 미설정`,
  127 `설정 오류: 명령을 찾을 수 없습니다`, CLI 부재 `harness-team CLI를 찾지 못해 커밋 게이트를 건너뜁니다`.
- 소비자 프로젝트에 init·migrate를 실행하지 않는다(실측은 `buildProposal` 읽기 전용 호출만).

## Review Focus
1. **malformed `.harness/config.json`** — `gate commit`은 스택 트레이스 없이 "설정 오류"로 차단(exit 2), `gate format`은 조용히 exit 0. (태스크 2 테스트)
2. **`gates.commit`이 배열이 아니거나 빈 문자열·비문자열을 포함** — 설정 오류로 차단. (태스크 2 테스트)
3. **공백·따옴표가 든 파일 경로** — format 명령에 인수 하나로 전달(`sh -c 'cmd "$@"' sh <file>`). (태스크 2 테스트)
4. **macOS `/var` ↔ `/private/var` 심볼릭 경로** — cwd와 file_path를 `realpath`로 맞춘 뒤 상대 경로를 계산해야 glob이 맞는다.
   프로젝트 밖 파일은 매칭하지 않는다. (태스크 2 테스트)
5. **이미 `gates`가 있는 프로젝트에 init 재실행** — 제안하지 않고 config 무변경. (태스크 5 테스트)

## 태스크 상세

### Task 1: 프리셋 데이터 + 제안 엔진
**Files**: Create `templates/presets/node.json`·`python.json`·`generic.json`, `src/presets.mjs`, `tests/presets.test.mjs`.
**Produces**:
- `loadPresets(): Promise<Preset[]>` · `selectPreset(presets, stackId): Preset`
- `buildProposal(dir, stack): Promise<{ gates: { commit: string[] }, format: Record<glob, string[]>, fingerprint: { preset, pm, signals: string[] } }>`
  (`stack` = `resolveStack()` 결과 — `id`·`packageManager` 사용)
- `applyProposal(targetDir, proposal): Promise<void>` — `readConfigStrict` → 세 키 설정 → `writeConfig`(다른 키 보존, malformed면 throw)
- `describeProposal(proposal): string` · `fingerprintDrift(stored, now): string | null`

`templates/presets/node.json`:
```json
{
  "id": "node",
  "label": "Node.js (JS/TS)",
  "match": { "stackIds": ["node", "react", "next", "react-native", "expo"] },
  "pm": {
    "npm":  { "exec": "npx",       "run": "npm run" },
    "pnpm": { "exec": "pnpm exec", "run": "pnpm run" },
    "yarn": { "exec": "yarn",      "run": "yarn run" },
    "bun":  { "exec": "bunx",      "run": "bun run" }
  },
  "commit": [
    { "when": { "file": "tsconfig.json" }, "run": "{exec} tsc --noEmit" },
    { "when": { "script": "lint" }, "run": "{run} lint" },
    { "when": { "script": "test" }, "run": "{run} test" }
  ],
  "format": [
    { "when": { "dependency": "prettier" }, "glob": "*.{ts,tsx,js,jsx,json}", "run": ["{exec} prettier --write"] }
  ]
}
```
`python.json`(`when`이 배열이면 any-of):
```json
{
  "id": "python",
  "label": "Python",
  "match": { "stackIds": ["python"] },
  "commit": [
    { "when": [{ "file": "ruff.toml" }, { "fileContains": ["pyproject.toml", "[tool.ruff"] }], "run": "ruff check ." },
    { "when": [{ "file": "pytest.ini" }, { "fileContains": ["pyproject.toml", "[tool.pytest"] }], "run": "pytest" }
  ],
  "format": [
    { "when": [{ "file": "ruff.toml" }, { "fileContains": ["pyproject.toml", "[tool.ruff"] }], "glob": "*.py", "run": ["ruff format"] }
  ]
}
```
`generic.json`: `{ "id": "generic", "label": "Generic", "match": { "stackIds": ["generic", "go"] }, "commit": [], "format": [] }`

`src/presets.mjs` 핵심:
```js
import { readFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { readConfigStrict, writeConfig } from './user-config.mjs';

const PRESET_DIR = new URL('../templates/presets/', import.meta.url);

export async function loadPresets() {
  const names = (await readdir(PRESET_DIR)).filter(n => n.endsWith('.json')).sort();
  return Promise.all(names.map(async n => JSON.parse(await readFile(new URL(n, PRESET_DIR), 'utf8'))));
}

export function selectPreset(presets, stackId) {
  return presets.find(p => p.match?.stackIds?.includes(stackId)) ?? presets.find(p => p.id === 'generic');
}

async function readText(p) { try { return await readFile(p, 'utf8'); } catch { return null; } }
async function exists(p) { try { await access(p); return true; } catch { return false; } }

// 조건 종류는 데이터 해석용 넷뿐이다 — 어떤 파일·스크립트가 무엇을 뜻하는지는 프리셋 JSON만 안다(D11).
async function holds(dir, pkg, cond) {
  if (Array.isArray(cond)) {
    for (const c of cond) if (await holds(dir, pkg, c)) return true;
    return false;
  }
  if (cond.file) return exists(join(dir, cond.file));
  if (cond.script) return Boolean(pkg?.scripts?.[cond.script]);
  if (cond.dependency) return Object.hasOwn({ ...pkg?.dependencies, ...pkg?.devDependencies }, cond.dependency);
  if (cond.fileContains) return (await readText(join(dir, cond.fileContains[0])))?.includes(cond.fileContains[1]) ?? false;
  throw new Error(`unknown preset condition: ${JSON.stringify(cond)}`);
}

export async function buildProposal(dir, stack) {
  const preset = selectPreset(await loadPresets(), stack.id);
  const text = await readText(join(dir, 'package.json'));
  let pkg = null;
  try { pkg = text ? JSON.parse(text) : null; } catch { /* 깨진 package.json은 조건 불충족으로 본다 */ }
  const pm = stack.packageManager;
  const vars = preset.pm?.[pm] ?? {};
  const fill = cmd => cmd.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
  const signals = new Set();
  const ok = async when => {
    if (!when) return true;
    const hit = await holds(dir, pkg, when);
    if (hit) signals.add(JSON.stringify(when));
    return hit;
  };
  const commit = [];
  for (const item of preset.commit ?? []) if (await ok(item.when)) commit.push(fill(item.run));
  const format = {};
  for (const item of preset.format ?? []) if (await ok(item.when)) format[item.glob] = item.run.map(fill);
  return { gates: { commit }, format, fingerprint: { preset: preset.id, pm, signals: [...signals].sort() } };
}

export async function applyProposal(targetDir, proposal) {
  const config = await readConfigStrict(targetDir);
  config.gates = proposal.gates;
  config.format = proposal.format;
  config.fingerprint = proposal.fingerprint;
  await writeConfig(targetDir, config);
}

export function describeProposal({ gates, format, fingerprint }) {
  const lines = [`커밋 게이트 제안 (프리셋: ${fingerprint.preset}, 패키지 매니저: ${fingerprint.pm})`];
  for (const c of gates.commit) lines.push(`  commit: ${c}`);
  for (const [glob, cmds] of Object.entries(format)) lines.push(`  format: ${glob} → ${cmds.join(' ; ')}`);
  if (lines.length === 1) lines.push('  (제안할 명령 없음 — 게이트는 아무것도 실행하지 않습니다)');
  return lines.join('\n');
}

export function fingerprintDrift(stored, now) {
  const parts = [];
  if (stored?.preset !== now.preset) parts.push(`프리셋 ${stored?.preset} → ${now.preset}`);
  if (stored?.pm !== now.pm) parts.push(`패키지 매니저 ${stored?.pm} → ${now.pm}`);
  const before = new Set(stored?.signals ?? []);
  const after = new Set(now.signals);
  for (const s of after) if (!before.has(s)) parts.push(`+${s}`);
  for (const s of before) if (!after.has(s)) parts.push(`-${s}`);
  return parts.length ? parts.join(', ') : null;
}
```
테스트(`tests/presets.test.mjs`, `detect-stack.test.mjs`의 `project(files)` 임시 디렉터리 패턴 복사):
- node+npm, tsconfig·lint·test → commit `['npx tsc --noEmit','npm run lint','npm run test']`, format `{}`(prettier 없음).
- `pnpm-lock.yaml` + prettier devDep → `pnpm exec tsc --noEmit`… + format `{'*.{ts,tsx,js,jsx,json}': ['pnpm exec prettier --write']}`.
- python + `pyproject.toml`에 `[tool.ruff]` → commit `['ruff check .']`, format `{'*.py': ['ruff format']}`.
- generic·go → 빈 제안. `build` 스크립트만 추가 → `fingerprintDrift`가 `null`. `lint` 추가 → `+{"script":"lint"}` 포함.
- `applyProposal`이 기존 `user` 키를 보존, malformed config면 reject.
- 실행: `node --test tests/presets.test.mjs` → 실패 확인 후 구현 → PASS. 커밋 `feat(presets): 커밋 게이트 프리셋 데이터와 제안 엔진`.

### Task 2: `gate commit|format` 실행기
**Files**: Create `src/commands/gate.mjs`, `tests/gate-command.test.mjs`. Modify `bin/harness-team.mjs:52,58`(+import·`case 'gate'`), `src/cli-args.mjs:30-86`(COMMANDS 항목).
**Consumes**: `readConfigStrict`. **Produces**: `runGate(ctx)` — `ctx.taskArgs[0]` ∈ `commit|format|suggest`.

- `cli-args.mjs` COMMANDS: `{ name: 'gate', args: 'commit | format <file> | suggest', summary: 'Run the commit gate / format commands declared in .harness/config.json, or propose them from a preset', flags: [] }`
- `bin/harness-team.mjs`: `taskCmds`에 `'gate'` 추가, `taskArgs` 조건에 `cmd === 'gate'` 추가, `case 'gate': return runGate(ctx);`.

```js
import { spawnSync } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { basename, isAbsolute, matchesGlob, relative, sep } from 'node:path';
import { readConfigStrict } from '../user-config.mjs';

const CONFIG_HINT = '.harness/config.json 의 gates.commit 을 고치거나 `harness-team gate suggest` 를 실행하세요.';

export async function runGate(ctx) {
  const [verb, ...rest] = ctx.taskArgs || [];
  if (verb === 'commit' && rest.length === 0) return gateCommit(ctx);
  if (verb === 'format' && rest.length === 1) return gateFormat(ctx, rest[0]);
  if (verb === 'suggest' && rest.length === 0) return gateSuggest(ctx);   // 태스크 3
  console.error('usage: harness-team gate commit | format <file> | suggest');
  process.exitCode = 2;
}

function block(msg) {
  console.error(`❌ ${msg}\n   커밋을 중단합니다.`);
  process.exitCode = 2;
}

async function gateCommit(ctx) {
  let config;
  try { config = await readConfigStrict(ctx.targetDir); }
  catch (e) { return block(`설정 오류: ${e.message}`); }
  const list = config.gates?.commit;
  if (list === undefined) {
    console.error('ℹ️ 커밋 게이트 미설정 — `harness-team gate suggest` 로 설정할 수 있습니다.');
    return;
  }
  if (!Array.isArray(list) || list.some(c => typeof c !== 'string' || !c.trim())) {
    return block(`설정 오류: gates.commit 은 비어 있지 않은 문자열 배열이어야 합니다 — ${CONFIG_HINT}`);
  }
  console.error(`🔍 커밋 전 검증 실행 중... (${list.length}개)`);
  for (const cmd of list) {
    // 명령 출력은 stderr로 — PreToolUse exit 2에서 Claude가 읽는 채널이다.
    const r = spawnSync('/bin/sh', ['-c', cmd], { cwd: ctx.targetDir, stdio: ['ignore', 2, 2] });
    if (r.status === 127) return block(`설정 오류: 명령을 찾을 수 없습니다 — ${cmd}\n   → ${CONFIG_HINT}`);
    if (r.status !== 0) return block(`커밋 게이트 실패: ${cmd} (exit ${r.status ?? r.signal})`);
  }
  console.error('✅ 검증 통과. 커밋을 진행합니다.');
}

// 편의 기능 — 어떤 실패도 막지 않고 조용히 끝난다.
async function gateFormat(ctx, file) {
  let config, root, abs;
  try {
    config = await readConfigStrict(ctx.targetDir);
    root = await realpath(ctx.targetDir);
    abs = await realpath(isAbsolute(file) ? file : `${ctx.targetDir}${sep}${file}`);
  } catch { return; }
  const format = config.format;
  if (!format || typeof format !== 'object' || Array.isArray(format)) return;
  const rel = relative(root, abs);
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return;
  for (const [glob, cmds] of Object.entries(format)) {
    if (!Array.isArray(cmds) || !matchesGlob(glob.includes('/') ? rel : basename(rel), glob)) continue;
    for (const cmd of cmds) {
      if (typeof cmd === 'string' && cmd.trim()) {
        spawnSync('/bin/sh', ['-c', `${cmd} "$@"`, 'sh', file], { cwd: ctx.targetDir, stdio: 'ignore' });
      }
    }
  }
}
```
테스트(`config-command.test.mjs`의 `fixture`·`capture` 패턴 복사, `runGate({ targetDir, flags: {}, taskArgs })` 직접 호출):
- commit: `['node -e ""']` → exitCode 0·`검증 통과` / `['node -e "process.exit(3)"', 'node -e ""']` → 2·`커밋 게이트 실패`(두 번째 미실행 — 마커 파일로 확인) /
  `['definitely-not-a-cmd-xyz']` → 2·`설정 오류: 명령을 찾을 수 없습니다` / gates 없음 → 0·`커밋 게이트 미설정` /
  `{gates:{commit:'npm test'}}`·`['']` → 2·`설정 오류` / config `{oops` → 2·`설정 오류`, 스택 트레이스 없음.
- format: config `{format:{'*.txt':['node -e "require(\'fs\').appendFileSync(\'log\', process.argv[1]+\'\\n\')"']}}`로
  `my file.txt`(공백) → log 한 줄이 그 경로 그대로 / `a.md` → log 없음 / 프로젝트 밖 파일 → log 없음 / malformed config → 예외 없이 종료.
- `tests/cli-args.test.mjs`가 새 명령을 자동으로 검사한다(`--help`·라우터 대조·reserved task name) — 그대로 PASS해야 한다.
- 실행: `node --test tests/gate-command.test.mjs tests/cli-args.test.mjs tests/task-reserved-names.test.mjs`. 커밋 `feat(gate): config 선언 커밋 게이트·포맷 실행기`.

### Task 3: `gate suggest`
**Files**: Modify `src/commands/gate.mjs`, `tests/gate-command.test.mjs`.
**Consumes**: `buildProposal`·`applyProposal`·`describeProposal`(태스크 1), `resolveStack`, `loadRenderState`, `confirm`.
```js
import { resolveStack } from '../detect-stack.mjs';
import { loadRenderState } from '../render-state.mjs';
import { confirm } from '../prompt.mjs';
import { applyProposal, buildProposal, describeProposal } from '../presets.mjs';

async function gateSuggest(ctx) {
  let config;
  try { config = await readConfigStrict(ctx.targetDir); }
  catch (e) { console.error(`gate suggest: ${e.message}`); process.exitCode = 1; return; }
  const { stack: pin } = await loadRenderState(ctx.targetDir);   // init.mjs:23-25와 같은 스택 결정
  const proposal = await buildProposal(ctx.targetDir, await resolveStack(ctx.targetDir, pin));
  console.log(describeProposal(proposal));
  const overwriting = config.gates !== undefined;
  if (overwriting) console.log(`  현재 gates.commit: ${JSON.stringify(config.gates?.commit ?? null)} — 기록하면 gates·format·fingerprint를 덮어씁니다.`);
  const ok = ctx.flags.yes || await confirm('이 제안을 .harness/config.json 에 기록할까요?', { defaultYes: !overwriting });
  if (!ok) { console.log('기록하지 않았습니다.'); return; }
  await applyProposal(ctx.targetDir, proposal);
  console.log('✓ .harness/config.json 갱신');
}
```
테스트: `--yes`로 node 프로젝트 → 세 키 기록·`user` 보존 / 기존 gates가 있어도 `--yes`면 덮어씀 / malformed → exitCode 1·파일 무변경.
커밋 `feat(gate): gate suggest — 현재 감지로 제안 재적용`.

### Task 4: 훅 2개 래퍼화 (한 커밋)
**Files**: Modify `templates/.claude/hooks/pre-commit-check.sh`·`auto-format.sh`, `src/commands/migrate.mjs:282-317`,
`tests/hooks-jq-fallback.test.mjs:25-60,288-440`, `tests/migrate-hooks.test.mjs`(고정 개수 17 → 19), `tests/fixtures/stock-hooks/README.md`.
Create `tests/fixtures/stock-hooks/pre-preset-gates/{pre-commit-check.sh,auto-format.sh}`.

1. **편집 전에** 현재 두 훅을 fixture로 바이트 복사하고 sha를 기록한다:
   `cp templates/.claude/hooks/pre-commit-check.sh templates/.claude/hooks/auto-format.sh tests/fixtures/stock-hooks/pre-preset-gates/` →
   `shasum -a 256 tests/fixtures/stock-hooks/pre-preset-gates/*` → `git rev-parse HEAD:templates/.claude/hooks/<name>`의 앞 8자.
   `KNOWN_STOCK_HOOK_SHA256`에 `'<sha256>', // <blob8> PM 추론·tsc/test 내장판 (preset-gates 이전)`과
   `'<sha256>', // <blob8> prettier 하드코딩판 (preset-gates 이전)`을 추가하고 README 표에 두 행과 era 설명 한 단락을 더한다.
2. `pre-commit-check.sh`: 헤더 주석을 "git commit 감지 → `harness-team gate commit` 호출(목록은 `.harness/config.json`)"로 바꾸고,
   jq-fallback 블록·`INPUT`·TOOL_NAME/COMMAND 추출·`GIT`/`END` 정규식은 그대로 둔다. 정규식 매치 이후(`package.json` 검사부터 끝까지)를 다음으로 교체:
   ```bash
   [[ $jq_missing -eq 1 ]] && echo "ℹ️ jq 없음 — 저정밀 모드로 git commit을 감지했습니다" >&2

   # 무엇을 돌릴지는 .harness/config.json 의 gates.commit 이 정한다 — 언어·패키지 매니저 지식은
   # 프리셋 데이터에만 있고 이 훅에는 없다(D11). CLI가 없으면 막지 않되 꺼졌다는 사실은 알린다.
   bin="${HARNESS_TEAM_BIN:-harness-team}"
   if ! command -v "$bin" >/dev/null 2>&1; then
     echo "⚠️ harness-team CLI를 찾지 못해 커밋 게이트를 건너뜁니다 — PATH 또는 HARNESS_TEAM_BIN 을 확인하세요." >&2
     exit 0
   fi
   exec "$bin" gate commit
   ```
3. `auto-format.sh`: 헤더를 "Edit/Write 후 `.harness/config.json` 의 format 항목 실행"으로 바꾸고 `case` 블록을 교체:
   ```bash
   bin="${HARNESS_TEAM_BIN:-harness-team}"
   command -v "$bin" >/dev/null 2>&1 || exit 0
   "$bin" gate format "$FILE_PATH" >/dev/null 2>&1
   exit 0
   ```
4. `hooks-jq-fallback.test.mjs`:
   - `makeBins()`에 CLI shim 추가(두 PATH 모두): `#!/bin/sh\nexec "${process.execPath}" "${join(ROOT, 'bin/harness-team.mjs')}" "$@"\n`, 이름 `harness-team`, `chmod 0o755`.
   - `jsProject(pkg)`를 교체:
     ```js
     const FAILING = ['node -e "process.exit(1)"'];
     async function gateProject(commit) {
       const dir = await mkdtemp(join(tmpdir(), 'harness-precommit-'));
       await mkdir(join(dir, '.harness'));
       if (commit !== undefined) await writeFile(join(dir, '.harness/config.json'), JSON.stringify({ gates: { commit } }));
       return dir;
     }
     ```
     `jsProject({…test…})` → `gateProject(FAILING)`, `/테스트 실패/` → `/커밋 게이트 실패/`,
     "test 스크립트가 없으면 통과" → `gateProject(['node -e ""'])`로 `code 0`·`/검증 통과/`.
   - 새 테스트: gates 미설정 → `code 0`·`/커밋 게이트 미설정/` · `env: { HARNESS_TEAM_BIN: join(dir, 'nope') }` → `code 0`·`/CLI를 찾지 못해/`.
   - auto-format: 임시 dir에 `.harness/config.json` `{ format: { '*.ts': ['npx prettier --write'] } }`를 두고 기존 두 테스트 단언 유지
     (npx 스텁 로그 = `prettier --write <file>`, `a.md`·Bash·`{}` → 로그 없음).
5. 실행: `node --test tests/hooks-jq-fallback.test.mjs tests/migrate-hooks.test.mjs tests/doctor.test.mjs`.
   훅 두 파일·테이블·fixture·테스트를 **한 커밋**으로 묶는다 — `migrate-hooks`의 완결성 테스트가 `--first-parent` 이력의
   모든 중간 판을 "배포된 판"으로 세므로, 훅을 두 번 커밋하면 중간 판도 테이블에 올려야 한다.
   커밋 `refactor(hooks): 커밋·포맷 훅을 gate CLI 래퍼로 — 언어 분기 제거`.

### Task 5: init 제안·확정
**Files**: Modify `src/commands/init.mjs:32,68`. Create `tests/init-gates.test.mjs`.
```js
// init.mjs:32 resolveUsername 다음 — 결정만, 기록은 Apply 뒤(취소 시 config가 남지 않게).
let pendingGates = null;
const existing = await readConfigStrict(ctx.targetDir).catch(() => ({}));
if (existing.gates === undefined) {
  const proposal = await buildProposal(ctx.targetDir, stack);
  console.log(`\n${describeProposal(proposal)}`);
  const ok = ctx.flags.yes || await confirm('이 커밋 게이트를 .harness/config.json 에 기록할까요?', { defaultYes: true });
  if (ok) pendingGates = proposal;
}
// init.mjs:68 saveUsername 다음
if (pendingGates) {
  await applyProposal(ctx.targetDir, pendingGates)
    .catch(e => console.warn(`  gates: 기록하지 못했습니다 — ${e.message}`));
}
```
테스트(`detect-stack.test.mjs:70-113`의 spawn `init --yes` 패턴): tsconfig+`lint`+`test` → config `gates.commit` = `['npx tsc --noEmit','npm run lint','npm run test']`·`fingerprint.preset` = `'node'` /
기존 `{ gates: { commit: ['custom'] } }` → 재 init 후 그대로(Review Focus 5) / 무스택 디렉터리 → `gates.commit` = `[]`.
`tests/e2e/init-smoke.test.mjs`도 함께 돌린다. 커밋 `feat(init): 스택 프리셋으로 커밋 게이트 제안·확정`.

### Task 6: migrate 이행
**Files**: Modify `src/commands/migrate.mjs`(새 `migrateGates` + `runMigrate`의 `refreshClaudeTemplates` 다음 호출·결과 집계). Create `tests/migrate-gates.test.mjs`.
```js
// 새 래퍼 훅이 설치돼 있는데 gates가 없으면 그 훅은 아무것도 돌리지 않는다 — 제안해 이전 동작을 이어 준다.
// 구판·커스터마이즈 훅은 자기 로직을 그대로 쓰므로 건드리지 않는다(D8).
export async function migrateGates(ctx) {
  const hook = join(ctx.targetDir, '.claude/hooks/pre-commit-check.sh');
  let installed;
  try { installed = await readFile(hook, 'utf8'); } catch { return false; }
  const template = await readFile(join(ctx.root, 'templates/.claude/hooks/pre-commit-check.sh'), 'utf8');
  if (installed !== template) return false;
  let config;
  try { config = await readConfigStrict(ctx.targetDir); }
  catch (e) { console.log(`  gates: ${e.message} — 건너뜀`); return false; }
  if (config.gates !== undefined) return false;
  const { stack: pin } = await loadRenderState(ctx.targetDir);
  const proposal = await buildProposal(ctx.targetDir, await resolveStack(ctx.targetDir, pin));
  console.log(`\n커밋 게이트가 설정되지 않았습니다 — 새 pre-commit-check.sh 는 config 의 목록만 실행합니다.\n${describeProposal(proposal)}`);
  const ok = ctx.flags.yes || await confirm('이 제안을 .harness/config.json 에 기록할까요?', { defaultYes: true });
  if (!ok) { console.log('Skipped gates.'); return false; }
  await applyProposal(ctx.targetDir, proposal);
  return true;
}
```
(템플릿 경로는 `refreshClaudeHooks`가 쓰는 템플릿 디렉터리 해석과 같은 것을 재사용한다 — 구현 시 `collectStale` 호출부에서 확인.)
테스트(`migrate-hooks.test.mjs` fixture 패턴): 구판 훅(`pre-preset-gates/pre-commit-check.sh`) + package.json(test) + gates 없음 → `migrate --yes` 후 훅 = 템플릿·`gates.commit` = `['npm run test']` /
커스터마이즈 훅 → 훅·config 무변경 / gates 이미 있음 → 무변경. 커밋 `feat(migrate): 새 커밋 훅 설치본에 gates 제안`.

### Task 7: doctor 지문 비교
**Files**: Modify `src/commands/doctor.mjs`(새 export + `runDoctor` 배선 ~922 근처 + `warnActions` ~1036 근처), `tests/doctor.test.mjs`.
```js
export async function checkGateFingerprint(targetDir) {
  let config;
  try { config = await readConfigStrict(targetDir); } catch { return null; }
  if (config.gates === undefined || !config.fingerprint) return null;
  const { stack: pin } = await loadRenderState(targetDir);
  const now = (await buildProposal(targetDir, await resolveStack(targetDir, pin))).fingerprint;
  const drift = fingerprintDrift(config.fingerprint, now);
  return drift ? `커밋 게이트 제안의 근거가 바뀌었습니다 (${drift}) — 갱신하려면: harness-team gate suggest` : null;
}
// runDoctor
const gateWarning = pluginDev ? null : await checkGateFingerprint(ctx.targetDir);
if (gateWarning) add('commit gates', 'warning', gateWarning, `\n⚠️ ${gateWarning}`);
// warnActions
if (gateWarning) warnActions.push('harness-team gate suggest');
```
테스트(`healthyConsumerFixture` + `doctorJson`): 지문 = 현재 → `commit gates` 체크 없음 / package.json에 `lint` 추가 → warning·detail에 `gate suggest` / gates 없음 → 체크 없음.
커밋 `feat(doctor): 커밋 게이트 지문 변화 감지`.

### Task 8: 문서
- `docs/harness-overview.template.html:596-610`(두 훅 카드)을 "config `format` 실행 / config `gates.commit` 실행(`harness-team gate commit`), CLI 부재 시 경고 후 통과"로,
  `docs/diagrams/harness-overview/hooks.mmd:22-31`을 `gate format`·`gate commit` 호출로 바꾸고 `npm run docs:generate` → 생성물 stage.
- `src/commands/task.mjs:933` 주석의 "커밋 훅(pre-commit-check.sh)은 테스트를 *실행*하지만" → "커밋 훅은 config 게이트를 *실행*하지만".
- `CHANGELOG.md` `[Unreleased]`에 Changed 항목(훅 래퍼화·프리셋·`gate` 명령·migrate 제안).
- 커밋 `docs: 커밋·포맷 훅 설명을 프리셋 게이트로 갱신`.

### Task 9: 검증
- `npm run test` 전체 PASS, `npm run docs:check` PASS(`find . -name "* 2.*" -not -path "./.git/*"` iCloud 사본 먼저 정리).
- spec 완료 기준 1: `grep -nE 'pnpm|yarn|bunx|npx|prettier|tsc' templates/.claude/hooks/pre-commit-check.sh templates/.claude/hooks/auto-format.sh` → 출력 0줄.
- 소비자 3곳 읽기 전용 제안: `node -e` 로 `resolveStack`+`buildProposal`을 deep-math·heliosent-profile·job-scraper 경로에 호출해 출력만 기록
  (config 쓰기·migrate 금지). deep-math의 `lint`(eslint 미설치)는 제안에 들어가고 실행 시 127 → "설정 오류"가 되는 것이 기대 동작임을 artifact에 남긴다.

### Task 10: 리뷰
- `node bin/harness-team.mjs review --scope diff --base origin/main --yes "D11 언어 분기 잔존·D8 덮어쓰기·훅 우회·malformed config" < /dev/null`
- 발견은 재현·판별 후 단일 스레드로 반영(D6), 결과를 `preset-gates-artifact.md` `## Reviews`에 날짜와 함께 기록.

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-05 `gate format <file>` 동사 추가 — auto-format 래퍼의 glob 매칭을 JS로(spec R5 갱신).
- 2026-10-05 지문 = `{preset, pm, signals}`(참이 된 프리셋 조건) — 제안에 무관한 변화는 무시(spec Ontology 갱신).
- 2026-10-05 node format 제안은 `prettier` 의존성이 있을 때만(spec R8 갱신).
- 2026-10-05 (리뷰 C1) 확정 게이트 저장소 = 팀이 커밋하는 `.harness/gates.json` `{commit, format, fingerprint}` — `config.json`은 사용자별 gitignore(spec R2·Ontology 갱신).
- 2026-10-05 (리뷰 I4) 프리셋 항목 `"confirm": true` = init·migrate `--yes`에서 빼고 "추가 제안"으로 출력(spec R7 갱신).
- 2026-10-05 (리뷰 I1·I2·I3) 미설정 = 파일 없음만(`systemMessage`), 형태 오류는 설정 오류, CLI가 0·2 외 종료면 차단(spec Ontology 갱신).

## 참고
- spec: `docs/hslee/preset-gates/preset-gates-spec.md` · 결정 근거: `docs/harness-cycle.md` §4-2·§4-2b·§4-6, `docs/decisions.md` D8·D11.
- 테스트 패턴: `tests/detect-stack.test.mjs`(project·spawn init), `tests/config-command.test.mjs`(fixture·capture), `tests/hooks-jq-fallback.test.mjs`(최소 PATH·runHook), `tests/doctor.test.mjs`(doctorJson·healthyConsumerFixture).
- 함정: post-commit 훅이 커밋마다 task handoff를 갱신한다(다음 커밋에 실림) · 로컬 pre-commit이 `docs:check`를 돈다 · iCloud `* 2.*` 사본.

// `harness-team review` — 리뷰 엔진의 실행과 증거 기록을 harness가 소유한다.
//
// 지금까지 리뷰 증거는 에이전트가 artifact에 손으로 append한 마커 한 줄이었고, done 가드는
// 그 줄만 읽었다. "리뷰를 돌리지 않고 마커만 쓰기"가 절차 안의 한 단계를 건너뛰는 지름길이었다.
// 이 명령은 그 지름길을 없앤다 — 엔진을 여기서 돌리고, **성공(exit 0)한 실행만** harness 소유
// meta의 `reviews[]`에 기록한다. 가드의 `verify: required`는 그 배열을 읽는다. 위조(meta를 손으로
// 고치기)는 막지 않는다 — 그건 done-guard-window가 `--force`와 같은 고의로 분류한 범주이고 가드의
// 위협 모델(망각·실수) 밖이다.
//
// 엔진 runner 표·프롬프트·scope 규칙의 정본은 commands/harness-review.md다. 이 파일은 그 표를
// 코드로 옮긴 것이고, 프롬프트 상수는 pin 테스트가 문서와 동기화한다.

import { join, resolve } from 'node:path';
import { readFile, access, constants } from 'node:fs/promises';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { exists, writeText } from '../fsx.mjs';
import { readActive, taskArtifactTemplate, VERIFY_KIND_SUFFIXES } from './task.mjs';
import { readTaskMeta, writeTaskMeta } from './summary.mjs';
import { buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../observation.mjs';

const pexec = promisify(execFile);

export const ENGINES = ['codex', 'claude', 'custom'];
// worktree·diff는 harness-review.md 2단계, task-docs는 페르소나 외부 엔진 모드(contrarian·simplifier)의
// scope 값 — 가드는 scope를 목록 대조하지 않지만 CLI는 아는 값만 받는다(오타를 조용히 기록하지 않는다).
export const SCOPES = ['worktree', 'diff', 'task-docs'];
// probe 폴백 체인. custom은 명시 호출 전용이라 체인에 없다.
export const PROBE_CHAIN = ['codex', 'claude'];
// artifact에 넣는 출력 상한. 초과분은 잘라내고 잘랐다고 적는다 — 조용한 절단은 "다 봤다"로 읽힌다.
export const REVIEW_OUTPUT_MAX_BYTES = 16 * 1024;

// 공용 리뷰 프롬프트 — commands/harness-review.md 3단계의 text 블록과 한 글자도 다르지 않아야 한다
// (tests/review-command.test.mjs가 pin). `<scope>`와 `<focus>`만 채운다.
export const REVIEW_PROMPT_TEMPLATE = [
  'You are performing an independent read-only code review of this repository.',
  'Scope: <working tree changes | diff against <base>>. Inspect the changes yourself with git (git status, git diff).',
  'Do not modify anything. Report findings ranked by severity (P1 blocking / P2 should-fix / P3 nit),',
  'each with file:line and a one-line rationale, then a final verdict.',
  'If nothing significant is found, say so explicitly. <focus arguments, if any>',
].join('\n');

export function buildPrompt({ scope, base, focus = [], promptText = null }) {
  const focusText = focus.join(' ').trim();
  if (promptText !== null) {
    return focusText ? `${promptText.trimEnd()}\n${focusText}` : promptText;
  }
  const scopeText = scope === 'diff' ? `diff against ${base}` : 'working tree changes';
  return REVIEW_PROMPT_TEMPLATE
    .replace('<working tree changes | diff against <base>>', scopeText)
    .replace(' <focus arguments, if any>', focusText ? ` ${focusText}` : '');
}

// kind = <engine> 또는 <engine>-<프레이밍>. 프레이밍은 verify allowlist 안에서만 — 열거 밖 접미사를
// 기록하면 verify 가드가 세지 않는 마커가 조용히 생긴다.
export function buildReviewKind(engine, framing) {
  if (framing === undefined || framing === null) return { kind: engine };
  if (!VERIFY_KIND_SUFFIXES.includes(framing)) {
    return { error: `--framing ${framing} 은 검증 프레이밍 열거 밖 (허용: ${VERIFY_KIND_SUFFIXES.join('·')})` };
  }
  return { kind: `${engine}-${framing}` };
}

// 치환의 안전은 `{prompt}` 가 **독립 토큰**일 때만 성립한다. 템플릿 작성자가 `echo '{prompt}'` 처럼
// 자기 따옴표 안에 넣으면 그 따옴표가 치환 결과의 첫 `'` 와 짝을 이뤄 나머지가 인용 밖으로 나온다 —
// 프롬프트(focus·--prompt-file, 곧 사용자 입력)가 셸 명령이 된다. 그래서 자리를 검사해 거부한다.
export function promptPlaceholderIsBare(template) {
  const occurrences = [...template.matchAll(/\{prompt\}/g)];
  if (!occurrences.length) return false;
  return occurrences.every(m => {
    const before = template[m.index - 1];
    const after = template[m.index + m[0].length];
    return (before === undefined || /\s/.test(before)) && (after === undefined || /\s/.test(after));
  });
}

// custom 엔진 `{prompt}` 치환 계약: POSIX 단일 인용 리터럴 하나. 내부 `'`는 `'\''`.
export function posixSingleQuote(s) {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

// 출력 안의 백틱 런보다 긴 fence를 골라 artifact 안에서 코드 블록이 깨지지 않게 한다.
export function fenceFor(text) {
  let longest = 0;
  for (const m of text.matchAll(/`+/g)) longest = Math.max(longest, m[0].length);
  return '`'.repeat(Math.max(3, longest + 1));
}

export function truncateOutput(output, max = REVIEW_OUTPUT_MAX_BYTES) {
  const bytes = Buffer.byteLength(output, 'utf8');
  if (bytes <= max) return { text: output, bytes, truncated: false };
  const head = Buffer.from(output, 'utf8').subarray(0, max).toString('utf8');
  return {
    text: `${head}\n… (truncated: ${bytes} bytes total, first ${max} shown)`,
    bytes,
    truncated: true,
  };
}

export function renderReviewMarker({ kind, scope, tip, at }) {
  return `<!-- harness:review kind=${kind} scope=${scope} tip=${tip} at=${at} -->`;
}

export function renderReviewBlock({ kind, engine, scope, tip, at, output }) {
  const { text, bytes, truncated } = truncateOutput(output);
  const fence = fenceFor(text);
  return [
    '',
    `### ${at} — ${kind} (harness-team review)`,
    '',
    `- engine: ${engine} · scope: ${scope} · tip: ${tip} · exit 0 · ${bytes} B${truncated ? ' (artifact에는 앞부분만)' : ''}`,
    '',
    fence + 'text',
    text.trimEnd(),
    fence,
    '',
    renderReviewMarker({ kind, scope, tip, at }),
    '',
  ].join('\n');
}

// 리뷰 블록의 자리 — 기본 artifact 템플릿에서 `## Reviews` 는 `## Learnings` 앞에 있다. EOF 에 붙이면
// 리뷰가 `## Learnings` 아래에 쌓여 두 절의 의미가 뒤집힌다 (2026-09-11 codex 리뷰 P3).
// **fence 를 세는 이유**: 블록 안에는 엔진 출력이 그대로 들어가고, 이 저장소를 리뷰하면 그 출력에
// `## Learnings` 문자열이 들어온다(템플릿·가드 코드에 있는 문자열이다). fence 를 무시하면 두 번째
// 리뷰부터 이전 리뷰의 출력 한가운데를 찍어 파일을 깨뜨린다.
// `runRetro` 가 EOF 에 붙이는 `## Learnings (<date>)` 절도 헤딩이므로 **첫 번째** 헤딩 앞에만 넣는다.
export function insertReviewBlock(artifact, block) {
  const lines = artifact.split('\n');
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const open = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fence) {
      // 닫는 fence 는 같은 문자로, 연 길이 이상이어야 한다 (CommonMark).
      if (open && open[1][0] === fence[0] && open[1].length >= fence.length && !line.slice(open[0].length).trim()) fence = null;
      continue;
    }
    if (open) { fence = open[1]; continue; }
    if (/^## Learnings\b/.test(line)) {
      const head = lines.slice(0, i).join('\n').replace(/\s+$/, '');
      const tail = lines.slice(i).join('\n');
      return `${head}\n${block.replace(/^\n+/, '\n')}\n${tail}`;
    }
  }
  return artifact + block;
}

// PATH 탐색. 문서의 `command -v`와 같은 질문 — 실행 가능한 파일이 PATH에 있는가.
// `cwd` 는 **상대 경로 토큰의 기준**이다. 엔진은 `targetDir` 에서 실행되므로(`runEngine` 의 spawn cwd)
// preflight 도 같은 기준으로 봐야 한다 — process cwd 로 보면 `--target` + `./tool` 조합에서 실행
// 가능한 reviewer 를 "PATH 에 없음"으로 오거부한다 (2026-09-11 codex 리뷰 P3).
export async function which(name, env = process.env, cwd = process.cwd()) {
  // 경로가 주어지면(custom.command 의 첫 토큰이 `./tool`·`/opt/x` 인 경우) PATH 를 보지 않고 그 파일을 본다.
  if (name.includes('/')) {
    const path = resolve(cwd, name);
    try { await access(path, constants.X_OK); return path; } catch { return null; }
  }
  for (const dir of (env.PATH || '').split(':').filter(Boolean)) {
    // PATH 항목 자체가 상대 경로(`.`·`../bin`)일 수 있다 — 그것도 실행 기준(cwd)으로 푼다.
    // 여기서만 process cwd 로 풀면 첫 토큰 경로는 고쳐 놓고 PATH 항목에서 같은 버그가 남는다.
    const candidate = resolve(cwd, dir, name);
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch { /* next */ }
  }
  return null;
}

async function readReviewersConfig(targetDir) {
  try {
    return JSON.parse(await readFile(join(targetDir, '.harness', 'reviewers.json'), 'utf8'));
  } catch {
    return null;
  }
}

// 엔진 결정 — harness-review.md 1단계. 반환: { engine, command? } 또는 { error, ... }.
export async function resolveEngine(requested, { targetDir, which: probe = which } = {}) {
  if (requested === 'custom') {
    const cfg = await readReviewersConfig(targetDir);
    const template = cfg && cfg.custom && typeof cfg.custom.command === 'string' ? cfg.custom.command : null;
    if (!template || !template.includes('{prompt}')) {
      return { error: '.harness/reviewers.json 의 custom.command 가 없거나 {prompt} 자리가 없음 — { "custom": { "command": "mycli review --readonly {prompt}" } } 형태로 설정 (read-only 커맨드여야 한다)' };
    }
    if (!promptPlaceholderIsBare(template)) {
      return { error: `custom.command 의 {prompt} 는 공백으로 둘러싸인 독립 토큰이어야 함 (예: "mycli review {prompt}") — 따옴표나 다른 문자에 붙어 있으면 단일 인용 치환이 깨져 프롬프트 내용이 셸 명령으로 해석될 수 있다: ${JSON.stringify(template)}` };
    }
    const head = template.trim().split(/\s+/)[0];
    // 상대 경로 토큰은 실행 위치(targetDir) 기준으로 판정한다 — 실행과 preflight 의 기준을 맞춘다.
    if (!(await probe(head, process.env, targetDir))) return { error: `custom.command 의 첫 토큰 "${head}" 이 PATH 에 없음` };
    return { engine: 'custom', command: template };
  }
  if (requested) {
    if (!ENGINES.includes(requested)) return { error: `알 수 없는 엔진 "${requested}" (허용: ${ENGINES.join('|')})` };
    if (!(await probe(requested, process.env, targetDir))) return { error: `${requested} CLI 가 PATH 에 없음 — 설치·인증 상태를 공식 문서로 확인` };
    return { engine: requested };
  }
  // 엔진 probe 도 같은 기준을 쓴다 — 한 자리만 고치면 상대 PATH 항목에서 기준이 갈린다.
  for (const candidate of PROBE_CHAIN) {
    if (await probe(candidate, process.env, targetDir)) return { engine: candidate, probed: true };
  }
  return { error: `probe 폴백 체인(${PROBE_CHAIN.join(' → ')})에서 가용 엔진을 찾지 못함` };
}

async function git(targetDir, args) {
  const { stdout } = await pexec('git', ['-C', targetDir, ...args], { maxBuffer: 8 * 1024 * 1024 });
  return stdout;
}

// scope 결정 — harness-review.md 2단계. git이 없거나 저장소가 아니면 worktree로 degrade한다
// (리뷰어는 어차피 파일을 직접 본다). diff가 비면 리뷰할 것이 없다 — 기록하지 않는다.
export async function resolveScope({ targetDir, scope, base }) {
  let tip = 'none';
  try { tip = (await git(targetDir, ['rev-parse', 'HEAD'])).trim() || 'none'; } catch { /* no commits / no git */ }
  if (scope === 'task-docs') return { scope, tip };

  let dirty = null;
  try { dirty = (await git(targetDir, ['status', '--porcelain'])).trim().length > 0; } catch { /* not a git repo */ }
  if (dirty === null) {
    if (scope === 'diff') return { error: 'git 저장소가 아니라 diff scope 를 계산할 수 없음' };
    return { scope: 'worktree', tip };
  }
  if (scope === 'worktree' || (scope === undefined && dirty)) return { scope: 'worktree', tip };

  let resolvedBase = base;
  if (!resolvedBase) {
    try { await git(targetDir, ['rev-parse', '--verify', '--quiet', 'origin/main']); resolvedBase = 'origin/main'; }
    catch { resolvedBase = 'main'; }
  }
  try {
    await git(targetDir, ['rev-parse', '--verify', '--quiet', resolvedBase]);
  } catch {
    return { error: `base ref "${resolvedBase}" 를 찾을 수 없음` };
  }
  let diff = '';
  try { diff = await git(targetDir, ['diff', '--stat', `${resolvedBase}...HEAD`]); } catch (err) {
    return { error: `diff 계산 실패: ${err.message.split('\n')[0]}` };
  }
  if (!diff.trim()) return { empty: true, base: resolvedBase, tip };
  return { scope: 'diff', base: resolvedBase, tip };
}

function run(cmd, args, { cwd }) {
  return new Promise((resolve, reject) => {
    // stdin은 닫는다 — codex exec 는 stdin 이 열려 있으면 추가 입력을 기다리며 영원히 멈춘다
    // (`< /dev/null` 계약). 다른 엔진에도 해가 없다.
    const child = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const out = [];
    const err = [];
    child.stdout.on('data', c => out.push(c));
    child.stderr.on('data', c => err.push(c));
    child.on('error', reject);
    child.on('close', code => resolve({
      exitCode: code ?? 1,
      stdout: Buffer.concat(out).toString('utf8'),
      stderr: Buffer.concat(err).toString('utf8'),
    }));
  });
}

// 엔진 runner 표 — commands/harness-review.md 그대로.
export async function runEngine({ engine, command, prompt, targetDir }) {
  if (engine === 'codex') return run('codex', ['exec', '--sandbox', 'read-only', prompt], { cwd: targetDir });
  if (engine === 'claude') return run('claude', ['-p', '--permission-mode', 'plan', prompt], { cwd: targetDir });
  // custom: {prompt} 를 POSIX 단일 인용 리터럴로 치환해 sh -c. 치환 외의 문자열은 추가·해석하지 않는다.
  return run('sh', ['-c', command.split('{prompt}').join(posixSingleQuote(prompt))], { cwd: targetDir });
}

function stderrTail(stderr, n = 20) {
  const lines = stderr.trimEnd().split('\n').filter(l => l.length);
  return lines.slice(-n);
}

function emitError(json, summary, packet) {
  process.exitCode = 1;
  if (json) {
    emitObservation(buildEnvelope({ command: 'review', status: 'error', summary, error: packet }));
  } else {
    console.log(`✗ review: ${summary}`);
    for (const line of renderErrorPacket(packet)) console.log(line);
  }
  return { recorded: false, error: summary };
}

export async function runReview(ctx, deps = {}) {
  const flags = ctx.flags || {};
  const json = !!flags.json;
  const positional = ctx.taskArgs || [];
  const requestedEngine = ENGINES.includes(positional[0]) ? positional[0] : undefined;
  const focus = requestedEngine ? positional.slice(1) : positional;

  const active = await readActive(ctx.targetDir);
  if (!active || !active.task) {
    return emitError(json, '활성 task 없음', buildErrorPacket({
      cause: '.harness/active.json 에 활성 task가 없어 리뷰 증거를 기록할 곳이 없음',
      retry: '`harness-team task <name>` 로 task를 활성화한 뒤 다시 실행',
      alternatives: ['기록 없이 리뷰만 보려면 엔진 CLI를 직접 실행한다 — 단 그 결과는 done 가드에 보이지 않는다'],
      safeDefault: '엔진을 실행하지 않았고 어느 파일도 바뀌지 않았다',
      stop: 'task가 하나도 없으면 먼저 task를 생성하라',
    }));
  }

  if (flags.scope !== undefined && !SCOPES.includes(flags.scope)) {
    return emitError(json, `알 수 없는 scope "${flags.scope}"`, buildErrorPacket({
      cause: `--scope ${flags.scope} 은 허용 값(${SCOPES.join('|')}) 밖`,
      retry: '허용 값 중 하나로 다시 실행',
      safeDefault: '엔진을 실행하지 않았고 어느 파일도 바뀌지 않았다',
      stop: 'scope 값을 지어내지 말 것 — 가드는 scope를 대조하지 않지만 기록은 정확해야 한다',
    }));
  }
  if (flags.scope === 'task-docs' && !flags['prompt-file']) {
    return emitError(json, 'task-docs scope 에는 --prompt-file 이 필요', buildErrorPacket({
      cause: 'task-docs 는 git diff 가 아니라 spec/plan 문서를 대상으로 하므로 공용 프롬프트를 쓸 수 없음',
      retry: '프레이밍 커맨드의 프롬프트를 파일에 쓰고 `--prompt-file <path>` 와 함께 다시 실행',
      safeDefault: '엔진을 실행하지 않았고 어느 파일도 바뀌지 않았다',
      stop: '문서 리뷰 프롬프트 없이 task-docs 를 기록하지 말 것',
    }));
  }

  const resolved = await resolveEngine(requestedEngine, { targetDir: ctx.targetDir, which: deps.which });
  if (resolved.error) {
    return emitError(json, '엔진을 결정할 수 없음', buildErrorPacket({
      cause: resolved.error,
      retry: '엔진 CLI를 설치·인증하거나 `.harness/reviewers.json` 을 설정한 뒤 다시 실행',
      alternatives: ['다른 엔진을 명시한다: `harness-team review claude`'],
      safeDefault: '엔진을 실행하지 않았고 어느 파일도 바뀌지 않았다',
      stop: '가용 엔진이 없으면 리뷰를 건너뛰지 말고 사용자에게 알릴 것',
    }));
  }
  const { engine, command } = resolved;

  const kindResult = buildReviewKind(engine, flags.framing);
  if (kindResult.error) {
    return emitError(json, '프레이밍 열거 밖', buildErrorPacket({
      cause: kindResult.error,
      retry: '허용 접미사 중 하나로 다시 실행',
      safeDefault: '엔진을 실행하지 않았고 어느 파일도 바뀌지 않았다',
      stop: '열거 밖 프레이밍을 기록하지 말 것 — verify 가드가 세지 않는 항목이 조용히 생긴다',
    }));
  }
  const { kind } = kindResult;

  const scoped = await resolveScope({ targetDir: ctx.targetDir, scope: flags.scope, base: flags.base });
  if (scoped.error) {
    return emitError(json, 'scope 를 결정할 수 없음', buildErrorPacket({
      cause: scoped.error,
      retry: '`--scope worktree` 를 명시하거나 존재하는 `--base <ref>` 를 주고 다시 실행',
      safeDefault: '엔진을 실행하지 않았고 어느 파일도 바뀌지 않았다',
      stop: 'scope 를 추측해 기록하지 말 것',
    }));
  }
  if (scoped.empty) {
    if (json) {
      emitObservation(buildEnvelope({ command: 'review', status: 'success', summary: `리뷰할 것 없음 — ${scoped.base} 대비 diff 가 비어 있음`, extra: { recorded: false } }));
    } else {
      console.log(`review: 리뷰할 것 없음 — ${scoped.base} 대비 diff 가 비어 있음 (기록하지 않음)`);
    }
    return { recorded: false, reason: 'empty-diff' };
  }
  const { scope, base, tip } = scoped;

  let promptText = null;
  if (flags['prompt-file']) {
    try { promptText = await readFile(flags['prompt-file'], 'utf8'); } catch (err) {
      return emitError(json, '프롬프트 파일을 읽을 수 없음', buildErrorPacket({
        cause: `${flags['prompt-file']}: ${err.code || err.message}`,
        retry: '경로를 확인하고 다시 실행',
        safeDefault: '엔진을 실행하지 않았고 어느 파일도 바뀌지 않았다',
        stop: '프롬프트 없이 엔진을 돌리지 말 것',
      }));
    }
  }
  const prompt = buildPrompt({ scope, base, focus, promptText });

  let result;
  try {
    result = await (deps.runEngine || runEngine)({ engine, command, prompt, targetDir: ctx.targetDir });
  } catch (err) {
    result = { exitCode: 1, stdout: '', stderr: err.message };
  }

  // 실패한 실행은 증거가 아니다 — meta 도 artifact 도 건드리지 않는다.
  if (result.exitCode !== 0) {
    return emitError(json, `${engine} 이 exit ${result.exitCode} 로 끝남`, buildErrorPacket({
      cause: [`${engine} exit ${result.exitCode}`, ...stderrTail(result.stderr).map(l => `stderr: ${l}`)],
      retry: '원인을 해소한 뒤 같은 명령을 다시 실행',
      alternatives: ['다른 엔진을 명시한다: `harness-team review claude`'],
      safeDefault: '증거는 기록되지 않았다 — meta.reviews 와 artifact 는 그대로다',
      stop: '실패한 실행을 리뷰로 치지 말 것',
    }));
  }

  // 빈 출력은 증거가 아니다 — exit 0 만 보면 "아무것도 출력하지 않는" 잘못 설정된 custom reviewer 가
  // `verify: required` 를 통과시킨다 (2026-09-11 codex 리뷰 P3). artifact 템플릿 생성보다 **앞**에 둔다:
  // 거부한 실행이 파일을 만들면 아래 safeDefault 가 거짓말이 된다.
  if (!result.stdout.trim()) {
    return emitError(json, `${engine} 이 exit 0 이지만 출력이 비어 있음`, buildErrorPacket({
      cause: [`${engine} stdout 0 B (공백만) — 리뷰 내용이 없는 실행은 증거로 치지 않는다`, ...stderrTail(result.stderr).map(l => `stderr: ${l}`)],
      retry: '엔진이 stdout 으로 리뷰를 내도록 설정을 고친 뒤 다시 실행 (custom 은 .harness/reviewers.json 의 command 확인)',
      alternatives: ['다른 엔진을 명시한다: `harness-team review claude`'],
      safeDefault: '증거는 기록되지 않았다 — meta.reviews 와 artifact 는 그대로다',
      stop: '내용 없는 실행을 리뷰로 치지 말 것',
    }));
  }

  const at = new Date().toISOString();
  const { user, task } = active;
  const artifactRel = `docs/${user}/${task}/${task}-artifact.md`;
  const artifactPath = join(ctx.targetDir, artifactRel);
  if (!(await exists(artifactPath))) await writeText(artifactPath, taskArtifactTemplate(task));

  const outputBytes = Buffer.byteLength(result.stdout, 'utf8');
  const entry = { kind, engine, scope, tip, at, exitCode: 0, outputBytes };

  // meta 에 `reviews` 키가 있는 task(새 템플릿)만 meta 에 쓴다 — 가드의 verify 정본이고, artifact
  // 쓰기가 실패해도 증거는 남도록 먼저 쓴다. 키가 없는 구 task 에는 키를 **만들지 않는다**: 여기서
  // 키를 만들면 가드가 그 순간 CLI 소유로 전환돼 이미 있던 손 마커 증거가 무효가 된다(2026-09-10
  // adversarial 리뷰 P1). 구 task 의 증거는 아래 artifact 마커(CLI 가 쓴다)이고 판정도 종전 그대로다.
  // 옮기는 인가 경로는 `harness-team migrate --adopt-reviews` 하나뿐이다 — 잃는 증거를 세어 보여주고
  // 확인을 받는다. 여기서 조용히 만들지 않는 이유가 거기서 묻는 이유다.
  const meta = await readTaskMeta(ctx.targetDir, user, task);
  const cliOwned = Boolean(meta && Array.isArray(meta.reviews));
  if (cliOwned) {
    await writeTaskMeta(ctx.targetDir, user, task, { ...meta, user, task, reviews: [...meta.reviews, entry] });
  }
  const block = renderReviewBlock({ ...entry, output: result.stdout });
  await writeText(artifactPath, insertReviewBlock(await readFile(artifactPath, 'utf8'), block));

  const summary = `${kind} recorded (exit 0, ${outputBytes} B)`;
  const nextActions = [
    `${artifactRel} 의 새 블록 아래에 발견 판별(진짜 결함/오탐)과 조치를 산문으로 남긴다 — harness-review.md 4단계`,
  ];
  const metaRel = `docs/${user}/${task}/${task}-meta.json`;
  if (json) {
    emitObservation(buildEnvelope({
      command: 'review', status: 'success', summary, nextActions,
      artifacts: cliOwned ? [artifactRel, metaRel] : [artifactRel],
      extra: { ...entry, probed: !!resolved.probed, recorded: true, metaRecorded: cliOwned },
    }));
  } else {
    console.log(`review: ${summary}${resolved.probed ? ` — probe 체인이 ${engine} 선택` : ''}`);
    console.log(cliOwned
      ? `recorded: ${artifactRel} · meta.reviews[${meta.reviews.length}]`
      : `recorded: ${artifactRel} (구 task — meta 에 reviews 키가 없어 artifact 마커만, 판정도 종전 그대로; 옮기려면 \`harness-team migrate --adopt-reviews\`)`);
    for (const n of nextActions) console.log(`next: ${n}`);
  }
  return { recorded: true, metaRecorded: cliOwned, entry };
}

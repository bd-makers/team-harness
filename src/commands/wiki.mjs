// `harness-team wiki sources` — 위키 컴파일(`/harness-wiki`)의 **결정론적 입력**을 소유한다. 읽기 전용이다.
//
// 컴파일 자체(어느 항목에 무엇을 넣을지)는 LLM 판단이라 명령 문서에 남는다. 여기로 내린 것은 판단이 없는
// 세 가지다: 출처(PR 번호·들여온 커밋·작성자) 추론, 이미 컴파일된 위치 검색(멱등), 프로젝트 작성 규칙 파일 목록.
// 출처 마커 문자열도 여기서만 만든다 — 스킬이 손으로 조립하면 키 순서·형식이 갈라져 멱등 검색이 놓친다.
//
// 위키 분류 체계는 코드에 없다(D11 — 프로젝트 데이터). 이 모듈이 아는 경로는 셋뿐이다: 위키 루트 `wiki/`,
// 작성 규칙 자리 `wiki/90_system/`, 분류하지 못한 것의 자리 `wiki/99_inbox/`(docs/harness-cycle.md §4-4).
import { join } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { exists } from '../fsx.mjs';
import { readActive } from './task.mjs';
import { readTaskMeta } from './summary.mjs';
import { taskDirRel, taskFileRel, taskFilePath, taskLabel } from '../task-paths.mjs';
import { buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../observation.mjs';

const pexec = promisify(execFile);

export const WIKI_DIR = 'wiki';
export const WIKI_RULES_DIR = 'wiki/90_system';
export const WIKI_INBOX_DIR = 'wiki/99_inbox';

const ACTIONS = ['sources'];
const USAGE = 'usage: harness-team wiki sources [<user>/<task>] [--pr <N>]   (인수가 없으면 활성 task)';
const LABEL_RE = /^([\w.-]+)\/([\w.-]+)$/;
const PR_RE = /^[1-9]\d*$/;

// `harness:rule`·`harness:review`와 같은 key=value HTML 주석 문법. 키 순서는 이 함수가 정본이다.
export function wikiMarker({ task, pr, commit, author, at }) {
  return `<!-- harness:wiki task=${task} pr=${pr} commit=${commit} author=${author} at=${at} -->`;
}

const WIKI_MARKER_RE = /<!--\s*harness:wiki\s+([^>]*?)\s*-->/g;

export function parseMarkerAttrs(text) {
  const attrs = {};
  for (const kv of text.matchAll(/([a-z][a-z0-9-]*)=("[^"]*"|\S+)/gi)) {
    attrs[kv[1].toLowerCase()] = kv[2].replace(/^"|"$/g, '');
  }
  return attrs;
}

// 펜스 코드 블록 밖의 `harness:wiki` 마커 속성 목록. 작성 규칙 문서가 마커 형식을 예시로 보여 주는 것은
// 컴파일 흔적이 아니다 — `parseRuleMarker`가 본문 중간 예시를 유래로 치지 않는 것과 같은 이유다.
export function wikiMarkersIn(content) {
  const found = [];
  let fence = null;
  for (const line of content.split(/\r?\n/)) {
    const open = /^\s*(`{3,}|~{3,})/.exec(line);
    if (open) {
      if (fence === null) fence = open[1][0];
      else if (open[1][0] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;
    for (const m of line.matchAll(WIKI_MARKER_RE)) found.push(parseMarkerAttrs(m[1]));
  }
  return found;
}

// 들여온 커밋 메시지에서 PR/MR 번호를 읽는다. 순서: GitHub 기본 머지 제목 → 제목 끝 `(#N)`(squash·관례)
// → GitLab 머지 커밋 본문. 못 찾으면 null — 추측하지 않는다(rebase·fast-forward 병합은 번호를 남기지 않는다).
export function prFromCommit(subject = '', body = '') {
  const merge = /^Merge pull request #(\d+)\b/.exec(subject);
  if (merge) return Number(merge[1]);
  const suffix = /\(#(\d+)\)\s*$/.exec(subject);
  if (suffix) return Number(suffix[1]);
  const gitlab = /^See merge request \S*!(\d+)\s*$/m.exec(body);
  if (gitlab) return Number(gitlab[1]);
  return null;
}

// HEAD의 first-parent 이력에서 task 디렉터리를 처음 들여온 커밋. 기본 브랜치에서는 머지(또는 squash) 커밋이다.
// first-parent가 아니면 PR 브랜치 안의 scaffold 커밋이 먼저 잡혀 PR 번호를 잃는다.
export async function introducingCommit(targetDir, rel) {
  try {
    const { stdout } = await pexec('git', [
      '-C', targetDir, 'log', '--first-parent', '--reverse', '--format=%H%x00%s%x00%b%x1e', 'HEAD', '--', rel,
    ], { maxBuffer: 16 * 1024 * 1024 });
    const first = stdout.split('\x1e')[0].replace(/^\n/, '');
    if (!first.trim()) return null;
    const [sha, subject = '', body = ''] = first.split('\x00');
    return { sha, subject, body };
  } catch {
    return null;
  }
}

async function walkMarkdown(targetDir, rel) {
  const out = [];
  let entries;
  try {
    entries = await readdir(join(targetDir, rel), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const child = `${rel}/${entry.name}`;
    if (entry.isDirectory()) out.push(...await walkMarkdown(targetDir, child));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(child);
  }
  return out;
}

// 같은 task 마커가 있는 위키 파일. 값이 **정확히** 같을 때만 센다 — `chad/x`가 `chad/x-v2`에 걸리면 안 된다.
export async function findCompiled(targetDir, label) {
  const hits = [];
  for (const rel of await walkMarkdown(targetDir, WIKI_DIR)) {
    const content = await readFile(join(targetDir, rel), 'utf8');
    if (wikiMarkersIn(content).some(attrs => attrs.task === label)) hits.push(rel);
  }
  return hits.sort();
}

export async function listRules(targetDir) {
  return (await walkMarkdown(targetDir, WIKI_RULES_DIR)).sort();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// 컴파일 입력 전체. 파일을 쓰지 않는다. 판단(멈출지·어디에 쓸지)은 호출자(스킬) 몫이다.
export async function wikiSources(targetDir, user, task, { pr = null, at = today() } = {}) {
  const label = taskLabel(user, task);
  const meta = await readTaskMeta(targetDir, user, task);
  // 키 이름이 `status`가 아닌 이유: JSON 출력은 이 객체를 envelope 에 펼치므로 envelope 의 `status` 를 덮는다.
  const taskStatus = meta && typeof meta.status === 'string' ? meta.status : 'unknown';
  const author = meta && typeof meta.user === 'string' && meta.user ? meta.user : user;

  const docs = [];
  for (const kind of ['spec.md', 'plan.md', 'artifact.md']) {
    if (await exists(taskFilePath(targetDir, user, task, kind))) docs.push(taskFileRel(user, task, kind));
  }

  const intro = await introducingCommit(targetDir, taskDirRel(user, task));
  const commit = intro ? intro.sha.slice(0, 7) : null;
  const prNumber = pr ?? (intro ? prFromCommit(intro.subject, intro.body) : null);

  const blockers = [];
  if (taskStatus !== 'done') blockers.push('not-done');
  if (prNumber === null) blockers.push('no-pr');
  if (commit === null) blockers.push('no-commit');

  const marker = blockers.length ? null : wikiMarker({ task: label, pr: prNumber, commit, author, at });
  return {
    task: label,
    task_status: taskStatus,
    docs,
    provenance: { pr: prNumber, commit, author },
    marker,
    compiled: await findCompiled(targetDir, label),
    rules: await listRules(targetDir),
    inbox: WIKI_INBOX_DIR,
    blockers,
  };
}

const BLOCKER_TEXT = {
  'not-done': 'task가 done이 아님 — 머지 후 기본 브랜치에서 `harness-team done` 다음에 컴파일한다',
  'no-pr': 'PR 번호를 커밋 메시지에서 찾지 못함 — 번호를 확인해 `--pr <N>`으로 다시 실행',
  'no-commit': 'task 디렉터리가 이 브랜치 이력에 커밋돼 있지 않음',
};

function usage(json, message) {
  process.exitCode = 2;
  if (json) {
    emitObservation(buildEnvelope({
      command: 'wiki',
      status: 'error',
      summary: `wiki 실패: ${message}`,
      error: buildErrorPacket({
        cause: message,
        retry: USAGE,
        safeDefault: '아무 파일도 바뀌지 않았다(읽기 전용 명령)',
        stop: '인자를 고치기 전에는 다시 실행하지 말 것',
      }),
    }));
    return;
  }
  console.error(`wiki: ${message}`);
  console.error(USAGE);
}

function emitError(json, summary, packet) {
  process.exitCode = 1;
  if (json) {
    emitObservation(buildEnvelope({ command: 'wiki', status: 'error', summary, error: packet }));
    return;
  }
  console.log(`✗ wiki: ${summary}`);
  for (const line of renderErrorPacket(packet)) console.log(line);
}

export async function runWiki(ctx) {
  const json = !!(ctx.flags && ctx.flags.json);
  const args = ctx.taskArgs || [];
  const action = args[0];
  if (!ACTIONS.includes(action)) {
    usage(json, action ? `알 수 없는 액션 "${action}" (허용: ${ACTIONS.join('|')})` : '액션이 없음');
    return;
  }
  if (args.length > 2) {
    usage(json, `인수가 너무 많음: ${args.slice(2).join(' ')}`);
    return;
  }
  const rawPr = ctx.flags ? ctx.flags.pr : undefined;
  if (rawPr !== undefined && !PR_RE.test(String(rawPr))) {
    usage(json, `--pr 은 양의 정수여야 함: ${rawPr}`);
    return;
  }

  let user;
  let task;
  if (args[1]) {
    const m = LABEL_RE.exec(args[1]);
    if (!m) {
      usage(json, `task는 <user>/<task> 형식이어야 함: ${args[1]}`);
      return;
    }
    [, user, task] = m;
  } else {
    const active = await readActive(ctx.targetDir);
    if (!active || !active.task) {
      emitError(json, '활성 task 없음', buildErrorPacket({
        cause: '인수가 없고 .harness/active.json 에도 활성 task가 없음',
        retry: '`harness-team wiki sources <user>/<task>` 로 대상을 지정하거나 `harness-team task <name>` 으로 활성화',
        safeDefault: '아무 파일도 바뀌지 않았다(읽기 전용 명령)',
        stop: '대상 task 없이 컴파일하지 말 것',
      }));
      return;
    }
    ({ user, task } = active);
  }

  if (!(await exists(taskFilePath(ctx.targetDir, user, task, 'spec.md')))) {
    emitError(json, `task 없음: ${taskLabel(user, task)}`, buildErrorPacket({
      cause: `${taskFileRel(user, task, 'spec.md')} 가 없음`,
      retry: '`harness-team list` 로 task 이름을 확인한 뒤 다시 실행',
      safeDefault: '아무 파일도 바뀌지 않았다(읽기 전용 명령)',
      stop: '없는 task를 컴파일하지 말 것',
    }));
    return;
  }

  const result = await wikiSources(ctx.targetDir, user, task, { pr: rawPr === undefined ? null : Number(rawPr) });

  if (json) {
    const summary = result.blockers.length
      ? `막힘: ${result.blockers.join(', ')}`
      : result.compiled.length ? `이미 컴파일됨 (${result.compiled.length}곳)` : '컴파일 가능';
    emitObservation(buildEnvelope({
      command: 'wiki',
      status: result.blockers.length ? 'warning' : 'success',
      summary,
      extra: result,
    }));
    return;
  }

  const { provenance: p } = result;
  console.log(`wiki sources: ${result.task}`);
  console.log(`  status: ${result.task_status}`);
  console.log(`  provenance: PR ${p.pr === null ? '(없음)' : `#${p.pr}`} · commit ${p.commit ?? '(없음)'} · author ${p.author}`);
  console.log(`  docs: ${result.docs.join(', ') || '(없음)'}`);
  console.log(result.rules.length
    ? `  rules: ${result.rules.join(', ')}`
    : `  rules: (없음 — ${WIKI_RULES_DIR}/ 에 작성 규칙이 없으므로 모든 단락은 ${WIKI_INBOX_DIR}/ 로)`);
  console.log(`  compiled: ${result.compiled.join(', ') || '(없음)'}`);
  console.log(`  marker: ${result.marker ?? '(막힘 — 아래 해소 후 다시 실행)'}`);
  for (const b of result.blockers) console.log(`  ✗ ${b}: ${BLOCKER_TEXT[b]}`);
}

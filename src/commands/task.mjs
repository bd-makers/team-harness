import { join } from 'node:path';
import { readdir, readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { detectMember } from '../member.mjs';
import { exists, writeText } from '../fsx.mjs';
import { buildEnvelope, emitObservation } from '../observation.mjs';
import { readTaskMeta, writeTaskMeta, taskMetaTemplate } from './summary.mjs';

const pexec = promisify(execFile);

// "미완"의 단일 정의 — done-guard와 session-task-gate가 공유.
// 줄 시작 체크박스만 매칭(인라인/산문 `- [ ]`는 미완 아님).
export function planHasOpenBoxes(content) {
  return /^\s*- \[ \]/m.test(content);
}

async function readConfig(targetDir) {
  const p = join(targetDir, '.harness/config.json');
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return {}; }
}

export async function readActive(targetDir) {
  const p = join(targetDir, '.harness/active.json');
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return null; }
}

async function writeActive(targetDir, data) {
  const p = join(targetDir, '.harness/active.json');
  await mkdir(join(targetDir, '.harness'), { recursive: true });
  await writeFile(p, JSON.stringify(data, null, 2) + '\n');
}

async function resolveUser(targetDir, flags) {
  const cfg = await readConfig(targetDir);
  return cfg.user || await detectMember(targetDir, flags);
}

function taskDir(targetDir, user, name) {
  return join(targetDir, 'docs', user, name);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function printTaskNextActions(user, name, { activated = false } = {}) {
  const base = `docs/${user}/${name}/${name}`;
  if (activated) console.log(`next: 현재 단계는 ${base}-plan.md 에서 확인`);
  else console.log(`next: /harness-spec으로 ${base}-spec.md 초안 생성 (또는 직접 작성, Ambiguity 자가진단 포함)`);
  console.log('next: /harness-interview → 구현 → 테스트 (/harness-unittest 계열) → 리뷰 → /harness-retro → done');
}

export function taskSpecTemplate(name) {
  return `# ${name} — Spec

## 목적 / 요구사항


## 설계 / 접근


## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **개념 A**:
- **개념 B**:

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [ ] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [ ] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [ ] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [ ] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [ ] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
<!--
\`\`\`json
{ "version": 1, "review": "required", "tests": "skip" }
\`\`\`
-->

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

-
`;
}

export function taskPlanTemplate(name) {
  return `# ${name} — Plan

## 목표


## 단계
- [ ]

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
-
`;
}

// `docs/<user>/<user>-handoff.md` 의 유일한 렌더러. 두 지점이 이 파일을 쓴다 —
// 커밋마다 도는 `runHandoffAuto`(활성 형태)와 종결 시점의 `runDone`(종결 형태). 두 곳이 각자
// 문자열을 조립하면 형식이 반드시 어긋나므로 여기 하나로 모은다.
//
// 종결 형태에는 커밋 sha 를 담지 않는다. 종결 후에는 훅이 이 파일을 더는 갱신하지 않으므로
// (활성이 null 이면 `runHandoffAuto` 는 즉시 반환한다) 박아 둔 sha 는 다음 커밋 즉시 낡는다.
// 대신 계속 갱신되는 task handoff 를 가리킨다 — 커밋 이력의 정본은 그쪽이다.
export function renderUserHandoff({ user, task, date, commitMsg = '', closed = false }) {
  const head = closed
    ? `## Active Task
없음 — \`.harness/active.json\` 은 \`null\` 이다.
새 작업은 \`harness-team task <name>\` 으로 시작한다.

## Last Completed Task (${date})
\`${task}\` — done
`
    : `## Active Task
${task}

## Last Commit (${date})
${commitMsg}
`;

  return `# Session Handoff

${head}
## Full Context
→ docs/${user}/${task}/${task}-handoff.md
`;
}

function taskHandoffTemplate(name) {
  return `# ${name} — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)
`;
}

export function taskArtifactTemplate(name) {
  return `# ${name} — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과


## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: \`<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->\`*


## Learnings

`;
}

export function taskContextTemplate(name) {
  return `# ${name} — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal:
- Current atomic step:
- Stop / human-decision condition:

## Constraints and settled decisions
-

## JIT retrieval map
- Identifiers / symbols:
- Narrow globs:
- Read next:
- Verification command:

## Failure capsules (max 3 unresolved)
### F-001
- Signal:
- Tried:
- Compact finding / current hypothesis:
- Next discriminator:
- Source (safe path or command):

## Resume checklist
-
`;
}

export async function runTask(ctx) {
  const json = !!(ctx.flags && ctx.flags.json);
  const name = (ctx.taskArgs || [])[0];
  if (!name || !/^[\w.-]+$/.test(name)) {
    process.exitCode = 1;
    const rootCause = name
      ? `task 이름 "${name}"에 허용되지 않는 문자가 있음 (허용: 영숫자·_·.·-)`
      : 'task 이름 인자가 없음';
    if (json) {
      emitObservation(buildEnvelope({
        command: 'task',
        status: 'error',
        summary: 'task 생성/활성화 실패: 잘못된 task 이름',
        error: {
          root_cause: rootCause,
          safe_retry: '`harness-team task <name>` 형식으로 영숫자·_·.·- 만 사용한 이름을 주고 재실행',
          stop_condition: '이름 규칙(^[\\w.-]+$)을 만족하지 못하면 생성하지 말 것',
        },
      }));
    } else {
      console.log(`✗ task: 잘못된 task 이름`);
      console.log(`cause: ${rootCause}`);
      console.log(`retry: \`harness-team task <name>\` 형식으로 유효한 이름을 주고 재실행`);
      console.log(`stop: 이름 규칙(^[\\w.-]+$) 위반 시 생성 금지`);
    }
    return;
  }

  const user = await resolveUser(ctx.targetDir, ctx.flags);
  const dir = taskDir(ctx.targetDir, user, name);
  const date = today();

  if (await exists(dir)) {
    await writeActive(ctx.targetDir, {
      user, task: name,
      path: `docs/${user}/${name}`,
      switchedAt: new Date().toISOString(),
    });
    if (json) {
      emitObservation(buildEnvelope({
        command: 'task',
        status: 'success',
        summary: `activated: ${user}/${name}`,
        nextActions: [`docs/${user}/${name}/${name}-plan.md 의 현재 단계 확인`],
        artifacts: [`docs/${user}/${name}`],
      }));
    } else {
      console.log(`activated: ${user}/${name}`);
      printTaskNextActions(user, name, { activated: true });
    }
    return;
  }

  await mkdir(dir, { recursive: true });
  await writeText(join(dir, `${name}-spec.md`), taskSpecTemplate(name));
  await writeText(join(dir, `${name}-plan.md`), taskPlanTemplate(name));
  await writeText(join(dir, `${name}-handoff.md`), taskHandoffTemplate(name));
  await writeText(join(dir, `${name}-artifact.md`), taskArtifactTemplate(name));
  await writeText(join(dir, `${name}-context.md`), taskContextTemplate(name));

  // 판정 창의 시작점. 생성 시 1회만 찍고 meta에 굳힌다 — 재활성화(위 분기)는 `switchedAt`만
  // 갱신하고 이 값은 건드리지 않는다. 둘이 갈라지는 순간이 done 가드 오탐의 원인이었다.
  const firstActivatedAt = new Date().toISOString();

  await writeActive(ctx.targetDir, {
    user, task: name,
    path: `docs/${user}/${name}`,
    switchedAt: firstActivatedAt,
  });

  // Per-task state only. The shared ledger (docs/task_summary.md and the user index)
  // is rendered by `harness-team summary`; writing it here is what made every parallel
  // branch collide on the same line.
  await writeText(join(dir, `${name}-meta.json`), taskMetaTemplate(user, name, date, firstActivatedAt));

  if (json) {
    emitObservation(buildEnvelope({
      command: 'task',
      status: 'success',
      summary: `created: docs/${user}/${name}/`,
      nextActions: [`/harness-spec으로 docs/${user}/${name}/${name}-spec.md 초안 생성 (또는 직접 작성, Ambiguity 자가진단 포함)`],
      artifacts: [
        `docs/${user}/${name}/${name}-spec.md`,
        `docs/${user}/${name}/${name}-plan.md`,
        `docs/${user}/${name}/${name}-handoff.md`,
        `docs/${user}/${name}/${name}-artifact.md`,
        `docs/${user}/${name}/${name}-context.md`,
        `docs/${user}/${name}/${name}-meta.json`,
      ],
    }));
  } else {
    console.log(`created: docs/${user}/${name}/`);
    console.log(`active: ${user}/${name}`);
    printTaskNextActions(user, name);
  }
}

export async function runList(ctx) {
  const docs = join(ctx.targetDir, 'docs');
  if (!(await exists(docs))) { console.log('(no docs/)'); return; }

  const active = await readActive(ctx.targetDir);
  const entries = await readdir(docs, { withFileTypes: true });
  const userDirs = entries.filter(e => e.isDirectory()).map(e => e.name);

  let found = false;
  for (const user of userDirs) {
    const userPath = join(docs, user);
    const userEntries = await readdir(userPath, { withFileTypes: true });
    const taskDirs = userEntries.filter(e => e.isDirectory()).map(e => e.name);
    for (const task of taskDirs) {
      // Only list dirs carrying a task marker (<name>-spec.md); this skips non-task
      // dirs like docs/superpowers/{plans,specs} that are not user/task at all.
      if (!(await exists(join(userPath, task, `${task}-spec.md`)))) continue;
      const isActive = active && active.user === user && active.task === task;
      console.log(`${isActive ? '*' : ' '} ${user}/${task}`);
      found = true;
    }
  }
  if (!found) console.log('(no tasks)');
}

// Extract file paths from `git status --porcelain` output: strip the 2-char status +
// space prefix, resolve rename arrows (`old -> new` → new), and unquote core.quotepath
// paths. Used by the done-guard to tell real uncommitted work from hook-generated files.
export function parsePorcelainPaths(stdout) {
  return stdout.split('\n')
    .filter(l => l.length > 3)
    .map(l => {
      let p = l.slice(3);
      const arrow = p.indexOf(' -> ');
      if (arrow !== -1) p = p.slice(arrow + 4);
      if (p.startsWith('"') && p.endsWith('"')) p = p.slice(1, -1);
      return p;
    });
}

// spec의 `## Done evidence` 선언. `boundary check`의 `not-configured` 전례를 따른다 —
// 선언이 없으면 기본값을 쓰고, 깨져 있으면 invalid를 돌려 done이 차단 사유로 보고한다.
// 조용히 기본값으로 폴백하면 선언 자체가 무력해진다.
const DONE_EVIDENCE_RE = /^## Done evidence[ \t]*\r?\n(?:[ \t]*\r?\n)*```json[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/m;
// 닫는 fence가 없어도 "선언을 쓰려던 흔적"은 invalid로 잡는다 — fail-open 방지.
// (템플릿처럼 섹션 전체가 <!-- --> 주석 안이면 ```json이 heading 바로 다음에 오지 않아 매치하지 않는다.)
const DONE_EVIDENCE_OPEN_RE = /^## Done evidence[ \t]*\r?\n(?:[ \t]*\r?\n)*```json[ \t]*\r?\n/m;

// tests는 git만으로 판정 가능하고 소스 변경이 있을 때만 발동하므로 기본 ON.
// review는 마커 신뢰 기반이라 부분 검증뿐이고, 전체 강제는 `--force` 훈련이 되므로 기본 OFF.
// verify도 같은 이유로 기본 OFF — review와 달리 검증 프레이밍 kind 접미사 마커만 센다.
export const DONE_EVIDENCE_DEFAULT = { tests: 'required', review: 'optional', verify: 'optional' };

const DONE_EVIDENCE_VALUES = {
  tests: ['required', 'skip'],
  review: ['required', 'optional'],
  verify: ['required', 'optional'],
};

export function parseDoneEvidenceDeclaration(spec) {
  const match = spec.match(DONE_EVIDENCE_RE);
  if (!match) {
    if (DONE_EVIDENCE_OPEN_RE.test(spec)) {
      return { status: 'invalid', reason: '```json 블록이 닫히지 않음' };
    }
    return { status: 'not-configured', ...DONE_EVIDENCE_DEFAULT };
  }

  let declaration;
  try {
    declaration = JSON.parse(match[1]);
  } catch (err) {
    return { status: 'invalid', reason: `JSON 파싱 실패: ${err.message}` };
  }
  if (declaration === null || typeof declaration !== 'object' || Array.isArray(declaration)) {
    return { status: 'invalid', reason: 'object가 아님' };
  }
  if (declaration.version !== 1) {
    return { status: 'invalid', reason: '"version": 1 이 필요함' };
  }

  const unknown = Object.keys(declaration).filter(k => k !== 'version' && !(k in DONE_EVIDENCE_VALUES));
  if (unknown.length) {
    return { status: 'invalid', reason: `알 수 없는 키: ${unknown.join(', ')}` };
  }

  const resolved = { ...DONE_EVIDENCE_DEFAULT };
  for (const [key, allowed] of Object.entries(DONE_EVIDENCE_VALUES)) {
    if (declaration[key] === undefined) continue;
    if (!allowed.includes(declaration[key])) {
      return { status: 'invalid', reason: `"${key}"는 ${allowed.join(' | ')} 중 하나여야 함` };
    }
    resolved[key] = declaration[key];
  }
  return { status: 'configured', ...resolved };
}

// 언어 무관 소스 확장자 화이트리스트. 문서(.md)·설정(.json/.yml)만 바뀐 task에서는
// source=false가 되어 테스트 작성 체크가 아예 발동하지 않는다.
const SOURCE_EXTENSIONS = new Set([
  'js', 'mjs', 'cjs', 'ts', 'mts', 'cts', 'tsx', 'jsx', 'py', 'go', 'rb', 'java', 'kt', 'swift',
  'c', 'h', 'cpp', 'cc', 'cs', 'rs', 'sh', 'php', 'scala', 'm', 'mm', 'dart',
]);

// 산문 문서 확장자. `tests/`·`specs/` 아래여도 산문은 테스트 정의가 아니다.
// 기준은 "**문서로만** 쓰이는 포맷인가"다 — `json`/`yml`/`txt`는 `tests/fixtures/expected.txt`처럼
// golden·fixture로도 흔히 쓰이므로 일부러 뺐다. 제외하면 fixture만 고친 정직한 작업이 차단된다.
// `md`는 예외적으로 넣는다: 실제로 막아야 하는 `docs/**/specs/*.md`가 md이기 때문이며,
// 그 대가로 markdown golden fixture는 증거에서 빠진다(통과가 아니라 차단 쪽 대가 — 아래 주석 참조).
const PROSE_EXTENSIONS = new Set([
  'md', 'mdx', 'markdown', 'rst', 'adoc', 'asciidoc', 'textile', 'org', 'tex', 'typ',
]);

// 확장자만 뽑는다. 확장자 없는 파일(`Makefile`)과 dotfile(`.eslintrc`)은 null.
// 끝의 점은 떼고 본다 — `README.md.`이 확장자 없는 파일로 보여 산문 판정을 빠져나가면 안 된다.
function fileExtension(path) {
  const base = path.slice(path.lastIndexOf('/') + 1).replace(/\.+$/, '');
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : null;
}

// dotfile은 도구 설정이지 테스트 정의가 아니다 — `tests/.gitignore`가 테스트 증거로 세어지면 안 된다.
function isDotfile(path) {
  return path.slice(path.lastIndexOf('/') + 1).startsWith('.');
}

// 두 규칙은 신호의 세기가 달라 확장자 조건도 다르다 — 같은 조건을 쓰면 한쪽이 반드시 틀린다.
function isTestPath(path) {
  const ext = fileExtension(path);
  // (1) 디렉터리 규칙 — 경로가 스스로 "테스트"라고 말하는 **강한** 신호다. 여기서는 산문 문서만
  // 걷어낸다. 코드 확장자 화이트리스트로 좁히면 `tests/foo.test.mts`·`tests/run-e2e`처럼
  // 목록 밖 확장자·무확장자 테스트가 증거에서 빠져 **정직한 작업을 차단**한다(codex 리뷰 P2).
  if (/(^|\/)(tests?|__tests__|specs?)(\/|$)/i.test(path)) {
    if (isDotfile(path)) return false;
    return !(ext !== null && PROSE_EXTENSIONS.has(ext));
  }
  // (2) basename 규칙 — 이름의 우연한 일치라 **약한** 신호다. 코드 확장자만 인정한다.
  // 이 조건이 없으면 모든 task가 커밋하는 `<name>-spec.md`가 테스트로 세어져 가드가 죽는다.
  if (ext === null || !SOURCE_EXTENSIONS.has(ext)) return false;
  const base = path.slice(path.lastIndexOf('/') + 1);
  // `foo.test.ts`, `foo_test.go`, `foo-spec.rb`, 그리고 `FooTests.swift` 류.
  return /(^|[._-])(test|spec)s?\.[^.]+$/i.test(base) || /(Test|Tests|Spec|Specs)\.[^.]+$/.test(base);
}

// 테스트 판정이 소스 판정보다 우선한다 — `foo.test.ts`는 소스 변경으로 세지 않는다.
export function classifyChangedPaths(paths) {
  let source = false;
  let test = false;
  for (const raw of paths) {
    // git이 non-ASCII 경로를 C-quote("...")로 감싸 출력해도 분류가 깨지지 않게 벗긴다.
    const unquoted = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
    const path = unquoted.replace(/\\/g, '/');
    if (isTestPath(path)) { test = true; continue; }
    const ext = fileExtension(path);
    if (ext !== null && SOURCE_EXTENSIONS.has(ext)) source = true;
  }
  return { source, test };
}

// 계약은 ISO8601 — Date.parse는 '1'(→2000-12-31)이나 '9999'(→9999년) 같은 비계약 값도
// 시각으로 받아들인다. 형태를 먼저 보지 않으면 깨진 값이 degrade가 아니라 엉뚱한 창이 된다.
const ISO_INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function parseIsoInstant(value) {
  return ISO_INSTANT_RE.test(value ?? '') ? Date.parse(value) : NaN;
}

// artifact에 남는 리뷰 마커: <!-- harness:review kind=codex scope=worktree tip=<sha> at=<ISO> -->
// 섹션 파싱은 취약하므로 파일 전체를 스캔한다. 형식이 깨진 마커는 없는 것과 같이 취급한다.
const REVIEW_MARKER_RE = /<!--\s*harness:review\s+([^>]*?)-->/g;

// verify 증거로 인정되는 검증 프레이밍 kind 접미사. 열거의 정본은 commands/harness-review.md
// 5단계다 — src 상수와의 동기화는 pin 테스트가 강제한다. 엔진 자리는 custom 엔진 이름이 올 수
// 있어 열거할 수 없으므로 접미사만 대조한다. 일반 review 증거는 현행대로 kind 비대조다.
export const VERIFY_KIND_SUFFIXES = ['adversarial', 'testcritic', 'shipcheck', 'contrarian', 'simplifier'];
const VERIFY_KIND_RE = new RegExp(`-(?:${VERIFY_KIND_SUFFIXES.join('|')})$`);

export function parseReviewMarkers(artifact) {
  const markers = [];
  for (const match of artifact.matchAll(REVIEW_MARKER_RE)) {
    const attrs = {};
    for (const kv of match[1].matchAll(/([a-z][a-z0-9-]*)=("[^"]*"|\S+)/gi)) {
      attrs[kv[1].toLowerCase()] = kv[2].replace(/^"|"$/g, '');
    }
    const at = parseIsoInstant(attrs.at);
    if (!attrs.kind || Number.isNaN(at)) continue;
    markers.push({ kind: attrs.kind, at, scope: attrs.scope ?? null, tip: attrs.tip ?? null });
  }
  return markers;
}

async function collectDoneIssues(targetDir, active) {
  const { user, task } = active;
  const issues = [];

  // 판정 창(evidence window) — "이 task의 작업 구간"의 시작.
  // active.json의 `switchedAt`은 *마지막 활성화* 시각이라 재활성화·task 전환이 창을 초기화하고,
  // 이미 만족된 증거를 창 밖으로 밀어냈다. `meta.firstActivatedAt`은 생성 시 1회만 기록되므로
  // 몇 번을 오가도 창이 움직이지 않는다.
  const meta = await readTaskMeta(targetDir, user, task);
  const parsedStart = parseIsoInstant(meta && meta.firstActivatedAt);
  // 필드가 없거나(구 task) 값이 깨졌으면 창을 모른다 → 다른 시각으로 대체하지 않고 시각 비교를 포기한다.
  const windowStart = Number.isNaN(parsedStart) ? null : parsedStart;
  const windowStartIso = windowStart === null ? null : meta.firstActivatedAt;

  // spec 선언 — 없으면 기본값(tests 검사 / review 미검사), 깨져 있으면 그 자체가 차단 사유.
  let evidence = { status: 'not-configured', ...DONE_EVIDENCE_DEFAULT };
  try {
    const specPath = join(targetDir, 'docs', user, task, `${task}-spec.md`);
    evidence = parseDoneEvidenceDeclaration(await readFile(specPath, 'utf8'));
  } catch { /* spec.md 없음 → 기본값 유지 */ }
  if (evidence.status === 'invalid') {
    issues.push(`spec의 \`## Done evidence\` 선언이 올바르지 않음 (${evidence.reason})`);
  }

  // plan.md: unchecked boxes remaining
  try {
    const planPath = join(targetDir, 'docs', user, task, `${task}-plan.md`);
    const planContent = await readFile(planPath, 'utf8');
    // Match only line-leading checkboxes, so inline/prose mentions of `- [ ]`
    // (e.g. text describing the guard itself) don't trigger a false positive.
    if (planHasOpenBoxes(planContent)) {
      issues.push('plan.md에 미완 체크박스(`- [ ]`)가 남아 있음');
    }
  } catch { /* no plan.md → not a positive signal, skip */ }

  // artifact.md: missing or still the untouched template
  const artifactPath = join(targetDir, 'docs', user, task, `${task}-artifact.md`);
  let artifactContent = null;
  if (!(await exists(artifactPath))) {
    issues.push('artifact.md가 없음 (결과/학습 미기록)');
  } else {
    artifactContent = await readFile(artifactPath, 'utf8');
    if (artifactContent.trim() === taskArtifactTemplate(task).trim()) {
      issues.push('artifact.md가 템플릿 그대로임 (내용 없음)');
    }
  }

  // 리뷰·검증 마커 — spec이 명시적으로 required를 선언한 task만 검사한다.
  // "리뷰가 진짜 돌았는가"는 검증할 수 없다. 이 체크가 막는 것은 망각이다.
  if (evidence.review === 'required' || evidence.verify === 'required') {
    const markers = artifactContent ? parseReviewMarkers(artifactContent) : [];
    // 창을 모르면(구 task) 시각 비교를 포기하고 마커 존재만 본다.
    const fresh = markers.filter(m => windowStart === null || m.at >= windowStart);
    if (evidence.review === 'required' && !fresh.length) {
      issues.push('spec이 `review: required`인데 이 task 기간의 리뷰 마커가 artifact에 없음 (`/harness-review` 실행 후 기록)');
    }
    // verify는 검증 프레이밍 kind만 센다 — 검증 마커는 review도 겸하지만 역은 성립하지 않는다.
    // 가드는 마커 존재·kind·시각만 읽는다(D6: finding 내용 판정은 결정론 게이트 밖).
    if (evidence.verify === 'required' && !fresh.some(m => VERIFY_KIND_RE.test(m.kind))) {
      issues.push(`spec이 \`verify: required\`인데 이 task 기간의 검증 마커가 artifact에 없음 (kind 접미사 ${VERIFY_KIND_SUFFIXES.map(s => `-${s}`).join('·')} — 검증 프레이밍 리뷰 실행 후 기록)`);
    }
  }

  // git signals — degrade gracefully when this isn't a git repo (or git is absent):
  // skip the git checks entirely. Inside a real repo, an empty/HEAD-less log means
  // zero commits (which IS the problem we want to catch), not a reason to skip.
  let isGitRepo = false;
  try {
    await pexec('git', ['-C', targetDir, 'rev-parse', '--is-inside-work-tree'], { maxBuffer: 1024 * 1024 });
    isGitRepo = true;
  } catch { /* not a git repo / git absent → leave isGitRepo=false, skip all git checks */ }

  if (isGitRepo) {
    try {
      const { stdout } = await pexec('git', ['-C', targetDir, 'status', '--porcelain'], { maxBuffer: 1024 * 1024 });
      // The post-commit hook (`harness-team handoff`) regenerates these handoff files
      // after every commit, so they're ~always dirty at `done` time. Exclude them — the
      // guard should block on real uncommitted work, not the hook's own auto-output.
      const handoffRels = new Set([
        `docs/${user}/${task}/${task}-handoff.md`,
        `docs/${user}/${user}-handoff.md`,
      ]);
      const realDirty = parsePorcelainPaths(stdout).filter(p => !handoffRels.has(p));
      if (realDirty.length) issues.push('커밋되지 않은 변경이 있음');
    } catch { /* transient git error → don't fabricate a problem */ }

    // 창을 모르는 구 task에서는 이 두 가드를 통째로 건너뛴다. 대체 시각을 지어내면 창이 넓어져
    // `git log --since`가 *다른* task의 커밋까지 세게 되고, 가드가 "이 task를 했는가"가 아니라
    // "리포가 활발했는가"를 재게 된다.
    if (windowStartIso) {
      try {
        const { stdout } = await pexec('git', ['-C', targetDir, 'log', `--since=${windowStartIso}`, '--oneline'], { maxBuffer: 1024 * 1024 });
        if (!stdout.trim()) issues.push('task 시작 이후 커밋이 0개임');
      } catch {
        // HEAD-less repo (no commits at all) → git log throws → that IS zero commits.
        issues.push('task 시작 이후 커밋이 0개임');
      }

      // 테스트 작성 체크 — 커밋 훅(pre-commit-check.sh)은 테스트를 *실행*하지만
      // *작성*은 강제하지 못하고, Claude Code 세션 밖(OpenCode 등)에서는 아예 걸리지 않는다.
      // 여기서는 git 이력만으로 판정하므로 어떤 드라이버가 커밋했든 동일하게 적용된다.
      if (evidence.tests === 'required') {
        try {
          const { stdout } = await pexec(
            'git',
            ['-C', targetDir, '-c', 'core.quotepath=false', 'log', `--since=${windowStartIso}`, '--name-only', '--pretty=format:'],
            { maxBuffer: 8 * 1024 * 1024 },
          );
          const changed = classifyChangedPaths(stdout.split('\n').map(l => l.trim()).filter(Boolean));
          if (changed.source && !changed.test) {
            issues.push('소스는 바뀌었는데 테스트 파일 변경이 없음 (테스트 미작성 — 불필요하면 spec에 `"tests": "skip"` 선언)');
          }
        } catch { /* transient git error → don't fabricate a problem */ }
      }
    }
  }

  return issues;
}

export async function runDone(ctx) {
  const active = await readActive(ctx.targetDir);
  if (!active || !active.task) { console.log('no active task'); return; }

  const force = !!(ctx.flags && ctx.flags.force);
  const issues = await collectDoneIssues(ctx.targetDir, active);

  if (issues.length && !force) {
    process.exitCode = 1;
    console.log(`✗ done: 종결 가드에 걸림 (${issues.length}개)`);
    for (const i of issues) console.log(`cause: ${i}`);
    console.log(`retry: 위 항목을 해소한 뒤 다시 \`harness-team done\` 실행`);
    console.log(`stop: 의도적으로 무시하려면 \`harness-team done --force\``);
    return;
  }
  if (issues.length && force) {
    for (const i of issues) console.log(`⚠️ ${i}`);
    console.log(`(--force: 경고만 하고 진행)`);
  }

  const { user, task } = active;
  const handoffPath = join(ctx.targetDir, 'docs', user, task, `${task}-handoff.md`);
  const ts = new Date().toISOString();

  await appendFile(handoffPath, `\n## ${ts} — 완료\n\n태스크 종료.\n`);

  const meta = (await readTaskMeta(ctx.targetDir, user, task)) || { user, task, created: today() };
  await writeTaskMeta(ctx.targetDir, user, task, { ...meta, user, task, status: 'done', closedAt: ts });

  // 사용자 handoff 는 AGENTS.md 가 규정한 **세션 진입점**이다. 갱신하지 않고 활성만 비우면
  // 이 파일이 종결된 task 를 계속 "Active Task" 로 가리킨 채 얼어붙는다 — 이후 커밋에서
  // `runHandoffAuto` 는 활성이 null 이라 즉시 반환하므로 되살릴 경로가 없다.
  // 상태 전이를 아는 유일한 지점이 여기이므로 여기서 1회 종결 형태로 쓴다. 훅에서 매 커밋
  // 쓰게 하지 않는 이유: 활성 없는 기간의 모든 커밋이 이 파일을 재작성해 diff 소음이 된다.
  // 차단 경로는 위에서 이미 반환했으므로 이 쓰기는 실제로 종결될 때만 일어난다.
  const userHandoffPath = join(ctx.targetDir, 'docs', user, `${user}-handoff.md`);
  await writeFile(userHandoffPath, renderUserHandoff({
    user, task, date: ts.slice(0, 10), closed: true,
  }));

  await writeActive(ctx.targetDir, null);
  console.log(`done: ${user}/${task}`);
  console.log(`handoff updated: docs/${user}/${task}/${task}-handoff.md`);
  console.log(`handoff updated: docs/${user}/${user}-handoff.md`);
}

export async function runRetro(ctx) {
  const json = !!(ctx.flags && ctx.flags.json);
  const active = await readActive(ctx.targetDir);
  if (!active || !active.task) {
    process.exitCode = 1;
    if (json) {
      emitObservation(buildEnvelope({
        command: 'retro',
        status: 'error',
        summary: 'retro 실패: 활성 task 없음',
        error: {
          root_cause: '.harness/active.json 에 활성 task가 없어 append 대상 artifact.md를 찾을 수 없음',
          safe_retry: '`harness-team task <name>` 로 task를 활성화한 뒤 다시 실행',
          stop_condition: 'task가 하나도 없으면 먼저 task를 생성하라',
        },
      }));
    } else {
      console.log(`✗ retro: 활성 task 없음`);
      console.log(`cause: .harness/active.json 에 활성 task가 없어 append 대상 artifact.md를 찾을 수 없음`);
      console.log(`retry: \`harness-team task <name>\` 로 task를 활성화한 뒤 다시 실행`);
      console.log(`stop: task가 하나도 없으면 먼저 task를 생성하라`);
    }
    return;
  }

  const { user, task } = active;
  const artifactPath = join(ctx.targetDir, 'docs', user, task, `${task}-artifact.md`);

  if (!(await exists(artifactPath))) {
    await writeText(artifactPath, taskArtifactTemplate(task));
  }

  const date = today();
  const text = (ctx.taskArgs || []).join(' ');
  const section = text
    ? `\n## Learnings (${date})\n\n- ${text}\n`
    : `\n## Learnings (${date})\n\n-\n`;

  await appendFile(artifactPath, section);

  const relPath = `docs/${user}/${task}/${task}-artifact.md`;
  if (json) {
    emitObservation(buildEnvelope({
      command: 'retro',
      status: 'success',
      summary: `${relPath} 에 ## Learnings (${date}) 추가`,
      nextActions: ['artifact.md를 열어 학습 내용을 채우거나, 추가 메모는 `harness-team retro "<메모>"` 재실행'],
      artifacts: [relPath],
    }));
  } else {
    console.log(`✓ retro: ${relPath} 에 ## Learnings (${date}) 추가`);
    console.log(`next: artifact.md를 열어 학습 내용을 채우거나, 추가 메모는 \`harness-team retro "<메모>"\` 재실행`);
  }
}

export async function runHandoffAuto(ctx) {
  const active = await readActive(ctx.targetDir);
  if (!active || !active.task) return;

  const { user, task } = active;
  const ts = new Date().toISOString();

  let commitMsg = '';
  let diffStat = '';

  try {
    const { stdout } = await pexec('git', ['-C', ctx.targetDir, 'log', '-1', '--oneline'], { maxBuffer: 1024 * 1024 });
    commitMsg = stdout.trim();
  } catch { /* continue with empty commitMsg */ }

  try {
    const { stdout } = await pexec('git', ['-C', ctx.targetDir, 'diff', 'HEAD~1', '--stat'], { maxBuffer: 1024 * 1024 });
    diffStat = stdout.trim();
  } catch {}

  const taskHandoffPath = join(ctx.targetDir, 'docs', user, task, `${task}-handoff.md`);
  // No trailing blank line: entries are separated by the next entry's leading
  // newline, and a blank line at EOF trips `git diff --check` on every commit.
  const taskEntry = `\n## ${ts} — ${commitMsg}\n${diffStat ? diffStat + '\n' : ''}`;
  await appendFile(taskHandoffPath, taskEntry);

  const userHandoffPath = join(ctx.targetDir, 'docs', user, `${user}-handoff.md`);
  await writeFile(userHandoffPath, renderUserHandoff({
    user, task, date: ts.slice(0, 10), commitMsg, closed: false,
  }));

  try {
    const planPath = join(ctx.targetDir, 'docs', user, task, `${task}-plan.md`);
    const planContent = await readFile(planPath, 'utf8');
    const hasUnchecked = planContent.includes('- [ ]');
    const hasChecked = planContent.includes('- [x]');
    if (!hasUnchecked && hasChecked) {
      process.stdout.write('PLAN_COMPLETE\n');
    }
  } catch {}
}

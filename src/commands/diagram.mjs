// `harness-team diagram record` — 다이어그램 옵트인의 **기록** 단계를 소유한다.
//
// 이 커맨드가 생긴 이유는 세 문서다. `commands/harness-diagram.md` 7번 · `harness-task.md` 6번 ·
// `harness-ship.md` Record 가 "artifact 에 날짜와 함께 한 줄" 을 각자 산문으로 들고 있었고 세 문구가 이미
// 갈려 있었다. plan 체크박스 닫기도 두 곳에 나뉘어 있었다. 결과(생성 | 미실행+사유)가 정해지면 두 쓰기는
// 판단이 없으므로 여기로 내리고, probe(이 세션에 어떤 스킬이 노출됐는가)·degrade(건너뛸지)는 산문에 남는다.
//
// 기록 명령은 **옵트인을 만들지 않는다.** plan 에 다이어그램 단계가 없으면 거부한다 — 옵트인은 plan 단계
// 추가로 남기는 사용자 결정이고(task.md 2번), 그것을 기록 명령의 부수효과로 두면 두 결정이 섞인다.
import { readFile } from 'node:fs/promises';
import { exists, writeText } from '../fsx.mjs';
import { readActive, taskArtifactTemplate } from './task.mjs';
import { insertBeforeHeading, posixSingleQuote } from './review.mjs';
import { taskFileRel, taskFilePath, diagramKind } from '../task-paths.mjs';
import { DIAGRAM_VIEWS } from '../cli-args.mjs';
import { buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../observation.mjs';

const ACTIONS = ['record'];
const USAGE = `usage: harness-team diagram record [--view ${DIAGRAM_VIEWS.join('|')}] [--skipped] [사유·메모 ...]   (--skipped 면 사유 필수)`;

// 줄머리 체크박스 + "다이어그램" — `planHasOpenBoxes` 와 같은 이유로 줄머리만 본다(인라인 산문은 단계가 아니다).
// 그리고 **`## 단계` 절 안만** 본다 — `## 참고` 의 `- [ ] 다이어그램 예시…` 를 옵트인 단계로 닫으면
// "단계가 없으면 거부" 계약이 깨진다(codex 리뷰 P1 1회차). 옵트인 계약(task.md 2번)이 단계를 넣는 곳도 거기다.
// 문구도 정식 옵트인 문구(`spec/plan 다이어그램` — task.md 2번이 넣고 4번이 닫는 형식)로 좁힌다.
// "아키텍처 다이어그램 추가" 같은 일반 단계를 옵트인으로 닫으면 옵트아웃 상태를 훼손한다(codex 리뷰 P1 2회차).
// 뷰 단계는 `spec/plan 다이어그램(<view>)` 이다. 레거시(뷰 없음) 패턴은 바로 뒤의 `(` 를 거부한다 — 안 그러면
// `--view` 없는 record 가 뷰 단계를 닫고, --skipped 면 뷰 태그를 지운 레거시 형식으로 바꿔 쓴다(diagram-views R1).
const STEPS_HEADING_RE = /^## 단계\s*$/m;

const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// plan 단계의 문구 머리. 체크박스 닫기·에러 안내가 같은 문자열을 쓴다.
export const diagramStepLabel = (view) => (view ? `spec/plan 다이어그램(${view})` : 'spec/plan 다이어그램');

function stepPatterns(view) {
  // 레거시는 **알려진 뷰** 꼬리만 거부한다 — 손으로 쓴 `spec/plan 다이어그램(선택)` 같은 레거시 단계는 종전대로 닫힌다(codex 4차 P2).
  const label = view
    ? escapeRe(diagramStepLabel(view))
    : `${escapeRe(diagramStepLabel())}(?!\\((?:${DIAGRAM_VIEWS.map(escapeRe).join('|')})\\))`;
  return {
    open: new RegExp(`^(\\s*)- \\[ \\] (${label}.*)$`, 'm'),
    closed: new RegExp(`^\\s*- \\[x\\] ${label}`, 'm'),
  };
}

// `## 단계` 절의 [start, end) 오프셋. 절이 없으면 null — 옵트인 단계가 들어갈 자리가 없다.
function stepsSection(plan) {
  const heading = plan.match(STEPS_HEADING_RE);
  if (!heading) return null;
  const start = heading.index + heading[0].length;
  const rest = plan.slice(start);
  const next = rest.match(/^## /m);
  return { start, end: next ? start + next.index : plan.length };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// 생략 기록 줄의 머리. `pr-check` 가 다이어그램 권장 안내를 낼지 이 문자열로 판정한다.
export const DIAGRAM_SKIPPED_PREFIX = '- 다이어그램: 미실행 — ';

// 세 문서가 각자 들고 있던 형식의 유일한 출처. 뷰 생략은 머리를 그대로 두고 사유 앞에 `[<view>]` 를 붙인다 —
// pr-check 는 머리만 보므로 판정이 바뀌지 않는다. 생성 줄은 경로가 뷰를 담는다.
export function diagramRecordLine({ outcome, diagram, note = '', date, verb = '생성', view = null }) {
  if (outcome === 'skipped') return `${DIAGRAM_SKIPPED_PREFIX}${view ? `[${view}] ` : ''}${note} (${date})`;
  return note ? `- 다이어그램: ${diagram} ${verb} — ${note} (${date})` : `- 다이어그램: ${diagram} ${verb} (${date})`;
}

// plan 의 다이어그램 단계를 닫는다. 열린 단계가 없으면 plan 을 바꾸지 않고 상태만 돌려준다:
// `already-closed`(닫힌 단계만 있음 — 재기록) · `missing`(옵트인 흔적이 없음 — 호출자가 거부).
// `view` 가 있으면 그 뷰 단계만, 없으면 레거시 단계만 본다 — 다른 뷰의 단계는 건드리지 않는다.
export function closeDiagramStep(plan, { outcome, note = '', view = null }) {
  const section = stepsSection(plan);
  if (!section) return { plan, status: 'missing' };
  const body = plan.slice(section.start, section.end);
  const patterns = stepPatterns(view);
  const open = body.match(patterns.open);
  if (!open) return { plan, status: patterns.closed.test(body) ? 'already-closed' : 'missing' };
  const indent = open[1];
  // 만들었으면 체크만 켠다(경로가 남는다). 건너뛰었으면 task.md 4번의 형식으로 — 지우지 않고 사유를 붙여 닫는다.
  const closed = outcome === 'skipped'
    ? `${indent}- [x] ${diagramStepLabel(view)} — 미실행(${note})`
    : `${indent}- [x] ${open[2]}`;
  const at = section.start + open.index;
  return { plan: plan.slice(0, at) + closed + plan.slice(at + open[0].length), status: 'closed' };
}

// 뷰 SVG 의 자립성(diagram-svg R1). 뷰어가 SVG 를 `<img>` 로 보이면(Markdown 이미지·Obsidian) 외부 자원을 불러오지 않고
// 스크립트를 돌리지 않는다 — 그림이 오류 없이 조용히 깨진다. 그래서 거부 목록이 아니라 **허용 목록**이다: `href`·`url()` 값은
// 문서 안(`#…`)·`data:`·빈 값만. http 만 막으면 상대 경로·`//`·`javascript:` 가 같은 이유로 샌다. 주석·텍스트 안도 본다(보수적 —
// `<text>url(x)</text>` 같은 글자도 걸린다. 오탐 비용은 한 줄 수정, 미탐 비용은 PR 에서 깨진 그림). `xmlns`·DOCTYPE 의 URI 는 참조가 아니라 식별자라 보지 않는다.
// HTML 에서 `<svg>` 를 떼어 낸 파일은 여기를 통과해도 문서 스타일을 잃는다 — 그것은 검사가 아니라 문서(6단계)가 막는다.
const SVG_NS = 'http://www.w3.org/2000/svg';
const LOCAL_REF_RE = /^(?:#|data:|$)/i;
// XML 선언·처리 지시·주석·DOCTYPE(내부 subset 포함)·공백 — 루트 요소 앞에 올 수 있는 것.
const PROLOG_RE = /^(?:\s+|<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE(?:[^>[]|\[[\s\S]*?\])*>)*/i;
// 속성 하나 — 따옴표 안의 `>` 를 태그 끝으로 보지 않게 값을 통째로 건너뛴다(codex 1차 P2).
const ATTR = `\\s+[^\\s=/>]+(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s"'>]+))?`;
const ALWAYS_BAD = [
  [/<((?:[\w-]+:)?script)\b/i, '스크립트 요소'],
  [/<((?:[\w-]+:)?foreignObject)\b/i, 'foreignObject(HTML 섞기)'],
  // 태그 안의 `on<이름>=` 만 — 텍스트 노드의 "online = …" 은 태그 밖이라 맞지 않는다.
  [new RegExp(`<[a-z][\\w:.-]*(?:${ATTR})*?\\s+(on[a-z]+)\\s*=`, 'i'), '이벤트 핸들러 속성(스크립트)'],
  [/(@import)\b/i, '외부 스타일'],
  // 내부 subset 의 엔티티는 `&x;` 뒤에 참조를 숨길 수 있다 — 다이어그램에 필요 없다.
  [/(<!ENTITY)\b/i, 'DTD 엔티티 선언'],
];
const REF_RULES = [
  [/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi, '외부 href'],
  [/\burl\(\s*(?:"([^"]*)"|'([^']*)'|([^)"']*))\s*\)/gi, '외부 url()'],
];
const excerpt = (text) => (text.length > 60 ? `${text.slice(0, 57)}...` : text);
// 숫자 문자 참조(`&#114;`·`&#x72;`)와 `&amp;` 를 푼다 — XML 은 속성 값에서 이것을 풀어 읽으므로 `u&#114;l(x.svg)` 가
// `url(x.svg)` 로, `&#35;g` 가 `#g` 로 해석된다(codex 1차 P2). `&lt;` 등은 풀지 않는다 — 텍스트의 `&lt;script` 는 글자다.
const decodeRefs = (text) => text
  .replace(/&#x([0-9a-f]+);/gi, (m, h) => { const c = parseInt(h, 16); return c <= 0x10ffff ? String.fromCodePoint(c) : m; })
  .replace(/&#([0-9]+);/g, (m, d) => { const c = Number(d); return c <= 0x10ffff ? String.fromCodePoint(c) : m; })
  .replace(/&amp;/g, '&');

// 태그 여닫이 짝만 본다(brief-diagram-svg-embed codex P2) — 짝이 어긋난 SVG 는 이미지로 그려지지 않는데 자립성 검사는 통과했다.
// 완전한 XML 검사가 아니다: 속성 따옴표·중복 속성·엔티티·맨 `&` 는 보지 않는다. 문자 참조를 풀기 전 원문을 읽는다(`&#60;` 는 글자).
const TAG_NAME = `[^\\s/<>!?="']+`;
const MARKUP_RE = new RegExp(`<!--[\\s\\S]*?-->|<!\\[CDATA\\[[\\s\\S]*?\\]\\]>|<\\?[\\s\\S]*?\\?>|</(${TAG_NAME})\\s*>|<(${TAG_NAME})(?:${ATTR})*\\s*(/?)>|<`, 'g');
function tagStructureViolation(body) {
  const stack = [];
  let rootClosed = false;
  let last = 0;
  const afterRoot = (at) => `루트 </svg> 뒤에 내용: ${excerpt(body.slice(at).trim().split('\n')[0])}`;
  for (const m of body.matchAll(MARKUP_RE)) {
    if (rootClosed && body.slice(last, m.index).trim()) return afterRoot(last);
    last = m.index + m[0].length;
    const [token, close, open, selfClosing] = m;
    if (close) {
      if (rootClosed) return afterRoot(m.index);
      if (stack.at(-1) !== close) return `</${close}> 가 <${stack.at(-1)}> 를 닫음`;
      stack.pop();
      rootClosed = !stack.length;
    } else if (open) {
      if (rootClosed) return afterRoot(m.index);
      if (selfClosing) rootClosed = !stack.length;
      else stack.push(open);
    } else if (token === '<') {
      return `태그로 읽히지 않는 '<': ${excerpt(body.slice(m.index).split('\n')[0])}`;
    }
  }
  if (rootClosed && body.slice(last).trim()) return afterRoot(last);
  return stack.length ? `<${stack.at(-1)}> 가 닫히지 않음` : null;
}

// 위반 설명 목록(없으면 빈 배열). 파서가 아니라 문자열 검사다 — 결정론이고 의존성이 없다.
export function svgSelfContainmentViolations(text) {
  const violations = [];
  const body = text.replace(/^﻿/, '').replace(PROLOG_RE, '');
  const root = body.match(/^<svg(?=[\s/>])[^>]*>/);
  if (!root) {
    violations.push(`루트 요소가 <svg> 가 아님: ${excerpt(body.split('\n')[0].trim()) || '(빈 파일)'}`);
  } else {
    if (!new RegExp(`\\sxmlns\\s*=\\s*(["'])${escapeRe(SVG_NS)}\\1`).test(root[0])) {
      violations.push(`루트 <svg> 에 xmlns="${SVG_NS}" 없음`);
    }
    // 잘린 파일(상류 출력이 중간에 끊김)은 이미지로 그려지지 않는다 — 끝이 루트를 닫는지만 본다(codex 1차 P1).
    const tail = body.replace(/(?:\s+|<!--[\s\S]*?-->)*$/, '');
    if (!(root[0].endsWith('/>') && tail === root[0]) && !tail.endsWith('</svg>')) {
      violations.push('루트 <svg> 가 닫히지 않음 — 파일이 잘렸는지 확인');
    } else {
      // 잘린 파일은 위에서 한 번만 알린다 — 같은 원인을 두 번 세지 않는다.
      const structure = tagStructureViolation(body);
      if (structure) violations.push(`태그 구조: ${structure}`);
    }
  }
  const decoded = decodeRefs(text);
  for (const [re, label] of ALWAYS_BAD) {
    const m = decoded.match(re);
    if (m) violations.push(`${label}: ${m[1]}`);
  }
  for (const [re, label] of REF_RULES) {
    for (const m of decoded.matchAll(re)) {
      const value = (m[1] ?? m[2] ?? m[3]).trim();
      if (!LOCAL_REF_RE.test(value)) violations.push(`${label}: ${excerpt(value)}`);
    }
  }
  return [...new Set(violations)];
}

// `insertBeforeHeading` 은 블록 앞에 빈 줄 하나를 둔다(리뷰 블록의 형식). 다이어그램 줄이 바로 앞 다이어그램
// 줄 뒤에 오면 그 빈 줄을 걷어 한 목록으로 붙인다 — 기록이 쌓일수록 느슨한 목록이 되지 않게.
export function tightenRecordList(text, line) {
  return text.replace(new RegExp(`(^- 다이어그램: [^\\n]*)\\n\\n(?=${escapeRe(line)}$)`, 'm'), '$1\n');
}

function usage(json, message) {
  process.exitCode = 2;
  if (json) {
    emitObservation(buildEnvelope({
      command: 'diagram',
      status: 'error',
      summary: `diagram 실패: ${message}`,
      error: buildErrorPacket({
        cause: message,
        retry: USAGE,
        safeDefault: 'artifact·plan 어느 파일도 바뀌지 않았다',
        stop: '인자를 고치기 전에는 다시 실행하지 말 것',
      }),
    }));
    return;
  }
  console.error(`diagram: ${message}`);
  console.error(USAGE);
}

function emitError(json, summary, packet) {
  process.exitCode = 1;
  if (json) {
    emitObservation(buildEnvelope({ command: 'diagram', status: 'error', summary, error: packet }));
    return;
  }
  console.log(`✗ diagram: ${summary}`);
  for (const line of renderErrorPacket(packet)) console.log(line);
}

export async function runDiagram(ctx) {
  const json = !!(ctx.flags && ctx.flags.json);
  const args = ctx.taskArgs || [];
  const action = args[0];
  if (!ACTIONS.includes(action)) {
    usage(json, action ? `알 수 없는 액션 "${action}" (허용: ${ACTIONS.join('|')})` : '액션이 없음');
    return;
  }
  return runRecord(ctx, json, args.slice(1));
}

async function runRecord(ctx, json, noteTokens) {
  const skipped = !!(ctx.flags && ctx.flags.skipped);
  const view = (ctx.flags && ctx.flags.view) || null;
  // CLI 는 FLAG_CHOICES 가 먼저 거른다. 직접 호출도 경로 조립에 모르는 값을 넣지 못하게 여기서 한 번 더 막는다.
  if (view !== null && !DIAGRAM_VIEWS.includes(view)) {
    usage(json, `알 수 없는 --view "${view}" (허용: ${DIAGRAM_VIEWS.join('|')})`);
    return;
  }
  // 한 줄로 접는다 — 개행이 든 사유는 artifact·plan 에 새 줄(체크박스 포함)을 주입한다(codex 리뷰 P2 1회차).
  const note = noteTokens.join(' ').replace(/\s+/g, ' ').trim();
  if (skipped && !note) {
    usage(json, '--skipped 에는 사유가 필요함 — "미실행" 만으로는 "묻지 않은 것" 과 구분되지 않는다');
    return;
  }

  const active = await readActive(ctx.targetDir);
  if (!active || !active.task) {
    emitError(json, '활성 task 없음', buildErrorPacket({
      cause: '.harness/active.json 에 활성 task가 없어 기록할 artifact·plan 을 찾을 수 없음',
      retry: '`harness-team task <name>` 로 task를 활성화한 뒤 다시 실행',
      safeDefault: 'artifact·plan 어느 파일도 바뀌지 않았다',
      stop: 'task가 하나도 없으면 먼저 task를 생성하라',
    }));
    return;
  }

  const { user, task } = active;
  const kind = diagramKind(view);
  const diagramRel = taskFileRel(user, task, kind);
  const artifactRel = taskFileRel(user, task, 'artifact.md');
  const planRel = taskFileRel(user, task, 'plan.md');
  const outcome = skipped ? 'skipped' : 'produced';
  // 재실행 안내는 이번 호출의 플래그를 그대로 담는다 — 빠지면 레거시 단계를 닫거나 생략을 생성으로 바꾼다(codex P2).
  // 사유는 `--` 뒤에 둔다 — `--help` 같은 사유가 플래그로 파싱되지 않게(codex 3차 P2).
  const rerun = `harness-team diagram record${view ? ` --view ${view}` : ''}${skipped ? ` --skipped -- ${posixSingleQuote(note)}` : ''}`;
  const viewHint = `뷰 단계(\`spec/plan 다이어그램(<view>)\`)라면 \`--view ${DIAGRAM_VIEWS.join('|')}\` 로 다시 실행`;

  const diagramPath = taskFilePath(ctx.targetDir, user, task, kind);
  // 없는 산출물을 "생성" 으로 남기는 것이 산문이 막으려던 거짓 기록이다.
  if (outcome === 'produced' && !(await exists(diagramPath))) {
    emitError(json, `${diagramRel} 이 없어 생성으로 기록할 수 없음`, buildErrorPacket({
      cause: `${diagramRel} 이 없음`,
      retry: '다이어그램을 그 경로에 만든 뒤 다시 실행',
      alternatives: [
        `만들지 못했으면 \`harness-team diagram record${view ? ` --view ${view}` : ''} --skipped "<사유>"\` 로 미실행을 기록`,
        ...(view ? [] : [viewHint]),
      ],
      safeDefault: 'artifact·plan 어느 파일도 바뀌지 않았다',
      stop: '산출물 없이 생성을 기록하지 말 것',
    }));
    return;
  }

  // 뷰 산출물은 단독 SVG 다(결정 A2-1). 자립하지 않는 SVG 를 "생성" 으로 남기면 PR 에서 조용히 깨진 그림이 기록된다.
  // 첫 기록·갱신 모두 본다. 레거시 HTML 은 검사하지 않는다(호환).
  if (outcome === 'produced' && view) {
    const violations = svgSelfContainmentViolations(await readFile(diagramPath, 'utf8'));
    if (violations.length) {
      emitError(json, `${diagramRel} 이 자립형 SVG 가 아니라 생성으로 기록할 수 없음`, buildErrorPacket({
        cause: violations,
        retry: '위반을 고친 단독 SVG 를 그 경로에 다시 쓴 뒤 다시 실행 — 스타일은 <svg> 안 <style>, system font stack, 참조는 #id·data: 만',
        alternatives: [`단독 SVG 를 만들지 못했으면 \`harness-team diagram record --view ${view} --skipped "<사유>"\` 로 미실행을 기록`],
        safeDefault: 'artifact·plan 어느 파일도 바뀌지 않았다',
        stop: 'HTML 에서 <svg> 만 떼어 내 통과시키지 말 것 — 문서 스타일을 잃는다',
      }));
      return;
    }
  }

  const planPath = taskFilePath(ctx.targetDir, user, task, 'plan.md');
  const artifactPath = taskFilePath(ctx.targetDir, user, task, 'artifact.md');
  const planText = (await exists(planPath)) ? await readFile(planPath, 'utf8') : '';
  const closed = closeDiagramStep(planText, { outcome, note, view });
  if (closed.status === 'missing') {
    const label = diagramStepLabel(view);
    emitError(json, `${planRel} 에 ${view ? `${view} 뷰 ` : ''}다이어그램 단계가 없음 — 옵트인 흔적 없이는 기록하지 않는다`, buildErrorPacket({
      cause: `${planRel} 의 \`## 단계\` 에 \`${label}\` 체크박스가 없음`,
      retry: `\`commands/harness-task.md\` 2번의 형식으로 plan 에 \`- [ ] ${label} 작성 → ${diagramRel}\` 단계를 먼저 추가한 뒤 다시 실행`,
      alternatives: [
        view
          ? '다른 뷰나 레거시 단계라면 그 단계에 맞는 `--view`(레거시는 생략)로 다시 실행'
          : viewHint,
        '옵트인하지 않은 task 면 기록할 것이 없다 — 아무것도 하지 않는다(task.md 3번)',
      ],
      safeDefault: 'artifact·plan 어느 파일도 바뀌지 않았다',
      stop: '기록 명령이 옵트인을 만들지 말 것',
    }));
    return;
  }

  // artifact 가 없으면 retro 와 같이 템플릿에서 시작한다 — 빈 문자열에 넣으면 절 없는 목록 파일이 생긴다.
  const artifactText = (await exists(artifactPath)) ? await readFile(artifactPath, 'utf8') : taskArtifactTemplate(task);
  // 생성/갱신은 파일 상태가 아니라 **기록** 으로 판정한다 — git 추적 여부는 세션마다 다르다.
  const recordedBefore = artifactText.split('\n').some(line => line.startsWith(`- 다이어그램: ${diagramRel} `));
  const line = diagramRecordLine({
    outcome, diagram: diagramRel, note, date: today(), verb: recordedBefore ? '갱신' : '생성', view,
  });

  // 순서: artifact 먼저, plan 나중. 둘 사이에서 실패하면 "artifact 에 줄은 있고 plan 은 열림" 이 남는데,
  // 이쪽이 안전하다 — done 가드가 막아 눈에 띄고 재실행으로 닫힌다. 반대(plan 먼저)는 가드가 통과한 채
  // 기록만 빠지는 조용한 상태다. 그래도 반쪽 상태는 알려야 하므로 plan 쓰기 실패는 패킷으로 낸다(codex P2 2회차).
  await writeText(artifactPath, tightenRecordList(insertBeforeHeading(artifactText, `\n${line}\n`, /^## Reviews\b/), line));
  if (closed.status === 'closed') {
    try {
      await writeText(planPath, closed.plan);
    } catch (err) {
      emitError(json, `${planRel} 쓰기 실패 — artifact 에는 기록됐고 plan 단계는 열린 채다`, buildErrorPacket({
        cause: err.message,
        retry: `${planRel} 의 다이어그램 단계를 손으로 닫는다 — \`- [x] …\` (task.md 4번 형식)`,
        alternatives: [`원인을 고친 뒤 \`${rerun}\` 를 다시 실행하면 artifact 에 줄이 하나 더 남고 plan 이 닫힌다`],
        safeDefault: `${artifactRel} 에는 이번 줄이 남아 있다: ${line}`,
        stop: 'plan 이 열린 채로는 `harness-team done` 이 막는다 — 그것이 의도다',
      }));
      return;
    }
  }

  const artifacts = closed.status === 'closed' ? [artifactRel, planRel] : [artifactRel];
  if (json) {
    emitObservation(buildEnvelope({
      command: 'diagram',
      status: 'success',
      summary: `${artifactRel} 에 기록: ${line}`,
      artifacts,
      extra: { action: 'record', outcome, view, diagram: outcome === 'produced' ? diagramRel : null, line, plan: closed.status },
    }));
    return;
  }
  console.log(`✓ diagram record: ${artifactRel} 에 한 줄 추가`);
  console.log(`  ${line}`);
  console.log(`plan: ${closed.status}${closed.status === 'closed' ? ` → ${planRel}` : ' (다이어그램 단계가 이미 닫혀 있어 plan 은 그대로)'}`);
}

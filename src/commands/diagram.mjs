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
import { insertBeforeHeading } from './review.mjs';
import { taskFileRel, taskFilePath } from '../task-paths.mjs';
import { buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../observation.mjs';

const ACTIONS = ['record'];
const USAGE = 'usage: harness-team diagram record [--skipped] [사유·메모 ...]   (--skipped 면 사유 필수)';

// 줄머리 체크박스 + "다이어그램" — `planHasOpenBoxes` 와 같은 이유로 줄머리만 본다(인라인 산문은 단계가 아니다).
// 그리고 **`## 단계` 절 안만** 본다 — `## 참고` 의 `- [ ] 다이어그램 예시…` 를 옵트인 단계로 닫으면
// "단계가 없으면 거부" 계약이 깨진다(codex 리뷰 P1 1회차). 옵트인 계약(task.md 2번)이 단계를 넣는 곳도 거기다.
// 문구도 정식 옵트인 문구(`spec/plan 다이어그램` — task.md 2번이 넣고 4번이 닫는 형식)로 좁힌다.
// "아키텍처 다이어그램 추가" 같은 일반 단계를 옵트인으로 닫으면 옵트아웃 상태를 훼손한다(codex 리뷰 P1 2회차).
const OPEN_STEP_RE = /^(\s*)- \[ \] (spec\/plan 다이어그램.*)$/m;
const CLOSED_STEP_RE = /^\s*- \[x\] spec\/plan 다이어그램/m;
const STEPS_HEADING_RE = /^## 단계\s*$/m;

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

// 세 문서가 각자 들고 있던 형식의 유일한 출처.
export function diagramRecordLine({ outcome, diagram, note = '', date, verb = '생성' }) {
  if (outcome === 'skipped') return `- 다이어그램: 미실행 — ${note} (${date})`;
  return note ? `- 다이어그램: ${diagram} ${verb} — ${note} (${date})` : `- 다이어그램: ${diagram} ${verb} (${date})`;
}

// plan 의 다이어그램 단계를 닫는다. 열린 단계가 없으면 plan 을 바꾸지 않고 상태만 돌려준다:
// `already-closed`(닫힌 단계만 있음 — 재기록) · `missing`(옵트인 흔적이 없음 — 호출자가 거부).
export function closeDiagramStep(plan, { outcome, note = '' }) {
  const section = stepsSection(plan);
  if (!section) return { plan, status: 'missing' };
  const body = plan.slice(section.start, section.end);
  const open = body.match(OPEN_STEP_RE);
  if (!open) return { plan, status: CLOSED_STEP_RE.test(body) ? 'already-closed' : 'missing' };
  const indent = open[1];
  // 만들었으면 체크만 켠다(경로가 남는다). 건너뛰었으면 task.md 4번의 형식으로 — 지우지 않고 사유를 붙여 닫는다.
  const closed = outcome === 'skipped'
    ? `${indent}- [x] spec/plan 다이어그램 — 미실행(${note})`
    : `${indent}- [x] ${open[2]}`;
  const at = section.start + open.index;
  return { plan: plan.slice(0, at) + closed + plan.slice(at + open[0].length), status: 'closed' };
}

// `insertBeforeHeading` 은 블록 앞에 빈 줄 하나를 둔다(리뷰 블록의 형식). 다이어그램 줄이 바로 앞 다이어그램
// 줄 뒤에 오면 그 빈 줄을 걷어 한 목록으로 붙인다 — 기록이 쌓일수록 느슨한 목록이 되지 않게.
export function tightenRecordList(text, line) {
  const escaped = line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(^- 다이어그램: [^\\n]*)\\n\\n(?=${escaped}$)`, 'm'), '$1\n');
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
  const diagramRel = taskFileRel(user, task, 'diagram.html');
  const artifactRel = taskFileRel(user, task, 'artifact.md');
  const planRel = taskFileRel(user, task, 'plan.md');
  const outcome = skipped ? 'skipped' : 'produced';

  // 없는 산출물을 "생성" 으로 남기는 것이 산문이 막으려던 거짓 기록이다.
  if (outcome === 'produced' && !(await exists(taskFilePath(ctx.targetDir, user, task, 'diagram.html')))) {
    emitError(json, `${diagramRel} 이 없어 생성으로 기록할 수 없음`, buildErrorPacket({
      cause: `${diagramRel} 이 없음`,
      retry: '다이어그램을 그 경로에 만든 뒤 다시 실행',
      alternatives: ['만들지 못했으면 `harness-team diagram record --skipped "<사유>"` 로 미실행을 기록'],
      safeDefault: 'artifact·plan 어느 파일도 바뀌지 않았다',
      stop: '산출물 없이 생성을 기록하지 말 것',
    }));
    return;
  }

  const planPath = taskFilePath(ctx.targetDir, user, task, 'plan.md');
  const artifactPath = taskFilePath(ctx.targetDir, user, task, 'artifact.md');
  const planText = (await exists(planPath)) ? await readFile(planPath, 'utf8') : '';
  const closed = closeDiagramStep(planText, { outcome, note });
  if (closed.status === 'missing') {
    emitError(json, `${planRel} 에 다이어그램 단계가 없음 — 옵트인 흔적 없이는 기록하지 않는다`, buildErrorPacket({
      cause: `${planRel} 의 \`## 단계\` 에 다이어그램 체크박스가 없음`,
      retry: '`commands/harness-task.md` 2번의 형식으로 plan 에 `- [ ] spec/plan 다이어그램 작성 → …` 단계를 먼저 추가한 뒤 다시 실행',
      alternatives: ['옵트인하지 않은 task 면 기록할 것이 없다 — 아무것도 하지 않는다(task.md 3번)'],
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
    outcome, diagram: diagramRel, note, date: today(), verb: recordedBefore ? '갱신' : '생성',
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
        alternatives: ['원인을 고친 뒤 `harness-team diagram record` 를 다시 실행하면 artifact 에 갱신 줄이 하나 더 남고 plan 이 닫힌다'],
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
      extra: { action: 'record', outcome, diagram: outcome === 'produced' ? diagramRel : null, line, plan: closed.status },
    }));
    return;
  }
  console.log(`✓ diagram record: ${artifactRel} 에 한 줄 추가`);
  console.log(`  ${line}`);
  console.log(`plan: ${closed.status}${closed.status === 'closed' ? ` → ${planRel}` : ' (다이어그램 단계가 이미 닫혀 있어 plan 은 그대로)'}`);
}

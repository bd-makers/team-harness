// `harness-team stack` — read-only. 프로젝트의 stack profile(detect-stack)과 testing
// profile(detect-testing)을 한 번에 돌려준다.
//
// 이 커맨드는 commands/harness-{unittest,comptest,inttest}.md의 0단계에서 **판단이 없는 부분**만
// 넘겨받았다. 설치하지 않고, 러너를 추천하지 않고, 묻지 않는다 — 러너 부재 분기는 AskUserQuestion과
// 웹 검색이 필요해 CLI가 볼 수 없는 입력에 의존하고, 그래서 산문(커맨드 문서)에 남아 있다.
// 여기서 할 수 있는 최선은 "러너가 없다"는 관측을 warning으로 올려 그 분기를 에이전트에게 넘기는 것이다.
import { resolveStack, KNOWN_STACK_IDS } from '../detect-stack.mjs';
import { detectTesting } from '../detect-testing.mjs';
import { buildEnvelope, emitObservation } from '../observation.mjs';

const NO_RUNNER_SUMMARY = '테스트 러너를 찾지 못했습니다 — 러너 부재 분기(문서 0단계)를 수행하세요';
// 깨진 매니페스트를 "러너 없음"과 같은 문장으로 보고하면 envelope가 자기모순이 된다:
// summary는 러너를 설치하라 하고 next_actions는 매니페스트를 고치라고 한다(codex P2).
const UNREADABLE_SUMMARY = 'package.json을 파싱할 수 없어 testing profile을 읽지 못했습니다';

// 문서들의 "스택 요약 5줄 이내"는 지켜야 하는 계약이지 바람이 아니다. 모든 축이 감지되면 축이
// 13개까지 늘어나므로 text 모드에서 축마다 한 줄을 찍으면 계약이 깨진다(codex P2).
export const SUMMARY_MAX_LINES = 5;

// 축들을 maxLines 줄에 고르게 나눠 담는다. JSON 모드는 한 줄로 join 하므로 이 포장은 text 전용이다.
export function packSummary(parts, maxLines = SUMMARY_MAX_LINES) {
  const perLine = Math.ceil(parts.length / maxLines);
  const lines = [];
  for (let i = 0; i < parts.length; i += perLine) lines.push(parts.slice(i, i + perLine).join(' · '));
  return lines;
}

// testing profile은 JS 매니페스트에서만 의미가 있다. package.json이 없는 저장소(python·go)에
// "러너가 없다"고 경고하면 Python 저장소에 JS 러너 설치를 권하게 된다(실측: job-scraper).
// 그런 저장소에서 러너 부재는 결함이 아니라 해당 없음이므로 warning으로 올리지 않는다.
const isJsProject = (testing) => testing.manifest !== null;

// 문서들이 요구하던 "스택 요약 5줄 이내"를 코드가 만든다. 빈 축은 줄 자체를 내지 않는다 —
// `프로바이더: 없음` 같은 줄은 5줄 예산만 먹고 알려주는 게 없다.
export function renderSummary(stack, testing) {
  const runnerLine = testing.manifest === 'unreadable'
    ? '러너: 불명 (package.json 파싱 실패)'
    : isJsProject(testing)
      ? `러너: ${testing.runner ?? '없음'}${testing.runnerSource === 'script' ? ' (test 스크립트)' : ''}`
      : '러너: 해당 없음 (JS 매니페스트 없음)';
  const parts = [
    runnerLine,
    `프레임워크: ${stack.stackLabel}`,
    `${stack.language} · ${stack.packageManager}`,
  ];
  if (testing.testingLibrary.length) parts.push(`TL: ${testing.testingLibrary.join('+')}`);
  if (testing.domEnv) parts.push(`DOM: ${testing.domEnv}`);
  if (testing.rnPreset) parts.push(`preset: ${testing.rnPreset}`);
  if (testing.storybook) parts.push('storybook: 있음');
  if (testing.providers.length) parts.push(`프로바이더: ${testing.providers.join('+')}`);
  if (testing.server) parts.push(`서버: ${testing.server}(${testing.inProcessCall})`);
  if (testing.orm.length || testing.dbDriver.length) {
    parts.push(`DB: ${[...testing.orm, ...testing.dbDriver].join('+')}`);
  }
  if (testing.outboundMock.length) parts.push(`아웃바운드: ${testing.outboundMock.join('+')}`);
  if (testing.infraMarkers.length) parts.push(`인프라 흔적: ${testing.infraMarkers.join('+')}`);
  if (testing.coverage.provider || testing.coverage.script) {
    parts.push(`커버리지: ${[testing.coverage.provider, testing.coverage.script].filter(Boolean).join(' / ')}`);
  }
  return parts;
}

// 산문이 지시하던 나머지 절차. CLI가 못 하는 일을 호출자에게 그대로 넘긴다.
function nextActions(testing) {
  if (!isJsProject(testing)) {
    return ['package.json이 없어 testing profile은 비어 있습니다 — 이 스택의 테스트 관례는 저장소에서 직접 확인하세요'];
  }
  const actions = [
    '기존 테스트 2~3개를 열어 팀 컨벤션(파일 위치·네이밍·목킹 패턴)을 추출하세요 — 컨벤션이 계약과 충돌하면 컨벤션을 따릅니다',
  ];
  if (testing.manifest === 'unreadable') actions.unshift('package.json을 파싱할 수 없습니다 — 매니페스트를 먼저 고치세요');
  else if (!testing.runner) actions.unshift('러너 부재 분기: 권장 조합을 확인한 뒤 AskUserQuestion으로 1회 승인받아 설치하세요');
  if (testing.orm.length || testing.dbDriver.length) {
    actions.push('통합 테스트라면 `docker info`로 testcontainers 가용성을 직접 확인하세요');
  }
  return actions;
}

export async function runStack(ctx) {
  const json = !!(ctx.flags && ctx.flags.json);
  const forced = ctx.flags.stack;
  // `init` 과 같은 가드. 오타가 그대로 통과하면 실제 Node 프로젝트를 `generic`/`success` 로
  // 보고해, 감지 실패를 감지 결과처럼 보이게 한다(codex P2).
  if (forced && !KNOWN_STACK_IDS.includes(forced)) {
    console.error(`stack: unknown --stack "${forced}" (expected one of ${KNOWN_STACK_IDS.join('|')})`);
    process.exitCode = 2;
    return;
  }
  const stack = await resolveStack(ctx.targetDir, forced);
  const testing = await detectTesting(ctx.targetDir);
  const summary = renderSummary(stack, testing);
  const unreadable = testing.manifest === 'unreadable';
  const runnerMissing = isJsProject(testing) && !unreadable && !testing.runner;
  const status = runnerMissing || unreadable ? 'warning' : 'success';

  if (json) {
    emitObservation(buildEnvelope({
      command: 'stack',
      status,
      summary: unreadable ? UNREADABLE_SUMMARY : runnerMissing ? NO_RUNNER_SUMMARY : summary.join(' · '),
      nextActions: nextActions(testing),
      extra: { stack, testing },
    }));
    return;
  }

  console.log(`harness-team stack → ${ctx.targetDir}\n`);
  for (const line of packSummary(summary)) console.log(`  ${line}`);
  console.log('');
  for (const action of nextActions(testing)) console.log(`next: ${action}`);
}

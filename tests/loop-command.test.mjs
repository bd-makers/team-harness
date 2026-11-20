// Guards the /harness-loop contract. The loop is a prompt, not a runtime, so the
// properties that keep it safe live only in the shipped command text: the four
// stop conditions (with no numeric retry cap — docs/harness-cycle.md §4-3), the
// QA split (machine checks by the orchestrator, rubric by a read-only process —
// a read-only verifier cannot run tests), and the write/approval boundaries (D4,
// no push or PR). Sections are compared whole rather than by loose `includes`,
// because a partial match misses a deleted sentence (r2-scenario-evidence
// Learnings).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(join(ROOT, path), 'utf8');

function section(doc, heading) {
  const start = doc.indexOf(`\n## ${heading}\n`);
  assert.ok(start >= 0, `## ${heading} 절이 있어야`);
  const rest = doc.slice(start + heading.length + 5);
  const end = rest.search(/\n## /);
  return end < 0 ? rest : rest.slice(0, end);
}

// Collapses whitespace so a sentence wrapped across lines compares as one line.
const squash = (text) => text.replace(/\s+/g, ' ').trim();

// The whole `- **<head>**` bullet: from its marker to the next top-level bullet
// or the end of the section, whitespace-collapsed.
function bullet(text, head) {
  const start = text.indexOf(`\n- **${head}**`);
  assert.ok(start >= 0, `- **${head}** bullet이 있어야`);
  const rest = text.slice(start + 1);
  const end = rest.search(/\n- /);
  return squash(end < 0 ? rest : rest.slice(0, end));
}

// A whole numbered item (`<n>. ...`) or paragraph that starts a line with `head`:
// up to the next numbered item or blank line, whitespace-collapsed. Compared with
// assert.equal so a flipped meaning inside the passage fails, not just a deletion.
function block(text, head) {
  const start = text.indexOf(`\n${head}`);
  assert.ok(start >= 0, `${head} 로 시작하는 줄이 있어야`);
  const rest = text.slice(start + 1);
  const end = rest.search(/\n(?:\n|\d+\. )/);
  return squash(end < 0 ? rest : rest.slice(0, end));
}

function inOrder(text, needles) {
  let at = -1;
  for (const needle of needles) {
    const next = text.indexOf(needle, at + 1);
    assert.ok(next > at, `순서대로 나와야: ${needle}`);
    at = next;
  }
}

test('loop: the four stop conditions are pinned and no-progress has no numeric cap', async () => {
  const stops = section(await read('commands/harness-loop.md'), '멈춤 조건');
  const heads = [...stops.matchAll(/^- \*\*([^*]+)\*\*/gm)].map((m) => m[1]);
  assert.deepEqual(heads, ['성공', 'spec 공백', '진전 없음', '승인 필요'], '멈춤 조건은 정확히 이 넷이어야');
  assert.match(stops, /직전 Dev 턴 이후 실패 집합이 같고 diff에도 변화가 없으면 멈춘다/);
  assert.match(stops, /횟수 상한을 두지 않는다/);
  assert.doesNotMatch(stops, /\d+\s*(회|번)/, '임의 횟수 상한이 생기면 안 된다');
  assert.match(stops, /PR은 사람이 만든다/);
  assert.equal(
    bullet(stops, '성공'),
    '- **성공** — 모든 단계 통과 + 전체 시나리오 검사·루브릭(시나리오 선언 시) + R3 통과(P1 없음, 재검 뒤 남은 P2는 후속 — QA의 R3 통과 기준). PR은 사람이 만든다 — `/harness-ship`으로 넘긴다.',
    '성공은 R3 통과 기준(P1 없음)을 가리켜야',
  );
  // The `\d+(회|번)` guard above misses a cap written in words ("세 번"), so every
  // part of the section is pinned whole, as S3–S5 do.
  const intro =
    '멈추면 사람에게 무엇이 남았는지 보고한다 — 멈춘 조건, 마지막 실패 집합, 커밋된 단계, 다음 한 걸음.';
  const specGap =
    '- **spec 공백** — Dev나 QA가 spec이 답하지 않는 질문을 만났다. 질문을 사람에게 그대로 넘긴다(R1로 되돌림). spec이 고쳐지면 `/harness-loop`를 다시 불러 이어간다.';
  const noProgress =
    '- **진전 없음** — 직전 Dev 턴 이후 실패 집합이 같고 diff에도 변화가 없으면 멈춘다. 비교는 Dev 턴 전후의 `git diff HEAD` 출력, 추적되지 않은 파일(`git ls-files --others --exclude-standard`로 찾은 파일)의 내용, 실패 집합이다 — `git diff HEAD`는 새 파일을 보지 않아 새 파일만 만든 진전을 놓친다. 횟수 상한을 두지 않는다 — 상한은 진전 중인 루프를 끊고, 진전 없는 루프는 상한에 닿을 때까지 헛돈다. 실패 집합이 줄었어도 그 Dev 턴이 기존 테스트를 지우거나 비활성화(`.skip`·`xit`·`@Disabled` 등)하거나 assert를 약화해 줄였으면 진전이 아니다 — 멈추고 그 diff를 보고한다. 판정은 같은 Dev 턴의 `git diff HEAD`에서 삭제된 테스트 파일, 추가된 줄의 skip 표지, 제거된 줄의 assert로 한다.';
  const approval =
    '- **승인 필요** — push·PR·파괴적 변경·의존성 추가처럼 되돌리기 어려운 행위가 필요하거나, 다음 단계가 `[사람]` 단계다. 하지 않고 멈춘다.';
  assert.equal(block(stops, '멈추면 사람에게'), intro, '멈춤 조건 첫 문단(멈추면 보고할 것)');
  assert.equal(bullet(stops, 'spec 공백'), specGap, 'spec 공백은 질문을 사람에게 넘겨야');
  assert.equal(bullet(stops, '진전 없음'), noProgress, '진전 없음은 실패 집합·diff 무변화로 정의되고 횟수 상한이 없어야');
  assert.equal(bullet(stops, '승인 필요'), approval, '승인 필요 상황에서는 하지 않고 멈춰야');
  // Nothing else may sit in the section — a cap added as a separate paragraph
  // between the intro and the bullets would slip past the per-part checks.
  assert.equal(
    squash(stops),
    [intro, bullet(stops, '성공'), specGap, noProgress, approval].join(' '),
    '멈춤 조건 절은 첫 문단과 bullet 넷뿐이어야',
  );
});

test('loop: QA runs machine checks before the read-only rubric and records named test output', async () => {
  const qa = section(await read('commands/harness-loop.md'), 'QA');
  inOrder(qa, [
    'harness-team gate commit',
    'harness-team boundary check',
    'harness-team scenario check',
    '테스트 이름이 찍힌 줄',
    'harness-team review <engine> --framing scenario',
  ]);
  assert.match(qa, /기계 검사는 오케스트레이터가 실행한다/);
  assert.match(qa, /read-only 검증자는 테스트를 실행하지 못한다/);
  assert.match(
    squash(qa),
    /(?:^|\. )판단이 필요한 루브릭만 별도 프로세스의 read-only 검증자가 맡는다\./,
    '루브릭은 별도 프로세스의 read-only 검증자가 맡아야',
  );
  assert.match(qa, /루브릭은 모든 단계가 끝난 뒤 한 번 돌린다/);
  assert.match(qa, /이번 단계 전에 증거가 없던 시나리오는 진전 판정에서 뺀다/);
  assert.match(
    squash(qa),
    /(?:^|\. )P2는 재현·판별해 유효한 것을 반영하되 R3 재검은 한 번까지만 돌린다\./,
    'R3 재검은 한 번까지여야',
  );
  assert.equal(
    block(qa, 'QA는 두 겹이다.'),
    'QA는 두 겹이다. read-only 검증자는 테스트를 실행하지 못한다 — 테스트가 임시 파일을 쓰기 때문이다. 그래서 기계 검사는 오케스트레이터가 실행한다. exit code를 읽는 일이라 자기 채점이 아니다. 판단이 필요한 루브릭만 별도 프로세스의 read-only 검증자가 맡는다.',
    'QA 도입 문단(두 겹 분담)',
  );
  assert.equal(block(qa, '1. `harness-team gate commit`'), '1. `harness-team gate commit` — exit 0이 아니면 실패.', 'QA 1번');
  assert.equal(
    block(qa, '2. `harness-team boundary check`'),
    '2. `harness-team boundary check` — spec에 `## Boundary contracts`가 없으면 `not-configured`로 통과한다.',
    'QA 2번',
  );
  assert.equal(
    block(qa, '3. `harness-team scenario check`'),
    '3. `harness-team scenario check` — spec에 `scenarios`를 선언했을 때만. 이번 단계 전에 증거가 없던 시나리오는 진전 판정에서 뺀다 — 아직 만들지 않은 시나리오가 실패하는 것은 정상이다. 다만 Dev가 이번 단계에서 겨냥했다고 보고한 시나리오와, 전에 통과했던 시나리오(회귀)는 센다.',
    'QA 3번',
  );
  assert.equal(
    block(qa, '4. 통과한 시나리오마다'),
    '4. 통과한 시나리오마다 실행 출력에서 **테스트 이름이 찍힌 줄**을 artifact `## 결과`에 남긴다. exit 0과 요약 개수는 테스트가 실제로 돌았다는 증거가 아니다 — 이름 필터가 아무것도 고르지 못해도 exit 0이 난다. raw stderr는 옮기지 않는다. 증거가 테스트 러너가 아닌 명령(예: 출력 없는 `grep -Eq`)이면 이름 줄이 없으므로 명령 원문과 exit code를 대신 남긴다 — 테스트 러너 증거는 여전히 이름 줄이 있어야 한다.',
    'QA 4번(이름 찍힌 줄 기록 의무)',
  );
});

test('loop: entry asks orchestrator-or-individual and the loop never pushes or opens a PR', async () => {
  const doc = await read('commands/harness-loop.md');
  const entry = section(doc, '진입');
  assert.match(entry, /오케스트레이터로 진행할까, 개별로 진행할까/);
  assert.match(entry, /개별을 고르면 아무것도 하지 않고 끝난다/);
  const dev = section(doc, 'Dev');
  assert.match(dev, /Dev는 커밋하지 않는다/);
  assert.match(dev, /Dev가 도는 동안 오케스트레이터는 쓰지 않는다/);
  assert.match(doc, /push·PR을 하지 않는다/);
  assert.equal(
    bullet(section(doc, '멈춤 조건'), '승인 필요'),
    '- **승인 필요** — push·PR·파괴적 변경·의존성 추가처럼 되돌리기 어려운 행위가 필요하거나, 다음 단계가 `[사람]` 단계다. 하지 않고 멈춘다.',
    '승인 필요 상황(다음 단계가 [사람] 단계 포함)에서는 하지 않고 멈춰야',
  );
  assert.equal(
    block(entry, '2. **질문**'),
    '2. **질문** — 한 번만 묻는다: **오케스트레이터로 진행할까, 개별로 진행할까?** 개별을 고르면 아무것도 하지 않고 끝난다 — 개별 진행은 어느 게이트에도 합류할 의무가 없다.',
    '진입 2번(질문)',
  );
  assert.equal(
    block(entry, '3. **실행 수단'),
    '3. **실행 수단 probe → degrade → record** — 이 세션에 서브에이전트 도구가 있으면 Dev는 서브에이전트(`수단 subagent`), 없으면 메인 세션이 Dev를 겸한다(`수단 main`). 어느 쪽이든 artifact 기록 줄에 수단을 남긴다. Workflows는 사용자가 명시적으로 요청할 때만 쓴다. 병렬 Dev(Agent teams·cross-session)는 이 루프에서 쓰지 않는다 — 각 Dev가 격리 worktree(D5)를 가져야 하는 별도 설계다.',
    '진입 3번(실행 수단, 병렬 Dev 미사용)',
  );
  assert.equal(
    block(dev, 'Dev는 plan 단계'),
    'Dev는 plan 단계 **하나**만 구현한다. Dev가 도는 동안 오케스트레이터는 쓰지 않는다. Dev는 커밋하지 않는다 — 커밋은 QA를 통과한 뒤 오케스트레이터가 한다. Dev 지시에는 아래를 담는다(서브에이전트는 이 대화를 보지 못한다):',
    'Dev 첫 문단(단일 쓰기·커밋 금지)',
  );
  assert.equal(
    bullet(doc, '쓰기는 단일 스레드다(D4).'),
    '- **쓰기는 단일 스레드다(D4).** 한 시점에 쓰는 주체는 Dev 하나다.',
    '핵심 제약: 단일 쓰기',
  );
  assert.equal(
    bullet(doc, 'push·PR을 하지 않는다.'),
    '- **push·PR을 하지 않는다.** 루프는 로컬 커밋까지만 한다. push·PR·파괴적 변경은 사람의 몫이다(아래 멈춤 조건).',
    '핵심 제약: push·PR 금지',
  );
});

// human-review-gate(결정 A5-2): 사람 검토 게이트는 loop 에도 같다. 판정은 루프가 **다음에 다룰** 단계 기준이다 — plan 전체의
// 미완 `[사람]` 을 보면 끝의 `[사람] PR 승인` 같은 단계가 진입을 영구히 막는다. 멈춤 조건은 넷 그대로(위 테스트)다.
test('loop: a pending [사람] step stops entry and the loop, and Dev never implements it', async () => {
  const doc = await read('commands/harness-loop.md');
  const entry = section(doc, '진입');
  assert.equal(
    block(entry, '1. **전제 확인**'),
    '1. **전제 확인** — 활성 task(`.harness/active.json`), spec의 Ambiguity 게이트 통과, 단계가 하나 이상 있는 `<name>-plan.md`. 하나라도 없으면 무엇이 빠졌는지 알리고 멈춘다 — spec·plan을 만드는 일은 루프 밖이다 (`/harness-spec`·`/harness-interview`). plan의 다이어그램 단계가 미완이면 `/harness-diagram`으로 먼저 닫으라고 안내하고 멈춘다. 루프가 시작할 미완 단계가 `[사람]` 단계(검토 게이트 `[사람] spec 검토 승인` 등)면 사람에게 검토·승인을 요청하고 멈춘다 — 그 단계는 사용자가 명시적으로 승인한 뒤에만 켠다(harness-task 명령 문서 검토 게이트 절). 진입 질문(2번)은 이 승인을 대신하지 못한다.',
    '진입 1번(전제 확인 + [사람] 단계 멈춤)',
  );
  assert.equal(
    block(entry, '루프는 plan의 첫 미완 단계부터'),
    '루프는 plan의 첫 미완 단계부터 시작한다 — plan.md가 곧 상태라서, 멈췄다가 다시 부르면 그 자리에서 이어진다. 도중에 다음 미완 단계가 `[사람]` 단계면 승인 필요로 멈춘다 — `[사람]` 단계는 Dev가 구현하지 않고 오케스트레이터도 켜지 않는다. 구현 없이 검증만 하는 단계(전체 테스트 실행 등)는 Dev 턴 없이 닫는다 — 그 단계가 적은 검증 명령을 오케스트레이터가 실행해 exit 0이 나고, 그 위에 QA 1–4를 통과해야 한다. 명령이 실패하면 실패 집합에 넣는다. 리뷰·ship·PR 같은 단계에 도달하면 구현 반복을 끝내고 마무리로 간다. 미완 단계가 없거나 남은 미완 단계가 리뷰·ship·PR뿐이면(구현을 다 마친 뒤 마무리 도중 멈췄던 경우) 진입을 거부하지 않고 마무리부터 이어간다.',
    '시작 지점 문단(도중의 [사람] 단계)',
  );
  assert.match(
    section(doc, 'Dev'),
    /너는 Dev다\. 아래 plan 단계 하나만 구현한다\. 다른 단계\(`\[사람\]` 단계 포함\)·리팩터·요청 밖 변경을 하지 않는다\./,
    'Dev 지시: [사람] 단계를 구현하지 않는다',
  );
});

test('loop: README distinguishes a service orchestrator from the optional loop command', async () => {
  const readme = await read('README.md');
  assert.match(readme, /서비스형 런타임 오케스트레이터가 아닙니다/);
  assert.match(readme, /선택형 기본 루프 `\/harness-loop`/);
  assert.doesNotMatch(readme, /런타임 오케스트레이션이 아닙니다/, '선택형 루프까지 금지한 것처럼 읽히는 옛 문구가 남으면 안 된다');
  // The scope paragraph runs on past the loop sentence; pin it from the start
  // through "선택형 기본 루프 ... 제공합니다" exactly.
  const scope =
    '**설계 스코프: 설정·상태 하네스이며, 서비스형 런타임 오케스트레이터가 아닙니다.** 상주 지휘자·공유 작업큐· 팬아웃/팬인 같은 서비스형 런타임 협업 계층은 두지 않습니다 — 이는 누락이 아니라 의도된 설계입니다. Anthropic·OpenAI·Cognition·12-Factor Agents 등 최근 1차 소스는 병렬로 "쓰는" 에이전트를 상충·신뢰성 위험으로 보고, 단일 스레드 실행 + 얇고 직접 소유한 제어흐름을 권장합니다. 이 플러그인의 드라이버(Claude) → 리뷰어(Codex, read-only) 순차 루프는 그 방향과 정합적입니다. 대신 메인 세션이 오케스트레이터가 되어 plan 단계마다 Dev → QA → 커밋을 순차로 돌리는 선택형 기본 루프 `/harness-loop`를 제공합니다 — 별도 런타임 없이 기존 CLI를 엮는 명령 문서이며, 쓰지 않아도 사이클은 성립합니다.';
  assert.equal(block(readme, '**설계 스코프:').slice(0, scope.length), scope, 'README 설계 스코프: 서비스형 비채택 → 선택형 루프 제공');
});

// The dogfood scenario (spec S6) greps the artifact for this line, so the
// template the command tells the orchestrator to write must stay in that shape.
test('loop: the record line template matches the dogfood grep', async () => {
  const doc = await read('commands/harness-loop.md');
  assert.ok(
    doc.includes('`- loop: <YYYY-MM-DD> · 수단 <subagent|main> · 단계 <plan 단계 요약> · QA pass · commit <sha7>`'),
    '루프 기록 줄 템플릿',
  );
  const sample = '- loop: 2026-10-06 · 수단 subagent · 단계 README 정정 · QA pass · commit 1a2b3c4';
  assert.match(sample, /^- loop: [0-9]{4}-[0-9]{2}-[0-9]{2} · 수단 (subagent|main) · 단계 .+ · QA pass · commit [0-9a-f]{7}/);
});

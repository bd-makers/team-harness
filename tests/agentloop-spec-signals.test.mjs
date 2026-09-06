import { test } from 'node:test';
import assert from 'node:assert/strict';
// rule 층(순수 채점)을 직접 import한다 — agentloop.mjs를 거치면 하네스 I/O 모듈까지 로드된다.
import { scoreSpecArtifacts, forceAllChecked, aggregateTrials, renderSignals } from './sim/rules.mjs';

// SC7의 채점 로직만 떼어낸 단위 테스트. sim 실행 자체는 OAuth 토큰이 필요하지만, 신호가
// 무엇을 증거로 삼는지는 토큰 없이 CI에서 고정된다.
// (선례: tests/codex-agentloop-parser.test.mjs → codex-agentloop.mjs parseCodexJsonl)

const byLabel = (signals, needle) => signals.find((s) => s.label.includes(needle));

const SPEC_FULL = `# t — Spec

## 목적 / 요구사항
- 결제 실패 시 최대 3회 재시도 (confluence)
- 재시도 성공률 30% 이상 (interview)

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 근거 있음
- [x] **Constraint 명확도** (30%) — 근거 있음
- [x] **Success 기준** (30%) — 근거 있음
- [x] **Context 명확도** (brownfield 한정) — 근거 있음
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0

## 참고
-
`;

const EXPECTED_CONFLUENCE = { baseUrl: 'https://x/wiki', spaceKey: 'SIM' };
const EXPECTED_USER = 'simbot';

const CONFIG_FULL = JSON.stringify({
  user: EXPECTED_USER,
  specSources: { confluence: { ...EXPECTED_CONFLUENCE } },
});

// apply 직후 상태 — 커맨드 실행 전 config 원문. 이것과 실행 후 원문이 같으면 "쓰기 미발생"이다.
const CONFIG_BEFORE = JSON.stringify({ user: EXPECTED_USER });

// 모든 테스트가 같은 기대값으로 채점하도록 감싼다. configBefore 기본값은 CONFIG_BEFORE이라
// configRaw가 그와 다르면 쓰기가 일어난 것으로 판정된다 — 보존 신호를 보려면 쓰기가 먼저 있어야 한다.
const score = (over = {}) => scoreSpecArtifacts({
  expectedUser: EXPECTED_USER, expectedConfluence: EXPECTED_CONFLUENCE, configBefore: CONFIG_BEFORE, ...over,
});

const RESULT_HANDOFF = '초안을 저장했습니다. 이제 /harness-interview로 인계합니다.';

test('완전 증거 — 5개 신호 모두 PASS, 자가진단 체크 상태가 note에 남는다', () => {
  const signals = score({
    specBody: SPEC_FULL, configRaw: CONFIG_FULL, resultText: RESULT_HANDOFF,
  });

  assert.equal(signals.length, 5);
  assert.deepEqual(signals.map((s) => s.status), ['PASS', 'PASS', 'PASS', 'PASS', 'PASS']);
  // P1 회귀 감시의 핵심: 전 항목 체크 상태였다는 사실이 리포트에 남아야 한다.
  assert.match(byLabel(signals, '인계').note, /자가진단 5\/5 체크/);
});

test('출처 태그 누락 → (interview) 신호만 FAIL', () => {
  const signals = score({
    specBody: SPEC_FULL.replace('(interview)', ''), configRaw: CONFIG_FULL, resultText: RESULT_HANDOFF,
  });

  assert.equal(byLabel(signals, '(interview) 출처 태그').status, 'FAIL');
  assert.equal(byLabel(signals, 'Ambiguity 자가진단 절').status, 'PASS');
});

test('(interview)가 요구사항 항목 밖에만 있으면 FAIL — 문서 어딘가로는 부족하다', () => {
  const signals = score({
    specBody: `${SPEC_FULL.replace('(interview)', '')}\n어딘가의 산문에 (interview)라고만 적혀 있다.\n`,
    configRaw: CONFIG_FULL,
    resultText: RESULT_HANDOFF,
  });

  assert.equal(byLabel(signals, '(interview) 출처 태그').status, 'FAIL');
});

test('자가진단 heading만 있고 체크박스가 없으면 FAIL', () => {
  const signals = score({
    specBody: '# t — Spec\n\n## 목적 / 요구사항\n- 뭔가 (interview)\n\n## Ambiguity 자가진단\n설명만 있다.\n',
    configRaw: CONFIG_FULL,
    resultText: RESULT_HANDOFF,
  });

  assert.equal(byLabel(signals, '(interview) 출처 태그').status, 'PASS');
  assert.equal(byLabel(signals, 'Ambiguity 자가진단 절').status, 'FAIL');
});

test('자가진단 절 누락 → 해당 신호 FAIL, 체크 카운트는 0/0', () => {
  const signals = score({
    specBody: '# t — Spec\n\n## 목적 / 요구사항\n- 뭔가 (interview)\n',
    configRaw: CONFIG_FULL,
    resultText: RESULT_HANDOFF,
  });

  assert.equal(byLabel(signals, 'Ambiguity 자가진단 절').status, 'FAIL');
  assert.match(byLabel(signals, '인계').note, /자가진단 0\/0 체크/);
});

test('미체크가 섞이면 체크 카운트가 그대로 보고된다', () => {
  const signals = score({
    specBody: SPEC_FULL.replace('- [x] **Success 기준**', '- [ ] **Success 기준**'),
    configRaw: CONFIG_FULL,
    resultText: RESULT_HANDOFF,
  });

  assert.match(byLabel(signals, '인계').note, /자가진단 4\/5 체크/);
});

test('인계 문구 없음 → 산문 예외 신호 FAIL (writer 자기 채점 회귀)', () => {
  const signals = score({
    specBody: SPEC_FULL, configRaw: CONFIG_FULL,
    resultText: '초안을 저장했습니다. 자가진단 전 항목을 체크했으니 게이트를 통과합니다.',
  });

  assert.equal(byLabel(signals, '인계').status, 'FAIL');
});

test('인계 신호는 spec 본문이 아니라 최종 메시지만 본다 (오염 방지)', () => {
  // 커맨드 본문·spec에 /harness-interview가 있어도 에이전트가 인계하지 않았으면 FAIL이어야 한다.
  const signals = score({
    specBody: `${SPEC_FULL}\n다음 단계: /harness-interview\n`,
    configRaw: CONFIG_FULL,
    resultText: '초안 저장 완료.',
  });

  assert.equal(byLabel(signals, '인계').status, 'FAIL');
});

test('쓰기 미발생(파일 그대로) → 저장은 FAIL, 보존은 PASS가 아니라 N/A', () => {
  // 커맨드가 config를 아예 건드리지 않은 경우. expectedUser를 실행 직전 파일에서 읽으므로
  // 값 비교는 자동으로 참이 된다 — 여기서 PASS를 내면 "보존했다"를 위조하는 것이다.
  const signals = score({
    specBody: SPEC_FULL, configRaw: CONFIG_BEFORE, resultText: RESULT_HANDOFF,
  });

  assert.equal(byLabel(signals, 'specSources 저장값 일치').status, 'FAIL');
  const preserved = byLabel(signals, 'user 값 보존');
  assert.equal(preserved.status, 'N/A');
  assert.match(preserved.note, /쓰기 미발생/);
});

test('쓰기는 있었으나 specSources 값이 틀린 경우 → 보존은 여전히 판정된다', () => {
  // 쓰기가 일어났으면 user가 날아갔을 수 있으므로 N/A로 도망가지 않고 실제로 판정해야 한다.
  const signals = score({
    specBody: SPEC_FULL,
    configRaw: JSON.stringify({ user: EXPECTED_USER, specSources: { confluence: {} } }),
    resultText: RESULT_HANDOFF,
  });

  assert.equal(byLabel(signals, 'specSources 저장값 일치').status, 'FAIL');
  assert.equal(byLabel(signals, 'user 값 보존').status, 'PASS');
});

test('실행 전 config 원문이 없으면 보존은 N/A (쓰기 여부를 알 수 없다)', () => {
  const signals = scoreSpecArtifacts({
    specBody: SPEC_FULL, configRaw: CONFIG_FULL, resultText: RESULT_HANDOFF,
    expectedUser: EXPECTED_USER, expectedConfluence: EXPECTED_CONFLUENCE,
  });

  const preserved = byLabel(signals, 'user 값 보존');
  assert.equal(preserved.status, 'N/A');
  assert.match(preserved.note, /미확보/);
});

test('무관한 figma 항목만 저장 → confluence 기대값 미충족으로 FAIL', () => {
  const signals = score({
    specBody: SPEC_FULL,
    configRaw: JSON.stringify({ user: EXPECTED_USER, specSources: { figma: { fileUrl: 'https://f/x' } } }),
    resultText: RESULT_HANDOFF,
  });

  assert.equal(byLabel(signals, 'specSources 저장값 일치').status, 'FAIL');
});

test('specSources.confluence가 빈 객체거나 값이 다르면 FAIL (저장 여부가 아니라 값을 본다)', () => {
  const empty = score({
    specBody: SPEC_FULL,
    configRaw: JSON.stringify({ user: EXPECTED_USER, specSources: { confluence: {} } }),
    resultText: RESULT_HANDOFF,
  });
  assert.equal(byLabel(empty, 'specSources 저장값 일치').status, 'FAIL');

  const wrong = score({
    specBody: SPEC_FULL,
    configRaw: JSON.stringify({
      user: EXPECTED_USER,
      specSources: { confluence: { baseUrl: 'https://other/wiki', spaceKey: 'SIM' } },
    }),
    resultText: RESULT_HANDOFF,
  });
  assert.equal(byLabel(wrong, 'specSources 저장값 일치').status, 'FAIL');
});

test('user가 다른 값으로 덮어써지면 보존 신호 FAIL (비어있지 않음만으로는 통과 못 한다)', () => {
  const signals = score({
    specBody: SPEC_FULL,
    configRaw: JSON.stringify({ user: 'someone-else', specSources: { confluence: { ...EXPECTED_CONFLUENCE } } }),
    resultText: RESULT_HANDOFF,
  });

  assert.equal(byLabel(signals, 'specSources 저장값 일치').status, 'PASS');
  assert.equal(byLabel(signals, 'user 값 보존').status, 'FAIL');
});

test('user 키 유실 → read-modify-write 신호 FAIL (덮어쓰기 회귀)', () => {
  const signals = score({
    specBody: SPEC_FULL,
    configRaw: JSON.stringify({ specSources: { confluence: { ...EXPECTED_CONFLUENCE } } }),
    resultText: RESULT_HANDOFF,
  });

  assert.equal(byLabel(signals, 'specSources 저장값 일치').status, 'PASS');
  assert.equal(byLabel(signals, 'user 값 보존').status, 'FAIL');
});

test('config가 깨졌거나 없으면 두 config 신호 모두 FAIL + 사유 note', () => {
  const broken = score({ specBody: SPEC_FULL, configRaw: '{ not json', resultText: RESULT_HANDOFF });
  assert.equal(byLabel(broken, 'specSources 저장값 일치').status, 'FAIL');
  assert.equal(byLabel(broken, 'user 값 보존').status, 'FAIL');
  assert.match(byLabel(broken, 'user 값 보존').note, /파싱 실패/);

  const missing = score({ specBody: SPEC_FULL, resultText: RESULT_HANDOFF });
  assert.equal(byLabel(missing, 'specSources 저장값 일치').status, 'FAIL');
  assert.equal(byLabel(missing, 'user 값 보존').status, 'FAIL');
});

test('인자 없이 부르면 어떤 신호도 PASS가 아니다 (증거 없음 = 통과 아님)', () => {
  const signals = scoreSpecArtifacts();

  assert.equal(signals.length, 5);
  assert.ok(signals.every((s) => s.status !== 'PASS'));
  // 보존만 N/A(쓰기 여부 미상), 나머지는 증거 부재로 FAIL.
  assert.equal(signals.filter((s) => s.status === 'N/A').length, 1);
  assert.equal(signals.filter((s) => s.status === 'FAIL').length, 4);
});

test('forceAllChecked — 자가진단 절만 전 항목 체크로 만든다', () => {
  const partial = SPEC_FULL.replace('- [x] **Success 기준**', '- [ ] **Success 기준**')
    .replace('- [x] **Ambiguity ≤ 0.2**', '- [ ] **Ambiguity ≤ 0.2**');

  assert.match(byLabel(score({ specBody: partial }), '인계').note, /자가진단 3\/5/);

  const forced = forceAllChecked(partial);
  assert.match(byLabel(score({ specBody: forced }), '인계').note, /자가진단 5\/5/);
  // 다른 절의 체크박스는 건드리지 않는다.
  assert.ok(forced.includes('## 참고'));
});

test('forceAllChecked — 자가진단 절이 없으면 원문 그대로 돌려준다', () => {
  const noSection = '# t\n\n## 목적\n- [ ] 이건 자가진단이 아니다\n';

  assert.equal(forceAllChecked(noSection), noSection);
});

test('aggregateTrials — 전 trial 통과만 PASS, 섞이면 FLAKY 표기', () => {
  const trialA = score({ specBody: SPEC_FULL, configRaw: CONFIG_FULL, resultText: RESULT_HANDOFF });
  const trialB = score({
    specBody: SPEC_FULL, configRaw: JSON.stringify({ user: 'simbot' }), resultText: RESULT_HANDOFF,
  });

  const folded = aggregateTrials([trialA, trialB]);

  const tag = byLabel(folded, '(interview) 출처 태그');
  assert.equal(tag.status, 'PASS');
  assert.match(tag.label, /pass-rate 2\/2/);
  assert.doesNotMatch(tag.note, /FLAKY/);
  // FLAKY가 아닐 때 note 앞에 구분자만 남지 않는다.
  assert.doesNotMatch(byLabel(folded, '인계').note, /^·/);

  // trialB에서만 빠진 신호 → 1/2 + FLAKY. 한 번 통과했다고 PASS로 굳히지 않는다.
  const sources = byLabel(folded, 'specSources 저장값 일치');
  assert.equal(sources.status, 'FAIL');
  assert.match(sources.label, /pass-rate 1\/2/);
  assert.match(sources.note, /FLAKY/);
});

test('aggregateTrials — 단일 trial도 pass-rate 1/1로 접힌다', () => {
  const folded = aggregateTrials([score({ specBody: SPEC_FULL, configRaw: CONFIG_FULL, resultText: RESULT_HANDOFF })]);

  assert.equal(folded.length, 5);
  assert.ok(folded.every((s) => s.status === 'PASS'));
  assert.match(folded[0].label, /pass-rate 1\/1/);
});

test('aggregateTrials — trial이 하나도 없으면 빈 배열 (perTrial[0] 접근 금지)', () => {
  assert.deepEqual(aggregateTrials([]), []);
});

test('renderSignals — N/A는 ➖로 렌더되고 사유 note가 살아남는다', () => {
  const out = renderSignals('SC7 — 렌더 확인', [
    { label: '통과', status: 'PASS', note: '' },
    { label: '실패', status: 'FAIL', note: 'FLAKY' },
    { label: '관찰 불가', status: 'MANUAL', note: '헤드리스 재현 불가' },
    { label: '범위 밖', status: 'N/A', note: '라이브 MCP 필요' },
  ]);

  assert.match(out, /^### SC7 — 렌더 확인$/m);
  assert.match(out, /^- ✅ 통과$/m);
  assert.match(out, /^- ❌ 실패 — FLAKY$/m);
  assert.match(out, /^- ⚠️ 관찰 불가 — 헤드리스 재현 불가$/m);
  assert.match(out, /^- ➖ 범위 밖 — 라이브 MCP 필요$/m);
});

test('aggregateTrials — N/A는 FAIL로도 PASS로도 접히지 않는다', () => {
  const judged = score({ specBody: SPEC_FULL, configRaw: CONFIG_FULL, resultText: RESULT_HANDOFF });
  const unjudged = score({ specBody: SPEC_FULL, configRaw: CONFIG_BEFORE, resultText: RESULT_HANDOFF });

  const allNa = aggregateTrials([unjudged, unjudged]);
  assert.equal(byLabel(allNa, 'user 값 보존').status, 'N/A');

  // PASS 1 + N/A 1: 모든 trial에서 성립했다고 주장할 수 없다.
  const mixed = aggregateTrials([judged, unjudged]);
  const preserved = byLabel(mixed, 'user 값 보존');
  assert.equal(preserved.status, 'N/A');
  assert.match(preserved.note, /판정 불가 1\/2/);

  // FAIL이 섞이면 FAIL이 이긴다 — N/A가 실패를 가리지 않는다.
  const failing = score({
    specBody: SPEC_FULL,
    configRaw: JSON.stringify({ user: 'someone-else', specSources: { confluence: { ...EXPECTED_CONFLUENCE } } }),
    resultText: RESULT_HANDOFF,
  });
  assert.equal(byLabel(aggregateTrials([failing, unjudged]), 'user 값 보존').status, 'FAIL');
});

test('출처 태그 — 결합 표기·번호 목록·다른 절 제목도 계약을 지킨 것으로 받는다', () => {
  const combined = score({
    specBody: '# t\n\n## 목적 / 요구사항\n- 4회째부터 카드 변경 안내 (confluence, interview)\n\n## Ambiguity 자가진단\n- [x] a\n',
    configRaw: CONFIG_FULL,
  });
  assert.equal(byLabel(combined, '(interview) 출처 태그').status, 'PASS');

  const unresolved = score({
    specBody: '# t\n\n## 요구사항\n1. 재시도 윈도우 12분 (interview, unresolved)\n\n## Ambiguity 자가진단\n- [x] a\n',
    configRaw: CONFIG_FULL,
  });
  assert.equal(byLabel(unresolved, '(interview) 출처 태그').status, 'PASS');
});

test('출처 태그 — 괄호 없는 언급이나 목록 아닌 산문은 여전히 FAIL', () => {
  const prose = score({
    specBody: '# t\n\n## 목적 / 요구사항\ninterview 에서 받은 요구가 있다\n\n## Ambiguity 자가진단\n- [x] a\n',
    configRaw: CONFIG_FULL,
  });
  assert.equal(byLabel(prose, '(interview) 출처 태그').status, 'FAIL');

  const otherSection = score({
    specBody: '# t\n\n## 목적 / 요구사항\n- 태그 없는 요구\n\n## 설계 / 접근\n- 뭔가 (interview)\n\n## Ambiguity 자가진단\n- [x] a\n',
    configRaw: CONFIG_FULL,
  });
  assert.equal(byLabel(otherSection, '(interview) 출처 태그').status, 'FAIL');
});

test('절 범위 — 하위 제목(###)을 둔 요구사항 절도 본문에 포함된다 (위양성 FAIL 회귀)', () => {
  // 실측 회귀(agentloop 2026-09-07T0401 SC7): writer가 `## 목적 / 요구사항` 아래에 `### 문제`·
  // `### 요구사항`을 두자 절 본문이 제목 직후 안내 문구까지로 잘려 목록 항목 0개가 됐다.
  // 하위 제목은 writer의 자유 선택이고 계약은 "항목별 출처 표기" 하나뿐이라 PASS여야 한다.
  const nested = score({
    specBody: [
      '# t — Spec', '',
      '## 목적 / 요구사항',
      '*안내 문구만 있는 서두 — 여기엔 목록 항목이 없다.*', '',
      '### 문제', '오늘 무엇이 안 되는지 산문.', '',
      '### 요구사항',
      '- **R1** 최대 3회 재시도 (confluence)',
      '- **R2** 중복 청구 0건 (interview, S2에서 유도)', '',
      '## Ambiguity 자가진단', '- [x] a', '',
    ].join('\n'),
    configRaw: CONFIG_FULL,
    resultText: RESULT_HANDOFF,
  });

  assert.equal(byLabel(nested, '(interview) 출처 태그').status, 'PASS');

  // 절 경계는 여전히 지켜진다 — 같은 레벨의 다음 절로는 넘어가지 않는다.
  const bleed = score({
    specBody: [
      '# t — Spec', '',
      '## 목적 / 요구사항',
      '### 요구사항', '- 태그 없는 요구', '',
      '## 설계 / 접근', '- 뭔가 (interview)', '',
      '## Ambiguity 자가진단', '- [x] a', '',
    ].join('\n'),
    configRaw: CONFIG_FULL,
    resultText: RESULT_HANDOFF,
  });

  assert.equal(byLabel(bleed, '(interview) 출처 태그').status, 'FAIL');
});

test('절 범위 — 자가진단 절도 하위 제목 너머의 체크박스를 센다', () => {
  const signals = score({
    specBody: [
      '# t — Spec', '',
      '## 목적 / 요구사항', '- 뭔가 (interview)', '',
      '## Ambiguity 자가진단',
      '- [x] **Goal 명확도**', '',
      '### 근거', '- [ ] **Success 기준**', '',
      '## 참고', '- [x] 이 체크박스는 다른 절이라 세지 않는다', '',
    ].join('\n'),
    configRaw: CONFIG_FULL,
    resultText: RESULT_HANDOFF,
  });

  assert.match(byLabel(signals, '인계').note, /자가진단 1\/2 체크/);
});

test('출처 태그 FAIL은 note로 스스로 진단한다 (절 미검출 vs 항목은 있는데 태그 없음)', () => {
  const noSection = score({ specBody: '# t\n\n## 설계\n- 뭔가\n', configRaw: CONFIG_FULL });
  assert.match(byLabel(noSection, '(interview) 출처 태그').note, /요구사항 절 미검출/);

  const untagged = score({
    specBody: '# t\n\n## 목적 / 요구사항\n- 요구 하나\n- 요구 둘\n- 요구 셋\n',
    configRaw: CONFIG_FULL,
  });
  assert.match(byLabel(untagged, '(interview) 출처 태그').note, /항목 3개, 괄호 태그 미검출/);
});

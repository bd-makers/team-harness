// 검증 프레이밍(D6) 프롬프트의 정본. `harness-team review --framing <접미사>` 가 `--prompt-file` 없이
// 실행될 때 여기 템플릿을 채워 엔진에 넘긴다.
//
// 0.37.0 까지는 각 커맨드 문서가 정본이고 에이전트가 프롬프트를 파일에 **옮겨 쓴 뒤** 넘겼다. 그 단계가
// kind(`<engine>-adversarial`)와 실제로 엔진에 간 텍스트 사이에 기록되지 않는 변형을 끼웠다 — 잘라 쓰거나
// 바꿔 써도 meta.reviews 에는 같은 kind 로 남는다. 공용 프롬프트(`REVIEW_PROMPT_TEMPLATE`)와 같은 구조로
// 옮긴다: src 가 정본, 각 커맨드 문서의 `<!-- harness:prompt framing=… -->` 마커 다음 text 블록이 미러,
// tests/review-command.test.mjs 의 pin 이 한 글자도 다르지 않음을 강제한다.
//
// - `target`: 템플릿이 엔진에게 읽으라고 지시하는 대상. `git` 이면 종전 scope 결정(worktree/diff)을 그대로
//   쓰고, `task-docs` 면 scope 기본값이 task-docs 이고 다른 scope 명시는 거부한다(review.mjs).
// - placeholder: `<working tree changes | diff against <base>>`·`<focus arguments, if any>` 는 공용 프롬프트와
//   같은 규칙. `<spec path>`·`<plan path>`·`<artifact path>` 는 활성 task 의 상대 경로로 CLI 가 채운다.
// - testcritic 은 테스트 스킬 3종이 각자 다른 루브릭을 같은 kind 로 남기므로 `--rubric` 으로 고른다.
//   kind 는 `<engine>-testcritic` 그대로다 — 가드에게 세 변형은 같은 검증 증거다.
// - 루브릭 행의 문구는 문서 표에서 그대로 옮겼다. 기준을 바꾸려면 문서 블록과 여기를 함께 고친다(pin).

export const RUBRICS = ['unit', 'component', 'integration'];

const FINDING_LINE = 'Score each rubric row below as one finding: id · 항목 · 심각도(BLOCKER/MAJOR/MINOR) · 판정(pass/fail/na) · 근거.';

export const FRAMING_TEMPLATES = [
  {
    framing: 'adversarial', target: 'git', doc: 'commands/harness-adversarial-review.md',
    template: [
      'You are performing an adversarial read-only code review of this repository.',
      'Scope: <working tree changes | diff against <base>>. Inspect the changes yourself with git (git status, git diff).',
      'Do not modify anything. Actively try to find reasons this change should be REJECTED:',
      'challenge the implementation approach and design choices, hunt for hidden assumptions,',
      'missed edge cases, failure paths, concurrency and data-integrity hazards, and security exposure.',
      'For each objection state severity (P1 blocking / P2 should-fix / P3 nit), file:line, and what concrete',
      'scenario breaks. Separate real blockers from theoretical concerns in your verdict.',
      'If the approach survives your objections, say so explicitly. <focus arguments, if any>',
    ].join('\n'),
  },
  {
    framing: 'shipcheck', target: 'git', doc: 'commands/harness-ship.md',
    template: [
      "You are an independent read-only verifier checking that this task's documents and its diff agree before a PR (D6).",
      'Scope: <working tree changes | diff against <base>>. Inspect the changes yourself with git (git status, git diff).',
      'Read these files first: <spec path>, <plan path> and <artifact path>. Do not modify anything.',
      FINDING_LINE,
      '근거는 문서 문장 또는 diff 인용이어야 하고, 증거 없는 항목은 pass가 아니라 na다.',
      'S1 [BLOCKER] spec 요구사항마다 diff에 대응 구현이 있거나 "의도적 미구현"으로 기록돼 있다',
      'S2 [MAJOR] plan의 `- [x]` 각 항목에 대응하는 변경·커밋이 실재한다',
      'S3 [MAJOR] spec/plan에 없는 스코프 밖 변경이 diff에 없다 (있으면 문서에 사유 기록)',
      'S4 [MAJOR] 실행된 리뷰가 전부 artifact `## Reviews`에 마커와 함께 기록돼 있다',
      'S5 [BLOCKER] 보고의 "검증 결과"가 실제 명령·출력 인용이다 — 산문 선언이 아니다',
      'End with a verdict that lists every fail. <focus arguments, if any>',
    ].join('\n'),
  },
  {
    framing: 'contrarian', target: 'task-docs', doc: 'commands/harness-contrarian.md',
    template: [
      "You are an independent read-only verifier challenging the assumptions in this task's spec and plan (D6).",
      'Read these files first: <spec path> and <plan path>. Do not modify anything.',
      FINDING_LINE,
      '근거는 spec/plan 문장 인용이어야 하고, 증거 없는 항목은 pass가 아니라 na다.',
      '각 각도에서 유효한 반론을 찾지 못하면 그 행은 근거와 함께 pass다.',
      'A1 [BLOCKER] 반대가 사실이라면 — 핵심 가정이 뒤집혀도 목표가 즉시 무너지지 않거나, 무너지는 조건이 spec에 식별돼 있다',
      'A2 [MAJOR] 이게 필요 없다면 — 가장 비싼 단계를 제거하면 목표 달성이 불가능하다 (제거 가능하면 fail)',
      'A3 [MAJOR] 숨은 비용 — 6개월 뒤 유지보수 부담을 만드는 결정이 없거나, 있다면 spec에 비용이 기록돼 있다',
      'A4 [MINOR] 잘못된 추상화 — 단일 사용처뿐인 추상화 도입이 plan에 없다',
      'End with a verdict that lists every fail. <focus arguments, if any>',
    ].join('\n'),
  },
  {
    framing: 'simplifier', target: 'task-docs', doc: 'commands/harness-simplifier.md',
    template: [
      "You are an independent read-only verifier looking for steps and abstractions to REMOVE from this task's plan (D6).",
      'Read these files first: <plan path> and <spec path>, plus any file list the plan names. Do not modify anything.',
      FINDING_LINE,
      '근거는 문서 문장 인용이어야 하고, 증거 없는 항목은 pass가 아니라 na다. fail마다 제거안을 한 줄로 붙인다.',
      'R1 [MAJOR] YAGNI — spec 요구사항에 대응하지 않는 선행 구현 단계가 plan에 없다',
      'R2 [MAJOR] 단일 사용처 추상화 — 1곳에서만 쓰일 새 클래스/함수/계층 도입이 없다',
      'R3 [MAJOR] 중복 단계 — 동일 효과를 내는 단계가 plan에 둘 이상 없다',
      'R4 [MINOR] 죽은 옵션 — 항상 같은 값으로만 쓰일 플래그·설정 추가가 없다',
      'Propose removals only — never new abstractions. End with a verdict that lists every fail. <focus arguments, if any>',
    ].join('\n'),
  },
  {
    framing: 'testcritic', rubric: 'unit', target: 'git', doc: 'commands/harness-unittest.md',
    template: [
      'You are an independent read-only verifier critiquing the NEW UNIT TESTS in this change (D6).',
      'Scope: <working tree changes | diff against <base>>. Inspect the changes yourself with git (git status, git diff).',
      'Read the test files and <artifact path> (recorded evidence). Do not modify anything.',
      FINDING_LINE,
      'pass 판정은 증거에만 근거한다 — 산문은 신호가 아니다. 증거 없는 항목은 pass가 아니라 na다.',
      'T1 [BLOCKER] 새 테스트가 실제 실행되어 전부 통과했다는 증거(명령·출력)가 있다',
      'T2 [BLOCKER] tautological 테스트 없음 — 프로덕션을 망가뜨려도 통과하는 테스트 부재',
      'T3 [BLOCKER] mock 반향 테스트 없음 — mock 세팅값을 그대로 assert하는 테스트 부재',
      'T4 [MAJOR] 각 테스트가 죽일 수 있는 프로덕션 변이(mutation)를 최소 1개 지목할 수 있다',
      'T5 [MAJOR] GWT 3구획·서술형 테스트명·When 한 줄 규율 준수',
      'T6 [MAJOR] 구현 세부사항 assert 없음 — private/호출 순서/내부 상태 검증 부재',
      'End with a verdict that lists every fail. <focus arguments, if any>',
    ].join('\n'),
  },
  {
    framing: 'testcritic', rubric: 'component', target: 'git', doc: 'commands/harness-comptest.md',
    template: [
      'You are an independent read-only verifier critiquing the NEW COMPONENT TESTS in this change (D6).',
      'Scope: <working tree changes | diff against <base>>. Inspect the changes yourself with git (git status, git diff).',
      'Read the test files and <artifact path> (recorded evidence). Do not modify anything.',
      FINDING_LINE,
      'pass 판정은 증거에만 근거한다 — 산문은 신호가 아니다. 증거 없는 항목은 pass가 아니라 na다.',
      'C1 [BLOCKER] 실행·전부 통과 증거(명령·출력)가 있고 콘솔 워닝(`act` 포함) 0건이다',
      'C2 [BLOCKER] tautological 테스트 없음 — 프로덕션 컴포넌트를 망가뜨려도 통과하는 테스트 부재',
      'C3 [BLOCKER] mock 반향 테스트 없음 — 프로덕션 렌더·상호작용을 태우지 않는 테스트 부재',
      'C4 [MAJOR] 마크업 리팩토링(div→section, 스타일 변경)에도 살아남는다 — 사용자 관점 쿼리 우선순위 준수',
      'C5 [MAJOR] msw 핸들러를 지우면 실패한다 — 네트워크 경로를 실제로 태운다 (해당 시)',
      'C6 [MAJOR] 로딩/에러/빈 상태 기본 세트가 커버되거나 미커버 사유가 보고됐다',
      'End with a verdict that lists every fail. <focus arguments, if any>',
    ].join('\n'),
  },
  {
    framing: 'testcritic', rubric: 'integration', target: 'git', doc: 'commands/harness-inttest.md',
    template: [
      'You are an independent read-only verifier critiquing the NEW INTEGRATION TESTS in this change (D6).',
      'Scope: <working tree changes | diff against <base>>. Inspect the changes yourself with git (git status, git diff).',
      'Read the test files and <artifact path> (recorded evidence). Do not modify anything.',
      FINDING_LINE,
      'pass 판정은 증거에만 근거한다 — 산문은 신호가 아니다. 증거 없는 항목은 pass가 아니라 na다.',
      'I1 [BLOCKER] 실행·전부 통과 증거(명령·출력)가 있다 — 단독 1회 + 전체 1회, 결과 동일(격리 증명)',
      'I2 [BLOCKER] tautological 테스트 없음 — 프로덕션을 망가뜨려도 통과하는 테스트 부재',
      'I3 [BLOCKER] mock 반향 테스트 없음 — mock 세팅값을 그대로 assert하는 테스트 부재',
      'I4 [MAJOR] DB assert를 지우면 실패한다 — 부수효과 검증이 존재한다 (해당 시)',
      'I5 [MAJOR] msw 핸들러를 지우면 실패한다 — 아웃바운드 경로를 실제로 태운다 (해당 시)',
      'I6 [MAJOR] managed/unmanaged 구분 준수 — managed 의존성 목킹 없음',
      'End with a verdict that lists every fail. <focus arguments, if any>',
    ].join('\n'),
  },
];

// 문서 쪽 마커 — pin 테스트가 이 문자열 다음의 첫 text 블록을 정본과 비교한다.
export function promptMarker({ framing, rubric }) {
  return `<!-- harness:prompt framing=${framing}${rubric ? ` rubric=${rubric}` : ''} -->`;
}

// `--framing`(+`--rubric`) → 템플릿. allowlist 밖 접미사는 여기 오기 전에 buildReviewKind 가 거른다.
export function findFramingTemplate(framing, rubric) {
  const matches = FRAMING_TEMPLATES.filter(t => t.framing === framing);
  if (!matches.length) return { error: `--framing ${framing} 의 템플릿이 src 에 없음`, retry: '허용 프레이밍으로 다시 실행' };
  if (!matches.some(t => t.rubric)) return { template: matches[0] };
  const names = matches.map(t => t.rubric);
  if (!rubric) {
    return { error: `--framing ${framing} 은 루브릭이 셋이라 --rubric 이 필요 (허용: ${names.join('·')})`, retry: `\`--framing ${framing} --rubric <${names.join('|')}>\` 로 다시 실행` };
  }
  const hit = matches.find(t => t.rubric === rubric);
  if (!hit) return { error: `--rubric ${rubric} 은 ${framing} 의 루브릭(${names.join('·')}) 밖`, retry: '허용 값 중 하나로 다시 실행' };
  return { template: hit };
}

// sim rule 층 — I/O 없는 순수 채점 함수만 담는다 (D6 4단계, agentloop.mjs에서 승격).
// sim 실행에는 토큰이 필요하지만 이 로직은 토큰 없이 `npm run test`가 검증한다
// (선례: codex-agentloop.mjs parseCodexJsonl + tests/codex-agentloop-parser.test.mjs).
// 하네스(샌드박스 준비·에이전트 spawn·리포트 I/O)는 각 sim 파일에 남고, 여기는
// "무엇이 PASS인가"라는 규칙만 남는다 — 규칙은 순수해야 토큰 없이 고정할 수 있다.
//
// 주의: codex-agentloop.mjs·skilltest.mjs의 유사 헬퍼는 구현이 달라(각주: sanitizeNote
// 절단 90 vs 70, ico 미지 상태 폴백, skilltest는 sanitize 없음) 이 층으로 통일하지
// 않았다 — 동작 불변 원칙. 정렬은 별도 결정 후에 한다.

// ── signal scoring ────────────────────────────────────────────────────────────
// A signal = { label, status: 'PASS'|'FAIL'|'MANUAL', note }. Prose is never a signal.
function sanitizeNote(s) {
  // Agent prose must never break the report markdown. Single line, bounded.
  return String(s).replace(/\s+/g, ' ').replace(/[#*`|]/g, '').replace(/-{2,}/g, ' ').trim().slice(0, 70);
}
export function sig(label, ok, note = '') {
  return { label, status: ok ? 'PASS' : 'FAIL', note: sanitizeNote(note) };
}
export function manual(label, note) { return { label, status: 'MANUAL', note: sanitizeNote(note) }; }
// 범위 밖은 조용히 빼지 않는다 — 사유와 함께 N/A로 리포트에 남긴다.
export function na(label, note) { return { label, status: 'N/A', note: sanitizeNote(note) }; }

// heading부터 **같거나 더 높은 레벨의** 다음 heading 직전까지를 잘라낸다. `$`는 /m에서 줄 끝마다
// 맞아 절을 한 줄로 잘라먹으므로 쓰지 않는다. 신호를 "문서 어딘가에 문자열이 있다"가 아니라
// "그 절 안에 있다"로 좁히는 데 쓴다 — 전자는 너무 쉽게 PASS한다.
//
// 절단 레벨을 `#{2,3}`으로 고정하면 하위 제목을 둔 절에서 본문이 제목 직후까지로 잘린다.
// 실측(agentloop 2026-09-07T0401 SC7): `## 목적 / 요구사항` 아래에 `### 문제`·`### 요구사항`을
// 둔 spec에서 절 본문이 118 B(안내 문구)로 잘려 목록 항목 0개 → 출처 태그 위양성 FAIL.
// 같은 spec의 `### 요구사항` 안에는 태그가 정상이었고, 어느 커맨드도 평면 구조를 요구하지
// 않는다(commands/harness-spec.md의 계약은 "항목별 출처 표기" 하나뿐) — 스코어러 결함이었다.
// 절 경계는 **한 곳에서만** 계산한다. 본문만 필요한 곳은 sectionBody, 원문을 잘라 붙여야 하는
// 곳(forceAllChecked)은 인덱스를 쓴다 — 사본을 두면 한쪽만 고쳐져 조용히 어긋난다
// (실측: 이 레벨 인식 수정의 1차 커밋 1581e2f가 sectionBody만 바꿔 forceAllChecked와
//  경계가 갈렸고, codex 리뷰가 P2로 집었다).
function sectionRange(md, headingRe) {
  const start = md.search(headingRe);
  if (start < 0) return null;
  const rest = md.slice(start);
  // 호출부는 모두 `^#{2,3}` 앵커 정규식이라 매치는 항상 `#`로 시작한다. 폴백 2는 도달 불가.
  const level = rest.match(/^#+/)?.[0].length ?? 2;
  const next = rest.search(new RegExp(`\\n#{1,${level}} `));
  return { start, end: next > 0 ? start + next : md.length };
}

function sectionBody(md, headingRe) {
  const range = sectionRange(md, headingRe);
  return range ? md.slice(range.start, range.end) : '';
}

// 자가진단 절 안의 체크 상태만 센다. 인계 문구 신호의 note에 붙여, "전 항목 체크에서도
// 인계했는가"(2차 리뷰 P1 회귀)를 리포트만 보고 판정할 수 있게 한다.
export function ambiguityCounts(specBody) {
  const body = sectionBody(specBody, /^#{2,3} Ambiguity 자가진단/m);
  const checked = (body.match(/^\s*- \[[xX]\]/gm) || []).length;
  const open = (body.match(/^\s*- \[ \]/gm) || []).length;
  return { checked, total: checked + open };
}

// 자가진단 절만 전 항목 체크로 강제한다. 계약상 writer는 마지막 가중합 항목을 스스로 체크하지
// 않으므로(그건 validator 몫) 실사용 초안은 5/5에 도달하지 못한다. P1 회귀("전 항목 체크여도
// 인계하는가")를 실제로 태우려면 merge 재실행 전에 이 상태를 인위적으로 만들어야 한다.
export function forceAllChecked(specBody) {
  // ambiguityCounts와 **같은 경계**를 써야 한다 — 여기서 못 켠 체크박스를 저쪽이 세면
  // total/total 에 도달하지 못해 P1 회귀 시나리오가 조용히 안 태워진다.
  const range = sectionRange(specBody, /^#{2,3} Ambiguity 자가진단/m);
  if (!range) return specBody;
  const section = specBody.slice(range.start, range.end).replace(/^(\s*)- \[ \]/gm, '$1- [x]');
  return specBody.slice(0, range.start) + section + specBody.slice(range.end);
}

// 순수 채점 — I/O 없음. sim 실행에는 토큰이 필요하지만 이 로직은 토큰 없이 `npm run test`가
// 검증한다 (선례: codex-agentloop.mjs parseCodexJsonl + tests/codex-agentloop-parser.test.mjs).
export function scoreSpecArtifacts({
  specBody = '', configRaw = '', resultText = '', expectedUser = '', expectedConfluence = null,
  configBefore = null,
} = {}) {
  const { checked, total } = ambiguityCounts(specBody);
  let config = null, configErr = null;
  try { config = JSON.parse(configRaw); } catch (e) { configErr = String(e.message); }
  const src = config && typeof config === 'object' ? config.specSources : null;
  // 저장 "여부"가 아니라 저장된 "값"을 본다 — specSources.confluence = {} 로도 통과하면
  // lazy 저장을 검증한 것이 아니다. 이 시나리오는 confluence를 골랐으므로 그 항목을 대조한다.
  const conf = src && typeof src === 'object' ? src.confluence : null;
  const sourcesSaved = !!(expectedConfluence && conf
    && conf.baseUrl === expectedConfluence.baseUrl && conf.spaceKey === expectedConfluence.spaceKey);
  // 값 동등성만으로는 부족하다. expectedUser를 실행 직전 파일에서 읽으므로, 커맨드가 config를
  // **아예 건드리지 않아도** 이 비교는 참이 된다 — "보존했다"와 "쓰기가 없었다"를 구분하지 못한다.
  // 그래서 실행 전후 원문 비교로 쓰기 발생을 먼저 확인하고, 쓰기가 없었으면 PASS가 아니라
  // 판정 불가(N/A)로 내보낸다. `specSources` 저장 여부가 아니라 **파일 변경 자체**를 증거로 삼는
  // 이유는, 값이 틀리게 저장된 경우(쓰기는 일어났고 user가 날아갔을 수 있다)도 판정해야 하기 때문이다.
  const wroteConfig = configBefore !== null && configRaw !== configBefore;
  const userPreserved = wroteConfig && !!expectedUser && config?.user === expectedUser;
  // 요구사항 절 안의 **목록 항목**에 괄호 출처 태그가 붙었는지를 본다. 문서 아무 데나 있으면
  // 통과하는 검사로는 "항목별 출처 표기"라는 계약을 확인할 수 없다.
  // 리터럴 `(interview)`만 받으면 안 된다 — 한 항목이 두 소스에서 왔을 때 writer는
  // `(confluence, interview)`로 묶어 쓰고(실측), 충돌 항목엔 `(interview, unresolved)`가 붙는다.
  // 둘 다 계약을 지킨 표기다. 절 제목도 `## 목적 / 요구사항`을 `## 요구사항`으로 쓸 수 있다.
  const reqSection = sectionBody(specBody, /^#{2,3} .*(?:목적|요구사항)/m);
  const reqItems = (reqSection.match(/^\s*(?:[-*]|\d+\.)\s/gm) || []).length;
  const interviewTagged = /^\s*(?:[-*]|\d+\.)\s.*\([^)\n]*\binterview\b[^)\n]*\)/m.test(reqSection);
  // 문자열 존재가 아니라 실제 heading + 체크박스 존재를 요구한다(total > 0).
  const ambiguityOk = total > 0;
  // 인계 문구는 파일·git 어디에도 안 남아 에이전트 최종 메시지가 유일한 관측면이다(산문 예외).
  // transcript로 재면 확장된 커맨드 본문(commands/harness-spec.md가 /harness-interview를 여러 번
  // 언급한다)이 그대로 섞여 무조건 참이 된다 → result만 본다.
  const handoff = /harness-interview/.test(resultText);
  return [
    sig('요구사항 항목에 (interview) 출처 태그', interviewTagged,
      interviewTagged ? '' : (reqSection ? `요구사항 절 항목 ${reqItems}개, 괄호 태그 미검출` : '요구사항 절 미검출')),
    sig('Ambiguity 자가진단 절 + 체크박스 생성', ambiguityOk),
    sig('harness-interview 인계 [산문 예외]', handoff, `자가진단 ${checked}/${total} 체크 상태`),
    sig('specSources 저장값 일치 (.harness/config.json)', sourcesSaved, configErr ? `config JSON 파싱 실패: ${configErr}` : ''),
    wroteConfig
      ? sig('config 기존 user 값 보존 (read-modify-write)', userPreserved, configErr ? 'config JSON 파싱 실패' : '')
      : na('config 기존 user 값 보존 (read-modify-write)',
        configBefore === null ? '실행 전 config 원문 미확보 — 판정 불가' : '쓰기 미발생 — 보존 여부 판정 불가'),
  ];
}

// 같은 라벨의 신호를 trial 전체로 접어 pass-rate로 만든다 (SC5 관용구). 에이전트 산출물은
// 결정적이지 않다 — 한 번 통과했다고 PASS로 굳히면 리포트가 실제보다 강해 보인다.
export function aggregateTrials(perTrial) {
  if (!perTrial.length) return [];
  return perTrial[0].map((_, i) => {
    const runs = perTrial.map((t) => t[i]);
    const passed = runs.filter((r) => r.status === 'PASS').length;
    const failed = runs.filter((r) => r.status === 'FAIL').length;
    const nas = runs.filter((r) => r.status === 'N/A').length;
    const flaky = passed > 0 && failed > 0;
    const notes = runs.map((r) => r.note).filter(Boolean);
    // N/A는 통과도 실패도 아니다. 전부 N/A면 N/A로, 일부만 N/A면(그리고 FAIL이 없으면)
    // "모든 trial에서 성립했다"를 주장할 수 없으므로 역시 N/A로 내보낸다 — FAIL로 접으면
    // 없는 결함을 만들고, PASS로 접으면 판정 못 한 trial을 통과로 위조한다.
    let status = 'PASS';
    if (failed > 0) status = 'FAIL';
    else if (nas > 0) status = 'N/A';
    return {
      label: `${runs[0].label} (pass-rate ${passed}/${runs.length})`,
      status,
      note: sanitizeNote([
        flaky ? 'FLAKY' : '', nas ? `판정 불가 ${nas}/${runs.length}` : '', ...notes,
      ].filter(Boolean).join(' · ')),
    };
  });
}

// ── report rendering (순수) ───────────────────────────────────────────────────
export const ICO = (s) => (s === 'PASS' ? '✅' : s === 'FAIL' ? '❌' : s === 'N/A' ? '➖' : '⚠️');
export function renderSignals(title, signals) {
  const lines = signals.map((s) => `- ${ICO(s.status)} ${s.label}${s.note ? ` — ${s.note}` : ''}`);
  return `### ${title}\n${lines.join('\n')}\n`;
}

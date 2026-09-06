// Structured observation envelope for agent-facing --json output.
// CLI stdout = agent observation. One stable schema; error is null on success.
export const OBSERVATION_SCHEMA = 'harness/observation/v1';

export function buildEnvelope({
  command,
  status,
  summary,
  nextActions = [],
  artifacts = [],
  error = null,
  extra = {},
}) {
  return {
    schema: OBSERVATION_SCHEMA,
    command,
    status,
    summary,
    next_actions: nextActions,
    artifacts,
    error,
    ...extra,
  };
}

export function emitObservation(env) {
  console.log(JSON.stringify(env, null, 2));
}

// escalation packet (PDF §V.A "Escalation Is Not Failure") — 결정을 넘길 때 함께 보내는 5항목.
// 값을 손으로 만들던 생산자마다 필드를 빠뜨릴 수 있어 강제 지점을 이 함수 하나로 모은다.
// buildEnvelope는 error를 그대로 통과시킨다(pass-through) — 강제는 여기서만 한다.
//
// 이 기계용 패킷은 CLAUDE.md §5-A 의 **사람용 escalation 패킷과 같은 목적이되 항목이 하나씩 다르다.**
// 여기는 "기다림의 비용" 대신 `stop_condition` 을 담고, 여기의 `alternatives` 는 "지금 취할 수 있는
// 다른 행동"을 뜻한다 — CLI 거부 시점에는 시도 이력이 없어 사람용의 "시도한 대안"과 의미가 갈린다.
export function buildErrorPacket({ cause, retry, alternatives = [], safeDefault, stop }) {
  const causeOk = Array.isArray(cause)
    ? cause.length > 0 && cause.every(c => typeof c === 'string' && c.length > 0)
    : typeof cause === 'string' && cause.length > 0;
  if (!causeOk) throw new TypeError('buildErrorPacket: cause는 비어 있지 않은 string 또는 string[]이어야 한다');
  if (typeof retry !== 'string' || !retry) throw new TypeError('buildErrorPacket: retry는 비어 있지 않은 string이어야 한다');
  if (typeof safeDefault !== 'string' || !safeDefault) throw new TypeError('buildErrorPacket: safeDefault는 비어 있지 않은 string이어야 한다');
  if (typeof stop !== 'string' || !stop) throw new TypeError('buildErrorPacket: stop은 비어 있지 않은 string이어야 한다');
  if (!Array.isArray(alternatives) || alternatives.some(a => typeof a !== 'string' || !a))
    throw new TypeError('buildErrorPacket: alternatives는 비어 있지 않은 string의 배열이어야 한다');
  return {
    root_cause: cause,
    safe_retry: retry,
    alternatives,
    safe_default: safeDefault,
    stop_condition: stop,
  };
}

// text 미러. 빈 alternatives는 줄 자체를 내지 않는다 — 없는 대안을 있는 것처럼 보이게 하지 않는다.
// 배열 cause는 항목마다 cause 줄을 낸다(done 가드의 issue별 출력 보존, text 전용).
export function renderErrorPacket(packet) {
  const causes = Array.isArray(packet.root_cause) ? packet.root_cause : [packet.root_cause];
  return [
    ...causes.map(c => `cause: ${c}`),
    `retry: ${packet.safe_retry}`,
    ...packet.alternatives.map(a => `alternatives: ${a}`),
    `default: ${packet.safe_default}`,
    `stop: ${packet.stop_condition}`,
  ];
}

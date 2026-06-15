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

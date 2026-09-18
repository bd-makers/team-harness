// `harness-team config get|set` — `.harness/config.json` 의 read-modify-write 를 소유한다.
//
// 이 커맨드가 생긴 이유는 `commands/harness-spec.md` 4단계다. spec 은 `specSources` 저장 규칙 세 개
// ("read-modify-write" · "기존 키 보존" · "malformed 면 덮어쓰지 말고 중단")를 산문으로 들고 에이전트에게
// 손으로 실행시켰다. 규칙은 판단이 없으므로 여기로 내리고, 산문에는 "어느 필드가 비었는지 물어라"만 남는다.
//
// 값은 **항상 문자열**이다. `spaceKey 123` 을 숫자로 바꾸는 추측을 하지 않는다 — specSources 의 값은 전부
// URL·키 문자열이고, 다른 타입이 필요하면 파일을 직접 편집한다.
import { readConfigStrict, writeConfig, getConfigValue, setConfigValue, parseConfigKey } from '../user-config.mjs';
import { buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../observation.mjs';

const ACTIONS = ['get', 'set'];
const CONFIG_REL = '.harness/config.json';

const USAGE = 'usage: harness-team config get [<key>] | config set <key> <value>   (key: 점으로 이은 경로, 예: specSources.confluence.baseUrl)';

// 사용법 오류는 exit 2. `--json` 이면 envelope 로 답한다 — --json 계약은 명령 전체에 걸치므로 잘못된
// 하위동작도 기계 소비자가 파싱할 수 있어야 한다(`rules.mjs` 의 같은 분기, codex 리뷰 P2 2회째).
function usage(json, message) {
  process.exitCode = 2;
  if (json) {
    emitObservation(buildEnvelope({
      command: 'config',
      status: 'error',
      summary: `config 실패: ${message}`,
      error: buildErrorPacket({
        cause: message,
        retry: USAGE,
        safeDefault: `${CONFIG_REL} 은 바이트 하나 바뀌지 않았다`,
        stop: '인자를 고치기 전에는 다시 실행하지 말 것',
      }),
    }));
    return;
  }
  console.error(`config: ${message}`);
  console.error(USAGE);
}

function emitError(json, summary, packet) {
  process.exitCode = 1;
  if (json) {
    emitObservation(buildEnvelope({ command: 'config', status: 'error', summary, error: packet }));
    return;
  }
  console.log(`✗ config: ${summary}`);
  for (const line of renderErrorPacket(packet)) console.log(line);
}

// malformed 는 get 에서도 알린다 — 조용히 `{}` 로 읽으면 "미설정" 과 "깨짐" 이 같은 답이 되고,
// 에이전트는 없는 줄 알고 다시 묻는다.
function malformedPacket(err) {
  return buildErrorPacket({
    cause: err.message,
    retry: `${CONFIG_REL} 을 열어 JSON 을 고친 뒤 다시 실행`,
    alternatives: [`파일을 지우고 다시 만들려면 사용자에게 먼저 확인 — 지우면 \`user\` 등 다른 키도 사라진다`],
    safeDefault: `${CONFIG_REL} 은 바이트 하나 바뀌지 않았다`,
    stop: 'malformed 파일 위에 덮어쓰지 말 것',
  });
}

export async function runConfig(ctx) {
  const json = !!(ctx.flags && ctx.flags.json);
  const args = ctx.taskArgs || [];
  const action = args[0];
  if (!ACTIONS.includes(action)) {
    usage(json, action ? `알 수 없는 액션 "${action}" (허용: ${ACTIONS.join('|')})` : '액션이 없음');
    return;
  }

  // 여분 인자는 거부한다 — `set k a b` 를 조용히 `a` 로 저장하면 인용을 빠뜨린 공백 값이 잘린 채
  // 들어간다. `cli-args` 가 모르는 플래그를 거부하는 것과 같은 이유다(codex 리뷰 P2 2회차).
  const arity = action === 'get' ? 2 : 3;
  if (args.length > arity) {
    usage(json, `${action} 에 여분 인자 ${JSON.stringify(args.slice(arity))} — 공백이 든 값은 따옴표로 감싼다`);
    return;
  }

  if (action === 'get') return runGet(ctx, json, args[1]);
  return runSet(ctx, json, args[1], args[2]);
}

async function runGet(ctx, json, key) {
  if (key !== undefined) {
    try { parseConfigKey(key); } catch (err) { usage(json, err.message); return; }
  }

  let config;
  try {
    config = await readConfigStrict(ctx.targetDir);
  } catch (err) {
    emitError(json, `${CONFIG_REL} 을 읽지 못함`, malformedPacket(err));
    return;
  }

  const value = key === undefined ? config : getConfigValue(config, key);
  const present = value !== undefined;
  const label = key ?? '(all)';

  if (json) {
    emitObservation(buildEnvelope({
      command: 'config',
      status: 'success',
      summary: present ? `${label}: 설정됨` : `${label}: (unset)`,
      nextActions: present ? [] : [`\`harness-team config set ${key} <value>\` 로 설정`],
      artifacts: [CONFIG_REL],
      extra: { action: 'get', key: key ?? null, present, value: present ? value : null },
    }));
    return;
  }
  if (!present) {
    console.log(`${label}: (unset)`);
    return;
  }
  console.log(typeof value === 'string' ? `${label}: ${value}` : `${label}: ${JSON.stringify(value, null, 2)}`);
}

async function runSet(ctx, json, key, value) {
  if (key === undefined || value === undefined) {
    usage(json, 'set 은 <key> 와 <value> 두 인자가 필요함');
    return;
  }
  try { parseConfigKey(key); } catch (err) { usage(json, err.message); return; }

  let config;
  try {
    config = await readConfigStrict(ctx.targetDir);
  } catch (err) {
    emitError(json, `${CONFIG_REL} 을 읽지 못해 쓰지 않음`, malformedPacket(err));
    return;
  }

  const previous = getConfigValue(config, key);
  try {
    setConfigValue(config, key, value);
  } catch (err) {
    emitError(json, `${key} 를 설정할 수 없음`, buildErrorPacket({
      cause: err.message,
      retry: '중간 경로가 객체인 다른 키를 쓰거나, 그 키를 지울지 사용자에게 확인한 뒤 파일을 직접 고친다',
      safeDefault: `${CONFIG_REL} 은 바이트 하나 바뀌지 않았다`,
      stop: '기존 값을 덮어써서 경로를 만들지 말 것',
    }));
    return;
  }
  await writeConfig(ctx.targetDir, config);

  const preservedKeys = Object.keys(config).filter(k => k !== key.split('.')[0]);
  const summary = previous === undefined ? `${key} 설정` : `${key} 갱신`;
  if (json) {
    emitObservation(buildEnvelope({
      command: 'config',
      status: 'success',
      summary,
      artifacts: [CONFIG_REL],
      extra: { action: 'set', key, value, previous: previous === undefined ? null : previous, preservedKeys },
    }));
    return;
  }
  console.log(`✓ config: ${summary} → ${CONFIG_REL}`);
  if (preservedKeys.length) console.log(`preserved: ${preservedKeys.join(', ')}`);
}

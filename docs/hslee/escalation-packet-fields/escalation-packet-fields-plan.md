# escalation-packet-fields — Plan

> **For agentic workers:** 이 계획은 `superpowers:executing-plans`로 **inline** 실행한다
> (D4 — 같은 워킹트리·브랜치 안에서 쓰기는 단일 스레드). subagent-driven은 채택하지 않는다.

**Goal:** 엔벨로프 `error`에 `alternatives`·`safe_default`를 항상 존재하는 필드로 더하고,
생산자 9곳을 공용 헬퍼로 통일하며, `CLAUDE.md` §5-A를 PDF 5항목 escalation 패킷으로 교체한다.

**Architecture:** `src/observation.mjs`에 `buildErrorPacket`(5키 강제·위반 시 throw)과
`renderErrorPacket`(text 미러) 두 함수를 두고, 값을 손으로 만들던 생산자 9곳을 전부 이 헬퍼로
바꾼다. `buildEnvelope`는 `error`를 그대로 통과시키는 성질을 유지해 기존 `deepEqual` 계약
테스트를 살린다 — 강제는 헬퍼가, 통과는 엔벨로프가 담당한다.

**Tech Stack:** Node.js ESM, `node --test`, Handlebars 템플릿(`templates/*.hbs`).

**Spec:** `docs/hslee/escalation-packet-fields/escalation-packet-fields-spec.md`

## Global Constraints

- 스키마는 `harness/observation/v1`을 유지한다 — additive 변경이며 bump하지 않는다.
- `buildEnvelope`는 수정하지 않는다. `error`는 pass-through다.
- `alternatives`는 `string[]`(빈 배열 허용), `safe_default`는 비어 있지 않은 `string`.
- JSON 엔벨로프를 내보내는 생산자는 `cause`에 **string만** 넘긴다. 배열 형태는 text 전용
  (`runDone` 가드의 issue별 출력 보존용)이며 Task 9의 pin 테스트가 이를 고정한다.
- text 미러 줄 이름: `cause:` · `retry:` · `alternatives:` · `default:` · `stop:`.
- `src/commands/*.mjs`에는 리터럴 `root_cause:`가 남지 않는다(Task 9의 grep pin).
- `docs/harness-overview-<version>.html` 12개 스냅샷은 동결본이다 — 건드리지 않는다.
  생성기는 `docs/harness-overview.html` 하나만 쓴다.
- 기준 커밋 `a0266b2`. 시작 상태: `npm test` → 580 tests / 579 pass / 0 fail / 1 skipped, perf 1/1.
- 커밋 직후 post-commit 훅이 `docs/hslee/hslee-handoff.md`·
  `docs/hslee/escalation-packet-fields/escalation-packet-fields-handoff.md`를 다시 더럽힌다 →
  코드 커밋에서는 `git checkout -- <두 파일>`로 되돌린다.

---

### Task 1: `buildErrorPacket` · `renderErrorPacket`

**Files:**
- Modify: `src/observation.mjs` (28행 전체 — 함수 2개 추가)
- Test: `tests/observation.test.mjs`

**Interfaces:**
- Produces:
  - `buildErrorPacket({ cause, retry, alternatives = [], safeDefault, stop })`
    → `{ root_cause, safe_retry, alternatives, safe_default, stop_condition }`.
    `cause`는 비어 있지 않은 string 또는 비어 있지 않은 string[]. `retry`·`safeDefault`·`stop`은
    비어 있지 않은 string. `alternatives`는 string[]. 위반 시 `TypeError`.
  - `renderErrorPacket(packet)` → `string[]`.

- [x] **Step 1: RED — 테스트를 먼저 쓴다**

`tests/observation.test.mjs` 상단 import를 바꾸고 테스트 5개를 파일 끝에 추가한다.

```js
// 기존: import { buildEnvelope, OBSERVATION_SCHEMA } from '../src/observation.mjs';
import { buildEnvelope, buildErrorPacket, renderErrorPacket, OBSERVATION_SCHEMA } from '../src/observation.mjs';
```

```js
// escalation packet (권고 ③) — PDF §V.A의 5항목 중 "시도한 대안"과 "무응답 시 안전 기본값".
// 강제는 이 헬퍼가 전담한다. buildEnvelope는 error를 그대로 통과시키는 성질을 유지한다.
test('buildErrorPacket: 5키 패킷 — alternatives 기본값은 빈 배열', () => {
  const packet = buildErrorPacket({ cause: 'c', retry: 'r', safeDefault: 'd', stop: 's' });
  assert.deepEqual(packet, {
    root_cause: 'c',
    safe_retry: 'r',
    alternatives: [],
    safe_default: 'd',
    stop_condition: 's',
  });
});

test('buildErrorPacket: 필수 필드 누락·빈 문자열·잘못된 타입은 throw (생산자 실수를 개발 시점에)', () => {
  assert.throws(() => buildErrorPacket({ cause: 'c', retry: 'r', stop: 's' }), /safeDefault/);
  assert.throws(() => buildErrorPacket({ cause: '', retry: 'r', safeDefault: 'd', stop: 's' }), /cause/);
  assert.throws(() => buildErrorPacket({ cause: [], retry: 'r', safeDefault: 'd', stop: 's' }), /cause/);
  assert.throws(() => buildErrorPacket({ cause: 'c', retry: 'r', safeDefault: 'd', stop: '' }), /stop/);
  assert.throws(
    () => buildErrorPacket({ cause: 'c', retry: 'r', safeDefault: 'd', stop: 's', alternatives: 'x' }),
    /alternatives/,
  );
});

test('renderErrorPacket: alternatives가 비면 그 줄 자체를 찍지 않는다', () => {
  const lines = renderErrorPacket(buildErrorPacket({ cause: 'c', retry: 'r', safeDefault: 'd', stop: 's' }));
  assert.deepEqual(lines, ['cause: c', 'retry: r', 'default: d', 'stop: s']);
});

test('renderErrorPacket: alternatives는 항목마다 한 줄', () => {
  const lines = renderErrorPacket(buildErrorPacket({
    cause: 'c', retry: 'r', alternatives: ['a1', 'a2'], safeDefault: 'd', stop: 's',
  }));
  assert.deepEqual(lines, ['cause: c', 'retry: r', 'alternatives: a1', 'alternatives: a2', 'default: d', 'stop: s']);
});

// runDone 가드는 issue마다 cause 줄을 찍는다 — 배열 cause가 그 출력을 보존한다(text 전용).
test('renderErrorPacket: cause가 배열이면 항목마다 cause 줄', () => {
  const lines = renderErrorPacket(buildErrorPacket({
    cause: ['i1', 'i2'], retry: 'r', safeDefault: 'd', stop: 's',
  }));
  assert.deepEqual(lines, ['cause: i1', 'cause: i2', 'retry: r', 'default: d', 'stop: s']);
});
```

- [x] **Step 2: RED 관찰**

Run: `node --test tests/observation.test.mjs`

Expected: **파일 전체가 링크 단계에서 죽는다** —
`SyntaxError: The requested module '../src/observation.mjs' does not provide an export named 'buildErrorPacket'`.
개별 테스트 실패가 아니라 파일 단위 실패가 정상이며, 이것이 이 Task의 RED다.
"기존 N pass + 신규 M fail"로 적지 말 것 — ESM은 없는 named export를 만나면 모듈을 링크하지 못한다.

- [x] **Step 3: GREEN — 헬퍼 구현**

`src/observation.mjs` 끝에 추가한다.

```js
// escalation packet (PDF §V.A) — 사람/에이전트에게 결정을 넘길 때 함께 보내는 5항목.
// 값을 손으로 만들던 생산자마다 필드를 빠뜨릴 수 있어 강제 지점을 이 함수 하나로 모은다.
// buildEnvelope는 error를 그대로 통과시킨다(pass-through) — 강제는 여기서만 한다.
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
```

- [x] **Step 4: GREEN 관찰**

Run: `node --test tests/observation.test.mjs`
Expected: PASS (기존 테스트 + 신규 5개).

- [x] **Step 5: 커밋**

```bash
git add src/observation.mjs tests/observation.test.mjs
git commit -m "feat(observation): escalation packet 헬퍼 — alternatives·safe_default 5키 강제"
git checkout -- docs/hslee/hslee-handoff.md docs/hslee/escalation-packet-fields/escalation-packet-fields-handoff.md
```

---

### Task 2: `summary` · `observe` 지역 `fail()` 마이그레이션

**Files:**
- Modify: `src/commands/summary.mjs:6`(import), `:315-328`(`fail`), `:235,265,282,289`(호출자 4곳)
- Modify: `src/commands/observe.mjs:9`(import), `:228-240`(`fail`), `:289`(호출자 1곳)
- Test: `tests/summary.test.mjs`, `tests/observe.test.mjs`

**Interfaces:**
- Consumes: `buildErrorPacket`, `renderErrorPacket` (Task 1)
- Produces: `summary.mjs`의 `fail(json, command, summary, { cause, retry, alternatives = [], safeDefault })`,
  `observe.mjs`의 `fail(json, summary, { cause, retry, alternatives = [], safeDefault })`.
  둘 다 `stop`은 기존 고정 문자열 `'원인을 해소하기 전에는 재시도하지 말 것'`을 유지한다.

- [x] **Step 1: RED — 기존 계약 테스트에 새 필드를 요구한다**

`tests/observe.test.mjs:265` 근처의 `--days` 거부 테스트에 두 줄을 더한다.

```js
      assert.ok(Array.isArray(out.error.alternatives) && out.error.alternatives.length === 1, 'alternatives 1개');
      assert.match(out.error.alternatives[0], /--days 없이 실행하면 기본 창/);
      assert.ok(out.error.safe_default, 'safe_default는 비어 있지 않다');
```

`tests/summary.test.mjs`에서 `--write와 --check` 동시 지정 거부를 검사하는 테스트(없으면 새로 쓴다)에
같은 두 줄을 더한다.

```js
test('summary --json: --write와 --check 동시 지정 → error 패킷에 alternatives·safe_default', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-both-'));
  const cap = captureJson();
  const prev = process.exitCode;
  try {
    await runSummary({ targetDir: dir, flags: { json: true, write: true, check: true } });
    const env = cap.soleEnvelope();
    assert.equal(env.status, 'error');
    assert.ok(env.error.alternatives.length > 0, '대안이 최소 하나');
    assert.ok(env.error.safe_default, '무응답 시 남는 상태');
  } finally { cap.restore(); process.exitCode = prev; await rm(dir, { recursive: true, force: true }); }
});
```

`captureJson`·`runSummary` import가 그 파일에 없으면 `tests/observation-commands.test.mjs:14-28`의
`captureJson` 구현을 그대로 복사해 쓴다.

- [x] **Step 2: RED 관찰**

Run: `node --test tests/observe.test.mjs tests/summary.test.mjs`
Expected: FAIL — `alternatives`가 `undefined`라 `deepEqual`/`length` 접근에서 실패한다.
(import는 모두 존재하므로 이번에는 파일 링크가 아니라 개별 테스트가 실패한다.)

- [x] **Step 3: GREEN — 두 `fail()`을 헬퍼로 바꾼다**

`src/commands/observe.mjs`:

```js
import { buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../observation.mjs';
```

```js
function fail(json, summary, { cause, retry, alternatives = [], safeDefault }) {
  const packet = buildErrorPacket({
    cause, retry, alternatives, safeDefault,
    stop: '원인을 해소하기 전에는 재시도하지 말 것',
  });
  if (json) {
    emitObservation(buildEnvelope({
      command: 'observe', status: 'error', summary: `observe 실패: ${summary}`, error: packet,
    }));
  } else {
    console.log(`✗ observe: ${summary}`);
    for (const line of renderErrorPacket(packet)) console.log(line);
  }
}
```

호출자(`:289`):

```js
    return fail(json, `--days 값이 잘못됨 (${rawDays})`, {
      cause: `--days는 1..${OBSERVE_MAX_DAYS} 정수만 허용 (훅 보존 기간 ${OBSERVE_MAX_DAYS}일)`,
      retry: `1..${OBSERVE_MAX_DAYS} 범위의 정수를 주고 재실행`,
      alternatives: [`--days 없이 실행하면 기본 창(${OBSERVE_DEFAULT_DAYS}일)으로 스코어카드를 낸다`],
      safeDefault: '스코어카드를 내지 않고 종료한다 — 로그 파일은 읽지도 쓰지도 않는다',
    });
```

Step 1의 테스트 기대 문자열을 이 `alternatives` 실제 값과 정확히 맞춘다
(`OBSERVE_DEFAULT_DAYS` 실제 값을 `src/commands/observe.mjs`에서 확인해 테스트에 하드코딩).

`src/commands/summary.mjs`도 같은 형태로 바꾼다.

```js
import { buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../observation.mjs';
```

```js
function fail(json, command, summary, { cause, retry, alternatives = [], safeDefault }) {
  const packet = buildErrorPacket({
    cause, retry, alternatives, safeDefault,
    stop: '원인을 해소하기 전에는 재시도하지 말 것',
  });
  if (json) {
    emitObservation(buildEnvelope({
      command, status: 'error', summary: `summary 실패: ${summary}`, error: packet,
    }));
  } else {
    console.log(`✗ ${command}: ${summary}`);
    for (const line of renderErrorPacket(packet)) console.log(line);
  }
}
```

호출자 4곳의 값(기존 3·4번째 위치 인자를 `cause`·`retry`로 옮기고 2필드 추가):

```js
// :235 --write + --check
    return fail(json, 'summary', '--write와 --check는 함께 쓸 수 없음', {
      cause: '--check는 mutation 없이 검사만 하고 --write는 파일을 고치므로 동시에 성립하지 않음',
      retry: '검사만 하려면 `--check`, 갱신하려면 `--write` 중 하나만 지정',
      alternatives: ['플래그 없이 실행하면 렌더 결과를 stdout으로만 내보낸다 — 파일은 건드리지 않는다'],
      safeDefault: '원장 파일은 하나도 바뀌지 않는다',
    });

// :265 원장 stale
      return fail(json, 'summary', `원장이 task 디렉터리와 어긋남 (${stale.length}개)`, {
        cause: `${stale.join(', ')} 의 내용이 렌더 결과와 다름`,
        retry: '기본 브랜치에서 `harness-team summary --write` 실행 후 커밋',
        alternatives: ['feature 브랜치에서 확인만 하려면 `--write --force` 대신 플래그 없이 실행해 렌더 결과를 직접 비교한다'],
        safeDefault: '원장은 어긋난 상태 그대로 남는다 — 검사만 했고 아무것도 쓰지 않았다',
      });

// :282 브랜치 조회 실패
    return fail(json, 'summary', '현재 브랜치를 확인할 수 없어 원장을 쓰지 않음', {
      cause: 'git 저장소로 보이지만 브랜치 조회가 실패함 — feature 브랜치일 수 있고, 그렇다면 병렬 브랜치끼리 충돌이 되살아남',
      retry: 'git 상태를 복구한 뒤 재실행',
      alternatives: ['기본 브랜치임을 확신하면 `--force`로 가드를 무시한다 — 병렬 브랜치 충돌은 사용자 책임이 된다'],
      safeDefault: '원장 파일은 하나도 바뀌지 않는다',
    });

// :289 기본 브랜치 아님
    return fail(json, 'summary', `기본 브랜치가 아니라 원장을 쓰지 않음 (현재: ${state.name})`, {
      cause: `공유 원장을 feature 브랜치에서 갱신하면 병렬 브랜치끼리 다시 충돌함 (기본 브랜치: ${bases.join(' 또는 ')})`,
      retry: `\`${bases[0]}\` 로 전환한 뒤 \`harness-team summary --write\` 실행`,
      alternatives: ['머지 직후 워크트리에서 갱신해야 하면 `--force`로 가드를 무시하고 `git push origin HEAD:main` 으로 올린다'],
      safeDefault: '원장 파일은 하나도 바뀌지 않는다',
    });
```

- [x] **Step 4: GREEN 관찰**

Run: `node --test tests/observe.test.mjs tests/summary.test.mjs`
Expected: PASS.

- [x] **Step 5: 커밋**

```bash
git add src/commands/summary.mjs src/commands/observe.mjs tests/summary.test.mjs tests/observe.test.mjs
git commit -m "feat(summary,observe): escalation packet 헬퍼로 마이그레이션"
git checkout -- docs/hslee/hslee-handoff.md docs/hslee/escalation-packet-fields/escalation-packet-fields-handoff.md
```

---

### Task 3: `rules` — promote `fail()` 7곳 + invalid-action JSON

**Files:**
- Modify: `src/commands/rules.mjs:4`(import), `:145-162`(`fail`), `:193,205,217,226,235,248,266`(호출자 7곳), `:305-320`(invalid-action)
- Test: `tests/rules.test.mjs:288,449`

**Interfaces:**
- Consumes: `buildErrorPacket`, `renderErrorPacket` (Task 1)
- Produces: `fail(ctx, { code, cause, retry, alternatives = [], safeDefault, stop, exitCode = 2 })`

- [x] **Step 1: RED**

`tests/rules.test.mjs:288`과 `:449`의 3키 truthy 검사 다음 줄에 각각 추가한다.

```js
    assert.ok(Array.isArray(env.error.alternatives), 'alternatives는 배열');
    assert.ok(env.error.safe_default, 'safe_default는 비어 있지 않다');
```

- [x] **Step 2: RED 관찰**

Run: `node --test tests/rules.test.mjs`
Expected: FAIL 2건 — `alternatives`가 `undefined`.

- [x] **Step 3: GREEN**

```js
import { buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../observation.mjs';
```

```js
// retro·task와 같은 escalation packet 계약. exitCode 기본 2(인수·상태 거부), 활성 task 없음만 1(retro와 동일).
function fail(ctx, { code, cause, retry, alternatives = [], safeDefault, stop, exitCode = 2 }) {
  process.exitCode = exitCode;
  const packet = buildErrorPacket({ cause, retry, alternatives, safeDefault, stop });
  if (ctx.flags?.json) {
    emitObservation(buildEnvelope({
      command: 'rules',
      status: 'error',
      summary: `rules promote 실패: ${code}`,
      error: packet,
      extra: { action: 'promote', code },
    }));
  } else {
    console.log(`✗ rules promote: ${code}`);
    for (const line of renderErrorPacket(packet)) console.log(line);
  }
  return { status: 'error', code };
}
```

호출자 7곳에 `alternatives`·`safeDefault`를 더한다(기존 `cause`/`retry`/`stop`은 그대로).

```js
// :193 no-active-task
      alternatives: ['다른 task의 artifact에서 승격하려면 그 task를 먼저 활성화한다 — 활성 task 없이 승격하는 경로는 없다'],
      safeDefault: '규칙 파일도 artifact 표기도 만들어지지 않는다',

// :205 no-artifact
      alternatives: ['artifact.md 없이 규칙을 바로 쓰려면 `.claude/rules/<slug>.md` 를 직접 만들고 `harness-team sync` 로 미러한다 — 유래 마커는 수동으로 붙여야 한다'],
      safeDefault: '규칙 파일도 artifact 표기도 만들어지지 않는다',

// :217 invalid-index
      alternatives: ['번호 대신 목록을 먼저 보려면 `harness-team rules promote` 를 인자 없이 실행한다'],
      safeDefault: '규칙 파일도 artifact 표기도 만들어지지 않는다',

// :226 already-promoted
      alternatives: ['같은 학습을 다른 각도로 승격하려면 artifact에 새 Learnings 항목을 추가한 뒤 그 번호를 고른다'],
      safeDefault: '기존 규칙 파일과 artifact 표기가 그대로 남는다',

// :235 invalid-name
      alternatives: ['이름을 정하기 어려우면 artifact의 학습 제목을 kebab-case로 옮겨 쓴다'],
      safeDefault: '규칙 파일도 artifact 표기도 만들어지지 않는다',

// :248 rule-exists
      alternatives: ['기존 규칙을 대체할 의도면 그 파일을 직접 편집하고 유래 마커에 이번 항목을 덧붙인다'],
      safeDefault: '기존 규칙 파일이 그대로 보존된다 — 덮어쓰지 않았다',

// :266 artifact-write-failed
      alternatives: ['artifact 쓰기가 계속 실패하면 규칙 파일만 수동으로 만들고 표기를 손으로 추가한다 — 표기 없는 규칙은 재승격을 막지 못한다'],
      safeDefault: `${relRule} 은 되돌렸고 ${relArtifact} 도 바뀌지 않았다 — 승격 전 상태다`,
```

invalid-action(`:305-320`)은 **JSON 분기만** 패킷으로 바꾼다. text 분기는 그대로 둔다 —
`tests/rules.test.mjs:308`이 `logs[1]`을 `usage: …`로 고정하고 있고, 사용법 오류는 escalation이 아니다.

```js
      error: buildErrorPacket({
        cause: `알 수 없는 하위동작 ${JSON.stringify(action ?? null)} — 지원: promote`,
        retry: `\`${USAGE}\` 로 다시 실행`,
        alternatives: ['하위동작 목록만 보려면 인자 없이 `harness-team rules promote` 를 실행한다'],
        safeDefault: '아무 파일도 읽거나 쓰지 않고 종료한다',
        stop: '하위동작이 promote 가 아니면 아무것도 쓰지 않는다',
      }),
```

- [x] **Step 4: GREEN 관찰**

Run: `node --test tests/rules.test.mjs`
Expected: PASS — 특히 `:308`의 `usage:` 고정 테스트가 여전히 통과해야 한다.

- [x] **Step 5: 커밋**

```bash
git add src/commands/rules.mjs tests/rules.test.mjs
git commit -m "feat(rules): escalation packet 헬퍼로 마이그레이션 (invalid-action은 JSON만)"
git checkout -- docs/hslee/hslee-handoff.md docs/hslee/escalation-packet-fields/escalation-packet-fields-handoff.md
```

---

### Task 4: `release` — `ERROR_ADVICE` 표 확장

**Files:**
- Modify: `src/commands/release.mjs:6`(import), `:452-467`(catch), `:469-496`(`ERROR_ADVICE`)
- Test: `tests/observation-commands.test.mjs:68`

**Interfaces:**
- Consumes: `buildErrorPacket`, `renderErrorPacket` (Task 1)
- Produces: `ERROR_ADVICE[kind] = { cause, retry, alternatives, safeDefault, stop }` (5종)

- [x] **Step 1: 사전 확인 — "무변경"이 사실인지 본다**

Run: `grep -n "writeFile\|await write" src/commands/release.mjs | head -20`
`version-mismatch`·`bad-bump`·`schema`·`manifest-format`이 **쓰기 이전**의 검증에서 throw하는지
확인한다. 쓰기 이후에도 throw할 수 있으면 그 kind의 `safeDefault`를 아래 문구 대신
`'실패 시점까지의 변경이 남을 수 있다 — `git status` 로 확인한 뒤 되돌리고 재실행'`으로 바꾼다.

- [x] **Step 2: RED**

`tests/observation-commands.test.mjs:68`의 3키 truthy 검사 다음 줄에 추가한다.

```js
    assert.ok(Array.isArray(env.error.alternatives), 'alternatives는 배열');
    assert.ok(env.error.safe_default, 'safe_default는 비어 있지 않다');
```

- [x] **Step 3: RED 관찰**

Run: `node --test tests/observation-commands.test.mjs`
Expected: FAIL 1건 (release 에러 테스트).

- [x] **Step 4: GREEN**

```js
import { buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../observation.mjs';
```

catch 블록:

```js
  } catch (err) {
    process.exitCode = 1;
    const advice = ERROR_ADVICE[err.kind] || ERROR_ADVICE.generic;
    const packet = buildErrorPacket(advice);
    if (json) {
      emitObservation(buildEnvelope({
        command: 'release',
        status: 'error',
        summary: `release 실패: ${err.message}`,
        error: packet,
      }));
    } else {
      console.log(`✗ release: ${err.message}`);
      for (const line of renderErrorPacket(packet)) console.log(line);
    }
  }
```

`ERROR_ADVICE` 5종에 2필드를 더한다(`cause`/`retry`/`stop` 기존 문구 유지).

```js
  'version-mismatch': {
    alternatives: ['`git log -p -- package.json` 으로 마지막 합의된 버전을 확인해 네 파일을 그 값으로 맞춘다'],
    safeDefault: '매니페스트·태그·커밋 어느 것도 만들어지지 않는다',
  },
  'bad-bump': {
    alternatives: ['버전을 직접 고르지 말고 `major|minor|patch` 중 하나를 주어 자동 계산에 맡긴다'],
    safeDefault: '버전은 현재 값 그대로 남는다',
  },
  schema: {
    alternatives: ['동반 플러그인 항목이 원인이면 그 항목은 그대로 두고 자기 항목만 1개로 정리한다 — 핀은 source.sha로 표현한다'],
    safeDefault: '매니페스트·마켓플레이스 파일 모두 바뀌지 않는다',
  },
  'manifest-format': {
    alternatives: ['손으로 정규화하기 어려우면 마지막 정상 커밋에서 그 파일만 복원한 뒤 재실행한다'],
    safeDefault: '자동 치환을 중단했으므로 파일은 원래 내용 그대로다',
  },
  generic: {
    alternatives: [],
    safeDefault: '실패 시점까지의 변경이 남을 수 있다 — `git status` 로 확인한 뒤 되돌리고 재실행',
  },
```

- [x] **Step 5: GREEN 관찰**

Run: `node --test tests/observation-commands.test.mjs tests/release.test.mjs`
Expected: PASS.

- [x] **Step 6: 커밋**

```bash
git add src/commands/release.mjs tests/observation-commands.test.mjs
git commit -m "feat(release): ERROR_ADVICE 표에 alternatives·safe_default 추가"
git checkout -- docs/hslee/hslee-handoff.md docs/hslee/escalation-packet-fields/escalation-packet-fields-handoff.md
```

---

### Task 5: `task` — bad-name · retro no-active

**Files:**
- Modify: `src/commands/task.mjs:7`(import), `:205-228`(bad-name), `:657-680`(retro no-active)
- Test: `tests/observation-commands.test.mjs:54,99`

**Interfaces:**
- Consumes: `buildErrorPacket`, `renderErrorPacket` (Task 1)

- [x] **Step 1: RED**

`tests/observation-commands.test.mjs:54`(retro no-active)와 `:99`(task bad-name)의 truthy 검사
다음 줄에 각각 추가한다.

```js
    assert.ok(Array.isArray(env.error.alternatives), 'alternatives는 배열');
    assert.ok(env.error.safe_default, 'safe_default는 비어 있지 않다');
```

- [x] **Step 2: RED 관찰**

Run: `node --test tests/observation-commands.test.mjs`
Expected: FAIL 2건.

- [x] **Step 3: GREEN**

```js
import { buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../observation.mjs';
```

bad-name(`:210-228`) — JSON·text 두 분기를 하나의 패킷에서 낸다.

```js
    const packet = buildErrorPacket({
      cause: rootCause,
      retry: '`harness-team task <name>` 형식으로 영숫자·_·.·- 만 사용한 이름을 주고 재실행',
      alternatives: ['기존 task를 이어서 하려면 `harness-team task <기존 이름>` 으로 활성화한다 — 새로 만들지 않는다'],
      safeDefault: 'task 디렉터리도 .harness/active.json 도 만들어지지 않는다',
      stop: '이름 규칙(^[\\w.-]+$)을 만족하지 못하면 생성하지 말 것',
    });
    if (json) {
      emitObservation(buildEnvelope({
        command: 'task',
        status: 'error',
        summary: 'task 생성/활성화 실패: 잘못된 task 이름',
        error: packet,
      }));
    } else {
      console.log(`✗ task: 잘못된 task 이름`);
      for (const line of renderErrorPacket(packet)) console.log(line);
    }
    return;
```

retro no-active(`:661-680`):

```js
    const packet = buildErrorPacket({
      cause: '.harness/active.json 에 활성 task가 없어 append 대상 artifact.md를 찾을 수 없음',
      retry: '`harness-team task <name>` 로 task를 활성화한 뒤 다시 실행',
      alternatives: ['학습을 잃고 싶지 않으면 대상 task의 artifact.md 를 직접 열어 `## Learnings` 에 손으로 추가한다'],
      safeDefault: 'artifact.md 는 어느 것도 바뀌지 않고 학습은 기록되지 않는다',
      stop: 'task가 하나도 없으면 먼저 task를 생성하라',
    });
    if (json) {
      emitObservation(buildEnvelope({
        command: 'retro',
        status: 'error',
        summary: 'retro 실패: 활성 task 없음',
        error: packet,
      }));
    } else {
      console.log(`✗ retro: 활성 task 없음`);
      for (const line of renderErrorPacket(packet)) console.log(line);
    }
    return;
```

주의: text 분기의 문구가 기존과 달라진다(bad-name의 `retry:`가 이제 JSON과 같은 문장이 된다).
기존 text 출력을 문자열로 고정한 테스트가 있는지 `grep -rn "잘못된 task 이름" tests`로 확인하고,
있으면 새 문구에 맞춘다.

- [x] **Step 4: GREEN 관찰**

Run: `node --test tests/observation-commands.test.mjs tests/task.test.mjs`
Expected: PASS.

- [x] **Step 5: 커밋**

```bash
git add src/commands/task.mjs tests/observation-commands.test.mjs
git commit -m "feat(task): bad-name·retro no-active를 escalation packet 헬퍼로"
git checkout -- docs/hslee/hslee-handoff.md docs/hslee/escalation-packet-fields/escalation-packet-fields-handoff.md
```

---

### Task 6: `runDone` 가드 — 배열 cause로 N줄 출력 보존

**Files:**
- Modify: `src/commands/task.mjs:611-625`
- Test: `tests/task.test.mjs` (done 가드 테스트)

**Interfaces:**
- Consumes: `buildErrorPacket`, `renderErrorPacket` (Task 1)
- 이 지점은 `--json` 분기가 없다 — 범위 밖이므로 추가하지 않는다.

- [x] **Step 1: RED**

`tests/task.test.mjs`에 done 가드 출력 테스트를 추가한다(기존 가드 테스트가 있으면 그 옆에).

```js
// setup은 기존 done 가드 테스트에서 그대로 가져온다 — `grep -n "runDone" tests/task.test.mjs` 로
// 가드에 걸리는 fixture를 찾아 복사한다. collectDoneIssues 는 plan 체크박스 외에도 여러 증거를
// 보므로 fixture를 새로 지어내면 가드에 안 걸려 테스트가 조용히 무의미해진다.
test('done 가드: issue별 cause 줄을 보존하고 alternatives·default 줄을 낸다', async () => {
  const dir = await makeGuardedTaskFixture(); // ← 기존 테스트의 setup을 그대로 재사용
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  const prev = process.exitCode;
  try {
    await runDone({ targetDir: dir, flags: {} });
    const causes = logs.filter(l => l.startsWith('cause: '));
    assert.ok(causes.length >= 1, 'issue마다 cause 줄');
    assert.ok(logs.some(l => l.startsWith('alternatives: ')), 'alternatives 줄');
    assert.ok(logs.some(l => l.startsWith('default: ')), 'default 줄');
    assert.ok(logs.some(l => l.startsWith('stop: ')), 'stop 줄');
  } finally { console.log = orig; process.exitCode = prev; await rm(dir, { recursive: true, force: true }); }
});
```

- [x] **Step 2: RED 관찰**

Run: `node --test tests/task.test.mjs`
Expected: FAIL — `alternatives: ` 줄이 없다.

- [x] **Step 3: GREEN**

```js
  if (issues.length && !force) {
    process.exitCode = 1;
    console.log(`✗ done: 종결 가드에 걸림 (${issues.length}개)`);
    const packet = buildErrorPacket({
      cause: issues,
      retry: '위 항목을 해소한 뒤 다시 `harness-team done` 실행',
      alternatives: ['`harness-team done --force` 로 가드를 무시하고 종결한다 — 무시한 사유를 artifact.md 에 남길 것'],
      safeDefault: 'task는 활성으로 남고 handoff·artifact 어느 파일도 바뀌지 않는다',
      stop: '가드가 지적한 증거가 실제로 없으면 종결하지 말 것',
    });
    for (const line of renderErrorPacket(packet)) console.log(line);
    return;
  }
```

기존 `stop:` 문구(`의도적으로 무시하려면 \`harness-team done --force\``)는 `alternatives`로
옮겼다 — `stop_condition`은 "언제 멈춰야 하는가"이지 "어떻게 우회하는가"가 아니다.

- [x] **Step 4: GREEN 관찰**

Run: `node --test tests/task.test.mjs tests/e2e/*.test.mjs`
Expected: PASS. e2e에 `stop: 의도적으로 무시하려면` 문자열을 고정한 테스트가 있으면 새 문구로 고친다
(`grep -rn "의도적으로 무시하려면" tests`로 먼저 확인).

- [x] **Step 5: 커밋**

```bash
git add src/commands/task.mjs tests/task.test.mjs
git commit -m "feat(task): done 가드에 alternatives·safe_default — issue별 cause 줄 보존"
git checkout -- docs/hslee/hslee-handoff.md docs/hslee/escalation-packet-fields/escalation-packet-fields-handoff.md
```

---

### Task 7: `doctor`

> **실행 중 변경**: Task 5와 한 커밋(`9a9e7ea`)으로 묶었다 — 둘 다 같은 모양의 인라인
> 리터럴 치환이고 RED 어서션이 `tests/observation-commands.test.mjs` 한 파일에 함께 있어,
> 리뷰어가 한쪽만 기각할 수 있는 경계가 아니다.

**Files:**
- Modify: `src/commands/doctor.mjs:8`(import), `:685-691`
- Test: `tests/observation-commands.test.mjs:131`

**Interfaces:**
- Consumes: `buildErrorPacket` (Task 1)

- [x] **Step 1: RED**

`tests/observation-commands.test.mjs:131`의 검사에 추가한다.

```js
    assert.ok(Array.isArray(env.error.alternatives), 'alternatives는 배열');
    assert.ok(env.error.safe_default, 'safe_default는 비어 있지 않다');
```

- [x] **Step 2: RED 관찰**

Run: `node --test tests/observation-commands.test.mjs`
Expected: FAIL 1건 (doctor).

- [x] **Step 3: GREEN**

```js
import { buildEnvelope, buildErrorPacket, emitObservation } from '../observation.mjs';
```

```js
      error: fail ? buildErrorPacket({
        cause: `${fail}개 필수 점검 항목 실패 (checks[]의 status:"fail" 참조)`,
        retry: 'checks[]의 fail 항목을 해소한 뒤 harness-team sync 실행 후 재점검',
        alternatives: ['구조가 구버전이면 `harness-team migrate`, 파일이 아예 없으면 `harness-team init` 으로 복구한다'],
        safeDefault: 'doctor는 읽기 전용이다 — 아무것도 고치지 않고 실패 목록만 남긴다',
        stop: '필수 파일/스크립트 누락이면 harness-team init 또는 migrate로 복구',
      }) : null,
```

`doctor.mjs`는 text 분기에서 `cause:` 줄을 찍지 않으므로 `renderErrorPacket`은 import하지 않는다.

- [x] **Step 4: GREEN 관찰**

Run: `node --test tests/observation-commands.test.mjs tests/doctor.test.mjs`
Expected: PASS.

- [x] **Step 5: 커밋**

```bash
git add src/commands/doctor.mjs tests/observation-commands.test.mjs
git commit -m "feat(doctor): 에러 엔벨로프를 escalation packet 헬퍼로"
git checkout -- docs/hslee/hslee-handoff.md docs/hslee/escalation-packet-fields/escalation-packet-fields-handoff.md
```

---

### Task 8: 회귀 방지 pin 테스트

**Files:**
- Test: `tests/observation.test.mjs` (파일 끝에 추가)

**Interfaces:**
- Consumes: Task 2~7이 끝난 상태의 `src/commands/*.mjs`

- [x] **Step 1: 테스트를 쓴다 (이 시점에는 이미 GREEN이어야 한다 — 회귀 방지용 pin)**

```js
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 생산자가 리터럴로 error 객체를 만들면 새 필드를 빠뜨린 채 통과한다 —
// 강제 지점은 buildErrorPacket 하나여야 한다. observation.mjs 자신과 테스트는 정당한 예외라
// scope를 src/commands/ 로 한정한다.
test('pin: src/commands/*.mjs 는 리터럴 root_cause: 를 쓰지 않는다 (헬퍼 경유만)', async () => {
  const dir = join(ROOT, 'src', 'commands');
  const files = (await readdir(dir)).filter(f => f.endsWith('.mjs'));
  assert.ok(files.length >= 6, `명령 파일이 있어야 함, got ${files.length}`);
  const offenders = [];
  for (const f of files) {
    const src = await readFile(join(dir, f), 'utf8');
    if (/root_cause\s*:/.test(src)) offenders.push(f);
  }
  assert.deepEqual(offenders, [], `리터럴 root_cause: 를 쓰는 생산자: ${offenders.join(', ')}`);
});

// JSON 엔벨로프로 나가는 root_cause 는 string 이다. 배열 형태는 runDone 가드의
// text 전용 출력에만 쓴다 — 소비자가 두 타입을 분기하지 않게 한다.
test('pin: 엔벨로프로 나가는 root_cause 는 string (배열은 text 전용)', () => {
  const packet = buildErrorPacket({ cause: ['a', 'b'], retry: 'r', safeDefault: 'd', stop: 's' });
  assert.ok(Array.isArray(packet.root_cause), '헬퍼는 배열을 그대로 보존한다');
  const env = buildEnvelope({ command: 'x', status: 'error', summary: 's', error: packet });
  assert.equal(env.error, packet, 'buildEnvelope 는 error 를 정규화하지 않는다 (pass-through)');
});
```

- [x] **Step 2: 관찰**

Run: `node --test tests/observation.test.mjs`
Expected: PASS. 실패하면 Task 2~7에서 놓친 생산자가 있다는 뜻이므로 그 파일로 돌아간다.

- [x] **Step 3: 변이로 pin이 실제로 잡는지 확인**

`src/commands/doctor.mjs`의 `buildErrorPacket({` 호출을 일시적으로
`{ root_cause: 'x', safe_retry: 'y', stop_condition: 'z' }` 리터럴로 바꾸고 위 테스트를 돌린다.
Expected: FAIL(`리터럴 root_cause: 를 쓰는 생산자: doctor.mjs`). 확인 후 **원복**한다.

- [x] **Step 4: 전체 스위트**

Run: `npm test`
Expected: 0 fail. 총 테스트 수는 580보다 커진다(신규 추가분).

- [x] **Step 5: 커밋**

```bash
git add tests/observation.test.mjs
git commit -m "test(observation): 리터럴 root_cause 금지 pin + pass-through 계약 고정"
git checkout -- docs/hslee/hslee-handoff.md docs/hslee/escalation-packet-fields/escalation-packet-fields-handoff.md
```

---

### Task 9: `CLAUDE.md` §5-A — 사람용 escalation 패킷

**Files:**
- Modify: `templates/CLAUDE.md.hbs:52-62`
- Modify: `CLAUDE.md` (같은 구획 — 템플릿 렌더 결과와 바이트 동일해야 한다)
- Test: `tests/agent-files.test.mjs`

**Interfaces:**
- 독립 Task — Task 1~8과 코드 의존이 없다.

- [x] **Step 1: RED**

`tests/agent-files.test.mjs`에 추가한다.

```js
// 권고 ③ (PDF §V.A "Escalation Is Not Failure") — 사람에게 넘길 때도 기계용 엔벨로프와
// 같은 5항목을 준다. 1줄 권유만 남으면 사용자는 대안도, 안 답했을 때 남는 상태도 모른다.
test('CLAUDE.md(thin) §5-A는 escalation 패킷 5항목을 규정한다', async () => {
  const out = render(await tpl('CLAUDE.md.hbs'), VARS);
  for (const item of ['결정 요청', '권장안', '시도한 대안', '기다림의 비용', '안전 기본값'])
    assert.match(out, new RegExp(item), `§5-A 패킷 항목: ${item}`);
  assert.doesNotMatch(out, /사용자에게 1줄 권유/, '1줄 권유 문구는 패킷으로 대체된다');
});

// 레포도 자기 하네스를 쓴다 — 스캐폴드본과 레포본이 어긋나면 드리프트다.
test('레포 CLAUDE.md의 workflow 구획은 템플릿 렌더 결과와 동일하다', async () => {
  const rendered = render(await tpl('CLAUDE.md.hbs'), VARS);
  const cut = s => {
    const b = s.indexOf('<!-- harness:section="workflow" begin -->');
    const e = s.indexOf('<!-- harness:section="workflow" end -->');
    assert.ok(b >= 0 && e > b, 'workflow 마커 쌍이 있어야 함');
    return s.slice(b, e);
  };
  assert.equal(cut(await readFile(join(ROOT, 'CLAUDE.md'), 'utf8')), cut(rendered));
});
```

- [x] **Step 2: RED 관찰**

Run: `node --test tests/agent-files.test.mjs`
Expected: FAIL 1건(§5-A 패킷 항목 없음). 두 번째 테스트는 이 시점에 **PASS**한다
(현재 두 파일이 이미 동일하기 때문) — Step 3에서 한쪽만 고치면 이 테스트가 잡는다.

- [x] **Step 3: GREEN — 템플릿 §5-A 교체**

`templates/CLAUDE.md.hbs`의 "이때 Claude가 직접 하는 것" 블록을 아래로 교체한다.

```markdown
이때 Claude가 직접 하는 것:
1. 기존 레버로 먼저 대응 — 플랜 모드 진입, 서브에이전트로 분할, 페르소나 호출(§5)
2. 멈추고 **escalation 패킷 5항목**을 사용자에게 준다 — escalation은 실패가 아니라 구조화된 인계다:
   - **결정 요청**: 사용자가 지금 정해야 하는 것 한 가지
   - **권장안**: Claude가 미는 선택지와 근거 한 줄
   - **시도한 대안**: 이미 검토·기각한 경로와 기각 이유
   - **기다림의 비용**: 답을 기다리는 동안 무엇이 막히는가
   - **안전 기본값**: 답이 없으면 남는 상태 (기본은 "아무것도 바꾸지 않고 멈춤")
   모델·effort 전환이 필요하면 권장안에 담는다 — `/model opus`(또는 `/fast`) 전환 또는 `/advisor` 실행.

- **Why:** 모델·effort·advisor 전환은 Claude 권한 밖(사용자/harness 소관)이라 자기실행 지시는 준수 불가능.
  감지해서 **결정 가능한 형태로** 넘기는 것까지가 Claude의 역할이다 — 1줄 권유만으로는 사용자가
  대안도, 안 답했을 때의 결과도 알 수 없다. 기계용 엔벨로프의 `error` 5필드와 같은 모양이다.
- **How to apply:** 위 조건 충족 시 1회. 작은 버그·문서 수정에는 생략.
```

- [x] **Step 4: 저장소 `CLAUDE.md` 동기**

```bash
node -e "
const fs=require('fs');
const t=fs.readFileSync('templates/CLAUDE.md.hbs','utf8');
const c=fs.readFileSync('CLAUDE.md','utf8');
const B='<!-- harness:section=\"workflow\" begin -->', E='<!-- harness:section=\"workflow\" end -->';
const seg=s=>s.slice(s.indexOf(B), s.indexOf(E));
fs.writeFileSync('CLAUDE.md', c.slice(0,c.indexOf(B))+seg(t)+c.slice(c.indexOf(E)));
console.log('synced');
"
```

템플릿에 Handlebars 변수(`{{...}}`)가 §5-A 구획에 없음을 먼저 확인한다
(`grep -n '{{' templates/CLAUDE.md.hbs | sed -n '1,40p'`). 있으면 위 복사 대신 `render` 결과를 써야 한다.

- [x] **Step 5: GREEN 관찰**

Run: `node --test tests/agent-files.test.mjs`
Expected: PASS. **실행 중 변경**: 계획의 두 번째 테스트(레포본↔템플릿 동기화)는 만들지 않았다 —
`tests/agent-files.test.mjs`에 이미 `저장소 루트 CLAUDE.md는 렌더된 템플릿의 관리 절과
드리프트하지 않는다`가 있어 같은 것을 고정하므로 중복이다. 내용 테스트 1건만 추가했다. 그리고 `node --test tests/*.test.mjs`로 §5-A 문구를 고정한 다른 테스트가
깨지지 않았는지 확인한다(`grep -rn "1줄 권유" tests templates commands skills`로 사전 확인).

- [x] **Step 6: 커밋**

```bash
git add templates/CLAUDE.md.hbs CLAUDE.md tests/agent-files.test.mjs
git commit -m "feat(templates): CLAUDE.md §5-A를 escalation 패킷 5항목으로"
git checkout -- docs/hslee/hslee-handoff.md docs/hslee/escalation-packet-fields/escalation-packet-fields-handoff.md
```

---

### Task 10: 문서 표면 동시 갱신

**Files:**
- Modify: `docs/harness-overview.template.html:379,394`
- Generate: `docs/harness-overview.html` (`npm run docs:generate`)
- Modify: `skills/harness-team/SKILL.md:51`
- Modify: `CHANGELOG.md` (`## [Unreleased]` 아래)

**Interfaces:**
- Consumes: Task 1~9의 최종 계약.

- [x] **Step 1: overview 템플릿 — 엔벨로프 스키마 예시**

`docs/harness-overview.template.html:379`의 한 줄에서 3키를 5키로 바꾼다.

```html
  <span style="color:#50c8f5">"error"</span>: <span style="color:#7a82a0">null</span> | { <span style="color:#50c8f5">"root_cause"</span>, <span style="color:#50c8f5">"safe_retry"</span>, <span style="color:#50c8f5">"alternatives"</span>, <span style="color:#50c8f5">"safe_default"</span>, <span style="color:#50c8f5">"stop_condition"</span> }
```

`:394`의 산문도 고친다.

```html
        <p>created / activated / no-active / bad-name 분기마다 엔벨로프. 에러 경로도 <code>root_cause</code> + <code>safe_retry</code> + <code>alternatives</code> + <code>safe_default</code> + <code>stop_condition</code>로 정합 — PDF §V.A escalation 패킷 5항목.</p>
```

- [x] **Step 2: 생성물 재생성**

```bash
npm run docs:generate && npm run docs:check
```

Expected: `docs:check`가 최신이라고 답한다. `docs/harness-overview-<version>.html` 12개는
`git status`에 나타나지 않아야 한다 — 나타나면 생성기 범위를 잘못 건드린 것이다.

- [x] **Step 3: `skills/harness-team/SKILL.md:51`**

```markdown
- `error.root_cause`, `error.safe_retry`, `error.alternatives`, `error.safe_default`, `error.stop_condition` on failure
```

- [x] **Step 4: CHANGELOG `[Unreleased]`**

```markdown
## [Unreleased]

### Added
- escalation packet 2필드 — `--json` 엔벨로프의 `error`에 `alternatives`(취할 수 있는 다른 행동)와
  `safe_default`(응답이 없을 때 남는 상태)를 더했다. 스키마는 `harness/observation/v1` 유지(additive).
- `CLAUDE.md` §5-A 복잡도 게이트가 escalation 패킷 5항목(결정 요청·권장안·시도한 대안·기다림의
  비용·안전 기본값)을 규정한다 — 기존 "1줄 권유"를 대체한다.

### Changed
- 에러 엔벨로프를 만드는 생산자 9곳이 공용 `buildErrorPacket`/`renderErrorPacket`을 경유한다.
  필드를 빠뜨린 생산자는 `TypeError`로 즉시 드러나고, 리터럴 `root_cause:` 사용은 테스트가 막는다.
  text 미러에 `alternatives:`·`default:` 줄이 추가된다(빈 `alternatives`는 줄을 내지 않는다).
```

- [x] **Step 5: 전체 검증**

```bash
npm test && npm run docs:check
```

Expected: 0 fail · docs 최신.

- [x] **Step 6: 커밋**

```bash
git add docs/harness-overview.template.html docs/harness-overview.html skills/harness-team/SKILL.md CHANGELOG.md
git commit -m "docs: escalation packet 5필드를 overview·SKILL·CHANGELOG에 반영"
git checkout -- docs/hslee/hslee-handoff.md docs/hslee/escalation-packet-fields/escalation-packet-fields-handoff.md
```

---

### Task 11: 외부 리뷰 · shipcheck · 종결 문서

**Files:**
- Modify: `docs/hslee/escalation-packet-fields/escalation-packet-fields-artifact.md`
- Modify: `docs/hslee/escalation-packet-fields/escalation-packet-fields-context.md`

- [ ] **Step 1: codex 외부 리뷰 (백그라운드, ~7분)**

```bash
codex exec --sandbox read-only -m gpt-5.6-sol "$(cat <프롬프트 파일>)" < /dev/null
```

프롬프트는 `harness-aijient-team:harness-review` 스킬이 정본이다 — 그 문서의 공용 프롬프트에
focus(escalation packet 계약 · 생산자 마이그레이션 누락 · text 출력 회귀)만 덧붙여 파일로 저장해 넘긴다.
read-only 샌드박스는 `mkdtemp EPERM`이라 I/O 테스트를 돌리지 못한다 — 작성 세션의 `npm test`
출력이 증거다. 로그의 `codex_models_manager … failed to renew cache TTL` ERROR 줄은 무해하다.

- [ ] **Step 2: 발견을 RED 테스트로 재현한 뒤 반영/기각**

각 발견을 심각도·판정(반영/기각)·근거와 함께 `artifact.md`의 `## Reviews`에 판별표로 남긴다.
직전 task `docs/hslee/retro-rules-promotion/retro-rules-promotion-artifact.md`의 형식을 따른다.

- [ ] **Step 3: shipcheck (같은 엔진, S1~S5 루브릭, `kind=codex-shipcheck`, ~6분)**

지적이 문서 정합이면 정정 후 재검증한다.

- [ ] **Step 4: `harness-team ship`으로 spec·plan·artifact 최종 갱신**

다이어그램은 이 task에서 옵트인하지 않았으므로 갱신 대상이 아니다.

- [ ] **Step 5: 최종 검증 + 커밋**

```bash
npm test && npm run docs:check
git add docs/hslee/escalation-packet-fields/
git commit -m "docs(task): escalation-packet-fields — 리뷰·shipcheck 기록, ship 준비 완료"
```

- [ ] **Step 6: push·PR은 사용자 지시 후**

```bash
git push -u origin claude/escalation-packet-fields-380f1f
gh-axi pr create --base main --head claude/escalation-packet-fields-380f1f \
  --title "feat: escalation packet에 alternatives·safe_default 2필드" --body-file <ship 산출물>
```

브랜치 이름이 `claude/escalation-packet-fields`가 **아니다** — 그 이름은 다른 워크트리
(`goofy-kirch-89bf74`)가 점유하고 있어 이 세션은 `-380f1f` 브랜치에서 작업했다.

## Ontology 변경 로그

- `escalation packet` — 기계용(엔벨로프 `error`)과 사람용(`CLAUDE.md` §5-A) 두 형태를 같은
  5항목으로 정의. spec.md의 Ontology 절에 기록됨.
- `alternatives` — "시도 이력"이 아니라 "지금 취할 수 있는 다른 행동"으로 확정.
- `safe_default` — "자동 실행할 행동"이 아니라 "무행동의 결과"로 확정.

## 참고
- Spec: `docs/hslee/escalation-packet-fields/escalation-packet-fields-spec.md`
- 근거: `.claude/handoffs/2026-09-05-1330-harness-pdf-6layer-comparison.evidence.md:44` (#16)
- 본보기: `docs/hslee/retro-rules-promotion/retro-rules-promotion-plan.md`

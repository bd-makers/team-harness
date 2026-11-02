# env-state-q5 — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

D12 정정의 자기 서술 계약 중 **Q5 "지금 준비됐는가 — 선언과 실제가 일치하는가"의 한 축, 의존성 설치 상태만** 답한다.
Q5의 다른 축(런타임 버전)과 Q1–Q4의 빈칸 보고는 답하지 않는다(아래 `## 원천 검토`의 결정).

- **문제**: lockfile이 의존성을 선언해도 그 설치가 디스크에 있는지는 아무도 보지 않는다. 2026-10-11 `heliosent-profile` AO 워크트리에
  `node_modules`가 없어 커밋 게이트 tsc가 실패했고, 에이전트는 환경이 준비되지 않았다는 것을 몰라 코드 결함으로 다뤘다.
  `harness-team stack`은 bootstrap 명령(Q4)은 알려 주지만, 그 명령을 돌려야 하는 상태인지는 알려 주지 않는다.
- **영향**: S0·새 워크트리 시작·게이트 실패 직후 `stack`을 읽는 에이전트. 소비자 저장소의 `stack --json` envelope.
- **기대 결과**: `stack`이 "lockfile `X`가 선언한 설치의 흔적 `Y`가 있는가"를 관측해 보고하고, 없으면 warning과 함께
  bootstrap 명령(`stack.cmdBootstrap`)을 `next_actions`로 넘긴다. 판정 규칙이 없거나 해당 없으면 묻지 않는다(null).
- **제약**: D11 — 어떤 lockfile이 선언이고 어떤 경로가 설치 흔적인지는 프리셋 JSON `env` 블록에만 둔다. 코드는 언어 무관 평가기만.
  envelope JSON 계약은 더하기만 한다. text 요약 5줄 예산(`SUMMARY_MAX_LINES`). 커밋 게이트·`pr-check`·`done` 무변경, hard fail 없음,
  환경 파일 생성·설치 실행 없음, 런타임 npm 의존성 0개 유지, `.env.*` 읽기 deny 유지.

## 범위 (In / Out)
*`- **In**: …`에 이번 task가 바꾸는 것(파일·모듈·동작)을, `- **Out**: …`에 하지 않기로 한 것과 그 이유 한 줄을 쓴다 —
요청하지 않은 기능·관련 없는 리팩터링이 섞이지 않게 긋는 경계다.*

- **In**: 프리셋 `env.installTrace` 규칙(pm별, `{ when, trace }`) — `templates/presets/node.json`·`python.json`.
- **In**: 언어 무관 평가기 `installTrace()` — `src/presets.mjs`, 기존 `firstHolding()`·`holds()` 재사용. **새 조건 종류 없음.**
- **In**: `harness-team stack` envelope 최상위 `installTrace` 필드(더하기만), 요약 축 1개, 흔적이 없으면 `status: warning`과
  bootstrap 안내 `next_actions` — `src/commands/stack.mjs`.
- **Out**: 런타임 버전(선언 대 실제) — `## 원천 검토` D-1. 값 추출기·실제 버전 획득 정책·범위 문법이 각각 새 결정이라 다음 task.
- **Out**: Q1–Q4 빈칸 보고, JS lockfile→pm 판정의 프리셋 이전 — 이 task 머지 뒤 별도 task(D12 정정 "다음 단위").
- **Out**: 설치 신선도(lockfile이 설치보다 새로운가) — mtime은 checkout·iCloud 동기화가 흔들어 근거가 못 된다. 흔적의 존재만 본다.
- **Out**: workspace별 판정 — 루트 lockfile·루트 흔적만 본다. npm·pnpm·yarn·bun workspace는 루트에 설치한다.
- **Out**: poetry — 기본 venv가 저장소 밖(캐시 디렉터리)이라 디스크에서 관측할 흔적이 없다. 규칙을 두지 않는다(→ null).
- **Out**: `bun.lockb`·`npm-shrinkwrap.json`·npm lockfileVersion 1 — bootstrap 규칙과 같은 lockfile 집합만 판정한다.
  lockfileVersion 1은 `"node_modules/` 키가 없어 판정에서 빠진다(놓침이지 오탐이 아니다).

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- `docs/decisions.md` D11(범위 헌장·2차 장치 규칙)·D12와 그 끝의 "정정 — 역할 재정의"(Q1–Q5, 하네스 역할 ① 빈칸 보고 ② 상태 계산 ③ 귀인 칸).
- `docs/hslee/env-describe/` — 직전 task. `env.bootstrap` 규칙·`firstHolding()`, Learnings("예시를 걷어 낸 질문 목록 → 이름을 그 범위로").
- 각 도구의 설치 흔적 — 2026-11-03 scratchpad 실측(npm 11.9.0·pnpm 12.4.1·yarn 1.22.22·yarn 4.5.3·bun·uv 0.11.16).

### 발견
- (open) D-1: 런타임 버전(후보 b)을 이번 범위에 넣을지. 하네스를 돌리는 node를 프로젝트 node로 볼 수 있는가?
  → 결정: **볼 수 없다 — 그래서 넣지 않는다.** 하네스는 `node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs"`로 PATH의 node에서 돌고
  자신은 `engines.node >=24`를 요구한다. mise·asdf shim은 cwd별로 버전을 고르고, `stack --target`은 cwd 밖을 본다 — `process.version`은
  하네스에 대한 증거이지 대상 저장소에 대한 증거가 아니다. 대상 디렉터리에서 `node --version`·`python --version`을 띄우는 것은 관측이 아니라
  실행이고(`stack`은 `docker info`조차 에이전트에게 넘긴다), `engines.node`·`requires-python`은 범위라 semver·PEP 440 평가기가 필요하다
  (런타임 의존성 0개). 값 추출(파일 내용·JSON 경로)도 새 메커니즘이다. 신뢰할 실제 값이 없는 비교를 "다를 수 있음"으로 내는 것은
  D12가 말한 "잘못 추측한 선언"과 같은 해다. 단서: uv `.venv/pyvenv.cfg`의 `version_info`는 파일 읽기로 실제 Python을 준다(실측) —
  다음 task의 출발점으로 남긴다.
- (open) D-2: 의존성 0개 저장소의 오탐. → 결정(실측): **npm만** 의존성 0개면 `package-lock.json`만 쓰고 `node_modules`를 만들지 않는다 —
  npm 규칙만 lockfile에 `"node_modules/` 키가 있을 때 적용한다(`fileContains`, lockfileVersion 2·3의 `packages` 키 형식).
  pnpm(`node_modules/.modules.yaml`)·yarn classic(`node_modules/.yarn-integrity`)·yarn berry(`.pnp.cjs`·`.yarn/install-state.gz`)·
  uv(`.venv`)는 0개여도 흔적을 만들고, bun은 0개면 `bun.lock`을 쓰지 않는다 — 가드가 필요 없다. 이 저장소는 lockfile이 없어 판정하지 않는다.
- (open) D-3: yarn berry의 흔적. → 결정: `.yarn/install-state.gz`·`.pnp.cjs`·`node_modules` 중 하나(any-of). zero-install 저장소는
  `.pnp.cjs`를 커밋하므로 새 클론도 준비된 상태이고, `nodeLinker: node-modules`는 `node_modules`를 만든다.
- (open) D-4: 이름. → 결정: 관측을 이름으로 쓴다 — 요약 축 `설치 흔적: 없음 (package-lock.json → node_modules)`, JSON `installTrace`,
  CHANGELOG 제목은 "의존성 설치 흔적". "준비됨/미설치"라 부르지 않는다 — 흔적의 존재는 lockfile과의 일치를 보장하지 않고,
  `UV_PROJECT_ENVIRONMENT` 같은 재지정은 디스크에서 보이지 않는다.
- (open) D-5: 2차 장치 규칙(D11) — 게이트 실패를 귀인하려는 장치인가? → 결정: 게이트를 빼거나 줄일 대상이 아니다(게이트는 옳았고 환경이
  준비되지 않았다). 새 명령도 만들지 않고 `stack`(S0 관측, read-only envelope)을 넓힌다 — D12의 "새 `env` 명령" 기각과 같다.
- (open) D-6: 흔적 없음의 `status`. → 결정: `warning`(exit 0). 러너 부재와 같은 등급 — CLI가 고칠 수 없고 에이전트가 행동할 상태다.
  summary 통째 교체(`unreadable`·`runnerMissing`)는 추가하지 않고 요약 축 하나로 둔다. bootstrap 안내는 summary가 가리키는 조치
  (매니페스트 수리·러너 부재 분기) 바로 뒤, 그 외에는 맨 앞에 둔다 — summary와 `next_actions[0]`이 다른 조치를 가리키지 않게 한다.
- 다이어그램: 옵트인하지 않음(2026-11-03).
- 검토 완료: 2026-11-03

## 설계 / 접근

**데이터(프리셋)**: `env.installTrace`를 `env.bootstrap`처럼 pm으로 나눈다 — 감지된 pm·bootstrap과 같은 lockfile 집합이라
"흔적 판정이 있으면 bootstrap 명령도 있다"가 성립한다(poetry는 bootstrap만 있고 흔적 규칙은 없다). 조건은 기존 `holds()` 문법, 첫 매치가 이긴다.
`trace`는 경로 목록이고 하나라도 있으면 흔적이 있다.

```json
"installTrace": {
  "npm":  [{ "when": { "fileContains": ["package-lock.json", "\"node_modules/"] }, "trace": ["node_modules"] }],
  "pnpm": [{ "when": { "file": "pnpm-lock.yaml" }, "trace": ["node_modules"] }],
  "yarn": [
    { "when": { "fileContains": ["yarn.lock", "__metadata"] }, "trace": [".yarn/install-state.gz", ".pnp.cjs", "node_modules"] },
    { "when": { "file": "yarn.lock" }, "trace": ["node_modules"] }
  ],
  "bun":  [{ "when": { "file": "bun.lock" }, "trace": ["node_modules"] }]
}
```

Python: `"installTrace": { "uv": [{ "when": { "file": "uv.lock" }, "trace": [".venv"] }] }`.

**코드**: `presets.mjs`에 `installTrace(dir, pkg, rules)` — `firstHolding()`으로 선언 규칙을 고르고, `trace`를 `holds()`의 any-of로 평가한다.
반환은 3값: 규칙 없음 → `null`, 아니면 `{ state: 'present' | 'absent', lockfile, trace }`. `lockfile`은 규칙 `when`이 가리키는 파일 경로다
(`file`·`fileContains[0]` — 내용은 복사하지 않는다, D12 "선언의 경로만"). 프리셋은 `resolveStack`이 정한 id(`--stack` 포함)로 고르고 pm은
`stack.packageManager` — `detectBootstrap`과 같은 선택이다. `detectStack` profile에는 넣지 않는다(init·doctor 렌더와 settings allowlist가 읽는다).

**`stack` 출력**:
- JSON: 최상위 `installTrace`(위 3값). 기존 필드 불변.
- 요약 축(bootstrap 축 바로 뒤): `설치 흔적: 있음|없음 (<lockfile> → <trace 중 하나|…>)`. `null`이면 축을 내지 않는다.
- `absent`면 `status: warning`, `next_actions`에 `의존성 설치 흔적이 없습니다(<lockfile> → <trace>) — \`<cmdBootstrap>\`으로 준비하세요`.
  `cmdBootstrap`이 `(configure)`면 명령을 지어내지 않고 그렇다고 적는다.

**영향 소스 파일 4개**(§5-A 게이트 미만): `templates/presets/node.json`·`python.json`·`src/presets.mjs`·`src/commands/stack.mjs`.
테스트는 `tests/presets.test.mjs`·`tests/detect-testing.test.mjs`. 문서는 CHANGELOG·`skills/harness-team/SKILL.md`의 `stack` 한 줄.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **설치 흔적(install trace)**: 그 pm의 설치가 저장소 안에 남기는 경로(`node_modules`·`.venv`·`.pnp.cjs` …). 있으면 "설치가 있었다"는 관측일 뿐
  lockfile과 일치함을 뜻하지 않는다.
- **선언(lockfile)**: Q2의 기계 판독 선언. 흔적 판정의 전제 — 선언이 없으면 Q5의 이 축은 해당 없음(null)이다.
- **installTrace 규칙**: 프리셋 `env.installTrace.<pm>`의 `{ when, trace }`. `when`은 `holds()` 조건(선언 + 적용 가드), `trace`는 any-of 경로 목록.
- 게이트 근거: 목표(Q5 설치 축 하나)·제약(D11·D12·envelope 더하기만)·영향 파일 4개가 위에 명시됐고, D-1–D-6은 실측과 정본으로 결정했다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "optional" ("required"면 소스가 바뀔 때 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```

**성공 기준**: pm별(npm·npm 0개·pnpm·yarn classic·yarn berry·bun·uv·poetry·lockfile 없음) `installTrace` 단위 테스트, `stack --json`의
`absent`→warning+bootstrap 안내·`present`→success·이 저장소 `null` CLI 테스트, 5줄 예산 유지, `npm test` fail 0, `docs:check` 최신,
scratchpad e2e(미설치·설치 각각).

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- `src/presets.mjs` `holds`·`firstHolding` · `src/detect-stack.mjs` `detectBootstrap`·`presetEnv`
- `src/commands/stack.mjs` `renderSummary`·`nextActions`·`runStack` · `src/observation.mjs` `buildEnvelope`
- 테스트: `tests/detect-testing.test.mjs`(stack CLI)·`tests/presets.test.mjs`·`tests/detect-stack.test.mjs`(bootstrap 표)

# js-pm-preset — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

D12 "미결"의 한 항목 — **detect-stack의 하드코딩 lockfile 판정을 프리셋 데이터로 옮긴다.** 동작 변화 0의 이전이다.

- **문제**: D11은 언어·도구 지식을 프리셋 데이터(`templates/presets/*.json`)에만 두고 코드에는 언어 무관 평가기만 두게 한다.
  그런데 `src/detect-stack.mjs` `detectPackageManager()`가 JS lockfile→pm 판정(`pnpm-lock.yaml`→pnpm, `yarn.lock`→yarn,
  `bun.lockb`·`bun.lock`→bun)을 코드에 하드코딩한다. Python은 task `env-describe`에서 이미 `python.json` `env.packageManager`와
  `firstHolding()`으로 옮겼다 — JS만 남았다.
- **영향**: 소비자에게 보이는 영향 없음(목표). 메인테이너는 JS lockfile 규칙을 프리셋 한 곳에서 읽고 고친다.
- **기대 결과**: 판정 규칙이 `templates/presets/node.json` `env.packageManager`에 있고, `detectPackageManager()`는 `firstHolding()`
  평가만 한다. 감지 순서(pnpm → yarn → bun(`bun.lockb`·`bun.lock`) → package.json만 있으면 npm → 없으면 null)와 `cmdInstall`
  렌더가 그대로다.
- **제약**: 동작 변화 0 — `stack` envelope·AGENTS.md 관리 절·커밋 게이트 fingerprint(`pm`)에 diff가 생기지 않는다. 새 조건 종류 없음,
  런타임 npm 의존성 0개, 병행 세션(`env-blank-q1q4`)이 다루는 `src/commands/stack.mjs`·doctor·`node.json`의 다른 블록은 건드리지 않는다.

## 범위 (In / Out)
*`- **In**: …`에 이번 task가 바꾸는 것(파일·모듈·동작)을, `- **Out**: …`에 하지 않기로 한 것과 그 이유 한 줄을 쓴다 —
요청하지 않은 기능·관련 없는 리팩터링이 섞이지 않게 긋는 경계다.*

- **In**: `templates/presets/node.json` `env.packageManager` 블록(lockfile 규칙 3개, `{ when, id }`) — `env`의 첫 키로 더한다.
- **In**: `src/detect-stack.mjs` `detectPackageManager()` 본문 — `firstHolding()` 평가 + 코드 기본값. 호출부 2곳(`detectStack`·`resolveStack`)은 그대로.
- **In**: `tests/detect-stack.test.mjs` pm 표 테스트 1개(이전 전에 green으로 고정).
- **Out**: `package.json만 → npm` 기본값의 프리셋 이전 — `## 원천 검토` D-1.
- **Out**: JS 규칙의 `install` 필드 — D-2.
- **Out**: `buildProfile`의 `pm === 'npm' ? 'run ' : ''` — npm 지식이 코드에 남은 다른 자리지만 pm 판정이 아니라 명령 렌더다. 후속으로 보고만 한다.
- **Out**: `docs/decisions.md` D12 "미결" 줄 닫기 — 요청 범위 밖. 머지 뒤 닫을 수 있다고 보고한다.
- **Out**: `detectStack`의 계산 순서(pm을 id보다 먼저 구한다) — 바꾸면 요청하지 않은 리팩터링이다.

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- `docs/decisions.md` D11(범위 헌장·판정 질문·2차 장치 규칙)·D12(미결 "detect-stack의 하드코딩 lockfile 판정").
- `docs/hslee/env-describe/` — Python pm 이전(`python.json` `env.packageManager`, `pythonProfile()`).
- `src/presets.mjs` `holds()`(배열 `when` = any-of)·`firstHolding()`(위에서 아래로 첫 매치).

### 발견
- **D11 판정 질문**: ① 사이클 위치 — S0 셋업(`stack`·init이 pm을 감지해 관리 절·게이트를 렌더). 비범위가 아니다.
  ② 언어·도구 지식이 필요하다 — lockfile 이름→pm 매핑은 도구 지식이므로 **프리셋 데이터**에 둔다. 코드는 `firstHolding()` 평가만.
  ③ 다른 장치의 결함 때문인가 — 아니다. 결함 수정이 아니라 D11 정합 이전이며 동작은 바꾸지 않는다. 2차 장치 규칙: 새 명령·새 조건 종류를 만들지 않고
  기존 `env` 블록 문법과 평가기를 쓴다.
- (open) D-1: `package.json만 → npm`을 프리셋 규칙(`{ "when": { "file": "package.json" }, "id": "npm" }`)으로 둘 것인가?
  → 결정: **두지 않는다 — 코드 기본값 `rule?.id ?? (pkg ? 'npm' : null)`로 남긴다.** 지금 판정은 `readJson()`이 파싱한 `pkg`의 truthy 여부이고
  `holds({ file })`는 존재만 본다. 손상된 package.json(파싱 실패)에서 `resolveStack(dir, 'react')`는 지금 `(none)`·`(configure)`인데
  file 조건이면 `npm`·`npm install`로 바뀐다 — 동작 변화다. "파싱된 package.json" 조건은 새 조건 종류라 제약 밖이다.
  Python의 `rule?.id ?? 'pip'`(매니페스트가 있고 lockfile이 없으면 기본 pm)와 같은 모양이다. 이 경계를 표 테스트에 고정한다.
- (open) D-2: Python 규칙처럼 `install`을 둘 것인가? → 결정: **두지 않는다.** `buildProfile`이 `install`이 없으면 `${pm} install`로 렌더하고,
  JS 네 pm 모두 그 형태가 맞다. Python에 `install`이 있는 이유는 uv가 `uv sync`이고 pip이 `(configure)`이기 때문이다. 넣어도 출력 diff는 0이지만 중복 데이터다.
- (open) D-3: 어느 프리셋에서 읽는가? → 결정: `presetEnv('node')`. `detectStack`은 id를 정하기 전에 pm을 구하고, JS id 다섯(`node`·`react`·`next`·
  `react-native`·`expo`)은 모두 `node.json`으로 간다. `pythonProfile()`의 `presetEnv('python')`과 같은 모양.
- (open) D-4: `resolveStack()`의 JS `--stack` 오버라이드가 같은 판정을 쓰는가? → 확인: **쓴다.** `detectStack`(66행)과 `resolveStack`(94행) 둘 다
  `detectPackageManager(dir, pkg)`를 부른다. 함수 본문만 바꾸므로 두 경로가 같은 규칙을 탄다. 오버라이드는 package.json이 없어도 lockfile로 pm을 정한다
  (`pkg` null + `pnpm-lock.yaml` → pnpm) — 표 테스트에 고정한다.
- (open) D-5: `bun.lockb`의 "왜" 주석. → 결정: JSON에는 주석이 없으므로 `detectPackageManager` 위 코드 주석 한 줄로 남긴다.
- 다이어그램: 옵트인하지 않음(2026-11-03).
- 검토 완료: 2026-11-03

## 설계 / 접근

**데이터(`node.json` `env`의 첫 키)** — 순서가 곧 우선순위다(`firstHolding()`):

```json
"packageManager": [
  { "when": { "file": "pnpm-lock.yaml" }, "id": "pnpm" },
  { "when": { "file": "yarn.lock" }, "id": "yarn" },
  { "when": [{ "file": "bun.lockb" }, { "file": "bun.lock" }], "id": "bun" }
]
```

**코드**:

```js
async function detectPackageManager(dir, pkg) {
  const rule = await firstHolding(dir, pkg, (await presetEnv('node')).packageManager);
  return rule?.id ?? (pkg ? 'npm' : null);
}
```

**"동작 변화 0"의 증명**:
1. 기존 `tests/detect-stack.test.mjs` 단언을 하나도 고치지 않고 green(bun.lock 감지·bootstrap 표·resolveStack 오버라이드).
2. 이전 **전에** pm 표 테스트를 더해 현재 코드에서 green으로 고정하고, 이전 뒤에도 같은 표가 green. 표는 단일 lockfile 각각(pm·`cmdInstall`),
   `bun.lockb`·`bun.lock`·둘 다, 순서(`pnpm-lock.yaml`+`yarn.lock`→pnpm, `yarn.lock`+`bun.lock`→yarn, `bun.lock`+`package-lock.json`→bun),
   package.json만 → npm, 오버라이드(`resolveStack(dir, 'react')`): package.json 없음+`pnpm-lock.yaml` → pnpm, 아무것도 없음 → `(none)`,
   손상된 package.json → `(none)`(D-1 판별자).
3. 이 저장소의 `node bin/harness-team.mjs stack --json` envelope 전체를 이전 전 기준선과 diff — 0이어야 한다.
4. 게이트 fingerprint의 `pm`은 `buildProposal()`이 `stack.packageManager`에서 그대로 가져온다 — 2·3이 `packageManager`를 고정하므로 구성상 같다.
   관리 절도 `packageManager`·`cmdInstall`만 읽으므로 같은 근거로 diff 0이다.

**영향 파일 3개**(§5-A 게이트 미만): `templates/presets/node.json`·`src/detect-stack.mjs`·`tests/detect-stack.test.mjs`. 문서는 CHANGELOG `## [Unreleased]`.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **pm 판정 규칙**: 프리셋 `env.packageManager`의 `{ when, id }` 목록. `when`은 `holds()` 조건(배열이면 any-of), 첫 매치의 `id`가 pm이다.
- **코드 기본값**: 규칙이 하나도 맞지 않을 때의 pm — JS는 파싱된 package.json이 있으면 `npm`, 없으면 null. Python은 `pip`. 매니페스트 판정에 묶여 있어 프리셋 조건으로 표현하지 않는다(D-1).
- 게이트 근거: 목표(JS lockfile 판정 이전, 동작 변화 0)·제약(새 조건 없음·병행 세션 파일 회피)·영향 파일 3개가 위에 명시됐고, D-1–D-5를 코드와 정본으로 결정했다.

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

**성공 기준**: 위 증명 1–4, `npm test` fail 0, `npm run docs:check` 최신, codex 리뷰 판별·조치가 artifact `## Reviews`에.

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- `src/detect-stack.mjs` `detectPackageManager`·`pythonProfile`·`presetEnv`·`resolveStack`·`buildProfile`
- `src/presets.mjs` `holds`·`firstHolding`·`buildProposal`(fingerprint `pm`)
- 테스트: `tests/detect-stack.test.mjs`(pm 표·bootstrap 표·resolveStack)
- PR #165(`env-state-q5`) 위의 브랜치 — #165 머지 뒤 base 동기화가 필요하다.

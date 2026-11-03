# env-blank-q1q4 — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

D12 정정의 하네스 역할 ① **빈칸 보고**를 구현한다. Q1–Q4 각각에 대해 저장소의 기계 판독 선언이 답했으면 그 **경로만**,
답하지 못했으면 빈칸으로 알린다. 이름은 이번 구현이 답하는 범위로 좁힌다(아래 `## 원천 검토` D-1).

- **문제**: D12 정정은 Q1–Q4의 정본을 저장소의 기계 판독 선언으로 정했지만, 어느 선언이 답했고 어느 질문이 비었는지 알려 주는 곳이 없다.
  `stack`은 bootstrap 명령(Q4 일부)과 설치 흔적(Q5 설치 축)만 보고하고, 런타임 버전 선언·lockfile 유무는 어디서도 보고하지 않는다.
  선언이 비면 Q5(선언 대 실제)를 계산할 기준도 없다.
- **영향**: S0·새 워크트리에서 `stack`을 읽는 에이전트, doctor를 돌리는 팀원. 소비자의 `stack --json`·`doctor --json` envelope.
- **기대 결과**: `stack`이 envelope 최상위 `declarations`와 요약 축 하나(`환경 선언: …`)로 답한 선언의 경로와 빈칸을 보고한다.
  doctor는 빈칸이 있으면 soft warning(fail 아님, exit 0), 없으면 pass 줄에 경로를 적는다. 해당 없는 질문은 묻지 않는다 —
  의존성을 선언하지 않은 저장소(이 저장소 포함)에는 Q2·Q4를 묻지 않는다.
- **제약**: D11 — 어떤 파일이 어떤 질문의 선언인지는 프리셋 JSON `env.declare`에만 둔다. 코드는 언어 무관 평가기(`holds()`)만.
  `stack` envelope는 더하기만 하고 `status`·`next_actions`는 바꾸지 않는다. text 요약 5줄 예산(`SUMMARY_MAX_LINES`).
  `.env.*`는 존재만 보고 읽지 않는다(deny 유지). 커밋 게이트·`pr-check`·`done`·AGENTS.md 관리 절 무변경, 설치·환경 파일 생성 없음,
  런타임 npm 의존성 0개.

## 범위 (In / Out)
*`- **In**: …`에 이번 task가 바꾸는 것(파일·모듈·동작)을, `- **Out**: …`에 하지 않기로 한 것과 그 이유 한 줄을 쓴다 —
요청하지 않은 기능·관련 없는 리팩터링이 섞이지 않게 긋는 경계다.*

- **In**: 프리셋 `env.declare` — `templates/presets/node.json`·`python.json`. 키: `hasDependencies`(적용 조건),
  `runtimeVersion`(Q1)·`lockfile`(Q2)·`serviceFiles`(Q3)·`bootstrap`(Q4)의 답 후보 조건 목록.
- **In**: `holds()`의 새 조건 종류 1개 `nonEmptyKey: [file, ...keys]` — JSON 파일의 (중첩) 키 값이 비어 있지 않은가(D-2).
- **In**: 평가기 `detectDeclarations(dir, stack)` — `src/presets.mjs`. `condFile()`을 일반화한다(`script` → `package.json`, `nonEmptyKey` → 그 파일).
- **In**: `stack` envelope 최상위 `declarations`, 요약 축 1개 — `src/commands/stack.mjs`.
- **In**: doctor 검사 `env declarations` — `src/commands/doctor.mjs`. init-smoke e2e의 "doctor green" 단언을 새 계약에 맞춘다(D-6).
- **Out**: Q1의 **시스템 도구** 절반(Brewfile·flake.nix·`packageManager` 필드 등) — 필요한 도구의 선언 형식이 저장소마다 달라 후보 목록이
  닫히지 않는다. 그래서 이름을 `runtimeVersion`으로 좁힌다.
- **Out**: Q3 **빈칸** 보고 — 서비스가 필요한지는 선언만으로 판정할 수 없다(원격 DB·서비스 없는 저장소). 있으면 경로만 가리킨다(D-4).
- **Out**: 선언 내용 대조(`.nvmrc` 대 `engines` 충돌, 선언 대 실제 런타임) — Q5 런타임 축, 다음 task(env-state-q5 D-1).
- **Out**: lockfile 미추적(gitignore) — git 상태가 필요하고 `stack --target`은 git 밖 디렉터리도 본다. 디스크 존재만 본다.
- **Out**: go·generic — `generic.json`에 `declare`가 없어 묻지 않는다(`declarations: null`). go.mod `go` 지시자는 다음 단위.
- **Out**: workspace별 판정(루트만), `detectStack` profile·AGENTS.md 관리 절 렌더(init·settings allowlist가 읽는다).
- **알려진 한계**: 텍스트 needle은 형식에 기댄다 — pyproject는 따옴표가 바로 뒤따르는 `dependencies = ["`·`dependencies = [ "`·
  `dependencies = [\n    "`(uv 표기)만 의존성으로 본다. 빈 목록의 어떤 표기도 의존성이 아니고, 다른 들여쓰기·CRLF·`[dependency-groups]`만 있는 저장소·
  poetry 1의 `[tool.poetry.dependencies]`·`requirements.txt`만 있는 저장소는 놓친다. `requirements.txt`는 `--hash=`·pip-compile·uv 생성 헤더가 있을 때만
  lock이다. `.tool-versions`·`mise.toml`은 `node`·`python` 부분 문자열로 본다(다른 맥락의 같은 글자는 "답함"으로 센다).
  남은 놓침은 모두 경고가 **안 나는** 쪽이다 — 의존성 0개 오탐은 두지 않는다(codex P2, 2026-11-03 조치).

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- `docs/decisions.md` D11(범위 헌장·2차 장치 규칙)·D12 원문 "doctor soft warning"(3번)과 끝의 "정정 — 역할 재정의"(Q1–Q5, 역할 ① 빈칸 보고).
- `docs/hslee/env-state-q5/` — 직전 task. `installTrace`의 3값 계약·`condFile()`, D-1(런타임 버전을 미룬 이유).
- `docs/hslee/env-describe/` Learnings — "외부 원칙은 질문 목록으로 바꾸고, 구현이 답하는 질문의 범위로 이름을 좁힌다".
- `tests/e2e/sandbox.mjs` — init-smoke fixture(`bare-node`는 `dependencies: {}`, next·RN은 의존성 있고 lockfile 없음).
- 2026-11-03 scratchpad 실측: npm 11.9.0은 마지막 의존성을 지우면 `dependencies` 키를 없앤다. pnpm은 압축 JSON(`{"name":…}` 한 줄)을
  그대로 둔다. uv 0.11.16 `uv init`은 `dependencies = []`, `uv add` 뒤에는 `dependencies = [\n    "…",\n]`, `uv remove` 뒤에는 다시 `[]`.

### 발견
- (open) D-1: 이름과 범위. → 결정: 질문별 키를 판정하는 것으로 부른다 — Q1 `runtimeVersion`(시스템 도구 제외), Q2 `lockfile`,
  Q3 `serviceFiles`(compose·devcontainer·환경 변수 계약 파일의 **존재**), Q4 `bootstrap`. envelope 필드는 `declarations`,
  요약 축은 `환경 선언:`. "준비 상태"·"환경 점검"이라 부르지 않는다 — 선언의 유무만 보고 내용·실제와의 일치는 보지 않는다.
- (open) D-2: Q2·Q4의 적용 조건 "의존성을 선언했는가"를 기존 조건으로 쓸 수 있는가. → 결정: **JSON은 아니다 — 새 조건 종류 `nonEmptyKey` 하나.**
  `fileContains`는 세 경우를 다 통과하지 못한다: 압축 JSON(pnpm이 유지, 테스트 fixture도 `JSON.stringify` 한 줄), 빈 `{}`(e2e `bare-node`),
  키 없음(npm 11.9.0의 마지막 의존성 제거·이 저장소). `nonEmptyKey: [file, key]`는 파일과 키 이름을 데이터로 받는 언어 무관 조회라 D11에 맞고,
  `composer.json`·`deno.json`에도 쓸 수 있다. 비어 있지 않음 = 키가 1개 이상인 객체, 원소가 1개 이상인 배열, 빈 문자열이 아닌 문자열.
  TOML(pyproject)은 파서가 없어(런타임 의존성 0개) 텍스트 needle로 두고 한계를 범위 절에 적었다. `peerDependencies`는 세지 않는다 —
  피어만 있는 라이브러리는 드물고 거의 언제나 `devDependencies`가 있다.
- (open) D-3: Q4는 무엇이 답하는가, 언제 묻는가. → 결정: 감지된 pm의 `env.bootstrap` 규칙이 성립하면 그 규칙 `when`이 읽는 lockfile이 답이다
  (env-describe — lockfile을 지키는 bootstrap이 Q4의 기계 판독 답). 그 밖에 프리셋이 이름 붙인 준비 스크립트·파일(`setup`·`bootstrap` 스크립트,
  `script/bootstrap`·`script/setup`·`bin/setup`)도 답한다. 묻는 조건은 Q2와 같다 — 의존성이 없는 체크아웃은 준비할 것이 없다.
  그래서 "의존성은 있는데 lockfile이 없음"은 Q2·Q4 두 빈칸으로 나온다(두 질문 모두 답이 없으므로 사실이다). Q4만 비는 경우: `bun.lockb`만 있음,
  pip(`requirements.txt`) 저장소.
- (open) D-4: Q3를 빈칸으로 보고할 수 있는가. → 결정: **없다 — 경로 안내만.** 서비스가 필요한지는 선언에서 알 수 없고,
  추측하면 서비스가 없는 저장소(이 저장소)에 경고가 난다. 있으면 `serviceFiles`에 경로를 싣고, 없으면 `null`이다.
  의존성 신호(서버형 DB 드라이버 등)로 묻는 것은 다음 단위의 이음매로 남긴다. `.env.example`류는 `file`(존재)로만 본다(D-7).
- (open) D-5: `stack`의 `status`를 빈칸 때 `warning`으로 바꿀까. → 결정: **바꾸지 않는다. `next_actions`도 그대로.** 런타임 버전 선언이 없는
  저장소가 대부분이라 바꾸면 소비자 대다수의 `stack`이 `success`→`warning`으로 뒤집히고, 기존 테스트(`status, 'success'` 단언 3곳)도 깨진다.
  게다가 에이전트가 고칠 수 없는 상태다 — D12는 환경 파일 생성을 소유하지 않는다(잘못 추측한 선언은 없는 것보다 해롭다). `stack`의 보고는
  JSON 필드와 요약 축이고, soft warning은 doctor(사람이 읽는 건강 검사)가 맡는다.
- (open) D-6: doctor의 등급과 결과. → 결정: 빈칸은 `warning`(fail에 세지 않음, exit 0, D12 원문 3번), 빈칸이 없으면 `pass`에 경로,
  `declare`가 없는 프리셋(go·generic)은 줄을 내지 않는다. `warnActions`에 넣지 않는다 — 고칠 CLI 명령이 없다. pluginDev로 거르지 않는다
  (이 저장소도 node 프로젝트이고 오탐이 없어야 한다는 것이 검사 대상이다). 예외는 `null`로 삼킨다(warn 검사가 던지면 doctor가 envelope 전에 죽는다).
  **영향**: init 직후 doctor가 green이 아닐 수 있다 — `.nvmrc`·`engines`가 없는 저장소 대부분. init-smoke e2e의 "doctor `success`" 단언을
  "warning이 있다면 전부 `env declarations`"로 바꾼다(하네스 설치 건강이라는 그 테스트의 의도는 유지).
- (open) D-7: `.env.*` deny와 Q3. → 결정: `.env.example`·`.env.sample`·`.env.template`는 `file` 조건(존재)만 쓴다. 프리셋 전체를 훑어
  `.env`로 시작하는 경로를 `fileContains`·`nonEmptyKey`로 읽는 조건이 없음을 단언하는 가드 테스트를 둔다.
- (open) D-8: 2차 장치 규칙(D11) — 다른 하네스 장치를 고치거나 지키려는 장치인가? → 결정: 아니다. D12 정정 역할 ①의 새 능력이고,
  새 명령 없이 `stack`(S0 관측)·doctor(건강 검사)를 넓힌다 — D12의 "새 `env` 명령" 기각과 같다. 빼거나 줄일 원래 장치가 없다.
- (open) D-9: 병행 세션 충돌. → 결정: 병행 세션이 `node.json`에 `env.packageManager`를 더하고 `detectPackageManager`를 옮긴다. 이 task는 그 함수와
  그 블록을 건드리지 않고, `declare`를 `env` 블록 **끝**(`installTrace` 뒤)에 더해 hunk가 겹치지 않게 한다. Q2 후보는 pm과 무관하게 모든
  lockfile을 나열하므로 pm 판정이 바뀌어도 Q2 결과는 같다.
- (open) §5-A escalation — 영향 소스 5개·새 조건 종류 `nonEmptyKey`·doctor warning 등급(init 직후 doctor가 green이 아닐 수 있음).
  → 결정: 메인테이너가 **권장안대로 진행**을 골랐다(2026-11-03). 기각된 선택지: doctor `optional` 등급(green 유지), Q1·Q2만으로 축소.
- 다이어그램: 옵트인하지 않음(2026-11-03).
- 검토 완료: 2026-11-03

## 설계 / 접근

**데이터(프리셋 `env.declare`)** — 질문의 의미(언제 묻는가)는 하네스의 것이라 코드에, 어떤 파일이 답하는가는 언어 지식이라 데이터에 둔다.
각 질문 키의 값은 **조건 목록**이고, 성립하는 조건마다 그 조건이 가리키는 파일 하나가 답한 경로다(any-of, 경로는 중복 제거).

```json
"declare": {
  "hasDependencies": [{ "nonEmptyKey": ["package.json", "dependencies"] }, { "nonEmptyKey": ["package.json", "devDependencies"] },
                      { "nonEmptyKey": ["package.json", "optionalDependencies"] }],
  "runtimeVersion": [{ "file": ".nvmrc" }, { "file": ".node-version" }, { "fileContains": [".tool-versions", "node"] },
                     { "fileContains": ["mise.toml", "node"] }, { "fileContains": [".mise.toml", "node"] },
                     { "nonEmptyKey": ["package.json", "engines", "node"] }, { "nonEmptyKey": ["package.json", "devEngines", "runtime"] },
                     { "nonEmptyKey": ["package.json", "volta", "node"] }],
  "lockfile": [{ "file": "package-lock.json" }, { "file": "npm-shrinkwrap.json" }, { "file": "pnpm-lock.yaml" },
               { "file": "yarn.lock" }, { "file": "bun.lock" }, { "file": "bun.lockb" }],
  "serviceFiles": [{ "file": "compose.yaml" }, { "file": "compose.yml" }, { "file": "docker-compose.yml" }, { "file": "docker-compose.yaml" },
                   { "file": ".devcontainer/devcontainer.json" }, { "file": ".devcontainer.json" },
                   { "file": ".env.example" }, { "file": ".env.sample" }, { "file": ".env.template" }],
  "bootstrap": [{ "script": "setup" }, { "script": "bootstrap" }, { "file": "script/bootstrap" }, { "file": "script/setup" }, { "file": "bin/setup" }]
}
```

Python: `hasDependencies` = pyproject `dependencies = ["`·`dependencies = [ "`·`dependencies = [\n    "`,
`runtimeVersion` = `.python-version`·`.tool-versions`∋`python`·`mise.toml`/`.mise.toml`∋`python`·pyproject∋`requires-python`·pyproject∋`\npython = `(poetry 1),
`lockfile` = `uv.lock`·`poetry.lock`·`pdm.lock`·`pylock.toml`·`Pipfile.lock`·`requirements.txt`∋(`--hash=`|pip-compile·uv 생성 헤더), `serviceFiles`는 node와 같고,
`bootstrap` = `script/bootstrap`·`script/setup`·`bin/setup`.

**코드(`src/presets.mjs`)**: 질문 표는 코드에 고정한다 — `[runtimeVersion, Q1, 언제나]`, `[lockfile, Q2, hasDependencies]`,
`[serviceFiles, Q3, 경로만]`, `[bootstrap, Q4, hasDependencies]`. `detectDeclarations(dir, stack)`은 `resolveStack`의 id로 프리셋을 고르고
(`detectInstallTrace`와 같은 선택), `declare`가 없으면 `null`. 질문마다:
- 묻지 않음(적용 조건 불성립, 또는 Q3에서 답 없음) → `null`
- 아니면 `{ question, state: 'declared' | 'blank', paths }`. Q4는 `firstHolding(env.bootstrap[pm])`이 성립하면 그 lockfile을 `paths` 앞에 둔다.
`condFile()`은 `file`·`fileContains[0]`·`nonEmptyKey[0]`, `script` → `package.json`(holds가 이미 package.json에서 읽는다). 그 밖은 프리셋 작성 오류로 던진다.
doctor가 빈칸의 후보를 안내하도록 `declarationCandidates(preset, key, pm)`(조건 → 경로 목록)도 같은 모듈에 둔다.

**`stack` 출력**:
- JSON: 최상위 `declarations` = `null` | `{ runtimeVersion, lockfile, serviceFiles, bootstrap }`(각 `null` 또는 위 객체). 기존 필드·`status`·`next_actions` 불변.
- 요약 축(설치 흔적 축 바로 뒤): `환경 선언: Q1 .nvmrc, Q2 빈칸, Q4 빈칸` — 경로가 여럿이면 `+`로 잇는다. 묻는 질문이 하나도 없으면 축을 내지 않는다.

**doctor**: `checkEnvDeclarations(targetDir)` → `null` | `{ status: 'warning' | 'pass', detail }`. 스택은 `checkGateFingerprint`처럼
`resolveStack(targetDir, render-state pin)`. warning detail: `저장소가 답하지 못한 환경 질문: Q1 런타임 버전(후보: .nvmrc, …) — 선택 사항이다(D12):
추측해 파일을 만들지 말고 팀이 정한다`에 답한 질문이 있으면 `; 답한 선언: Q3 compose.yaml`.

**영향 소스 파일 5개**(§5-A escalation 대상): `templates/presets/node.json`·`python.json`·`src/presets.mjs`·`src/commands/stack.mjs`·`src/commands/doctor.mjs`.
테스트: `tests/presets.test.mjs`·`tests/detect-testing.test.mjs`·`tests/doctor.test.mjs`·`tests/e2e/init-smoke.test.mjs`. 문서: CHANGELOG·`skills/harness-team/SKILL.md`의 `stack` 줄.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **선언(declaration)**: Q1–Q4 중 하나에 답하는 저장소 안의 기계 판독 파일(또는 `package.json`의 키). 하네스는 그 **경로**만 가리키고 내용을 옮기지 않는다.
- **빈칸(blank)**: 묻는 질문인데 성립하는 선언 후보가 하나도 없는 상태. 요구가 아니라 보고다(D12 "요구하지 않는 것").
- **해당 없음(not asked)**: 질문의 적용 조건이 성립하지 않아 묻지 않음 — JSON `null`. 의존성 0개 저장소의 Q2·Q4, 답 없는 Q3, `declare` 없는 프리셋.
- **hasDependencies**: Q2·Q4의 적용 조건. 매니페스트가 비어 있지 않은 의존성 목록을 선언했는가 — 프리셋 데이터.
- 게이트 근거: 목표(역할 ① — Q1 런타임 버전·Q2·Q4 빈칸, Q3 경로)·제약(D11·D12·envelope 더하기만·status 불변)·영향 파일 5개가 위에 있고,
  D-1–D-9는 정본·실측으로 결정했다. 5개 파일·새 조건 종류는 메인테이너 escalation으로 확인한다.

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

**성공 기준**: `nonEmptyKey`의 세 경우(압축 JSON·빈 `{}`·키 없음) 단위 테스트, `detectDeclarations` 표(node·python·generic·이 저장소),
`.env` 내용 읽기 금지 가드, `stack --json`의 `declarations`·요약 축·status 불변, doctor warning·pass·이 저장소 pass(Q2·Q4 빈칸 없음),
5줄 예산 유지, `npm test` fail 0, `docs:check` 최신, scratchpad e2e(선언 있는/없는 프로젝트를 `stack --target`·`doctor`로).

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- `src/presets.mjs` `holds`·`firstHolding`·`condFile`·`detectInstallTrace` · `src/detect-stack.mjs` `resolveStack`(손대지 않음: `detectPackageManager`)
- `src/commands/stack.mjs` `renderSummary`·`runStack` · `src/commands/doctor.mjs` `checkGateFingerprint`·`checkPrePushHook`·`runDoctor`
- 테스트: `tests/presets.test.mjs`·`tests/detect-testing.test.mjs`(stack CLI)·`tests/doctor.test.mjs`·`tests/e2e/init-smoke.test.mjs`

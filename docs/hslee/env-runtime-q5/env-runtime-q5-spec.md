# env-runtime-q5 — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

D12 정정의 Q5 "지금 준비됐는가" 중 남은 축, **선언 런타임 대 실제 런타임**을 `stack`이 계산할지 가리는 판단 task다.
첫 산출물은 구현이 아니라 go/no-go이고, **결론은 no-go**다(아래 `## 원천 검토` D-1–D-5).

- **문제**: 직전 task `env-state-q5`가 D-1 근거로 이 축을 뺐다. 그 판단을 다시 열 가치가 있는지, 특히 **파일 읽기만으로**
  실제 런타임 값이 확실히 나오는 경우가 있는지 확인되지 않았다.
- **영향**: S0·새 워크트리·게이트 실패 직후 `stack`을 읽는 에이전트. 소비자의 `stack --json` envelope.
- **기대 결과**: go / 축소 go / no-go 중 하나와 그 근거. go면 범위·Done evidence, no-go면 다시 열 신호.
- **제약**: D11(언어·도구 지식은 프리셋 JSON에만) · 런타임 npm 의존성 0개 · `.env.*` 읽기 deny · eager 예산(AGENTS.md 등 무변경) ·
  새 조건 종류가 필요하면 §5-A escalation.

## 범위 (In / Out)
*`- **In**: …`에 이번 task가 바꾸는 것(파일·모듈·동작)을, `- **Out**: …`에 하지 않기로 한 것과 그 이유 한 줄을 쓴다 —
요청하지 않은 기능·관련 없는 리팩터링이 섞이지 않게 긋는 경계다.*

- **In**: 이 task 문서 4종의 판단 기록. 코드·프리셋·`docs/decisions.md`·eager 문서는 바꾸지 않는다.
- **Out**: 런타임 축 구현 전부 — D-5 no-go.
- **Out**: 종결된 `env-state-q5` spec·`docs/decisions.md` D12 수정 — D12는 "범위·감지 대상은 그 task의 spec이 정한다"고 했으므로
  이 spec이 정한 것으로 족하다. D12에 이 판단을 가리키는 한 줄을 둘지는 메인테이너 결정(`## 참고`의 open).

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- `docs/decisions.md` D11·D12 정정(Q5 정의, 역할 ② "게이트가 실패했을 때 환경 탓과 코드 탓을 가르는 근거", 재평가 신호).
- `docs/hslee/env-state-q5/env-state-q5-spec.md` D-1(이 축을 뺀 근거)·D-2. `docs/hslee/env-blank-q1q4/` Q1 `runtimeVersion`·Out.
- `src/presets.mjs` `holds()`(조건 6종 모두 boolean) · `templates/presets/node.json`·`python.json`(`commit`의 `pytest`·`{exec} tsc`).
- 2026-11-03 scratchpad 실측: node v25.6.1 · npm 11.9.0 · pnpm 12.4.1 · yarn 1.22.22(`npx --offline`) · bun 1.3.9 · uv 0.11.16 ·
  CPython 3.14.3(mise)·3.12.13·3.11.15(uv). 각 pm에 로컬 `file:` 의존성 1개를 설치하고 산출물을 grep했다.

### 발견
- (open) D-1: 반대 근거 ① "`process.version`은 하네스의 런타임이다" — 여전히 성립하는가?
  → 결정: **성립한다(이 머신이 실례).** `which node` = `~/.local/share/mise/installs/node/latest/bin/node`, `python3` = mise 설치본,
  uv가 쓰는 3.11·3.12는 `~/.local/share/uv/python/` — 한 머신에 해석 경로가 셋이고 어느 것이 대상 저장소의 것인지는 cwd·shim·활성화가
  정한다. `stack --target`은 cwd 밖을 본다. 하네스 프로세스 하나의 값으로는 대상의 런타임을 말할 수 없다.
- (open) D-2: 반대 근거 ② "대상에서 `node --version`을 띄우는 것은 관측이 아니라 실행이다" — 예외를 둘 만한가?
  → 결정: **두지 않는다.** `stack`은 read-only 관측 envelope이고 `docker info`조차 에이전트에게 넘긴다. 실행이 필요한 비교는
  에이전트 몫이며, 그 출발점(Q1 선언 경로)은 `declarations.runtimeVersion.paths`가 이미 준다(역할 ①).
- (open) D-3: 반대 근거 ③ "범위라 평가기가 필요하다" — 정확 pin만 비교하면 피할 수 있는가?
  → 결정: **피할 수 없다.** pin도 한 문법이 아니다. `.python-version`은 `3.12`·`3.12.13`·`cpython@3.12`·`pypy3.10`·여러 줄을 받고,
  `.nvmrc`는 `lts/*`·`node`·별칭을 받는다. "pin만"으로 줄여도 요청 문법 파서가 필요하고, `engines`·`requires-python`은 여전히 semver·PEP 440이다.
  게다가 지금 `holds()` 조건 6종(file·fileContains·script·dependency·runtimeDependency·nonEmptyKey)은 **모두 boolean**이라, 두 파일의 값을
  꺼내 비교하는 것은 새 조건 종류(또는 새 평가기 형태)다 — 가장 싼 go도 이 task의 §5-A 정지 조건을 넘는다.
- (open) D-4: 파일 읽기만으로 실제 런타임 값이 확실히 나오는 경우가 있는가? → 결정(실측): **Python venv 하나뿐이고, node는 없다.**
  | 산출물 | 런타임 값 | 판정 |
  |---|---|---|
  | uv `.venv/pyvenv.cfg` | `version_info = 3.12.13` | 값 있음. stdlib `venv`는 키가 `version = 3.14.3`(virtualenv는 `version_info`, 추론) — 도구마다 키가 다르다 |
  | npm `node_modules/.package-lock.json`·`package-lock.json` | 없음 | — |
  | pnpm `node_modules/.modules.yaml`·`.pnpm-workspace-state-v1.json`·`.pnpm/lock.yaml` | 없음(설정·타임스탬프만) | — |
  | bun `bun.lock`·`node_modules` | 없음 | — |
  | yarn classic `node_modules/.yarn-integrity` | `systemParams: "darwin-arm64-141"` | **설치 당시** ABI(`process.versions.modules`)라 node major만, 현재 값 아님 |
  | yarn berry `.yarn/install-state.gz` | 미검증 | 이번 세션에 yarn 4를 띄우지 않았다. 직렬화 blob이라 파일 읽기 관측 대상이 아니라고 본다(추론) |
  node 런타임은 mise·nvm·volta 모두 저장소 **밖**에 설치된다. 미검증 예외: pnpm `devEngines.runtime`의 runtime 다운로드는 node를
  `node_modules` 안에 둘 수 있다(네트워크가 필요해 실측하지 않았다, 드문 설정).
- (open) D-5: 남은 Python venv 단서로 축소 go(uv 한정, `.python-version` 대 `pyvenv.cfg`)를 할 가치가 있는가?
  판정 질문은 D12가 이 축에 준 목적 그대로다 — "게이트가 실패했을 때 환경 탓과 코드 탓을 가르는 근거"가 되는 실패가 있는가.
  → 결정: **no-go.** 그런 실패의 경로가 없다(실측):
  1. **새 워크트리(S0)**: `.venv`가 없으면 설치 축(`installTrace: absent`)이 이미 bootstrap `uv sync --locked`를 안내하고, 그 명령이
     선언된 인터프리터로 venv를 만든다 — 런타임 축이 설치 축에 포함된다.
  2. **오래 쓴 체크아웃**: `.python-version`을 3.12→3.11로 바꾸면 `pyvenv.cfg`는 3.12.13에 머물지만, 다음 `uv run`이
     "Removed virtual environment … Creating" 후 3.11.15로, 되돌린 뒤 `uv sync --locked`도 3.12.13으로 **스스로 고쳤다**. 어긋남은 선언을 바꾼 뒤
     다음 uv 명령까지만 산다.
  3. **게이트가 실제로 띄우는 것**: python 프리셋 `commit`은 `uv run pytest`가 아니라 PATH의 `pytest`를 돌린다. `pyvenv.cfg`는 venv의
     인터프리터를 말할 뿐 게이트가 실행하는 런타임을 말하지 않으므로, 맞든 틀리든 게이트 실패를 귀인하지 못한다.
  4. **비용**: D-3대로 새 조건 종류와 요청 문법 파서가 필요하다 — 위 1–3의 가치 없이 escalation을 열 이유가 없다.
  5. **증거**: 실측 사고(`heliosent-profile`)는 설치 축이었고 이미 막혔다. 런타임 버전이 원인인 게이트 실패는 관측된 적이 없다.
- 다이어그램: 옵트인하지 않음(2026-11-03, 판단 task).
- 검토 완료: 2026-11-03

## 설계 / 접근

**결론: no-go.** Q5는 설치 축(`installTrace`)으로 닫는다. 런타임 축은 만들지 않는다.

**다시 열 신호(반증 조건)**: 소비자 저장소에서 failure capsule의 원인 칸(#164)이 `environment`이고 그 원인이 **런타임 버전 불일치**인
실패가 반복되면 다시 연다(D12 재평가 신호의 구체화). 그때의 출발점:
- Python: uv `.venv/pyvenv.cfg#version_info`(venv는 `version`) 대 `.python-version` 첫 줄의 접두 일치. 새 조건 종류 1개 + §5-A escalation부터.
- node: 파일 단서가 없으므로 "에이전트가 `node --version`을 실행해 `declarations.runtimeVersion.paths`와 대조" 안내(`next_actions`)가
  유일한 경로다. 매 실행 잔소리가 되지 않게, 실패 귀인 맥락에서만 내는 조건이 같이 정해져야 한다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **실제 런타임(actual runtime)**: 대상 저장소의 게이트·명령이 **실행될 때** 해석되는 인터프리터와 그 버전. 하네스 프로세스의 런타임이 아니고,
  설치 당시 기록된 값(yarn ABI)도 아니다. 파일 읽기로 얻으려면 그 인터프리터가 저장소 안에 실체화돼 있어야 한다(Python venv만 해당).
- **파일 관측 가능(file-observable)**: 실행 없이 저장소 안 파일을 읽어 값이 확정되는 것. `stack`이 다룰 수 있는 범위의 경계.
- 게이트 근거: Goal(판단 하나)·Constraint(D11·의존성 0·§5-A)·Success(spec·artifact에 근거와 반증 조건)·Context(D-4 실측표) 모두 명확.

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
{ "version": 1, "review": "optional", "tests": "optional" }
```

**성공 기준**: 코드 변경 없음. 이 spec에 D-1–D-5 결정과 반증 조건, artifact에 결과·Learnings, `npm test` fail 0, `docs:check` 최신.

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- `src/presets.mjs` `holds()`·`detectInstallTrace()`·`detectDeclarations()` — 이 판단이 기대는 현재 평가기.
- (open) `docs/decisions.md` D12 정정 끝("다음 단위")에 "Q5 런타임 축은 no-go — task `env-runtime-q5`" 한 줄을 둘지 — 메인테이너 결정.

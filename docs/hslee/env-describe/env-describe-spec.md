# env-describe — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

강의 02의 **지시 하위 시스템**("첫 실행 명령어") 개선과 Python pm 버그 수정. 처음에는 D12의 "환경 서술 제공" 첫 단위로 잡았으나
2026-11-03 메인테이너 검토로 재분류했다 — 하네스가 lockfile에서 추론한 명령 한 줄을 AGENTS.md에 적는 것은 환경이 **스스로** 서술하는 것이 아니다
(아래 `## 원천 검토` 정정 참조). 환경 하위 시스템은 D12 정정과 후속 task가 다룬다.

- **문제 1 — 재현 install 명령이 없다**: 관리 절 `stack`은 `install: npm install`처럼 lockfile을 무시하는 명령만 렌더한다.
  새 워크트리(D5)에서 에이전트는 lockfile을 그대로 지키는 부트스트랩 명령을 모른다 — 2026-10-11 `heliosent-profile` AO
  워크트리에서 `node_modules`가 없어 커밋 게이트 tsc가 실패했고, 사람이 `bun install --frozen-lockfile`을 찾아 풀었다.
- **문제 2 — Python pm이 `pip`으로 고정된다**: `pyproject.toml`만 보면 pm=`pip`, install=`pip install`(인수 없는 `pip install`은
  실행 자체가 실패한다). uv·poetry 저장소의 AGENTS.md에 틀린 명령이 적힌다(`src/detect-stack.mjs:55`).
- **영향**: init·doctor·migrate가 렌더·비교하는 AGENTS.md `stack` 관리 절, `harness-team stack` 요약.
- **기대 결과**: 저장소에 있는 lockfile에서 감지한 사실만 렌더한다. 감지하지 못하면 추측하지 않고 그렇다고 적는다.
- **제약**: D11 — 새 언어·도구 지식은 프리셋 데이터(`templates/presets/*.json`)로만 둔다. 게이트·`pr-check`·`done` 무변경.
  환경 파일 생성 금지. 런타임 npm 의존성 0개 유지.

## 범위 (In / Out)
*`- **In**: …`에 이번 task가 바꾸는 것(파일·모듈·동작)을, `- **Out**: …`에 하지 않기로 한 것과 그 이유 한 줄을 쓴다 —
요청하지 않은 기능·관련 없는 리팩터링이 섞이지 않게 긋는 경계다.*

- **In**: 프리셋 `env.bootstrap` 규칙(lockfile 조건 → 재현 install 명령) — `node.json`·`python.json`.
- **In**: 프리셋 `env.packageManager` 규칙으로 Python pm 감지(uv.lock→uv, poetry.lock→poetry, 그 외 pip). Python install:
  uv→`uv sync`, poetry→`poetry install`, pip→`(configure)`.
- **In**: `templates/AGENTS.md.hbs` `stack` 절 `## 명령`의 `install` 바로 아래 `bootstrap` 줄. 이 저장소 `AGENTS.md` 재렌더.
- **In**: `harness-team stack` 요약에 bootstrap 표기(줄 예산 5줄 유지).
- **Out**: 런타임 버전 감지 — 값 추출기(파일 내용·`engines` 경로)라는 새 메커니즘이 필요하다. 다음 task(D-A, 2026-11-03 결정).
- **Out**: JS lockfile→pm 판정(`detectPackageManager`)의 프리셋 이전 — 동작 변화 없는 이전이라 별도 task.
- **Out**: 환경 하위 시스템 자체(빈칸 보고·상태 계산 Q5, 환경 변수·서비스 서술) — D12 정정과 후속 task.
- **Out**: `mise.toml` — TOML 파서 없이 읽을 수 없다(런타임 의존성 0개).

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- `docs/decisions.md` D11(범위 헌장)·D12(환경 하위 시스템).
- walkinglabs `learn-harness-engineering` 강의 02 — 지시 하위 시스템의 "첫 실행 명령어", 환경 하위 시스템 정의.
- 각 도구의 공식 문서(npm ci, pnpm, Yarn classic·berry, Bun, uv, Poetry) — 재현 install 플래그의 정본.

### 발견
- (unresolved) D12는 "관리 절 `## 환경`"이라 적었고, 이 spec은 새 마커 대신 기존 `stack` 절 안의 소제목으로 둔다.
  → 결정: 소제목으로 둔다 — 새 마커는 init·migrate·doctor의 마커 처리 전부를 건드린다(2차 장치 규칙). D12 문구와 충돌하지 않는다.
  → **정정(2026-11-03, 메인테이너 검토)**: `## 환경` 소제목을 없애고 `bootstrap`을 `## 명령` 아래 한 줄로 옮긴다. "환경 상태가 자기 서술적"이란
  처음 온 에이전트가 묻지 않고 저장소만으로 Q1 필요한 것·Q2 정확한 의존성·Q3 떠 있어야 할 것·Q4 준비 방법·**Q5 지금 준비됐는가**에 답할 수 있는 상태다.
  이 task는 Q4의 명령 하나를 하네스가 대신 적을 뿐이라 `## 환경`이라는 이름은 실제보다 많은 것을 약속한다. 명령은 지시 하위 시스템에 속한다.
- (open) D-B: `install` 줄 자체를 재현 명령으로 바꿀지, `bootstrap` 줄을 따로 둘지 — `cmdInstall`은 settings.json Bash allowlist에도
  들어간다(`src/settings-permissions.mjs:30`).
  → 결정(2026-11-03, 메인테이너): `install`은 그대로 두고 `bootstrap` 줄을 따로 둔다 — settings allowlist는 바뀌지 않는다.
- (open) D-A: 런타임 버전 감지를 이번 범위에 넣을지. → 결정(2026-11-03, 메인테이너): 넣지 않는다 — 다음 task.
- 다이어그램: 옵트인하지 않음(2026-11-03).
- (open) Python pm이 바뀌면 커밋 게이트 fingerprint의 `pm`도 바뀐다(`src/presets.mjs` `fingerprintDrift`).
  → 결정: 받아들인다 — 실제로 pm이 바뀐 것이라 정확한 경고이고 한 번뿐이며, `gate suggest`로 재확정하면 사라진다. CHANGELOG에 소비자 영향으로 적는다.
- (open) 재현 플래그 표의 공식 문서 대조(Yarn berry `--immutable` vs classic `--frozen-lockfile`, Poetry 2.x `install`의 lock 존중) — plan 1단계.
  → 결정(2026-11-03 대조): npm `ci`(lockfile 필수·불일치 시 실패) · pnpm `--frozen-lockfile`(불일치·부재 시 실패) · Yarn classic
  `--frozen-lockfile` · Yarn berry `--immutable`(`--frozen-lockfile`은 deprecated 별칭) · Bun `--frozen-lockfile`은 **`bun.lock`만**
  검증한다 — `bun.lockb`는 검증하지 않고 `bun.lock`으로 변환하므로 규칙에서 뺀다 · uv `sync --locked`("Assert that the uv.lock will
  remain unchanged") · Poetry `install`(lock이 있으면 그 버전을 쓴다; `sync`는 2.x 전용이고 빈 환경에서는 결과가 같다).
- 검토 완료: 2026-11-03

## 설계 / 접근

**데이터(프리셋)**: 언어 지식은 JSON에만 둔다. 조건은 기존 `holds()` 문법(`file`·`fileContains`, 배열은 any-of)을 그대로 쓰고, 첫 매치가 이긴다.

```json
"env": {
  "bootstrap": [
    { "when": { "file": "pnpm-lock.yaml" }, "run": "pnpm install --frozen-lockfile" },
    { "when": { "fileContains": ["yarn.lock", "__metadata"] }, "run": "yarn install --immutable" },
    { "when": { "file": "yarn.lock" }, "run": "yarn install --frozen-lockfile" },
    { "when": { "file": "bun.lock" }, "run": "bun install --frozen-lockfile" },
    { "when": { "file": "package-lock.json" }, "run": "npm ci" }
  ]
}
```

Python 프리셋은 `env.packageManager`(`{ when, id, install }`)와 `env.bootstrap`(uv.lock→`uv sync --locked`, poetry.lock→`poetry install`)을 둔다.
(플래그는 `## 원천 검토`의 대조 결과로 확정했다.)

**코드**: 프리셋 `env` 규칙을 평가하는 언어 무관 함수 하나(`presets.mjs`, `holds()` 재사용). `detectStack`의 profile에 `cmdBootstrap`을 더하고,
Python 분기는 하드코딩된 `pm: 'pip'` 대신 프리셋 규칙 결과를 쓴다. 매치하는 규칙이 없으면(lockfile 없음·`bun.lockb`만 있음 등)
기존 관례대로 `cmdBootstrap = '(configure)'` — 추측해 적지 않는다(D12).

**렌더**: `stack` 관리 절에 다음을 더한다. 소비자 저장소는 다음 doctor에서 `findStaleManagedSections`가 이 절을 낡음으로 보고하고,
사용자가 init을 다시 돌려 반영한다(0.42.1 protocol 절과 같은 기존 경로, D8).

```
## 명령
- install: `{{cmdInstall}}`
- bootstrap (lockfile 고정): `{{cmdBootstrap}}`
```

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **bootstrap(재현 install)**: 빈 체크아웃에서 lockfile을 바꾸지 않고 의존성을 그대로 설치하는 명령. lockfile이 실제와 어긋나면 실패해야 한다.
- **install**: 의존성을 설치·갱신하는 명령(lockfile 갱신 가능). 기존 `cmdInstall`.
- **env 규칙**: 프리셋 JSON의 `{ when, … }` 목록. `when`은 `holds()` 조건, 첫 매치가 이긴다.
- 게이트 근거: 목표·제약·영향 파일은 위에 명시했고, D-A(범위)·D-B(install 처리)는 2026-11-03 결정됐다. 남은 (open)은 플래그 표 대조(plan 2단계)뿐이다.

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

**성공 기준**: lockfile 종류별(pnpm·yarn classic·yarn berry·bun.lock·bun.lockb만·npm·uv·poetry·없음) `cmdBootstrap` 단위 테스트,
Python pm 3분기 테스트, `stack` 절 렌더 테스트 갱신, `npm test` fail 0, 이 저장소 AGENTS.md 재렌더 결과에 `(configure)`(lockfile 없음).

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- `src/detect-stack.mjs:24`(`detectPackageManager`)·`:54`(Python 분기)·`buildProfile`
- `src/presets.mjs:60`(`holds`)·`templates/presets/node.json`(`pm` 표 선례)
- `src/settings-permissions.mjs:30`(`cmdInstall` → allowlist)
- `src/commands/doctor.mjs:358`(`findStaleManagedSections`)·`src/commands/migrate.mjs:627`
- 테스트: `tests/detect-stack.test.mjs:64`(`pip install` 단언)·`tests/agent-files.test.mjs`·`tests/settings-permissions.test.mjs`

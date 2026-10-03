# harness-version-stamp — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: 소비자 프로젝트에 "마지막으로 init을 돌린 하네스 버전"이 기록되지 않는다. 확인 수단은
  `harness-team --version`(PATH CLI)과 doctor의 `cliDriftWarning`(PATH CLI vs 설치 플러그인, 불일치일
  때만 경고)뿐이고, 둘 다 머신 상태지 프로젝트 상태가 아니다. `.harness/render-state.json`의
  `"version": 1`은 스키마 버전이다.
- **영향**: 소비자 프로젝트 팀원 — 프로젝트가 낡은 관리 절로 남았는지, 반대로 더 새 하네스로 적용된
  프로젝트에 구버전 CLI로 init 하려는지 알 수 없다.
- **기대 결과**:
  1. `init`이 render-state를 저장할 때 실행 중인 하네스의 `package.json` version을 `harnessVersion`으로 쓴다.
  2. `doctor`(사람용 + `--json`)가 `project applied X · CLI Y · plugin Z` 한 줄을 보여 준다.
     기록 없음은 `unknown (기록 이전 설치)`.
  3. 기록 < 실행 중 CLI → warning + next_actions `harness-team init --yes`.
     기록 > 실행 중 CLI → warning(구버전 CLI init은 관리 절 퇴행 위험).
- **제약**: 새 의존성 금지. 타임스탬프(`appliedAt`)를 넣지 않는다(매 init diff 유발). init 차단은 범위 밖 —
  경고만. SessionStart 훅 nudge는 범위 밖(후속 후보). src/ 수정 파일 5개 이하.

## 설계 / 접근

- `src/render-state.mjs`
  - `readHarnessVersion(root)` — `<root>/package.json`의 version(semver 형식일 때만, 아니면 null).
  - `loadRenderState`는 `harnessVersion`을 #113 `stack` 선례처럼 **semver 형식일 때만** 통과시킨다.
    형식이 틀리거나 없으면 필드를 빼서 "기록 이전 설치"와 같게 본다.
- `src/harness.mjs` `planChanges` — renderState 구성에 `harnessVersion`(= `readHarnessVersion(ctx.root)`)을 넣는다.
  init은 이 renderState를 Apply 뒤 저장하므로 `src/commands/init.mjs`는 수정이 필요 없다(저장 경로 그대로).
- `src/commands/doctor.mjs`
  - `compareVersions(a, b)` — major.minor.patch 3-way(-1/0/1), 형식이 아니면 null. `isAtLeast`와 같은 파일.
  - `harnessVersionReport({ applied, cli, plugin, pluginDev })` — 순수 함수. `{ line, warning, action }`.
  - `checkCliDrift`의 installed_plugins.json 읽기를 `readInstalledHarnessVersion(env)`로 떼어 재사용한다.
  - 출력: check `harness version`(일치·unknown은 pass, 불일치는 warning) + JSON `extra.versions`
    `{ project, cli, plugin }`(모르면 null).
  - plugin-dev 저장소는 init 대상이 아니므로 project를 `n/a (plugin-dev repo)`로 표시하고 경고하지 않는다.
  - 기록 > CLI 경고의 next_action은 기존 CLI 갱신 명령(`cliDriftAction`)을 재사용한다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **applied version (`harnessVersion`)**: 이 프로젝트에 마지막으로 init(Apply까지 완료)을 실행한 하네스의
  `package.json` version. render-state.json에 저장. 스키마 버전 `version`과 별개.
- **CLI version**: doctor를 실행 중인 하네스 코드(`ctx.root/package.json`)의 version. PATH CLI와 다를 수 있다
  (그 불일치는 기존 `global CLI version drift`가 담당).
- **plugin version**: `installed_plugins.json`의 harness 레코드 version(`installedHarnessVersion`).
- **기록 이전 설치**: render-state에 `harnessVersion`이 없거나 형식이 틀린 설치본 — unknown, 경고 없음.
- 게이트 근거: 목표·제약·성공기준·영향 파일이 사용자 승인 계획으로 확정됨(2026-10-03 orchestrator 위임).

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- `src/render-state.mjs` `loadRenderState` — `stack` 필드 선례(#113)
- `src/commands/doctor.mjs` `isAtLeast`·`cliDriftWarning`·`installedHarnessVersion`
- 테스트: `tests/render-state.test.mjs`, `tests/doctor.test.mjs`, `tests/cli-drift.test.mjs`

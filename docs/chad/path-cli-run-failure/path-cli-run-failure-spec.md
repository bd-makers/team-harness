# path-cli-run-failure — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.
다른 역할에 물어야 하면 `- (ask:<역할>) …` → `(asked:<역할> <날짜> <링크>)` → `(answered <링크>)`로 상태를 적고, 반영하면 지운다.*

**문제.** `doctor`의 `global CLI version drift` 검사가 PATH `harness-team --version`의 **실행 실패**를
"`--version` 미지원 옛 CLI(0.15.1 이전)"로 오진한다. `readPathCliVersion`이 127이 아닌 모든 0 아닌 exit를
`legacy`로 보기 때문이다.

관측 사고 (2026-11-23, 0.58.2 릴리스 직후): `harness-team`은 mise shim이었고 npm 전역 링크는 node@24.22.1에
있었는데 활성 Node가 24.22.2로 바뀌어 shim이 `mise ERROR harness-team is not provided by the active node@24.22.2`를
내고 exit 1로 끝났다. doctor는 "구버전 CLI로 실행 중 — clone을 git pull"을 처방했지만 CLI는 옛 버전이 아니라
**실행되지 않는** 상태였고(훅도 실패), 해결은 활성 Node에서 `npm i -g "<clone>"`였다.

**영향.** 메인테이너(plugin-dev 모드 — 소비자용 hook CLI 검사가 skip되므로 이 검사가 유일한 신호)와 소비자.

**기대 결과.** 실행 실패면 원인 출력의 첫 줄을 싣고 "다시 설치·연결"을 처방한다. 진짜 옛 CLI는 지금처럼
`--version` 미지원 경고를 낸다.

**제약.** 판정은 격리 테스트(가짜 바이너리)로 재현 가능해야 한다. 릴리스는 하지 않는다.


## 범위 (In / Out)
*`- **In**: …`에 이번 task가 바꾸는 것(파일·모듈·동작)을, `- **Out**: …`에 하지 않기로 한 것과 그 이유 한 줄을 쓴다 —
요청하지 않은 기능·관련 없는 리팩터링이 섞이지 않게 긋는 경계다.*

- **In**: `src/commands/doctor.mjs`의 `readPathCliVersion`·`cliDriftWarning`·`checkCliDrift`와 JSON `next_actions` 처방,
  `tests/cli-drift.test.mjs`, 같은 사실을 적은 현행 문서(`MAINTAINING.md`·`docs/prerequisites.md`·README 등).
- **Out**: 소비자용 `SessionStart/post-commit hook CLI` 검사 문구 — 이미 "실행되지 않거나"를 포함해 사실과 어긋나지 않는다.
  종결된 task 문서(`docs/chad/global-cli-drift/*` 등) — 이력이라 고치지 않는다. 타임아웃·신호(`unknown`) 판정 — 이번 사고와 무관.


## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`(다른 역할에 물을 것이면 `(ask:<역할>)`)으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- 상위 세션 지시(2026-11-23)와 사고 기록, `git show v0.2.0..v0.15.0:bin/harness-team.mjs`.

### 발견
- v0.2.0~v0.15.0 전 태그가 알 수 없는 인자에 `Unknown command: ${cmd}`를 stderr로 내고 exit 1 — 옛 CLI의 **양성 표지**가 있다.
- 검토 완료: 2026-11-23


## 설계 / 접근

1. **옛 CLI는 양성 표지로만 판정한다.** `--version` 호출이 0 아닌 exit로 끝나고 stderr에
   `Unknown command: --version`이 있을 때만 `legacy`. 0.15.1 이전 모든 릴리스가 정확히 이 줄을 stderr로 낸다 — stderr의 한 줄 전체로만 대조한다(stdout·접두 일치 불인정).
2. **그 밖의 0 아닌 exit는 `failed`** — `{ state: 'failed', code, detail }`, `detail`은 출력의 첫 비어 있지 않은 줄
   (없으면 `출력 없음`), 길이 제한. 127(래퍼가 대상 실행 파일을 못 찾음)도 같은 부류라 `failed`로 접는다 —
   "버전을 모른다"가 아니라 "실행되지 않는다"는 사실은 확실하고, 메시지가 버전을 단정하지 않는다.
3. **`failed`는 자기 경고를 낸다** — 설치 버전 게이트(`VERSION_FLAG_SINCE`) 없이. plugin-dev 모드에서는 hook CLI
   검사가 skip되어 이것이 유일한 신호다. 처방은 `hookCliInstallCommand`(활성 Node에서 `npm i -g "<clone>"`)와
   버전 관리자 shim(mise·nvm·asdf) 언급.
4. **JSON `next_actions`도 상태별로** — `failed`면 `npm i -g …`, 버전 불일치·`legacy`면 기존 `git -C <clone> pull`.
   `checkCliDrift`가 `{ warning, action }`(또는 null)을 돌려준다.
5. `missing`·`unknown`(타임아웃·신호·숫자 아닌 오류)·`version` 판정은 그대로.

### 기각한 대안
- exit 코드만으로 구분(1=legacy, 그 외=failed): mise·nvm shim도 exit 1이라 이번 사고를 못 가른다.


## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **legacy (옛 CLI)**: PATH CLI가 실행됐고 `--version`을 `Unknown command: --version`으로 거절함 — 0.15.1 이전의 양성 표지.
- **failed (실행 실패)**: PATH CLI 호출이 0 아닌 exit(127 포함)로 끝났으나 옛 CLI 표지가 없음 — 버전에 대해 아무것도 말하지 않는다.
- 게이트 근거: 목표·제약·성공 기준·영향 파일이 위에 모두 명시됨(가중합 1.0).

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

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- `tests/cli-drift.test.mjs` — `readPathCliVersion` 상태 판정과 경고 문구
- `src/commands/doctor.mjs` `readPathCliVersion`·`cliDriftWarning`·`checkCliDrift`
- 선행 task: `docs/chad/global-cli-drift/`

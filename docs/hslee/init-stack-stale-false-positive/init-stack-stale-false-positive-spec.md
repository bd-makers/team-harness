# init-stack-stale-false-positive — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: `init --stack X`로 감지 스택과 다른 스택을 강제하면 그 선택이 어디에도 저장되지 않는다.
  그래서 (1) 직후 `doctor`가 `AGENTS.md#stack`을 stale로 경고하고 `harness-team init`을 처방하며,
  (2) 그 처방대로 플래그 없는 `init`을 돌리면 stack 절이 감지 스택으로 **조용히 되돌아간다**
  (실측: `node` 프로젝트에 `--stack next` → `Runtime: Next.js` → 플래그 없는 init → `Runtime: Node.js`).
- **영향**: 감지와 다른 스택을 쓰는 소비자 프로젝트(예: 감지는 `node`인 Next.js 모노레포 패키지).
  doctor 경고가 사용자의 의도적 선택을 되돌리는 처방을 낸다.
- **기대 결과**: `init --stack X` 직후 doctor는 stack 절을 stale로 보지 않는다. 이후 플래그 없는
  `init`도 X를 유지한다.
- **제약**: 런타임 의존성 0 · 기존 render-state 설치본과 호환(필드가 없으면 오늘 동작) · 버전 범프 없음.

## 설계 / 접근

근본 원인: 관리 절 렌더 입력 중 스택만 재현 불가능하다 — `init`은 `resolveStack(dir, --stack)`로,
`doctor`(`findStaleManagedSections`)·`migrate`(`migrateManagedSectionBackup`)·플래그 없는 `init`은
`detectStack(dir)`로 렌더한다. 강제 스택을 **렌더 입력으로 저장**하고 세 소비자가 같은 입력으로 푼다.

**결정(2026-09-27, 사용자 → 오케스트레이터)**: 선택지 A + A-1.
- `.harness/render-state.json`에 선택 필드 `stack`(강제 스택 id)을 둔다. `loadRenderState`는
  `KNOWN_STACK_IDS`에 있는 값만 돌려준다(손 편집·오타는 버림 → 감지).
- `init`: 고정값 = `--stack` 없으면 이전 고정값, `--stack <감지 id>`면 없음(고정 해제), 그 밖엔 그 id.
  렌더는 `resolveStack(dir, 고정값)`, 저장은 Apply 뒤 render-state와 함께(`planChanges`의 `stackPin`).
- `doctor findStaleManagedSections`·`migrate migrateManagedSectionBackup`: `resolveStack(dir, state.stack)`.
- 필드가 없으면 세 경로 모두 `resolveStack(dir, undefined)` = 감지 → 기존 설치본 동작 불변.
- 호환: 구버전 CLI가 init하면 로더가 필드를 모르고 저장 시 빠진다 → 오늘 동작으로 퇴행(악화 없음).

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **감지 스택**: `detectStack(dir)` 결과 — 디스크(package.json·pyproject·go.mod) 증거.
- **강제 스택(고정값)**: `init --stack <id>`로 사용자가 지정한, 감지와 다른 id. render-state `stack`에 남는다.
- **유효 스택**: 관리 절 렌더에 실제로 쓰인 스택 = `resolveStack(dir, 강제 ?? 없음)`.
- 게이트 근거: 재현 테스트(`tests/doctor.test.mjs` "init --stack 으로 감지와 다른 스택을 강제한 직후")로
  Goal·Success가 코드로 고정됐고, 영향 파일(init·harness planChanges·render-state·doctor·migrate)을 식별했다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? (저장 위치 결정 수령)
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 (1.0 — 결정 수령 후 재평가)

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
<!--
```json
{ "version": 1, "review": "required", "tests": "skip" }
```
-->

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 근거: `docs/hslee/managed-section-refresh-path/managed-section-refresh-path-artifact.md` "남은 리스크".
- 재현: `tests/doctor.test.mjs` — `findStaleManagedSections: init --stack 으로 감지와 다른 스택을 강제한 직후 …`
  (수정 전 실패: `['AGENTS.md#stack']`). init 고정·해제는 `tests/detect-stack.test.mjs`,
  로더는 `tests/render-state.test.mjs`, migrate는 `tests/migrate-managed-backup.test.mjs`.
- 코드: `src/commands/init.mjs`(resolveStack) · `src/harness.mjs` `planChanges`(renderState 생성) ·
  `src/render-state.mjs` · `src/commands/doctor.mjs` `findStaleManagedSections` ·
  `src/commands/migrate.mjs` `migrateManagedSectionBackup`(주석이 이 한계를 이미 적어 둠).
- (결정됨 → 설계 절) 강제 스택 저장 위치 — 검토한 선택지:
  - **A(권장)** `.harness/render-state.json`에 `stack` 필드 추가. 이미 커밋 대상인 "마지막 렌더 입력" 저장소라
    의미가 맞다. 추가 필드라 없으면 오늘 동작. 구버전 CLI가 init하면 필드가 빠져 오늘 동작으로 퇴행(악화 없음).
    하위 결정: `--stack <감지 id>`면 필드를 지워 자동 감지로 복귀(권장) vs 명시값은 항상 고정.
  - B `.harness/config.json` — gitignore된 개인 설정이라 팀원의 init이 되돌린다. 기각 권장.
  - C 새 파일 `.harness/stack.json`(커밋) — A와 효과 동일, 파일·gitignore 표면만 늘어난다.
  - D 스키마 무변경: doctor가 기록된 stack 절 해시와 후보 스택 렌더를 대조해 역추론. scripts·pm이 바뀌면
    깨지는 휴리스틱이고 plain init의 되돌림은 못 고친다.
  - E doctor가 `stack` 절을 stale 검사에서 제외. scripts 변경 같은 진짜 stale 신호를 잃고 되돌림은 그대로.

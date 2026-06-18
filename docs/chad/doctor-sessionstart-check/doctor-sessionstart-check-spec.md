# doctor-sessionstart-check — Spec

## 목적 / 요구사항

0.9에서 SessionStart task-gate hook이 도입됐고, `apply`(deep-merge)·`migrate`(보강)가 hook을
프로젝트에 **추가**한다. 그러나 `doctor`는 이 hook의 존재를 **점검하지 않는다** —
`.claude/settings.json`을 valid-JSON 여부로만 검사([doctor.mjs:78](src/commands/doctor.mjs:78)).
따라서 0.9 이전에 scaffold된 프로젝트가 task-gate 없이 있어도 doctor가 침묵한다.

**요구사항:** doctor가 `.claude/settings.json`에 SessionStart task-gate hook(`session-context`
호출)이 없으면 **경고**하고 `apply`(또는 `migrate`)로 유도한다. enforcement 삼각 완성 —
apply/migrate는 "추가", doctor는 "감지".

## 설계 / 접근

### 소프트 경고 (fail 미가산)
기존 `checkActiveSpecGate`·`detectLegacyStructure` 패턴을 따른다: 경고 문자열 반환(또는 null),
`add(label, 'warning', ...)`로 등록. **fail++ 하지 않음 / exit code 안 바꿈.** 근거:
구버전 프로젝트가 정당하게 hook 없이 존재할 수 있고, hard fail은 그들의 CI를 깨뜨린다.
이는 "outdated, run apply" 권고지 무결성 실패가 아니다.

### DRY — `settingsHasSessionGate` 추출
hook 존재 판별 로직이 이미 `migrate.mjs`(`migrateSessionStartHook`)에 인라인으로 있다.
"task-gate가 있다"의 단일 정의를 `session-context.mjs`에 `settingsHasSessionGate(settings)`로
추출하고, migrate·doctor가 공유한다. (`planHasOpenBoxes`와 동일한 SSOT 철학.)

### Touch points
| 파일 | 변경 |
|---|---|
| `src/commands/session-context.mjs` | `settingsHasSessionGate(settings)` export |
| `src/commands/migrate.mjs` | 인라인 `hasGate` → `settingsHasSessionGate` 사용 |
| `src/commands/doctor.mjs` | `checkSessionStartHook(targetDir)` 추가 + `runDoctor` 경고 배선 + JSON `warnActions`에 `harness-team apply` |
| `tests/doctor.test.mjs` | hook 없음 → 경고 / 있음 → null / settings.json 부재 → null |

## Ontology
- **SessionStart task-gate hook**: `.claude/settings.json`의 `hooks.SessionStart[].hooks[]` 중
  `command`에 `session-context`를 포함하는 항목. 이게 있으면 "task-gate 보유".
- **소프트 경고(warning)**: doctor가 fail/exit code에 가산하지 않고 ⚠️로만 알리는 권고.
  (vs **fail**: 필수 점검 실패 → exit 1.)

## Ambiguity 자가진단
*직전 session-task-gate task에서 hook 구조·감지 로직·apply/migrate 경로를 모두 구현·검증했으므로
이 task의 입력 모호성은 매우 낮다(미러 기능).*

- [x] **Goal 명확도** — "doctor가 SessionStart task-gate hook 부재 시 경고 + apply 유도".
- [x] **Constraint 명확도** — 소프트 경고(fail 미가산), 기존 check 패턴 준수, 감지 로직 DRY 추출.
- [x] **Success 기준** — 아래 3 테스트 + 전체 스위트 green.
- [x] **Context 명확도** — 영향 4파일 식별, doctor.mjs CHECKS/warning 패턴 확인 완료.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

> 게이트 통과 근거: session-task-gate(0.9.0/0.9.1)에서 hook 계약·감지 로직을 이미 확정.
> 이 task는 그 감지를 doctor에 노출하는 미러 작업이라 신규 모호성 없음.

## Success 기준 (테스트)
`tests/doctor.test.mjs`:
1. settings.json에 SessionStart task-gate 없음 → `checkSessionStartHook`가 경고 문자열(+'apply' 포함).
2. settings.json에 task-gate 있음 → null.
3. settings.json 부재/invalid → null (CHECKS의 required JSON 검사가 이미 담당, 중복 fail 금지).

## 참고
- 재사용 대상: `migrate.mjs` `migrateSessionStartHook`의 `hasGate` 판별식.
- 관련 릴리스: 0.9.0(hook 도입)·0.9.1(migrate 보강).

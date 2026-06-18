# doctor-sessionstart-check — Plan

> TDD. 러너: `npm test`. 완료 시 `- [x]`.

**목표:** doctor가 `.claude/settings.json`에 SessionStart task-gate hook 부재 시 소프트 경고(fail 미가산) + `apply` 유도. hook 감지 로직은 `settingsHasSessionGate`로 DRY 추출해 migrate·doctor 공유.

## 단계

### Task 1: `settingsHasSessionGate` 추출 + migrate 리팩토링
- [x] **Step 1: `session-context.mjs`에 `settingsHasSessionGate(settings)` export** — `(settings?.hooks?.SessionStart || []).some(g => (g.hooks||[]).some(h => typeof h.command==='string' && h.command.includes('session-context')))`.
- [x] **Step 2: `migrate.mjs` `migrateSessionStartHook`의 인라인 `hasGate`를 `settingsHasSessionGate(settings)`로 교체** (import 추가).
- [x] **Step 3: 회귀 확인** — `node --test tests/migrate-session-hook.test.mjs` green.
- [x] **Step 4: Commit** — `refactor(session-context): extract settingsHasSessionGate (share migrate+doctor)`.

### Task 2: doctor 경고 (TDD)
- [x] **Step 1: 실패 테스트** (`tests/doctor.test.mjs`에 `checkSessionStartHook` import + 3케이스): hook 없음→경고('apply' 포함), 있음→null, settings.json 부재→null.
- [x] **Step 2: 실패 확인** (`checkSessionStartHook` 미존재).
- [x] **Step 3: `doctor.mjs` 구현** — `export async function checkSessionStartHook(targetDir)`: settings.json read·parse(실패 시 null), `settingsHasSessionGate` false면 경고 문자열 `'SessionStart task-gate hook 없음 (0.9+) — run: harness-team apply (또는 migrate)'` 반환, 아니면 null.
- [x] **Step 4: `runDoctor` 배선** — spec-gate 경고 근처에 `const hookWarning = await checkSessionStartHook(ctx.targetDir); if (hookWarning) add('SessionStart task-gate','warning',hookWarning, \`\\n⚠️ ${hookWarning}\`);` + JSON `warnActions`에 `if (hookWarning) warnActions.push('harness-team apply')`.
- [x] **Step 5: 통과 + `npm test` 전체 green.**
- [x] **Step 6: 수동 검증** — 이 repo `doctor` 실행 시 task-gate hook 있으므로 경고 없음 확인.
- [x] **Step 7: Commit** — `feat(doctor): warn on missing SessionStart task-gate hook`.

### Task 3: 마무리
- [x] **Step 1: artifact 기록** (결과·학습, advisor 리뷰 시 ## Reviews).
- [x] **Step 2: CHANGELOG [Unreleased] 추가** (doctor 경고).
- [ ] **Step 3: 완료 신호 → done (사용자 게이트).**

## Ontology 변경 로그
- (2026-06-18) **settingsHasSessionGate**, **소프트 경고 vs fail** — spec.md Ontology 반영.

## 참고
- spec: `doctor-sessionstart-check-spec.md`

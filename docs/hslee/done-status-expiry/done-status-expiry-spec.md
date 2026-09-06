# done-status-expiry — Spec

## 목적 / 요구사항

**문제.** `meta.json`의 `status`는 **쓰이기만 하고 정본으로 읽히지 않는다.** 읽는 곳은
`summary`의 원장 렌더링 하나뿐이다(`src/commands/summary.mjs:124`). 그 결과 완료 상태가
만료되지 않고 두 곳에서 어긋난다:

1. **재활성화가 완료 상태를 만료시키지 않는다.** `runTask`의 기존 디렉터리 분기
   (`src/commands/task.mjs:232`)는 `active.json.switchedAt`만 갱신하고 meta는 손대지 않는다.
   done된 task를 다시 활성화하면 `status: "done"`·`closedAt`이 그대로 남아,
   **지금 작업 중인 활성 task가 원장에서 "✅ done"으로 보인다.**
2. **재개 후보 판정이 `status`를 안 본다.** `listIncompleteTasks`
   (`src/commands/session-context.mjs:39`)는 `planHasOpenBoxes` 하나로 후보를 정한다.
   `done --force`로 종결했거나 다이어그램 옵트인 규약대로 미실행 단계를 열어 둔 채 닫은 task는
   **SessionStart 재개 후보로 영구히 뜬다.**

**영향.** (1)은 원장·`list`를 읽는 사람과 에이전트에게 거짓 상태를 준다. (2)는 종결된 task를
매 세션 재개 후보로 밀어 넣어 task-gate nudge의 신호를 떨어뜨린다. 둘 다 AGENTS.md가
"harness가 소유하는 기계 상태"라고 규정한 meta의 신뢰를 깎는다.

**기대 결과.** 완료 상태에 **전이(transition)** 를 준다 — done된 task를 다시 활성화하면 그
완료는 만료되어 `open`으로 되돌아가고, 완료 상태는 재개 후보 판정의 정본이 된다.

**제약.**
- 새 status 값·TTL·아카이브 개념을 도입하지 않는다(사용자 결정: 상태 전이형).
- `firstActivatedAt`의 문서화된 불변식("생성 시 1회만 기록")을 깨지 않는다 —
  AGENTS.md와 `tests/summary.test.mjs:88`이 고정한 계약이다.
- 기존 done 가드의 판정 창 동작(`tests/done-guard.test.mjs:619`)을 회귀시키지 않는다.
- meta가 없는 구 task(레거시)는 지금 동작(재개 후보로 취급)을 그대로 유지한다.

## 설계 / 접근

**1. reopen 전이 — `runTask` 기존 디렉터리 분기**
meta를 읽어 `status === 'done'`이면 `status: 'open'`, `closedAt: null`,
`reopenedAt: <now>`로 다시 쓴다. `status`가 done이 아니면 meta를 **건드리지 않는다**(현행 유지).
출력은 `activated:` 대신 `reopened:`로 구분한다(text·`--json` summary 양쪽) — 전이가
관측 가능해야 테스트가 붙는다.

**2. 판정 창은 `reopenedAt`을 우선한다**
done 가드의 창 시작점을 `meta.reopenedAt || meta.firstActivatedAt`로 해석한다
(`src/commands/task.mjs:503` 부근). 근거: reopen 이후의 완료는 **새 라운드의 증거**로 판정해야
한다. 옛 `firstActivatedAt`을 그대로 쓰면 `git log --since`가 몇 달치를 훑어 "커밋 0개" 가드가
사실상 무력해진다. `reopenedAt`은 reopen이 일어날 때만 기록하므로
`taskMetaTemplate`은 바뀌지 않고, 키가 없는 meta는 종전대로 `firstActivatedAt`을 쓴다.

**3. 재개 후보 판정이 status를 읽는다**
`listIncompleteTasks`에서 `readTaskMeta`가 돌려준 `status === 'done'`인 task를 후보에서
제외한다. meta가 없거나 읽히지 않으면 **제외하지 않는다**(레거시 하위 호환).
비용: task당 작은 JSON 읽기 1회가 늘지만, done task는 `plan.md`의 `readFile`+`stat`을
건너뛰므로 순증가는 미미하다.

**범위 밖.** TCC(`<name>-context.md`) 만료, 시간 기반 TTL/아카이브, `list`의 status 표시,
doctor 검사 추가. (TCC는 원 권고가 ⑦에 "TCC 중복 검토 선행"을 달아 둔 항목이라 분리한다.)

## Ontology

- **완료 상태(`meta.status: "done"`)**: 이 task가 종결되었다는 harness 소유의 기계 상태.
  `done`이 쓰고, 원장 렌더링이 읽는다. 이 task에서 **재개 후보 판정도 읽는 정본**이 된다.
- **만료(expiry)**: 여기서는 **시간 경과가 아니라 상태 전이**다 —
  done된 task를 다시 활성화하는 행위가 그 완료를 무효로 만든다(`done → open`).
  TTL·아카이브는 이 정의에 포함되지 않는다.
- **reopen**: 완료가 만료되는 그 전이. `reopenedAt`이 그 시각을 기록하며,
  **done 가드 판정 창의 새 시작점**이 된다.
- **판정 창(evidence window)**: done 가드가 "이 task를 실제로 했는가"를 git 이력에서 찾는 구간.
  시작점은 `reopenedAt || firstActivatedAt`, 즉 **현재 라운드의 시작**이다.
- **재개 후보**: SessionStart nudge가 "재개:"로 제시하는 task.
  이 task 이후의 정의 = `status`가 done이 아니고(meta 없으면 통과) plan에 열린 체크박스가 있는 task.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — "done된 task를 재활성화하면 완료가 만료되어 open으로 돌아가고,
      완료 상태가 재개 후보 판정의 정본이 된다." 사용자가 3개 읽기 중 상태 전이형을 선택해 확정.
- [x] **Constraint 명확도** (30%) — 새 status·TTL 금지, `firstActivatedAt` 불변식 유지,
      `tests/done-guard.test.mjs:619` 회귀 금지, 레거시 meta 하위 호환. 전부 위 제약 절에 명시.
- [x] **Success 기준** (30%) — 아래 Done evidence + plan의 검증 단계. 관측 가능한 판정:
      reopen 시 meta 3필드 전이 · `reopened:` 출력 · done task가 재개 후보에서 빠짐 ·
      기존 606 테스트 무회귀.
- [x] **Context 명확도** (brownfield) — 영향 파일 3개(`task.mjs` 2곳, `session-context.mjs` 1곳)와
      충돌 가능 테스트 2건(`summary.test.mjs:88`, `done-guard.test.mjs:619`)을 코드에서 확인했다.
      두 테스트 모두 `status: open` 경로라 이 변경과 교차하지 않음을 확인.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

## Done evidence
```json
{ "version": 1, "review": "required" }
```

## 참고

- 결함 근거(코드): `src/commands/task.mjs:232` 재활성화 분기 · `src/commands/task.mjs:503` 창 해석 ·
  `src/commands/session-context.mjs:39` 후보 판정 · `src/commands/summary.mjs:124` 유일한 status 소비처.
- 고정된 계약(테스트): `tests/summary.test.mjs:88` (재활성화가 `firstActivatedAt`을 안 민다) ·
  `tests/done-guard.test.mjs:619` (재활성화해도 원 구간 증거 인정) ·
  `tests/done-guard.test.mjs:667` (`firstActivatedAt` 없는 구 task는 시각 가드 건너뜀).
- 원 권고: `.claude/handoffs/2026-09-05-1330-harness-pdf-6layer-comparison.md` §2 권고 ⑥
  ("L4 Memory … 완료 task 만료 없음"). 판정 근거는 동반 evidence 파일.
- (open) TCC 만료를 ⑦(handoff 타입화)과 함께 볼지, 별도 task로 뺄지 — 이 task 밖.

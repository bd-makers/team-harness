# done-ritual-fold — Spec

## 목적 / 요구사항
- **문제**: PR 머지 후 task 종결에 커밋이 3개 든다 — plan 마지막 단계 체크 → `done` → `summary --write`가
  각각 `docs(<name>): plan 커밋·PR 단계 체크` · `chore(task): <name> 종결` · `chore(docs): 집계 원장 갱신`으로 갈린다
  (origin/main 최근 40커밋 중 16개가 이 의식). 강제되는 것은 첫 분리뿐이다 — `done` 가드의 clean-tree 검사
  (`src/commands/task.mjs` "커밋되지 않은 변경이 있음")가 체크만 한 plan.md를 미커밋 작업으로 센다.
- **영향**: 이 저장소와 소비자 전부(`done`은 CLI 동작).
- **기대 결과**: 머지 후 종결이 커밋 하나 — 체크 → `done` → `summary --write` → 1 커밋.
- **제약**: 가드는 실제 미커밋 작업을 계속 막아야 한다. 체크박스 판단(머지 확인 후 켜기)은 에이전트 몫으로 남긴다 —
  CLI가 대신 켜지 않는다. CLI가 git 쓰기를 갖지 않는다(`done --commit` 기각).

## 설계 / 접근
전하 선택(2026-09-26): **체크박스-only 면제**.
- `isCheckboxOnlyChange(before, after)` — 줄 수가 같고, 바뀐 줄이 모두 `^(\s*- )\[ \](.*)$` → `$1[x]$2`일 때만 참.
  변경 없음·끄기·줄 추가·산문 수정은 거짓.
- `done` 가드: dirty 경로에 활성 task의 plan.md가 있으면 `git show HEAD:./<plan>`과 작업 트리 파일을 비교해
  위 함수가 참이면 dirty에서 뺀다. HEAD에 plan이 없으면(신규·미추적) 면제하지 않는다.
- 문서: `commands/harness-task.md`에 "머지 후 종결 — 커밋 하나" 절.
- 기각: 문서만(3→2, 가드 불변) · `done --commit`(CLI가 git 쓰기 소유, 범위 큼).

## Ontology
- **종결 의식**: 머지 후 plan 마지막 단계 체크 + `done` + 원장 갱신과 그 커밋들.
- **체크박스-only 변경**: HEAD 대비 줄머리 `- [ ]`를 `- [x]`로 켠 줄 외에 차이가 없는 plan.md 변경.
- 게이트 통과 근거: 목표·제약·성공 기준이 테스트로 표현 가능하고 영향 파일 3곳(task.mjs·done-guard 테스트·harness-task.md).

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 체크박스만 켠 plan.md는 done 가드가 막지 않는다
- [x] **Constraint 명확도** (30%) — 실제 미커밋 작업은 계속 차단, CLI git 쓰기 없음, 에이전트가 체크
- [x] **Success 기준** (30%) — done-guard 테스트(통과·차단·헬퍼 경계) green, 전체 `npm test` fail 0
- [x] **Context 명확도** (brownfield 한정) — `src/commands/task.mjs` 가드 git 블록, `tests/done-guard.test.mjs`, `commands/harness-task.md`
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
```json
{ "version": 1, "review": "required" }
```

## 참고
- 선행: task `eager-budget-headroom` 종결에서 커밋 4개(체크·Done evidence·종결·원장) 실측.
- 가드 정본: `src/commands/task.mjs` `runDone` git signals 블록, handoff 제외(`handoffRelPaths`)와 같은 자리.

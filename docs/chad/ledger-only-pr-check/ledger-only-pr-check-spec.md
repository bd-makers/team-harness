# ledger-only-pr-check — Spec

## 목적 / 요구사항
- **문제**: done-derive(bd-makers/team-harness#194) 이후 종결은 계산값이고, 원장(`docs/task_summary.md`, `docs/<user>/<user>-task.md`)은
  기본 브랜치에서 `summary --write`로 몰아서 갱신한다(D5 정정). 그런데 원장만 바꾼 브랜치는 `pr-check`가
  "이 브랜치의 변경에 task 문서(docs/<user>/<task>/)가 없음"으로 exit 1을 내고, pre-push 훅이 그 push를 막는다.
  예전에는 종결 커밋이 task `meta.json`도 함께 바꿔 통과했다. 재현: `origin/main`에서 브랜치 → `summary --write` → 커밋 →
  `pr-check` exit 1 (2026-11-20 커밋 `c72c76a4`, 브랜치 `chore/summary-batch-2026-11-20`).
- **영향**: 기본 브랜치가 보호된 저장소(원장 갱신도 PR을 거쳐야 함)는 `--no-verify` 외에 길이 없다. 보호되지 않은 저장소도
  main 직접 push로만 우회된다.
- **기대 결과**: diff의 모든 파일이 생성물 원장이면 `pr-check`가 통과하고(exit 0), 그 사실을 note로 남긴다.
  원장과 다른 파일이 섞이면 판정은 종전과 같다(task 문서가 있으면 그 task를 검사, 없으면 실패).
- **제약**: ship·pre-push 훅·CI가 같은 판정을 보도록 예외는 `collectPrCheck`(순수 판정)에 둔다. 경로 비교는 git diff의 POSIX 경로로 한다.

## 범위 (In / Out)
- **In**: `src/commands/pr-check.mjs`(원장 판정·통과·렌더링·JSON `ledgerOnly`), `tests/pr-check.test.mjs`,
  `docs/decisions.md` D11·D5 정정 + `templates/docs/decisions.md` D5 미러(seed, 같은 문장), `commands/harness-task.md`, `CHANGELOG.md`.
- **Out**: `wiki/` 컴파일 결과와 원장을 한 커밋에 담은 diff — 위키는 사람이 검토하는 내용이라 생성물이 아니다. 종전대로 실패한다
  (`harness-task.md`에 경계를 적는다; 위키를 담는 PR의 처리는 별도 판단). 원장 내용의 정합(`summary --check`) 검사 — D5 정정대로 게이트로 두지 않는다.
  P2-3(fork main push) 수정 — 별 세션.

## 원천 검토 (R1)
- 없음 — 원천 문서는 저장소 결정 로그(D5·D11)와 재현 커밋뿐이고, 둘 사이에 충돌이 없다.

### 원천

### 발견


## 설계 / 접근
- `isLedgerPath(p)`: `p === 'docs/task_summary.md'` 또는 3세그먼트 `docs/<u>/<u>-task.md`(파일 이름의 user 가 디렉터리와 같을 때만).
  `DOCS_DIR` 기준 POSIX 비교 — `SUMMARY_REL`·`userIndexRel`은 `join`이라 Windows 에서 `\`가 되므로 쓰지 않는다.
- `collectPrCheck`: diff 가 비지 않았고 모든 경로가 원장이면 `{ empty: false, ledgerOnly: true, tasks: [] }`.
  원장 경로는 task 디렉터리(깊이 4+)가 아니므로 섞인 경우의 task 판정은 그대로다.
- `passed`·`runPrCheck` 의 `docsFailed` 가 `ledgerOnly` 를 통과로 본다. 렌더링: `✓ pr-check <ref>: 생성물 원장만 변경 — task 문서 검사 대상 아님`
  + `· …` note. JSON `checks[]` 에 `ledgerOnly` 불리언.
- **2차 장치 규칙(D11)**: 새 장치가 아니라 기존 검사의 대상을 줄이는 변경이다. "검사 자체를 원장 커밋에서 빼는 대안"(pre-push 만 예외)은
  CI·ship 판정과 갈려 기각.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **생성물 원장(ledger)**: `summary --write` 가 쓰는 두 종류의 파일 — `docs/task_summary.md`, `docs/<user>/<user>-task.md`. 손으로 쓰지 않는다(D5).
- **원장 전용 diff**: `base...rev` 의 바뀐 경로가 하나 이상이고 전부 원장인 diff. 판정 근거: Goal·Constraint·Success 가 위에 명시됨(게이트 통과).

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
<!--
```json
{ "version": 1, "review": "required", "tests": "required" }
```
-->

## 참고
- 정책 결정(2026-11-20, 사용자): 원장 전용 diff 는 통과 + note. 착수는 P2-3 머지 전(hunk 분리).
- 테스트: `tests/pr-check.test.mjs` — 원장 전용 통과(직접·`--pre-push`), 원장+코드 무 task 실패, 원장+정상 task 통과(원장 note 없음), 닮은 경로(`docs/u/x-task.md`)는 원장 아님.
- 코드: `src/commands/pr-check.mjs` `collectPrCheck`·`passed`·`renderResult`·`runPrCheck`(docsFailed).

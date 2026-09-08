# done-force-audit-trail — Spec

## 목적 / 요구사항

**오늘 무엇이 안 되는가.** `harness-team done --force`로 가드를 무시하고 종결한 task는,
종결 이후 어떤 기계 판독 경로로도 정상 종결과 구분되지 않는다. `runDone`은 우회 여부와
무관하게 같은 meta를 쓴다 (`src/commands/task.mjs:688`):

```js
await writeTaskMeta(..., { ...meta, user, task, status: 'done', closedAt: ts });
```

무시한 issue 목록은 stdout에 한 번 출력되고(`:676-679`) 휘발한다. 따라서:

- `summary`가 렌더링하는 원장(`docs/task_summary.md`, `docs/<user>/<user>-task.md`)은
  둘 다 `✅ done`으로 찍는다 (`src/commands/summary.mjs:147`, `:160`).
- `listIncompleteTasks`는 `status === 'done'`이면 잘라내므로 SessionStart 재개 후보에도 뜨지 않는다
  (`src/commands/session-context.mjs:44`).
- `doctor`도 우회를 보지 못한다.

**영향받는 대상.** 원장을 읽는 모든 주체 — 다음 세션의 에이전트, 리뷰어(Codex), 팀원.
"이 task는 증거를 갖추고 닫혔는가"를 물을 방법이 없다.

**이것이 가설이 아닌 이유.** 선행 task가 이미 이 경로를 실제로 밟았고, 원장을 **손으로** 유지했다:

- `docs/chad/done-guard-window/done-guard-window-plan.md:30` —
  *"우회 이력: 2026-08-25 `done --force` 1회 (사유는 boundary-perf-invariant artifact에 기록)."*
- 같은 task의 artifact가 남긴 경고 —
  *"이대로면 `--force`가 종결의 표준 절차가 되고, 가드는 이름만 남는다."*
  *"실제로 이번에 `--force`를 썼고, 같은 구조가 남아 있는 한 다음에도 쓰게 된다."*

사람이 산문으로 적어 유지하고 있는 것이 곧 기계 상태가 아니라는 증거다.

**기대 결과.** `--force` 종결은 계속 허용하되, 그 사실과 무시한 issue가 `<name>-meta.json`에
남고 원장이 그것을 구분해 렌더링한다.

**제약.**

- `--force`를 제거·제한하지 않는다. 우회 경로는 그대로 둔다.
- 가드의 판정 로직(`collectDoneIssues`)을 바꾸지 않는다. 무엇을 막을지는 이 task의 범위가 아니다.
- 필드가 없는 기존 task는 "우회 아님"이 아니라 **"알 수 없음"**으로 degrade한다.
  없는 정보를 정상으로 단정하지 않는다.

## 설계 / 접근

`runDone`의 force 분기(`src/commands/task.mjs:676-679`)가 이미 무시한 issue 배열을 손에 쥐고 있다.
그 값을 stdout에만 흘리는 대신 meta에 함께 쓴다.

meta 스키마에 두 필드를 추가한다 (`taskMetaTemplate` — `src/commands/summary.mjs:26-27`):

| 필드 | 타입 | 의미 |
|---|---|---|
| `forcedAt` | ISO8601 \| `null` | `--force`로 종결한 시각. 없으면 우회하지 않았거나 구 task |
| `forcedIssues` | `string[]` \| `null` | 그때 무시한 가드 issue 원문 |

`forcedAt`이 `closedAt`과 별도인 이유: `done --force`를 issue가 **하나도 없는** 상태에서
실행할 수도 있다(플래그만 붙인 경우). 그때는 실제로 무시한 것이 없으므로 우회로 표시하지 않는다 —
기록 조건은 "`--force` 플래그"가 아니라 "**무시된 issue가 1개 이상**"이다.

원장 렌더링은 `✅ done` 옆에 우회 표시를 덧붙인다. 정확한 마크는 구현 시 결정하되,
`summary`의 역파싱(`src/commands/summary.mjs:82`의 `(✅ done|🔄 (?:open|active))` 정규식)이
같이 갱신되어야 한다 — 렌더링만 바꾸면 원장을 다시 읽을 때 행이 통째로 유실된다.

### 기존 결정과의 관계 (이 task가 기각되지 않는 이유)

`done-guard-window`는 리뷰에서 올라온 P1 *"meta 필드가 없거나 깨지면 가드가 degrade해
우회할 수 있다"* 를 **오탐으로 기각**했다. 근거는:

> *"harness 소유 meta 필드를 지우는 것은 `--force`와 구분되지 않는 **고의**이며,
> 망각을 잡는 가드에 새로 생긴 구멍이 아니다."*

즉 **가드의 위협 모델은 망각이지 고의가 아니다**가 확립된 결정이다.
이 task는 그 결정을 뒤집지 않는다 — 고의를 **막지 않고 기록만** 한다.
가드(무엇을 차단하는가)를 건드리지 않고 감사 흔적(무엇이 일어났는지 남는가)만 추가하므로,
위 기각 논거와 충돌하지 않는다. 이 구분이 흐려지면 이 task는 기존 결정과 정면 충돌한다.

## Ontology

- **가드 (guard)**: 종결을 **차단**하는 결정론적 판정. `collectDoneIssues`가 정본.
  위협 모델은 *망각*이며, 고의 우회는 대상이 아니다(`done-guard-window` 결정).
- **감사 흔적 (audit trail)**: 일어난 일이 사후에 **기계 판독 가능하게** 남는가.
  차단하지 않으며, 따라서 가드의 위협 모델과 독립이다. 이 task의 유일한 대상.
- **우회 (bypass)**: `done --force`로 issue를 무시하고 종결하는 것. 앞으로도 합법이다.
- **흔적 없는 우회 (silent bypass)**: 현재 상태. 우회가 일어났으나 meta·원장·doctor 어디에도
  남지 않아, 종결 후 정상 종결과 구분 불가능한 상태. **이 task가 없애려는 것은 이것 하나다.**
- **degrade**: 필드가 없는 구 task를 다루는 방식. "우회 아님"이 아니라 "알 수 없음"으로 처리한다.

*자가진단 게이트 근거: 문제(흔적 없는 우회)·경계(가드 불변, 우회 허용 유지)·측정(meta 필드 존재 +
원장 왕복 파싱)이 모두 기존 코드 경로로 지목 가능하고, 선행 task의 실제 우회 이력이 재현 사례다.*

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — `--force` 종결이 `<name>-meta.json`과 원장에 기계 판독 가능한 흔적을 남긴다.
- [x] **Constraint 명확도** (30%) — 가드 판정 로직 불변, `--force` 제거 없음, 구 task는 degrade.
- [x] **Success 기준** (30%) — 아래 `### 완료 기준` 4항목. 전부 명령으로 검사 가능.
- [x] **Context 명확도** (brownfield) — `src/commands/task.mjs`(runDone), `src/commands/summary.mjs`
      (taskMetaTemplate·렌더링·역파싱), `tests/done-guard.test.mjs`, `tests/summary.test.mjs`.
- [x] **Ambiguity ≤ 0.2** — 위 가중합 1.0

### 완료 기준

1. issue가 있는 상태에서 `done --force`로 닫으면 `<name>-meta.json`에 `forcedAt`(ISO8601)과
   `forcedIssues`(무시한 issue 원문 배열)가 남는다.
2. issue가 **없는** 상태에서 `--force`를 붙여 닫으면 두 필드는 기록되지 않는다.
3. `summary --write`가 우회 종결과 정상 종결을 구분해 렌더링하고, 그 출력을 다시 읽어도
   (`summaryRows` 역파싱) 행이 유실되지 않는다 — 왕복 테스트로 고정한다.
4. 필드가 없는 기존 meta는 종전과 동일하게 렌더링된다(회귀 없음). `npm run test` 전체 통과.

## Boundary contracts

*선언 없음 — 이 변경에는 생산자/소비자 JSON Schema 경계가 없다. meta.json은 harness 내부
소유 상태이며 외부 계약이 아니다.*

## Done evidence

```json
{ "version": 1, "review": "required", "tests": "required" }
```

*`review: required` 근거: 이 변경은 done 가드 자신의 종결 경로를 수정한다. 리뷰 없이 닫으면
"가드를 고치는 task를 가드 없이 닫는" 자기모순이 된다. `done-guard-evidence` spec이 경고한
`--force` 훈련 리스크는 "모든 task에 거는 것"에 대한 것이며, 가드 자체를 건드리는 이 task는 예외에 해당한다.*

## 참고

- `src/commands/task.mjs:655-704` — `runDone`. force 분기와 meta 쓰기 지점.
- `src/commands/summary.mjs:23-27` — `taskMetaTemplate`. meta 스키마 정본.
- `src/commands/summary.mjs:82` — 원장 역파싱 정규식. 렌더링과 짝을 이룬다.
- `src/commands/summary.mjs:147,157-160` — 두 원장의 렌더링.
- `src/commands/summary.mjs:49-65` — `inferLegacyMeta`. 구 task degrade 경로.
- `docs/chad/done-guard-window/done-guard-window-artifact.md` — 우회 실사례와 기각된 P1의 논거.
- `docs/chad/done-guard-evidence/done-guard-evidence-spec.md:86-87` — `--force` 훈련 리스크 정의.
- `AGENTS.md` — *"`<name>-meta.json`은 harness가 소유하는 기계 상태이며 SSOT 4파일이 아니다."*
- (open) 원장의 우회 표시 마크를 무엇으로 할지 — 역파싱 정규식과 함께 구현 시 결정한다.

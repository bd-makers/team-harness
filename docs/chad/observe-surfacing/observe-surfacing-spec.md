# observe-surfacing — Spec

## 목적 / 요구사항

**오늘 무엇이 안 되는가.** 관측 판정(트립와이어)은 `harness-team observe`를 **직접 실행한 사람만** 본다.
로거(`templates/.claude/hooks/observe-tools.mjs`)는 settings 훅 4곳에 배선돼 매 도구 호출을 기록하고,
판정(`summarizeObservability`의 `trip_wires`, `src/commands/observe.mjs:224`)과 exit 1·루프백 nudge(`:282`)도
구현·테스트돼 있다. 그러나 판정을 읽는 호출자는 CLI 라우터 하나뿐(`bin/harness-team.mjs:74`)이다 —
`doctor`는 훅 파일의 **존재**만 본다(`src/commands/doctor.mjs:463`), SessionStart(`src/commands/session-context.mjs`)는
관측을 전혀 모른다. 선행 task가 이를 **명시적으로 범위 제외**했다
(`docs/hslee/observability-consumer/observability-consumer-spec.md` "범위 제외: doctor 배선, SessionStart nudge") —
깨진 약속이 아니라 미룬 결정이고, 이 task가 그 결정을 내린다.

결과: PDF L6의 "한 시간 안에 실패를 알 수 있나"가 "observe를 칠 생각이 난 사람에게만"으로 남는다.
트립와이어가 울려도 다음 세션은 아무 신호 없이 시작한다.

**영향받는 대상.** 소비자 프로젝트에서 세션을 시작하는 에이전트(Claude·Codex — 둘 다 SessionStart에서
`session-context`를 부른다), `harness-team doctor`를 돌리는 사람.

**기대 결과.**
1. `harness-team doctor`가 판정을 **경고(warning) 1건**으로 보인다 — 발화한 wire id·핵심 수치·
   `harness-team observe` 안내·루프백 nudge. 발화가 없으면(ok·no-data·not-installed) 아무것도 찍지 않는다.
2. `harness-team session-context`(SessionStart 주입)가 발화 시 **한 줄**을 덧붙인다 — 활성 task 유무 어느
   분기에서든. 발화가 없으면 출력은 지금과 바이트 단위로 같다.
3. 세 호출자(observe CLI·doctor·session-context)가 **같은 판정 함수**를 쓴다 — 셋이 다른 답을 낼 수 없다.

**제약.**
- 판정 규칙·임계값 4상수(`TRIP_WIRE_*`, `observe.mjs:14-17`)·창(기본 7일)을 바꾸지 않는다. 보정은 실사용
  로그가 쌓여야 가능하며 이 task 밖이다.
- task를 자동 생성하지 않는다(`observe.mjs:262-265`의 설계 그대로 — nudge만).
- read-only. 로그·meta·settings를 쓰지 않는다. **템플릿·훅 변경 없음** — SessionStart는 이미
  `session-context`를 부르므로(`templates/.claude/settings.json` SessionStart) D8 refresh 경로를 타지 않는다.
- doctor 경고는 warn 수준이다 — `fail++`·exit code에 영향 없음(다른 warn 검사와 같은 계약). observe CLI의
  exit 1은 그대로.
- SessionStart 출력은 lean 정책(`session-context.mjs:15-17`)을 지킨다 — 최대 1줄, 표·상세 없음.
  판정 중 어떤 예외도 SessionStart 출력을 깨뜨리지 않는다(예외 → 그 줄 생략).
- 플러그인 소스 저장소는 훅을 dogfood하지 않으므로(D7) 여기서는 `not-installed` → 침묵이 정상이다.
  동작 증명은 fixture 테스트와 scratch 소비자 디렉터리로 한다.

## 설계 / 접근

**판정 함수 하나를 뽑는다.** `observe.mjs`에 `evaluateObserveVerdict(targetDir, { now = new Date(), days = OBSERVE_DEFAULT_DAYS })`
→ `{ status: 'not-installed'|'no-data'|'ok'|'tripped', fired: TripWire[], window, records, skippedLines }`.
본체는 지금 `runObserve`(`:325-341`)가 인라인으로 하는 read → summarize → filter(fired)이며, `runObserve`가 이
함수를 쓰도록 바꾼다(출력·exit code 불변 — 기존 `tests/observe.test.mjs`가 그대로 통과해야 한다).
`taskNames` 역매핑은 표면화에 불필요하므로 옵션(기본 생략)으로 둔다 — doctor·SessionStart가 `docs/` 전체를
훑지 않게.

**doctor.** `checkObserveTripWires(targetDir, { now })` → 경고 문자열 | null. `status !== 'tripped'`면 null.
문자열: `observe 트립와이어 발화: <id>(수치 요약)[, …] — harness-team observe로 상세 확인; <observeLoopbackNudge(fired, window.to)>`.
`runDoctor`에서 decision log 검사(`:648-651`)와 같은 `add(label, 'warning', …)` 패턴. pluginDev 게이트는 두지
않는다 — not-installed가 스스로 null이 된다. 읽기 예외는 null(warn 검사가 doctor를 죽이면 envelope 자체가
안 나온다 — `checkDecisionLog`와 같은 이유).

**session-context.** `buildSessionContext`의 두 분기 반환값 끝에 `observeSurfacingLine(verdict)`를 조건부로
덧붙인다: `[harness] ⚠ observe 트립와이어 발화: <ids> (창 <from>→<to>) — harness-team observe로 확인하고 그 출력의 next: 줄로 task를 잇는다.`
발화 없음·예외 → 줄 없음. 활성 task 분기에서는 breadcrumb·카드 뒤, 무활성 분기에서는 `(단순 질문…)` 뒤.

**문서 표면.** `commands/harness-observe.md`에 "판정은 doctor·SessionStart에도 표면화된다" 한 단락,
doctor 명령 문서·README doctor 절에 경고 항목 추가, CHANGELOG `[Unreleased]` Added, `docs:generate`.

### 기각한 대안
- **SessionStart 훅에 `harness-team observe`를 따로 추가** — 템플릿 변경(D8 refresh 경로)·소비자 재설치 필요·
  출력이 표 3개라 lean 정책 위반. 기각.
- **doctor를 fail로** — 임계값 미보정 상태에서 오탐이 CI를 깬다. 기각, warn.
- **표면화 시 task 자동 생성** — 선행 결정(nudge만) 위반. 기각.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **로거(logger)**: `templates/.claude/hooks/observe-tools.mjs`. 도구 호출을 JSONL로 **쓰기만** 한다. 이 task가 건드리지 않는다.
- **판정(verdict)**: 창 집계에 트립와이어 규칙을 적용한 결과 — `trip_wires[].fired`와 그 집합의 `status`.
  정본은 `observe.mjs`(`evaluateObserveVerdict`)이며 임계값은 4상수.
- **표면화(surfacing)**: 판정을 **명령을 따로 치지 않은** 사람·에이전트가 보게 되는 경로. 이 task의 대상은
  doctor(점검 시)와 SessionStart(세션 시작 시) 둘.
- **nudge**: 발화를 task로 잇는 안내 문장(`observeLoopbackNudge`). 표면화는 nudge를 **인용**만 하고 task를 만들지 않는다.
- **창(window)**: 판정에 읽는 UTC 일 수. 표면화도 observe CLI와 같은 기본값을 쓴다 — 같은 판정 함수를 쓰므로 자동으로 같다.
- 게이트 근거: 목표(기대 결과 1~3)·제약(임계값·창·훅·템플릿 불변, warn 수준, 1줄)·완료 기준(`## 참고`의 테스트
  목록 + 실제 CLI 출력)·영향 파일(`observe.mjs`·`doctor.mjs`·`session-context.mjs`·테스트 3파일·문서 표면)이 위에 특정됨.

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
{ "version": 1, "tests": "required", "review": "required" }
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 판정 정본: `src/commands/observe.mjs` — `summarizeObservability`(`:204`) · `failureRateTripWire`(`:84`) ·
  `repeatFailureTripWire`(`:104`) · `observeLoopbackNudge`(`:282`) · `runObserve`(`:312`)
- 배선 대상: `src/commands/doctor.mjs` `runDoctor`(`:484`)의 경고 추가 패턴(`:648-651`), `CHECKS`의 observe-tools
  존재 검사(`:463`); `src/commands/session-context.mjs` `buildSessionContext`(`:56-111`)
- 훅 배선(불변): `templates/.claude/settings.json` SessionStart — `session-context` + `observe-tools.mjs`
- 테스트 표면: `tests/observe.test.mjs`(fixture 작성 방식·경계값 — 재사용 우선), `tests/doctor.test.mjs`
  (warn 검사 스타일 — `checkDecisionLog` 계열), session-context 테스트(있으면 확장, 없으면 신설)
- 완료 기준(테스트): doctor — not-installed/no-data/ok → null, tripped → id·nudge 포함 문자열, 읽기 예외 → null;
  session-context — tripped → 두 분기 모두 정확히 1줄 추가, 미발화 → 기존 출력과 동일, 예외 → 동일;
  observe CLI — 기존 테스트 무변경 통과; 세 호출자가 같은 fixture에서 같은 `status`.
- 선행 결정: `docs/hslee/observability-consumer/`(범위 제외 이력·브레인스토밍 결정),
  2026-09-09 조사(`.claude/handoffs/2026-09-09-0046-harness-cleanup-followups.md` 종결 절)
- (open) 임계값 보정 — 소비자 프로젝트에서 최소 2주 실사용 로그가 필요. 이 task 밖. 보정 전까지 표면화는
  nudge 문장을 그대로 인용한다.

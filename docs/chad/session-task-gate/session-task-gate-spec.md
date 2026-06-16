# session-task-gate — Spec

## 목적 / 요구사항

사용자가 `/harness-task`(또는 `harness-team task`)를 거치지 않고 **그냥 프롬프트로 작업을 시작**하는
경우가 빈번하다. 그 결과 active task 없이 작업이 진행되어 task SSOT(spec/plan/handoff/artifact)가
비고, 세션 인수인계·진행 추적이 깨진다. 이는 0.8.0의 "선언→강제(enforcement)" 갭의 한 사례다.

**요구사항:** 세션 시작 시 활성 task 유무를 감지해, 활성 task가 없으면 다음 작업 프롬프트에서
Claude가 `AskUserQuestion`으로 **① 미완 task 재개 / ② 새 task 생성 / ③ task 없이 진행** 중
하나를 선택하도록 유도한다. 활성 task가 있으면 세션 시작 프로토콜(plan.md 확인)을 상기시킨다.

## 설계 / 접근

### 분업 (핵심 결정)
- **훅 = 결정론적 트리거**: `SessionStart` 이벤트에서 `harness-team session-context`를 1회 호출,
  그 stdout을 세션 context로 **주입(inject)** 한다. `decision:block`을 **쓰지 않는다** —
  block은 사용자가 원한 `AskUserQuestion` UX를 죽인다.
- **Claude = 판단**: 주입된 context를 보고 *첫 프롬프트가 실질 작업인지* 판단해
  `AskUserQuestion`을 실행한다. 단순 질문·조회·잡일이면 무시한다.
- 훅은 prompt 텍스트를 정규식으로 "작업이냐 질문이냐" **판별하지 않는다**(brittle·오발). 판단은 Claude.

### 이벤트 선택: SessionStart 1회 주입 (A안)
- per-prompt 마커·비용이 없는 가장 단순한 안. 세션당 1회만 주입.
- SessionStart는 prompt를 못 보지만, "catch"는 첫 작업 프롬프트에서 Claude가 수행하므로 충분.
- **승격 경로(incremental)**: dogfooding에서 첫 작업 프롬프트를 실제로 놓치는 게 관찰되면
  `UserPromptSubmit` per-prompt 게이트(B안)로 승격한다. 지금은 도입하지 않는다(YAGNI).

### 게이트 결정 로직 — `buildSessionContext(targetDir)` (순수 함수)
입력은 파일시스템 상태(`active.json`, `docs/`), 출력은 주입할 문자열(없으면 빈 문자열).

**Case 1 — 활성 task 있음** (`active.json` non-null):
연속성 breadcrumb 1줄을 반환. AGENTS.md의 "세션 시작 시 반드시 수행"(handoff·plan 확인) 선언을
실제로 상기 → 기존 규칙 enforcement.
```
[harness] 활성 task: <user>/<name> — 세션 시작 프로토콜대로 <name>-plan.md 확인.
```

**Case 2 — 활성 task 없음** (`active.json` null 또는 부재):
nudge를 반환. 재개 후보 = `docs/<user>/*/`에서 `<name>-plan.md`에 미완 체크박스(`- [ ]`)가
남아 있는 task. (done-guard의 검증된 정규식 `^\s*- \[ \]` 재사용 — 인라인 false positive 회피.)
```
<system-reminder>
[harness] 활성 task가 없습니다. 이 세션의 첫 프롬프트가 실질 작업(기능/수정/리팩토링)을
시작하면, 코드 작성 전에 AskUserQuestion으로 확인하세요:
  · 재개: <user>/<name>   (plan 미완)
  · 재개: ...
  · 새 task 생성
  · task 없이 진행
단순 질문·조회·잡일이면 무시.
</system-reminder>
```
재개 후보가 0개면 "재개" 줄을 생략하고 "새 task 생성 / task 없이 진행"만 제시한다.

### Touch points
| 파일 | 변경 |
|---|---|
| `src/commands/session-context.mjs` (신규) | `buildSessionContext()` 순수 함수 + `runSessionContext(ctx)` 진입점 |
| `bin/harness-team.mjs` | `session-context` 서브커맨드 디스패치 추가 |
| `templates/.claude/settings.json` | `hooks.SessionStart` 등록 → `harness-team session-context 2>/dev/null \|\| true` |
| `templates/AGENTS.md.hbs` | task-gate 동작 1문단 문서화 (스캐폴드 대상 SSOT) |
| `AGENTS.md` (이 repo) | 동일 문단 — dogfood |
| `.claude/settings.json` (이 repo, 신규) | dogfood — `node bin/harness-team.mjs session-context` 로 SessionStart 등록 |
| `tests/session-context.test.mjs` (신규) | 단위 테스트 (아래 Success 기준) |

### CLI 호출 경로
- 스캐폴드된 target: 전역 `harness-team session-context` (post-commit 훅과 동일 패턴).
- 이 repo dogfood: 전역 미설치이므로 `node bin/harness-team.mjs session-context`.

## Ontology
*이 task가 다루는 핵심 개념의 정의.*

- **task-gate**: 세션 시작 시 활성 task 유무를 감지해 적절한 context를 주입하는 SessionStart 훅 +
  결정 로직. block이 아닌 inject 방식의 **nudge**(hard gate 아님).
- **활성 task**: `.harness/active.json`이 가리키는 `{user, task, path, switchedAt}`. null이면 없음.
- **재개 가능한(미완) task**: `docs/<user>/<name>/<name>-plan.md`에 line-leading `- [ ]`가 남은 task.
- **주입(inject) vs 차단(block)**: 훅이 context를 추가하는 것(inject, 본 설계) vs 프롬프트를 막는
  것(block). block은 AskUserQuestion UX를 죽이므로 채택하지 않음.

## Ambiguity 자가진단
*브레인스토밍(설계 대화 + advisor 검증)으로 모호성 제거 완료.*

- [x] **Goal 명확도** (40%) — "세션 시작 시 활성 task 없으면 첫 작업 프롬프트에서 AskUserQuestion으로 재개/새 task/진행 선택 유도".
- [x] **Constraint 명확도** (30%) — SessionStart 1회 주입(block 금지), 휴리스틱 금지, 로직은 순수 함수로 테스트, 기존 done-guard 정규식 재사용.
- [x] **Success 기준** (30%) — 아래 4개 단위 테스트 + dogfood 실증.
- [x] **Context 명확도** (brownfield) — 영향 파일 7개 식별(Touch points), CLI 호출 패턴은 post-commit 훅 미러링.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0 ≥ 0.8.

> Ontology 게이트 통과 근거: 트리거 이벤트(A vs B)·탈출구·적용범위를 사용자 확인,
> CLI 호출 경로·미완 task 탐지 로직을 코드로 검증 후 진입.

## Success 기준 (테스트)
`tests/session-context.test.mjs`:
1. **활성 task 있음** → breadcrumb 1줄에 `<user>/<name>` 포함.
2. **활성 task 없음 + 미완 task 존재** → nudge에 해당 task가 "재개" 후보로 나열됨.
3. **활성 task 없음 + task 0개** → nudge에 "재개" 줄 없이 "새 task 생성"만 제시.
4. **done task 제외** → plan.md에 `- [ ]`가 없는(완료) task는 재개 후보에서 빠짐.
5. (회귀) 인라인 산문의 `- [ ]`는 미완으로 오탐하지 않음(done-guard와 동일 앵커).

## 한계 (정직한 천장)
nudge지 hard gate가 아니다. inject(non-block)라 최종적으로 Claude가 지시를 따라야 동작 →
가끔 건너뛸 수 있음. 진짜 hard block(`decision:block`)은 AskUserQuestion을 죽이므로 트레이드오프.

## 참고
- advisor 설계 검토 (2026-06-16): 이벤트 축(A SessionStart vs B UserPromptSubmit), inject≠block,
  CLI 호출 경로 미러링, YAGNI(휴리스틱·opt-out 마커 금지).
- 재사용: `src/commands/task.mjs` `collectDoneIssues`의 `^\s*- \[ \]` 정규식.

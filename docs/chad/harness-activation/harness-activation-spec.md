# harness-activation — Spec

## 목적 / 요구사항

`task loop` / `task graph` / `task workflow` 3형제로 task를 확장할지 검토한 결과,
**확장은 기각하고 대신 "하네스가 실제로 발동하는가"의 갭 3건을 메운다.**

요구사항:

1. `harness-team task <name>` 실행 후 다음에 무엇을 해야 하는지가 stdout에 나온다.
2. `apply`만으로는 슬래시 커맨드가 오지 않는다는 사실이 README에 명시된다.
3. `harness-team` CLI가 PATH에 없을 때 훅이 조용히 죽지 않는다.

범위 밖: 런타임 오케스트레이션(팬아웃·공유큐·work-stealing), 신규 task 문서 타입,
Gemini/Cursor용 훅 메커니즘(구조적으로 불가).

---

## 결정 (2026-08-06)

### D1 — `task loop` / `task graph` / `task workflow` 신설을 기각한다.

**근거 1: 용어의 출처가 Anthropic이 아니다.**
"loop 엔지니어링 / 그래프 엔지니어링"은 2026-07 커뮤니티 조어(MarkTechPost·TuringPost 등)이고
Anthropic 기술문서에는 없다. Anthropic 어휘로 옮기면:

| 커뮤니티 | Anthropic | 정의 |
|---|---|---|
| loop engineering | **agent** | "LLMs dynamically direct their own processes and tool usage" |
| graph engineering | **workflow** | "orchestrated through **predefined code paths**" (+5패턴) |
| harness engineering | **harness** | 세션을 가로지르는 상태 구조 |

여기서 범주 오류가 드러난다 — Anthropic 기준으로 **graph와 workflow는 같은 것**이다.
실제 3층은 `harness(환경) → agent/loop → workflow=graph(흐름)`이고, 세 번째 자리에
들어갈 독립 개념이 없다.

**근거 2: task는 이미 harness 층 산출물이다.**
Anthropic "Effective harnesses for long-running agents" 권장 구조와 거의 1:1 대응:
feature list ↔ `spec.md`, progress 파일 ↔ `plan.md` 체크박스,
세션 시작 프로토콜 ↔ `session-context`, "declares victory too early" 방어 ↔ done-guard.
여기에 loop/graph 형제를 만드는 것은 층을 섞는 것이다.

**근거 3: graph는 이미 기각된 결정이다.**

2026-07-28 결정으로 런타임 오케스트레이션(지휘자·공유 작업큐·팬아웃/팬인·work-stealing)이
기각됐다. 근거가 된 1차 소스 6종과 핵심 발견:

| 소스 | 핵심 |
|---|---|
| Anthropic — Building effective agents | "Find the simplest solution possible, and only increasing complexity when needed" |
| Anthropic — Effective context engineering | 컨텍스트는 유한 자원(context rot·attention budget). 서브에이전트는 **컨텍스트 격리용 탐색**이지 병렬 작성자가 아님 |
| OpenAI — A practical guide to building agents | 점진적 접근 권장, single-agent 루프 우선 |
| Cognition — Don't Build Multi-Agents | 병렬 서브에이전트는 서로의 중간 결정을 못 봐 상충 → 프래질. single-threaded linear agent 권고 |
| Karpathy — Software 3.0 | 부분 자율·autonomy slider, 빠른 generator-verifier 루프 |
| HumanLayer — 12-Factor Agents | #8 own your control flow — 명시적 분기 코드, LLM 자율 루프 의존 금지 |

**분쟁 대상은 병렬로 "쓰기·결정"하는 에이전트**이며, 컨텍스트 격리된 읽기·탐색용
서브에이전트는 오히려 표준 실무다. 이 구분은 유지된다(CLAUDE.md §2 서브에이전트 전략은 존속).

추가로 Claude Code 호스트가 `Workflow` 도구(pipeline/parallel/phase/worktree isolation)로
이미 제공하므로 하네스가 재구현하면 플랫폼 중복이다.

상세 근거는 `docs/decision-positioning.md`·`docs/trend-survey.md`(보조 참조 — 2026-08-06 현재
저장소에 커밋되지 않은 상태이므로, 위 표가 본 task의 자립 근거다).

**재고 지점 —** 아래 중 하나가 성립하면 이 기각을 다시 연다.

- 에이전트 간 통신·컨텍스트 공유가 성숙해 Cognition의 반대 근거(중간 결정 비가시성)가 무너질 때
- team-harness가 단일 프로젝트를 넘어 **여러 저장소에 걸친 동시 작업**을 요구받을 때
- 호스트(`Workflow` 도구)가 제공하지 못하는 하네스 고유의 팬아웃 요구가 실제로 발생할 때

즉 현재 기각은 "지금 근거로는 역행"이라는 뜻이지 영구 금지가 아니다.

**근거 4: 비용이 명백하다.**
파일 3개 추가 = task당 4 → 7파일. 파급: `<name>-spec.md` marker 규약, `list` 스캔,
`listIncompleteTasks`, done-guard, migrate. 매 세션 읽어야 할 문서가 배가 되어
Anthropic의 "smallest set of high-signal tokens" / "context as a finite resource"에 위배.
AGENTS.md 단순함 우선과도 충돌.

### D2 — 진짜 갭은 "형태"가 아니라 "발동"이다.

2026-08-06 probe(임시 프로젝트에 `apply` 후 실측)로 확인한 강제력 분포.
probe는 0.11.0에서 돌렸고, 갭 3건이 **0.12.0(`9a72c6e`)에서도 모두 미해결**임을 코드로 재확인했다:

**결정론적 강제 — 코드가 막음**
- SessionStart → `session-context` 활성 task 주입
- PreToolUse `Edit|Write` → protect-files / `Bash` → block-dangerous-git, pre-commit-check
- PostToolUse `Edit|Write` → auto-format
- git post-commit → `<user>-handoff.md` + task handoff 생성
- `harness-team done` → 4중 가드 (plan 미완 / artifact 템플릿 / uncommitted / 커밋 0), `--force`로만 우회

**모델 재량 — 문서에만 있고 검사 없음**
- Ambiguity 게이트 (검사 코드는 `doctor.mjs:53`에 있으나 `doctor`를 수동 실행해야 작동)
- 복잡도 게이트 §5-A, 페르소나 순서, 리뷰 프로토콜, 서브에이전트 위임

**부재**
- 워크플로우 체이닝 문법 / 그래프

즉 **loop는 트리거할 필요가 없고, workflow는 트리거할 방법이 없다.**

### D3 — 강제력은 Claude에만 걸린다. 이 비대칭을 문서로 정직화한다.

probe 설치 결과(에이전트별):

| 에이전트 | hooks | 커맨드 |
|---|---|---|
| Claude Code | 4종 | 19개 — 단 **플러그인 설치 시에만** |
| OpenCode | 0 | 3개 (`new-feature`/`fix-bug`/`verify`), harness task 계열 없음 |
| Gemini | 0 | 0 (GEMINI.md 텍스트만) |
| Cursor | 0 | 0 (`.cursor/rules/*.mdc`만) |
| Codex | 0 | 별도 플러그인(`.codex-plugin`), `apply`로 안 깔림 |

훅은 `.claude/settings.json`에 사는 Claude Code 전용 메커니즘이므로 이 비대칭은 구조적이다.
없애는 게 아니라 **기대치를 문서로 맞춘다.**

### D4 — 이 task는 `p0-enforcement`의 후속이며, 항목이 겹치지 않는다.

`chad/p0-enforcement`가 같은 뿌리("선언 → 강제 갭")를 추적했고 plan 6단계가 모두 완료됐다.
본 task는 그 계보를 잇되 **P0가 다루지 않은 3건**을 맡는다.

| 기존 task | 다룬 것 | 본 task와의 경계 |
|---|---|---|
| `p0-enforcement` ① | `done` 종결 가드 | 완료 — 재구현 안 함 |
| `p0-enforcement` ② | doctor의 포인터 껍데기 spec 감지 | 완료 — 재구현 안 함 |
| `doctor-sessionstart-check` | doctor가 SessionStart hook **존재** 감지 | 본 task 갭 3은 hook의 **실행 가능성**(CLI가 PATH에 있는가). 존재는 확인되나 실행이 안 되는 상태가 사각지대 |
| `session-task-gate` | SessionStart 훅으로 task-gate 주입 | 완료 — 본 task는 그 훅이 **죽어 있을 때**를 다룸 |

즉 P0가 "세션 안에서의 강제"를 메웠다면, 본 task는 **"세션에 도달하기 전"의 강제**
(진입점·배포 채널·훅 생존)를 메운다.

---

## 설계 / 접근

### 갭 1 — 워크플로우 진입점 없음

`task` 생성 시 평문 stdout은 2줄뿐:

```
created: docs/chad/demo-feature/
active: chad/demo-feature
```

한편 `task.mjs:293`의 `nextActions` 배열은 `--json` 분기에서만 방출되고,
평문 경로는 `task.mjs:303`의 2줄로 끝난다. 재활성화 경로(`task.mjs:260`)도 같다.
평문 경로에 다음 단계 체인 안내를 추가한다 — 신규 파일 0, SSOT 변경 0.
이것이 "워크플로우를 명시적으로 트리거하는 방법"의 최소 구현이다.

### 갭 2 — 온보딩이 2채널인데 문서화 안 됨

`harness-team apply`는 hooks·rules·AGENTS/CLAUDE/GEMINI·docs 구조·opencode.json·
`.cursor/rules`를 깔지만 **`commands/*.md` 19개는 깔지 않는다**(플러그인 설치 채널).
저장소를 clone한 팀원은 규범과 훅은 받지만 `/harness-task`를 칠 수 없다.

현행 README는 **하네스를 처음 도입하는 사람** 관점으로만 쓰여 있다(빠른 시작·설치 구간).
이미 적용된 저장소를 clone한 **팀원** 관점의 안내가 없다.
3채널(apply / 플러그인 / npm 전역)을 명시하고 팀원 진입 경로를 추가한다.

### 갭 3 — CLI 부재 시 훅이 조용히 죽음

SessionStart 훅은 `harness-team session-context 2>/dev/null || true`,
post-commit 훅은 `harness-team handoff 2>/dev/null || true`.
전역 CLI가 없는 팀원 머신에서는 **실패 신호조차 없이** 무시된다.
`doctor`가 훅 명령의 실행 가능 여부를 검사하도록 보강한다.

---

## Ontology

- **harness (하네스)**: 세션을 가로지르는 상태 구조. task 4파일·훅·핸드오프가 여기 속한다.
- **loop (= Anthropic "agent")**: 한 에이전트가 도는 gather → act → verify → repeat 주기.
  하네스에서는 훅 + done-guard가 이 주기의 경계를 강제한다.
- **workflow (= 커뮤니티 "graph")**: 사전 정의된 코드 경로. 하네스에서는 슬래시 커맨드 시퀀스이며
  현재 사람이 수동으로 친다.
- **발동(activation)**: 문서에 적힌 규범이 실제 실행 시점에 강제되는가. D2의 3분류가 이 척도.
- **채널(channel)**: 하네스 구성요소가 사용자에게 도달하는 경로. `apply` / 플러그인 설치 /
  npm 전역 설치 3종이며 서로 독립이다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
  → "task 확장 대신 발동 갭 3건(진입점·채널 문서화·훅 실패 가시화)을 메운다."
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
  → 신규 파일 0, task 4파일 SSOT 유지, 런타임 오케스트레이션 범위 밖.
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
  → probe 프로젝트 재현: `task` 출력에 다음 단계가 보이고, README가 3채널을 설명하며,
    CLI 없는 환경에서 `doctor`가 훅 미작동을 경고한다.
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
  → `src/commands/task.mjs`, `src/commands/doctor.mjs`, `README.md`. 3파일.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

> 게이트 통과 근거: 2026-08-06 실측 probe로 현행 동작을 확인한 뒤 스펙을 작성했으므로
> 목표·제약·성공기준이 추정이 아니라 관측에 근거한다.

## 참고

- Anthropic — [Building Effective AI Agents](https://www.anthropic.com/engineering/building-effective-agents)
- Anthropic — [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Anthropic — [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- `docs/decision-positioning.md` (2026-07-28) — 런타임 오케스트레이션 기각 결정
- `docs/report.md` G2 — 상주 boundary-verifier 부재 (본 task 범위 밖, 후속)
- 선행 task: `chad/p0-enforcement`, `chad/doctor-sessionstart-check`, `chad/session-task-gate`

> 위 `docs/*.md` 3종은 2026-08-06 현재 **untracked**이며 본문이 이 저장소에 없는
> `data/th-concept-verify/` 경로를 참조한다. 커밋 여부는 사용자 판단 사항이므로
> 본 spec은 이들에 의존하지 않도록 D1 근거를 자립시켰다.


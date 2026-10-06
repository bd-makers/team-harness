# default-loop-skill — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

**문제.** 사이클 S3(구현)에는 기본 루프가 없다(`docs/harness-cycle.md` §2 "✗ 기본 루프 없음").
plan을 확정한 개발자, 특히 주니어는 구현 → 검증 → 수정 → 다음 단계의 순서와 멈출 지점을 매번 스스로 짜야 한다.
그래서 R2(시나리오 ↔ 증거)와 커밋 게이트가 "있지만 언제 돌리는지 모르는" 장치로 남는다.
README는 "런타임 오케스트레이션 의도적 비채택"이라고 적고 있어, 선택형 루프 자체를 금지한 것처럼 읽힌다(interview — §4-3).

**목표.** plan 확정 직후 쓸 수 있는 **선택형 슬래시 명령 `/harness-loop`**를 제공한다. 메인 세션이 오케스트레이터가 되어
plan 단계마다 Dev 구현 → QA 판정 → 커밋을 순차로 돌리고, 네 멈춤 조건 중 하나에서 사람에게 넘긴다(interview — §4-3).

**요구사항**
- R-1 (interview) 명령 `commands/harness-loop.md` + Codex 래퍼 `skills/harness-loop/SKILL.md`, `.claude-plugin/plugin.json` 등록.
  형태는 CLI 런타임이 아니라 프롬프트 + 기존 CLI(`gate commit`·`scenario check`·`review`·`boundary check`)다. 새 CLI 명령을 만들지 않는다.
- R-2 (interview) **진입 질문**: 명령 진입부에서 "오케스트레이터로 진행 / 개별로 진행"을 한 번 묻는다. 개별이면 아무것도 하지 않고 끝난다 —
  게이트 합류 의무 없음(§4-3, D11). `harness-interview` 끝에 이 명령을 가리키는 포인터 한 줄을 둔다.
  전제 확인: 활성 task, 미완 단계가 있는 plan.md. 없으면 멈추고 안내한다(spec·plan은 루프 밖 — §4-3).
- R-3 (interview) **Dev**: 쓰기 담당 1명. 기본 실행 수단은 서브에이전트이며 한 번에 plan 단계 하나만 구현한다. 커밋하지 않는다.
  QA 실패 시 실패 근거를 받아 같은 단계를 다시 구현한다.
- R-4 (interview, Q1) **QA = 두 겹**. 별도 Claude QA 서브에이전트는 두지 않는다(기각 사유는 설계 절).
  1. 오케스트레이터가 기계 검사를 실행한다: `harness-team gate commit` → (선언 시) `harness-team boundary check` →
     (시나리오 선언 시) `harness-team scenario check`. exit code 판정이라 자기 채점이 아니다.
  2. 시나리오 테스트 실행 출력 중 **테스트 이름이 찍힌 줄**을 artifact에 기록한다(R2 learnings — read-only 검증자는 fixture를 돌리지 못한다).
  3. read-only 검증자는 `harness-team review <engine> --framing scenario`다 — 별도 프로세스·별도 컨텍스트, codex → claude 폴백 내장.
- R-5 (interview, Q2) **판정 단위**: plan 단계마다 기계 검사(1·2)를 돌린다. 이때 `scenario check`의 실패 중 **이번 단계 이전에는
  증거가 없던 시나리오**(테스트가 아직 없는 것)는 진전 판정에서 제외한다. 루브릭 리뷰(3)는 모든 단계가 끝난 뒤 R3 직전에 한 번 돌린다.
- R-6 (interview, Q5) **커밋**: QA 기계 검사를 통과하면 오케스트레이터가 plan 체크박스 갱신과 구현을 함께 로컬 커밋한다.
  post-commit 훅의 handoff 변경은 다음 커밋에 담는다. push·PR·파괴적 변경은 하지 않는다(승인 필요 멈춤).
- R-7 (interview, Q3) **멈춤 조건 넷**:
  - 성공 — 모든 단계 통과 + 루브릭(R2) + R3 리뷰 통과. PR은 사람이 만든다.
  - spec 공백 — Dev나 QA가 spec에 답이 없는 질문을 만나면 멈추고 사람에게 묻는다(R1로 되돌림).
  - 진전 없음 — 직전 Dev 턴 이후 **실패 집합(실패한 검사·시나리오 id)이 같고 diff에도 변화가 없으면** 멈춘다. 횟수 상한은 두지 않는다.
  - 승인 필요 — push·PR·파괴적 변경·의존성 추가 등 되돌리기 어려운 행위.
- R-8 (interview) **R3**: 모든 단계 통과 후 `harness-team review <engine>`(엔진 결정은 `harness-review` 문서의 폴백 체인 그대로).
- R-9 (interview) **실행 수단 probe → degrade → record**: 서브에이전트가 없으면 Dev를 메인 세션에서 직접 수행한다.
  어떤 수단으로 돌았는지 artifact에 한 줄 남긴다. Workflows는 사용자가 명시적으로 요청할 때만 쓴다(opt-in). 병렬 Dev(Agent teams·cross-session)는 v1에서 쓰지 않는다 — 각 Dev가 격리 worktree를
  가져야 하는 별도 설계라 범위 밖(D4·D5).
- R-10 (interview) **주니어용 기록**: 단계가 끝날 때마다 "무엇을, 왜 했는지" 한두 줄을 artifact `## 결과`에 남긴다.
- R-13 (interview, Success) **루프 기록 줄**: 단계가 커밋될 때마다 artifact `## 결과`에 기계가 읽을 수 있는 한 줄을 남긴다 —
  `- loop: <YYYY-MM-DD> · 수단 <subagent|main> · 단계 <plan 단계 요약> · QA pass · commit <sha7>`. 멈추면 `· 멈춤 <조건>`으로 끝나는 줄을 남긴다.
  **dogfood**: 이 task의 남은 구현 단계 하나 이상을 `/harness-loop`로 실제로 돌려 이 줄이 남는 것을 완료 증거로 삼는다.
- R-11 (interview) README의 "설계 스코프" 문단을 "서비스형 오케스트레이터는 비채택, 선택형 루프 스킬은 제공"으로 정정하고 명령 절을 추가한다.
- R-12 (interview) Codex: v1에서 Codex는 QA(루브릭)·R3 검증자다. Codex 세션이 루프를 맡는 경로는 문서에 **실험적**으로만 적는다 —
  D2(drive = Claude)·D9 변경이 필요한 별도 결정이다.

**제약**
- 런타임 코드 없음 — 기존 CLI만 엮는다(§4-3 "스킬 + 기존 CLI", D11 서비스형 오케스트레이터 비소유).
- 같은 워킹트리 쓰기는 단일 스레드(D4): Dev가 도는 동안 오케스트레이터는 쓰지 않는다. 같은 task에 `review`를 동시에 돌리지 않는다.
- 선택형: 쓰지 않아도 사이클은 성립한다. PR 강제는 4문서뿐(D11).
- 언어별 지식 없음 — 검사 명령은 `.harness/gates.json`·spec 선언에서만 온다.

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- `docs/harness-cycle.md` §4-3(기본 루프), §6(묶음 B), §5 / `docs/decisions.md` D11(범위 헌장)
- `docs/chad/r2-scenario-evidence/r2-scenario-evidence-artifact.md` `## Learnings`(QA 기록 단계)
- 2026-10-06 인터뷰(Q1–Q6 권장안 채택)

### 발견
- §4-3은 QA를 "읽기 전용, 별도 컨텍스트"의 한 주체로 쓰면서 "커밋 프리셋 + R2 4행으로 판정"을 맡긴다. read-only 주체는 테스트를 실행할 수 없다(R2 learnings)
  → 결정: QA를 기계 검사(오케스트레이터 실행)와 루브릭(review CLI)으로 나눈다(R-4, 인터뷰 Q1).
- §4-3은 단계마다 QA를 돌린다고 하지만 시나리오는 task 단위로 선언된다 — 단계 1에서 미구현 시나리오가 실패해 거짓 "진전 없음"이 난다
  → 결정: 단계별 기계 검사 + 증거 없던 시나리오 제외, 루브릭은 R3 직전 1회(R-5, 인터뷰 Q2).
- "진전 없음"의 조작적 정의가 없다 → 결정: 실패 집합 동일 + diff 무변화(R-7, 인터뷰 Q3).
- "plan 확정 직후 묻는다"의 발화 위치가 없다(plan 명령이 없음) → 결정: 명령 진입부 + `harness-interview` 포인터(R-2, 인터뷰 Q4).
- §4-3은 실행 수단으로 Workflows(있으면)를 들지만 "사용자의 명시적 opt-in 필요"라고도 적는다 — 기본 루프에서 쓸지 정하지 않았다
  → 결정: v1은 쓰지 않는다. 기본 경로(서브에이전트 순차)만 정의하고, Workflows는 사용자가 직접 요청할 때의 선택지로 문서에 한 줄 둔다(R-9).
- 검토 완료: 2026-10-06 — 결정 반영 후 재대조, 새 발견 없음

## 설계 / 접근

**루프 (한 plan 단계)**
```
[진입] 활성 task·plan 확인 → "오케스트레이터 / 개별" 질문 → 실행 수단 probe·record
for 미완 단계 in plan:
  Dev(서브에이전트): 이 단계만 구현, 커밋 금지
  오케스트레이터: gate commit → boundary check(선언 시) → scenario check(선언 시) → 이름 찍힌 출력 artifact 기록
    실패 → 실패 집합·diff를 직전과 비교 → 같으면 [멈춤: 진전 없음], 다르면 근거를 Dev로
    통과 → plan 체크 + 로컬 커밋 + artifact 한두 줄
[마무리] review --framing scenario(시나리오 선언 시) → review(R3) → [멈춤: 성공 — PR은 사람]
어디서든 spec 공백 → [멈춤]; push·PR·파괴적 변경 → [멈춤: 승인 필요]
```

**2차 장치 검토 (D11)**
- 이 명령은 기존 장치를 고치거나 지키기 위한 것이 아니라 S3의 빈 칸을 채운다 — 2차 장치가 아니다. 다만 새 CLI를 만들지 않아
  표면 증가를 명령 문서 1 + 래퍼 1로 제한한다.

**기각한 대안**
- 별도 Claude QA 서브에이전트(인터뷰 Q1 안 2): read-only라 기계 검사를 못 돌리므로 결국 오케스트레이터가 낸 출력을 다시 읽는 역할뿐이다.
  같은 엔진이라 자기 승인 편향도 남는다. `review --framing scenario`가 이미 별도 프로세스·다른 엔진의 read-only 검증자다.
- plan 단계 ↔ 시나리오 id 매핑(Q2 안 a): `scenario check`에 id 필터가 없어 CLI 변경이 필요하고, plan 문법도 늘어난다.
- 횟수 상한(예: 3회 실패 시 멈춤): §4-3이 임의 상한을 금지한다. 상한은 진전 중인 루프를 끊고, 진전 없는 루프는 상한 전까지 헛돈다.
- `templates/AGENTS.md`에 진입 질문 규범 추가: 모든 소비자에게 배포되고 agent-files pin 테스트에 걸린다. 명령 진입부로 충분하다.
- 새 CLI `harness-team loop`: §4-3·D11이 런타임을 기각했다.

**표면 (영향 파일)**
- 신규: `commands/harness-loop.md`, `skills/harness-loop/SKILL.md`, `tests/loop-command.test.mjs`
- 수정: `.claude-plugin/plugin.json`(commands), `README.md`(설계 스코프 문단 + 명령 절), `commands/harness-interview.md`(포인터 한 줄),
  `docs/harness-cycle.md`(§2 S3 행 · §6 진행 표시), `CHANGELOG.md` `[Unreleased]`, overview 재생성(`scripts/generate-harness-overview.mjs`가 plugin.json을 읽음)

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **오케스트레이터**: `/harness-loop`를 실행한 메인 세션 자신. 단계 선택·기계 검사 실행·커밋·멈춤 판정을 맡고, 구현 코드는 쓰지 않는다.
- **Dev**: plan 한 단계를 구현하는 단일 쓰기 주체(기본 서브에이전트, 없으면 메인 세션). 커밋하지 않는다.
- **QA**: 두 겹 — 기계 검사(gate·boundary·scenario, exit code)와 루브릭(`review --framing scenario`, read-only 별도 프로세스).
- **실패 집합**: 한 QA 회차에서 실패한 검사 이름과 시나리오 id의 집합. "진전 없음" 판정의 비교 단위.
- **진전 없음**: 직전 Dev 턴 이후 실패 집합이 같고 `git diff` 내용에도 변화가 없는 상태.
- **루프 기록 줄**: artifact `## 결과`의 `- loop: …` 한 줄. 사람(주니어)과 R2 루브릭이 루프가 실제로 돌았는지 확인하는 근거.
- 게이트 통과(2026-10-06, `/harness-interview`): Goal·Constraint·Context·Ontology는 초안 문장으로 pass, Success는 인터뷰에서
  dogfood 기록(R-13·S6)을 더해 pass. R1 검토 완료.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — 목적 절 "목표" 한 문장 + 문제 문장
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — 제약 절(런타임 없음·D4·선택형·언어 지식 없음) + R-9·R-12 범위 밖
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — 문서 계약 시나리오 S1–S5 + dogfood 실행 기록 S6(R-13)
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — 설계 절 "표면"
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 — `/harness-interview` 채점표 5차원 pass(2026-10-06)

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
```json
{
  "version": 1,
  "review": "required",
  "scenarios": [
    {
      "id": "S1",
      "given": "commands/harness-loop.md가 추가됐다",
      "when": "manifest-sync 테스트를 돌린다",
      "then": "plugin.json 등록과 Codex 래퍼(skills/harness-loop/SKILL.md)가 양방향으로 맞는다",
      "test": "manifest-sync: Claude harness commands have Codex command-equivalent skills",
      "cmd": "node --test --test-name-pattern=\"manifest-sync\" tests/manifest-sync.test.mjs"
    },
    {
      "id": "S2",
      "given": "/harness-loop 명령 문서",
      "when": "멈춤 조건 계약을 읽는다",
      "then": "성공·spec 공백·진전 없음·승인 필요 넷이 있고, 진전 없음은 실패 집합 동일 + diff 무변화로 정의되며 횟수 상한이 없다",
      "test": "loop: the four stop conditions are pinned and no-progress has no numeric cap",
      "cmd": "node --test --test-name-pattern=\"loop: the four stop conditions\" tests/loop-command.test.mjs"
    },
    {
      "id": "S3",
      "given": "/harness-loop 명령 문서",
      "when": "QA 절차를 읽는다",
      "then": "gate commit → scenario check → 이름 찍힌 출력 기록 → review --framing scenario 순서이고, 오케스트레이터가 기계 검사를, read-only 검증자가 루브릭을 맡는다",
      "test": "loop: QA runs machine checks before the read-only rubric and records named test output",
      "cmd": "node --test --test-name-pattern=\"loop: QA runs machine checks\" tests/loop-command.test.mjs"
    },
    {
      "id": "S4",
      "given": "/harness-loop 명령 문서",
      "when": "진입·쓰기·승인 경계를 읽는다",
      "then": "진입 시 오케스트레이터/개별을 묻고, Dev는 단일 쓰기·커밋 금지이며, push·PR은 하지 않고 멈춘다",
      "test": "loop: entry asks orchestrator-or-individual and the loop never pushes or opens a PR",
      "cmd": "node --test --test-name-pattern=\"loop: entry asks\" tests/loop-command.test.mjs"
    },
    {
      "id": "S5",
      "given": "README 설계 스코프 문단",
      "when": "오케스트레이션 문구를 읽는다",
      "then": "서비스형 오케스트레이터는 비채택, 선택형 루프 명령은 제공한다고 적고 /harness-loop를 가리킨다",
      "test": "loop: README distinguishes a service orchestrator from the optional loop command",
      "cmd": "node --test --test-name-pattern=\"loop: README distinguishes\" tests/loop-command.test.mjs"
    },
    {
      "id": "S6",
      "given": "이 task의 구현 단계 하나 이상을 /harness-loop로 돌렸다",
      "when": "artifact의 루프 기록 줄을 읽는다",
      "then": "수단·단계·QA pass·커밋 sha가 찍힌 loop 기록 줄이 하나 이상 있다",
      "test": "dogfood: artifact loop record line",
      "cmd": "grep -Eq '^- loop: [0-9]{4}-[0-9]{2}-[0-9]{2} · 수단 (subagent|main) · 단계 .+ · QA pass · commit [0-9a-f]{7}' docs/chad/default-loop-skill/default-loop-skill-artifact.md"
    }
  ]
}
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- `docs/harness-cycle.md` §4-3 · `docs/decisions.md` D2·D4·D5·D6·D9·D11
- `commands/harness-review.md` "R2 시나리오 대조" 절, `src/commands/scenario.mjs`(id 필터 없음 — R-5 근거)
- `commands/harness-ship.md` · `tests/ship-command.test.mjs` — 명령 계약 pin 테스트의 관례
- Codex 실측(2026-10-06, 서브에이전트 보고 — 1차 출처 직접 미확인): codex-cli 0.159.2에 서브에이전트(`spawn_agent`·`wait`)·
  커스텀 에이전트(`.codex/agents/*.toml`, `sandbox_mode = "read-only"`)·병렬 실행이 있다. 병렬 끄기 플래그가 v2 모델에서 듣지 않는다는
  열린 이슈가 보고됐다(openai/codex#50880, 미확인). → Codex 호스팅 루프는 실험적(R-12).
- (open → 별도 결정) Codex 세션을 오케스트레이터로 쓰는 경로 — D2·D9 개정 필요.
- (open → 후속 task) 병렬 Dev(Agent teams·cross-session, 격리 worktree) — v1 범위 밖.

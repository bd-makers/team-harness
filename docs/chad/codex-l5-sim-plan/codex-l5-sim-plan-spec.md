# codex-l5-sim-plan — Spec

## 목적 / 요구사항
- Codex plugin support를 실제 Codex headless 세션(`codex exec`)으로 검증하는 L5 시뮬레이션 계획을 정의한다.
- 기존 `tests/sim/agentloop.mjs`는 Claude Code L5(`claude -p`) 검증으로 유지하고, Codex L5는 별도 runner로 분리한다.
- Codex L5는 Claude slash command 계약이 아니라 Codex plugin/skill/headless 계약을 측정한다.
- PASS는 파일, git 상태, `codex exec --json` JSONL 이벤트, hook stderr/stdout 등 관찰 가능한 증거에만 근거한다.
- 산문 응답은 diagnostic으로만 사용하고 PASS 신호로 쓰지 않는다.
- throwaway sandbox와 `../harness-playground` 산출물만 사용하며, 영속 playground 프로젝트와 실제 `src/`는 오염시키지 않는다.
- 구현 시 기존 사용자 dirty 파일은 건드리지 않고, 필요한 소스 변경은 최소화한다.

## 설계 / 접근
### 권장 파일 구조

- `tests/sim/agentloop.mjs`: 기존 Claude Code L5 runner. 유지.
- `tests/sim/codex-agentloop.mjs`: 신규 Codex L5 runner.
- `skills/harness-sim/SKILL.md`: 기존 Claude L5 운용 스킬. 유지.
- `skills/harness-codex-sim/SKILL.md`: 신규 Codex L5 운용 스킬.

### Codex headless 실행 계약

- `codex exec`를 사용한다.
- machine-readable 관찰은 `--json` JSONL 이벤트 스트림을 파싱한다.
- 세션 오염 최소화를 위해 기본은 `--ephemeral`을 사용한다.
- throwaway sandbox cwd는 `-C <sandbox>`로 지정한다.
- smoke/probe는 `--sandbox workspace-write`를 사용한다.
- full run 시나리오는 throwaway `.sim-tmp` 안에서만 `--sandbox danger-full-access`를 사용한다. Codex `workspace-write`는 `.git/hooks` 쓰기를 보호하므로 post-commit hook 설치 검증에는 적합하지 않다.
- 자동화 중 멈춤 방지를 위해 `-c 'approval_policy="never"'`를 사용한다.
- git repository가 없는 probe sandbox는 필요 시 `--skip-git-repo-check`를 사용한다.

### 시나리오 범위

- SC0 probe: Codex auth, JSONL parse, `codex exec` 종료 계약, command execution event 관찰 가능성 확인.
- SC1 explicit skill trigger: `$harness-aijient-team:harness-team` 명시 호출로 harness apply/init 수행 여부 확인.
- SC2 natural language trigger: plugin/skill 설명만으로 자연어 요청이 적절한 skill을 선택하는지 확인.
- SC3 task workflow: Codex headless가 task 생성까지 수행하고 4 SSOT + `active.json`을 남기는지 확인.
- SC4 installed hook compatibility: Codex가 설치한 harness의 post-commit hook이 handoff를 갱신하는지 확인.
- SC5 packaging/availability: `.codex-plugin/plugin.json`에 포함된 skills가 설치된 Codex 환경에서 실제로 사용 가능한지 확인.
- SC6 contamination/cleanup: `.sim-tmp` 제거와 영속 playground 프로젝트 git clean 확인.

### 명시적으로 제외 / N/A

- Claude Code namespaced slash(`/harness-aijient-team:*`)는 Codex L5 PASS 조건이 아니다.
- `.claude/settings.json`의 SessionStart hook 발화는 Claude Code 전용 신호이므로 Codex L5에서는 `N/A` 또는 별도 compatibility note로만 기록한다.
- PreToolUse protect-files처럼 headless에서 안정 관찰 불가한 항목은 `MANUAL`로 남긴다.

### 리포트/스냅샷

- 리포트: `../harness-playground/sim-reports/codex-agentloop-<TS>.md`
- 스냅샷: `../harness-playground/sim-snapshots/codex/<version>/<scenario>`
- 기존 Claude 리포트와 섞지 않는다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **Codex L5**: 실제 `codex exec` headless agent 세션을 소비자 프로젝트 cwd에서 실행해 Codex plugin/skill 기반 harness 동작을 관찰하는 검증 레이어.
- **Claude L5**: 기존 `claude -p` 기반 runner로 Claude Code slash/hook/SessionStart 계약을 검증하는 레이어.
- **JSONL evidence**: `codex exec --json`이 출력하는 `thread.*`, `turn.*`, `item.*`, `error` 이벤트. Codex L5의 transcript 역할을 한다.
- **Skill trigger**: Codex가 명시 `$skill` 호출 또는 자연어 설명을 통해 plugin bundled skill을 활성화하는 동작.
- **Functional availability**: plugin 목록을 믿는 대신, 실제 headless run이 harness 파일과 task 산출물을 만들었는지로 plugin/skill 사용 가능성을 판정하는 방식.
- **Sim artifact**: runner timeout, permission, prompt ambiguity, sandbox setup 등 harness 본체 결함이 아닌 시뮬레이션 도구/환경 문제.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고
- Codex manual: Non-interactive mode, Agent Skills, Plugins
- `codex exec --help`
- `tests/sim/agentloop.mjs`
- `.codex-plugin/plugin.json`

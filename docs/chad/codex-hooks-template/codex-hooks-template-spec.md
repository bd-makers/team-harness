# codex-hooks-template — Spec

## 목적 / 요구사항

`apply`/`init`이 대상 프로젝트에 `.codex/hooks.json`을 설치해, Codex 세션도 Claude Code와 동일하게
SessionStart 시점에 활성 task context를 주입받게 한다. 함께 README의 "에이전트별 강제력" 표에서
`Codex | hooks 0` 항목을 실측 기준으로 정정한다.

- `templates/.codex/hooks.json` 신설 — SessionStart → `harness-team session-context`
- `copyStaticAssets`가 `.codex/` 트리를 복사 (skipExisting — 사용자 훅 보존)
- `doctor`가 `.codex/hooks.json`을 optional 항목으로 보고
- README 강제력 표 정정 + 근거(Codex CLI 0.147.0 실측) 명시
- apply e2e 스모크에 `.codex/hooks.json` 경로 어써션 추가

## 설계 / 접근

Claude 쪽 `templates/.claude/settings.json`의 SessionStart 훅과 **같은 커맨드 계약**을 쓴다:
`harness-team session-context 2>/dev/null || true`. PATH의 CLI를 부르므로 소비자 프로젝트에서
플러그인 소스 경로에 의존하지 않는다. (이 저장소 자신의 `.codex/hooks.json`은 plugin-dev
전용으로 `node bin/harness-team.mjs`를 쓰며, 그대로 둔다.)

이벤트 이름은 PascalCase `SessionStart`를 쓴다 — 이 저장소의 기존 `.codex/hooks.json`이
그 표기로 Codex에 신뢰 등록된 것이 확인됐다(아래 근거).

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **Codex 프로젝트 훅**: Codex CLI가 워크스페이스 루트의 `.codex/hooks.json`에서 읽는 이벤트 훅
  선언. 신뢰(trust)된 훅만 실행되며 신뢰 상태는 `~/.codex/config.toml`의 `[hooks.state]`에
  `"<abs-path>:<event>:<idx>:<idx>" = { trusted_hash }` 형태로 기록된다.
- **session-context**: 활성 task가 있으면 bounded Task Context Card를, 없으면 nudge를 표준출력으로
  내보내는 harness CLI 커맨드. Claude Code에서는 `.claude/settings.json` SessionStart 훅이 호출한다.
- **강제력 비대칭**: 하네스 규칙이 결정론적으로 강제되는지(훅) 규범으로만 전달되는지(문서)의 차이.
  README 표가 이를 에이전트별로 명시한다.

**근거 (게이트 통과)**: Codex CLI 0.147.0에서 프로젝트 로컬 `.codex/hooks.json`이 실제로 발견·신뢰
등록됨을 `~/.codex/config.toml`에서 확인 — 따라서 README의 "Codex hooks 0"은 구조적 한계가 아니라
템플릿 누락이며, 범위는 템플릿 1개 + 복사 경로 1줄 + 문서로 한정된다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — `apply`가 `.codex/hooks.json`을 설치하고 README 표를 정정한다.
- [x] **Constraint 명확도** (30%) — 기존 사용자 훅 덮어쓰기 금지(skipExisting), Claude 훅 커맨드 계약과 동일, 이 저장소 자신의 `.codex/hooks.json`은 불변.
- [x] **Success 기준** (30%) — apply 스모크에서 `.codex/hooks.json` 생성 확인 + `npm run test:unit` 전량 통과 + doctor 출력에 항목 노출.
- [x] **Context 명확도** (brownfield 한정) — `src/harness.mjs:copyStaticAssets`, `src/commands/doctor.mjs`, `README.md:99-107`, `tests/e2e/apply-smoke.test.mjs`.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고
- 실행 검증 한계: 훅이 **실행**되어 컨텍스트가 주입되는 것까지는 이 세션에서 확인하지 못했다.
  `codex exec --dangerously-bypass-hook-trust` 호출이 샌드박스 정책에 막혔다. 확인된 것은
  Codex가 이 경로를 발견해 신뢰 등록한다는 사실까지다.
- Codex 지원 이벤트(바이너리 문자열): `session_start`, `session_end`, `user_prompt_submit`,
  `pre_tool_use`, `post_tool_use`, `pre_compact`, `post_compact`, `subagent_start`, `subagent_stop`,
  `permission_request`.

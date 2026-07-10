# codex-wrapper-skills — Spec

## 목적 / 요구사항

- Claude Code의 `/harness-*` 16개 slash command와 대응되는 Codex skill surface를 제공한다.
- Codex에서는 Claude `commands[]`가 자동으로 slash command로 노출되지 않으므로, `skills/harness-*` entry를 추가한다.
- 기존 `commands/harness-*.md`를 SSOT로 유지하고, Codex skill은 얇은 wrapper로 만든다.
- 이미 존재하는 `skills/harness-sim`은 중복 생성하지 않고, 16개 command-equivalent surface 중 하나로 유지한다.
- 기능 로직은 `harness-team` CLI와 기존 command 문서에 남기며, wrapper는 drift를 만들지 않는다.

## 설계 / 접근

- `commands/*.md` 목록을 기준으로 `skills/<command-name>/SKILL.md`가 존재하도록 맞춘다.
- 신규 wrapper skill은 `../../commands/<command-name>.md`를 먼저 읽고 따르도록 한다.
- Claude-only 표현(`${CLAUDE_PLUGIN_ROOT}`, `AskUserQuestion`)은 Codex 환경에 맞게 해석하라는 공통 지침을 둔다.
- 각 신규 skill에 `agents/openai.yaml`을 추가해 Codex UI에서 사람이 읽기 쉬운 이름/설명을 제공한다.
- `tests/manifest-sync.test.mjs`에 command와 Codex skill surface 동기화 가드를 추가한다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **Command-equivalent skill**: Claude `/harness-*` command와 같은 사용자 진입점을 Codex `$harness-*` skill로 제공하는 항목.
- **Thin wrapper**: 동작 절차를 복제하지 않고 기존 command 문서와 CLI를 참조하는 얇은 skill.
- **Command contract**: `commands/harness-*.md`에 있는 기존 slash command 절차와 안전 규칙.
- **Codex surface parity**: Claude와 같은 파일 형식을 쓰는 것이 아니라, 사용자가 같은 작업명을 Codex UI에서 선택할 수 있게 하는 UX 동등성.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고
- `commands/*.md`
- `skills/harness-team/SKILL.md`
- `skills/harness-sim/SKILL.md`
- `tests/manifest-sync.test.mjs`

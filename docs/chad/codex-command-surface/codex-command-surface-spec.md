# codex-command-surface — Spec

## 목적 / 요구사항

- Claude Code에서는 `/harness-*` 명령이 다수 보이지만 Codex에서는 Harness AIjient Team 항목이 2개만 보이는 원인을 확인한다.
- `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, 실제 설치 캐시, Codex 공식 매뉴얼 기준을 비교한다.
- 소스 변경이 필요한 결함인지, 플랫폼 표면 차이인지, 로컬 설치 캐시 문제인지 구분한다.
- 사용자에게 Codex에서의 올바른 호출 방식과 추가 UX를 원할 때의 구현 선택지를 제시한다.

## 설계 / 접근

- Claude 플러그인 manifest의 `commands[]`와 Codex 플러그인 manifest의 `skills` 필드를 비교한다.
- 현재 소스의 `skills/`와 설치 캐시 `~/.codex/plugins/cache/personal/harness-aijient-team/0.10.0/skills`를 비교한다.
- Codex manual의 Plugins, Agent Skills, Codex app slash commands, Custom Prompts 섹션을 기준으로 Codex가 무엇을 UI에 노출하는지 확인한다.
- 기능 변경은 하지 않고, README와 task 문서에 진단 결과를 남긴다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **Claude slash command**: Claude Code 플러그인의 `.claude-plugin/plugin.json` `commands[]`에 등록된 `commands/*.md` 기반 명령.
- **Codex skill**: Codex가 `$` 명시 호출 또는 자연어 매칭으로 활성화하는 `skills/<name>/SKILL.md` 기반 재사용 워크플로우.
- **Codex plugin surface**: Codex 플러그인이 공식적으로 노출하는 skills, apps, MCP 서버, UI metadata. Claude `commands[]`와 1:1 매핑되지 않는다.
- **Installed cache**: Codex가 설치한 플러그인 스냅샷. 소스 repo에 새 파일이 있어도 reinstall/new thread 전까지 현재 세션에는 보이지 않을 수 있다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고
- `.claude-plugin/plugin.json`
- `.codex-plugin/plugin.json`
- `skills/`
- Codex manual: Plugins, Agent Skills, Codex app slash commands, Custom Prompts

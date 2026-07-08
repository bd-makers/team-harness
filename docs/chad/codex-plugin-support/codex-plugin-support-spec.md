# codex-plugin-support — Spec

## 목적 / 요구사항

현재 Team Harness는 Claude Code 플러그인(`.claude-plugin/`, `commands/`) 중심이다.
같은 레포를 Codex에서도 플러그인으로 설치/사용할 수 있게 하되, Claude Code 지원은 유지한다.

요구사항:
- `.codex-plugin/plugin.json`을 추가해 Codex 플러그인 manifest를 제공한다.
- Codex에서 사용할 얇은 진입 skill을 추가한다. 단, CLI 동작을 복제하지 않고 기존 `harness-team` 공통 코어를 사용한다.
- Codex manifest가 `skills/` 전체를 노출하므로, 그 아래 skill frontmatter는 Codex quick validator와 호환되어야 한다.
- `package.json` 배포 파일 목록에 Codex manifest를 포함한다.
- release/manifest 동기화 테스트를 확장해 Claude/Codex 버전 drift를 막는다.
- README/MAINTAINING에 Claude + Codex 병렬 지원 구조를 문서화한다.

## 설계 / 접근

- 공통 코어: `bin/`, `src/`, `templates/`, `AGENTS.md` 규약.
- Claude 어댑터: `.claude-plugin/`, `commands/`.
- Codex 어댑터: `.codex-plugin/`, `skills/harness-team`.
- 1차 범위는 Codex plugin manifest + skill + 검증까지. MCP/typed tools와 Codex marketplace 자동 등록은 후속 작업으로 둔다.
- Codex manifest는 검증 스키마가 거부하는 unsupported field(`hooks` 등)를 넣지 않는다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **공통 코어**: 플랫폼과 무관하게 공유되는 CLI/템플릿/문서 규약. `harness-team` 동작의 실제 구현.
- **플랫폼 어댑터**: Claude Code, Codex 등 각 host가 플러그인을 발견하고 진입점을 노출하기 위한 얇은 manifest/command/skill 레이어.
- **Codex plugin support**: 같은 레포가 `.codex-plugin/plugin.json`과 Codex skill을 통해 Codex에서 설치 가능하고, Claude로 적용된 소비자 프로젝트도 Codex가 같은 `AGENTS.md`/task 문맥으로 사용할 수 있는 상태.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고
- `plugin-creator` Codex manifest validator
- `skill-creator` skill format guidance
- `src/commands/release.mjs`
- `tests/manifest-sync.test.mjs`

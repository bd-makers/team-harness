# codex-plugin-cache-refresh — Spec

## 목적 / 요구사항

- Codex 앱이 새 `skills/harness-*` wrapper 목록을 읽을 수 있도록 로컬 플러그인을 cachebuster 버전으로 재설치한다.
- 개인 marketplace가 현재 레포를 source로 보고 있는지 확인한다.
- 설치 캐시에 16개 command-equivalent skill과 기존 추가 skill이 모두 들어갔는지 확인한다.
- source repo의 release manifest 버전 일치는 유지한다.

## 설계 / 접근

- `~/.agents/plugins/marketplace.json`의 `personal` marketplace와 source path를 확인한다.
- `plugin-creator`의 cachebuster helper로 `.codex-plugin/plugin.json`에 임시 cachebuster를 적용한다.
- `codex plugin add harness-aijient-team@personal --json`으로 재설치한다.
- 설치 캐시 경로의 `skills/` 목록을 확인한다.
- 재설치 후 source manifest는 release 검증을 위해 `0.10.0` 일치 상태로 복구한다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **Cachebuster reinstall**: Codex가 같은 plugin version을 구버전으로 캐시하지 않도록 build metadata가 붙은 version으로 한 번 재설치하는 로컬 개발 절차.
- **Installed cache**: Codex가 실제 새 thread에서 읽는 설치 스냅샷. 이번 경로는 `~/.codex/plugins/cache/personal/harness-aijient-team/0.10.0+codex.20260709045210`.
- **Source manifest**: repo의 `.codex-plugin/plugin.json`. release 테스트를 위해 package/Claude/Codex manifest version과 일치해야 한다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고
- `~/.agents/plugins/marketplace.json`
- `.codex-plugin/plugin.json`
- `~/.codex/plugins/cache/personal/harness-aijient-team/`

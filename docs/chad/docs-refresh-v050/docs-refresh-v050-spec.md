# docs-refresh-v050 — Spec

## 목적 / 요구사항
- **문제**: `docs/index.html`이 링크하는 상시(버전 없는 파일명) 문서 중 8개가 v0.50.0 현재 표면과 어긋난다.
  4개는 본문 기준 버전이 낡았고(cheatsheet 0.47.0 · task-guide 0.27.0 · workflow-diagrams 0.23.0 · rubric-guide 0.20.0),
  4개는 버전 표기가 없다(kickoff-deck · onboarding-checklist · operations-playground · workflow-schematics).
- **영향**: 문서를 보고 하네스를 배우거나 운영하는 팀원 — 없어진 명령·바뀐 게이트를 그대로 따라 하게 된다.
- **기대 결과**: 8개 모두 v0.50.0 기준으로 내용이 맞고, 기준 버전이 눈에 보이게 표기된다.
- **제약**:
  - 파일명에 버전이 붙은 스냅샷(`harness-overview-0.x.html`·`harness-workflow-simulation-0.x.html`·`what-changes-0.x.html`)은 고치지 않는다(사용자 결정 2026-10-12).
  - 링크된 `.md`(`prerequisites.md`·`decisions.md` 등)는 범위 밖.
  - 다이어그램은 자립형 inline SVG — Obsidian이 script를 지우므로 mermaid JS를 쓰지 않는다.
  - 코드·`templates/`는 바꾸지 않는다(문서만).

## 원천 검토 (R1)
### 원천
- 코드·명령 표면: `commands/*.md`, `skills/*/SKILL.md`, `src/`, `bin/harness-team.mjs`, `templates/`
- 변경 이력: `CHANGELOG.md`, `docs/what-changes-<ver>.html`
- 이미 v0.50.0으로 갱신된 기준 문서: `docs/harness-overview.html`, `docs/harness-workflow-simulation.html`

### 발견
- 문서별 낡은 지점은 읽기 전용 조사(서브에이전트 4개)로 수집 → 결과는 artifact.md에 요약.
- 충돌 시 코드가 산문보다 우선한다.

## 설계 / 접근
1. 문서마다 낡은 지점 목록(위치·현재·정답·출처)을 받는다.
2. 한 파일씩 단일 스레드로 고친다(D4). 문서의 구조·디자인은 유지하고 내용만 맞춘다.
3. 기준 버전 표기는 `harness-overview.html`의 관례(`<span class="tag tag-purple">v0.50.0</span>`)를 따르되, 문서에 tag 스타일이 없으면 그 문서의 기존 스타일로 같은 정보를 단다.
4. `docs/index.html`의 해당 항목 설명에 버전이 적혀 있으면 함께 맞춘다.

## Ontology
- **상시 문서**: 파일명에 버전이 없는, 최신 릴리스를 따라가야 하는 문서.
- **스냅샷**: 파일명에 버전이 박힌 과거 시점 기록 — 고치지 않는다.
- **기준 버전 표기**: 문서가 어느 릴리스 기준으로 맞춰졌는지 본문 상단에 보이는 표기.
- 게이트 근거: 대상 8개·제외 범위·완료 기준이 모두 명시됨(사용자 승인 2026-10-12).

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 8개 상시 문서를 v0.50.0 기준으로 맞추고 기준 버전을 표기한다.
- [x] **Constraint 명확도** (30%) — 스냅샷·`.md`·코드 제외, inline SVG, 구조 유지.
- [x] **Success 기준** (30%) — 아래 Done evidence + 조사 목록의 항목이 모두 반영 또는 사유와 함께 보류.
- [x] **Context 명확도** (brownfield 한정) — 대상 8개 파일 식별.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 1.0

## Done evidence
```json
{ "version": 1, "review": "optional", "tests": "skip" }
```
- 8개 파일 모두 `v0.50.0` 표기 포함(grep).
- 8개 파일에 `<script` 안 mermaid 의존 없음, HTML 파싱 오류 없음.
- `npm run test` 통과(문서 매니페스트·링크 검사가 있으면 함께).

## 참고
- 기준 문서: `docs/harness-overview.html`
- 사용자 메모리: docs HTML은 인라인 SVG(Obsidian script 제거)

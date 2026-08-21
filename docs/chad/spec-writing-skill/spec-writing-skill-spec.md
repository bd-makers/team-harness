# spec-writing-skill — Spec

## 목적 / 요구사항

하네스의 spec 워크플로우는 scaffold(`harness-task`) → 본문 작성(공백) → 검증(`/harness-interview`) 구조로,
"빈 요구사항에서 spec 초안을 생성"하는 단계가 비어 있다. 이 갭을 채우는 `/harness-spec` 커맨드/스킬을 추가한다.

- R1 (interview): 활성 task의 이름을 시드로 생성형 인터뷰(Goal/Constraint/Success/Ontology 4차원, 한 번에 질문 하나)를 진행해 spec 초안을 만든다.
- R2 (confluence): Confluence 문서(PRD·spec·policy)에서 요구사항을 추출한다 — Atlassian MCP 우선, 미연결 시 본문 붙여넣기 폴백.
- R3 (figma): Figma 파일(wireframe·design-spec·description)에서 화면/인터랙션 요구를 추출한다 — Figma MCP 우선, 실패 시 설명 붙여넣기 폴백.
- R4 (config): 프로젝트별 Confluence/Figma 기본 위치는 첫 실행 시 lazy로 입력받아 `.harness/config.json`의 `specSources`에 저장한다. task별 구체 URL은 실행 시 입력.
- R5 (출력): 기존 `taskSpecTemplate` 골격(목적/요구사항 · 설계/접근 · Ontology · Ambiguity 자가진단 · 참고)을 유지하며 `<name>-spec.md`를 채운다. 원문 통째 복사 금지 — 요약 + 소스 링크. 요구사항별 출처 표기.
- R6 (게이트 연결): 자가진단은 근거 있는 항목만 체크하고, 미체크 항목은 `/harness-interview`로 인계한다.

## 설계 / 접근

- `harness-interview` 패턴의 agent workflow 커맨드 — CLI 서브커맨드 아님.
- 신규 파일: `commands/harness-spec.md`, `skills/harness-spec/SKILL.md`, `skills/harness-spec/agents/openai.yaml`.
- 연결 지점: `.claude-plugin/plugin.json` commands 등록, `src/commands/task.mjs` next-actions 안내,
  `templates/CLAUDE.md.hbs` §1-A(+ 루트 CLAUDE.md 동기), README 커맨드 표, CHANGELOG.
- 역할 분리: `/harness-spec` = writer, `/harness-interview` = validator (변경 없음).
- 리서치 근거: OpenSpec(config context 주입, explore 톤), GSD Core(`--auto @prd.md` 문서 추출, spec-phase ambiguity 스코어링).
  상세는 `/Users/chadonpro/.claude/plans/merry-baking-moore.md` 승인 플랜과 artifact.md에 기록.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **spec 소스**: spec 초안의 근거가 되는 입력 채널 (confluence | figma | interview). 소스는 근거이지 spec 그 자체가 아니다 — spec에는 요약과 링크만 남는다.
- **specSources 설정**: `.harness/config.json`에 저장되는 프로젝트 수준 기본 위치(base URL·space·파일 URL). task별 구체 페이지/프레임 URL은 설정이 아니라 실행 시 입력이다.
- **writer vs validator**: `/harness-spec`은 초안을 생성(writer)하고, `/harness-interview`는 기존 초안을 검증(validator)한다. 두 페르소나는 병합하지 않는다.
- 게이트 통과 근거: 승인된 플랜에서 소스 3종·접근 방식(MCP 우선+폴백)·설정 시점(lazy)이 사용자 확답으로 고정됨.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? → "spec 초안 생성 단계의 갭을 /harness-spec으로 채운다"
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? → agent workflow(CLI 아님), MCP 우선+폴백, manifest-sync invariant 준수
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? → npm test 통과 + 인터뷰 모드 드라이런 + codex 리뷰 기록
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? → 변경 파일 표가 플랜에 확정됨
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고
- 승인 플랜: `/Users/chadonpro/.claude/plans/merry-baking-moore.md`
- https://github.com/Fission-AI/OpenSpec (docs/opsx.md, docs/overview.md)
- https://github.com/open-gsd/gsd-core (docs/COMMANDS.md의 /gsd-spec-phase, docs/explanation/the-phase-loop.md)

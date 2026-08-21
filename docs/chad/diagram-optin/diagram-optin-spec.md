# diagram-optin — Spec

## 목적 / 요구사항

LLM으로 task를 진행할 때 spec·planning 단계에서 다이어그램을 **함께 만들 수 있게** 하되,
강제가 아니라 **옵트인**으로 한다 — 물어보고, 사용자가 원치 않으면 건너뛴다.

요구사항:
1. 신규 task 생성 시 **1회만** 묻는다. 기존 task 재활성화(`activated:`) 시에는 묻지 않는다.
2. "예"면 plan.md 단계에 다이어그램 체크박스를 추가한다. "아니오"면 아무것도 추가하지 않는다.
3. 산출물은 `docs/<user>/<name>/<name>-diagram.html` (자립형 inline SVG).
4. 다이어그램 도구가 없는 머신에서도 **실패하지 않는다** — 건너뛰고 artifact에 "미실행"을 남긴다.

## 설계 / 접근

### 확정된 설계 결정

- **별도 옵트인 저장소를 만들지 않는다.** `.harness/config.json` 스키마 추가·전용 doctor 체크·
  상태 파일 모두 금지. 두 상태를 모두 plan.md가 표현한다 — 그 단계가 있으면 옵트인, 없으면
  옵트아웃이다. plan.md는 이미 SSOT이고 AGENTS.md 세션 시작 프로토콜 2번이 반드시 읽는
  파일이다 — **plan.md가 곧 상태다.** (실행 여부는 별개 축이다: 도구가 없어 건너뛴 opted-in
  task는 산출물이 없으므로, "산출물 존재 = 옵트인"으로 읽으면 오분류된다. 그래서 건너뛴 단계는
  지우지 않고 `- [x] … — 미실행(도구 없음)`으로 닫아 옵트인 사실을 보존한다.)
- **질문은 CLI가 아니라 command doc에서 한다.** `harness-team task`는 Node CLI라
  AskUserQuestion을 할 수 없다. 절차는 `commands/harness-task.md`가 소유하며,
  Codex 표면(`skills/harness-task/SKILL.md`)도 같은 문서를 SSOT로 읽으므로 두 에이전트 경로가
  한 문서로 커버된다. `src/`는 손대지 않는다.
- **하드 의존 금지.** 다이어그램 스킬은 이 플러그인 소유가 아니라 별도 마켓플레이스의 Claude
  전용 플러그인이며 머신별 설치다. 실행 계약은 `commands/harness-codex-review.md`와 동일한
  **probe → degrade → record**: 없으면 실패하지 않고 건너뛰며 artifact에 "미실행" 한 줄.
- **문서 계층 분리.** `AGENTS.md`는 Codex·Cursor·OpenCode도 읽는 멀티에이전트 SSOT이므로
  도구 중립적으로만 쓴다(특정 스킬 이름 금지). Claude 전용 호출은 `CLAUDE.md`와
  `commands/*.md`에만 둔다.
- **inline SVG인 이유.** `docs/`는 Obsidian 볼트 안이고 Obsidian은 script를 제거하므로
  mermaid JS는 렌더되지 않는다. 자립형 inline SVG HTML만 볼트에서 제대로 보인다.

### 변경 범위

문서 전용 변경. 루트와 `templates/*.hbs`는 **쌍으로** 고친다(`tests/agent-files.test.mjs`가
관리 절을 문자열 동일성으로 비교).

- `AGENTS.md` ↔ `templates/AGENTS.md.hbs` — protocol 절, 도구 중립 규칙
- `CLAUDE.md` ↔ `templates/CLAUDE.md.hbs` — workflow 절 `1-B`, Claude 전용 호출
- `commands/harness-task.md` — 질문·probe·기록 절차 (body만; frontmatter는 생성 overview 입력이라 불변)
- `templates/docs/README.md` — docs 트리에 `<name>-diagram.html` 등재
- `tests/agent-files.test.mjs` — 회귀 가드(신규 파일 금지: source-tree 표가 생성물)
- `CHANGELOG.md` `[Unreleased]`

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **옵트인(opt-in)**: 신규 task 생성 직후 1회 묻고, "예"일 때만 plan.md에 다이어그램 단계를
  추가하는 것. 별도 플래그·설정 키가 아니라 **plan.md 체크박스의 존재/부재**가 상태다.
- **`<name>-diagram.html`**: task의 spec/plan을 설명하는 자립형 inline SVG HTML.
  `<name>-meta.json`·`<name>-context.md`와 같은 급의 **명시적 SSOT 제외 생성물**이며,
  SSOT 4파일(spec·plan·handoff·artifact)에 포함되지 않는다.
- **probe → degrade → record**: 외부 도구 존재를 먼저 확인(probe)하고, 없으면 실패 대신
  건너뛰며(degrade), 그 사실을 artifact에 명기(record)하는 실행 계약.
  `commands/harness-codex-review.md`의 Preflight(1)·기록(5)과 동일한 계약이다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
      → "신규 task 생성 시 1회 물어, 예면 plan.md에 다이어그램 단계를 추가하고 아니면 아무것도 하지 않는다."
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
      → 새 저장소·doctor 체크·상태 파일 금지, `src/` 무변경, AGENTS.md 도구 중립,
        루트/템플릿 쌍 유지, 버전 범프 금지, 검증은 샌드박스에서.
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
      → `npm run test` 전체 통과 + `npm run docs:check` 통과 + 샌드박스 apply 결과물에
        새 규칙이 전파됨을 실제 출력으로 확인.
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
      → 위 "변경 범위" 6개 파일 + 쌍 파일. 가드 테스트는
        `tests/agent-files.test.mjs`·`tests/e2e/ssot-consistency.test.mjs`·
        `tests/harness-overview-generation.test.mjs`·`tests/documentation-inventory-pointers.test.mjs`.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

**게이트 통과 근거:** 설계 결정 5개가 브리프에서 확정되어 왔고(재설계 금지), 영향 파일과
가드 테스트를 편집 전에 모두 식별했으므로 4/4 체크로 진입한다.

## 참고
- `commands/harness-codex-review.md` — probe → degrade → record 선례
- `src/commands/session-context.mjs` — CLI가 텍스트를 출력해 에이전트에게 AskUserQuestion을 지시하는 선례
- `AGENTS.md` D5(2026-08-20) — 격리 브랜치 병렬 작업 규정

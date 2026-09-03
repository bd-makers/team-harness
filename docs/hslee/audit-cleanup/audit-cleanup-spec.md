# audit-cleanup — Spec

## 목적 / 요구사항

2026-09-03 전수 점검(문서·커맨드·룰·훅, 서브에이전트 4렌즈 + 표본 검증 19건)에서 나온 발견을 수정하고,
사용자 결정 두 가지를 반영한다.

1. **감사 발견 수정** — P0 1건(observe-tools 공백 경로), P1 7건, P2 다수. 발견 목록은 `## 참고`의 세션 기록.
2. **`apply` 명령 삭제** — `apply`는 `runInit`의 별칭이었다(`src/commands/apply.mjs`). `init`이 신규·재실행
   양쪽의 동사가 된다(마커 병합이라 멱등). 플러그인 소비자에게 깨지는 변경이므로 CHANGELOG에 남긴다.
3. **OpenCode·Gemini 멤버 제거(우선은)** — 스캐폴드 파일(`GEMINI.md`, `.opencode/opencode.json`), 역할표 행,
   doctor 검사(EXTERNAL_TOOLS·CHECKS), gitignore 항목, 백업 스크립트 ITEMS, 리뷰 엔진 목록·폴백 체인의
   `gemini`를 제거한다. 코드는 git 이력에 남고, 재도입은 별도 결정으로 한다.

## 설계 / 접근

- 쓰기는 단일 스레드(D4). 참조 열거는 grep, 판단·쓰기는 메인 세션.
- **이름을 부르는 모든 곳**을 plan에 적는다(메모리 `docs-no-future-version-numbers`의 교훈).
  발행된 스냅샷(`docs/what-changes-*.html`, `docs/*-0.x.html`, CHANGELOG 릴리스 절, `docs/chad/**`)은
  이력이라 소급 수정하지 않는다. 정정은 `## [Unreleased]`에 새 기록으로 남긴다.
- 문서에 미래 릴리스 번호를 쓰지 않는다. "제거됐다/삭제됐다"로 상태만 쓴다.
- 이 저장소의 `AGENTS.md`·`CLAUDE.md` 관리 절은 템플릿 렌더와 바이트 일치해야 한다(`tests/agent-files.test.mjs`).
  템플릿을 고친 뒤 `mergeMarkdown`으로 루트 파일을 재렌더한다.
- `docs/decisions.md`는 append-only. D2·D4 전문은 그대로 두고 **D7**을 추가해 멤버 제거와
  "플러그인 소스 저장소는 자기 하네스를 dogfood하지 않는다"를 기록한다.
- 생성 문서(`docs/harness-overview.html`)는 템플릿 산문까지 범위에 넣고 `npm run docs:generate`로 재생성한다.
- 기존 설치본에 수정이 도달하도록 `migrate`의 `CLAUDE_HOOK_FILES`·sha 표에 observe-tools.mjs·boundary-checkpoint.sh를 편입한다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **멤버(member)**: 하네스가 스캐폴드 표면(파일·설정·역할표 행·doctor 검사)을 제공하는 에이전트. 제거 후 멤버는 Claude Code·Codex·Cursor.
- **리뷰 엔진**: `/harness-review`가 호출하는 CLI. 제거 후 `codex`·`claude`·`custom`, probe 체인은 codex → claude.
- **재실행 동사**: 기존 프로젝트에 하네스를 다시 적용하는 명령. `apply` 삭제 후 `init`(마커 병합, 멱등).
- **이력 스냅샷**: 발행 시점의 사실 기록. 소급 수정 금지 대상.
- **stock 훅**: 템플릿이 출하한 바이트 그대로의 훅. `migrate`는 sha 표에 있는 stock만 갱신하고 커스텀본은 건드리지 않는다.
- 게이트 근거: 목표·범위·측정 기준이 사용자 지시와 감사 보고서로 확정됨(아래 자가진단 5/5).

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 감사 발견 수정 + apply 삭제 + OpenCode·Gemini 멤버 제거.
- [x] **Constraint 명확도** (30%) — D4 단일 쓰기, 이력 스냅샷 불변, 미래 버전 번호 금지, 테스트 green 유지.
- [x] **Success 기준** (30%) — `npm test`·`npm run docs:check` exit 0, 현행 문서에서 `apply`·`opencode`·`gemini` 잔존 0, P0·P1 회귀 테스트 존재, 외부 리뷰 기록.
- [x] **Context 명확도** (brownfield 한정) — 영향 파일은 plan의 참조 목록으로 식별(grep 결과).
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8. 남은 해석("gemini 제거"가 리뷰 엔진까지 포함하는지)은 포함으로 가정하고 사용자에게 명시했다.

## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 감사 보고서: 2026-09-03 세션(`/delegation-router` 점검) — 발견은 이 task의 artifact `## 결과`에 요약 이관.
- `src/commands/apply.mjs` (`runApply = runInit`), `src/cli-args.mjs` COMMANDS, `bin/harness-team.mjs` router.
- `src/harness.mjs` AGENT_FILE_TEMPLATES·planChanges·AI_GITIGNORE_ENTRIES·copyStaticAssets.
- `src/commands/doctor.mjs` EXTERNAL_TOOLS·CHECKS, `src/commands/migrate.mjs` CLAUDE_HOOK_FILES·KNOWN_STOCK_HOOK_SHA256.
- 테스트: `tests/agent-files.test.mjs`, `tests/e2e/*.test.mjs`, `tests/prerequisites-doc.test.mjs`, `tests/hooks-jq-fallback.test.mjs`, `tests/migrate-hooks.test.mjs`.

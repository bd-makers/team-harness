# cursor-rules-mirror — Spec

## 목적 / 요구사항

`.claude/rules` → `.cursor/rules` 미러를 원본의 의도대로 번역하고, README에 규칙 표면의
비대칭(누가 무엇을 읽는가)을 명시한다.

- `paths:` frontmatter가 있는 규칙은 Cursor `globs:`(auto-attach, `alwaysApply: false`)로 번역
- 원본 frontmatter는 소비한다 — `.mdc` 본문에 리터럴로 남기지 않는다
- `paths:`가 없는 규칙만 `alwaysApply: true`로 유지
- 하위 디렉터리 규칙(`.claude/rules/frontend/styling.md`)도 구조를 보존해 미러
- README 강제력 표에 `경로 스코프 규칙` 열 + `.claude/rules`가 팀 전체 규칙이 아니라는 경고

## 설계 / 접근

`splitRulePaths(content)`가 선행 frontmatter를 파싱해 `{ paths, body }`를 돌려주고,
`mirrorCursorRules`는 그 결과로 Cursor frontmatter를 **생성**한다(기존처럼 덧붙이지 않는다).
Cursor의 `globs:`는 YAML 리스트가 아니라 쉼표 구분 문자열이므로 `paths.join(', ')`으로 낸다.

탐색은 `collectRuleFiles`가 재귀로 수행한다. Claude Code가 `.claude/rules/**/*.md`를 재귀
탐색하므로 flat `readdir`은 곧 "Claude에는 있고 Cursor에는 없는 규칙"을 만든다. 심볼릭 링크로
규칙을 공유하는 패턴이 문서화돼 있어 링크된 디렉터리는 따라가되, realpath 집합으로 순환 링크를
차단한다.

Node 18을 지원해야 하므로 `readdir(dir, { recursive: true })`(Node 20.1+) 대신 수동 재귀를 쓴다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **경로 스코프 규칙**: 특정 경로에서 작업할 때만 컨텍스트에 로드되는 규칙. Claude Code는
  `.claude/rules/*.md`의 `paths:` frontmatter로, Cursor는 `.mdc`의 `globs:`로 표현한다.
  `paths:`가 없는 규칙은 세션 시작 시 무조건 로드된다(= `.claude/CLAUDE.md`와 동급).
- **미러 번역**: `.claude/rules`(원본) → `.cursor/rules`(사본) 변환. 파일 복사가 아니라
  **의미 보존 번역**이다 — 스코프 선언이 대상 도구의 스코프 문법으로 옮겨져야 한다.
- **규칙 표면 비대칭**: 경로 스코프 규칙을 읽는 에이전트가 Claude Code(+미러를 받는 Cursor)뿐이라는
  사실. Codex·Gemini·OpenCode는 `.claude/`를 보지 않으므로 `.claude/rules`는 팀 전체 규칙이 아니다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 미러가 원본의 스코프 의도를 보존하도록 만든다.
- [x] **Constraint 명확도** (30%) — Cursor `.mdc` 문법(쉼표 구분 `globs:`), Node 18 호환, 기존 규칙 파일 형식 불변.
- [x] **Success 기준** (30%) — 실제 템플릿 4개가 `globs:` + `alwaysApply: false`로 나오고 본문에 `paths:`가 남지 않음. 하위 디렉터리 규칙이 구조 보존돼 나옴. 단위 + e2e 어써션 통과.
- [x] **Context 명확도** (brownfield 한정) — `src/harness.mjs:mirrorCursorRules`, `tests/e2e/ssot-consistency.test.mjs`, `README.md` 강제력 표.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

**게이트 통과 근거**: 결함이 코드에 이미 존재하고(원본 frontmatter를 그대로 남긴 채
`alwaysApply: true`를 덧붙임) 기대 출력은 Cursor 공식 문법으로 결정된다 — 설계 여지가 아니라 번역 규칙 문제다.

## 참고
- Cursor 규칙 frontmatter: `description` / `globs`(쉼표 구분 문자열) / `alwaysApply`
- Claude Code `.claude/rules`: `paths:` 있으면 매칭 파일 **Read 시** 로드, 없으면 세션 시작 시 로드.
  하위 디렉터리 재귀 탐색. Write/Edit로 새 파일을 만들 때는 로드되지 않음(anthropics/claude-code#38487, not planned).

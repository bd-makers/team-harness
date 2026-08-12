# cursor-rules-mirror — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`.claude/rules` → `.cursor/rules` 미러가 원본의 스코프 의도를 보존한다.

- `splitRulePaths(content)` — 선행 frontmatter에서 `paths:`(블록/인라인 리스트)를 파싱하고 본문을 분리
- `mirrorCursorRules` — Cursor frontmatter를 **생성**한다(덧붙이지 않음).
  `paths:` → `globs: a, b` + `alwaysApply: false`, `paths:` 없으면 `alwaysApply: true`
- `collectRuleFiles` — 재귀 탐색으로 하위 디렉터리 구조 보존(`frontend/styling.md` →
  `.cursor/rules/frontend/styling.mdc`), 심볼릭 링크 추적 + realpath 집합으로 순환 차단.
  Node 18 지원이라 `readdir({recursive:true})`(20.1+) 대신 수동 재귀.
- README — 강제력 표에 `경로 스코프 규칙` 열, `.claude/rules`는 팀 전체 규칙이 아니라는 경고

검증:
- 실제 템플릿 4개(navigation·state-management·styling·testing) 출력 확인 — 전부 `globs:` +
  `alwaysApply: false`, 본문에 죽은 frontmatter 없음
- `tests/cursor-rules-mirror.test.mjs` 5케이스(스코프·비스코프·중첩·심볼릭 링크 순환·파서)
- `tests/e2e/ssot-consistency.test.mjs`에 내용 어써션 추가 — 기존엔 `.mdc` 존재만 확인해
  `alwaysApply: true`로 회귀해도 통과했다
- `npm test` 전량 통과, `npm run docs:check` clean

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

## Learnings

- **미러는 복사가 아니라 번역이다.** 원본 frontmatter 위에 대상 frontmatter를 덧붙이는 구현은
  "파일이 존재한다"는 테스트를 통과하면서도 의미를 정반대로 뒤집었다(`paths:`로 좁힌 규칙이
  Cursor에서 항상 로드). 미러 대상이 스코프·우선순위 같은 **의미 있는 메타데이터**를 가질 때는
  존재 검사가 아니라 내용 검사가 필요하다.
- **에이전트별 규칙 표면은 대칭이 아니다.** 경로 스코프 규칙을 읽는 건 Claude Code(+미러를 받는
  Cursor)뿐이다. Codex·Gemini·OpenCode는 `.claude/`를 보지 않으므로 `.claude/rules`에 둔 기준은
  리뷰어(Codex)에게 보이지 않는다 — 팀 전체에 적용돼야 하는 규칙은 `AGENTS.md`에 둔다.
- **Claude Code `paths:` 규칙은 Read 시에만 로드된다** — Write/Edit로 새 파일을 만들 때는 로드되지
  않는다(anthropics/claude-code#38487, closed as not planned). 컨벤션이 가장 필요한 순간에 비어 있다.
  보완하려면 `PreToolUse`(Claude) / `PreToolUse` + `apply_patch` matcher(Codex 0.147.0)에서
  `additionalContext`로 주입하는 훅이 필요하다 — 이번 범위에서는 유지비를 이유로 보류했다.

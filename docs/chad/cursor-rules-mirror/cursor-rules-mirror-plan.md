# cursor-rules-mirror — Plan

## 목표

`.claude/rules` → `.cursor/rules` 미러가 원본의 경로 스코프 의도를 보존하게 하고,
README에 규칙 표면의 비대칭을 명시한다.

## 단계
- [x] `splitRulePaths` 추출 — 선행 frontmatter에서 `paths:`(블록/인라인 리스트)를 파싱하고 본문을 분리
- [x] `mirrorCursorRules`가 Cursor frontmatter를 생성 — `paths:` → `globs: a, b` + `alwaysApply: false`, 없으면 `alwaysApply: true`
- [x] `collectRuleFiles` 재귀 탐색 — 하위 디렉터리 구조 보존, 심볼릭 링크 추적 + realpath 순환 차단 (Node 18 호환 수동 재귀)
- [x] `tests/cursor-rules-mirror.test.mjs` 신설 — 스코프/비스코프/중첩/심볼릭 링크/파서 5케이스
- [x] `tests/e2e/ssot-consistency.test.mjs`에 내용 어써션 추가 (기존엔 `.mdc` 존재만 확인해 회귀를 못 잡음)
- [x] README 강제력 표에 `경로 스코프 규칙` 열 + `.claude/rules`는 팀 전체 규칙이 아니라는 경고
- [x] 실제 템플릿 4개로 출력 확인 (`globs:` 번역, 본문에 죽은 frontmatter 없음)
- [x] `npm test` 전량 통과 + `npm run docs:check`
- [x] CHANGELOG `[Unreleased]` 기록
- [x] Codex 외부 리뷰(read-only) 실행 → P2 2건 판별·수정(YAML 인용, 순환 가드 backtracking) + 회귀 테스트 2건 + 뮤테이션 확인

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-08-12: **미러 번역** 정의 — `.claude/rules` → `.cursor/rules`는 파일 복사가 아니라 의미 보존
  번역이다. 스코프 선언(`paths:`)이 대상 도구의 스코프 문법(`globs:`)으로 옮겨지지 않으면 미러는
  "존재하지만 틀린" 상태가 된다.
- 2026-08-12: **규칙 표면 비대칭** 정의 — 경로 스코프 규칙을 읽는 건 Claude Code(+미러를 받는
  Cursor)뿐. `.claude/rules`는 팀 전체 규칙이 아니며 리뷰어(Codex)는 이를 못 본다.

## 참고
- Cursor `globs:`는 YAML 리스트가 아니라 쉼표 구분 문자열이다.
- Claude Code의 `paths:` 규칙은 **Read 시**에만 로드된다 — Write/Edit로 새 파일을 만들 때는
  로드되지 않는다(anthropics/claude-code#38487, closed as not planned).

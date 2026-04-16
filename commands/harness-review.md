---
description: 현재 diff를 Codex + Gemini로 병렬 리뷰 (read-only)
argument-hint: [diff-target e.g. "staged" | "main..HEAD" | "file.ts"]
---

`.claude/skills/review/SKILL.md`의 절차를 따라 병렬 리뷰를 수행합니다.

**전제**: 프로젝트에 `harness-team init/apply`가 적용되어 `.claude/skills/review/SKILL.md`와 `Bash(gemini:*)`, `Bash(codex:*)` 권한이 설치되어 있어야 합니다.

1. 리뷰 브리프 작성 (Summary / Key design choices / Risk areas / Diff 보는 방법)
2. Gemini와 Codex를 병렬 Bash 호출 (타임아웃 300000ms)
3. 피드백 수집 → 동의 항목은 구현, 이견은 사용자 확인

자세한 명령 템플릿은 `.claude/skills/review/SKILL.md` 참조.

**$ARGUMENTS** (예: `staged`, `main..HEAD`, `src/foo.ts`)를 diff 범위로 사용하세요.

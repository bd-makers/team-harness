# ssot-agents-md — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## Verification (import 실측 — 2026-06-12)

| 도구 | AGENTS.md 소비 | 확정 import 라인 | 상태 / 근거 |
|---|---|---|---|
| **Claude Code** | CLAUDE.md → `@AGENTS.md` (네이티브 미인식) | `@AGENTS.md` | ✅ **확정** — code.claude.com/docs/en/memory. "Claude Code reads CLAUDE.md, not AGENTS.md … create a CLAUDE.md that imports it." 경로=import 파일 기준, 재귀 4-hop, 첫 외부 import 시 승인 다이얼로그 1회. |
| **Gemini CLI** | GEMINI.md → `@AGENTS.md` | `@AGENTS.md` | ⚠ **실측 보류** — 이 환경에 `gemini` 바이너리 미발견(설정/oauth는 `~/.gemini`에 존재하나 PATH·login shell 모두 부재). 문서상 `@file.md` import 지원. **실행 단계 재검증**: temp-dir에 AGENTS.md(sentinel)+GEMINI.md(`@AGENTS.md`) → `gemini -p`로 sentinel echo 확인. 실패 시 GEMINI.md 풀렌더(코어 복제) 폴백 — 파일 구조 불변. |
| **Cursor** | `AGENTS.md` 네이티브 | (import 불필요) | agents.md 오픈 표준 네이티브 → `.cursorrules` 제거 대상. |
| **OpenCode** | `AGENTS.md` 네이티브 | (import 불필요) | 동상. |

**결론:** 레이아웃은 검증 결과와 무관하게 고정(폴백=실패 에이전트만 풀렌더). Claude/Gemini 공통 import 토큰 `@AGENTS.md`를 템플릿에 인코딩. Gemini만 실행 단계 sentinel 재검증 필요.

## 결과


## Learnings


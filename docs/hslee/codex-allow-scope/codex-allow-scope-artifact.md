# codex-allow-scope — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
2026-11-04 — 템플릿 `.claude/settings.json`에서 `Bash(codex:*)`를 뺐다. `harness-team migrate`가 기존 설치의 `permissions.allow`에서 정확히 그 문자열 하나만
확인 후 지운다(`migrateCodexAllow`). AGENTS.md 역할 표의 Codex 호출 방식은 `harness-team review codex`(eager 17,267 → 17,256 B). 출처: task `subsystem-audit` 후보 B.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

- 아직 없음 — R3 리뷰는 PR 전에.

## Learnings
- **인수를 좁히는 Bash allow는 보안 경계가 아니다.** 규칙은 명령 전체 텍스트를 매칭하고 `*`가 무엇이든 대신하므로, 뒤에 붙는 플래그를 막지 못한다 — 줄이려면 뺀다.
- "codex read-only가 `Read(./.env)` deny 밖에서 읽는다"는 미확인으로 남겼다 — 판정은 M-1만으로 섰다.

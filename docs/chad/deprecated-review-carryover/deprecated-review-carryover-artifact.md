# deprecated-review-carryover — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 2026-08-28: `CHANGELOG.md` `## [Unreleased]`에 `### Notes` 절 신설 — 0.19.0 Notes의
  이월 기록 규칙("다시 이월한다면 그 사실을 그 릴리스의 이 절에 적는다")이 0.20.0에서
  지켜지지 않은 사실을 정정 기록으로 남겼다. 발행된 `## [0.20.0]` 절은 불변 원칙에 따라
  수정하지 않았다. 포워딩 4개가 0.20.0 트리에 남은 것이 의도된 하위 호환(선행 조건:
  홈 머신 hsonpro 전역 CLAUDE.md 전환 확인 → 0.21.0 제거 목표)임을 함께 기록.
- 0.21.0 제거 실행 단계는 plan 후속 범위에 준비: 커맨드 2 + 스킬 2 제거,
  `.claude-plugin/plugin.json` commands 항목 2 제거, `npm test`(manifest-sync) 확인,
  `npm run docs:generate` 재생성. `skills/harness-codex-sim`은 별개 — 제거 대상 아님.
- 검증: `node --test tests/what-changes-latest-version.test.mjs tests/manifest-sync.test.mjs
  tests/documentation-inventory-pointers.test.mjs` 12/12 green, `npm run docs:check` 최신 확인.
- 다이어그램 옵트인: 비대화 세션이라 기본값 "아니오"로 건너뜀(plan에 사유 기록).

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings


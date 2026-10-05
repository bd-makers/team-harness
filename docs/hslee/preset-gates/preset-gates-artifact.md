# preset-gates — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 다이어그램: docs/hslee/preset-gates/preset-gates-diagram.html 생성 (2026-10-05)
- 검증 (2026-10-05): `npm run test` → 1090 pass · 0 fail · skip 1 (+ perf 1 pass), `npm run docs:check` → 최신.
  완료 기준 1: `grep -nE 'pnpm|yarn|bunx|npx|prettier|tsc'` 두 훅 → 0줄.
- 소비자 실측 (2026-10-05, 읽기 전용 — `resolveStack`+`buildProposal`만 호출, config·훅 무변경):

  | 프로젝트 | 스택·PM | 설치 훅 | 제안 |
  |---|---|---|---|
  | deep-math | react-native · npm | 직전 stock → migrate가 래퍼로 갱신 + gates 제안 | `npx tsc --noEmit` · `npm run lint` · `npm run test` |
  | job-scraper | python · pip | 커스터마이즈 → migrate 무변경 | `ruff check .` · `pytest`, format `*.py → ruff format` |
  | heliosent-profile | next · bun | 커스터마이즈(bun.lock 감지 추가본) → migrate 무변경 | `bunx tsc --noEmit` · `bun run lint` · `bun run test` |

  **주의 — deep-math**: `lint` 스크립트는 있으나 eslint 미설치(#119 실측 exit 127). `migrate --yes`로 제안을 그대로 받으면
  `npm run lint`가 127 → "설정 오류"로 **모든 Claude 커밋이 막힌다**. 대화형 migrate는 제안을 먼저 보여 주므로 거절·수정할 수 있다.
  spec 설계상 기대 동작(127 = 설정 오류)이지만, `--yes`가 "이전 typecheck·test 동작 유지"보다 넓다(lint 추가)는 점은 R7 문장과 어긋난다 — 리뷰에서 판정.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

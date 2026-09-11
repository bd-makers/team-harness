# review-codex-live-check — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 0.37.0 `harness-team review` codex 엔진 경로 1회 실측 — (a) stdin 닫힘 (b) 증거 기록 (c) 16 KiB 절단 표기. 코드 변경 없음
- Current atomic step: 실측 완료·artifact 기록 완료 — 남은 것은 커밋과 `done` (사용자 결정)
- Stop / human-decision condition: `done` 처리와 커밋 여부

## Constraints and settled decisions
- 결과: (a) 통과 (b) 통과 (c) 미도달(1786 B) — patch 릴리스 불필요
- 리뷰 대상 `--scope diff --base v0.36.0` 고정; 다이어그램 아니오; followups 1번 제거·8번 추가
- codex P2 5건 판별: 실재 3건(P3) → followups 8번, 오탐 2건 — 수정은 범위 밖

## JIT retrieval map
- Identifiers / symbols: `runEngine`, `which`, `truncateOutput`, `renderReviewBlock`
- Narrow globs: src/commands/review.mjs, docs/followups.md
- Read next: docs/chad/review-codex-live-check/review-codex-live-check-artifact.md `## 결과`
- Verification command: `node bin/harness-team.mjs done --help` 후 `done` (plan 전부 [x], meta.reviews[0] 존재)

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- 미커밋 변경: docs/followups.md, docs/chad/review-codex-live-check/* — 커밋 전 `git status` 확인

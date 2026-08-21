# review-restructure — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 리뷰 커맨드를 엔진 중립 2커맨드(/harness-review, /harness-adversarial-review)로 재편
- Current atomic step: codex 외부 리뷰 결과 검증 → artifact ## Reviews 기록 → 커밋
- Stop / human-decision condition: 리뷰 P1 발견 시 수정 여부는 사용자 확인 후 진행

## Constraints and settled decisions
- 엔진은 첫 위치 인자, 생략 시 probe 체인 codex → gemini → claude (custom은 명시 전용)
- claude runner: `claude -p --permission-mode plan` (2026-08-21 실측: 인증 상속·쓰기 차단·ro git OK)
- custom: `.harness/reviewers.json` {"custom":{"command":"... {prompt} ..."}} — 미설정 시 안내 후 종료
- 구명 커맨드·스킬 4개는 codex 포워딩 문서로 1개 마이너 버전 유지 (plugin.json 등재 유지)
- 버전 범프·릴리스는 이 task 범위 밖 (main에서 /harness-release)

## JIT retrieval map
- Identifiers / symbols: harness-review, harness-adversarial-review, reviewers.json, probe 폴백 체인
- Narrow globs: commands/harness-*review*.md, skills/harness-*review*/SKILL.md
- Read next: docs/chad/review-restructure/review-restructure-plan.md (남은 체크 1개)
- Verification command: npm run test (301 pass 기준), node scripts/generate-harness-overview.mjs

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- codex 리뷰(백그라운드) 결과 회수 → 발견 검증 → artifact ## Reviews에 날짜·엔진과 함께 기록
- gemini CLI 미설치 사실을 리뷰 기록에 명기
- plan 마지막 체크 닫고 커밋 (hs-commit 컨벤션)

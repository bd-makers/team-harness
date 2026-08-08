# release-publish-workflow — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: v* 태그 push로 GitHub Release 자동 발행 (CHANGELOG 절이 본문)
- Current atomic step: §4 종결 — Codex 리뷰 결과 검증 → artifact 기록 → 커밋 → done
- Stop / human-decision condition: v0.14.0 태그 재push(삭제 후 재생성)는 사용자 승인 필요

## Constraints and settled decisions
- 추출 로직은 YAML 인라인이 아니라 scripts/changelog-section.mjs — node --test로 검증 가능해야 함
- 실패 조건 2개: 태그≠package.json version, CHANGELOG 절 부재/빈 절
- 의존성 0 유지, 러너 기본 gh CLI 사용, test.yml 불변(태그는 branches 필터에 안 걸림)
- 소급 발행(누락 17개)은 이번 범위 밖

## JIT retrieval map
- Identifiers / symbols: extractChangelogSection
- Narrow globs: .github/workflows/release.yml, scripts/changelog-section.mjs, tests/changelog-section.test.mjs
- Read next: docs/chad/release-publish-workflow/release-publish-workflow-plan.md
- Verification command: npm run test (217+1 pass 기준)

## Failure capsules (max 3 unresolved)
- (none — M2 오검증은 해소됨: 아래 참조)

## Resume checklist
- 백그라운드 Codex 리뷰(b36t289pi) 결과 확인 → 발견 검증 → artifact ## Reviews 기록
- 커밋 → PR → 머지 후 태그 재push로 실제 발행 확인

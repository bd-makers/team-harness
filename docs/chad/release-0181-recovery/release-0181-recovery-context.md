# release-0181-recovery — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 빠진 `docs/what-changes-0.18.1.html`을 채워 main CI를 녹색으로 되돌리고 v0.18.1 릴리스를 발행한다.
- Current atomic step: PR 생성 → CI 그린 확인 → 태그 처리 방안 보고
- Stop / human-decision condition: 태그 `v0.18.1` 처리(강제 이동 vs 0.18.2 재범프)는 오케스트레이터
  승인 전 실행 금지.

## Constraints and settled decisions
- docs/는 Obsidian 볼트에서 열린다 → 자립형 정적 HTML만. 런타임 JS 다이어그램 금지.
  what-changes 시리즈는 전부 SVG 없이 CSS만 쓴다 — 일관성 유지.
- `what-changes-latest-version.html`은 스냅샷의 **바이트 단위 사본**이다. 손편집 2회 금지, 복사로 맞춘다.
- 다이어그램 옵트인: 아니오 (plan에 단계 없음).
- 이 task는 docs-only → done 가드의 테스트 작성 체크는 발동하지 않는다(`.html`/`.md`는 소스 확장자 아님).
  spec `## Done evidence`는 `review: required` 선언 → artifact에 리뷰 마커 필요.

## JIT retrieval map
- Identifiers / symbols: `assertLatestVersionDocument`, `classifyChangedPaths`, `parseDoneEvidenceDeclaration`
- Narrow globs: `docs/what-changes-*.html`, `.github/workflows/release.yml`
- Read next: `MAINTAINING.md` 릴리스 절차 4~9단계 (한 커밋 계약의 근거)
- Verification command: `npm run test` (388 tests / 387 pass / 1 skip) · `npm run docs:check`

## Failure capsules (max 3 unresolved)
(none)

## Resume checklist
- `git log --oneline -3` 로 현재 브랜치 상태 확인
- PR CI 상태 확인 → 머지 여부 확인
- 태그 처리는 보고·승인 이후에만

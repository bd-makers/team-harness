# release-0181-recovery — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 빠진 `docs/what-changes-0.18.1.html`을 채워 main CI를 녹색으로 되돌리고 v0.18.1 릴리스를 발행한다.
- Current atomic step: PR #40 CI 그린 · 태그 방안 보고 완료 → **사람 승인 대기**
- Stop / human-decision condition: 머지·태그 이동 모두 **사람 승인 전 실행 금지**. 오케스트레이터가
  (a) 태그 강제 이동에 기술적으로 동의했고 사용자 승인만 남았다.

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
- 태그 push 전 3검사(MAINTAINING.md 8단계, 브랜치에서 선행 확인 완료 — 승인 후 main에서 재실행):
  `node scripts/changelog-section.mjs 0.18.1 && node -p "require('./package.json').version" && npm test`

## Failure capsules (max 3 unresolved)
(none)

## Resume checklist
- 승인 도착 여부 확인 → 없으면 대기. 승인 없이 머지·태그 금지.
- 승인 시: ① `gh pr merge 40 --merge` ② `git checkout main && git pull --ff-only`
  ③ **main push 런 그린 확인**(`gh run list --branch main --limit 1`) — run id를 artifact에 남긴다.
  레드면 태그를 건드리지 말고 즉시 오케스트레이터에 보고.
  ④ main에서 3검사 ⑤ `git push origin :refs/tags/v0.18.1` →
  `git tag -f v0.18.1 "$(git rev-parse main)"` → `git push origin v0.18.1`
  ⑥ release 워크플로 그린 + `gh release list`에 v0.18.1 Latest 확인
  ⑦ artifact 마무리 → `harness-team done` — **여기까지가 이 세션의 범위**
- `harness-team summary --write`는 **하지 않는다**. 집계 2종은 meta status 파생 생성물이라
  PR #39(worker-21) 머지·종결 후 오케스트레이터가 실행자를 지정한다.
- PR #39는 기다리지 않는다 — 이 릴리스 내용물이 아니다.

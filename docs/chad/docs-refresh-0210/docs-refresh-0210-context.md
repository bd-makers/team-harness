# docs-refresh-0210 — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 소비자 문서 6종을 0.21.0 사실에 맞추고, 벤더링 인벤토리 + 전체 스킬 옵트인 표를 추가
- Current atomic step: plan 전 단계 완료 · 외부 리뷰 기록 후 `done` 대기
- Stop / human-decision condition: 릴리스 범프(`/harness-release`)는 별도 지시 — 이 task는
  `## [Unreleased]` 기록까지만 한다

## Constraints and settled decisions
- 스냅샷 비대칭 유지: overview·simulation만 `-0.21.0.html` + index 등재.
  fleet·task guide는 스냅샷 계열이 없다(0.19.0도 제자리 갱신) — 없던 관례를 만들지 않는다
- 미래 릴리스 번호 금지: 상태만 쓰고 시점은 CHANGELOG가 말한다
- `prerequisites.md`의 `<!-- prerequisites:external-tools -->` 마커 블록 불가침 —
  `tests/prerequisites-doc.test.mjs`가 doctor `EXTERNAL_TOOLS`와 양방향 대조
- 다이어그램 옵트인 계약을 3번째 지시 표면에 복제 금지(`tests/agent-files.test.mjs`가 2표면 강제).
  `docs/` HTML은 그 가드 밖이지만 정본은 `commands/harness-task.md`
- 다이어그램: 옵트인 **아니오**(2026-08-29) — plan에 단계 없음이 곧 옵트아웃 상태
- 문서에 남은 `0.18.1` 표기는 전부 "기능이 도입된 릴리스"를 가리키는 역사적 귀속 — 유지한다

## JIT retrieval map
- Identifiers / symbols: `VERIFY_KIND_SUFFIXES` · `collectDoneIssues` · `firstActivatedAt` ·
  `EXTERNAL_TOOLS` · `prerequisites:external-tools`
- Narrow globs: `docs/harness-{overview.template,workflow-simulation,task-guide,fleet-guide}.html` ·
  `docs/prerequisites.md` · `docs/index.html`
- Read next: `docs/chad/docs-refresh-0181/` (선례 task) · `commands/harness-task.md` 옵트인 절
- Verification command: `npm test` · `npm run docs:check` · HTML 태그 균형 검사(python HTMLParser)

## Failure capsules (max 3 unresolved)
<!-- 미해결 없음. 해소된 관찰은 artifact 학습 절로 옮겼다. -->

## Resume checklist
- overview는 **생성 문서지만 산문은 템플릿 하드코딩**이다 — 본문을 고칠 때 반드시
  `docs/harness-overview.template.html`을 고치고 `npm run docs:generate`로 재생성
- 세는 문장(가드 N종)을 바꿀 때는 네 문서 전체 + task guide의 inline SVG 라벨까지 grep

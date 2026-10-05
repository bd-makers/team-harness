# preset-repo-shape — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: init이 저장소 모양을 판별·확인 → 게이트는 turbo·nx 위임 또는 workspace별 목록, RN rules는 앱 경로 스코프 프리셋. 단일 앱은 출력·기록 바이트 동일.
- Current atomic step: spec 게이트 통과(2026-10-06). §5-A 복잡도 게이트 — 메인테이너 확인 대기 후 plan 작성.
- Stop / human-decision condition: 구현 착수 전 메인테이너 확인(영향 파일 10+). turbo·nx 명령 형태는 공식 문서 확인 전 확정 금지.

## Constraints and settled decisions
- D8·D11·D7, 무의존성, 단일 앱 바이트 동일(G1). 변경 기준 HEAD 대비+untracked. `commit` 배열|객체, `"."` 키.
- 확정 shape 기준 drift(G2), 루트 앱 = `"."`(G3, workspace 원천 있을 때만), RN rules는 앱 workspace만(G4).
- RN rules 4종은 `templates/.claude/rules/`에 그대로 두고 일괄 복사 단계만 제거(설계 4).

## JIT retrieval map
- Identifiers / symbols: buildProposal, holds, fingerprintDrift, gateCommit, copyStaticAssets, excludesRnRules, RN_ONLY_RULE_FILES, mirrorCursorRules, collectStale
- Narrow globs: src/presets.mjs, src/commands/{gate,init,doctor,migrate}.mjs, src/harness.mjs, templates/presets/*.json, tests/stack-conditional-rules.test.mjs
- Read next: spec 참고 절 영향 파일 목록, (open → plan) 7건
- Verification command: npm run test && npm run docs:check

## Failure capsules (max 3 unresolved)

## Resume checklist
- spec 읽기 → 메인테이너 확인 여부 확인 → plan 작성(다이어그램 단계 포함)

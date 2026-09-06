# handoff-marker-typing — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 완료 마커의 생성·판독을 `src/handoff-marker.mjs` 한 선언으로 모으고, 생산자 단독
  변경이 반드시 테스트를 깨게 만든다 (권고 ⑦, 범위 "좁게").
- Current atomic step: Codex 리뷰 결과 판별 → artifact `## Reviews` 기록 → `done`.
- Stop / human-decision condition: 리뷰가 P1을 내면 조치 범위를 사용자에게 확인.
  릴리스 여부는 별개 판단(문서 전용·소규모면 미릴리스).

## Constraints and settled decisions
- append 바이트 동일 · 정규식 느슨함 유지 — 둘 다 하위 호환 계약이다.
- 파서를 넓히지도 않는다: 커밋 항목(`## <시각> — <sha msg>`)과의 구분이 `\s*완료\s*$` 뿐이다.
- 범위 = 완료 마커 하나. 커밋 항목은 소비자 0개라 제외(전수 확인).
- (a) handoff 재개 구조 = TCC 중복이라 기각 · (c) `renderUserHandoff` = 이미 테스트 있음.

## JIT retrieval map
- Identifiers / symbols: `renderDoneMarker` · `hasDoneMarker` · `DONE_MARKER_RE` ·
  `inferLegacyMeta` · `runDone`
- Narrow globs: `src/handoff-marker.mjs` · `src/commands/{task,summary}.mjs` ·
  `tests/handoff-marker.test.mjs`
- Read next: 리뷰 출력 → scratchpad `codex-review.txt`
- Verification command: `npm run test` (627/626 pass/0 fail/1 skip) ·
  `node bin/harness-team.mjs doctor`

## Failure capsules (max 3 unresolved)
(없음 — 미해결 실패 없음)

## Resume checklist
- 커밋 `a539e99` 가 구현 전부. 이후 변경은 문서(artifact/plan)와 리뷰 반영뿐.
- 뮤테이션 재확인법: `renderDoneMarker` 의 `—`→`-` 로 3 fail, `DONE_MARKER_RE` 를 ISO 전용으로
  좁히면 1 fail. **뮤테이션 적용 후 `grep` 으로 실제 변경 여부를 반드시 확인** (perl 구문
  오류가 조용히 무적용 → 헛통과를 만든 적 있음).
- post-commit 훅이 커밋마다 handoff 를 다시 dirty 로 만든다 — 리뷰 scope 판단 시 감안.

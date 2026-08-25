# done-guard-window — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `done` 가드의 판정 창을 "마지막 활성화" → "task 작업 구간"으로 바꿔 오탐 제거.
  **단 가드가 막던 망각은 계속 잡아야 한다.**
- Current atomic step: **[결정] 창 기준 선택** — (A) `firstActivatedAt` 유력.
  결정 후 **재현 테스트 먼저**, 그다음 구현.
- Stop / human-decision condition: 없음(기술 결정). 다만 착수 지시를 받고 시작한다 —
  현재는 조사·설계까지만 된 상태다.

## Constraints and settled decisions
- 원인 확정: `switchedAt`은 **마지막 활성화 시각**이지 작업 구간이 아니다.
  `runTask`가 생성(`:204`)·재활성화(`:231`) 모두 현재 시각으로 덮어쓴다.
- 의존 가드 3종: 리뷰 마커(`:442`) · 커밋 0개(`:474`) · 테스트 미작성(`:486`).
- **문제는 종결 케이스보다 넓다** — task 전환 후 복귀만으로도 창이 초기화된다.
- **가드를 넓혀서 통과시키면 안 된다.** `tests/done-guard.test.mjs:461`이
  "옛 마커 재사용 차단"을 의도로 고정해 뒀다 — 이 테스트가 계속 통과해야 한다.
- `meta.created`는 **날짜만**(`slice(0,10)`)이라 창 시작으로 부적합(과도하게 넓어짐).
- 하위 호환: 새 필드가 없으면 **degrade**(차단 아님). `switchedAt` 부재 시 기존 처리(`:444`)와 동일 원칙.

## JIT retrieval map
- Narrow globs: `src/commands/task.mjs`, `tests/done-guard.test.mjs`
- Identifiers: `collectDoneIssues`, `switchedAt`, `writeActive`, `parseReviewMarkers`, `readTaskMeta`
- Read next: `collectDoneIssues()` `:402-500` → `runTask()` `:200-235`
- Verification command: `node --test tests/done-guard.test.mjs` (27 test)

## Failure capsules (max 3 unresolved)
- (none unresolved — 원인 확정, 남은 것은 설계 선택과 구현이다)

## Resume checklist
- 실사례는 `docs/chad/boundary-perf-invariant/…-artifact.md` `## 종결 기록`에 있다 —
  재현이 필요하면 거기 타임스탬프(활성화 04:25:13Z / 마커 05:35:00Z / 재활성화 09:19:47Z)를 쓴다.
- **테스트를 먼저 쓴다.** 가드 자신을 고치는 task라 "고쳤다"의 근거가 테스트여야 한다.
- 판정 기준은 "오탐이 사라졌는가"가 아니라 **"오탐은 사라지고 `:461`은 계속 막는가"** 다.

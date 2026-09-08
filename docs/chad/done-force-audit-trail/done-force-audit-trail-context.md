# done-force-audit-trail — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `done --force`로 무시한 가드 issue를 `<name>-meta.json`·원장에 기계 판독 가능하게 남긴다.
- Current atomic step: plan 1단계 — `taskMetaTemplate`에 `forcedAt`/`forcedIssues` 추가 (미착수).
- Stop / human-decision condition: 가드의 **차단 판정**을 바꾸고 싶어지는 순간 멈춘다.
  이 task는 기록만 한다. 차단 범위를 건드리면 `done-guard-window`의 확립된 결정과 충돌한다.

## Constraints and settled decisions
- `--force`는 제거·제한하지 않는다. 우회는 계속 합법이다.
- `collectDoneIssues`(판정 로직)는 불변. 무엇을 막을지는 이 task 범위 밖.
- 기록 조건은 "`--force` 플래그"가 아니라 "**무시된 issue ≥ 1**". 플래그만 붙은 종결은 우회가 아니다.
- 구 task(필드 없음)는 "우회 아님"이 아니라 **"알 수 없음"**으로 degrade한다.
- 렌더링과 역파싱은 짝이다 — 한쪽만 바꾸면 원장 재읽기에서 행이 유실된다.
- spec이 `review: required` 선언 → 리뷰 마커 없이는 `done`이 막힌다(설계대로).

## JIT retrieval map
- Identifiers / symbols: `runDone`, `taskMetaTemplate`, `writeTaskMeta`, `inferLegacyMeta`,
  `collectDoneIssues`, `summaryRows`
- Narrow globs: `src/commands/{task,summary}.mjs`, `tests/{done-guard,summary}.test.mjs`
- Read next: `src/commands/task.mjs:655-704` (force 분기 → meta 쓰기),
  `src/commands/summary.mjs:23-27` (meta 스키마), `:82` (역파싱), `:147,157-160` (렌더링)
- Verification command: `npm run test` — 부분 실행은 `npm run test:unit`
- 선행 맥락(필요할 때만): `docs/chad/done-guard-window/done-guard-window-artifact.md`
  (우회 실사례 + 기각된 P1 논거). 통째로 읽지 말고 `--force`·`P1`로 grep.

## Failure capsules (max 3 unresolved)
### F-001
- Signal:
- Tried:
- Compact finding / current hypothesis:
- Next discriminator:
- Source (safe path or command):

## Resume checklist
- plan.md `## 단계`의 첫 미완 `- [ ]`가 현재 단계다.
- 원장 렌더링을 건드렸다면 `src/commands/summary.mjs:82` 역파싱도 같은 커밋에 들어갔는지 확인.
- 종결 전: 리뷰 마커(`<!-- harness:review ... -->`)가 artifact `## Reviews`에 있어야 한다.

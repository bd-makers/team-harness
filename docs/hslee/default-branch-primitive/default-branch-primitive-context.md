# default-branch-primitive — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `origin/HEAD` 읽기 세 벌을 `readOriginHead` 하나로 모은다. 폴백 정책은 그대로, 동작은 **표준 origin/HEAD 모양에 한해** 그대로.
- Current atomic step: plan 전 단계 완료(구현·회귀 증명·docs·리뷰). 커밋 대기 — 사용자 지시 필요.
- Stop / human-decision condition: 커밋·push·PR은 사용자 지시 후에만. `isSyncedWithDefault`의 무폴백을 바꾸자는 제안이 오면 **거부하고** `summary.mjs:294-300`과 `tests/summary.test.mjs:570`를 근거로 제시한다.

## Constraints and settled decisions
- **동작 변화 0이 전제다 — 단 표준 `origin/HEAD → refs/remotes/origin/<branch>` 에 한해.** 기존 테스트를 고쳐야 한다면 전제가 깨진 것이다 — 고치지 말고 멈춘다.
- **의도된 예외 하나**: `origin/HEAD` 가 `refs/heads/<branch>` 를 가리키는 비표준 저장소에서 옛 `defaultBranchCandidates` 는 `['develop']`, 새 구현은 `['main','master']`. 로컬 브랜치를 원격 기본 브랜치의 답으로 쓰지 않기 위한 의도적 변경이다(spec·artifact에 근거 기록, 신규 테스트가 고정).
- `isSyncedWithDefault`의 무폴백은 쓰기 가드다. 후보 목록으로 넓히면 낡은 `origin/master` tip에서 `--write`가 열린다(코드 주석이 정본).
- 실행 정책(`GIT_NO_LAZY_FETCH`·timeout)은 프리미티브에 심지 않는다 — 호출자가 exec에 닫아 넣는다. 심으면 timeout 시 summary 후보가 넓어져 가드가 느슨해진다.
- 프리미티브는 `src/`에 둔다. `src/commands/`에 두면 `remote-task → summary` 기존 import와 순환이 된다.
- 네 함수가 답하는 질문(ref / 이름 배열 / boolean)이 다른 것은 그대로 둔다.

## JIT retrieval map
- Identifiers / symbols: `readOriginHead` · `resolveDefaultRef` · `defaultBranchCandidates` · `isSyncedWithDefault`
- Narrow globs: `src/git-default-branch.mjs` · `src/commands/{remote-task,summary}.mjs` · `tests/{git-default-branch,summary,remote-task}.test.mjs`
- Read next: `src/commands/summary.mjs:279`(후보) 와 `:310`(동기화 판정) — 폴백 차이가 드러나는 두 지점
- Verification command: `npm test` · `git diff --stat tests/`(신규 파일만이어야 한다)

## Failure capsules (max 3 unresolved)
- (없음)

## Resume checklist
- `npm test` 가 **933개**인지 본다(변경 전 baseline 925 + 신규 8). 925로 돌아가면 신규 테스트가 사라진 것이고, 933보다 줄면 회귀다.
- `git diff --cached --stat tests/` 에 `git-default-branch.test.mjs` 외의 파일이 뜨면 동작이 변한 것이다. 되돌린다. (변경이 staged 라 `--cached` 없이는 아무것도 안 보인다.)
- 커밋 전 순서: `npm test` → `git add -A` → `npm run docs:generate` → `npm run docs:check`.

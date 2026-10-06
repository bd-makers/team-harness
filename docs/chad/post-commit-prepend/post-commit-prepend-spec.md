# post-commit-prepend — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

출처: `docs/followups.md` 13번(2026-10-06, task `pr-check` 리뷰에서 남은 리스크).

- **문제**: `installPostCommitHook`은 기존 post-commit 훅 **끝에** `appendFile`로 셸 줄을 붙인다.
  1. python·node 훅이면 그 훅이 문법 오류로 죽는다 — 커밋은 막히지 않지만(post-commit rc는 git이 무시) 사용자 훅과 handoff가 함께 사라진다.
  2. 앞선 `exit`·`exec` 뒤에 붙으면 handoff 갱신이 조용히 안 돈다. 실례: git-lfs의 post-commit은 git-lfs가 없으면 `exit 2`로 끝난다.
- **덤으로 발견한 결함(같은 함수)**: 기존 훅이 개행 없는 shebang 한 줄(`#!/bin/sh`, EOF)이면 맨 위 삽입이
  `#!/bin/sh# harness: …`를 만든다(2026-10-06 재현). macOS는 그래도 실행했다(실측: execve·`git push` 모두 통과).
  shebang을 공백까지 읽는 Linux 커널에서는 인터프리터 `/bin/sh#`를 찾지 못할 수 있다(컨테이너 런타임이 없어 미실측).
  어느 쪽이든 출력 자체가 틀렸고 수정이 한 줄이라 같은 함수에서 고친다.
- **영향**: init·sync(`src/commands/init.mjs:108`, `sync.mjs:9`)와 0.6 레거시 migrate(`migrate.mjs:165`)로 post-commit을 설치하는 모든 소비자 저장소.
- **기대 결과**: post-commit도 pre-push와 같은 설치 경로를 쓴다. 블록은 shebang 바로 다음 맨 위에 넣고, 셸이 아닌 훅은 건드리지 않고 안내만 한다.
  안내 문구는 훅마다 맞는 호출(`harness-team handoff`)을 처방한다.
- **제약**: 새로 설치하는 post-commit 파일은 오늘과 바이트 동일하게 둔다(`POST_COMMIT_HOOK`, doctor 테스트가 import한다).
  export 시그니처는 그대로 둔다(호출처 3곳 무변경). 언어 분기를 넣지 않는다(D11).

## 설계 / 접근

- `POST_COMMIT_BLOCK`(주석 + `harness-team handoff 2>/dev/null || true`)을 정의하고, `POST_COMMIT_HOOK = '#!/bin/sh\n' + POST_COMMIT_BLOCK`로 만든다. 결과는 오늘과 같은 바이트다.
- `installGitHook`을 `{ name, block, marker, call }`로 바꾼다.
  - 새 파일 본문은 `#!/bin/sh\n${block}`로 파생한다.
  - 두 훅 모두 prepend하므로 `appendFile` 분기와 `body`·`prepend = null` 기본값은 **삭제**한다.
  - 기존 장치를 늘리지 않고 분기 하나를 없애는 변경이다.
- 비-셸 skip 안내는 `call` 인자를 쓴다. post-commit은 `harness-team handoff`, pre-push는 `harness-team pr-check --pre-push`다.
  `${marker} --pre-push` 하드코딩은 post-commit에 틀린 처방을 내므로 제거한다.
- 로그 문구는 하나로 통일한다: `inserted harness block at top`. 기존 `appended harness line`은 사라진다(테스트·문서에서 이 문구를 참조하는 곳 없음, `git grep` 확인).
- 개행 없는 shebang: shebang 뒤에 `\n`이 없으면 붙이고 나서 블록을 넣는다(한 줄 수정).

### 판단 (a) 순서 변화 — handoff가 기존 훅보다 먼저 돈다
- **관측 가능한 변화**: 기존 훅 줄이 실행될 때 작업 트리의 tracked handoff 파일이 이미 수정돼 있다.
  `git diff --quiet`·`git stash`·`git add -A && git commit --amend` 같은 줄을 가진 기존 post-commit은 다른 상태를 본다.
- **수용 근거**:
  1. handoff 수정은 어차피 다음 커밋까지 작업 트리에 남는다(하네스의 의도된 흐름 — 다음 커밋에 담는다). 기존 훅이 보는 상태가 "다음 커밋 전" 상태와 같아질 뿐이다.
  2. amend로 재진입해도 handoff는 같은 논리 커밋의 항목을 중복 제거한다(`src/commands/task.mjs:1102`).
  3. 얻는 것은 앞선 `exit`·`exec`·`set -e` 실패 뒤에서도 handoff가 도는 것이다. 13번이 고치려는 결함 그 자체다.
  4. pre-push는 이미 같은 이유로 맨 위에 넣고 있다.
- git-lfs post-commit(`git lfs post-commit`)은 잠금 파일 권한만 다루므로 handoff(문서 md 쓰기)와 순서가 무관하다.

### 판단 (b) 블록은 한 줄로 충분한가 — 그렇다
- post-commit에는 stdin 계약이 없다. pre-push의 임시 파일·`exec <` 되돌리기가 필요 없다.
- `|| true`로 rc를 삼키므로 `#!/bin/sh -e`·husky의 `sh -e`에서도 뒤 줄을 막지 않는다. CLI가 없을 때의 `not found`는 `2>/dev/null`로 숨긴다.
- 블록은 `exit`하지 않는다 — 기존 줄을 막지 않는다.
- 구버전 CLI 가드(`--help | grep`)는 두지 않는다. `handoff`는 오래된 명령이고 실패해도 `|| true`다.

### 판단 (c) doctor에 post-commit 검사 — 두지 않는다 (2차 장치 규칙)
- 검토한 "원래 장치를 줄이는 안":
  1. **기존 post-commit은 건드리지 않고 안내만 출력** — 기각. 기존 sh 훅 저장소에서 자동 handoff가 조용히 사라진다. 맨 위 삽입은 pre-push로 이미 검증된 코드이며, 이 변경은 오히려 분기를 줄인다.
  2. **post-commit 자동 설치를 아예 없앰** — 기각. handoff는 생산자이고 pr-check는 탐지자일 뿐이다. 생산자를 지우면 모든 PR이 "템플릿 그대로"로 막힌다.
- doctor 검사를 추가하지 않는 근거:
  1. PATH 수준 건강은 이미 `SessionStart/post-commit hook CLI` 검사가 본다(`src/commands/doctor.mjs:1013`).
  2. 훅이 돌지 않아 handoff가 템플릿으로 남으면 강제 지점인 pr-check가 잡는다(`src/commands/pr-check.mjs:31-32`, "post-commit 훅이 갱신한 handoff를 다음 커밋에 담기").
  3. 결함의 부작용을 보여 주기 위한 새 장치 = 2차 장치이며, 위 두 장치로 이미 관측된다.

### 범위 밖 (명시)
- **이미 append된 설치본은 고치지 않는다.** 그 줄은 live라 `hasLiveMarker`가 일찍 반환한다. 따라서 `exit 0` 뒤의 죽은 줄과 python 훅에 붙은 셸 줄은 `sync` 후에도 남는다.
  사용자 소유 파일에서 줄을 찾아 옮기는 재작성은 오판 위험이 있고 관측 사례도 없다. 수동 조치를 CHANGELOG에 안내한다.
- `migrate.mjs:166`의 `✓ post-commit hook installed`는 skip 때도 출력된다(기존 동작, 설치기가 skip 줄을 따로 찍는다). 이 task에서 손대지 않는다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **블록(block)**: 하네스가 기존 훅 맨 위(shebang 다음)에 넣는 셸 조각이다. 새 훅 파일은 `#!/bin/sh\n` + 블록이다.
- **비-셸 훅**: 첫 줄이 `#!`로 시작하지만 `SH_SHEBANG`(sh·bash·dash·zsh·ksh)에 맞지 않는 훅이다. shebang이 없으면 git이 sh로 실행하므로 셸로 본다.
- **설치됨**: 주석이 아닌 줄에 마커(`harness-team handoff` / `harness-team pr-check`)가 있다(`hasLiveMarker`). 위치는 보지 않는다.
- 게이트 근거: 목표·제약·성공 기준·영향 파일이 위에 모두 명시돼 자가진단 4항목을 통과한다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — post-commit 설치를 pre-push와 같은 맨 위 삽입 + 비-셸 skip 경로로 옮긴다.
- [x] **Constraint 명확도** (30%) — 새 파일은 바이트 동일, export 시그니처 불변, 언어 분기 없음, 기존 append 설치본은 재작성하지 않음.
- [x] **Success 기준** (30%) — 아래 테스트가 실행으로 입증하고 `npm run test`가 green이다.
  - `exit 0` 뒤 훅에서 handoff 실행
  - 비-셸 skip과 올바른 처방
  - shebang 변형·개행 없는 shebang
  - 멱등
- [x] **Context 명확도** (brownfield 한정) — `src/git-hooks.mjs`, `tests/git-hooks.test.mjs`, 호출처 3곳(무변경), CHANGELOG, followups.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 1.0

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
```json
{ "version": 1, "review": "required" }
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- `src/git-hooks.mjs` — `installGitHook`, `SH_SHEBANG`, `PRE_PUSH_BLOCK`(선례, 주석 46–52행)
- `tests/git-hooks.test.mjs` — pre-push 맨 위 삽입·비-셸 skip 테스트(선례)
- `docs/harness-cycle.md` §5 2차 장치 규칙, `docs/decisions.md` D11
- `docs/followups.md` 13번(이 task로 올리며 삭제)

# user-handoff-parallel-conflict — Spec

## 목적 / 요구사항

**문제(사실).** post-commit 훅(`runHandoffAuto`, `src/commands/task.mjs`)은 커밋마다 task 디렉터리 **밖**의
`docs/<user>/<user>-handoff.md`를 `renderUserHandoff`로 **통째로 재작성**한다(Active Task·Last Commit 줄에 커밋
sha·메시지가 들어가 커밋마다 바이트가 바뀐다). #105 이후 이 변경은 "다음 작업 커밋에 함께 stage"된다
(`commands/harness-task.md` post-commit handoff 절). 따라서 같은 user로 D5 병렬 PR 두 개가 열리면 두 브랜치 모두
같은 파일의 같은 줄을 반드시 바꾸고, 먼저 머지된 쪽 뒤로 나머지는 **항상** 충돌한다.

**실측(08-26 이후 3회, 병합 커밋 메시지로 확인).**
- `3323c6f` (08-26) `Conflicts: docs/chad/chad-handoff.md` — AO 워커 브랜치에 main 병합
- `fdcffbc` (08-30) `Conflicts: docs/hslee/hslee-handoff.md` — 기능 브랜치에 main 병합
- `a7c8354` (09-08) `chad-handoff.md` 충돌을 main 쪽으로 해소 — 메시지가 이미 근본 원인을 짚는다:
  "이 파일은 post-commit hook이 생성하는 렌더링 … 활성 task 판정의 정본은 gitignore된 `.harness/active.json`"

**현재 수습.** `docs/ao-worker-rules.md` §2(#112)가 "충돌하면 기본 브랜치 쪽을 취한다"로 운용만 한다.
충돌 자체는 매 병렬 PR마다 남고, AO처럼 워커가 여럿이면 선형으로 늘어난다.

**근본 원인(추론, 아래 근거로 확정).** 이 파일의 내용은 전부 **워크트리 로컬 상태의 파생**이다.
- `Active Task` ← `.harness/active.json`(gitignore, 워크트리마다 다름)
- `Last Commit` ← 그 워크트리의 `git log -1`
- `Full Context` ← task 경로(결정론적)

즉 "브랜치마다 달라야 정상인 값"을 "브랜치 사이에 공유되는 추적 파일"에 쓰고 있다. 머지하면 어느 쪽을 취하든
**다른 워크트리의 사실**이 남는다 — 충돌 해소를 아무리 잘해도 커밋된 값은 머지 직후 이미 틀리다
(현재 main의 `hslee-handoff.md`도 이 워크트리의 활성 task와 무관한 값을 가리킨다).

**영향받는 사용자·시스템.** 같은 user로 병렬 브랜치·워크트리를 쓰는 모든 경로(AO 워커, `claude/*` 브랜치, 소비자
프로젝트의 팀원). 소비자 프로젝트도 이 파일을 커밋하므로 플러그인 사용자 전체가 대상이다.

**기대 결과.** 병렬 PR끼리 user handoff 때문에 충돌하는 일이 **구조적으로 0**이 된다. 세션 진입점 기능
("지금 활성 task가 무엇이고 어디서 이어 읽는가")은 유지된다.

**제약.**
- 런타임 의존성 0, Node ≥24(레포 규칙). 새 의존성 없음.
- 기존 소비자 프로젝트의 커밋된 파일을 **깨뜨리지 않는** 마이그레이션 경로가 있어야 한다(D8 — 전면 덮어쓰기 금지 정신).
- `handoffRelPaths` 단일 정의(훅 제외 집합 = `done` 가드 무시 집합)는 유지한다.
- 버전 범프·릴리스는 범위 밖(ao-worker-rules §5).

### 소비자 전수 조사 (2026-09-27, 이 워크트리 `c87b50d` 기준)

**쓰기 경로 (코드)**
| 위치 | 동작 |
|---|---|
| `src/commands/task.mjs` `runHandoffAuto` | 활성 task가 있으면 커밋마다 활성 형태로 재작성(sweep 커밋은 침묵) |
| `src/commands/task.mjs` `runDone` | 종결 시 1회 종결 형태로 재작성 |
| `src/commands/task.mjs` `renderUserHandoff` | 유일 렌더러(두 형태) |
| `src/task-paths.mjs` `userHandoffRel`·`userHandoffPath` | 경로 정의 |
| `src/commands/task.mjs` `handoffRelPaths` | 훅의 "handoff만 바꾼 커밋" 판정 + `done` 가드 무시 집합 |

**읽기 경로 (코드)** — **없다.** `userHandoffPath`/`userHandoffRel`을 읽는 코드는 테스트뿐이다.
- `session-context`(SessionStart task-gate, Claude·Codex 공통 — D9)는 이 파일이 아니라 `.harness/active.json`
  (`readActive`)과 TCC를 직접 읽는다. 즉 **기계 진입점은 이미 이 파일에 의존하지 않는다.**
- `summary`·`doctor`·`remote-task`·`list`는 task handoff(`<name>-handoff.md`)나 meta만 본다.

**읽기 경로 (규범·문서 — 사람/에이전트가 읽음)**
- `AGENTS.md`·`templates/AGENTS.md.hbs` "세션 시작 시 1. `docs/<user>/<user>-handoff.md` 읽기", 컨텍스트 파일 표,
  "commit 시: post-commit hook이 handoff 2파일 갱신 — 다음 커밋에 담는다"
- `templates/docs/README.md` 디렉터리 트리 설명
- `commands/harness-task.md` post-commit handoff 절, `commands/harness-ship.md` §55(handoff 2파일 동봉)
- `docs/ao-worker-rules.md` §2(충돌 수습)·§7(리뷰 덱 커밋에 handoff 2파일 동봉)
- `docs/index.html` 링크(`chad/chad-handoff.md`, `hslee/hslee-handoff.md`)
- 과거 HTML 스냅샷(`docs/harness-*-0.x.html`)·`CHANGELOG.md` — 이력이므로 갱신 대상 아님
- 외부: `~/.claude` 개인 스킬(session-handoff 등)은 이 파일을 읽지 않는다(별도 경로 `.claude/handoffs/`).

**테스트**
- `tests/user-handoff.test.mjs`(12케이스, 렌더러·종결 형태·done 연동)
- `tests/handoff-hook-churn.test.mjs`(`handoffRelPaths`가 두 경로를 돌려준다·sweep 침묵)
- `tests/done-guard.test.mjs`(rename 제외 판정에 user handoff 경로 사용)
- `tests/fixtures/task-paths-golden/expected.txt`(`handoff updated: docs/tester/tester-handoff.md` 출력·파일 본문)

## 설계 / 접근

### 선택지

**A. 로컬 상태로 강등 — 같은 경로를 유지하되 추적 해제(gitignore) (권장)**
훅·`done`·렌더러는 그대로 두고, `docs/*/*-handoff.md`(깊이 2 한정 — task handoff `docs/u/t/t-handoff.md`는
매치하지 않는다)를 하네스 관리 gitignore 목록(`appendGitignore`의 `harnessNeeded`)에 추가하고, 이미 추적 중인
사본은 1회 `git rm --cached`로 인덱스에서 뺀다. 파일은 정본(`active.json`)과 같은 수명·범위(워크트리 로컬)를 갖게 된다.
- 호환성: 경로·형식 불변 → "세션 시작 시 이 파일을 읽어라" 규범이 그대로 동작. 달라지는 것은 "커밋에 담는다"뿐.
- 소비자 영향: 코드 읽기 소비자 0. 새 워크트리·새 clone에선 첫 커밋 전까지 파일이 없다 — 대신 `task <name>`
  활성화 시점에 활성 형태를 1회 쓰면 공백이 사라진다(오늘도 새 워크트리의 커밋된 사본은 **다른 브랜치의 값**이라 틀리다 —
  없는 편이 틀린 것보다 낫다).
- 잃는 것: 다른 머신·팀원이 git으로 보던 "내 마지막 종결 task" — 이는 생성물 `<user>-task.md`(summary)와
  task meta가 이미 정본으로 담는다.
- 마이그레이션: ① gitignore 줄 추가(init·migrate가 이미 쓰는 경로) ② 추적 해제 1회 — 이 레포는 기본 브랜치에서
  커밋 1개, 소비자는 `migrate`가 안내(또는 수행 — 결정 필요, 아래 open). 전환기 1회 부작용: 아직 파일을 수정한
  구 브랜치를 머지하면 modify/delete 충돌 1회, 새 main을 pull한 워크트리에선 로컬 파일이 한 번 지워졌다가 다음 커밋에 재생성.
- 테스트 부담: 작음 — gitignore 목록 테스트 1, `task` 활성화 시 기록 1, golden fixture 갱신, 기존 12케이스는 불변.

**B. 기본 브랜치 전용 생성물 — summary처럼 기본 브랜치에서만 갱신**
훅이 기본 브랜치가 아니면 user handoff를 쓰지 않는다(`default-branch-primitive` 재사용). 추적은 유지.
- 호환성: 파일은 계속 커밋된다. 하지만 기능 브랜치에서 작업 중인 세션의 진입점이 **main의 낡은 값**을 가리킨다 —
  진입점의 존재 이유(현재 활성 task)가 병렬 작업 중에 정확히 깨진다.
- 기본 브랜치 판정이 모호한 환경(origin 없음·detached·AO `ao/*/root`)에서 판정 불가 처리 규칙이 추가로 필요.
- 병렬 세션이 기본 브랜치에서 동시에 커밋하면 여전히 충돌(드묾).
- 테스트 부담: 중간(브랜치 판정 분기·판정 불가 경로).
- 기각 근거: 충돌은 줄이지만 **내용이 틀린 상태**를 공식화한다.

**C. task 디렉터리로 분할 — user 레벨 파일 폐지, 포인터를 task별 파일로**
`docs/<user>/<task>/`에 이미 `<task>-handoff.md`가 있으므로 user 레벨 포인터를 없애고 "활성 task의 handoff를 읽어라"로
규범을 바꾼다. 병렬 PR은 서로 다른 task 디렉터리를 쓰므로 충돌이 없다.
- 호환성: 규범 변경(AGENTS.md·템플릿·README), 파일 삭제 → 기존 소비자 저장소의 커밋된 사본이 고아가 된다.
- "지금 활성 task가 무엇인가"는 active.json·session-context로만 알 수 있다 — 사실상 D와 같아지고, 분할 자체는
  얻는 것이 없다(task handoff는 이미 분할되어 있다).
- 테스트 부담: 큼(user-handoff 12케이스 재작성·golden).

**D. 파생 뷰로 대체 — 파일 폐지, `harness-team session-context`(또는 `handoff --show`)가 진입점**
기계 진입점은 이미 session-context다(Claude·Codex SessionStart). 파일을 없애고 규범 1단계를 "session-context 출력(자동 주입)"으로 바꾼다.
- 가장 깔끔한 개념(정본 1개, 파생물 0개). 그러나 파일을 직접 열어 보는 사람·Cursor(훅 없음, 규범 의존) 경로가 끊기고,
  AGENTS.md 코어 규범·템플릿·README·렌더러·`done`·테스트를 한꺼번에 바꾸는 큰 변경이다(5-A 게이트 해당).
- 테스트 부담: 큼.

### 권장: A

한 줄 근거: 충돌의 원인은 "워크트리 로컬 파생값을 추적한다"는 것 하나이고, A는 **그것만** 고친다 — 경로·형식·렌더러·
읽는 규범이 모두 그대로라 변경 면적이 가장 작고, 정본(`active.json`)과 수명이 같아져 머지 후 값이 틀리는 문제도 함께 사라진다.
D는 개념적으로 더 깨끗하지만 규범·Cursor 경로를 깨므로, A 적용 후 필요가 드러나면 후속으로 검토한다.

### A의 세부 설계 (결정 후 구현)
1. `appendGitignore`의 `harnessNeeded`에 `docs/*/*-handoff.md` 추가. `DOCS_DIR` 상수에서 조립한다(하드코딩 복제 금지).
2. `task <name>` 활성화(생성·재활성) 시 활성 형태를 1회 쓴다(`commitMsg` 빈 값 허용 — 렌더러 기존 인자). 새 워크트리 공백 해소.
3. 추적 해제: 이 레포는 기본 브랜치에서 `git rm --cached docs/chad/chad-handoff.md docs/hslee/hslee-handoff.md` 커밋 1개.
   소비자는 `migrate`가 추적 중인 user handoff를 감지해 처리(open 참고).
4. `doctor`: 추적 중인 user handoff가 남아 있으면 경고 1줄(전환 누락 탐지).
5. 규범 문구: AGENTS.md(·템플릿) "commit 시 handoff 2파일" → task handoff 1파일 + user handoff는 로컬, harness-task.md
   post-commit 절, harness-ship.md·ao-worker-rules §2·§7의 "2파일" 문구, templates/docs/README.md 주석, docs/index.html 링크 제거.
6. `handoffRelPaths`는 **변경하지 않는다** — 무시 목록에 ignored 경로가 있어도 무해하고, 전환기(아직 추적 중인 저장소)에서
   churn 방지가 계속 필요하다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **user handoff**: `docs/<user>/<user>-handoff.md`. 활성 task 포인터·마지막 커밋·task handoff 경로를 담은 **렌더링**.
  정본이 아니다 — 정본은 `.harness/active.json`(활성), task meta(종결), task handoff(커밋 이력).
- **task handoff**: `docs/<user>/<task>/<task>-handoff.md`. task별 커밋 로그(append). task 디렉터리에 격리되어 병렬 충돌 없음.
- **워크트리 로컬 상태**: 워크트리·clone마다 달라야 정상인 값. gitignore 대상(`active.json`, `config.json`, 그리고 A 채택 시 user handoff).
- **생성물(기본 브랜치 전용)**: 공유되지만 기본 브랜치에서만 갱신하는 추적 파일(`task_summary.md`, `<user>-task.md`). 선택지 B가 user handoff를 여기 넣는 안.
- **게이트 근거**: 문제·원인·소비자·선택지가 코드·커밋으로 확정됐고, 남은 모호성은 선택지 결정 1건과 migrate 수행 방식 1건뿐이다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 병렬 PR 사이 user handoff 충돌을 구조적으로 0으로, 진입점 기능은 유지.
- [ ] **Constraint 명확도** (30%) — 선택지(A/B/C/D)와 소비자 마이그레이션 방식이 사용자 결정 대기.
- [x] **Success 기준** (30%) — 같은 user의 두 브랜치가 각자 커밋 후 머지해도 user handoff 충돌이 없다(e2e 재현 테스트), `npm test`·`docs:check` 통과.
- [x] **Context 명확도** (brownfield 한정) — 쓰기 5곳·읽기 코드 0곳·규범 문서·테스트 4파일 식별(위 전수 조사).
- [ ] **Ambiguity ≤ 0.2** — Constraint 미결로 가중합 0.7. **결정 전 구현 진입 금지.**

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
<!--
```json
{ "version": 1, "review": "required", "tests": "skip" }
```
-->

## 참고
- 정본: `commands/harness-task.md` post-commit handoff 절 · `src/commands/task.mjs` `renderUserHandoff`·`runHandoffAuto`·`runDone`·`handoffRelPaths` · `src/harness.mjs` `appendGitignore` · `AGENTS.md` D4·D5 · `docs/decisions.md` D5·D8
- 충돌 실측: `3323c6f`·`fdcffbc`·`a7c8354` (병합 메시지의 `Conflicts:`)
- 선행 task: `docs/chad/done-user-handoff-freeze`(종결 형태 도입), `docs/chad/handoff-hook-churn`(sweep 침묵), `docs/hslee/handoff-sweep-fold`(#105 다음 커밋 동봉), `docs/chad/d5-parallel-pr-scope`
- (open) 소비자 저장소의 추적 해제를 `migrate`가 **직접 수행**(`git rm --cached`, 인덱스 변경)할지 **안내만** 할지. 권장: 안내 + doctor 경고(인덱스 변경은 사용자 커밋 경계와 겹친다).
- (open) 선택지 결정 — A 권장.

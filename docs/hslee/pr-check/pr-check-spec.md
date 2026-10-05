# pr-check — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

**문제** (cycle §4-6 · §6-4 · D11): 하네스가 강제하는 유일한 것은 "PR에 그 task의 문서(spec·plan·handoff·artifact)를
담는다"이다. 그런데 이를 확인하는 장치가 없다. `done` 가드가 artifact 템플릿 여부를 보지만 `done`은 **머지 뒤** 기본 브랜치에서 돈다(§4-6 순서) —
문서 없는 PR은 이미 머지된 다음이다. ship은 문서를 갱신하지만 "담겼는가"를 결정론적으로 판정하지 않는다.
영향: 하네스를 쓰는 모든 소비자 팀의 PR, 그리고 리뷰어(PR에서 문서를 읽는 사람).

**기대 결과**: 결정론적 CLI 검사 하나(`harness-team pr-check`)가 "이 브랜치가 PR로 담을 task 문서가 갖춰졌는가"를 판정하고,
호출처 셋 — ① ship 준비 보고 ② init이 설치하는 git pre-push 훅 ③ 원하는 팀의 CI — 이 같은 명령을 부른다.

### 요구사항
- **R1 검사 대상 task** — `base...<rev>` diff(기본 rev = `HEAD`)에서 바뀐 경로 중 `docs/<user>/<task>/` 아래에 있고, rev 시점에
  `<task>-{spec,plan,handoff,artifact}.md`·`<task>-meta.json` 중 하나라도 있는 디렉터리를 task로 센다. spec만 마커로 쓰면 spec이 빠진 task가
  검사에서 통째로 빠진다(codex P2, 2026-10-06). 디렉터리를 통째로 지운 변경은 의도된 삭제라 대상이 아니다. `.harness/active.json`은 읽지 않는다 —
  gitignore라 CI·다른 clone에는 없다. 사용자 handoff(`docs/<user>/<user>-handoff.md`)는 깊이가 달라 task로 잡히지 않는다.
- **R2 검사 항목** (task마다, **rev의 git 객체** 기준 — 작업 트리가 아니다):
  1. `spec.md`·`plan.md`·`handoff.md`·`artifact.md`가 있다.
  2. 각각 현재 템플릿(`taskSpecTemplate`·`taskPlanTemplate`·task handoff 템플릿·`taskArtifactTemplate`)과 trim 비교로 같지 않다.
  3. 다이어그램은 **권장**이다(사용자 결정 2026-10-06) — `<task>-diagram.html`도 artifact 생략 기록 줄(`- 다이어그램: 미실행 — <사유>`)도 없으면
     실패가 아니라 안내(`notes`)만 낸다: "로직·구조 변화가 있으면 `/harness-diagram`으로 만들어 커밋".
     처음 설계(필수 + 생략 기록)는 기각: `diagram record --skipped`는 plan 옵트인 단계가 없으면 거부한다(`src/commands/diagram.mjs` closeDiagramStep `missing`)
     — plan에서 옵트인하지 않은 task는 통과할 길이 없었다. 사용자 의도는 "plan에 없어도 최종 변경이 로직·구조를 바꾸면 담는다"이고, 이는 기계 판정이 아니라 권장이다.
     D11·cycle §1·§4-6·§5의 "다이어그램 필수" 문장을 같은 결정으로 고친다.
- **R3 판정과 출력** — 모두 통과면 exit 0, 하나라도 실패면 exit 1. 실패는 task별로 무엇이 빠졌고 어떻게 채우는지(예: `diagram record --skipped`)를 한 줄씩 낸다.
  diff가 비었으면(새 브랜치를 커밋 전에 push) 통과 — 담을 변경이 없다. diff는 있는데 task가 0개면 실패("이 브랜치에 task 문서가 없음").
  `--json`은 기존 observation envelope(`scope`와 같은 형식)로 `{base, checks:[{ref, rev, empty, tasks:[{task, issues, notes}]}]}`를 낸다(pre-push는 ref마다 하나). 읽기 전용이다.
- **R4 base 판정** — `--base <ref>`가 없으면 `review`·`scope`와 **같은 사다리**(`resolveScope`의 diff 경로: origin/HEAD → origin/main → origin/master,
  origin 없으면 로컬 main)를 쓴다. 판정을 복제하지 않는다. 판정 실패는 exit 1 + error packet.
- **R5 pre-push 모드** (`--pre-push`) — git이 stdin으로 주는 `<local ref> <local sha> <remote ref> <remote sha>` 줄마다:
  삭제(local sha가 0)·브랜치가 아닌 ref(태그 등)·**기본 브랜치로의 push**(remote ref 이름 = base의 브랜치 이름)는 건너뛰고,
  나머지는 `base...<local sha>`로 R1–R3을 판정한다. 검사할 브랜치 push가 없으면(빈 stdin — git은 push할 것이 없을 때도 훅을 부른다, 실측) base 판정 없이 통과.
  훅 블록이 기존 훅 맨 위에서 stdin을 먼저 받아 두므로 "앞선 훅이 stdin을 소비한 빈 입력"은 생기지 않는다(R6). 기본 브랜치 판정은 base의 전체 ref 이름으로
  한다(`--base origin/main` 같은 짧은 이름 포함).
  base 판정 실패는 **차단**(exit 1)하고 원인·`git remote set-head origin -a`·`--no-verify`를 알린다(사용자 결정 2026-10-06 — 조용히 통과하면 유일한 강제가 사라진다).
  예외: origin에 브랜치가 하나도 없으면(init 직후 첫 push) 비교할 기본 브랜치가 없고 PR도 열릴 수 없으므로 통과(리뷰 2026-10-06 — 이때는 set-head도 실패한다).
  실패 메시지는 우회 수단 `git push --no-verify`(git 표준)를 한 줄 알린다.
- **R6 훅 설치** — init·sync가 post-commit과 **같은 설치기**(hooks 디렉터리 판정·`core.hooksPath`·worktree·기존 훅에 append·주석 오판 방지)로
  `pre-push`를 설치한다. 기존 훅이 있으면 끝이 아니라 **맨 위**(shebang 다음)에 넣는다 — stdin을 임시 파일로 받아 검사한 뒤 `exec <`로 되돌려 기존 줄이
  같은 입력을 읽게 한다. 뒤에 붙이면 앞선 줄(git-lfs)의 stdin 소비·`exit 0`·실패 rc 덮어쓰기로 검사가 사라지거나 동작이 바뀌었다(codex·새 컨텍스트 리뷰).
  기존 훅이 셸 스크립트가 아니면(python·node shebang) 건드리지 않고 안내한다 — 셸 줄을 넣으면 모든 push가 막힌다.
  훅 본문은 PATH의 `harness-team`이 없거나 `pr-check`를 모르면(구버전) **건너뛴다**(fail-open — 구버전 CLI의 "Unknown command"가
  push를 막지 않게). 이 상태는 doctor가 알린다(R7).
- **R7 doctor** — PATH CLI 검사(`checkHookCli`)가 확인하는 명령 목록에 `pr-check`를 더한다. 구버전 CLI면 기존 경고가 뜬다.
- **R8 ship 연동** — `commands/harness-ship.md`의 준비 완료 보고 전에 `harness-team pr-check --base "$BASE"`를 실행하고 결과를 보고에 싣는다.
  실패면 "준비 완료"를 선언하지 않는다(BLOCKER와 같은 지위). ship은 여전히 문서만 고치고 push·PR을 만들지 않는다.
- **R9 CI** — 같은 명령을 CI에서 부르는 방법(전체 이력 fetch 필요)을 README에 짧게 둔다. 하네스는 CI 설정 파일을 만들지 않는다.

### 제약
- D11: 강제는 이것 하나다. lint·tsc·리뷰는 여기에 넣지 않는다. 훅·CLI에 언어 분기 없음.
- D7: 이 저장소는 자기 훅을 dogfood하지 않는다 — 검증은 테스트와 임시 저장소(bare remote에 실제 `git push`)로 한다.
- 새 의존성 없음. 기존 post-commit 설치 동작·출력은 바뀌지 않는다(회귀 기준: `tests/git-hooks.test.mjs` 무변경 통과).
- 소비자 프로젝트에 init·sync를 실행하지 않는다(migrate-is-pull). 기존 설치본은 사용자가 init·sync를 다시 돌릴 때 pre-push를 받는다 — migrate는 설치하지 않는다
  (post-commit도 migrate 일반 경로에서는 설치하지 않는다).
- 템플릿 훅(`templates/.claude/hooks/*`)은 바꾸지 않는다 — pre-push는 git 훅이고 Claude 훅이 아니다.

### 범위 밖
- **git pre-commit에 커밋 게이트(`gate commit`) 연결** — preset-gates·preset-repo-shape가 이 task로 넘긴 open 항목. 이번에 **하지 않는다**(설계 5, 사용자 결정 2026-10-06).
- 다이어그램 강제·**내용** 판정 — 권장 안내만 낸다. 문서가 템플릿이 아닌지는 보지만 "충분한 내용"인지는 판정하지 않는다.
- `diagram record --skipped`의 plan 옵트인 요구 변경 — 다이어그램이 권장이 되어 필요 없어졌다(생략 기록 줄 머리만 `DIAGRAM_SKIPPED_PREFIX`로 export).
- 위키 컴파일·task 폴더 삭제(§6-7), R1/R2 검토 지점(§6-5).

## 설계 / 접근
1. **신규 `src/commands/pr-check.mjs`** — `collectPrCheck({targetDir, base, rev})`가 순수 판정(`{tasks:[{user, task, issues}], empty}`)을 돌려주고,
   `runPrCheck(ctx)`가 출력·exit code를 맡는다. 파일 내용은 `git show <rev>:<path>`, 존재는 `git cat-file -e`로 읽는다.
   diff 경로는 `git -c core.quotepath=false diff --name-only <base>...<rev>`. 템플릿 함수는 `task.mjs`에서 import한다(handoff 템플릿은 export 추가).
2. **base**: `resolveScope({scope: 'diff', base})`를 그대로 부른다 — `dirty` 분기를 타지 않는 경로라 작업 트리 상태와 무관하다.
3. **pre-push**: stdin 파싱 → ref별로 1을 반복. 기본 브랜치 이름은 base ref(`refs/remotes/origin/main` → `main`)에서 얻는다.
4. **훅 설치기 일반화**: `installPostCommitHook`을 `installGitHook(targetDir, {name, body, marker})` 위의 얇은 래퍼로 두고 `installPrePushHook`을 더한다.
   출력 문구(`post-commit hook: installed` 등)는 이름만 바뀐 같은 형식. 훅 본문:
   ```sh
   # harness: PR 필수 task 문서 검사 (D11) — 우회: git push --no-verify
   if command -v harness-team >/dev/null 2>&1 && harness-team --help </dev/null 2>/dev/null | grep -q '^ *pr-check' \
     && harness_in=$(mktemp "${TMPDIR:-/tmp}/harness-pre-push.XXXXXX"); then
     cat > "$harness_in"
     harness-team pr-check --pre-push < "$harness_in" || { rm -f "$harness_in"; exit 1; }
     exec < "$harness_in"
     rm -f "$harness_in"
   fi
   ```
   `exit 0`을 쓰지 않는다 — 맨 위에 들어가므로 뒤의 기존 줄을 막지 않는다. post-commit 설치는 지금처럼 append다(바뀌지 않음).
5. **2차 장치 규칙 (D11)** — pr-check는 다른 장치를 고치기 위한 것이 아니라 D11의 강제 그 자체를 구현하는 1차 장치다. 그래도 줄이는 안을 검토했다:
   - `done` 가드 재사용: 기각 — `done`은 머지 후에 돈다(§4-6에서 순서 변경 안을 이미 기각). 검사 시점이 PR 이전이어야 한다.
   - ship만으로 확인: 기각 — ship은 에이전트 판단 단계라 결정론이 아니고, ship을 거치지 않은 push를 못 본다(§4-6이 호출처 셋을 정했다).
   - git pre-commit에 게이트 연결(이월 open): **이번에 하지 않는다** — §4-6·D11에서 lint·tsc는 "제공"이다. git 훅에 걸면 Claude 세션 밖의
     모든 커밋자(Codex·Cursor·사람)에게 강제가 된다. 필요한 팀은 `gates.json` 명령을 자기 훅 관리자(husky 등)에 직접 건다.
6. 기각: active task 기준 판정(active.json은 gitignore라 CI에 없다) · 작업 트리 기준 판정(push·CI가 보는 것은 커밋이다) ·
   pre-push에서 판정 불가 시 통과(사용자 결정 — R5) · CI 설정 파일 생성(팀마다 CI가 다르다 — R9 문서로 충분).

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **PR 대상 task**: `base...rev` diff가 건드린 `docs/<user>/<task>/` 중 rev에 `<task>-` 접두 task 문서가 하나라도 있는 것. 한 PR에 여럿일 수 있고 모두 검사한다.
- **템플릿 그대로**: 파일 내용이 현재 CLI의 해당 템플릿 함수 출력과 trim 비교로 같다. 구버전 템플릿으로 만들어 손대지 않은 파일은 통과할 수 있다(알려진 한계).
- **다이어그램 안내**: `<task>-diagram.html`이 rev에 없고 artifact에 생략 기록 줄도 없으면 권장 안내(notes)를 낸다. 차단하지 않고, 내용은 보지 않는다.
- **판정 기준 시점**: rev(기본 `HEAD`, pre-push에서는 push되는 sha)의 커밋 내용. 작업 트리의 미커밋 변경은 보지 않는다.
- **pre-push 건너뜀**: 삭제·태그·기본 브랜치 push, 빈 stdin(push할 것 없음), 빈 원격(첫 push). 그리고 PATH CLI가 없거나 구버전이면 훅 본문 전체.
- **Ambiguity 게이트 통과 (2026-10-06)**: writer 자기 평가 4항목 + 사용자 결정 4건(pre-commit 연결 안 함 · pre-push 판정 불가 차단 · plan 다이어그램 생략 · PR 다이어그램 권장).

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*
*(writer 자기 평가 — open 2건은 사용자 결정으로 닫음, 2026-10-06)*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — 근거: "PR이 담을 task 문서가 갖춰졌는가를 결정론적으로 판정하는 CLI 하나를 ship·pre-push·CI가 부른다"(§4-6).
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — 근거: D7·D11, 무의존성, post-commit 회귀 무변경, migrate 미설치, 범위 밖 3항.
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — 근거: 아래 완료 기준 7항.
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — 근거: 참고 절 영향 파일.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 — 근거: 4항목 체크(가중합 1.0), open 2건 사용자 결정으로 닫음.

### 완료 기준
1. 판정: 4문서 갖춤 → exit 0 / 문서 하나 없음 / 템플릿 그대로(4종 각각) → exit 1 + 해당 사유 / 다이어그램도 생략 기록도 없음 → exit 0 + 권장 안내 — 각각 테스트.
2. 대상: diff가 task 두 개를 건드리면 둘 다 검사 / spec만 빠진 task도 검사 / 통째로 지운 task는 제외 / task 0개 + diff 있음 → 실패 / diff 없음 → 통과 / 사용자 handoff·접두 파일 없는 디렉터리는 task 아님 — 테스트.
3. rev 기준: 작업 트리에서만 채운 문서는 통과시키지 않는다(커밋 내용 기준) — 테스트.
4. pre-push: 기본 브랜치 push·태그·삭제·빈 stdin·빈 원격 첫 push 건너뜀, 피처 브랜치 실패 시 exit 1, 앞선 훅의 stdin 소비·`exit 0`과 무관하게 검사, 기존 훅 실패 rc 보존, 비-셸 훅 미설치 — 테스트. bare remote에 실제 `git push`로 훅이 push를 막고
   `--no-verify`로 통과하는 것을 임시 저장소에서 실측해 artifact에 기록.
5. 훅 설치: 새 설치·기존 훅 append·주석 오판 방지·`core.hooksPath`·CLI 부재/구버전 시 통과 — 테스트. 기존 post-commit 테스트 무변경 통과.
6. doctor: `pr-check`를 모르는 PATH CLI → 기존 경고 — 테스트. ship 문서의 pr-check 단계 — `tests/ship-command.test.mjs` pin.
7. `npm run test`·`npm run docs:check` PASS.

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 소스: `docs/harness-cycle.md` §1·§4-6·§6-4, `docs/decisions.md` D11, 이월: `docs/hslee/preset-gates/preset-gates-spec.md:137`·`docs/hslee/preset-repo-shape/preset-repo-shape-spec.md:172`.
- 영향 파일: 신규 `src/commands/pr-check.mjs` · `bin/harness-team.mjs`(dispatch) · `src/cli-args.mjs`(명령·플래그, sync 요약 문구) · `src/git-hooks.mjs`(설치기 일반화)
  · `src/commands/init.mjs:108`·`src/commands/sync.mjs:9`(pre-push 설치) · `src/commands/doctor.mjs:98`(`checkHookCli`) · `src/commands/task.mjs`(handoff 템플릿 export)
  · `commands/harness-ship.md`·`skills/harness-ship/SKILL.md` · README(CI 사용) · `docs/harness-cycle.md` §1·§2·§4-6·§5 · `docs/decisions.md` D11 · `src/commands/diagram.mjs`(생략 줄 머리 export)
  · 테스트: 신규 `tests/pr-check.test.mjs` · `git-hooks` · `doctor` · `ship-command` · `cli-drift`·`cli-args`(명령 목록 동기화).
- 재사용: `resolveScope`(`src/commands/review.mjs:234`), `listTaskRefs` 마커 규칙(`src/task-paths.mjs:50`), `diagramRecordLine`(`src/commands/diagram.mjs:44`),
  observation envelope(`src/observation.mjs`).
- (결정 2026-10-06) git pre-commit에 `gate commit`을 연결하지 않는다(설계 5). preset-gates·preset-repo-shape의 이월 open을 여기서 닫는다.
- (결정 2026-10-06) pre-push base 판정 실패는 차단 — 반대 근거(훅에서는 `--base`를 줄 수 없다)는 안내 문구(`git remote set-head origin -a`)로 받는다.
- (결정 2026-10-06) plan 다이어그램 단계는 넣지 않는다.
- (결정 2026-10-06) PR 다이어그램은 권장 — plan에 없어도 최종 변경이 로직·구조를 바꾸면 담는다. pr-check는 안내만 낸다(R2-3).

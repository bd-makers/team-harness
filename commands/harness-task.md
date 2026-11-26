---
description: "task 관리 (task/list/done/reopen/clean/handoff) — docs/<user>/<name>/ 구조"
phase: Workflow
argument-hint: '<name> [--area <area>] [--reviewer <profile>] [--no-review-gate] | list [--area <area>] [--remote] | done [--force] | reopen <name> [--reason <text>] | clean [<name>] [--base <ref>] | handoff'
---

`$ARGUMENTS`의 **첫 토큰**으로 분기한다. `list`·`done`·`reopen`·`clean`·`handoff`는 `task`의 인자가 아니라 **별개 하위명령**이다 —
`task done`처럼 넘기면 CLI가 명령 이름이라며 거부한다(exit 1, 아무것도 쓰지 않음) — 그 이름의 task가 이미 있을 때만 활성화된다.
다른 member의 task를 이어서 하려면 `task <name> --member <그 member>` — `--member`는 `.harness/config.json`의 user보다 우선한다.
결정된 user가 `docs/<user>/` 한 세그먼트가 아니면(빈 값·`/`·`\`·선행 `.`·제어문자) `task`는 exit 1로 거부하고 아무것도 쓰지 않는다 —
config를 고치라는 안내를 그대로 사용자에게 전하고, user를 임의로 바꿔 재시도하지 않는다.

```bash
# 첫 토큰이 list | done | reopen | clean | handoff → task 없이 그 하위명령을 그대로 실행
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" list
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" done [--force]
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" reopen <name> [--reason <text>]
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" clean [<name>] [--base <ref>]   # dry-run — --yes 는 아래 절의 승인 뒤에만
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" handoff

# 그 외 → task 생성 또는 활성화 (모노레포 area·리뷰 프로필·검토 게이트는 아래 절)
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" task <name> [--area <area>] [--reviewer <profile>] [--no-review-gate]
```

예시:
- `harness-team task auth-redesign`   # 생성 또는 활성화
- `harness-team list`                 # 전체 task 목록
- `harness-team done`                 # 활성 task 의 done 가드 검증 (추적 파일을 쓰지 않는다 — 종결은 plan 에서 파생, 아래 "종결")
- `harness-team reopen auth-redesign --reason "회귀"`   # 기본 브랜치에서 종결된 task 를 다시 연다 (아래 "재개")
- `harness-team clean`                # 활성 task 를 시작 전 상태로 되돌리기 (dry-run, 아래 절)
- `harness-team task web-next-login --area web-next`   # 모노레포 area task 생성 또는 활성화
- `harness-team list --area web-next`  # 그 area 의 task 만
- `harness-team task auth-redesign --reviewer deep`   # 새 task 의 리뷰 프로필을 spec 에 기록 (생성 때만)
- `harness-team task auth-redesign --no-review-gate`   # 새 task 를 구현 전 사람 검토 단계 없이 생성 (생성 때만)
- `harness-team list --remote`        # + 머지되지 않은 origin 브랜치에만 있는 task

## task 되돌리기 (`clean`)

task 를 시작했는데 방향이 틀렸거나 결과가 마음에 들지 않으면, 기본 브랜치에 머지되기 전에 그 task 를 **시작 전 상태로** 되돌린다.
ship 했지만 MR 이 거절·폐기된 task 도 되돌릴 수 있다.
상태를 남기지 않는다(`dropped` 같은 status 없음) — 코드·task 문서를 시작점으로 되돌리고 활성 포인터를 비우는 것이 전부다.
폴더가 사라진 open task 는 원장에 남지 않고, 같은 이름을 다시 쓸 수 있다.

- **기본은 dry-run** — 시작점, 버릴 커밋, 버릴 미커밋·untracked 변경 목록만 보여 주고 아무것도 쓰지 않는다.
- **`--yes`** — ① 작업 트리 전체(untracked 포함, gitignore 제외)를 `refs/harness/trash/<user>/<task>/<ts>` 커밋으로 백업
  (둘째 부모 = 인덱스, reset 이 덮어쓸 ignored 파일도 포함) ② `git reset --hard <시작점>` 후 백업 시점의 untracked 파일만 지운다
  (`git clean`을 쓰지 않는다 — ignored 파일은 지우지 않는다) ③ `active.json`이 이 task 를 가리키면 비우고
  `<user>-handoff.md`를 "활성 없음"으로 쓴다. 복구 명령·백업 목록 명령을 출력한다.
- **시작점**: `--base <ref>`(그 ref 와의 merge-base) → meta `baseSha`(task 생성 시점 HEAD) → 둘 다 없는 구 task 는 기본 브랜치와의 merge-base.
- **거부(exit 1, 아무것도 쓰지 않음)**: git 이 아님 · 기본 브랜치·detached HEAD · **기본 브랜치에서 종결된** task(원격 추적 기본 브랜치 → 없으면 로컬 `main`/`master` 기준, 머지된 변경은 `git revert`) ·
  재개된 task 에 `--base` 없음 · `baseSha`가 HEAD 의 조상이 아님(rebase 등 — `--base`로 지정) · 시작점 이후 **다른 task 폴더**가 바뀜.
- **원격에는 쓰지 않는다** — push 된 브랜치·열린 MR/PR 은 그대로다. upstream 이 있으면 정리 명령(`git push <remote> --delete <branch>`
  또는 `--force-with-lease`)을 안내만 한다.

**에이전트 규칙 — `--yes`는 사용자가 붙이게 한다.** 에이전트는 먼저 dry-run 을 실행해 그 목록을 사용자에게 그대로 보여 주고,
**그 목록에 대한 명시적 승인**을 받은 뒤에만 `--yes`로 다시 실행한다. "진행해" 같은 일반 승인이나 이전 대화의 승인은
`reset --hard` 승인이 아니다. 목록에 task 와 무관해 보이는 미커밋 변경이 있으면 그 사실을 따로 짚는다 — 백업 ref 가 유일한 복구 경로다.

## 원격 브랜치에만 있는 task (`list --remote`)

`list` 는 체크아웃한 브랜치의 `docs/` 만 본다. 다른 세션·클론이 올린 브랜치에만 있는 task 는 `--remote` 로 본다 —
브랜치를 "머지됨"으로 판단해 지우기 전에 확인한다.

- **fetch 하지 않는다.** 로컬 `refs/remotes/origin/*`(마지막 fetch 기준)만 읽는다. 최신이 필요하면 먼저 `git fetch --prune`
  (`--prune` 없이는 origin 에서 지운 브랜치의 remote-tracking ref 가 남아 계속 보인다).
- origin 기본 브랜치의 조상인 브랜치(머지됨)는 건너뛰고, 로컬 작업 트리나 기본 브랜치에 이미 있는 task 는 빼고 보여 준다.
  task 판정은 로컬과 같다(`docs/<user>/<task>/<task>-spec.md`).
- 출력: 로컬 목록 뒤에 `branch-only (origin, 마지막 fetch 기준):` 절, 줄마다 `  <user>/<task>  (<브랜치>, …)`.
  없으면 `  (none)`. git·origin 이 없거나 git 오류면 `branch-only: 원격 스캔 건너뜀 …` 한 줄이고 exit code 는 그대로다.
- `--area` 와 같이 쓰면 그 브랜치의 `<task>-meta.json` 의 `area` 로 거른다 — meta 가 없으면 area 없음으로 빠진다.

## 모노레포 area (`--area`)

앱·서비스마다 제품·담당·릴리스가 다른 모노레포에서 task 를 앱 단위로 묶는다. **경로는 바꾸지 않는다** —
area 는 `<name>-meta.json` 의 `area` 키에만 기록되고 task 는 여전히 `docs/<user>/<name>/` 에 있다
(설계 근거·3단 경로를 택하지 않은 이유: `docs/spec-monorepo-scope.md`).

- **이름에 접두를 단다:** `task <area>-<이름> --area <area>`. 접두가 없거나 나머지가 비면 거부한다
  (exit 1, 아무것도 쓰지 않음). `<area>` 는 영숫자로 시작하고 영숫자·`_`·`-` 만 — 점은 쓰지 않는다.
- **정본은 `meta.area` 다.** 이름 접두는 사람을 위한 것이다 — `web` 과 `web-next` 처럼 접두가 겹칠 수 있다.
- **기존 task 에 `--area`:**
  - `meta.area` 가 같으면 평소 활성화와 같다.
  - `meta.area` 가 없고 이름이 `<area>-` 로 시작하면 **채택** — meta 에 `area` 만 더하고
    `area adopted: <area>` 를 출력한다. 접두 규약으로 먼저 만든 task 를 옮기는 경로다.
  - 다른 area 가 이미 있으면 거부한다(exit 1). area 는 바꾸지 않는다 — 다른 area 의 일이면 새 task 다.
- **표시:** `list` 는 area 를 가진 task 줄 끝에 `  [area]` 를 붙이고 `list --area <area>` 로 거른다.
  원장(`summary`)은 area 를 가진 task 가 하나라도 있을 때만 `Area` 열을 **맨 뒤에** 추가한다.
  `--area` 를 한 번도 쓰지 않은 저장소의 출력·파일은 종전과 같다.
- **언제 쓰지 않나:** 앱들이 한 제품이면(담당·릴리스가 같으면) area 없이 이름만으로 충분하다.

## task 리뷰 프로필 (`--reviewer`)

엔진을 생략한 `harness-team review`(loop QA 6·7 포함)가 이 task에서 쓸 리뷰어를 정한다 — `.harness/reviewers.json`의
`profiles` 이름 하나(스키마는 harness-review 명령 문서 custom 절). 우선순위는 엔진 인자 > 이 task 프로필 > `default` > probe 체인이다.

- **생성 때만 쓴다.** `task <새 이름> --reviewer <profile>`은 spec `## Done evidence` 바로 아래에 새 블록
  `{ "version": 1, "reviewer": "<profile>" }`을 쓴다. 템플릿의 주석 예시는 벗기지 않는다(벗기면 의도하지 않은 `required`가 켜진다).
  요건 키(`tests`·`review`·`verify`)는 이 블록에 같이 적으면 된다 — `reviewer`는 요건이 아니라 가드 판정을 바꾸지 않는다.
- **프로필은 지금 있어야 한다.** `reviewers.json`에 그 이름이 없거나 파일이 깨졌으면 거부한다(exit 1, 아무것도 쓰지 않음).
- **기존 task에는 거부한다**(exit 1, spec·meta·활성 포인터 모두 그대로). CLI는 사람이 쓴 spec을 고치지 않는다 — 바꾸려면 spec의
  Done evidence JSON에 `"reviewer": "<profile>"`을 손으로 넣거나 고친다. 값은 비어 있지 않은 문자열이어야 하고, 아니면 `done`이
  선언 invalid로 막힌다. 프로필이 실제로 있는지는 `review`가 실행 때 본다.
- **팀 전원이 이 키를 아는 버전이어야 한다.** `reviewer`를 모르는 옛 CLI의 `done`은 `알 수 없는 키`로 막힌다(CHANGELOG).

## 구현 전 사람 검토 게이트 (`--no-review-gate`)

구현에 들어가기 전에 사용자가 spec을 한 번 검토하는 절차가 **기본**이다(사이클 S2 게이트 — `docs/harness-cycle.md` §2).
검토자는 그 task의 user 본인이다.

- **단계** — `task` 출력이 `created:`면 plan `## 단계` **맨 위**에 아래 한 줄이 들어 있고, 출력에 `review gate:` 줄이 붙는다.
  `<user>`는 task의 user(`docs/<user>/`)다. 형식은 CLI가 정본이다(`reviewGateStep`).

  ```markdown
  - [ ] [사람] spec 검토 승인 — <user>
  ```

- **검토용 슬라이드(`brief`)** — 검토를 빠르고 확실하게 하도록, spec을 보여 줄 때 슬라이드를 만들어 경로를 함께 보인다(따로 묻지 않는다):

  ```bash
  node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" brief   # → docs/<user>/<name>/<name>-brief.html (--json 지원)
  ```

  - **무엇을 옮기나** — 활성 task spec의 `## 목적`·`## 범위`·`## 원천 검토`의 `### 발견`·`## 설계`·`## Ontology`(`###` 하위 절마다 한 장),
    열린 항목(목록 항목에 맨 글자로 붙은 `(open…)`·`(unresolved)`·외부 질의 마커), 선언돼 있으면 Done evidence `scenarios`.
    없거나 빈 절은 슬라이드 없이 출력에만 알린다. 렌더할 절이 하나도 없으면 exit 1이고 쓰지 않는다 — 그때 슬라이드 칸은 `없음`이다.
  - **뷰 SVG도 실린다** — `<name>-diagram-<view>.svg`(sequence → module)가 있고 자립성 검사를 통과하면 `## 설계` 슬라이드 뒤에 그림 슬라이드로 싣는다. 없거나 위반이면 빼고 출력(`--json`은 `diagrams`)에만 알린다. 레거시 `<name>-diagram.html`은 싣지 않는다.
  - **새 사실 0** — 에이전트가 슬라이드를 쓰지 않는다. CLI가 spec 글자를 그대로 렌더하므로 슬라이드의 텍스트는 모두 spec에 있다.
    슬라이드가 틀렸으면 **spec을 고치고 다시 생성한다** — 생성물·비-SSOT이고 매번 덮어쓴다.
  - **커밋** — 검토한 시점의 스냅샷이라 task 문서와 함께 커밋한다. 미추적으로 두면 `done`의 미커밋 가드가 막는다 — 커밋하지 않을 거면 지운다.
  - **열람** — 로컬 브라우저로 연다(script 0·외부 자산 0, 한 장씩 스크롤 스냅). Obsidian은 `.html`을 네이티브로 열지 않는다.
- **켜는 조건 — 사용자의 명시적 승인뿐.** 에이전트는 spec(경로와 요지)을 보여 주고 사용자가 **그 spec을** 승인한다고 말한 뒤에만
  `- [x]`로 바꾼다. 다른 작업에 대한 "진행해"·이전 대화의 승인은 이 승인이 아니다. 켤 때 artifact `## 결과`에 그 단계의 증거로 한 줄을 남긴다:

  ```markdown
  - 검토 승인: <YYYY-MM-DD> · 슬라이드 <경로|없음>
  ```

  슬라이드 칸은 위 `brief`로 만들어 보여 준 슬라이드의 경로(`docs/<user>/<name>/<name>-brief.html`), 만들지 못했으면 `없음`이다.
- **승인 전에는 task 문서(`docs/<user>/<name>/`) 밖 파일을 고치지 않는다.** spec·plan을 다듬는 것은 된다 — 그것이 검토 대상이다.
- **강도는 프롬프트 수준이다** — 커밋·쓰기 차단은 없다. SessionStart는 plan 첫 미완 단계로 이 단계를 보여 주고,
  `/harness-loop`는 다음 단계가 `[사람]` 단계면 들어가지 않는다. 끝내 켜지 않으면 `done` 가드가 미완 체크박스로 막는다(늦은 안전망).
- **`[사람]` 단계는 사람이 하는 일의 기록이다** — Dev·루프 오케스트레이터는 구현하지도 켜지도 않는다.
- **빼기** — 생성 시 질문(아래 옵트인 절 1번)에서 **게이트 빼기**를 고르면 방금 만든 plan에서 그 한 줄을 지운다. 사용자가 생성 **전에**
  이미 빼라고 했거나 스크립트로 만들면 `task <새 이름> --no-review-gate`로 처음부터 넣지 않는다(값은 받지 않는다 — `--no-review-gate=false`는 거부).
  plan에 그 줄이 없다는 사실이 곧 옵트아웃이다. 그 밖의 이유로는 지우지 않는다 — plan을 다시 쓸 때도 `## 단계` 맨 위에 둔다.
- **기존 task에는 손대지 않는다** — `activated:`·`reopened:`는 plan을 그대로 두고(소급 없음), 기존 task에 `--no-review-gate`를 주면
  거부한다(exit 1, plan·meta·활성 포인터 모두 그대로). 빼려면 plan의 그 줄을 손으로 지운다.

## spec/plan 다이어그램 옵트인

`task` 출력이 `created:`(신규 생성)일 때만 아래를 **1회** 수행한다. `activated:`(기존 task
재활성화)면 **묻지 않는다** — 계획에 없는 단계를 다시 묻는 것은 계획을 무시하는 것이다.
`reopened:`(종결된 task 의 재개 — plan 에 재개 항목이 붙은 경우, 아래 "재개")도 같다:
옵트인 상태는 plan.md에 그 단계가 있는지로 이미 남아 있고, 재개는 그 계획을 이어받는 것이지
새로 세우는 것이 아니다.

1. **질문** — `AskUserQuestion`으로 한 번만 묻는다(multiSelect, 위 검토 게이트와 **한 질문**): 이 task의 spec/plan 단계에서
   다이어그램을 함께 만들까, 그리고 구현 전 사람 검토를 뺄까? 선택지는 넷이다 — 다이어그램(레거시 한 장) · `sequence`(시간 순 상호작용) ·
   `module`(구성요소·의존 관계) · **게이트 빼기**. 뷰는 복수 선택이다 — 뷰는 옵트인이다. 게이트는 기본이라 "빼기"로 묻는다 —
   아무것도 고르지 않으면 다이어그램 없이 게이트가 남는다. 다시 묻지 않는다. `--no-review-gate`로 만들었으면 게이트 선택지는 뺀다.

2. **"예" → plan에 단계 추가** — `<name>-plan.md`의 `## 단계`에 체크박스를 더한다:

   ```markdown
   - [ ] spec/plan 다이어그램 작성 → docs/<user>/<name>/<name>-diagram.html
   ```

   뷰를 골랐으면 위 한 줄 대신 **고른 뷰마다** 한 줄을 넣는다(뷰 열거의 정본은 CLI `FLAG_CHOICES.view`):

   ```markdown
   - [ ] spec/plan 다이어그램(sequence) 작성 → docs/<user>/<name>/<name>-diagram-sequence.svg
   - [ ] spec/plan 다이어그램(module) 작성 → docs/<user>/<name>/<name>-diagram-module.svg
   ```

   이름 없는 첫 형식이 레거시 뷰이며 계속 유효하다. 레거시 단계와 뷰 단계가 한 plan에 함께 있어도 된다 —
   각 단계는 자기 경로와 자기 기록 호출(6번)로 닫힌다.

   이것이 옵트인의 전부다. 전용 설정 키·상태 파일·doctor 체크를 만들지 않는다 —
   **plan.md가 곧 상태다**(AGENTS.md 세션 시작 프로토콜 2번이 반드시 읽는 파일).

3. **"아니오" → 아무것도 하지 않는다** — plan.md에 그 단계가 없다는 사실이 옵트아웃 상태다.

4. **Preflight(만들 때)** — 다이어그램 스킬(`/diagram-design:diagram-design` 등)은 이 플러그인
   소유가 아니라 별도로 설치되는 외부 플러그인이며 머신마다 설치 상태가 다르다. 사용 가능한지
   먼저 확인하고, 없으면 설치 명령을 단정해 안내하지 말고(`harness-review` 엔진 결정과 같은
   계약) 다이어그램 단계를 건너뛴다. **도구가 없다고 task를 실패시키지 않는다.**

   건너뛸 때 plan의 그 단계는 **지우지 말고** 사유를 붙여 닫는다:

   ```markdown
   - [x] spec/plan 다이어그램 — 미실행(도구 없음)
   ```

   뷰 단계는 뷰 이름을 남긴 채 닫는다: `- [x] spec/plan 다이어그램(sequence) — 미실행(도구 없음)`.

   지우면 옵트인했다는 사실 자체가 사라지고, `- [ ]`로 열어 두면 `harness-team done` 가드가
   "plan.md에 미완 체크박스가 남아 있음"으로 완료를 막는다.

5. **산출물** — `docs/<user>/<name>/<name>-diagram.html`(레거시), 뷰 단계면 뷰마다
   `docs/<user>/<name>/<name>-diagram-<view>.svg` — 파일 하나 = 뷰 하나. 레거시는 자립형 **inline SVG**로 쓴다 —
   `docs/`는 Obsidian 볼트에서 열리고 Obsidian은 script를 제거하므로 mermaid 같은 런타임 JS
   다이어그램은 볼트에서 렌더되지 않는다. 뷰는 **단독 SVG** 하나다 — PR/MR 리뷰어와 Obsidian이 이미지로 보도록
   HTML을 두지 않는다. 스타일은 `<svg>` 안에 두고 외부 자산은 0이다(제약 목록은 `commands/harness-diagram.md` 6번,
   판정은 아래 6번의 `record --view`). 이 파일은 `<name>-meta.json`과 마찬가지로 SSOT 4파일이
   아니다.

6. **기록** — `harness-team diagram record`(건너뛰었으면 `--skipped "<사유>"`)가 `<name>-artifact.md`에
   날짜 한 줄을 남기고 위 4번의 plan 단계를 함께 닫는다. 형식은 CLI가 정본이다. 뷰 단계는
   `--view <view>`를 붙여 뷰마다 기록한다 — 그 뷰의 파일·단계만 다루고, `--view` 없는 호출은 레거시 단계만 닫는다.
   생성 기록이면 `--view`가 SVG 자립성을 검사한다 — 위반이면 exit 1이고 아무것도 쓰지 않는다. 기록하지 않으면 나중에
   "묻지 않은 것"과 "묻고 건너뛴 것"을 구분할 수 없다.

7. **실행은 `/harness-diagram`이 담당한다** — 위 4~6번(probe·degrade·산출물·기록)을 실제로 수행하는
   어댑터가 `commands/harness-diagram.md`다. task 생성 시점 이후 아무 때나 다시 실행해 산출물을
   갱신할 수 있다. 이 문서는 **옵트인 계약**의 정본이고, 그 계약을 실행하는 절차는 그쪽에 있다.

## 원격 done nudge (`task`·`session-context`·`doctor` 공통)

`task <name>`은 생성·활성화 직전에 그 task가 `origin/<default>`(`origin/HEAD` → 없으면 `origin/main`)에서 종결됐는지
한 번 판정한다(아래 "종결"의 판정을 그 커밋의 plan·meta에 적용) — **fetch하지 않는다**(로컬 ref 기준, 마지막 fetch 시점의 main).
원격에서 종결이고 작업 트리가 미종결이면 출력 **첫 줄**에 nudge를 낸다. **막지 않는다** — 다른 클론이 같은 task를 먼저 끝냈는데 이 클론이
모르고 이어가는 사고(2026-09-10, 6커밋 폐기)를 가장 이른 지점에서 알리는 것이 목적이다.

```
[harness] ⚠ task <user>/<name> 는 origin/main 에서 <closedAt> 에 이미 종결됨 — 재개할 것인지 확인. …
created: docs/<user>/<name>/
```

- 판정은 `src/commands/remote-task.mjs` 한 곳이고 `session-context`(SessionStart, breadcrumb·현재 단계 대신 nudge만)와
  `doctor`(`done on main` warning)가 같은 함수를 쓴다.
- **침묵 조건**: 작업 트리도 종결(같은 판정 — `task <name>`의 재개가 처리) · 로컬 `reopenedAt`이 원격 `closedAt`보다 나중(고의 재개).
  따라서 정상 복구 경로는 **main을 가져온 뒤 `task <name>`** — 작업 트리의 plan도 종결이 되고, 다시 열면 `reopenedAt`이 생겨
  다음 세션부터 조용하다. 원격 `closedAt`은 meta에 남은 시각(옛 CLI의 `closedAt`·우회 `forcedAt`)이 없으면 그 task 디렉터리를
  마지막으로 건드린 커밋의 시각이다.
- git이 없거나, 저장소가 아니거나, origin이 없거나, 그 경로에 task가 없으면 조용히 건너뛴다. partial clone(`--filter=blob:none`)도
  마찬가지다 — `GIT_NO_LAZY_FETCH=1`로 암묵 fetch를 막으므로 blob이 없으면 "모른다"(2 s timeout). `--json`이면 envelope 최상위에
  `doneOnMain: { ref, closedAt }` 필드가 붙는다.
- **원장 폴백**: 원격에 그 task의 meta가 없으면(main에서 폴더를 지웠거나 meta 없는 구 task) 같은 커밋의 `docs/task_summary.md`에서
  그 task의 `✅ done` 행을 찾는다 — 재개·clean과 같은 판정이다. `closedAt`은 원격에서 그 task 디렉터리를 마지막으로 건드린 커밋의 시각이다.
  meta 없는 구 task는 작업 트리도 원장·handoff에서 추론한 값으로 판정하므로, 로컬 원장도 닫혀 있으면 조용하다.
  폴더가 지워진 경우에만 `doneOnMain`에 `source: "ledger"`가 붙고 nudge의 복구 안내가 "새 이름으로 이어간다"로 바뀐다 — main을 가져오면 폴더가 지워지고 아래 이름 가드가 그 이름을 거부하기 때문이다.
- **종결된 이름의 재사용**: 로컬 `docs/task_summary.md`에 `<user>/<name>`이 `✅ done`이고 `docs/<user>/<name>/`이 없으면 `task <name>`은
  만들지 않고 exit 1로 멈춘다(다른 이름으로 다시 실행, 원문은 `git log -- docs/<user>/<name>`). 폴더가 있으면 종전대로 다시 연다(`reopened:`).

## post-commit handoff — 추적 파일을 쓰지 않는다

`handoff`(post-commit 훅)는 커밋 **뒤에** `<user>-handoff.md`만 다시 쓴다. 이 파일은 gitignore된 워크트리 로컬 파일이다
(내용이 전부 `.harness/active.json`과 그 워크트리의 `git log -1`에서 나온다. 추적하던 시절엔 같은 user의 병렬 PR이
머지마다 이 파일에서 충돌했다). 그래서 커밋 직후 트리는 깨끗하고, handoff만 담을 커밋이 생기지 않는다.

`<name>-handoff.md`는 사람이나 에이전트가 직접 쓰는 **선택 메모**다. 훅은 쓰지 않고 `pr-check`도 요구하지 않는다.
커밋 이력은 `git log`로 본다. 손으로 고친 내용은 일반 작업 파일이다 — 다른 변경과 함께 커밋하고, 미커밋이면 `done` 가드가 막는다.

`<user>-handoff.md`는 `task <name>` 활성화 때도 한 번 쓴다 — 추적하지 않으므로 새 워크트리·clone에는 없고,
첫 커밋까지 세션 진입점이 비지 않게 하기 위해서다. 아직 이 파일을 **추적 중인** 저장소(gitignore 줄 도입 전)는
무시 줄만으로는 충돌이 남는다 — `doctor`가 경고하고 `migrate`가 `.gitignore` 줄을 보장한 뒤 `git rm --cached` 명령을
**안내만** 한다(인덱스는 건드리지 않는다). 기본 브랜치에서 한 번 실행해 커밋한다.

그런 저장소와 무시 줄이 없는 저장소에서 훅은 이 파일을 쓰지 않는다 — 어떤 설치본에서도 훅은 트리를 더럽히지 않는다. 활성화와
`done`은 진입점이 낡지 않게 여전히 쓰므로, 추적을 풀기 전까지는 그 변경이 트리에 남는다. `done` 가드와 `review`·`scope`의 scope 자동 판정은 user handoff와 task handoff를 dirty에서 뺀다. task handoff 제외는 옛 CLI의 훅이 쓰는 동안만 두는 임시 조치다. scope 판정은 `review`가 쓰는
artifact·meta도 함께 빼지만 가드는 빼지 않는다 — ship 커밋에 담겨야 하는 파일이다(`commands/harness-review.md` 2단계).

## 종결 — ship 시점, 머지가 곧 종결

종결은 **기록이 아니라 계산값**이다. task는 어떤 커밋에서 다음 중 하나면 그 커밋에서 종결이다
(`src/task-closure.mjs` 한 곳 — summary·session-context·wiki·clean·원격 nudge·재개가 같은 판정을 쓴다):

1. `<name>-plan.md`에 줄머리 미완 체크박스(`- [ ]`, 내용 없는 것 포함)가 없고 **체크된 체크박스(`- [x]`)가 하나 이상** 있다 —
   plan이 없거나 비었거나 체크박스가 하나도 없으면 open이다.
2. 유효한 우회 기록 — meta `forcedAt`이 `reopenedAt`보다 나중(또는 재개 이력 없음). `done --force`만 남긴다.
3. 옛 CLI의 meta `status: "done"`(재개 이력 없음, 또는 `closedAt`이 `reopenedAt`보다 나중) — 기존 task 호환.

팀·클론 간의 "이 task는 종결됐는가"는 기본 브랜치(원격 추적 ref, fetch 없음)에서 판정한다. 그래서 **머지가 곧 종결**이고
머지 뒤에 할 일(종결 커밋·종결 MR)이 없다.

**흐름(브랜치에서, MR 생성 전):** 구현 → `/harness-ship`(문서 정합) → plan의 마지막 단계(**"ship 완료"**)를 `- [x]`로 켠다 →
`harness-team done`(가드) → 커밋 → push(pre-push `pr-check`가 가드를 한 번 더 돈다) → MR → 머지 = 종결.
위키 컴파일은 선택이고 머지 뒤 기본 브랜치에서 한다(PR 출처가 머지 커밋에 있다) — 원장 갱신처럼 모아서
`/harness-wiki <user>/<task>`를 돌리고 `summary --write`와 같은 커밋에 담는다(`commands/harness-wiki.md`). 할 때만 머지 뒤 커밋이 생긴다.

- **`done`은 검증 명령이다.** 기존 가드(`collectDoneIssues`)를 돌리고 활성 포인터를 비우고 user handoff(워크트리 로컬)를 쓴다.
  **추적 파일은 쓰지 않는다** — 예외는 `--force`로 실제 issue를 무시할 때 meta에 남는 `forcedAt`·`forcedIssues`(감사 흔적,
  같은 MR에 커밋한다). 옛 절차(머지 뒤 기본 브랜치에서 `done` + 종결 커밋)를 그대로 해도 오류가 아니다 — 결과가 같을 뿐 불필요하다.
- **pre-push 가드**: `pr-check --pre-push`는 이번 push가 건드린 task 중 plan이 전부 체크된 것에 `done` 가드를 같이 돌린다 —
  체크박스만 켜고 `done`을 건너뛰는 경로를 막는다. push 되는 커밋이 HEAD이고 작업 트리가 깨끗할 때만 돌고(아니면 `· done 가드 건너뜀`),
  유효한 우회 기록이면 경고만 낸다. CI·`--pre-push` 없는 실행은 종전대로 문서만 본다. `git push --no-verify`는 허용된 한계다.
  origin 기본 브랜치로의 push는 검사하지 않지만, fork 등 다른 원격의 기본 브랜치로 가는 push(거기서 PR을 연다)는 검사한다.
- **여러 MR에 걸친 task**: 이후 단계를 **미리 plan에 적어 둔다**(`- [ ]`로 남김) — 그래야 중간 MR 머지가 종결로 판정되지 않는다.
  "하지 않은 단계를 미리 켜지 않는다"와 같은 선상의 규칙이다.
- **리뷰 수정 라운드**(머지 전 같은 브랜치): reopen하지 않는다. `task <name>`은 기본 브랜치에서 종결되지 않은 task를 activate만 한다 —
  고친 뒤 다시 ship 한다. 마지막 단계는 이미 켜져 있으니 가드만 다시 돌리면 된다.
- **원장**(`docs/task_summary.md`)은 종결 절차에서 빠졌다. 렌더는 위 판정을 따르고, 갱신은 기본 브랜치에서 필요할 때
  `harness-team summary --write`(이 저장소는 릴리스 때). 머지마다 원장이 낡으므로 CI에서 `summary --check`로 막지 않는다.
  원장 파일(`docs/task_summary.md`·`docs/<user>/<user>-task.md`)만 바꾼 브랜치는 `pr-check`가 `✓ … 생성물 원장만 변경`으로 통과시킨다
  (`--json`은 `checks[].ledgerOnly: true`) — 기본 브랜치가 보호된 저장소는 그 브랜치로 PR을 연다. 위키 컴파일 결과처럼 다른 파일이 섞이면
  종전대로 task 문서를 요구한다(`task ledger-only-pr-check`).

`done` 가드는 미커밋 변경을 막지만, 활성 task의 plan.md 변경이 **줄머리 체크박스를 켠 것뿐**이면 세지 않는다
(`isCheckboxOnlyChange` — HEAD의 plan과 index·작업 트리를 **둘 다** 줄 단위로 대조한다. 끄기·줄 추가·산문 수정은
종전대로 막는다. 하네스를 저장소 하위 디렉터리에 설치해도 같다 — git 경로와 `--show-prefix`로 맞춰 대조한다).
그래서 마지막 단계 체크 → `done` → 커밋 순서가 가능하다. 단계를 켜는 판단은 여전히 에이전트 몫이다 — ship이 끝나기 전에 켜지 않는다.

## 재개 (`task <name>` · `reopen <name>`)

머지 뒤 문제가 생기면 다시 열어 새 브랜치·MR로 고친다. **재개는 기본 브랜치에서 종결됐고 작업 트리에서도 아직 종결일 때만** 일어난다 —
기본 브랜치만 보면 재개 브랜치에서 `task <name>`을 칠 때마다 또 재개하고(기본 브랜치는 재개 MR이 머지될 때까지 종결이다),
작업 트리만 보면 리뷰 수정 라운드를 재개로 오인한다. 기본 브랜치의 종결이 마지막 재개(`reopenedAt`)보다 앞이면 이미 다시 연 옛 종결이라
재개하지 않는다(재개 → 재개 항목 체크 → 머지 전 수정 라운드는 activate만). 기본 브랜치는 원격 추적 ref, origin이 없으면 로컬 `main`/`master`,
둘 다 없으면 작업 트리로 판정한다(clean과 같은 해석 — origin 없는 저장소의 기본 브랜치가 `develop` 등 다른 이름이면 작업 트리로 떨어진다).
`clean`도 같은 비교를 쓴다 — 재개 MR이 머지되기 전의 재개 task는 "기본 브랜치에서 종결"로 거부하지 않고 `--base`를 요구한다.

- **전이**: meta에 `reopenedAt`(새 판정 창의 시작)을 쓰고 옛 `status`·`closedAt`을 풀고, plan `## 단계` 끝에
  `- [ ] 재개: <사유>`를 넣는다(사유 미지정 시 `(사유 미기재)`) — 이 미완 항목이 종결 판정을 open으로 되돌린다. 출력은 `reopened:`.
- **`reopen <name> [--reason <text>]`**: 같은 전이를 하되 종결된 task에만 동작한다 — 종결되지 않았거나 없는 task면 아무것도 쓰지 않고 exit 1.
  `task <name>`도 같은 조건에서 재개한다(사유는 기본 문구).
- **재개 전 `git fetch`** — 판정은 마지막 fetch 시점의 기본 브랜치다. fetch하지 않은 클론은 머지를 몰라 activate로 떨어진다.
- 재개 항목을 끝내면(고침 → ship → 체크) 평소처럼 머지가 다시 종결이다.

## `<name>-meta.json`과 판정 창

`<name>-meta.json`은 harness가 소유하는 **기계 상태**다(`created`·`firstActivatedAt`·`reopenedAt`·`forcedAt`·`forcedIssues`·`reviews`,
그리고 git 저장소에서 만든 task 의 `baseSha`. `status`·`closedAt`은 옛 CLI의 `done`이 쓰던 값으로, 새 CLI는 읽기만 하고 재개 때 푼다). SSOT 4파일에 포함되지 않으며 **손으로
고치지 않는다** — `done` 가드가 증거를 찾는 판정 창의 시작점과, `verify: required`가 세는 리뷰 증거
(`reviews[]`, `harness-team review`가 성공한 실행마다 append)가 여기 있기 때문이다. `reviews` 키가
없는 구 task는 종전대로 artifact 마커로 판정한다 — 상세는 harness-review 명령 문서 5단계.
구 task를 CLI 소유로 옮기는 **유일한 인가 경로**는 `harness-team migrate --adopt-reviews`다 — 잃는
증거를 세어 보여주고 확인을 받은 뒤 CLI가 키를 넣는다. 손으로 `"reviews": []`를 넣지 않는다.

- **판정 창 = `reopenedAt || firstActivatedAt`** (처음 유효한 값). 창을 통째로 버리면 마커 신선도·
  커밋·테스트 시각 가드가 전부 꺼지는 fail-open이 된다.
- **`firstActivatedAt`은 생성 시 1회만** 기록되고 재활성화가 밀지 않는다. 이 값과 `switchedAt`이
  갈라지는 순간이 done 가드 오탐의 원인이었다.

### 완료 상태의 만료

완료는 시간이 아니라 **전이**로 만료된다 — 위 "재개". 재개가 남긴 `reopenedAt`이 **새 판정 창의 시작**이 되고,
plan의 재개 항목이 종결 판정을 open으로 되돌린다. 새 라운드의 완료는 새 증거로 판정해야 하기 때문이다.

- **열린 task 사이의 평범한 재활성화는 meta를 건드리지 않는다** — 거기까지 쓰면 판정 창이 흔들린다.
- **종결된 task는 SessionStart 재개 후보에서 빠진다.** 후보 판정은 위 종결 판정을 쓴다 — 열린 체크박스만 보던 탓에
  `done --force`로 닫은 task가 영구히 후보로 떴다.
- `meta.json`이 없는 구 task는 원장·handoff에서 추론한 값으로 판정하고, 재개 때 그 값을 굳혀 만료시키되 알 수 없는
  `firstActivatedAt`은 지어내지 않는다(구 task는 시각 가드를 건너뛴다). 기본 브랜치에도 meta가 없으면 그 커밋의 원장 `✅ done` 행이 종결 기록이다.

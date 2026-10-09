# wiki-compile — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

**문제** (interview — 원천 `docs/harness-cycle.md` §4-4): 지식이 task 단위로만 쌓인다. 이 저장소만 해도 task 폴더가
100개가 넘고, "이 기능(모듈)은 지금 어떻게 생겼고 왜 그런가"에 답하려면 관련 task의 spec·plan·artifact를 모두 찾아 읽어야 한다.
영향받는 사람은 팀원(원래 니즈 1: 누가 무엇을 바꿨나)과 그 지식을 조회하는 LLM·RAG다.

**기대 결과** (interview): 머지된 task의 결정·바뀐 모듈·학습을 **기능·모듈 단위 위키 항목**으로 컴파일하는 선택형 단계를 제공한다(D11 "제공").
위키 항목은 PR 번호·커밋·작성자를 출처로 남긴다.

**요구**
- R-1 (interview, §4-4) 위키는 저장소 최상위 `wiki/`에 둔다 — `docs/`와 섞지 않는다. 루트 경로는 고정이다(설정 키 없음).
- R-2 (interview, §4-4) 항목의 출처는 task 경로가 아니라 **PR 번호와 커밋**이다. 작성자도 남긴다 — 작성자는 task meta의 `user`다(F2 결정).
- R-3 (interview, §4-4·D5) 컴파일은 기본 브랜치에서, 머지 후 종결 절차의 `done` 다음에 실행한다. 선택 단계다.
- R-4 (interview, §4-4·D11) 위키 분류 체계를 코드에 박지 않는다. 프로젝트의 `wiki/90_system/` 작성 규칙을 따르고,
  분류하지 못한 것은 `wiki/99_inbox/`로 보낸다. 규칙 문서가 없으면 전부 `wiki/99_inbox/`로 보낸다(F1 결정).
- R-5 (interview, §6 C1) **추가만 한다.** task 폴더 삭제, summary·`done`·handoff 입력 이전은 C2 범위다 —
  기존 명령의 동작과 실행 결과는 바뀌지 않는다(명령 목록 `--help`·생성 문서 `docs/harness-overview.html`에 행이 추가되는 것은 제외).
- R-6 (interview) 같은 task를 다시 컴파일해도 위키에 중복 단락이 생기지 않는다(멱등). 재컴파일은 명시 요청일 때만, 그 단락만 교체한다.
- R-7 (interview, D11 2차 장치 규칙) 새 장치를 넣기 전에 기존 장치를 빼거나 줄이는 안을 검토하고 기각 사유를 아래 설계 절에 남긴다.

**제약**
- 런타임 의존성 0 유지, `gh`·네트워크 의존 없음(PR 번호는 git 이력에서 얻는다). Node ≥ 24.
- 버전 범프·매니페스트 버전 수정은 범위 밖(릴리스 몫). 명령 목록 등록(`.claude-plugin/plugin.json` `commands`)은 #134 선례대로 범위 안.
- C2(호환성 파괴)는 범위 밖. R1 `10_ssot/`(원천 문서 자리)와의 겹침도 범위 밖(Q6 — 이월).

**위험 (사람이 수용)**
- 컴파일은 종결 커밋(기본 브랜치 직접 커밋)에 담기므로 **LLM이 쓴 위키 본문이 PR 리뷰 없이 main에 들어간다.** 2026-10-07 사람이 수용했다(묶음 인터뷰 4번 — 실행 시점).
  완화: 단락마다 출처 마커(PR·커밋)가 있어 원문 대조가 가능하고, 스킬은 task 문서에 없는 내용을 지어내지 않는다는 규칙을 명령 문서에 둔다.

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- (cycle) docs/harness-cycle.md §4-4 · §5 · §6
- (decision) docs/decisions.md D5 · D11
- (brief) 오케스트레이터 브리프 c1-wiki-compile-brief.md — 사람이 준 원 브리프(열린 질문 6개 포함)

### 발견
- F1 위키 파일 모양 충돌 — §4-4 본문·§4-2b는 `wiki/<area>.md`(area = workspace 이름, 평면 파일)라 하고,
  §4-4 메인테이너 입력(2026-10-06)은 번호 폴더(`10_ssot/`…`99_inbox/`) + `90_system/` 규칙을 따른다고 한다.
  → 결정(2026-10-07, 사람): 규칙 문서가 정한다. 규칙 문서가 없으면 전부 `wiki/99_inbox/`. `<area>.md`는 규칙이 고를 수 있는 한 모양일 뿐 기본값이 아니다.
- F2 "작성자"의 정의 누락 — §4-4는 "작성자·PR 기록"이라고만 한다.
  → 결정(2026-10-07, 사람): task meta의 `user`(하네스 멤버 이름). meta가 없으면 task 경로의 user.
- 참고(충돌 아님): §4-4의 "task 폴더는 삭제한다"와 §6 C1 "추가만"은 C1 → C2 순서로 나눠져 양립한다.
- 검토 완료: 2026-10-07 — 결정 반영 후 재대조, 새 발견 없음

## 설계 / 접근

**형태 (Q1 결정)**: §4-3과 같은 "스킬 + 얇은 CLI".
- 스킬 `/harness-wiki` (`commands/harness-wiki.md` + Codex 래퍼 `skills/harness-wiki/SKILL.md`): LLM이 task 문서(spec·plan·artifact)를 읽고
  `wiki/90_system/` 규칙에 따라 어느 항목에 무엇을 넣을지 판단해 쓴다. 출처 마커는 CLI가 준 문자열을 그대로 쓴다.
- CLI `harness-team wiki sources [<user>/<task>] [--pr <N>]` (읽기 전용, 결정론, 인수 없으면 활성 task):
  - `docs`: task 문서 경로(spec·plan·artifact, 있는 것만)
  - `task_status`: meta의 `status`(없으면 `unknown`) — JSON envelope 의 `status`와 겹치지 않게 이름을 달리한다
  - `provenance`: `{ pr, commit, author }` — 아래 추론
  - `marker`: `<!-- harness:wiki task=<user>/<task> pr=<N> commit=<sha7> author=<user> at=<YYYY-MM-DD> -->` — 막힘이 있으면 `null`
  - `compiled`: 같은 `task=` 마커가 있는 `wiki/**/*.md` 경로(펜스 코드 블록 안은 세지 않는다)
  - `rules`: `wiki/90_system/**/*.md` 경로 목록(비면 → inbox)
  - `blockers`: `not-done`(meta status가 done이 아님) · `no-pr`(PR 번호를 못 찾음) · `no-commit`(task 디렉터리가 이 브랜치 이력에 없음) · `shallow-history`(얕은 클론 — 들여온 커밋을 확정할 수 없음, R3 후속 P2-a를 사람 승인으로 반영)
  - 파일을 하나도 쓰지 않는다. task를 찾지 못하면 exit 1, 그 밖에는 exit 0(판단은 스킬 몫).
- 출처 추론: `git log --first-parent --reverse HEAD -- docs/<user>/<task>`의 첫 커밋 = task 디렉터리를 그 브랜치에 들여온 커밋.
  머지 커밋(merge-commit 병합)이나 squash 커밋이 여기 온다. 제목의 `Merge pull request #N`(GitHub 기본 머지) 또는 `(#N)`(GitHub squash·이 저장소 관례)
  → 없으면 본문의 `See merge request …!N`(GitLab).
  못 찾으면(rebase·fast-forward 병합, 관례 밖 메시지) `pr: null` + `no-pr`. `--pr <N>`이 주어지면 그 값을 쓰고 커밋은 그대로 추론한다.
  한계: 한 task가 PR 여러 개에 걸치면 첫 PR이 출처가 된다(C1 범위에서 수용 — 나중 PR은 `--pr`로 재컴파일).
  검증: 이 저장소 origin/main에서 default-loop-skill → `32aedaf (#134)`, r2-scenario-evidence → `a9c3859 (#133)`, empty-doc-guard → `bd8faff (#129)`.

**멱등 (Q4 결정)**: 컴파일 단락 첫 줄에 CLI의 `marker`를 둔다. 키는 `task=`다 — PR 번호를 `--pr`로 늦게 준 경우에도 같은 task면 같은 단락이다.
`compiled`가 비어 있지 않으면 스킬은 멈춘다. 사용자가 재컴파일을 명시하면 그 마커가 연 단락(다음 `harness:wiki` 마커 또는 다음 같은 수준 이상의 제목 전까지)만 교체한다.
문법은 `harness:rule`·`harness:review`와 같은 key=value HTML 주석이다.

**기본 브랜치 확인**: CLI는 브랜치를 검사하지 않는다(읽기 전용 정보 명령). 명령 문서가 기본 브랜치가 아니면 멈추고 묻게 한다 —
위키 본문까지 PR 리뷰를 받으려고 PR 브랜치에서 돌리는 것은 사람의 명시 지시가 있을 때만이다(이 task의 dogfood가 그 경우, artifact 기록).

**실행 시점 (Q2 결정)**: 머지 후 종결 절차 — 기본 브랜치에서 `task <name>` → `done` → **(선택) `/harness-wiki <user>/<task>`** → `summary --write` → 종결 커밋 하나.
`done`이 활성 task를 비우므로 이 자리에서는 대상을 명시한다(R3 P2 반영).
`commands/harness-task.md` 머지 후 종결 절에 선택 한 줄만 더하고 `done`·`summary` 코드는 바꾸지 않는다.

**설정 자리 (Q3 결정)**: `wiki/90_system/` 안 프로젝트 문서만. `.harness/config.json` 키는 만들지 않는다 — 사용자별 gitignore라 팀원마다 분류가 갈린다(`gates.json` 정정과 같은 이유).

**2차 장치 검토 (R-7)** — 새 장치를 넣기 전에 검토한 "빼거나 줄이는" 안:
- (a) **`harness-team rules promote`를 넓혀 위키로도 승격** — 기각: promote는 사용자가 고른 Learnings 한 항목을
  `.claude/rules`로 복사하는 결정론 동작이고 위키 컴파일은 LLM 판단(분류·병합)이다. 한 명령에 두 성격을 섞으면 promote의 계약이 흐려진다.
  유래 마커 문법은 재사용한다.
- (b) **`summary --write`가 위키도 렌더** — 기각: summary는 결정론적 원장 렌더이고 바이트 대조(`--check`)를 보장한다.
  LLM 산출물을 섞으면 `--check`가 성립하지 않고 R-5(기존 명령 동작 불변)를 깬다.
- (c) **CLI 없이 스킬만** — 기각(Q1): 출처 추론·마커 검색이 프롬프트 안 git 명령이 되어 테스트할 수 없고, C2가 같은 출처 정보를 다시 필요로 한다.
- (d) **artifact Learnings를 줄이고 위키에 바로 쓰기** — 기각: artifact는 PR 필수 4문서(D11 강제)의 하나라 줄일 수 없다.

**dogfood (Q5 결정)**: 이 저장소에 `wiki/index.md` + `wiki/90_system/compile-rules.md`(최소 규칙)를 커밋하고
`default-loop-skill`(#134)·`r2-scenario-evidence`(#133)를 컴파일한다. 두 번째 실행이 `compiled`로 멈추는 것까지 artifact에 기록한다.

**R1 `10_ssot/` (Q6 결정)**: 이월 — 아래 참고의 `(open → …)`.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **위키 항목(wiki entry)**: `wiki/` 아래 기능·모듈 단위 마크다운 파일. 여러 task의 컴파일 단락이 쌓인다. 파일 위치는 프로젝트 규칙이 정한다.
- **컴파일 단락**: 한 task(=한 PR)에서 온 내용 묶음. 첫 줄에 `harness:wiki` 마커가 붙는다. 멱등과 재컴파일 교체의 단위다.
- **출처(provenance)**: PR 번호 · task 디렉터리를 기본 브랜치에 들여온 커밋(머지 또는 squash) · 작성자(task meta의 `user`). task 경로는 출처가 아니다(C2에서 사라진다).
- **작성 규칙**: `wiki/90_system/` 아래 프로젝트 문서. 분류 체계·항목 템플릿·AI 편집 지침. 하네스 코드에는 없다.
- **inbox**: `wiki/99_inbox/` — 규칙으로 분류하지 못했거나 규칙 문서가 없을 때의 자리.
- **게이트 통과 (2026-10-07)**: 인터뷰 9문항 답(전부 권장) 반영 후 채점 5차원 pass, R1 검토 완료, 열린 질문은 `(open → C2 이후 별도 task)` 하나로 이월.
- **막힘(blocker)**: 컴파일을 시작하면 안 되는 결정론적 상태 — `not-done`·`no-pr`·`no-commit`·`shallow-history`. 이미 컴파일됨(`compiled`)은 막힘이 아니라 재컴파일 여부를 묻는 신호다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — 근거: 문제(task 단위로만 쌓임) + 기대 결과(PR 출처를 가진 기능·모듈 위키 항목 컴파일)가 한 문장씩 있다.
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — 근거: 제약 절(의존성 0·gh 없음·C2/10_ssot 범위 밖) + R-5 "기존 명령의 동작과 실행 결과는 바뀌지 않는다" + 위험 절.
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — 근거: Done evidence S1–S10(테스트 이름·명령에 묶인 시나리오) + dogfood 두 번째 실행 `compiled` 기록.
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — 근거: `bin/harness-team.mjs` 디스패치, `src/cli-args.mjs` 명령표, `src/commands/summary.mjs`(meta 읽기), `src/commands/rules.mjs`(마커 문법), `.claude-plugin/plugin.json`, `commands/harness-task.md` 종결 절.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 — 근거: 채점표 Goal·Constraint·Success·Context·Ontology 모두 pass(가중합 1.0).

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
```json
{
  "version": 1,
  "review": "required",
  "scenarios": [
    {
      "id": "S1",
      "given": "meta status가 done이고 meta user(kim)가 경로 user(chad)와 다른 task 디렉터리가 세 저장소에 각각 'merge: x (#12)'(이 저장소 관례) · 'Merge pull request #12 from org/x'(GitHub 기본 머지) · 'x (#12)'(GitHub squash) 커밋으로 들어왔다",
      "when": "wiki sources <user>/<task> --json 을 실행한다",
      "then": "세 경우 모두 provenance가 pr=12 · 들여온 커밋의 sha7 · author=meta user(kim)이고, marker가 그 값으로 정확히 렌더되며 blockers가 비어 있다",
      "test": "wiki sources: infers PR, merge commit and author from first-parent history",
      "cmd": "node --test --test-name-pattern=\"wiki sources: infers PR\" tests/wiki.test.mjs"
    },
    {
      "id": "S2",
      "given": "들여온 커밋의 제목에 (#N)이 없고 본문에 'See merge request group/proj!7'이 있다",
      "when": "wiki sources 를 실행한다",
      "then": "pr=7 이다",
      "test": "wiki sources: reads a GitLab merge request number from the commit body",
      "cmd": "node --test --test-name-pattern=\"wiki sources: reads a GitLab\" tests/wiki.test.mjs"
    },
    {
      "id": "S3",
      "given": "들여온 커밋 메시지에 PR 번호가 없다",
      "when": "wiki sources 를 --pr 없이, 그다음 --pr 9 로 실행한다",
      "then": "첫 실행은 pr=null · blockers 없음 · marker가 pr= 없는 커밋 출처(2026-10-09 정정 — 아래 참고), 두 번째는 pr=9 · marker에 pr=9",
      "test": "wiki sources: --pr overrides the commit-only provenance",
      "cmd": "node --test --test-name-pattern=\"wiki sources: --pr overrides the commit-only provenance\" tests/wiki.test.mjs"
    },
    {
      "id": "S4",
      "given": "meta status가 open인 task",
      "when": "wiki sources 를 실행한다",
      "then": "blockers에 not-done이 있고 marker=null 이다",
      "test": "wiki sources: a task that is not done is blocked",
      "cmd": "node --test --test-name-pattern=\"wiki sources: a task that is not done\" tests/wiki.test.mjs"
    },
    {
      "id": "S5",
      "given": "wiki/ 아래 한 파일에 task=<user>/<task> 마커가 있고, 다른 파일에는 같은 마커가 펜스 코드 블록 안에만, 또 다른 파일에는 task=<user>/<task>-v2 마커가 있다",
      "when": "wiki sources 를 실행한다",
      "then": "compiled에 첫 파일만 있다 — 펜스 안 예시와 이름이 접두로 겹치는 task는 세지 않는다",
      "test": "wiki sources: reports where the task is already compiled, ignoring fenced examples",
      "cmd": "node --test --test-name-pattern=\"wiki sources: reports where\" tests/wiki.test.mjs"
    },
    {
      "id": "S6",
      "given": "wiki/90_system/ 이 없는 저장소와 있는 저장소",
      "when": "wiki sources 를 실행한다",
      "then": "없으면 rules=[]이고 사람용 출력이 wiki/99_inbox/ 를 안내하며, 있으면 rules에 그 아래 .md 경로가 있다",
      "test": "wiki sources: without wiki/90_system rules everything goes to 99_inbox",
      "cmd": "node --test --test-name-pattern=\"wiki sources: without wiki/90_system\" tests/wiki.test.mjs"
    },
    {
      "id": "S7",
      "given": "커밋이 깨끗한 저장소에 wiki/ 가 있다",
      "when": "wiki sources 를 실행한다",
      "then": "git status가 그대로 깨끗하고, summary 렌더 결과(stdout)가 wiki/ 유무와 무관하게 같다",
      "test": "wiki sources: is read-only and summary ignores wiki/",
      "cmd": "node --test --test-name-pattern=\"wiki sources: is read-only\" tests/wiki.test.mjs"
    },
    {
      "id": "S8",
      "given": "commands/harness-wiki.md",
      "when": "절차와 멈춤 계약을 읽는다",
      "then": "기본 브랜치·done 다음에 돌고(기본 브랜치가 아니면 멈추고 묻는다), blockers가 있거나 compiled면 멈추며, 마커는 CLI 문자열 그대로, 규칙 없으면 99_inbox, task 문서에 없는 내용을 쓰지 않고, push하지 않는다",
      "test": "wiki command: the compile contract stops on blockers and compiled, and never pushes",
      "cmd": "node --test --test-name-pattern=\"wiki command: the compile contract\" tests/wiki-command.test.mjs"
    },
    {
      "id": "S9",
      "given": "commands/harness-wiki.md가 추가됐다",
      "when": "manifest-sync 테스트를 돌린다",
      "then": "plugin.json 등록과 Codex 래퍼(skills/harness-wiki/SKILL.md)가 양방향으로 맞는다",
      "test": "manifest-sync: Claude harness commands have Codex command-equivalent skills",
      "cmd": "node --test --test-name-pattern=\"manifest-sync\" tests/manifest-sync.test.mjs"
    },
    {
      "id": "S11",
      "given": "task가 머지된 저장소를 --depth 1 로 얕게 클론했다",
      "when": "얕은 클론에서 wiki sources 를 실행한다",
      "then": "blockers에 shallow-history가 있고 marker=null 이며, 같은 저장소의 전체 이력에서는 막히지 않는다",
      "test": "wiki sources: a shallow clone is blocked instead of guessing provenance",
      "cmd": "node --test --test-name-pattern=\"wiki sources: a shallow clone\" tests/wiki.test.mjs"
    },
    {
      "id": "S10",
      "given": "이 저장소의 wiki/ (dogfood)",
      "when": "wiki sources 를 chad/default-loop-skill 과 chad/r2-scenario-evidence 에 실행한다",
      "then": "각각 pr=134·133으로 추론되고 compiled가 비어 있지 않다",
      "test": "wiki dogfood: this repository compiled #134 and #133",
      "cmd": "node --test --test-name-pattern=\"wiki dogfood\" tests/wiki.test.mjs"
    }
  ]
}
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 인터뷰: 2026-10-07 비대화형 묶음 인터뷰 9문항(R1 발견 2 · 열린 질문 6 · 복잡도 게이트 1), 사람 답 "전부 권장"(1–8 권장안, 9 범위 승인). 질문 파일은 PR 전에 제거했고 결정은 이 spec에 반영돼 있다.
- 선례: `commands/harness-loop.md` + `skills/harness-loop/SKILL.md` + `tests/loop-command.test.mjs`(#134, 스킬 + 기존 CLI)
- 마커 문법 선례: `src/commands/rules.mjs` `ruleMarker`·`parseRuleMarker`
- 기본 브랜치 판정: `src/git-default-branch.mjs`, `src/commands/summary.mjs` `defaultBranchCandidates`
- (정정 2026-10-09, task `hslee/wiki-commit-provenance`) Done evidence S3의 증거 테스트가 바뀌어 옛 `cmd`가 0개 테스트를 골라 공허한 exit 0을 냈다 — `--pr` 경로를 검증하는 새 테스트로 증거를 옮겼다. S3 Then의 첫 실행(원래 `no-pr` 막힘)은 그 task가 커밋 출처로 대체했으므로 Then도 현재 동작으로 고쳤고, 새 테스트가 두 실행을 모두 단언한다.
- (open → C2 이후 별도 task) R1 원천 문서 자리 `wiki/10_ssot/`와 위키 컴파일의 겹침 — C1 입력은 머지된 task 문서뿐이다.

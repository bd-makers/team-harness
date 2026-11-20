# team-harness-explainer-deck — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- `679641e`(11-10, 로컬 `fix/handoff-no-sweep`에만 있던 커밋)를 cherry-pick해 온보딩 덱 `docs/team-harness-explainer.html`을 올렸다.
- 0.55.0 이후 틀린 사실을 고쳤다: 브랜드 v0.58.1, meta.json 설명, 사이클 장표 S2(검토 게이트)·S7(pre-push done 가드)·S8(머지 = 종결, done은 push 전, retro는 done 전), 명령 순서(brief 추가, done → 커밋 → push), notes의 종결 순서·SessionStart 설명. 장표 구성과 렌더 코드는 그대로다.
- 검증(HEAD 기준 재실행):
  - 브라우저 렌더: `{"count":15,"overflow":[],"fresh":true}` — 15장, 사이클 장표 숨은 로직 상자 9개에 넘치는 줄 없음, 명령 장표 14줄 모두 보임(스크린샷 확인).
  - `npm run -s docs:check` → `harness overview 생성 상태가 최신입니다.`
  - `node scripts/test-isolated.mjs --test tests/docs-*.test.mjs` → `ℹ pass 81 · ℹ fail 0`
  - `npm test` → `ℹ tests 1465 · ℹ pass 1464 · ℹ fail 0 · ℹ skipped 1`, exit 0 (리뷰 반영 전 HEAD `b992660`)
- 후속(범위 밖): `docs/harness-task-guide.html`이 0.58.0 이전 종결 흐름(머지 뒤 `done` + 종결 커밋)을 가르친다.
- 같은 세션에서 로컬 브랜치 5개를 지웠다 — 백업 ref `refs/backup/2026-11-20/*`.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-20T10:22:11.342Z — codex (harness-team review)

- engine: codex · model: default · scope: diff · base: refs/remotes/origin/main · mergeBase: 62aeacad051fc622f528b2e5ccc2cb24adbf00bd · tip: b9926606e4ce2c72e0e4ba6f9e796b8436c61de6 · exit 0 · 3645 B

```text
## P1 · 머지 차단

- **`docs/team-harness-explainer.html:562`** — 명령 장표와 발표자 노트(548행) 모두 `done` 뒤 커밋을 빠뜨렸습니다. 그대로 따르면 마지막 `ship 완료` 체크가 로컬에만 남아 PR을 머지해도 task가 열린 상태입니다. `commands/harness-task.md:275–276`, `AGENTS.md:120–122`, `CHANGELOG.md:36`.
- **`docs/chad/team-harness-explainer-deck/team-harness-explainer-deck-artifact.md:5`** — artifact가 빈 템플릿 상태여서 현재 HEAD의 `pr-check`가 실제로 실패합니다.

## P2 · 수정 권장

- **`docs/team-harness-explainer.html:555`** — `brief`는 슬라이드만 생성합니다. 승인 단계는 신규 task 생성 시 기본으로 추가되며, plan 작성 후 사용자가 spec을 명시적으로 승인하면 체크하고 artifact에 증거를 남겨야 합니다. `commands/harness-task.md:105–145`, `CHANGELOG.md:74–87`.
- **`docs/team-harness-explainer.html:530`** — pre-push의 `done` 가드는 변경된 task의 plan이 모두 체크됐고, push 대상이 HEAD이며, 작업 트리가 깨끗할 때 적용됩니다. 장표와 명령 예시(562행)는 매번 실행되는 것으로 설명합니다. `commands/harness-task.md:283–287`, `CHANGELOG.md:37`.
- **`docs/team-harness-explainer.html:454`** — `review: required`는 일반 R3 외의 리뷰 증거도 인정하며, `verify: required`만 선언한 경우에도 해당 프레이밍의 검증 증거가 필요합니다. `commands/harness-review.md:142–148`, `src/commands/task.mjs:1151–1182`.
- **`docs/team-harness-explainer.html:540`** — 종결·지식화 상자에 배치한 `/harness-retro`는 활성 task가 필요하므로 `done` 전에 실행해야 합니다. `CHANGELOG.md:116`, `commands/harness-retro.md:12`.
- **`docs/team-harness-explainer.html:568`** — SessionStart는 선택지를 안내하고, 첫 실질 작업 프롬프트에서 에이전트가 질문합니다. `task 없이 진행`은 파일 변경 없는 질문·탐색·리뷰에만 허용됩니다. `AGENTS.md:97–101`, `CHANGELOG.md:130`.
- **`docs/team-harness-explainer.html:586`** — 첫 실습 자료로 안내하는 가이드가 머지 뒤 `done`을 실행하고 종결 커밋을 만들라고 가르칩니다. `docs/harness-task-guide.html:739`, `commands/harness-task.md:272–282`.

## P3 · 사소한 정정

- **`docs/team-harness-explainer.html:428`** — PR 문서 3종 규칙에 생성물 원장만 바뀐 diff의 예외가 빠져 있습니다. `commands/harness-task.md:291–295`, `CHANGELOG.md:52`.
- **`docs/team-harness-explainer.html:483`** — `(unresolved)`·`(open)`과 함께 0.57.0에서 추가한 `(ask:…)`·`(asked:…)`·`(answered …)`도 통과를 막는다고 명시해야 합니다. `CHANGELOG.md:91–94`.
- **`docs/team-harness-explainer.html:485`** — `Ambiguity ≤ 0.2`는 통과 선언 문구입니다. 실제 판정은 적용되는 차원이 모두 `pass`이고 열린 질문이 정리됐는지 확인합니다. `commands/harness-interview.md:14–19`, `commands/harness-interview.md:36–38`.

`git status`와 `git diff`로 `refs/remotes/origin/main` 대비 추가된 6개 파일을 확인했고, 덱 15장과 발표자 노트를 지정된 근거 문서에 대조했습니다. `git diff --check`, 오버뷰 최신성 검사, 읽기 전용 문서 테스트 68건은 통과했습니다. 파일 변경은 없으며 브라우저 레이아웃은 검증하지 않았습니다.

**최종 판정 — 머지 보류.** 온보딩 명령 순서에 종결 커밋을 복원하고, 결과와 검증 증거를 artifact에 기록해 `pr-check`를 통과시켜야 합니다.
```

<!-- harness:review kind=codex scope=diff tip=b9926606e4ce2c72e0e4ba6f9e796b8436c61de6 at=2026-11-20T10:22:11.342Z -->

판별(작성 세션, 정본 대조):
- P1 `done` 뒤 커밋 누락 — **진짜.** `commands/harness-task.md` 종결 흐름은 "체크 → done → 커밋 → push"다. 명령 장표에 `git commit` 줄을 넣고 notes의 종결 순서에도 넣었다.
- P1 artifact 빈 템플릿 → pr-check 실패 — **진짜지만 덱 결함이 아니다.** 이 기록과 `## 결과`로 채웠다.
- P2 `brief` 줄이 승인과 생성을 섞음 — **진짜(표현).** "spec 검토 슬라이드 → 사람이 승인하면 plan 첫 단계 [사람] 체크"로 바꿨다.
- P2 pre-push done 가드가 늘 도는 것처럼 적힘 — **진짜.** 장표와 명령 줄에 "plan 전부 [x]면"을 붙였다.
- P2 retro를 done 뒤 상자에 둠 — **진짜.** retro는 활성 task가 필요하다(done이 포인터를 비운다). 상자에 "(done 전)"을, notes에 순서를 적었다.
- P2 SessionStart가 직접 묻는 것처럼 적힘 — **진짜(표현).** 훅은 알리고 에이전트가 첫 작업 프롬프트에서 묻는다. task 없이 진행의 허용 범위도 적었다.
- P3 R1 미해결 마커에 `ask` 계열 누락 — **진짜.** "unresolved·open·ask"로 넓혔다.
- P2 `review: required` 설명이 `verify: required`를 빼먹음 — 덱이 0.54.0 전부터 쓰던 단순화이고 틀린 말은 아니다. 범위 밖이라 두었다.
- P3 원장 전용 diff 예외·`Ambiguity ≤ 0.2` 표현 — 온보딩 덱의 단순화다. 두었다.
- P2 `docs/harness-task-guide.html`이 머지 뒤 `done`과 종결 커밋을 가르침 — **진짜, 범위 밖.** 덱이 "더 보기"로 가리키는 가이드라 후속으로 보고한다.

## Learnings

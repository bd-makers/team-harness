# wiki-compile — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- spec 게이트(2026-10-07): R1 원천 검토와 채점은 오케스트레이터 지시대로 비대화형 묶음 인터뷰(`questions-2.md`, 9문항: R1 발견 2 · 열린 질문 6 · 복잡도 게이트 1)로 수행했다. 사람 답은 "전부 권장"(1–8 권장안, 9 범위 승인)이고, 그 답을 반영한 뒤 채점 5차원이 pass였다. `/harness-interview`를 대화형으로 한 문항씩 돌리지 않은 것은 AO 워커가 `AskUserQuestion`을 쓸 수 없기 때문이다.
- 다이어그램 옵트인: 2026-10-07 사람 답 "아니오" — plan에 단계 없음.
- 구현(2026-10-07, 수단 main — AO 워커는 서브에이전트를 쓰지 않는다): 1단계 `wiki sources` CLI(b3ca5c1) · 2–3단계 `/harness-wiki` 명령·Codex 래퍼·종결 절 선택 한 줄(8272059).
  - 무엇·왜: 출처 추론·마커·멱등 검색을 결정론 CLI로 내리고 분류·작성만 스킬에 남겼다(Q1). 조언 반영 — GitHub 기본 머지 제목(`Merge pull request #N`)을 첫 순위로 읽고, `task=` 값은 정확 일치로만 센다(`x`가 `x-v2`에 걸리지 않게), JSON 출력의 task 상태 키는 envelope `status`를 덮지 않게 `task_status`로 했다.
- dogfood 컴파일(2026-10-07, 4단계): `/harness-wiki` 절차대로 수행.
  - 1회차: `wiki sources chad/r2-scenario-evidence` → PR #133 · a9c3859 · chad, blockers 없음, rules 없음 → 규칙 `wiki/90_system/compile-rules.md`를 먼저 쓰고(사람 승인 Q5) 규칙대로 `wiki/20_domain/review-gates.md`에 컴파일. `chad/default-loop-skill` → PR #134 · 32aedaf · chad → `wiki/20_domain/default-loop.md`. inbox로 보낸 단락 없음.
  - 2회차(멱등 확인): 두 task 모두 `compiled: wiki/20_domain/review-gates.md` / `wiki/20_domain/default-loop.md` → 절차 4번에 따라 멈춤.
- 검증(2026-10-07, 5단계): `npm test` → tests 1198 · pass 1197 · fail 0 · skipped 1, perf 1/1 pass. `npm run docs:check` → 최신. `node bin/harness-team.mjs scenario check` → `scenario: pass (10 checked)`, exit 0.
  시나리오별 이름이 찍힌 실행 출력(R2 E1 근거 — 0건 매치에도 exit 0이므로 이름 줄이 증거다):

  ```text
  S1 $ node --test --test-name-pattern="wiki sources: infers PR" tests/wiki.test.mjs
      ✔ wiki sources: infers PR, merge commit and author from first-parent history   (ℹ pass 1 · fail 0)
  S2 $ node --test --test-name-pattern="wiki sources: reads a GitLab" tests/wiki.test.mjs
      ✔ wiki sources: reads a GitLab merge request number from the commit body   (ℹ pass 1 · fail 0)
  S3 $ node --test --test-name-pattern="wiki sources: no PR number" tests/wiki.test.mjs
      ✔ wiki sources: no PR number blocks until --pr is given   (ℹ pass 1 · fail 0)
  S4 $ node --test --test-name-pattern="wiki sources: a task that is not done" tests/wiki.test.mjs
      ✔ wiki sources: a task that is not done is blocked   (ℹ pass 1 · fail 0)
  S5 $ node --test --test-name-pattern="wiki sources: reports where" tests/wiki.test.mjs
      ✔ wiki sources: reports where the task is already compiled, ignoring fenced examples   (ℹ pass 1 · fail 0)
  S6 $ node --test --test-name-pattern="wiki sources: without wiki/90_system" tests/wiki.test.mjs
      ✔ wiki sources: without wiki/90_system rules everything goes to 99_inbox   (ℹ pass 1 · fail 0)
  S7 $ node --test --test-name-pattern="wiki sources: is read-only" tests/wiki.test.mjs
      ✔ wiki sources: is read-only and summary ignores wiki/   (ℹ pass 1 · fail 0)
  S8 $ node --test --test-name-pattern="wiki command: the compile contract" tests/wiki-command.test.mjs
      ✔ wiki command: the compile contract stops on blockers and compiled, and never pushes   (ℹ pass 1 · fail 0)
  S9 $ node --test --test-name-pattern="manifest-sync" tests/manifest-sync.test.mjs
      ✔ manifest-sync: Claude harness commands have Codex command-equivalent skills   (ℹ pass 9 · fail 0)
  S10 $ node --test --test-name-pattern="wiki dogfood" tests/wiki.test.mjs
      ✔ wiki dogfood: this repository compiled #134 and #133   (ℹ pass 1 · fail 0)
  ```
- dogfood 예외: 명령 계약은 "기본 브랜치에서 실행"이지만, 이 task의 dogfood 컴파일(#134·#133)은 위키 본문까지 PR 리뷰를 받도록 PR 브랜치에서 돌린다 — 사람이 승인한 Q5(dogfood 결과를 이 PR에 커밋)의 귀결이다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-10-07T06:13:08.381Z — codex-scenario (harness-team review)

- engine: codex · scope: diff · tip: 88e2ba51d1616df2b156c5188e3610d32d05fd1e · exit 0 · 2281 B

```text
- **E1 · 각 시나리오의 증거가 Then을 실제로 검증한다 · BLOCKER · fail**
  
  **S1의 `author=meta user`를 깨뜨리는 변이를 잡지 못합니다.** [테스트 fixture](/Users/chadonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-43/tests/wiki.test.mjs:42)는 meta user를 `'chad'`로 고정하고, [호출·assertion](/Users/chadonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-43/tests/wiki.test.mjs:67)도 경로 user와 기대 author를 모두 `'chad'`로 둡니다. 따라서 [구현](/Users/chadonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-43/src/commands/wiki.mjs:131)을 `const author = user`로 바꿔 meta를 무시해도 S1의 provenance·marker assertion은 통과합니다. 이는 코드 대조에 따른 변이 분석이며, 파일을 변경해 실행하지는 않았습니다.
  
  [artifact](/Users/chadonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-43/docs/chad/wiki-compile/wiki-compile-artifact.md:18)에 S1 실행 이름은 있지만, 이 검증 공백을 해소하지는 않습니다. 경로 user와 meta user가 다른 fixture가 필요합니다. S2–S10은 Then에 대응하는 assertion과 실행 이름을 확인했습니다. S9의 등록 대조 테스트도 직접 실행해 `✔ manifest-sync: commands/*.md ⟺ plugin.json commands`를 확인했습니다.

- **E2 · spec 밖 동작이 diff에 없다 · MAJOR · pass**
  
  `refs/remotes/origin/main` 대비 diff에서 동작 변경은 wiki CLI·인자·라우터 추가, 명령·래퍼 등록, 선택형 종결 단계로 한정됩니다. 각각 spec 설계와 R-1–R-6에 대응합니다. 기존 `done`·`summary`·handoff 구현은 변경되지 않았으며, wiki 규칙·두 항목은 명시된 dogfood 범위입니다. PR 브랜치에서 dogfood를 수행한 예외도 [artifact](/Users/chadonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-43/docs/chad/wiki-compile/wiki-compile-artifact.md:39)에 사유가 기록되어 있습니다.

**최종 판정: fail — 전체 fail 목록: E1(S1 작성자 출처 검증 공백).** 파일은 수정하지 않았으며, 기계 행은 재판정하지 않았습니다.
```

<!-- harness:review kind=codex-scenario scope=diff tip=88e2ba51d1616df2b156c5188e3610d32d05fd1e at=2026-10-07T06:13:08.381Z -->

- 판별(2026-10-07): E1 **진짜 결함** — S1 fixture의 meta user와 경로 user가 둘 다 `chad`라 `const author = user` 변이가 통과한다. 재현: 그 변이를 넣고 S1을 돌려 fail을 확인, 원복.
  조치: fixture에 `metaUser`를 두고 S1 세 경우 모두 meta user `kim` ≠ 경로 user `chad`로 바꿨다. 변이 재실행 → `✖ wiki sources: infers PR…`(잡힘), 원복 후 `✔`. spec S1 given/then에 kim을 명시. E2 pass — 조치 없음.

### 2026-10-07T06:15:49.723Z — codex-scenario (harness-team review)

- engine: codex · scope: diff · tip: 17ed4ac6e115f677caafd09d58e8a4eaf7f85fd6 · exit 0 · 2879 B

```text
- **E1 · 각 시나리오의 증거가 Then을 실제로 검증한다 · BLOCKER · pass**

  S1–S10의 assertion과 이름이 찍힌 [실행 기록](/Users/chadonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-43/docs/chad/wiki-compile/wiki-compile-artifact.md:18)을 대조했습니다.
  
  S1은 현재 `metaUser: 'kim'`과 경로 `chad`를 구분하고 provenance·마커를 독립 기대값으로 검증합니다. 따라서 `author = user` 변이는 실패합니다([테스트](/Users/chadonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-43/tests/wiki.test.mjs:65)). 해당 변이의 실패·원복 후 통과도 [기록](/Users/chadonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-43/docs/chad/wiki-compile/wiki-compile-artifact.md:65)되어 있습니다.

  S2–S7은 PR 번호, blocker·마커, compiled 정확 일치·펜스 제외, 규칙 목록·inbox 안내, 깨끗한 git status·summary 동일성을 각각 assert합니다([테스트](/Users/chadonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-43/tests/wiki.test.mjs:84)). S8은 계약 문단 전체를 비교하며([테스트](/Users/chadonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-43/tests/wiki-command.test.mjs:44)), S9는 등록 양방향 대조와 래퍼 연결을 검증합니다([테스트](/Users/chadonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-43/tests/manifest-sync.test.mjs:106)). S10은 두 PR 번호와 compiled 경로를 assert합니다([테스트](/Users/chadonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-43/tests/wiki.test.mjs:196)).
  
  S8·S9·S10은 직접 재실행하여 해당 테스트 이름의 `✔` 출력도 확인했습니다. S1–S7은 임시 파일을 생성하므로 기록된 출력과 코드로 판정했습니다.

- **E2 · spec 밖 동작이 diff에 없다 · MAJOR · pass**

  `refs/remotes/origin/main` 대비 동작 변경은 wiki CLI·라우팅·인자 추가, 명령·래퍼 등록, 선택형 종결 단계입니다. 모두 spec 설계·R-1–R-6에 대응합니다. 기존 `done`·`summary`·handoff 구현 변경은 없습니다. [종결 절 diff](/Users/chadonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-43/commands/harness-task.md:178)는 선택 단계만 추가합니다. 위키 규칙과 두 항목은 명시된 dogfood 범위이며, PR 브랜치 실행 예외도 [사유가 기록](/Users/chadonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-43/docs/chad/wiki-compile/wiki-compile-artifact.md:39)되어 있습니다.

파일은 수정하지 않았고 기계 행은 재판정하지 않았습니다.

**최종 판정: pass — 전체 fail 목록: 없음.**
```

<!-- harness:review kind=codex-scenario scope=diff tip=17ed4ac6e115f677caafd09d58e8a4eaf7f85fd6 at=2026-10-07T06:15:49.723Z -->

- 판별(2026-10-07): E1·E2 pass — 조치 없음. R2 통과.

## Learnings

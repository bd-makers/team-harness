# wiki-fence-nested — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- 수정: `src/commands/wiki.mjs` `wikiMarkersIn` — 인용 깊이(`>` 반복)를 세고 목록 표지를 같은 너비 공백으로 바꿔
  펜스를 컨테이너 기준으로 판정. 여는 펜스는 가장 최근 목록 항목 내용 열에서 3칸 이내만, 닫는 펜스는 같은 인용 깊이 ·
  들여쓰기 ≤ 여는 컨테이너 내용 열 + 3(R3 P2 반영). 목록 표지도 내용 열 3칸 이내만, 표지 뒤 5칸 이상 공백은 들여쓴 코드.
  목록 내용 열보다 내어 쓴 줄은 그 안의 펜스를 끝낸다(R3 재검 P2 반영). 인용이 얕아지면 그 안의 펜스는 끝난다. 다이어그램: 옵트아웃(사람 결정 — 작은 버그).
- 재현(수정 전): 새 테스트가 `actual: [ 'wiki/90_system/rules.md' ], expected: []`로 실패 — 인용문·목록 안 예시 마커를 `compiled`로 셈.
- 검증 출력(최종 — 재검 P2 반영 후 tip, 2026-10-07):

```text
$ node --test --test-name-pattern="(inside blockquotes and list items|ignoring fenced examples)" tests/wiki.test.mjs
✔ wiki sources: reports where the task is already compiled, ignoring fenced examples (170.394667ms)
✔ wiki sources: fenced examples inside blockquotes and list items are not compiled markers (180.281084ms)
ℹ tests 2
ℹ pass 2

$ node --test tests/wiki.test.mjs        # 기존 wiki 테스트 포함 10건
ℹ tests 10
ℹ pass 10
ℹ fail 0

$ npm test
ℹ tests 1200
ℹ pass 1199
ℹ fail 0
ℹ skipped 1                               # 기존 CI 전용 skip: "CI에서는 jq-present 매트릭스가 반드시 실행된다"
✔ boundary performance: steady-state cold-process check <3x and plan checkpoint <5x an equal-work baseline for 10 x 10KiB local contracts (919.221875ms)
ℹ tests 1
ℹ pass 1

$ npm run docs:check
harness overview 생성 상태가 최신입니다.

$ node bin/harness-team.mjs scenario check
scenario: pass (2 checked)
```

- 범위 밖(의도적): 지연 연속 줄, 탭 열 계산, 인용문 안 목록의 세부 규칙, P3(공백만 있는 줄).

- 다이어그램: 옵트아웃(사람 결정 — 작은 버그, 브리프) — plan에 단계 없음, ship 6번 생략.
- ship(2026-10-07): `scope --json`은 `worktree`(post-commit 훅이 다시 쓴 handoff만 dirty)라, 정합 검증은 커밋된 변경을 보도록
  `--scope diff --base refs/remotes/origin/main`으로 돌린다.
- 남은 리스크: 재검 뒤 반영(d61a5b6 — 목록 내어쓰기·표지 뒤 5칸)은 외부 리뷰를 거치지 않았다(재검 1회 한도). 차등 스윕과
  테스트 단언으로만 검증했다. 탭 들여쓰기·지연 연속 줄·인용문 안 목록 세부는 근사 판정이다(범위 밖).
- 후속: 없음(P3 공백만 있는 줄은 원 task 범위 밖으로 이미 남겨 둠).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-10-07T07:17:15.396Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 6f9498e8845e6b4abf9473057f38893b75ec2ca7 · exit 0 · 370 B

```text
No significant findings (P1/P2/P3).

The working tree contains only 11 added lines in `docs/chad/wiki-fence-nested/wiki-fence-nested-handoff.md`, recording a commit summary. No staged or source-code changes are present. `git diff --check` passed.

**Final verdict: PASS for the working-tree changes.** The already committed implementation was outside this review scope.
```

<!-- harness:review kind=codex scope=worktree tip=6f9498e8845e6b4abf9473057f38893b75ec2ca7 at=2026-10-07T07:17:15.396Z -->

- 판별(2026-10-07): **무효 — 리뷰 대상 오류.** post-commit 훅이 handoff를 갱신해 트리가 dirty였고, scope가 `worktree`로
  잡혀 커밋된 수정(6f9498e)을 보지 않았다. 판정에 쓰지 않는다. 트리를 정리하고 `--base refs/remotes/origin/main` diff
  scope로 R3를 다시 실행한다(재검 횟수에 세지 않는다 — 수정을 본 첫 리뷰가 R3다).

### 2026-10-07T07:19:59.676Z — codex (harness-team review)

- engine: codex · scope: diff · tip: 82f7cbd73e1d81c8c95e7999fb85ff0cbb84757c · exit 0 · 750 B

```text
- **P2 should-fix — `src/commands/wiki.mjs:81`:** Unrestricted list-prefix width treats indented code such as `"    - ~~~"` as an opening fence, swallowing subsequent real markers and allowing duplicate compilation. [CommonMark](https://spec.commonmark.org/0.31.2/#list-items)
- **P2 should-fix — `src/commands/wiki.mjs:72`:** `fence.indent + 3` accepts a four-space closing fence after a one-space opener, exposing example markers as compiled and blocking valid compilation. [CommonMark](https://spec.commonmark.org/0.31.2/#fenced-code-blocks)

Both regressions reproduced; `origin/main` handles these cases correctly. Read-only smoke checks and `git diff --check` passed. No files modified.

**Final verdict: REQUEST CHANGES.** No P1 findings.
```

<!-- harness:review kind=codex scope=diff tip=82f7cbd73e1d81c8c95e7999fb85ff0cbb84757c at=2026-10-07T07:19:59.676Z -->

- 판별(2026-10-07): P1 없음. P2 두 건 모두 **유효** — 재현 결과 82f7cbd는 origin/main보다 나빴다.
  - P2-1(`    - ~~~`): 목록 표지의 들여쓰기를 제한하지 않아 맨 위 들여쓴 코드를 목록+펜스로 봤다 → 뒤의 실제 마커를 삼킴
    (82f7cbd `[]`). 조치: 표지는 현재 내용 열에서 3칸 이내일 때만 목록 항목으로 본다 → `['a/c']`.
  - P2-2(` ``` ` 뒤 4칸 ```` ``` ````): 닫는 펜스 들여쓰기를 여는 펜스 +3으로 재서 내용 줄이 펜스를 닫았다 → 예시 마커를 셈
    (82f7cbd `['a/b']`). 조치: 펜스에 여는 컨테이너의 내용 열을 저장하고, 닫는 펜스는 그 열에서 3칸 이내만 → `[]`.
  - 두 경우를 S2 테스트에 단언으로 추가. 수정 후 `node --test tests/wiki.test.mjs` 10/10, `npm test` 1199 pass·0 fail·1 skip(기존),
    perf 1/1, `docs:check` 최신, `scenario check` 2/2. 재검 1회를 돌린다.

### 2026-10-07T07:23:36.549Z — codex (harness-team review)

- engine: codex · scope: diff · tip: 107766d509b093f849db819cfcf69294b662e4ce · exit 0 · 803 B

````text
- **P2 should-fix — `src/commands/wiki.mjs:73`:** A dedented fence after `- ``` ` incorrectly closes the list fence instead of opening a top-level fence, exposing example markers and hiding subsequent real markers. [CommonMark](https://spec.commonmark.org/0.31.2/#fenced-code-blocks)
- **P2 should-fix — `src/commands/wiki.mjs:83`:** Consuming all list padding makes `-     ~~~` open a fence despite being indented code, swallowing subsequent real markers and allowing duplicate compilation. [CommonMark](https://spec.commonmark.org/0.31.2/#list-items)

Both regressions reproduced; `origin/main` handles these inputs correctly. Syntax checks and `git diff --check` passed. Fixture tests were not run because they write files. No files modified.

**Final verdict: REQUEST CHANGES.** No P1 findings.
````

<!-- harness:review kind=codex scope=diff tip=107766d509b093f849db819cfcf69294b662e4ce at=2026-10-07T07:23:36.549Z -->

- 판별(2026-10-07, 재검): P1 없음 → **R3 통과**(종료 기준: P1 없으면 통과). P2 두 건 모두 **유효** — 107766d 재현 결과
  origin/main보다 나빴다(`- ``` / x / ``` / 예시 / ``` / 실제` → `['a/b']`, `-     ~~~ / 실제` → `[]`).
  - 둘 다 이 PR이 만든 회귀이고 CommonMark 규칙으로 결정되는 작은 수정이라 **반영했다**: (1) 같은 인용 깊이에서 목록 내용 열보다
    내어 쓴 비어 있지 않은 줄은 목록 항목과 그 안의 펜스를 끝내고, 그 줄은 펜스 밖 줄로 다시 판정한다. (2) 표지 뒤 공백이 5칸 이상이면
    내용 열은 표지 + 1칸이다. 두 경우를 S2 테스트에 단언으로 추가 → 둘 다 `['a/c']`(main과 같음).
  - 재검은 한 번까지라 **세 번째 외부 리뷰는 돌리지 않았다** — 이 마지막 반영은 외부 검증을 거치지 않았다(보고에 명시).
  - 대신 차등 스윕(scratchpad, 커밋 안 함): 펜스·목록·인용 줄 18종으로 만든 3·4줄 문서 22,374개를 origin/main과 비교 → 차이 277건.
    main보다 **실제 마커를 덜 세는**(재컴파일 쪽) 5건은 모두 `<목록 펜스 열고 닫음> / 맨 위 ``` (닫히지 않음) / 마커` 꼴 —
    CommonMark에서 닫히지 않은 펜스는 문서 끝까지 가므로 새 동작이 맞고 main이 목록 펜스를 못 봐 짝을 잘못 맞췄던 것이다.
    나머지 272건은 더 세는(fail-closed) 쪽이고, 표본 15건은 CommonMark와 일치했다.

## Learnings

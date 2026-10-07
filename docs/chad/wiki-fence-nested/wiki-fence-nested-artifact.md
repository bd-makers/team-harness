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
  - 대신 차등 스윕을 돌렸다(스크립트는 scratchpad에 두고 커밋하지 않음 — 재현용으로 비교 부분을 아래에 인용). 펜스·목록·인용 줄 18종으로
    3·4줄 문서를 만들어 origin/main과 현재 `wikiMarkersIn`을 비교한다. `HIDES`는 main보다 실제 마커를 **덜** 세는(재컴파일 쪽) 경우다.

````text
$ git show refs/remotes/origin/main:src/commands/wiki.mjs > src/commands/main-wiki-check.mjs   # 비교 후 삭제
$ node sweep.mjs "$PWD/src/commands/main-wiki-check.mjs" "$PWD/src/commands/wiki.mjs"   # tip d61a5b6 이후 소스
docs 22374 diffs 277
hides 5 shows 272
HIDES - ``` |   ``` | ``` | M => main=[t/0] new=[]
HIDES -     ``` |   ``` | ``` | M => main=[t/0] new=[]
HIDES 1. ``` |   ``` | ``` | M => main=[t/0] new=[]
HIDES   - ``` |   ``` | ``` | M => main=[t/0] new=[]
HIDES - x |   ``` | ``` | M => main=[t/0] new=[]
````

````js
// sweep.mjs 비교 부분 (출력 서식 줄 생략)
const [main, cur] = await Promise.all([import(process.argv[2]), import(process.argv[3])]);
const V = ['```', '~~~', '  ```', '    ```', '- ```', '-     ```', '1. ```', '> ```', '> > ```', '>     ```', '  - ```', '    - ```', 'x', '  x', '', '>', '- x', 'M'];
const seen = new Map();
let n = 0;
function* gen(k, pre = []) { if (k === 0) { yield pre; return; } for (const v of V) yield* gen(k - 1, [...pre, v]); }
for (const k of [3, 4]) for (const lines of gen(k)) {
  let i = 0;
  const doc = lines.map(l => l === 'M' ? `<!-- harness:wiki task=t/${i++} -->` : l).join('\n') + '\n';
  if (!i) continue;
  n++;
  const a = main.wikiMarkersIn(doc).map(m => m.task).join(','), b = cur.wikiMarkersIn(doc).map(m => m.task).join(',');
  if (a !== b) {
    const key = (a.length > b.length ? 'HIDES ' : 'SHOWS ') + lines.join(' | ');
    if (!seen.has(key)) seen.set(key, `main=[${a}] new=[${b}]`);
  }
}
console.log('docs', n, 'diffs', seen.size);
````

    - 판단(사람 검토 대상 — 기계 검사 아님): `HIDES` 5건은 모두 `` <목록 펜스 열고 닫음> / 맨 위 ``` (닫히지 않음) / 마커 `` 꼴이다.
      CommonMark에서 닫히지 않은 펜스는 문서 끝까지 가므로 새 동작이 맞고, main은 목록 펜스를 못 봐 짝을 잘못 맞췄다.
      `SHOWS` 272건은 더 세는(fail-closed) 쪽이다. 첫 실행에서 출력한 표본 중 예: `` - ``` |   ``` | M => main=[] new=[t/0] ``,
      `` - x |   ``` | M => main=[] new=[t/0] ``, `` - ``` |   ``` | > ``` | M => main=[] new=[t/0] `` — 각각 목록 펜스가 닫히거나
      목록·인용이 끝나 마커가 펜스 밖에 있으므로 CommonMark상 새 동작이 맞다고 판단했다(참조 파서로 대조하지는 않았다).

### 2026-10-07T07:27:56.778Z — codex-shipcheck (harness-team review)

- engine: codex · scope: diff · tip: 5748bafa616f8f7875e741fdd1e12288fea0981e · exit 0 · 2366 B

```text
`git status`, `git diff refs/remotes/origin/main`, 커밋 이력을 직접 확인했습니다. 변경은 9개 파일이며, 미커밋 변경은 handoff뿐입니다. 파일은 수정하지 않았습니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| S1 | spec 요구사항 ↔ 구현 | BLOCKER | pass | spec의 “펜스 밖 실제 마커(인용문 안 포함)는 여전히 센다”에 대응하는 테스트 `tasks('> <!-- harness:wiki task=a/d -->\n'), ['a/d']`가 있습니다. diff에는 인용 깊이·목록 내용 열·펜스 종료 조건과 S1/S2 단언이 모두 있습니다. 미구현 범위도 “지연 연속 줄, 탭 열 계산…”으로 명시되어 있습니다. |
| S2 | 완료 체크 ↔ 변경·커밋 | MAJOR | pass | plan 1·2는 `6f9498e`의 테스트·구현, 3은 artifact의 명령·출력 블록, 4는 리뷰 3건 및 `107766d`·`d61a5b6`의 수정, 5는 CHANGELOG diff의 `+### Fixed`와 `5748baf`의 ship 기록에 대응합니다. |
| S3 | 스코프 밖 변경 | MAJOR | pass | 소스 diff는 `wikiMarkersIn`과 관련 상수에 한정됩니다. 나머지는 관련 테스트·task 문서·CHANGELOG입니다. plan에도 “CHANGELOG `[Unreleased]` Fixed 한 줄 → `/harness-ship`”이 명시되어 있습니다. |
| S4 | 리뷰 기록·마커 | MAJOR | pass | meta diff의 리뷰 3건이 artifact `## Reviews`의 `harness:review` 마커와 일치합니다(tip `6f9498e`, `82f7cbd`, `107766d`). 무효 리뷰도 “무효 — 리뷰 대상 오류”로 보존되어 있습니다. |
| S5 | 검증 결과의 명령·출력 인용 | BLOCKER | **fail** | 주요 테스트·docs·scenario 결과에는 명령·출력 인용이 있습니다. 그러나 [artifact:116](/Users/chadonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-44/docs/chad/wiki-fence-nested/wiki-fence-nested-artifact.md:116)의 “22,374개…차이 277건”, “표본 15건은 CommonMark와 일치했다”는 산문 선언이며 실행 명령·출력 인용이 없습니다. 이 스윕은 최종 수정의 검증 근거로도 제시되어 있어 S5를 충족하지 못합니다. |

fixture 테스트는 파일을 쓰므로 재실행하지 않았습니다.

**Verdict: REQUEST CHANGES — fail 전체 목록: S5(BLOCKER).** 차등 스윕의 실행 명령과 실제 출력 인용을 추가해야 합니다.
```

<!-- harness:review kind=codex-shipcheck scope=diff tip=5748bafa616f8f7875e741fdd1e12288fea0981e at=2026-10-07T07:27:56.778Z -->

- 판별(2026-10-07): S5 BLOCKER fail **유효** — 차등 스윕 결과(22,374건·차이 277건·표본 판단)가 명령·출력 없이 산문으로만 있었다.
  조치(문서만): 스윕을 다시 돌려 실행 명령·실제 출력·비교 스크립트를 R3 재검 판별 아래에 인용하고, `SHOWS` 표본 판단은
  "사람 판단 — 참조 파서 대조 아님"으로 성격을 밝혔다. S1–S4 pass, 조치 없음. 코드 변경 없음.

### 2026-10-07T07:33:16.151Z — codex-shipcheck (harness-team review)

- engine: codex · scope: diff · tip: 081388c8351e52561e2e5253caaa1c3ba8f358a1 · exit 0 · 2675 B

```text
`git status`, `git diff refs/remotes/origin/main`, 커밋 이력을 직접 확인했습니다. 변경은 9개 파일이며, 미커밋 변경은 handoff뿐입니다. 파일은 수정하지 않았습니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| S1 | spec 요구사항 ↔ 구현 | BLOCKER | pass | diff의 `depth < fence.depth`, `close[1].length - fence.col <= 3`, `gap.length >= 5 ? 1 : gap.length`가 spec의 인용 깊이·컨테이너 들여쓰기·목록 공백 규칙에 대응합니다. 테스트의 `assert.deepEqual(out.compiled, [])`와 `['wiki/20_domain/feature.md']`가 예시 제외·실제 마커 보존을 검증합니다. 미구현 범위는 “지연 연속 줄, 탭 열 계산…”으로 명시되어 있습니다. |
| S2 | 완료 체크 ↔ 변경·커밋 | MAJOR | pass | plan 1·2는 `6f9498e`의 재현 테스트·구현과 artifact의 `actual: [ 'wiki/90_system/rules.md' ], expected: []`에 대응합니다. 3은 검증 명령·출력 블록, 4는 리뷰 기록과 `107766d`·`d61a5b6` 수정, 5는 CHANGELOG의 `+### Fixed`와 `5748baf`의 “ship(2026-10-07)” 기록에 대응합니다. |
| S3 | 스코프 밖 변경 | MAJOR | pass | 소스 diff는 `wikiMarkersIn`과 펜스 판정 상수에 한정됩니다. 나머지는 관련 테스트·task 문서·CHANGELOG입니다. plan의 “CHANGELOG `[Unreleased]` Fixed 한 줄 → `/harness-ship`”에도 대응합니다. |
| S4 | 리뷰 기록·마커 | MAJOR | pass | meta diff의 리뷰 4건 모두 artifact `## Reviews`에 동일한 kind·scope·tip·at의 `<!-- harness:review … -->` 마커가 있습니다. 무효 리뷰도 “무효 — 리뷰 대상 오류”로 보존되어 있습니다. |
| S5 | 검증 결과의 명령·출력 인용 | BLOCKER | pass | [최종 검증 기록](/Users/chadonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-44/docs/chad/wiki-fence-nested/wiki-fence-nested-artifact.md:14)에 테스트·docs·scenario 명령과 출력이 있습니다. [차등 스윕 기록](/Users/chadonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-44/docs/chad/wiki-fence-nested/wiki-fence-nested-artifact.md:120)에도 명령과 `docs 22374 diffs 277`, `hides 5 shows 272` 출력이 추가되었습니다. 스윕을 메모리에서 독립 재실행해 동일한 수치와 HIDES 5건을 확인했습니다. |

추가로 구문 검사·`docs:check`·`git diff --check`가 통과했습니다. 파일을 쓰는 fixture 테스트와 전체 테스트는 재실행하지 않았으며, 해당 결과는 문서에 인용된 출력 기준입니다.

**Verdict: PASS — fail 전체 목록: 없음.**
```

<!-- harness:review kind=codex-shipcheck scope=diff tip=081388c8351e52561e2e5253caaa1c3ba8f358a1 at=2026-10-07T07:33:16.151Z -->

- 판별(2026-10-07): S1–S5 전부 pass — 앞선 S5 BLOCKER 조치를 독립 검증자가 확인(스윕 재실행으로 같은 수치·HIDES 5건). 조치 없음.

## Learnings

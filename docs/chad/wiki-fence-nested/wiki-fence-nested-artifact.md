# wiki-fence-nested — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- 수정: `src/commands/wiki.mjs` `wikiMarkersIn` — 인용 깊이(`>` 반복)를 세고 목록 표지를 같은 너비 공백으로 바꿔
  펜스를 컨테이너 기준으로 판정. 여는 펜스는 가장 최근 목록 항목 내용 열에서 3칸 이내만, 닫는 펜스는 같은 인용 깊이 ·
  들여쓰기 ≤ 여는 펜스 + 3. 인용이 얕아지면 그 안의 펜스는 끝난다. 다이어그램: 옵트아웃(사람 결정 — 작은 버그).
- 재현(수정 전): 새 테스트가 `actual: [ 'wiki/90_system/rules.md' ], expected: []`로 실패 — 인용문·목록 안 예시 마커를 `compiled`로 셈.
- 검증 출력(수정 후, 2026-10-07):

```text
$ node --test --test-name-pattern="(inside blockquotes and list items|ignoring fenced examples)" tests/wiki.test.mjs
✔ wiki sources: reports where the task is already compiled, ignoring fenced examples (179.634792ms)
✔ wiki sources: fenced examples inside blockquotes and list items are not compiled markers (180.535792ms)
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
✔ boundary performance: steady-state cold-process check <3x and plan checkpoint <5x an equal-work baseline for 10 x 10KiB local contracts (915.284167ms)
ℹ tests 1
ℹ pass 1

$ npm run docs:check
harness overview 생성 상태가 최신입니다.

$ node bin/harness-team.mjs scenario check
scenario: pass (2 checked)
```

- 범위 밖(의도적): 목록 항목이 내어쓰기로 끝날 때 닫히지 않은 펜스 닫기, 지연 연속 줄, 탭 열 계산, P3(공백만 있는 줄).


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

## Learnings

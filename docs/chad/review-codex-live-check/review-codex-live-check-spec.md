# review-codex-live-check — Spec

## 목적 / 요구사항

**오늘 무엇이 안 되는가.** 0.37.0의 `harness-team review`는 codex 엔진 행
(`src/commands/review.mjs` `runEngine`: `codex exec --sandbox read-only <prompt>`, `stdio: ['ignore', …]`)을
`commands/harness-review.md` 엔진 runner 표에서 그대로 옮겼지만, 개발 컨테이너에 codex가 없어
**한 번도 실행되지 않았다**. 실측은 claude 엔진과 custom 엔진 fake(`tests/review-command.test.mjs`)뿐이다.
`docs/what-changes-0.37.0.html`이 이 사실을 "codex 미검증"으로 명시하고 있다.

**영향받는 대상.** codex가 설치된 모든 머신 — 엔진을 지정하지 않으면 probe 폴백 체인이 **codex를 먼저**
고른다. 문서 표의 `< /dev/null` 계약이 `stdio: ['ignore', …]`로 대체되지 않았다면 첫 호출에서 세션이
무한 대기한다(문서가 경고하는 `Reading additional input from stdin...` 정지).

**기대 결과.** codex가 있는 이 머신(codex-cli 0.153.4, 모델은 `~/.codex/config.toml`의 `gpt-5.6-sol`)에서
`harness-team review codex`를 **1회** 실행해 아래 세 가지를 확인한다.

| # | 확인 | 판정 기준 |
|---|---|---|
| (a) | stdin 닫힘 계약 | 프로세스가 스스로 종료한다 — 정지 없이 exit 코드가 나온다 |
| (b) | 증거 기록 | exit 0이면 `<name>-meta.json` `reviews[]` 항목 1개 + artifact `## Reviews` 블록 + `<!-- harness:review … -->` 마커가 같은 `at`·`tip`으로 남는다 |
| (c) | 출력 상한 | 출력이 16 KiB를 넘으면 artifact 블록 첫 줄에 `(artifact에는 앞부분만)`, 본문 끝에 `… (truncated: N bytes total, first 16384 shown)` — 넘지 않으면 `outputBytes`와 함께 "미도달"로 기록하고 절단 자체는 단위 테스트 커버로 갈음 |

**제약.**

- **코드 변경 없음.** 이 task는 검증 전용이다. (a)(b)(c) 중 하나라도 실패하면 수정은 **별도 task + patch 릴리스**로 분리한다.
- 리뷰 대상은 `v0.36.0...HEAD` diff(= 0.37.0 구현 자체)로 고정한다 — `--scope diff --base v0.36.0`.
  작업 트리에 이 task의 문서가 생겨 dirty가 되므로 scope를 명시하지 않으면 worktree 리뷰가 되어 대상이 바뀐다.
- codex의 발견은 harness-review.md 4단계대로 판별해 산문으로 남기되, 발견에 대한 수정은 이 task 범위 밖이다.

## 설계 / 접근

실행 명령(저장소 체크아웃의 CLI를 직접 호출 — PATH의 전역 CLI는 클론이라 낡을 수 있다):

```bash
node bin/harness-team.mjs review codex --scope diff --base v0.36.0
```

백그라운드로 돌린다(문서 경고: stdin이 열려 있으면 수십 분을 날린다 — 그것이 곧 (a)의 실패 신호다).
시작·종료 시각을 함께 기록해 소요 시간을 남긴다.

## Ontology

- **실측(live check)**: 실제 엔진 바이너리로 CLI 경로를 끝까지 한 번 통과시키는 것. fake·단위 테스트와 구분한다.
- **증거(evidence)**: `verify`/`review` 가드가 읽는 기록 — 0.37.0부터 `meta.reviews[]`가 정본, artifact 블록·마커는 사람용 사본.
- **절단 표기**: `REVIEW_OUTPUT_MAX_BYTES`(16 KiB) 초과분을 잘라내고 잘랐다고 적는 것 — 조용한 절단은 "다 봤다"로 읽힌다.
- 게이트 통과 근거: 목표는 위 표 세 줄, 제약은 "코드 변경 없음", 성공 기준은 표의 판정 기준, 영향 코드는 `review.mjs` runner 한 행.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — codex 엔진 경로를 1회 실측해 (a)(b)(c)를 판정한다.
- [x] **Constraint 명확도** (30%) — 코드 변경 없음, 대상 diff 고정, 실패 시 별도 task.
- [x] **Success 기준** (30%) — 위 표의 판정 기준.
- [x] **Context 명확도** (brownfield 한정) — `src/commands/review.mjs` `runEngine`/`run`, `commands/harness-review.md` codex 절.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0

## Done evidence
```json
{ "version": 1, "review": "required", "tests": "skip" }
```

## 참고

- `docs/followups.md` 1번(이 task로 올렸으므로 그 파일에서 제거)
- `commands/harness-review.md` 엔진 runner 표 · `src/commands/review.mjs:211-229`
- `tests/review-command.test.mjs` — custom 엔진 fake로만 검증, `truncateOutput` 단위 커버
- `docs/what-changes-0.37.0.html` — "codex 미검증" 문구

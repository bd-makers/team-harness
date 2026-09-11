# review-codex-live-check — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

**2026-09-11 실측 — 0.37.0 `harness-team review codex` 경로, 이 머신(codex-cli 0.153.4, 모델 `gpt-5.6-sol` reasoning high).**
명령: `node bin/harness-team.mjs review codex --scope diff --base v0.36.0` (대상 = 0.37.0 구현 diff, 37 files / +2099 −144).

| # | 확인 | 결과 | 근거 |
|---|---|---|---|
| (a) | stdin 닫힘 계약 (`stdio: ['ignore', …]` ≡ `< /dev/null`) | **통과** | 06:59:40Z 시작 → 07:05:34Z 종료, exit 0, 스스로 종료. 실행 중 `lsof`: fd 0 = `/dev/null`, API TCP ESTABLISHED, `~/.codex/sessions` rollout 진행 — 정지 아님 |
| (b) | 증거 기록 | **통과** | `meta.reviews[0]` = `{kind: codex, scope: diff, tip: d991093…, at: 2026-09-11T07:05:34.583Z, exitCode: 0, outputBytes: 1786}` · artifact 블록 헤더·마커의 `at`·`tip` 동일 · CLI 출력 `recorded: … · meta.reviews[0]` |
| (c) | 16 KiB 절단 표기 | **미도달** | 출력 1786 B < 16384. 절단 경로는 `tests/review-command.test.mjs`의 `truncateOutput` 단위 커버로 갈음 — 실측 미검증으로 남김 |

판정: **codex 엔진 경로는 0.37.0 그대로 동작한다. patch 릴리스 불필요.** `docs/what-changes-0.37.0.html`의
"codex 미검증" 문구는 (a)(b)에 한해 해소됐고 (c)만 미도달이다(문서 갱신은 다음 릴리스 문서에서).

**다이어그램**: 옵트인 질문 1회 — 아니오(검증 전용 task, 2026-09-11).

**followups**: `docs/followups.md` 1번을 이 task로 올려 제거. codex 발견 중 실재하는 것은 8번으로 추가.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings


### 2026-09-11T07:05:34.583Z — codex (harness-team review)

- engine: codex · scope: diff · tip: d9910930c9043d722457927dddb454929ed85010 · exit 0 · 1786 B

```text
전하, `v0.36.0...HEAD` 기준으로 **P1은 없지만 P2 5건이 있어 수정 후 재검토가 필요합니다.**

### P1 blocking

- 없음.

### P2 should-fix

- `src/commands/review.mjs:377` — 리뷰 블록을 EOF에 append하여 기본 템플릿에서는 `## Reviews`가 아니라 `## Learnings` 하위에 기록됩니다.
- `src/commands/review.mjs:375` — meta를 먼저 저장하고 artifact를 나중에 append하므로 두 번째 쓰기 실패 시 CLI는 실패하지만 `done` 가드는 성공한 리뷰로 인정하는 부분 기록이 남습니다.
- `src/commands/review.mjs:348` — exit code만 검사해 stdout이 0바이트여도 리뷰 증거를 기록하므로 no-op 또는 잘못 설정된 reviewer가 `verify: required`를 통과시킬 수 있습니다.
- `src/commands/review.mjs:125` — custom reviewer의 `./relative-path`를 프로세스 cwd에서 검사하지만 실제 실행은 `targetDir`에서 하므로 `--target` 사용 시 실행 가능한 reviewer가 preflight에서 잘못 거부됩니다.
- `src/commands/review.mjs:154` — 잘못된 custom template 전체를 오류에 출력하여 inline token·Authorization 인자 등이 콘솔과 JSON 로그에 노출될 수 있습니다.

### P3 nit

- 없음.

검증 메모: 37개 변경 파일(+2,099/-144)을 확인했고 `git diff --check`, 변경 JS 파일 syntax check, `npm run docs:check`는 통과했습니다. 전체 테스트는 strict read-only 범위상 임시 파일을 생성하므로 실행하지 않았습니다. 검토 중 별도 프로세스에서 `docs/followups.md`와 `docs/chad/review-codex-live-check/` 상태가 변경됐지만, 제가 수정한 파일은 없습니다.

**최종 판정: REQUEST CHANGES — P2 5건 수정 전에는 merge-ready로 보기 어렵습니다.**
```

<!-- harness:review kind=codex scope=diff tip=d9910930c9043d722457927dddb454929ed85010 at=2026-09-11T07:05:34.583Z -->

**판별 (harness-review.md 4단계) — 리뷰 대상은 이미 릴리스된 0.37.0 코드이며 수정은 이 task 범위 밖. 판별만 남긴다.**

| codex P2 | 판별 | 근거 |
|---|---|---|
| `review.mjs:377` 블록이 EOF append라 `## Reviews`가 아니라 `## Learnings` 아래에 남음 | **진짜 결함 (P3로 하향)** | 이 artifact가 바로 그 증거 — 위 블록이 `## Learnings` 아래에 있다. `done` 가드는 `parseReviewMarkers`가 artifact 전체를 훑고 정본은 `meta.reviews`라 판정엔 영향 없음. 사람 가독성 문제. `## Learnings` 헤딩 앞 삽입으로 고칠 수 있음 |
| `:375` meta 먼저·artifact 나중 — artifact 쓰기 실패 시 meta만 남는 부분 기록 | **오탐 (의도된 설계)** | 코드 주석이 명시: "artifact 쓰기가 실패해도 증거는 남도록 먼저 쓴다". 리뷰는 실제로 성공했으므로 meta 증거는 참이다 |
| `:348` exit 0이면 stdout 0 B여도 기록 — no-op reviewer가 `verify: required` 통과 | **진짜 결함 (P3)** | 코드 확인. 고의 위조는 가드 위협 모델 밖이지만, 아무것도 출력 안 하는 잘못 설정된 custom reviewer는 "실수" 범주. 빈 stdout은 기록 거부가 싸다 |
| `:125` custom `./relative` preflight가 process cwd 기준, 실행은 `targetDir` — `--target`에서 오거부 | **진짜 결함 (P3, 엣지)** | `which()`가 `access(name)`을 cwd 기준으로 호출. `--target` + 상대경로 커맨드 조합에서만 발현 |
| `:154` 잘못된 custom template 전체를 오류에 echo — 토큰 노출 | **오탐 (저위험)** | 템플릿은 사용자 자신의 커밋 가능한 `.harness/reviewers.json` 내용이고 그 사용자의 콘솔로 돌아간다. 거기 비밀을 넣었다면 git에 이미 노출. 별도 조치 없음 |

codex 최종 판정 "REQUEST CHANGES"는 릴리스 전 리뷰라면 타당하나, 실재 3건 모두 P3 수준이라 patch 릴리스 사유는 아니다 — `docs/followups.md` 8번으로 넘김.

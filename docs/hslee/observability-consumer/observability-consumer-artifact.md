# observability-consumer — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

**인도물** (브랜치 `claude/observability-consumer`, base `origin/main` 1b42442 = v0.25.0):
- `src/commands/observe.mjs` — `percentile`·`windowDays`·`summarizeObservability`(순수)·`readObservabilityRecords`·`resolveTaskRefs`·`hmacRef`·`renderObserveText`·`runObserve`.
- `src/cli-args.mjs`(`days` VALUE_FLAG, `observe` 행) · `bin/harness-team.mjs`(라우터·taskCmds).
- `tests/observe.test.mjs` 20건(순수 8 · 리뷰 반영 3 · 읽기/역매핑 5 · 러너 4) + `tests/cli-args.test.mjs` 단언 4건. 역매핑 테스트는 실제 훅 `observeToolEvent`로 레코드를 쓰고 같은 HMAC을 얻는지 고정.
- 표면: `commands/harness-observe.md` · `skills/harness-observe/`(SKILL.md·agents/openai.yaml) · `.claude-plugin/plugin.json` · README(명령어 레퍼런스 절 + 설치 결과물 한 줄) · CHANGELOG `[Unreleased]` Added · overview 재생성.
- 커밋: e88aadf(순수 집계) · 6b03273(읽기·역매핑) · 3ea4fa9(러너·CLI) · cbc09ba(표면) · 리뷰 반영 1커밋(아래 Reviews). 각 Task는 RED(모듈/export 없음·unknown command·manifest-sync 3건)를 본 뒤 GREEN.

**검증** (2026-09-05, codex 리뷰 반영 후 재실행 — 실제 출력):
```
$ npm test            # exit 0
ℹ tests 546
ℹ pass 545
ℹ fail 0
ℹ skipped 1           # tests/hooks-jq-fallback.test.mjs의 skip: !process.env.CI 게이트
ℹ tests 1             # perf
ℹ pass 1
$ npm run docs:check
harness overview 생성 상태가 최신입니다.
```

**실행 증거** — 임시 프로젝트에 실제 훅으로 97 레코드 시드(어제 40 성공+1 실패, 오늘 25 성공·같은 도구 5 실패·denied 1, active task hslee/demo):
```
$ node bin/harness-team.mjs observe --target <demo>      # exit 1
observe: 7일 창 (2026-08-30 → 2026-09-05) · 레코드 97 · 건너뜀 0
✗ failure-rate-2x: fired (오늘 19.4% vs 기준 2.4% · finished 31 · failures 6 · 기준일 1)
✗ repeat-failure-3x: fired — session ecd9fe50 shell ×6 (마지막 2026-09-05T07:49:25.009Z)

일별
                       started finished failed denied    rate   p95ms  intr
2026-08-30                   0        0      0      0       -       -     0
2026-08-31                   0        0      0      0       -       -     0
2026-09-01                   0        0      0      0       -       -     0
2026-09-02                   0        0      0      0       -       -     0
2026-09-03                   0        0      0      0       -       -     0
2026-09-04                   0       41      1      0    2.4%     220     0
2026-09-05                  25       31      5      1   19.4%     220     0

task별
                       started finished failed denied    rate   p95ms  intr
hslee/demo                  25       72      6      1    9.7%     220     0

도구 분류별
                       started finished failed denied    rate   p95ms  intr
filesystem_write             0        1      0      1  100.0%     220     0
shell                       25       71      6      0    8.5%     220     0

$ node bin/harness-team.mjs observe --target <demo> --days 1   # exit 1 (기준일 없음 → failure-rate는 insufficient-baseline, repeat는 발화)
observe: 1일 창 (2026-09-05 → 2026-09-05) · 레코드 56 · 건너뜀 0
✓ failure-rate-2x: insufficient-baseline (오늘 19.4% vs 기준 - · finished 31 · failures 6 · 기준일 0)
✗ repeat-failure-3x: fired — session ecd9fe50 shell ×5 (마지막 2026-09-05T07:49:25.009Z)

$ node bin/harness-team.mjs observe --target <demo> --json | jq .status,.summary
"tripped"
"트립와이어 발화: failure-rate-2x, repeat-failure-3x"                         # exit 1

$ node bin/harness-team.mjs observe          # 이 저장소(훅 미설치)  exit 0
- observe: 관측 로그 없음 — .harness/observability/v1 미존재 (observe-tools 훅이 아직 기록하지 않음)
$ node bin/harness-team.mjs observe --days 99   # exit 2 — ✗ observe: --days 값이 잘못됨 (99) / cause: --days는 1..14 정수만 허용
```

**남은 리스크**
- 트립와이어 임계값(20·5·2×·3회)은 PDF 표와 오탐 방지 바닥값에서 정했고 실사용 데이터로 보정하지 않았다 — 상수 4개가 export돼 있어 조정은 한 줄.
- `usage` 토큰은 도구 응답에 거의 실리지 않아 스코어카드의 토큰 열은 대부분 null이다(설계상 비용 트립와이어는 범위 밖).
- 이 저장소는 훅을 dogfood하지 않아 `observe`가 항상 `not-installed`다 — 소비자 프로젝트에서만 데이터가 보인다.

- 다이어그램: 건너뜀 (task 생성 시 옵트아웃, 2026-09-05)
- PR: https://github.com/bd-makers/team-harness/pull/73 — CI run 33954164845 `test (24)` success (Run tests ✓ · Check generated docs ✓). 머지·done은 지시 대기.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-05 — codex (gpt-5.6-sol, read-only, scope=diff `origin/main...HEAD` 1b42442 → cbc09ba + 미추적 task docs)

- 실행: `codex exec --sandbox read-only -m gpt-5.6-sol "<공용 프롬프트 + focus>" < /dev/null` 백그라운드, 116,006 tokens.
  설정 모델 `gpt-6-astra`는 codex-cli 0.147.0이 거부하므로 `-m`으로 지정(엔진은 codex 유지, 폴백 체인 미사용).
- 결과: P1 0 · P2 2 · P3 4 → verdict "CHANGES REQUESTED". 리뷰어 자체 확인: HMAC 식·nearest-rank·`>=` 구현·UTC month rollover·
  symlink 방어·CLI/라우터 배선 정상, manifest 10건·`docs:check` 통과. 임시 디렉터리 테스트 9건은 샌드박스 `mkdtemp EPERM`으로 미실행(26건 통과).
- 판별·조치:
  - P2 `observe.mjs:139` — `task_ref` 타입 미검증이라 `task_ref: 123` 한 줄이 `.slice` TypeError로 명령 전체를 중단. **진짜**(테스트로 재현:
    `TypeError: task_ref.slice is not a function`) → **반영**: `validRecord`가 null/문자열만 통과, `summarize`도 비문자열을 `(no task)`로 처리. 테스트 2건.
  - P2 `observe.mjs:240` — text 표가 spec·문서가 약속한 succeeded·p50·바이트·usage를 보이지 않음. **사실** — 터미널 폭 때문에 핵심 열만 보이게 한
    설계라 코드가 아니라 문서를 고침: spec 요구 6, `commands/harness-observe.md`, CHANGELOG에 "text 열 7개, 전체 필드는 `--json`" 명시.
  - P3 `observe.mjs:195` — `recorded_at` 앞 10자로 일을 판정해 offset 타임스탬프의 UTC 일 오판. **사실**(훅은 항상 Z를 쓰지만 순수 함수 입력은
    아님) → **반영**: `Date.parse` 기반 `recordDay`, 파싱 불가 레코드는 reader에서 건너뜀. 테스트 1건.
  - P3 `observe.mjs:272` — 성공 경로가 `process.exitCode`를 0으로 되돌리지 않음. **기각** — CLI는 프로세스당 명령 하나이고 `summary`·`doctor`도
    리셋하지 않는 관례. 테스트는 명시적으로 리셋한다.
  - P3 `tests/observe.test.mjs:69` — 2× 테스트가 실제로는 2.5×라 `>` 회귀를 못 잡음. **진짜** → **반영**: 정확히 2×(0.25→0.50) 발화·0.45 비발화
    테스트 추가, 구현을 `>`로 바꿔 실패(1 fail)를 확인한 뒤 복원.
  - P3 spec:38 — `status: 'invalid'`로 적었으나 구현·테스트는 `error`. **사실** → spec을 `fail` 관례(`error`)로 정정.
- 재리뷰: 리뷰어가 권장했으나 수정이 4곳·테스트 4건으로 작고 전부 테스트가 고정해 생략 — 필요하면 PR 리뷰에서.

<!-- harness:review kind=codex scope=diff tip=cbc09bad13cf3a59cad6c29145262ca99a09c9fc at=2026-09-05T07:58:20Z -->


## Learnings

- 순수 집계 함수의 입력 방어는 reader에만 두면 안 된다 — export된 함수는 호출자가 곧 입력 경계다(비문자열 `task_ref`가 TypeError로 이어졌다).
- 경계 테스트는 임계값 그 자체(정확히 2×)를 쳐야 `>=`↔`>` 회귀를 잡는다. 2.5×는 어느 쪽이든 통과한다.
- 브레인스토밍 architectural 경로(질문 2개 → 설계 승인 → spec → plan)가 파일 11개 규모에 잘 맞았다 — 코드 전에 결정 4개(형태·트립와이어·exit·HMAC 재구현)가
  고정돼 구현 중 되돌림이 없었다.
- Bash heredoc에 NUL 문자를 직접 쓰면 도구가 거부한다 — HMAC 구분자는 항상 `\u0000` 이스케이프 표기로 쓴다.


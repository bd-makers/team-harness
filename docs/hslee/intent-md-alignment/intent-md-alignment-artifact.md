# intent-md-alignment — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

### 2026-09-06 — 구현·검증 (커밋 전, 워크트리 `claude/intent-md-team-harness-review-63a1f1`)

**검토 출처**: Anthropic "The AI-Native SDLC Playbook"(Stage 1 `intent.md` · Stage 6 루프백). 두 세션 검토를
합쳤다 — 현재 세션 권고 3건(Problem·열린 질문 흡수 / observe 루프백 보류 → nudge로 격하 / 비목표 명시) +
opus 세션 분석의 조정 2건(Problem을 Goal 차원 안에서 발사 / nudge를 JSON·텍스트 양쪽에).

**변경 파일 10 + task 문서**:
- `commands/harness-spec.md` — 인터뷰 차원에 Problem 추가, `(open)` 열린 질문 규약(`(unresolved)`와 구분).
- `commands/harness-interview.md` — §2 Goal pass 근거 = 기대 결과 + 문제 문장, §3 Goal 각도에 문제 질문,
  §6 게이트에 `(open)` 정리 조건, 종료 조건에 `(open)` 보존.
- `src/commands/task.mjs` — spec 템플릿 목적 절 안내문 1줄(산문, 목록 아님).
- `src/commands/observe.mjs` — `observeLoopbackNudge()` 신설, 트립 시 `next_actions[1]`과 텍스트 `next:` 줄.
- `commands/harness-observe.md` · `README.md` · `templates/docs/README.md` · `CHANGELOG.md [Unreleased]`.
- `tests/task-templates.test.mjs`(+1: 안내문 존재·비목록) · `tests/observe.test.mjs`(트립 시 nudge 2건, 비트립 시 0건).

**검증 증거**:
- `npm test`: 605 tests · 604 pass · 0 fail · 1 skipped(기존과 동일) + perf 1 pass.
- `npm run docs:check`: "harness overview 생성 상태가 최신입니다".
- `harness-team context check`: valid (1781/6144 B · 22/100 lines · capsules 0/3).
- 가중치(40/30/30)를 파싱하는 코드 없음(grep) → 채점 구조 무변경 확인. `tests/agent-files.test.mjs`의
  harness-interview 문구 pin 5개 보존.

**하지 않은 것(spec 비목표 그대로)**: 6번째 파일 · PO 게이트 · 요청자 필드 · churn 지표 · Problem 5축 승격 ·
observe task 자동 생성. 커밋·릴리스는 사용자 지시 대기.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-06 — Codex read-only 리뷰 (엔진: codex, CLI 0.147.0, `-m gpt-5.6-sol`, scope=worktree)
- 실행: `codex exec --sandbox read-only -m gpt-5.6-sol "<공용 리뷰 프롬프트 + focus>" < /dev/null` —
  04:36:41Z 시작 · 04:41:34Z 종료 · 110,144 tokens. focus: 세 명령 문서 계약 정합, 템플릿 힌트, nudge와 테스트,
  task 문서가 diff를 옳게 서술하는지.
- 발견 **P2 1건** — nudge의 task 이름이 실행일(`window.to`)을 쓰는데 `repeat-failure-3x`는 창 전체(≤14일)를
  검사하므로, 같은 과거 사건이 매일 다른 이름을 받아 spec의 "재실행 → `activated:` 수렴" 계약이 깨지고 중복 task를
  유도한다.
  - **판별: 진짜 결함.** 재현 — `repeatFailureTripWire(records)`는 창 전체 레코드를 순회하고(`observe.mjs:104-121`)
    hit에 `last_at` 인스턴트만 남기는데, nudge 호출부는 `result.window.to`를 넘겼다.
  - **조치(반영 완료):** `wireDay()` 도입 — `failure-rate-2x`는 `detail.day`, `repeat-failure-3x`는 최상위 hit의
    `last_at`을 `utcDay()`로 버킷(by_day와 같은 UTC 인스턴트 기준), 둘 다 없으면 실행일 폴백. 회귀 테스트
    `observeLoopbackNudge: task name keys on the event day…`(다음 날 재실행 동일 이름 · 오프셋 타임스탬프 ·
    둘 다 발화 · hit 없음 폴백) 추가. harness-observe.md · README · CHANGELOG · spec에 `<day>` 의미 명시.
- 그 외: command 계약·템플릿 힌트·`(open)` 규약·JSON/텍스트 공통 문구·task 문서 서술에서 유의미한 불일치 없음.
- Codex 검증 한계: 임시 디렉터리를 쓰는 테스트 18개는 read-only sandbox `EPERM`으로 미실행(assertion 실패
  아님). 작성 세션이 `npm test` 전체(606 tests · 605 pass · 0 fail · 1 skipped + perf 1)로 대체 검증.
<!-- harness:review kind=codex scope=worktree tip=daeb197bbda335e4152cac1349a6c4d0a63d5908 at=2026-09-06T04:41:34Z -->

## Learnings

- 2026-09-06 **계약 문장에는 테스트가 붙어야 한다.** spec에 "재실행 시 `activated:`로 수렴"이라 적어 놓고 이름 키의
  입력(실행일 vs 사건일)을 따지지 않았다 — Codex P2. 수렴·멱등 같은 단어를 spec에 쓰면 그 자리에서 "무엇이 같아야
  같은가"를 테스트로 고정한다.
- 2026-09-06 **외부 지침을 흡수할 때는 새 파일보다 기존 표면의 트리거 구조를 먼저 읽는다.** harness-interview는
  채점표의 fail/na 차원에만 질문을 만들므로 "질문 각도"만 추가하면 발사되지 않는다 — Problem을 Goal 차원 안에
  넣어야 했다. 문서 한 줄이 실제로 어느 분기에서 실행되는지 확인하는 것이 적용 판단의 절반이다.
- 2026-09-06 **서로 다른 렌즈의 두 검토가 같은 결론에서 다른 것을 봤다.** 6번째 파일 금지는 일치했지만 한쪽은
  요청자≠실행자를, 다른 쪽은 `(open)` 질문의 집을 찾았다 — 같은 프롬프트 N회가 아니라 다른 렌즈를 쓰라는
  delegation-router 규칙의 실증.


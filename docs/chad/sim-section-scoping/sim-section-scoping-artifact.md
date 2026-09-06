# sim-section-scoping — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

**2026-09-07** — `tests/sim/rules.mjs`의 `sectionBody`를 레벨 인식으로 전환. +66 / −4, 2파일.

| 대상 | 변경 |
|---|---|
| `tests/sim/rules.mjs` | 절단 정규식 `\n#{2,3} ` → `\n#{1,level} `(매치 제목의 `#` 개수 파생). 실측 근거 주석 6줄 |
| `tests/agentloop-spec-signals.test.mjs` | 회귀 테스트 2건 (27 → 29) |

**실측 근거 (agentloop `2026-09-07T0401`, v0.32.3 @ `e83d6a6`).** 신호 집계는
PASS 65 · FAIL 1 · MANUAL 2 · N/A 3이었고 유일한 FAIL이 SC7 출처 태그(pass-rate 1/2)였다.
샌드박스는 지워졌지만 헤드리스 transcript(`~/.claude/projects/…-sim-tmp-2026-09-07T0401-spec-writer-{1,2}/`)
가 남아 두 시행의 spec 원문을 꺼내 판정 로직을 재실행할 수 있었다.

| 시행 | spec 구조 | 잡힌 절 | 항목 | 판정 |
|---|---|---|---|---|
| spec-writer-1 | `## 목적 / 요구사항` 아래 평면 목록 | 972 B | 10 | PASS |
| spec-writer-2 | 그 아래 `### 문제`·`### 기대 결과`·`### 요구사항` | **118 B** | **0** | FAIL |

**검증.** 저장된 실제 원문을 수정된 `rules.mjs`로 직접 채점 — w2 FAIL→PASS(항목 0→13),
w1 PASS 불변(10), 자가진단 note 양쪽 `3/5`로 리포트 원값과 동일(회귀 없음).
`npm test` fail 0 · skip 1(기존) · 이 파일 27→29. `doctor` green. `docs:check` 최신.
자매 하네스 `codex-agentloop.mjs`·`skilltest.mjs`에는 동일 절단 로직이 없어 결함은 여기 국한.

**미확정.** 수정 후 값은 저장된 원문 재채점에서 **추론**한 것이지 새 sim 런의 신호가 아니다.
리포트 본문의 신호는 수정 전 실행 결과 그대로 두었다 — 확정하려면 sim 재실행이 필요하다(미실행).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

미실행. spec `## Done evidence`가 `review: required`라 이 절이 비어 있으면 `done`이 막힌다.

## Learnings

- **sim FAIL은 하네스 결함과 스코어러 결함을 구분해야 한다.** 이번 FAIL은 하네스가 계약을
  완전히 지킨 상태에서 나왔다. 판별의 결정적 근거는 "다른 시행은 통과했고 차이는 제목 구조뿐"
  이라는 대조였다 — 단일 시행만 봤으면 하네스를 고쳤을 것이다. pass-rate(N=2) 표기가 이
  판별을 가능하게 한 장치다.
- **샌드박스가 지워져도 헤드리스 transcript는 남는다.** `~/.claude/projects/<cwd-slug>/<session>.jsonl`
  에서 에이전트가 쓴 파일 원문(Write/Edit의 `content`·`new_string`)을 꺼낼 수 있다. sim의
  FAIL 격리에 **재실행 없이** 쓸 수 있는 1차 증거이고, 과금되는 재현을 아낀다.
  주의: 한 디렉터리에 transcript가 여럿일 수 있다(이번엔 fresh와 merge 시행이 같은 cwd를 썼다)
  — `ls -t | head -1`로 최신 하나만 집으면 엉뚱한 시행을 본다.
- **절 범위를 넓히는 수정에는 "새지 않는다"는 경계 테스트가 짝으로 필요하다.** 포함 케이스만
  테스트하면 다음 절의 태그를 주워와도 통과한다. 회귀 방향이 한쪽뿐인 변경일수록 반대 방향의
  가드를 같이 넣는다.
- **소급 task의 plan은 커밋 시점 기준으로 켠다.** 메모리 `retroactive-task-plan-precheck`대로
  외부 리뷰 단계를 열어 뒀고, `Done evidence`에 `review: required`를 선언해 가드가 잡게 했다.

# eager-budget-headroom — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-25T23:26:17.042Z — claude (harness-team review)

- engine: claude · scope: worktree · tip: 7330b01041b35dd68107ab48cd54c93bd9e0dd96 · exit 0 · 4406 B

```text
전하, 판정은 **머지 전 수정 필요**입니다. P1은 없지만 P2가 2건 있습니다. 두 파일의 protocol 절은 똑같고, 압축으로 걷어 낸 근거·상세는 대부분 명령 문서에 실제로 있습니다. 문제는 순환 포인터 하나와, Cursor가 읽을 곳이 없어진 규칙 몇 개입니다.

**이상 없는 부분**
- **마커 일치:** 루트 `AGENTS.md`와 `templates/AGENTS.md.hbs`의 `harness:section="protocol"` 절(begin 63행 ~ end 161행)을 diff로 비교했고 완전히 같습니다. 다른 절의 마커 위치도 같습니다.
- **바이트 수치:** `wc -c` 실측이 `MAINTAINING.md:59`·`src/commands/doctor.mjs:542-543`의 숫자와 맞습니다(AGENTS 10,369 + CLAUDE 5,784 = 16,153 B, 전역 몫 8,423 B, 상한까지 1,347 B).
- **걷어 낸 상세가 실제로 있는 곳:**

| 걷어 낸 상세 | 있는 위치 |
|---|---|
| meta 필드, 판정 창, `reopened:` 만료 전이, 재개 후보 판정의 정본 | `commands/harness-task.md:173-199` |
| 다이어그램: 설정 키 없음, 도구 없어도 task를 실패시키지 않음, 지우지 않고 닫기, Obsidian이 script를 제거한다는 근거, 건너뛴 기록 | `commands/harness-task.md:69-116` (기록은 `diagram record --skipped`) |

- **덤으로 풀린 모순:** 예전 문서는 meta 절에서 "재개 후보 판정의 정본은 체크박스가 아니라 meta"라고 하고, plan.md 계약 절에서는 "SessionStart 재개 후보 판정도 체크박스를 본다"고 해서 서로 부딪혔습니다. 이번에 두 문장이 다 빠지면서 이 모순이 없어졌습니다.

**P2 (수정 권장)**

1. **순환 포인터 — Ontology 로그와 Done evidence 규칙을 정의하는 곳이 없어졌습니다.** `AGENTS.md:137`은 "초안 도구·Ontology 로그·spec 선언과의 연결은 harness-interview 명령 문서가 정본"이라고 넘깁니다. 그런데 `commands/harness-interview.md:43-45`는 거꾸로 "`AGENTS.md`의 plan.md 계약 (…Ontology 변경 로그 · Boundary contracts·Done evidence 연결)을 따른다"고 되넘기고, AGENTS에서는 그 항목이 이미 지워졌습니다.
   - 결과적으로 "개념이 바뀌면 plan.md `## Ontology 변경 로그`에 한 줄 → spec Ontology 절 갱신 트리거"와 "`## Done evidence`는 `done` 가드가 읽는다"는 문장이 어디에도 정의돼 있지 않습니다.
   - `harness-contrarian.md:31`의 사용처 하나만 남았습니다.
   - `templates/.claude/skills/new-feature/SKILL.md:29`도 형식 정본으로 AGENTS의 plan.md 계약을 가리키고 있어서, 가리키는 내용이 비었습니다.

2. **Cursor에게서 규칙 문장이 사라졌습니다.** `MAINTAINING.md:59`에 스스로 적은 "규칙 문장 자체는 옮기지 않습니다"와 어긋납니다. `commands/`를 못 읽는 에이전트 기준으로 잃은 규칙은 다음과 같습니다.
   - `AGENTS.md:135-137` — plan 작성 도구가 없으면 직접 쓰고 멈추지 않는다.
   - Ontology 변경 로그에 기록할 의무(1번 항목).
   - `done` 가드가 `## Done evidence`를 읽는다는 사실(1번 항목).
   - `AGENTS.md:121-124` — 다이어그램을 건너뛰면 artifact.md에 한 줄 남긴다. Claude 쪽은 `diagram record --skipped`로 채워지지만 Cursor에는 대체 경로가 없습니다.

   Boundary contracts 규칙은 task 워크플로우 목록(`AGENTS.md:126-128`)에 남아 있어서 괜찮습니다.

   **권장 수정:** `AGENTS.md:137`의 포인터 문장을 아래 규칙 한 줄로 바꾸고, `harness-interview.md:43-45`는 AGENTS를 되가리키지 말고 스스로 정본 문장을 갖게 하십시오. 추가량은 약 150–200 B로 예상하며, 여유 1,347 B 안에 들어갑니다(추정치, 실측 아님).
   > 도구가 없으면 직접 쓴다. 개념이 바뀌면 `## Ontology 변경 로그`에 한 줄. `## Done evidence`는 `done` 가드가 읽는다.

**P3 (사소)**
- `AGENTS.md:83-84` — "완료 만료의 정본"이라고만 쓰면, 재활성화하면 `status`가 `open`으로 돌아간다는 사실을 Cursor가 알 수 없습니다. 에이전트가 따라야 할 행동 규칙은 아니므로 그대로 둬도 됩니다.

**검증 범위:** diff 비교, grep, `wc -c`만 했고 `npm run test`(`tests/agent-files.test.mjs`)는 돌리지 않았습니다. 이번 리뷰는 읽기 전용이었고, 아무것도 수정하지 않았습니다.
```

<!-- harness:review kind=claude scope=worktree tip=7330b01041b35dd68107ab48cd54c93bd9e0dd96 at=2026-09-25T23:26:17.042Z -->

판별(작성 세션, 2026-09-26):
- 엔진 폴백: codex 먼저 실행 → exit 1(`401 Incorrect API key`, 인증 문제·증거 미기록) → claude로 내려감. vendor 분리 없음(컨텍스트 분리만).
- P2-1 순환 포인터 — **진짜 결함.** `commands/harness-interview.md:42-45`가 "AGENTS.md의 plan.md 계약(…Ontology 변경 로그·Done evidence 연결)"을 가리키는데 AGENTS 쪽 문장을 걷어 냈다. `new-feature` 스킬 템플릿도 같은 포인터.
- P2-2 Cursor 규칙 손실 — **진짜 결함.** writer 부재 시 직접 쓰기·Ontology 로그 기록·Done evidence를 가드가 읽음·건너뛴 다이어그램 기록이 `commands/`를 못 읽는 에이전트에게 사라졌다. spec 제약("규칙 문장은 남긴다") 위반.
- P3 `status → open` 만료 — 행동 규칙이 아니라 상태 설명이라 수용하지 않음(정본 harness-task.md:192).
- 조치: 전하 확인 후 AGENTS plan.md 계약에 규칙 문장 복원(추정 +150~250 B), harness-interview 포인터는 그대로 두어도 순환이 풀린다.

### 2026-09-25T23:32:34.140Z — claude (harness-team review)

- engine: claude · scope: worktree · tip: 7330b01041b35dd68107ab48cd54c93bd9e0dd96 · exit 0 · 4278 B

```text
**판정: P1 없음, P2 1건, P3 3건.** 병합을 막을 결함은 없습니다. 다만 P2는 병합 전에 한 줄 고치시길 권합니다.

**요청하신 4가지 확인**
- **protocol 마커:** 루트 `AGENTS.md`와 `templates/AGENTS.md.hbs`의 `protocol` 절은 바이트 단위로 같습니다(sed 추출 후 diff). `npm run test`는 fail 0으로 통과했습니다.
- **바이트 수치:** MAINTAINING.md와 `src/commands/doctor.mjs:542-543`의 수치가 `wc -c`와 맞습니다.
  - AGENTS.md는 10,564 B, CLAUDE.md는 5,784 B입니다.
  - 합계 16,348 B이고, 24,576 − 16,348 = 8,228 B입니다.
  - `PROJECT_EAGER_MAX_BYTES` 기준 여유는 17,500 − 16,348 = 1,152 B입니다.
- **순환 포인터:** 해소됐습니다. AGENTS의 "상세 정본은 각 원 위치이고 이 목록은 색인" 문장이 빠져, 이제 참조는 interview에서 AGENTS 한 방향뿐입니다. 덤으로, 예전 AGENTS에서 "재개 후보 판정은 plan 체크박스를 본다"와 "정본은 meta 값"이 서로 어긋나던 부분도 사라졌습니다. `commands/harness-task.md:196`이 정본을 meta로 두므로 맞는 방향입니다.
- **Cursor용 규칙 손실:** 규칙 문장은 남아 있습니다. 체크박스 선체크 금지, 미완 체크박스가 `done`을 막는다는 점, Ontology 변경 로그, Done evidence, 다이어그램 1회 질문과 지우지 않고 닫기, meta.json 수동 수정 금지가 모두 있습니다. plan.md 계약 절에서 빠진 다이어그램과 Boundary contracts 항목도 같은 파일의 task 워크플로우 절(다이어그램·경계 계약 항목)에 그대로 있습니다.

**P2 — 병합 전 수정 권장**
- **`AGENTS.md:122-123` (템플릿 동일):** 다이어그램을 건너뛸 때의 절차가 정본과 어긋납니다.
  - 새 문장은 "`- [x] … — 미실행(도구 없음)`으로 **손으로 닫고**, 그다음 `diagram record --skipped`로 기록"하라고 합니다.
  - 그런데 `commands/harness-diagram.md:73-75`는 "이 한 명령이 plan 단계를 닫는다. **두 파일을 손으로 고치지 않는다**"고 합니다.
  - 실제로 손으로 먼저 닫으면 `closeDiagramStep`이 `already-closed`를 돌려줘 오류는 나지 않습니다. 하지만 plan의 사유는 손으로 쓴 것, artifact의 사유는 CLI 인자로, 두 곳에 따로 남을 수 있습니다.
  - 이 문서만 읽는 Cursor에게는 정본이 금지한 순서를 가르치는 셈입니다.
  - 수정안: "도구가 없으면 그 단계를 **지우지 말고** `harness-team diagram record --skipped "<사유>"`로 닫는다(plan 단계와 artifact 기록을 한 명령이 한다)." 바이트도 오히려 줄어듭니다.

**P3 — 사소한 지적**
- **`commands/harness-interview.md:43-45`:** 괄호 안 요약에 "다이어그램 옵트인 체크박스는 상태"와 "Boundary contracts"가 남아 있습니다. 두 항목은 이제 AGENTS의 "plan.md 계약" 절에 없고 task 워크플로우 절로 갔습니다. 순환은 아니고 설명이 조금 낡은 정도라서, 괄호를 줄이거나 "task 워크플로우 절 포함"으로 넓히면 됩니다.
- **`AGENTS.md:124`:** "자립형 inline SVG**로 쓴다**"라는 지시가 "자립형 inline SVG**이고**"라는 서술로 약해졌습니다. Cursor는 `harness-diagram.md`를 읽지 못하니 지시형으로 되돌리는 편이 안전합니다(바이트 차이는 거의 없습니다). 같은 곳의 123행이 "자립형"에서 짧게 끊기는 줄바꿈도 함께 정리하면 좋겠습니다.
- **plan.md 계약 절:** "`superpowers:writing-plans`가 있으면 그것으로 쓴다"는 선호가 빠졌습니다. Cursor에는 어차피 해당이 없고 interview와 new-feature 문서에 남아 있으니 규칙 손실로 보지는 않습니다.

제가 직접 확인하지 않은 범위도 있습니다. `diagram record` 동작은 코드로만 읽었고 실행해 보지 않았습니다. 또 문장이 담은 의미가 같은지는 사람이 읽고 판단한 것이라, 테스트가 보장하는 범위가 아닙니다.

**다음 단계:** 수정은 하지 않았습니다. P2 한 줄은 루트와 템플릿을 함께 고쳐야 하고, 고친 뒤 `wc -c`로 수치를 다시 재야 합니다. 말씀해 주시면 그렇게 진행하겠습니다.
```

<!-- harness:review kind=claude scope=worktree tip=7330b01041b35dd68107ab48cd54c93bd9e0dd96 at=2026-09-25T23:32:34.140Z -->

판별(작성 세션, 2026-09-26):
- 엔진: codex 재로그인(`codex login` 성공, `login status` = ChatGPT) 후에도 `401 Incorrect API key sk-svcac…` —
  로컬 auth.json·env·config에 해당 키 없음, 계정/서버 측 추정(미검증). `-p headless`는 `~/.codex/headless.config.toml`
  부재로 무효. claude로 재리뷰.
- 첫 리뷰 P2 두 건은 해소 확인됨(순환 포인터·Cursor 규칙 문장).
- P2 다이어그램 건너뛰기 순서 — **진짜 결함(이 task가 넣은 문장).** `commands/harness-diagram.md:73-75`는 CLI가
  plan 단계를 닫고 손으로 고치지 말라는데 AGENTS 문장은 손으로 닫은 뒤 CLI를 부르라고 했다. `record --skipped`가
  닫는다로 수정.
- P3 `commands/harness-interview.md:43-45` 괄호 요약 낡음 — 수용, 두 절로 나눠 가리키게 수정.
- P3 inline SVG 서술형 약화 — 수용, "로 쓰고"로 복원.
- P3 writing-plans 선호 누락 — 오탐 아님이나 Cursor 무관·lazy 정본에 있음, 조치 없음.
- 최종 실측: AGENTS 10,641 + CLAUDE 5,784 = 16,425 B(여유 1,075 B). `npm test` 1032/0 fail, `docs:check` PASS.

## Learnings

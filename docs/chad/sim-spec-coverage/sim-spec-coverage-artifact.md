# sim-spec-coverage — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`tests/sim/agentloop.mjs`에 **SC7** 추가 — `/harness-spec`의 결정적 산출물을 전용 샌드박스에서
검증한다. sim 커버리지 0건이던 커맨드가 이제 9개 신호로 관측된다.

### 변경 파일
| 파일 | 내용 |
|---|---|
| `tests/sim/agentloop.mjs` | SC7 시나리오 · `na()` 헬퍼 · `➖` 아이콘 · 엔트리 가드 · 순수 함수 4종 export |
| `tests/agentloop-spec-signals.test.mjs` | 신규 — 채점 로직 단위 테스트 17건 (토큰 없이 CI 검증) |

### 설계 결정
- **SC5 일반화 기각, SC7 신설.** SC5는 `canon.dir`(SC3·SC4 공유)에서 돈다. `/harness-spec`은
  writer라 spec.md·config.json을 쓴다 — 공유 샌드박스를 오염시킨다. 게다가 SC4가 끝에서
  `active.json`을 null로 만들어, 그 자리에서 실행하면 절차 1단계(활성 task 없음)로 빠져
  **아무것도 검증하지 못한 채** 신호가 SC4 실행 순서에 결합된다. SC5·SC6은 손대지 않았다.
- **프롬프트 접기.** `runHeadless`는 단발 `claude -p`라 멀티턴 인터뷰를 재현할 수 없다.
  사람이 할 답변(소스 선택 · Confluence baseUrl/spaceKey/본문 · Goal/Constraint/Success/Context/
  Ontology)을 프롬프트에 미리 심어 단일 턴으로 접고, 결정적 산출물만 채점한다.
- **인계 문구는 `result`로만 채점.** transcript에는 확장된 커맨드 본문
  (`commands/harness-spec.md`가 `/harness-interview`를 여러 번 언급)이 그대로 섞여 **무조건 참**이 된다.
  파일·git 어디에도 안 남는 산문이 유일한 관측면이므로 라벨에 `[산문 예외]`를 달고 리포트 각주로 선언한다.
- **P1 회귀는 강제로 태운다.** 계약상 writer는 마지막 가중합 항목을 스스로 체크하지 않으므로
  (그건 validator 몫) 실사용 초안은 5/5에 도달하지 못한다 — 실제 초안은 2/5~4/5로 갈렸다.
  `forceAllChecked()`로 merge 재실행 전 상태를 5/5로 만들어야 "전 항목 체크여도 인계하는가"가
  약한 분기가 아닌 **실제 분기**에서 검증된다.
- **trial 접기.** 에이전트 산출물은 결정적이지 않다. 한 번 통과했다고 PASS로 굳히면 리포트가
  실제보다 강해 보인다 → `aggregateTrials()`가 SC5 관용구대로 pass-rate + FLAKY로 접는다.
- **순수 함수 분리.** sim 실행에는 OAuth 토큰이 필요하지만 채점 로직은 토큰 없이 CI가 고정한다.
  선례: `codex-agentloop.mjs` `parseCodexJsonl` + `tests/codex-agentloop-parser.test.mjs`.
  같은 선례의 엔트리 가드를 `agentloop.mjs`에도 넣어 import 시 `probe`가 도는 것을 막았다.

### 실행 증거 — `node tests/sim/agentloop.mjs sc7` (2026-08-24T1840, v0.18.1, 최종 코드)

```
### SC7 — /harness-spec 초안 생성 (프롬프트 접기)
- ✅ fresh 초안 run 완주 (pass-rate 2/2)
- ✅ 네임스페이스 슬래시 해석 (pass-rate 3/3)
- ✅ 요구사항 항목에 (interview) 출처 태그 (pass-rate 2/2)
- ✅ Ambiguity 자가진단 절 + 체크박스 생성 (pass-rate 2/2)
- ✅ harness-interview 인계 [산문 예외] (pass-rate 2/2)
- ✅ specSources 저장값 일치 (.harness/config.json) (pass-rate 2/2)
- ✅ config 기존 user 값 보존 (read-modify-write) (pass-rate 2/2)
- ✅ merge 실행 완주 + spec 실제 갱신
- ✅ merge 분기 — 알 수 없는 절 보존
- ✅ merge 후에도 인계 [산문 예외 · P1 회귀 감시] — 자가진단 사전 5/5 → 사후 5/5
- ➖ Confluence/Figma MCP fetch · ➖ 멀티턴 인터뷰 UX · ➖ replace/cancel 분기
```

> **이 출력을 "SC7은 항상 그린"으로 읽지 말 것.** 총 4회 실행 중 2회는 출처 태그 신호가
> `1/2 — FLAKY`로 떨어졌다(아래 발견 (2)). 에이전트 산출물 신호이므로 pass-rate가 곧 결과다.

**실행 비용:** SC7 1회 = `claude -p` 3회(fresh 2 trial + merge 1). trial마다 **독립 샌드박스**.
`sc7` 단독 서브커맨드로 SC1~SC6 매트릭스 비용 없이 돌릴 수 있고,
`SIM_KEEP_SANDBOX=1`이면 진단용으로 산출물을 남긴다.

### 테스트
- `node --test tests/agentloop-spec-signals.test.mjs` — 27/27 통과 (인증 불필요)
- `npm run test` — **415 tests · 413 pass · 1 fail(main 상속) · 1 skipped**. 그린이 아니다.
  유일한 FAIL은 `tests/what-changes-latest-version.test.mjs`의
  `docs/what-changes-0.18.1.html` ENOENT로, **이 브랜치와 무관한 선재 실패**다
  (`git ls-tree origin/main docs/ | grep what-changes-0.18` → `0.18.0`만 존재).
  0.18.1 범프가 what-changes 문서 없이 나간 결과이며 병렬 워커 `-20`(release-0181-recovery) 소관이라
  건드리지 않았다.
- `node tests/sim/agentloop.mjs sc6` — 회귀 없음 (엔트리 가드 추가 후 재확인, 전 신호 PASS/MANUAL)
- **CI (PR #39, Node 18·20)** — red. **main 상속 실패**이며 이 브랜치가 원인이 아니다:
  main의 `f8d6b6d`(0.18.1 범프) CI 자체가 `failure`이고(직전 `0f85bd9`·`a89d522`는 success),
  `docs/what-changes-0.18.1.html`이 `origin/main`에 없다. 로컬 Node 20 재현 결과도
  `413 pass · 1 fail(main 상속)`로 동일한 단일 ENOENT뿐이다. 해당 경로는 병렬 세션
  (`release-0181-recovery`) 소유라 의도적으로 건드리지 않았다 — 근거는 PR #39 코멘트에 기록.
- `npm run docs:check` — 그린. 테스트 파일 추가가 `docs/harness-overview.html`의 테스트 인벤토리
  행을 바꾸므로 `npm run docs:generate`로 재생성했다.

### 발견 2건 — `/harness-spec` 산출물의 비결정성 (조치 안 함, 범위 밖)

#### (1) `specSources` 저장을 건너뛴 실행이 있다

SC7을 여러 번 실행하는 동안 fresh 초안 실행 중 **1회에서 `specSources`가 `.harness/config.json`에
저장되지 않았다**. 이후 실행은 모두 통과했으므로 측정된 비율이 아니라 **간헐 관측 1건**으로 읽어야 한다.

**재현 조건 (후속 task용 — 관측 시점의 정확한 상태)**

- 관측 실행: 2026-08-24T1748 (`node tests/sim/agentloop.mjs sc7`, plugin v0.18.1 마켓플레이스 캐시)
- **config 파일 상태: 실행 전 `{"user": "simbot"}` 만 있었고(파일 부재 아님 —
  `harness-team apply --yes`의 `ensureUsername`이 직전에 만든 상태), 실행 후에도
  `specSources` 키가 없었다.**
- **커맨드가 config를 읽었는지는 판정 불가다.** 당시 보존 신호는 값 동등성만 봤는데,
  기대값을 실행 직전 파일에서 읽으므로 *커맨드가 파일을 아예 건드리지 않아도* 참이 된다.
  그 PASS는 "읽기는 됐다"의 증거가 아니었다(2026-08-24 오케스트레이터 지적 → 아래 조치).
  **"읽기는 되는데 쓰기만 스킵"으로 단정하지 말 것** — 관측된 것은 위 두 줄뿐이다.
- **프롬프트 형태: 값이 질문이 아니라 선주입으로 주어졌다.** 네임스페이스 슬래시 +
  "Do NOT ask any questions" 지시 + `[소스 선택] confluence + interview` +
  `[Confluence 기본 위치] baseUrl=… · spaceKey=…` 한 줄 + 본문 붙여넣기(MCP 미연결 폴백) +
  인터뷰 답변 일괄 제공. `sc7DraftTrial`의 `freshSpecPrompt()`가 정본이다.
- 같은 실행에서 spec 초안·출처 태그·자가진단·인계 문구는 모두 정상이었다 —
  **커맨드 전체가 실패한 게 아니라 절차 4의 저장 단계만 건너뛴 것이다.**

가설: 절차 4 문구가 `누락된 필드만 AskUserQuestion으로 lazy 수집해 저장한다`이므로,
물어볼 필드가 없으면(선주입) "수집이 없었으니 저장도 없다"로 읽힐 수 있다.
README·CHANGELOG는 "첫 실행 시 lazy로 입력받아 저장한다"고 적어 저장을 전제한다 — 두 문서가 어긋난다.

#### (2) 요구사항 출처 태그 신호가 간헐적으로 FAIL한다 — **원인 미확정**

`요구사항 항목에 (interview) 출처 태그` 신호가 **fresh 초안 6회 중 2회 FAIL**
(SC7 실행 3회: 1/2 · 1/2 · 2/2). 계약 절차 6은 "요구사항은 항목별로 출처를 표기한다"이다.

**FAIL 실행의 산출물을 확보하지 못했다(당시 샌드박스가 정리됨) — 따라서 원인은 미확정이다.**
후보를 좁히지 못한 채로 남긴다:

| 후보 | 배제됐나 |
|---|---|
| (a) writer가 계약대로 태그를 안 붙였다 | **미배제** — 술어를 넓힌 뒤에도 재현돼 심증은 여기 있다 |
| (b) 태그는 붙었는데 절 구조가 달라 `sectionBody`가 요구사항 절을 못 잡았다 | **미배제** — 아래 참조 |
| (c) 그 실행의 초안 자체가 다른 형태로 나왔다 | **미배제** |

(b)를 배제하지 못하는 이유를 명확히 해 둔다: 술어를 넓힐 때 **항목 표기** 쪽
(`\d+\.` 번호 목록 · 괄호 안 `interview` 단어 매칭)과 **절 검출** 쪽
(`^#{2,3} 목적` → `^#{2,3} .*(?:목적|요구사항)`)을 둘 다 넓혔지만, 절 검출은 여전히 heading에
`목적` 또는 `요구사항`이 **포함**되어야 한다. writer가 `## Requirements`나 `## 배경 및 범위`
같은 제목을 썼다면 절을 통째로 못 잡고, 태그가 정상이어도 FAIL한다.

통과한 실행의 실제 표기는 두 형태 모두 계약을 지켰다 (샌드박스 보존으로 확인):
- `- 결제 실패 건을 자동 재시도해 … (interview)` — 항목 끝 태그
- `1. (interview) **Goal**: …` — 항목 앞 태그, 번호 목록

재발 시 원인이 자동으로 갈리도록 두 가지를 넣었다:
- 신호 FAIL 시 note가 스스로 진단한다 — `요구사항 절 미검출`이면 (b),
  `요구사항 절 항목 N개, 괄호 태그 미검출`이면 (a)/(c) 쪽이다
- `SIM_KEEP_SANDBOX=1 node tests/sim/agentloop.mjs sc7` 로 샌드박스를 보존해 원문 확인

**알려진 술어 한계:** 요구사항을 목록이 아니라 **표**로 쓰면 이 신호는 FAIL한다.
계약이 "항목별"이라고만 하므로 표도 계약 위반은 아니다 — 재발 note에 `항목 0개`가 찍히면 이 경우다.

**그린으로 만들지 않는다.** 2/6 FAIL은 sim의 결함이 아니라 sim이 제 역할을 한 증거다.
여기서 술어를 더 느슨하게 하면 이 task가 차단한 false-PASS 7건에 스스로 8번째를 보태는 것이다.

이 신호는 pass-rate로 접히므로 조용히 초록이 되지 않는다. 커맨드 계약을 조일지는
`spec-writing-skill` 소유자 판단이라 여기서는 조치하지 않았다.

#### 두 발견의 관계 — 별개 버그로 흩어 놓지 말 것

(1) `specSources` 저장 스킵과 (2) 출처 태그 누락은 **같은 패턴**이다:
**값을 선주입한 프롬프트에서 writer가 계약의 특정 단계를 간헐적으로 건너뛴다.**
(1)은 절차 4(저장), (2)는 절차 6(항목별 출처 표기)이고, 둘 다 커맨드 전체가 실패한 게 아니라
**한 단계만** 빠졌으며, 둘 다 재현이 간헐적이다.

후속 task는 이 둘을 개별 버그가 아니라 **단일 원인 가설**에서 출발하는 편이 낫다 —
예컨대 "대화형 상호작용 없이 한 턴에 전부 처리할 때 긴 절차의 중간 단계 준수율이 떨어진다"가
성립하면 두 증상이 함께 설명된다. 반대로 (2)의 원인이 위 표의 (b)로 판명되면 이 관계는 깨지고
(1)만 남는다 — 그래서 (2)의 원인 확정이 후속 task의 첫 단계여야 한다.

근본 원인 후보는 계약 문구의 모호성이다 — `commands/harness-spec.md` 절차 4:

> 누락된 필드만 AskUserQuestion으로 lazy 수집해 **저장한다**

값이 *질문을 통해* 들어오지 않고 프롬프트에 **미리 주어졌을 때**도 저장 대상인지가 명시돼 있지
않다. 반면 README·CHANGELOG는 "첫 실행 시 lazy로 입력받아 저장한다"고 적어 저장을 전제한다.
에이전트가 "물어볼 게 없으니 저장할 것도 없다"로 읽으면 건너뛴다.

- **조치하지 않은 이유:** 이 task의 범위는 sim 커버리지다. 커맨드 계약 변경은 0.18.0으로 출시된
  writer의 동작을 바꾸는 일이라 `spec-writing-skill` 소유자·사용자 판단 사항이다.
- **재발 감시:** `aggregateTrials()`가 이 신호를 pass-rate로 접으므로, 다시 발생하면
  `pass-rate 1/2 — FLAKY`로 리포트에 드러난다. 조용히 초록으로 넘어가지 않는다.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-08-24 — Codex read-only 리뷰 (`origin/main...HEAD` diff)

`codex exec --sandbox read-only`, 대상 tip `ebde207`. 판정 **Request changes** — P1 2건 / P2 4건 / P3 0건.
Gemini는 CLI 미설치로 **미실행**. 6건 전부 코드에서 재현·대조해 **모두 진짜 결함**으로 판별했고 조치했다.
공통 주제는 하나다 — *신호가 통과하는데 정작 검증하려던 일은 일어나지 않을 수 있다*(false PASS).

| # | 심각도 | 발견 | 판별 | 조치 |
|---|---|---|---|---|
| 1 | P1 | `user`가 **비어있지 않은지**만 봐서, 다른 값으로 덮어써져도 read-modify-write 보존이 PASS | 진짜 | `expectedUser`를 채점기에 넘겨 **값 동등성**으로 판정 |
| 2 | P1 | sentinel을 우리가 직접 심고 잔존만 검사 → merge가 실패·무동작이어도 보존 신호 PASS | 진짜 | `merge 실행 완주 + spec 실제 갱신` 신호 신설. 보존 신호를 `mergeRan`으로 게이트 |
| 3 | P2 | `specSources.confluence = {}` 나 무관한 `figma`만 있어도 저장 신호 PASS | 진짜 | 프롬프트로 준 `baseUrl`·`spaceKey`와 **저장된 값을 대조** |
| 4 | P2 | `(interview)`가 문서 아무 데나 있으면 PASS | 진짜 | **요구사항 절 안의 목록 항목**에 붙었는지로 좁힘 |
| 5 | P2 | `Ambiguity 자가진단` 문자열만 있으면 PASS (heading·체크박스 없어도) | 진짜 | 실제 heading + 체크박스 존재(`total > 0`) 요구 |
| 6 | P2 | fresh trial들이 샌드박스를 공유하고 config만 초기화 → pass-rate가 독립 시행이 아님 | 진짜 | `sc7DraftTrial()`로 **trial마다 독립 샌드박스 + apply + task** |
| + | 추가 | 트리거 판정이 `a.ok`를 안 봐서 타임아웃·spawn 실패가 PASS로 집계 | 진짜 | 모든 트리거·인계 판정에 `a.ok` 추가 |

조치 후 재검증: `node --test tests/agentloop-spec-signals.test.mjs` 21/21 (강화된 술어의 반례
테스트 4건 추가), `node tests/sim/agentloop.mjs sc7` 전 신호 PASS/N-A (위 실행 증거), `npm run test`
**407 pass / 1 fail(main 상속) / 1 skipped** — 이 브랜치가 만든 실패는 0건이지만 스위트는 그린이 아니다.

리뷰 프로토콜의 review-only 원칙과의 관계: 리뷰 실행 중에는 아무것도 고치지 않았고, 리뷰 종료 후
발견을 판별한 뒤 별도로 조치했다. 조치 내용은 위 표와 커밋에 남긴다.

<!-- harness:review kind=codex scope=diff tip=ebde207 at=2026-08-24T09:20:00Z -->

### 2026-08-24 — 오케스트레이터 지적 (false-PASS 7번째) — 조치 완료

`config 기존 user 값 보존 (read-modify-write)` 신호가 **쓰기가 없었던 경우와 보존한 경우를
구분하지 못했다.** `expectedUser`를 실행 **직전 파일**에서 읽으므로 커맨드가 config를 아예
건드리지 않아도 `config.user === expectedUser`가 참이 된다. 유닛 테스트
(`specSources 미저장 → … user 보존은 PASS`)가 이 false-PASS를 **의도된 동작으로 못박고
있었다** — 회귀 방지가 아니라 회귀 고정이었다.

조치:
1. 실행 전 config 원문(`configBefore`)을 채점기에 넘겨 **쓰기 발생을 먼저 확인**한다.
   쓰기가 없으면 PASS가 아니라 `➖ N/A — 쓰기 미발생, 보존 여부 판정 불가`.
2. 그 유닛 테스트를 정반대 단언으로 교체하고, "쓰기는 있었는데 specSources 값이 틀린 경우"
   (쓰기가 있었으니 user가 날아갔을 수 있다 → 도망가지 않고 판정한다)와
   "실행 전 원문 미확보 → N/A"를 반례로 추가했다.
3. `aggregateTrials`가 N/A를 FAIL로 접던 것을 고쳤다 — 전부 N/A면 N/A, 일부만 N/A면
   (FAIL이 없어도) "모든 trial에서 성립했다"를 주장할 수 없으므로 N/A, FAIL이 섞이면 FAIL.

> **게이트 기준 선택 (지시와의 차이 명시):** 지시는 "`sourcesSaved`가 false면 N/A"였으나
> **파일 변경 자체**를 증거로 삼았다. `sourcesSaved`는 값 일치 검사라, 커맨드가 `specSources`를
> *틀린 값으로* 쓰면서 `user`를 날려도 false가 되어 N/A로 빠진다 — 쓰기가 일어났고 보존이
> 깨진 진짜 결함을 판정 불가로 숨긴다. 파일 변경 기준은 "쓰기 없음"을 똑같이 N/A로 잡으면서
> 그 구멍을 닫는다. 지시의 의도(쓰기 없이 보존을 주장하지 않는다)는 그대로 만족한다.

<!-- harness:review kind=orchestrator scope=diff tip=d8d6076 at=2026-08-24T09:40:00Z -->

## Learnings

- **정규식 `$`에 `/m`을 붙이면 절이 한 줄로 잘린다.** `ambiguityCounts`의 첫 구현이
  `(?=\n#{2,3} |$)/m`으로 절 끝을 잡으려다 첫 줄에서 멈춰 체크 5개를 1개로 셌다.
  단위 테스트("미체크가 섞이면 카운트가 그대로 보고된다")가 잡았다 —
  **채점 함수를 순수하게 떼어내지 않았다면 sim을 3회 돌리고도 못 봤을 버그다.**
- **에이전트 산출물 신호는 1회 관측으로 굳히면 안 된다.** 첫 SC7 실행은 전 신호 초록이었는데
  두 번째에서 `specSources`가 빠졌다. 단일 trial이었으면 "검증됐다"고 잘못 보고했을 것이다.
- **transcript는 증거로 더 강해 보이지만 오염된다.** 슬래시 커맨드는 확장되면서 커맨드 본문 전체를
  대화에 밀어 넣는다 — 커맨드가 언급하는 문자열은 transcript에서 항상 참이다.
  "파일에 남는 증거가 더 강하다"는 일반 원칙이 여기선 역전된다.
- **계약이 금지한 상태는 테스트가 만들어 줘야 한다.** writer는 마지막 자가진단 항목을 스스로
  체크하지 않도록 계약돼 있어, 실사용 초안으로는 "전 항목 체크" 분기에 도달할 수 없다.
  검증하려면 그 상태를 인위적으로 세팅해야 한다.
- **"통과했다"와 "검증했다"는 다르다.** codex 리뷰 6건이 전부 같은 형태였다 — 신호는 PASS인데
  정작 검증하려던 일(값 보존 · merge 실제 실행 · 저장된 값)은 일어나지 않았을 수 있었다.
  내가 직접 심은 sentinel의 잔존을 "보존됐다"의 증거로 쓴 것이 대표적이다.
  **테스트가 스스로 만든 상태를 증거로 재사용하지 말 것.**
- **샌드박스 공유는 pass-rate의 의미를 조용히 갉아먹는다.** config만 되돌리면 독립처럼 보이지만
  앞 trial의 산출물이 남는다. 준비가 CLI라 저렴하면 그냥 매번 새로 만든다.
- **테스트 파일 추가가 문서 생성물을 바꾼다.** `docs/harness-overview.html`은 테스트 인벤토리를
  포함하므로 `npm run docs:generate`가 커밋 전 체크리스트에 포함돼야 한다.
- **기대값을 검사 직전 상태에서 읽으면 그 검사는 항상 참이다.** `expectedUser`를 실행 직전
  config에서 읽고 실행 후 값과 비교했으니, 커맨드가 파일을 안 건드려도 통과했다.
  **"보존됐다"를 주장하려면 먼저 "쓰기가 있었다"를 증명해야 한다** — sentinel 잔존 문제와 같은 형태다.
  두 번 같은 함정을 밟았다는 게 요점이다: *테스트가 스스로 만든 상태를 증거로 재사용하지 말 것.*
- **유닛 테스트가 false-PASS를 고정할 수 있다.** 지금 동작을 그대로 단언하면 회귀 방지가 아니라
  회귀 고정이 된다. 신호를 고칠 때는 그 신호를 검증하던 테스트가 **무엇을 계약으로 못박고 있었는지**
  먼저 읽어야 한다.
- **"산출물을 못 봤다"고 쓰고서 원인을 단정하면 앞 문장이 뒷문장을 반박한다.** 출처 태그 FLAKY를
  "writer 비결정성이다"로 결론냈는데, 바로 위에 "FAIL 실행의 산출물은 확보하지 못했다"고 적어
  놓은 상태였다. 술어를 넓힌 뒤에도 재현됐다는 건 심증을 키울 뿐 절 검출 실패 가능성을 배제하지
  못한다. **미확정은 미확정으로 적고 후보를 나열하는 것이 후속 작업자에게 더 쓸모 있다.**
- **FLAKY를 그린으로 만들고 싶은 압력이 곧 false-PASS의 출처다.** 신호가 절반만 통과하면 술어를
  느슨하게 하고 싶어진다. 계약에 근거한 확장(결합 표기 허용)과 통과시키기 위한 완화는 다르고,
  구분 기준은 "계약 문서가 그 형태를 허용하는가"이지 "이번에 통과하는가"가 아니다.

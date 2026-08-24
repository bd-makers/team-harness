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

### 실행 증거 — `node tests/sim/agentloop.mjs sc7` (2026-08-24T1809, v0.18.1, codex 리뷰 조치 후)

```
### SC7 — /harness-spec 초안 생성 (프롬프트 접기)
- ✅ fresh 초안 run 완주 (pass-rate 2/2)
- ✅ 네임스페이스 슬래시 해석 (pass-rate 3/3)
- ✅ 요구사항 항목에 (interview) 출처 태그 (pass-rate 2/2)
- ✅ Ambiguity 자가진단 절 + 체크박스 생성 (pass-rate 2/2)
- ✅ harness-interview 인계 [산문 예외] (pass-rate 2/2) — 자가진단 3/5 체크 상태 · 자가진단 3/5 체크 상태
- ✅ specSources 저장값 일치 (.harness/config.json) (pass-rate 2/2)
- ✅ config 기존 user 값 보존 (read-modify-write) (pass-rate 2/2)
- ✅ merge 실행 완주 + spec 실제 갱신
- ✅ merge 분기 — 알 수 없는 절 보존
- ✅ merge 후에도 인계 [산문 예외 · P1 회귀 감시] — 자가진단 사전 5/5 → 사후 4/5
- ➖ Confluence/Figma MCP fetch — 라이브 MCP·실인증 필요 — 붙여넣기 폴백만 태움
- ➖ 멀티턴 인터뷰 UX — runHeadless는 단발 claude -p — 답변 선주입으로 접음
- ➖ 기존 spec replace/cancel 분기 — AskUserQuestion 응답 필요 — merge 기본값만 검증

(fresh 초안 2 trial + merge 1회 = 에이전트 3회 · 트리거 3/3)
```

> `사후 4/5`는 merge 재실행이 마지막 가중합 항목을 다시 열었다는 뜻으로, 계약대로 writer가
> 자기 채점을 하지 않은 결과다. 인계 문구는 **사전 5/5(전 항목 체크) 상태에서** 관측됐다.

**실행 비용:** SC7 1회 = `claude -p` 3회(fresh 2 trial + merge 1). `sc7` 단독 서브커맨드로
SC1~SC6 매트릭스 비용 없이 돌릴 수 있다. fresh trial은 각자 **독립 샌드박스**를 쓴다.

### 테스트
- `node --test tests/agentloop-spec-signals.test.mjs` — 21/21 통과 (인증 불필요)
- `npm run test` — **409 tests · 407 pass · 1 fail · 1 skipped**.
  유일한 FAIL은 `tests/what-changes-latest-version.test.mjs`의
  `docs/what-changes-0.18.1.html` ENOENT로, **이 브랜치와 무관한 선재 실패**다
  (`git ls-tree origin/main docs/ | grep what-changes-0.18` → `0.18.0`만 존재).
  0.18.1 범프가 what-changes 문서 없이 나간 결과이며 병렬 워커 `-20`(release-0181-recovery) 소관이라
  건드리지 않았다.
- `node tests/sim/agentloop.mjs sc6` — 회귀 없음 (엔트리 가드 추가 후 재확인, 전 신호 PASS/MANUAL)
- `npm run docs:check` — 그린. 테스트 파일 추가가 `docs/harness-overview.html`의 테스트 인벤토리
  행을 바꾸므로 `npm run docs:generate`로 재생성했다.

### 발견 — `/harness-spec`의 specSources 저장이 간헐적이다 (조치 안 함, 범위 밖)

SC7을 여러 번 실행하는 동안 fresh 초안 실행 중 **1회에서 `specSources`가 `.harness/config.json`에
저장되지 않았다** (`user` 키는 남아 있었으므로 파일 자체는 정상). 이후 실행은 모두 통과했으므로
측정된 비율이 아니라 **간헐 관측 1건**으로 읽어야 한다.

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
407 pass / 1 선재 fail.

리뷰 프로토콜의 review-only 원칙과의 관계: 리뷰 실행 중에는 아무것도 고치지 않았고, 리뷰 종료 후
발견을 판별한 뒤 별도로 조치했다. 조치 내용은 위 표와 커밋에 남긴다.

<!-- harness:review kind=codex scope=diff tip=ebde207 at=2026-08-24T09:20:00Z -->

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

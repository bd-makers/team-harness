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

### 실행 증거 — `node tests/sim/agentloop.mjs sc7` (2026-08-24T1754, v0.18.1)

```
### SC7 — /harness-spec 초안 생성 (프롬프트 접기)
- ✅ agent run 완주 (pass-rate 2/2)
- ✅ 네임스페이스 슬래시 해석 (pass-rate 3/3)
- ✅ spec 요구사항에 (interview) 출처 태그 (pass-rate 2/2)
- ✅ spec에 Ambiguity 자가진단 절 존재 (pass-rate 2/2)
- ✅ harness-interview 인계 [산문 예외] (pass-rate 2/2) — 자가진단 4/5 체크 상태 · 자가진단 2/5 체크 상태
- ✅ specSources lazy 저장 (.harness/config.json) (pass-rate 2/2)
- ✅ config 기존 키 user 보존 (read-modify-write) (pass-rate 2/2)
- ✅ merge 분기 — 알 수 없는 절 보존
- ✅ merge 후에도 인계 [산문 예외 · P1 회귀 감시] — 자가진단 사전 5/5 → 사후 5/5
- ➖ Confluence/Figma MCP fetch — 라이브 MCP·실인증 필요 — 붙여넣기 폴백만 태움
- ➖ 멀티턴 인터뷰 UX — runHeadless는 단발 claude -p — 답변 선주입으로 접음
- ➖ 기존 spec replace/cancel 분기 — AskUserQuestion 응답 필요 — merge 기본값만 검증

(fresh 초안 2 trial + merge 1회 = 에이전트 3회 · 트리거 3/3)
```

> 이 출력 이후 적용된 변경은 note 구분자 정리(FLAKY가 아닐 때 앞의 `· ` 제거) 한 건뿐이며,
> 단위 테스트로 고정했다. 신호 판정 로직은 그대로다.

**실행 비용:** SC7 1회 = `claude -p` 3회(fresh 2 trial + merge 1). `sc7` 단독 서브커맨드로
SC1~SC6 매트릭스 비용 없이 돌릴 수 있다.

### 테스트
- `node --test tests/agentloop-spec-signals.test.mjs` — 17/17 통과 (인증 불필요)
- `npm run test` — **405 tests · 403 pass · 1 fail · 1 skipped**.
  유일한 FAIL은 `tests/what-changes-latest-version.test.mjs`의
  `docs/what-changes-0.18.1.html` ENOENT로, **이 브랜치와 무관한 선재 실패**다
  (`git ls-tree origin/main docs/ | grep what-changes-0.18` → `0.18.0`만 존재).
  0.18.1 범프가 what-changes 문서 없이 나간 결과이며 병렬 워커 `-20`(release-0181-recovery) 소관이라
  건드리지 않았다.
- `node tests/sim/agentloop.mjs sc6` — 회귀 없음 (엔트리 가드 추가 후 재확인, 전 신호 PASS/MANUAL)

### 발견 — `/harness-spec`의 specSources 저장이 간헐적이다 (조치 안 함, 범위 밖)

SC7을 3회 실행하는 동안 fresh 초안 4회 중 **1회에서 `specSources`가 `.harness/config.json`에
저장되지 않았다** (`user` 키는 남아 있었으므로 파일 자체는 정상). 최종 실행은 2/2로 통과했다.

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

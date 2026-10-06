# r2-scenario-evidence — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

R2(시나리오 ↔ 증거 대조)를 옵트인으로 제공한다.
- spec `## Done evidence` JSON에 `scenarios`를 선언한다. 1행(증거 연결)은 파서가 판정하고, 깨지면 `done`이 막힌다.
- `harness-team scenario check`가 2행(증거 명령 exit 0)을 판정한다.
- `harness-team review <engine> --framing scenario`가 3·4행(루브릭)을 판정한다. 시나리오를 선언한 task에서 `verify: required`는 `-scenario` kind만 센다.

검증:
- `npm run test`: tests 1181 · pass 1180 · fail 0 · skipped 1.
- `npm run docs:check`: 최신.
- 이 spec에 `node bin/harness-team.mjs scenario check`: `scenario: pass (7 checked)`, exit 0.

**시나리오별 이름이 찍힌 실행 출력 (2026-10-06, 리뷰 반영 후 워킹트리).** exit 0만으로는 부족하다는 점을 실측했다. 0건 매치에서도
node는 `✔ <파일>`과 `ℹ pass 1`을 찍는다. 그래서 각 증거 명령이 실제로 고른 테스트 이름을 남긴다.

```text
S1 $ node --test --test-name-pattern 'R2-S1' tests/scenario.test.mjs
    ✔ R2-S1: 증거(cmd)가 빠진 시나리오는 선언 invalid이고 사유에 그 id가 나온다
    ✔ R2-S1: 빈 문자열 test·빈 배열·알 수 없는 키·중복 id도 invalid, 정상 선언은 scenarios를 돌려준다
    ℹ pass 2
    ℹ fail 0
S2 $ node --test --test-name-pattern 'R2-S2' tests/scenario.test.mjs
    ✔ R2-S2: 모든 증거 명령이 exit 0이면 pass (N checked), exit 0, 시나리오별 G/W/T 줄
    ℹ pass 1
    ℹ fail 0
S3 $ node --test --test-name-pattern 'R2-S3' tests/scenario.test.mjs
    ✔ R2-S3: 증거 하나가 실패하면 failed + 그 id의 failure 줄, exit 2, 나머지도 판정한다
    ✔ R2-S3: 깨진 선언은 failed(invalid-declaration), exit 2
    ℹ pass 2
    ℹ fail 0
S4 $ node --test --test-name-pattern 'R2-S4' tests/scenario.test.mjs
    ✔ R2-S4: scenarios 선언이 없으면 not-configured, exit 0
    ℹ pass 1
    ℹ fail 0
S5 $ node --test --test-name-pattern 'R2-S5' tests/scenario.test.mjs
    ✔ R2-S5: 같은 cmd를 쓰는 시나리오들은 명령을 한 번만 실행한다
    ℹ pass 1
    ℹ fail 0
S6 $ node --test --test-name-pattern 'R2-S6' tests/done-guard.test.mjs
    ✔ R2-S6: scenarios + verify required — -adversarial만 있으면 차단, -scenario가 있으면 통과
    ✔ R2-S6: 증거가 빠진 시나리오 선언은 done을 막는다 (R2 1행)
    ℹ pass 2
    ℹ fail 0
S7 $ node --test --test-name-pattern 'R2-S7|프레이밍 템플릿' tests/review-command.test.mjs
    ✔ 프레이밍 템플릿 8종 ↔ 커맨드 문서 마커 다음 text 블록 동기화 (pin) + allowlist 양방향
    ✔ R2-S7: --framing scenario 는 kind <engine>-scenario 로 기록하고 src 템플릿(spec·artifact 경로 치환)을 엔진에 넘긴다
    ℹ pass 2
    ℹ fail 0
```

실행 수단: 메인 세션 단일 스레드(서브에이전트 없음). 리뷰는 codex 엔진 순차 실행(D4 — meta 동시 쓰기 금지).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-10-06T08:35:19.989Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 894abb4a52c122481e15c9e8998f2e8468c434f4 · exit 0 · 467 B

```text
No significant P1/P2 findings.

- **P3 — `src/commands/task.mjs:908`**: The new scenario-only verification predicate diverges from migration’s `isVerifyKind` check (`migrate.mjs:949`), so migration can incorrectly count non-scenario markers as verification evidence being lost.

Verification: 10 read-only tests passed; `git diff --check` passed. Full tests were not run because fixtures write temporary files. Nothing modified.

**Verdict: Approve with nit.**
```

<!-- harness:review kind=codex scope=worktree tip=894abb4a52c122481e15c9e8998f2e8468c434f4 at=2026-10-06T08:35:19.989Z -->

**판별 (driver).**
- P3 → **진짜 결함, 수정.** 재현: 시나리오를 선언한 구 task에 `-adversarial`·`-scenario` 마커가 있으면, `migrate --adopt-reviews`가 "잃는 검증 증거"를 2개로 셌다. 하지만 가드는 `-scenario`만 센다(실제로 잃는 것은 1개).
- 조치: 판정을 `verifyEvidencePredicate(evidence)`(task.mjs)로 추출하고 가드와 migrate가 함께 쓰게 했다.
- 회귀 테스트: `tests/review-adoption.test.mjs` "R2: scenarios 선언 task는 -scenario 마커만 잃는 증거로 센다".

### 2026-10-06T08:37:42.416Z — codex-scenario (harness-team review)

- engine: codex · scope: worktree · tip: 894abb4a52c122481e15c9e8998f2e8468c434f4 · exit 0 · 1966 B

```text
| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| E1 | 증거가 Then을 실제로 검증한다 | BLOCKER | **fail** | **S7**: [테스트의 프롬프트 assertion](/Users/chadonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/mystifying-shannon-85197d/tests/review-command.test.mjs:583)은 루브릭·경로·`scenario check`의 포함 여부만 검사합니다. 엔진에 전달되는 전체 프롬프트와 미러의 일치는 검사하지 않습니다. 메모리상 변이로 “exit 0만으로는 pass가 아니다” 문장을 제거했는데도 assertion 3개가 모두 통과했습니다. [미러 pin](/Users/chadonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/mystifying-shannon-85197d/tests/review-command.test.mjs:466)은 source·문서만 비교하므로 이 변이를 잡지 못합니다. |
| E2 | spec 밖 동작이 없다 | MAJOR | **pass** | diff의 선언 검증은 요구사항 1, 새 명령·CLI 배선은 2, 프레이밍은 3, `done`의 `-scenario` 제한은 4에 대응합니다. 문서·템플릿·golden fixture·테스트 변경도 요구사항 5–6에 대응하며, 무관한 동작 변경은 발견하지 못했습니다. |

S1 테스트 2개와 미러 pin은 실행 출력에 이름이 표시되며 통과했습니다. S2–S6 및 S7 전체 실행은 임시 파일 생성이 필요한 읽기 전용 환경 때문에 미확인입니다. artifact의 `"10 read-only tests passed"` 기록에는 해당 테스트 이름이 없어 실행 증거로 인정하지 않았습니다. 변이 검증은 메모리에서만 수행했으며 파일은 수정하지 않았습니다.

**Verdict: fail — 실패 항목은 E1(S7)입니다.** 엔진에 전달된 전체 프롬프트를 치환한 미러 기대값과 비교하는 assertion이 필요합니다.
```

<!-- harness:review kind=codex-scenario scope=worktree tip=894abb4a52c122481e15c9e8998f2e8468c434f4 at=2026-10-06T08:37:42.416Z -->

**판별 (driver).**
- E1/S7 fail → **진짜 결함, 수정.** S7 테스트는 프롬프트를 부분 `includes`로만 검사해서, 템플릿 문장을 지워도 통과했다.
- 조치: 문서 미러 블록에 CLI 치환을 손으로 적용한 값과 엔진 프롬프트 전체를 `assert.equal`로 대조한다(src를 거치지 않는 독립 경로).
- 변이 확인: src 템플릿에서 "exit 0만으로는 pass가 아니다" 줄을 지우면 S7이 fail 1로 바뀐다. 확인 후 원복했다.
- E2 pass → 동의.

### 2026-10-06T08:40:57.925Z — codex-scenario (harness-team review)

- engine: codex · scope: worktree · tip: 894abb4a52c122481e15c9e8998f2e8468c434f4 · exit 0 · 1881 B

```text
| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| E1 | 각 증거가 Then을 실제로 검증한다 | BLOCKER | **na** | S1 실행 출력에 `✔ R2-S1: 증거(cmd)가 빠진 시나리오는 선언 invalid이고 사유에 그 id가 나온다`가 표시되었으며, 테스트는 `status`, 시나리오 id, `cmd`를 assert합니다. S7의 이전 결함은 현재 [테스트](/Users/chadonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/mystifying-shannon-85197d/tests/review-command.test.mjs:592)의 `assert.equal(prompts[0], expected)`로 수정되었습니다. 미러 pin도 이름이 표시되며 통과했습니다. 그러나 **S2–S7 본 테스트의 실행 이름이 표시된 출력은 확보하지 못했습니다**. 해당 fixture는 파일을 생성하므로 읽기 전용 환경에서 실행하지 않았으며, artifact의 `10 read-only tests passed`도 이를 증명하지 않습니다. |
| E2 | spec 밖 동작이 없다 | MAJOR | **pass** | 실제 diff의 파서·scenario 명령·프레이밍·done 가드는 요구사항 1–4, 문서·템플릿·테스트는 5–6에 대응합니다. 추가된 migration 변경도 동일한 `verifyEvidencePredicate`를 사용하도록 맞춘 것으로, 사유가 [artifact의 P3 기록](/Users/chadonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/mystifying-shannon-85197d/docs/chad/r2-scenario-evidence/r2-scenario-evidence-artifact.md:19)에 있습니다. 무관한 동작 변경은 발견하지 못했습니다. |

파일은 수정하지 않았고 기계 행은 재판정하지 않았습니다.

**Verdict: na — fail 항목 없음. E1은 S2–S7의 이름이 표시된 실행 출력 확보 전까지 미확인입니다.**
```

<!-- harness:review kind=codex-scenario scope=worktree tip=894abb4a52c122481e15c9e8998f2e8468c434f4 at=2026-10-06T08:40:57.925Z -->

**판별 (driver).**
- E1 na → **정당한 판정.** 검증자는 read-only라 fixture를 실행하지 못한다. 그런데 S2–S7을 이름으로 실행한 출력이 artifact에 없었다.
- 조치: 위 `## 결과`에 시나리오별 이름이 찍힌 실행 출력을 기록하고 재판정을 받는다.
- 학습: R2 루브릭 앞에 driver(기본 루프에서는 QA를 돌리는 쪽)가 이름이 찍힌 실행 출력을 artifact에 남겨야 E1이 판정 가능해진다. `scenario check`는 명령 출력을 stderr로 흘릴 뿐 기록하지 않는다. 묶음 B에서 기록 절차를 정한다.

### 2026-10-06T08:43:56.814Z — codex-scenario (harness-team review)

- engine: codex · scope: worktree · tip: 894abb4a52c122481e15c9e8998f2e8468c434f4 · exit 0 · 2544 B

```text
| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| E1 | 각 증거가 Then을 실제로 검증한다 | BLOCKER | **pass** | [S1–S5 테스트](< /Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/mystifying-shannon-85197d/tests/scenario.test.mjs:45>)는 invalid·id, pass 출력·종료 상태, failure 줄·후속 판정, not-configured, 실행 횟수(`'run\n'`)를 assert합니다. [S6](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/mystifying-shannon-85197d/tests/done-guard.test.mjs:1241>)는 adversarial만 있을 때 차단과 scenario 추가 후 통과를 검사합니다. [S7](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/mystifying-shannon-85197d/tests/review-command.test.mjs:570>)는 `'custom-scenario'` 기록과 `assert.equal(prompts[0], expected)`로 전체 미러 일치를 검사합니다. [artifact 실행 기록](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/mystifying-shannon-85197d/docs/chad/r2-scenario-evidence/r2-scenario-evidence-artifact.md:17>)에 S1–S7의 해당 테스트 이름이 모두 표시됩니다. |
| E2 | spec 밖 동작이 없다 | MAJOR | **pass** | 작업 트리 diff의 파서·scenario 명령·프레이밍·done 가드는 요구사항 1–4, 문서·템플릿·테스트 변경은 5–6에 대응합니다. migration의 판정 공유도 [artifact](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/mystifying-shannon-85197d/docs/chad/r2-scenario-evidence/r2-scenario-evidence-artifact.md:77>)에 “가드와 migrate가 함께 쓰게 했다”는 사유가 기록되어 있습니다. 무관한 동작 변경은 발견하지 못했습니다. |

S1 테스트 2개와 미러 pin을 직접 재실행하여 이름이 표시된 통과 출력을 확인했습니다. S7 경고 문장 삭제 변이도 메모리에서 전체 비교 assertion이 거부함을 확인했습니다. S2–S7 fixture 실행은 기록된 출력을 근거로 판단했습니다. 기계 행은 재판정하지 않았으며 파일은 수정하지 않았습니다.

**Verdict: pass — fail 항목 없음.**
```

<!-- harness:review kind=codex-scenario scope=worktree tip=894abb4a52c122481e15c9e8998f2e8468c434f4 at=2026-10-06T08:43:56.814Z -->

**판별 (driver).** E1 pass·E2 pass → 동의. R2 4행이 모두 닫혔다: 1·2행은 `scenario check`의 pass (7 checked), 3·4행은 이 리뷰다.

## Learnings

- **exit 0도 요약 개수도 R2 2행의 증거가 되지 못한다.** `node --test --test-name-pattern`은 0건 매치에서도 exit 0이고, `✔ <파일>`·`ℹ pass 1`을 찍는다.
  실제 실행의 증거는 **테스트 이름이 찍힌 줄**이다. 하네스는 러너 형식을 파싱하지 않는다(D11). 대신 루브릭 E1이 이름 줄을 근거로 요구한다.
- **read-only 검증자는 fixture를 돌리지 못한다.** R2 루브릭 전에 driver가 시나리오별 이름이 찍힌 실행 출력을 artifact에 남겨야
  E1이 na가 아니라 판정 가능해진다. 묶음 B(기본 루프)의 QA 절차에 이 기록 단계를 넣는다.
- **pin 테스트가 "src == 문서"를 보장해도 "엔진에 간 프롬프트 == 문서"는 별개다.** 부분 `includes`는 문장 삭제를 놓친다.
  문서에서 기대값을 독립적으로 만들어 전체를 대조한다. 이 결함은 R2 루브릭이 자기 task에서 처음 잡았다(dogfood).

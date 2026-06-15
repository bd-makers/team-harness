# cli-json-contract — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

**P2 (0.8.0) 완료** — drive 4커맨드(`task`/`retro`/`release`/`doctor`)에 opt-in `--json` observation 엔벨로프 추가. 사람용 출력은 무수정(바이트 동일), `--json` 시 stdout에 단일 JSON 객체 1개만 + `process.exitCode` 신호.

**엔벨로프 스키마** (`harness/observation/v1`, 통합/error nullable):
```
{ schema, command, status:"success|warning|error", summary,
  next_actions:[], artifacts:[], error: null | {root_cause, safe_retry, stop_condition} }
```
- doctor만 `checks:[{label, status:"pass|fail|missing|optional", detail?}]` 추가.
- **불변식:** `status==='error' ⟺ error!=null` (4커맨드 공통 — doctor도 fail 시 error 채움).

**구현 (브랜치 `chad/cli-json-contract`, 9 커밋):**
- `src/observation.mjs` (신규) — `OBSERVATION_SCHEMA`·`buildEnvelope`·`emitObservation`. 단일목적 모듈.
- `release.mjs` — `runRelease` json 분기(success/dry-run/error) + `releaseArtifacts` 헬퍼. (코어 `release()`는 무로깅 확인 → 단일 엔벨로프 보장.)
- `task.mjs` — `runRetro`(success/no-active) + `runTask`(created/activated/bad-name). **task의 human 에러경로도 `usage:`→cause/retry/stop+exitCode로 정합**(retro/release와 동일 계약, 수용기준 #2).
- `doctor.mjs` — `runDoctor`를 reporter 패턴(`add`/`line`)으로 리팩토링. human 라인 바이트 동일 유지하며 `checks[]` 누적. warning은 타입별 next_action 라우팅(legacy→migrate, spec-gate→`task <name>`).
- `bin/harness-team.mjs` — HELP Options에 `--json` 1줄. (파서는 무수정 — `--json`이 이미 boolean으로 통과.)

**테스트:** baseline 71 → **84 pass, 0 fail** (신규 13: observation 단위 4, observation-commands 9 — release success/error, retro success/no-active, task created/bad-name(json+human)/activate, doctor error). `soleEnvelope()` 헬퍼가 "stdout 단일 객체" 불변식을 매 테스트에서 강제.

**dogfood (실제 레포):**
- `doctor --json` → 단일 JSON, checks=21, statuses=`pass,fail,missing,optional`, status=error + non-null error.
- `release patch --dry-run --json` → status=success, error=null, artifacts=[], summary `0.7.3 → 0.7.4`.
- `task '' --json` → exit 1, status=error, 완전한 error 계약.

**범위/비범위:** drive 4커맨드만(파킹 문서). 헬퍼는 제네릭이라 나머지 8커맨드는 후속 opt-in 가능(YAGNI). 파서·human 포맷 무변경.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-06-15 — feature-dev:code-reviewer (doctor reporter 리팩토링 집중)

가장 위험한 변경(runDoctor 전면 리팩토링)에 대한 byte-parity 집중 리뷰. Critical 0.
- **🟡 #1 (수정 완료):** spec-gate 경고만 떴을 때 json `next_actions`가 `migrate`(오답) 방출 + spec-gate 힌트가 json에서 누락. → 경고 타입별 `warnActions` 라우팅으로 수정 (commit `771ffd5`).
- **🟡 #2 (수정 완료):** 승인된 계약 preview는 not-found 도구를 `status:"missing"`으로 보였으나 구현은 `optional` emit → `missing` enum 미사용. line 173 `'optional'`→`'missing'` (human 출력 불변, commit `771ffd5`).
- **✅ byte-parity:** backup-clone-dir 2줄 포함 모든 `humanLine` 인자가 제거된 `console.log` 문자열과 일치 확인(컨트롤러 `git show` 검증).

### 2026-06-15 — feature-dev:code-reviewer (브랜치 전체 `fd4feaa..HEAD`)

설계 불변식 4종(opt-in/비파괴·에러계약·일관성·범위한정) 모두 통과. 이전 2건 수정 반영 확인. Critical 0.
- **🟡 #1 (수정 완료):** doctor `status:'error'`인데 `error:null` 계약 비대칭 → 에이전트가 `env.error` 역참조 시 null. → doctor도 fail 시 error 채움, "status==error ⟺ error!=null" 불변식 확립 + 테스트 어서션 (commit `4ef71a0`).
- **🟡 #2·#4 (수정 완료):** release success / task activate json 경로 미테스트 → 두 테스트 추가 (commit `4ef71a0`, 82→84).
- **🟡 #3 (보류·기록):** doctor warning json 경로 회귀 테스트 — `fail=0` 완전건강 fixture가 필요해 비용 과중. warning 라우팅은 순수 3줄 매핑이라 코드 인스펙션으로 검증, 영구 테스트는 후속.
- **⚪ #5 (보류·기록):** doctor/task/retro에 최상위 try/catch 부재 → 예기치 못한 FS 예외 시 stdout JSON 대신 stderr 스택. release만 try/catch 보유. "stdout 항상 JSON" 강건성 강화는 후속(bin의 `main().catch` 중앙화 권장). 일반 경로엔 영향 없음.

## Learnings

- **승인된 preview = 계약.** 사용자가 brainstorming에서 고른 preview의 필드값(예: 도구 not-found = `missing`)이 곧 계약. 구현이 임의로 `optional`로 합치면 "승인된 것과 다른 것"을 만든 것 → 리뷰가 잡음. preview를 구현 충실도의 기준으로 둘 것.
- **불변식은 전 분기에서 동형이어야 한다.** `status:'error' ⟺ error!=null`을 release/retro/task는 지켰는데 doctor만 깼다. 에이전트는 커맨드별 분기 없이 한 패턴(`if(error) use(error)`)으로 파싱하므로, 한 커맨드의 예외가 전체 계약을 약화시킨다. 계약은 "가장 약한 커맨드"만큼만 강하다.
- **reporter 패턴으로 human/machine 이중출력을 무회귀로.** 출력하며 부수효과를 내는 함수에 `add(record, humanLine)`/`line(humanLine)` 래퍼를 끼우면, humanLine 인자를 원본과 동일하게 유지하는 한 사람용 출력은 바이트 동일하게 보존하면서 구조화 누적을 얻는다. byte-parity는 `git show`로 4번째 인자 ↔ 제거된 `console.log` 대조로 검증.
- **결정적으로 테스트 못 하는 경로는 정직하게 보류·기록.** doctor warning 경로는 `fail=0` 완전 scaffold fixture가 필요해 ROI가 낮다. 억지 테스트보다 코드 인스펙션 + artifact 기록이 정직. (단, 순수 매핑처럼 위험이 낮을 때만.)
- **서브에이전트 주도 + 적응형 리뷰.** 완전-명세 plan에서 implementer는 기계적 전사라 cheap 모델로 충분. trivial(HELP 1줄)·foundation은 인라인, 위험한 리팩토링(doctor)·최종은 전용 리뷰어 dispatch로 차등. 모든 task에 3-서브에이전트를 강제하기보다 위험도에 비례.

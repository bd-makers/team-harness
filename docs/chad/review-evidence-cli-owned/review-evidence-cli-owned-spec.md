# review-evidence-cli-owned — Spec

## 목적 / 요구사항

**오늘 무엇이 안 되는가.** `done` 가드의 리뷰·검증 증거는 artifact의 마커 한 줄이고,
그 줄을 쓰는 주체는 **리뷰를 돌렸다고 주장해서 이득을 보는 바로 그 세션**이다.
`commands/harness-review.md` 5단계는 에이전트에게 지시한다 — *"기록 끝에 기계 판독용 마커를
한 줄로 append 한다"*. 가드는 그 마커의 `kind`·`at`·`scope`·`tip`만 읽는다
(`src/commands/task.mjs:508-520` `parseReviewMarkers`, `:584-593` verify 판정).
리뷰가 실제로 실행됐는지는 어디에도 남지 않는다.

`verify-evidence-gate`(done)는 이것을 **받아들인 한계**로 명시했다 — *"마커 신뢰 기반 부분
검증이라 전체 강제는 `--force` 훈련이 된다"*. 즉 "마커는 자기신고다"는 새 발견이 아니다.
이 task가 바꾸려는 것은 그 한계의 **위치**다: 지금은 "리뷰를 돌리지 않고 마커만 쓰는 것"이
문서화된 절차 안의 한 단계를 건너뛰는 것에 불과하다 — 정상 워크플로 안의 지름길이다.
이것을 "harness 소유 기계 상태를 손으로 고치는 것"으로 옮긴다. 그 행위는 이미
`done-guard-window`가 *"`--force`와 구분되지 않는 고의"*로 분류해 둔 범주다.

**영향받는 대상.** `review: required`·`verify: required`를 선언한 모든 task의 종결.
D6 적대적 검증 프레이밍 5종(`-adversarial`·`-testcritic`·`-shipcheck`·`-contrarian`·`-simplifier`).

**기대 결과.** 리뷰 엔진의 **실행과 증거 기록을 `harness-team review` CLI가 소유**한다.
성공한 실행만 `<name>-meta.json`의 `reviews[]`에 기록되고, `verify: required` 가드는 그 배열을
읽는다. 에이전트는 종전대로 발견을 판별하고 산문을 쓴다 — 마커를 손으로 쓰지 않는다.

**제약.**

- 가드의 위협 모델(망각·실수)은 바꾸지 않는다. meta를 손으로 고치는 고의는 종전대로 범위 밖이다.
- 엔진 runner 표(`harness-review.md`)의 호출 형태·주의사항(`< /dev/null`, `{prompt}` POSIX 단일 인용
  치환)은 **그대로** 옮긴다. 실행 계약을 바꾸지 않는다.
- 기존 task는 깨지지 않는다 — `reviews` 키가 없는 구 meta는 종전대로 artifact 마커로 판정한다(degrade).
- artifact `## Reviews`의 사람용 기록과 마커 줄은 유지한다. CLI가 함께 쓴다.

## 설계 / 접근

### 왜 서명(HMAC)이 아니라 meta인가

처음 검토한 대안은 CLI가 마커에 HMAC 서명을 붙이는 것이었다. 기각 근거:
- **키가 머신별이면** A에서 돌린 리뷰를 B에서 `done`할 수 없다. 이 저장소는 실제로 두 머신(`chad`·`hslee`)에서
  같은 사용자가 작업한다.
- **키를 공유(커밋)하면** 에이전트가 읽을 수 있어 얻는 것이 없다.
- 서명은 "위조를 막는" 수단인데, 위조(고의)는 애초에 가드의 위협 모델 밖이다. 필요한 건 위조 방지가 아니라
  **"기록이 절차의 한 단계"에서 "기록이 harness 소유 상태"로 옮기는 것**이다.

`<name>-meta.json`은 커밋되고(머신 간 이동 가능), harness가 소유하며(AGENTS.md: *"손으로 고치지
않는다"*), 필드 추가는 이 저장소의 확립된 패턴이다(`firstActivatedAt`·`reopenedAt`·`forcedAt`).
CLI가 artifact에 append하는 선례도 있다(`runRetro`, `src/commands/task.mjs:719`).

### `harness-team review`

```
harness-team review [codex|claude|custom] [--framing <suffix>] [--prompt-file <path>]
                    [--scope worktree|diff] [--base <ref>] [focus ...] [--json]
```

| 항목 | 동작 |
|---|---|
| 엔진 결정 | 인자가 있으면 그 엔진(`command -v`로 가용성 확인, 없으면 error 패킷). 없으면 probe 폴백 체인 codex → claude (문서 1단계와 동일). custom은 `.harness/reviewers.json`의 `custom.command` |
| scope | `--scope` 명시 없으면 문서 2단계 규칙(작업 트리 변경 있으면 `worktree`, 없으면 `--base`/`origin/main`/`main` 대비 `diff`). diff가 비면 "리뷰할 것 없음"으로 종료(기록 없음) |
| 프롬프트 | 기본은 문서의 공용 리뷰 프롬프트를 src 상수로. `--prompt-file`이 있으면 그 파일 내용(검증 프레이밍 커맨드가 자기 프롬프트를 넘기는 경로). focus 토큰은 프롬프트 끝에 붙인다 |
| 실행 | runner 표 그대로. codex: `stdio: ['ignore', ...]`(`< /dev/null` 계약). claude: `claude -p --permission-mode plan`. custom: `{prompt}`를 POSIX 단일 인용 리터럴로 치환해 `sh -c` |
| kind | `--framing`이 없으면 `<engine>`, 있으면 `<engine>-<suffix>`. suffix는 `VERIFY_KIND_SUFFIXES` 안에 있어야 한다(밖이면 error 패킷 — 열거 밖 프레이밍을 조용히 만들지 않는다) |
| 성공 시 기록 | (1) `meta.reviews[]`에 `{ kind, engine, scope, tip, at, exitCode: 0, outputBytes }` append. (2) artifact `## Reviews`에 `### <at> — <kind> (harness-team review)` 헤딩 + 출력을 fenced block으로(상한 초과 시 잘라내고 잘랐다고 명시) + **종전 형식 그대로의 마커 한 줄** |
| 실패 시 | exit ≠ 0 또는 엔진 미가용 → **meta·artifact 어느 것도 쓰지 않는다.** error 패킷(stderr 마지막 20줄을 cause에). 실패한 실행은 증거가 아니다 |
| 출력 | 텍스트: `review: <kind> recorded (exit 0, <bytes> B)` + 다음 행동(4단계 판별). `--json`: observation envelope |

### done 가드

| 선언 | 판정 (meta에 `reviews` 키 있음 — 템플릿이 `reviews: []`로 생성) | 판정 (`reviews` 키 없음 — 구 task) |
|---|---|---|
| `verify: required` | `meta.reviews` 중 kind 접미사 ∈ allowlist **이고** `at` ≥ 판정 창 시작인 항목 ≥ 1. **artifact 마커는 세지 않는다** | 종전 그대로 (artifact 마커) |
| `review: required` | `meta.reviews` 항목 **또는** artifact 마커, 창 내 ≥ 1 (superset — 손으로 돌린 리뷰의 산문 기록을 계속 인정) | 종전 그대로 |

판정 창 계산(`reopenedAt || firstActivatedAt`)은 건드리지 않는다. degrade 규칙은 `firstActivatedAt`
없는 구 task를 다루는 규칙과 같은 형태다 — 없는 정보를 지어내지 않고 종전 동작으로 내려간다.

### 문서 계약 변경

- `commands/harness-review.md` 3·5단계: 실행과 기록은 `harness-team review`가 한다. 에이전트의 역할은
  1·2단계(엔진·scope 결정은 CLI에 인자로 전달), **4단계 판별**, 6단계 보고, 그리고 판별 결과 산문을
  artifact 블록 아래에 쓰는 것. 마커를 손으로 쓰는 지시는 제거한다.
- 검증 프레이밍 커맨드 5종: 자기 프롬프트를 파일로 두고 `harness-team review <engine> --framing <suffix>
  --prompt-file <path>`를 호출한다. 프롬프트를 src로 옮기는 것은 이 task 범위 밖(후속) — 문서가 정본인
  현 구조를 유지한다.
- `commands/harness-task.md` meta 절: `reviews[]` 필드와 "손으로 고치지 않는다"에 이 배열이 포함됨을 명시.
- `src/cli-args.mjs` COMMANDS 표 등록(`tests/cli-drift.test.mjs`가 강제).

### 범위 밖

- 리뷰 **품질** 판정. 이 task는 "실행됐다(exit 0)"만 기계화한다. 발견의 진위는 종전대로 4단계 사람·세션 판별.
- 프레이밍 프롬프트의 src 이관.
- `.harness/reviewers.json` 스키마 확장.

## Ontology

- **리뷰 증거 (review evidence)**: `done` 가드가 "리뷰가 있었다"로 세는 기계 판독 기록. 지금은 artifact 마커
  한 줄, 이 task 후에는 `meta.reviews[]`가 정본이고 마커는 사람용·하위 호환.
- **CLI 소유 (CLI-owned)**: 그 기록을 만드는 코드 경로가 harness CLI 안에 있고, 에이전트의 절차 문서에
  "이 값을 써라"는 지시가 없는 상태. 위조 불가를 뜻하지 않는다 — 위조하려면 harness 소유 상태를 손으로
  고쳐야 한다는 뜻이다.
- **실행 증거 vs 품질 증거**: 실행 증거 = 엔진이 exit 0으로 끝났고 출력이 있었다. 품질 증거 = 발견이
  옳았다. 이 task는 전자만 기계화한다. 후자는 D6 4단계(판별)의 몫이며 결정론 게이트 밖이다.
- **degrade**: `reviews` 키 없는 구 meta는 종전 판정(artifact 마커)으로 내려간다. 구 task에 새 규칙을
  소급하면 이미 닫힌 증거가 무효가 되어 가드가 `--force` 훈련기가 된다.

*자가진단 게이트 근거: 문제(에이전트가 쓰는 증거)·경계(위협 모델 불변, runner 계약 불변, 구 task degrade)·
측정(아래 완료 기준 6항목 전부 명령으로 검사 가능)·영향 파일(task.mjs·cli-args.mjs·summary.mjs 템플릿·
harness-review.md·프레이밍 문서 5종·harness-task.md)이 전부 정본 위치로 지목 가능하다.*

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — 리뷰 엔진 실행과 증거 기록을 `harness-team review`가 소유하고, `verify: required`는
      `meta.reviews[]`를 읽는다.
- [x] **Constraint 명확도** (30%) — 위협 모델 불변, runner 계약 불변, 구 task degrade, 마커·산문 유지, 프롬프트 이관 범위 밖.
- [x] **Success 기준** (30%) — 아래 `### 완료 기준` 6항목.
- [x] **Context 명확도** (brownfield) — `src/commands/task.mjs`(파서·가드·retro 선례), `src/cli-args.mjs`,
      `src/commands/summary.mjs`(meta 템플릿), `commands/harness-review.md` + 프레이밍 5종, `commands/harness-task.md`,
      `tests/done-guard.test.mjs:875`(allowlist pin), `tests/cli-drift.test.mjs`.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0

### 완료 기준

1. `harness-team review custom`이 (테스트용 fake 커맨드로) exit 0이면 `meta.reviews[]`에 항목이 생기고
   artifact에 블록 + 종전 형식 마커가 append된다. exit ≠ 0이면 **둘 다 쓰이지 않고** error 패킷이 나온다.
2. `--framing adversarial`이면 kind가 `custom-adversarial`로 기록된다. allowlist 밖 suffix는 error 패킷.
3. 새 task(`reviews: []`)에서 `verify: required` + artifact에 손으로 쓴 verify 마커만 있음 → **차단**.
   `meta.reviews`에 창 내 verify 항목 → 통과.
4. `reviews` 키 없는 구 meta에서 verify 판정은 종전 테스트가 그대로 통과한다(회귀 없음).
5. `review: required`는 meta 항목·artifact 마커 어느 쪽으로도 통과한다.
6. `npm run test` 전체 통과 + `harness-review.md`에 "마커를 손으로 append" 지시가 남아 있지 않다(grep).
   이 task 자신의 리뷰를 새 CLI로 돌려(dogfood) `meta.reviews`에 기록된다.

## Boundary contracts

*선언 없음 — `reviews[]`의 생산자(CLI)와 소비자(가드)가 같은 모듈(`task.mjs`)에 있어 JSON Schema 파일
경계가 없다. 형태는 유닛테스트가 고정한다.*

## Done evidence

```json
{ "version": 1, "review": "required", "verify": "required", "tests": "required" }
```

*`verify: required` 근거: 검증 증거의 기계화를 다루는 task가 검증 없이 닫히면 자기모순이다. 새 CLI로
`--framing adversarial`을 돌려 dogfood한다(완료 기준 6). 이 task의 meta는 템플릿 변경 전에 생성됐으므로
가드는 degrade 경로(artifact 마커)로 판정한다 — CLI가 마커도 함께 쓰므로 어느 경로든 같은 실행이 증거다.*

## 참고

- `commands/harness-review.md` — 1~6단계, 엔진 runner 표, 마커 계약. 3·5단계가 이 task의 변경 대상.
- `src/commands/task.mjs:495-520` — `REVIEW_MARKER_RE`·`VERIFY_KIND_SUFFIXES`·`parseReviewMarkers`.
- `src/commands/task.mjs:584-593` — verify 판정 지점.
- `src/commands/task.mjs:719` — `runRetro`, CLI가 artifact에 append하는 선례.
- `src/commands/summary.mjs` `taskMetaTemplate` — `reviews: []` 추가 지점.
- `docs/chad/verify-evidence-gate/verify-evidence-gate-spec.md:10-20` — "마커 신뢰 기반"을 수용한 결정.
- `docs/chad/done-guard-window/done-guard-window-artifact.md` — "harness 소유 meta를 손대는 것은 `--force`와
  구분되지 않는 고의" 결정. 이 task의 위협 모델 근거.
- `docs/decisions.md` D6 — read-only 검증자, 반영은 작성 세션이 단일 스레드로.
- `tests/done-guard.test.mjs:875` — allowlist ↔ 문서 양방향 pin. `--framing` 검증이 같은 상수를 쓴다.
- `commands/harness-adversarial-review.md:15-35` — 프레이밍 커맨드의 엔진 표 재사용·kind 규약.
- 검증 사실: 이 컨테이너에서 `claude -p --permission-mode plan`이 부모 세션 인증을 상속해 실행됨(2026-09-10 실측).
  `tests/sim/agentloop.mjs` 헤더의 "nested claude -p는 미인증" 주석과 상충 — 문서 쪽(`harness-review.md`,
  2026-08-21 실측)과 오늘 실측이 일치하므로 문서를 신뢰한다. sim 주석은 별도 정정 대상(범위 밖).
- (open) artifact에 넣는 출력 상한 바이트 — 구현 시 결정(16 KiB 권장, 초과분은 잘라내고 표기).

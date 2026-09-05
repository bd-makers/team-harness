# observability-consumer — Spec

## 목적 / 요구사항

관측 훅(`templates/.claude/hooks/observe-tools.mjs`)은 도구 호출마다 JSONL을 `.harness/observability/v1/<UTC day>/<session_ref>-NNN.jsonl`에
쓰지만, 그 로그를 **읽는 코드가 저장소에 하나도 없다**(2026-09-05 PDF 6층 비교 분석 권고 ①, 정정 메시지에서 main 기준 재확인).
쓰기만 있는 관측은 PDF L6의 "한 시간 안에 실패를 알 수 있나"에 답하지 못한다. 최소형 소비자를 만든다.

1. **새 하위명령 `harness-team observe [--days N] [--json]`** — read-only. cwd(또는 `--target`)의 로그를 창(기본 7일, 1..14, UTC 일 단위,
   오늘 포함)만큼 읽어 스코어카드와 트립와이어 판정을 출력한다. 기존 명령·훅·SessionStart 계약은 건드리지 않는다.
2. **스코어카드**(PDF TABLE VIII를 이 로그가 가진 필드로 번역) — 일별 · task별 · 도구 분류별로 `started`(호출) · `finished`(succeeded+failed+denied) ·
   `failed` · `denied` · `failure_rate`(=(failed+denied)/finished, finished 0이면 null) · `interrupted` · `duration_ms` p50/p95(duration이 있는 레코드만) ·
   `input_bytes`/`response_bytes` 합 · `usage` 토큰 4필드 합(있는 레코드만, 없으면 null).
3. **task_ref 역매핑** — `docs/<user>/<task>/<task>-meta.json`이 있는 모든 task에 대해 로그와 같은 HMAC(`.harness/observability/v1/.key`,
   namespace `task`, 메시지 `${user}\0${task}`)을 계산해 ref→`user/task`로 보인다. 키를 못 읽거나 매치가 없으면 ref 앞 8자, `task_ref` null은 `(no task)`.
   도구 이름은 복원하지 않는다(`tool_ref`는 HMAC이며 역매핑 사전이 없다) — 분류(`tool_category`)만 보인다.
4. **트립와이어 2종**(사용자 선택, PDF TABLE VII 대응):
   - `failure-rate-2x` — 창의 마지막 날(오늘 UTC)에 `finished ≥ 20`이고 `failed+denied ≥ 5`이며 `failure_rate`가 **직전 날들(finished ≥ 1인 날) 평균의 2배 이상**이면 발화.
     기준일이 0개면 `insufficient-baseline`(발화 없음). 바닥값 5건은 평균 0일 때 실패 1건으로 울리는 오탐을 막는다.
   - `repeat-failure-3x` — 창 안에서 같은 `session_ref`·같은 `tool_ref`의 `failed` 레코드가 3건 이상이면 발화. 보고 항목: session_ref 앞 8자 · tool_category · 횟수 · 마지막 시각.
5. **종료 코드** — 트립와이어가 하나라도 발화하면 `process.exitCode = 1`(훅·CI가 센서로 쓸 수 있게), 그 외 0. 로그 디렉터리 자체가 없으면
   `not-installed`로 안내만 하고 0. 창에 레코드가 없으면 `no-data`, 0.
6. **출력** — text: 창·레코드 수·건너뛴 줄 요약 1줄 → 트립와이어 판정(✓/✗) → 표 3개(일별·task별·분류별; 터미널 폭을 위해 열은 started·finished·failed·denied·rate·p95·intr만 — succeeded·p50·바이트·usage는 `--json`에만). `--json`: `buildEnvelope({ command: 'observe',
   status: 'ok'|'tripped'|'no-data'|'not-installed', summary, next_actions, extra: { window, scorecard, trip_wires, skipped_lines } })`.
7. **견고성** — JSON 파싱 실패 줄·`v !== 1`·필수 필드(`phase`·`session_ref`·`tool_category`·`recorded_at`) 없음·`recorded_at` 파싱 불가·`task_ref`가 null/문자열이 아닌 레코드는 건너뛰고 `skipped_lines`로 센다. 일 판정은 `recorded_at`의 UTC instant 기준(앞 10자가 아님).
   `.jsonl`이 아닌 파일·심볼릭 링크·창 밖 날짜 디렉터리는 읽지 않는다. 로그 내용은 절대 수정·삭제하지 않는다.

범위 제외: doctor 배선, SessionStart nudge, 토큰 비용 트립와이어, 로그 형식·훅 변경, 도구 이름 역매핑, 다른 에이전트(Codex) 로그.

## 설계 / 접근

- **모듈** `src/commands/observe.mjs` — 세 층. `readObservabilityRecords(targetDir, { now, days })` → `{ status, records, skippedLines, baseDir }`;
  `summarizeObservability(records, { now, days, taskNames })` **순수 함수**(파일·시계 의존 없음, `now`는 인자) → `{ window, by_day, by_task, by_category, trip_wires }`;
  `renderObserveText(result)` / envelope. `runObserve(ctx)`가 셋을 잇는다.
- **역매핑** `resolveTaskRefs(targetDir, key)` — `docs/*/*/<name>-meta.json` 열거(`user`·`task`는 meta의 필드). HMAC 계산은 훅과 같은 식이지만 훅 파일을
  import하지 않고(템플릿은 소비자 프로젝트로 복사되는 파일이라 CLI가 의존하면 안 됨) `node:crypto`로 같은 32-hex를 만든다 — 동일성은 테스트가 고정한다.
- **CLI 표면** — `src/cli-args.mjs` COMMANDS에 `observe` 행(`flags: ['days']`, `days`를 `VALUE_FLAGS`에 추가; `--json`은 GLOBAL), `bin/harness-team.mjs`
  라우터 `case 'observe'`와 `taskCmds`(cwd 대상) 추가. `--days`는 정수 1..14만 허용, 아니면 다른 명령의 `fail` 관례대로 `status: 'error'`(cause/retry/stop) + exit 2 — 러너에서 검증한다(cli-args는 값 유무만 본다).
- **문서·매니페스트 표면**(`tests/manifest-sync.test.mjs`가 고정) — `commands/harness-observe.md`(슬래시 명령 계약), `skills/harness-observe/SKILL.md` +
  `agents/openai.yaml`(Codex 동등 스킬), `.claude-plugin/plugin.json` commands, README 명령어 레퍼런스 절(SSOT 포인터), CHANGELOG `[Unreleased]` Added,
  overview 재생성(`git add` 후 `docs:generate`).
- **p95** — 정렬 후 nearest-rank(`ceil(0.95·n)`번째). n=1이면 그 값.
- **날짜 창** — `now`의 UTC 일을 마지막 날로 하고 `days`개 디렉터리(`YYYY-MM-DD`)만 읽는다. 훅의 보존이 14일이므로 상한 14.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **레코드**: 훅이 쓰는 한 줄 JSON(`v:1`). `phase`는 started/succeeded/failed/denied. `started`는 PreToolUse라 duration이 없다.
- **finished**: succeeded+failed+denied. 실패·거부율의 분모. started와 finished가 다를 수 있다(세션 중단).
- **trip wire**: 창의 집계에서 규칙이 참이면 `fired: true`인 판정 객체 `{ id, fired, status, detail }`. status는 `ok`|`fired`|`insufficient-baseline`|`no-data`.
- **task_ref 역매핑**: 로그의 HMAC ref를 저장소의 task 이름으로 되돌리는 사전. 키는 로컬 `.key`, 사전은 로컬 `docs/`에서만 만든다 — 외부로 나가지 않는다.
- 게이트 근거: 목표(요구 1~7)·제약(read-only, 훅·형식 불변, 상한 14일)·완료 기준(테스트 경계값 + 통합 envelope + 실제 CLI 실행 출력)·영향 파일(위 표면 목록)이 위에 특정됨.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
```json
{ "version": 1, "tests": "required", "review": "required" }
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 로그 작성자: `templates/.claude/hooks/observe-tools.mjs` (`buildRecord`·`hmacRef`·`logPath`·`RETENTION_DAYS`) / 테스트 `tests/observability-hook.test.mjs`의 `payload()`
- CLI 계약: `src/cli-args.mjs`(`COMMANDS`·`VALUE_FLAGS`·`GLOBAL_FLAGS`), `bin/harness-team.mjs` 라우터, `src/observation.mjs`(envelope)
- 작은 명령 예시: `src/commands/boundary.mjs`(순수 파서 + runner), `src/commands/summary.mjs`(`--json` 분기)
- pin 테스트: `tests/cli-args.test.mjs` · `manifest-sync`(commands⟺plugin.json, Codex 동등 스킬, README SSOT 포인터, 라우터 존재) · `observation-commands` · `documentation-inventory-pointers`
- 근거 문서: PDF "harness_final" §VIII TABLE VII(trip wire triggers)·TABLE VIII(scorecard), Day 7 "one trip wire". 발견 출처 `.claude/handoffs/2026-09-05-1330-harness-pdf-6layer-comparison.md` 권고 ①
- 브레인스토밍 결정(2026-09-05): 형태 A(새 하위명령만), 트립와이어 = 실패·거부율 2× + 같은 tool 3회 실패, 발화 시 exit 1

# escalation-packet-fields — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-05 — codex read-only 리뷰 (엔진 codex, `-m gpt-5.6-sol`, scope: diff origin/main…cadada5, 228k tokens)

요약: **Request changes** — P1 0 · P2 4 · P3 1. `buildEnvelope` pass-through 유지, 생산자 9곳 전부 헬퍼 경유,
배열 cause 호출자가 text-only `runDone` 뿐이라는 점, 훅·파서의 exact-line 의존 부재는 리뷰어도 확인했다.
I/O 테스트는 codex 샌드박스의 `mkdtemp EPERM`으로 리뷰어 쪽에서 미완주 — 작성 세션의 `npm test`
(591 / 590 pass / 0 fail / 1 skipped, perf 1/1) 출력이 증거.

5건 모두 코드에서 재현해 진짜 결함으로 판별하고 반영했다.

| # | 심각도 | 발견 | 판별 | 조치 |
|---|---|---|---|---|
| 1 | P2 | `rules` artifact-write-failed의 `safe_default`가 "규칙 되돌렸고 artifact도 무변경"이라 주장하지만 `unlink().catch(()=>{})`가 실패를 삼키고 `writeText`(= 평범한 `writeFile`)는 원자적이지 않다 | 진짜 — `src/fsx.mjs:12-16`에서 비원자성 확인, `rules.mjs:276`에서 삼킴 확인 | 보장 가능한 범위로 정정: "artifact 표기는 기록되지 않았다. 규칙 파일은 되돌리기까지 실패했으면 남아 있을 수 있고 artifact도 일부만 쓰였을 수 있다 — 재실행 전에 두 파일을 확인하라". `cause`의 "되돌렸다"도 "되돌리려 시도했다"로 |
| 2 | P2 | `summary` 브랜치 가드의 `alternatives`가 `--force` + `git push origin HEAD:main`을 권해, 방금 막은 안전장치와 PR 흐름을 우회하도록 유도 | 진짜 — 이 저장소의 원장 갱신 관행이 범용 CLI 메시지로 새어 나갔다. 스캐폴드된 남의 프로젝트에서는 브랜치 정책이 다르다 | 이 명령의 escape hatch(`--force`)까지만 안내하고 반영 경로 처방은 삭제 — "반영 경로는 프로젝트의 브랜치 정책을 따를 것" |
| 3 | P2 | "배열 cause는 text 전용" pin이 오히려 배열 `root_cause`를 엔벨로프에 넣어 통과시켜, 향후 JSON 생산자가 배열을 써도 못 잡는다 | 진짜 — 그 테스트는 pass-through만 검사하는데 주석이 배열 규칙까지 막는 것처럼 과잉 주장했다 | ① pin의 주석·본문을 pass-through 검사로 좁히고 ② 실제 가드를 추가: JSON 생산자에 `typeof root_cause === 'string'`. **처음엔 6곳(`observation-commands` 4 + `rules` 2)만 덮어 `summary`·`observe`가 빠졌고 shipcheck #3이 이를 잡았다 — 지금은 8곳 전부다.** 각 변이(cause를 배열로)로 가드가 실패를 내는 것을 확인하고 원복 |
| 4 | P2 | `docs/harness-task-guide.html:775`의 `done` 가드 출력 예시가 `alternatives:`·`default:`를 빠뜨리고 `--force`를 옛 `stop:`에 둔다 | 진짜 — 손으로 쓴 문서(생성물 아님)라 재생성으로 갱신되지 않는다 | 예시를 실제 출력 계약으로 갱신 |
| 5 | P3 | `commands/harness-release.md:44`가 여전히 `cause:`/`retry:`/`stop:` 3줄만 전달하라고 서술 | 진짜 | 5줄 계약으로 정정(빈 `alternatives:`는 나오지 않는다는 단서 포함) |

리뷰가 짚지 않았지만 같은 사유로 함께 확인한 것: 옛 3키 서술이 남은 나머지 표면은 전부
**완료된 과거 task 문서**(`docs/chad/cli-json-contract/*`, `docs/superpowers/plans/2026-05-29-*`)와
**동결 릴리스 노트**(`docs/what-changes-0.2x.html`, `harness-overview-<version>.html` 12개)다 —
그 시점의 계약을 기록한 이력이라 고치면 역사를 위조하는 것이므로 그대로 둔다.

재리뷰: 생략 — 수정이 문구 4곳 + 테스트 어서션 6줄이고, 그중 유일한 동작 변경(타입 가드)은
변이로 직접 검증했다. 문서↔diff 정합은 shipcheck에 맡긴다.

<!-- harness:review kind=codex scope=diff tip=cadada5479d6ae70ba23668a3c33a9e00443e208 at=2026-09-05T11:09:42Z -->

### 2026-09-05 — codex shipcheck #1 (엔진 codex `-m gpt-5.6-sol`, 루브릭 S1~S5, scope: diff origin/main…987a8d3, 130k tokens)

판정: **NOT READY** — S1 PASS, **S2~S5 FAIL(MAJOR)** + `git diff --check` 위반 1건. 코드 결함 지적은 S3 하나뿐이고
나머지는 문서·계획 정합이다. 리뷰어는 read-only 샌드박스라 `npm test`를 재실행하지 못했고, 그 사실을 스스로 명기했다
("590 pass 주장은 기존 artifact 기록일 뿐 이번 검증에서 재확인된 결과는 아니다") — 정당한 지적이라 그대로 남긴다.

| id | 발견 | 판별 | 조치 |
|---|---|---|---|
| S2 | Task 11 Step 1~2를 이미 수행했는데 열린 채였고, 리뷰로 바뀐 Task 8 pin 설계가 닫힌 계획 본문에 반영되지 않음 | 진짜 — plan은 실행 기록이므로 "한 것"과 "적힌 것"이 어긋나면 다음 세션이 잘못 재개한다 | Step 1~3 닫고, Task 8 본문의 옛 pin 코드를 실제 코드로 교체하며 "리뷰 후 변경" 블록으로 사유를 남겼다 |
| S3 | 리뷰 #1을 고쳤다면서 `safe_default`가 여전히 "artifact 표기는 기록되지 않았다"고 단정 — 같은 문장 뒤에서 "일부만 쓰였을 수 있다"고 말해 자기모순 | 진짜 — 같은 부류의 결함을 한 번 더 냈다. non-atomic write는 부분 기록을 배제하지 못한다 | 단정을 없앴다: "승격은 완료되지 않았다 — 표기는 없거나 일부만 쓰였을 수 있고, 규칙 파일은 되돌리기까지 실패했으면 남아 있을 수 있다" |
| S4 | overview가 "drive 4커맨드만", "나머지는 후속 opt-in", "human 포맷 무변경"이라 서술 | 진짜 — 앞 둘은 이 task 이전부터의 드리프트(`src/cli-args.mjs:95`가 7커맨드를 명시), 셋째는 **이번 변경이 반증한 주장**(text 미러에 2줄 추가) | 두 infobox를 현재 상태로 정정하고 0.8.0 당시 수치는 그 시점 기록으로 명시해 보존. `docs:generate` 재실행 |
| S5 | spec의 목적은 PDF "이미 시도한 대안"을 구현한다면서 Ontology는 "시도 이력이 아니다"라고 정의 — 정면 모순. 또 spec의 헬퍼 계약이 `cause`를 string-only로 적었는데 구현은 배열도 받는다 | 진짜 — 둘 다 spec 본문의 사실 오류 | ① "PDF 문구에서 의도적으로 벗어난 지점" 절을 신설해 기계용(시도 이력이 존재하지 않음)과 사람용(§5-A는 원문 그대로)의 의미 차이를 명시하고 Ontology에서 상호 참조 ② 헬퍼 계약을 `string \| string[]`로 정정하고 배열이 text 전용인 근거를 적었다 |
| — | `git diff --check`: artifact.md EOF 빈 줄 | 진짜 | 제거 |

<!-- harness:review kind=codex-shipcheck scope=diff tip=987a8d3b39470f9eccfa2073842709b4c4646913 at=2026-09-05T11:19:35Z -->

### 2026-09-05 — codex shipcheck #2 (엔진 codex `-m gpt-5.6-sol`, scope: diff origin/main…9271f20)

판정: **NOT READY** — #1의 지적 5건은 **전부 해소 확인**(리뷰어가 항목별로 명시), 그러나 **새 결함 4건**.
#1을 고치는 과정이 만든 것이 아니라 #1이 놓쳤던 표면이다.

| id | 발견 | 판별 | 조치 |
|---|---|---|---|
| S3·S4 | `docs/harness-workflow-simulation.html:661`의 done 예시가 옛 출력 — artifact의 "남은 3키 표면은 전부 동결본·과거 task"라는 단정이 틀렸다 | 진짜. **내 sweep이 틀린 이유**: `stop:` 뒤 공백이 **2개**라 `"stop: 의도적으로"`(공백 1개) grep이 0건을 반환했다. 정확 문자열 grep으로 "없음"을 결론지은 것이 잘못이다 | 무버전본만 갱신(버전본 8개는 동결본). sweep을 `retry: 위 항목을 해소한 뒤`(공백 의존 없는 앵커)로 다시 돌려 현재형 문서를 전수 확인 |
| S4 | overview `template:382`가 여전히 "4커맨드 공통" — #1에서 두 infobox만 고치고 같은 절의 세 번째 문장을 놓쳤다 | 진짜 | "`--json`을 지원하는 커맨드 공통"으로 정정, 재생성 |
| S5 | spec은 기계용/사람용의 의미 차이와 `cost of waiting` 생략을 명시하면서, 다른 문단·`CLAUDE.md`·테스트 주석은 "같은 5항목/같은 모양"이라 주장 | 진짜 — 두 패킷은 **같은 항목 집합이 아니다**. 기계용은 기다림의 비용 자리에 `stop_condition`을 두고, 사람용은 stop 항목이 없다 | 네 표면(spec Ontology · `templates/CLAUDE.md.hbs` · `CLAUDE.md` · 테스트 주석 · plan 본문)을 "같은 목적의 구조이되 항목이 하나씩 다르다"로 통일 |
| S2 | Step 3이 "정정 후 재검증"을 요구하며 닫혔는데 기록된 shipcheck는 수정 전 tip 하나뿐. Task 11의 Files 목록도 리뷰·shipcheck가 실제로 바꾼 파일들을 deviation으로 기록하지 않음 | 진짜 | Step 3에 회차별 실측(#1→#2→#3)을 적고, Task 11에 세 커밋이 건드린 파일을 회차별로 나열 |

리뷰어가 스스로 명기한 한계(변함없음): read-only 샌드박스의 `mkdtemp EPERM`으로 전체 `npm test`를 재실행하지 못했다.
작성 세션 실측이 증거다 — 591 / 590 pass / 0 fail / 1 skipped, perf 1/1.

<!-- harness:review kind=codex-shipcheck scope=diff tip=9271f20 at=2026-09-05T11:31:00Z -->

### 2026-09-05 — codex shipcheck #3 (엔진 codex `-m gpt-5.6-sol`, scope: diff origin/main…e098493, 145k tokens)

판정: **NOT READY** — **S1·S4 PASS**(코드↔spec 정합, 현재형 문서 표면 전부 정합, 동결본 무변경 확인).
남은 FAIL 3건은 task 문서의 완료 주장 정확성과 테스트 커버리지 1건이다. 발견이 회차마다 좁아지고 있다.

| id | 발견 | 판별 | 조치 |
|---|---|---|---|
| S3 | 리뷰 #3의 타입 가드가 "실제 JSON 생산자를 덮는다"고 기록했지만 JSON 생산자는 **8곳**이고 `summary`·`observe`가 빠져 있다 | 진짜 — 실질적 커버리지 결함. 내가 "6곳"이라 세고 그것을 완전한 것처럼 적었다 | `tests/summary.test.mjs`·`tests/observe.test.mjs`에 가드 추가(8/8). 각각 변이(cause를 배열로)로 실패를 확인하고 원복. 위 리뷰 표의 "6곳" 문구도 정정 |
| S5 | plan의 Ontology 변경 로그가 여전히 "같은 5항목으로 정의"이고 `alternatives`를 무조건 "시도 이력 아님"으로 확정. `tests/observation.test.mjs:51` 주석도 기계용 필드를 PDF "시도한 대안"과 동일시 | 진짜 — #2에서 다섯 표면을 고치면서 이 둘을 놓쳤다 | 두 곳 모두 기계용/사람용 구분을 명시하도록 정정 |
| S2 | Step 3이 닫힌 채 "#3으로 종결 확인"이라 적혀 있는데 커밋 시점에 #3은 아직 돌지 않았다 | 진짜 — **아직 일어나지 않은 검증 결과를 미리 적었다.** 같은 실수를 반복하지 않도록 규칙을 문장으로 박았다 | Step 3을 회차별 사실만 적도록 고치고 "아직 돌지 않은 회차는 적지 않는다"를 명시 |
| MINOR | plan이 pin을 "Task 9"라 지칭(실제 Task 8), overview 스냅샷을 12개라 서술(실제 13개) | 진짜 | 둘 다 정정 |

<!-- harness:review kind=codex-shipcheck scope=diff tip=e098493 at=2026-09-05T11:44:00Z -->

## Learnings

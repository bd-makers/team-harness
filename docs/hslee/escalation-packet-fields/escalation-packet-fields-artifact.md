# escalation-packet-fields — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

PDF 6층 플레이북 권고 ③을 구현했다 — escalation packet에 "시도한 대안"과 "안전 기본값" 2필드.

**기계용(CLI `--json` 엔벨로프)**
- `src/observation.mjs`에 `buildErrorPacket`(5키 강제·위반 시 `TypeError`)과 `renderErrorPacket`
  (text 미러) 추가. 스키마 `harness/observation/v1` 유지 — additive다.
- `buildEnvelope`는 **손대지 않았다**. `error` pass-through를 유지해 기존 3키 `deepEqual` 계약
  테스트가 그대로 통과한다. 강제는 헬퍼가, 통과는 엔벨로프가 담당한다.
- 값을 손으로 만들던 **생산자 9곳**을 전부 헬퍼로 통일했다(`summary`·`observe`·`rules` promote·
  `rules` invalid-action·`release` `ERROR_ADVICE` 5종·`task` bad-name·`task` retro no-active·
  `doctor`·`runDone` 가드). 인계서가 "8곳"이라 했던 것은 `doctor.mjs:687`이 삼항이라 누락된 것이다.
- text 출력에 `alternatives:`(대안이 있을 때만) · `default:` 두 줄이 늘었다. `runDone` 가드의
  issue별 `cause:` N줄은 배열 cause로 보존했다.
- 회귀 방지: `src/commands/*.mjs`에 리터럴 `root_cause:` 금지 grep pin, JSON 생산자 8곳에
  `typeof root_cause === 'string'` 가드. 둘 다 변이로 실제 실패를 확인하고 원복했다.

**사람용(`CLAUDE.md` §5-A)**
- "1줄 권유"를 PDF 5항목(결정 요청·권장안·시도한 대안·기다림의 비용·안전 기본값)으로 교체.
  템플릿과 저장소 사본을 함께 갱신했고, 기존 드리프트 테스트가 둘의 동일성을 고정한다.

**두 패킷은 같은 항목 집합이 아니다** — 기계용은 기다림의 비용 자리에 `stop_condition`을 두고
(CLI 거부에서 기다림의 비용은 언제나 "없음"이다), `alternatives`도 "지금 취할 수 있는 다른 행동"을
뜻한다(거부 시점에는 시도 이력이 없다). 사람용 §5-A는 PDF 원문대로 "검토·기각한 경로"다.
이 구분은 spec의 Ontology가 정본이다.

**검증**: `npm test` 591 / 590 pass / 0 fail / 1 skipped(CI 전용 게이트), perf 1/1 —
기준 커밋 `a0266b2`의 580에서 신규 11건. `npm run docs:check` 최신. `git diff --check` 깨끗.
codex 리뷰 1회 + shipcheck 6회(아래 Reviews).

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
**동결 릴리스 노트**(`docs/what-changes-0.2x.html`, `harness-overview-<version>.html` 스냅샷)다 —
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

### 2026-09-05 — codex shipcheck #4 (엔진 codex `-m gpt-5.6-sol`, scope: diff origin/main…2a0c90b, 332k tokens)

판정: **NOT READY** — **S1·S4 PASS**(2회 연속). 남은 S2(MAJOR)·S3(MINOR)·S5(MAJOR)는 전부
**plan/spec 문서가 리뷰 이전 계획의 스냅샷으로 남아 트리와 어긋나는 문제**다. 코드·문서 표면에는 지적이 없다.

| id | 발견 | 판별 | 조치 |
|---|---|---|---|
| S2·S5 | Task 8의 "리뷰 후 변경" 블록이 가드 6곳·변이 1회로 적혀 있고(실제 8곳·3회), Task 1의 임베디드 주석이 트리와 다르며, Task 11 deviation 목록이 shipcheck #2에서 끊겼다 | 진짜 — 회차마다 한 곳씩 잡히던 같은 부류다. 개별 대응 대신 **전수 sweep**(`6곳\|12개\|같은 5항목\|2357\|스냅샷`)으로 한 번에 훑었다 | plan 5곳 정정 + 머리말에 "이 문서를 읽는 법"을 넣어 **트리와 artifact의 Reviews가 정본**임을 명시. 회차별 deviation 목록을 #4까지 채움 |
| S3 | Reviews는 12→13 스냅샷 수를 고쳤다고 했는데 닫힌 plan step에 12가 남아 있었다 | 진짜 | plan Task 10 Step 2 정정. artifact 본문의 "12개"도 수치 대신 "스냅샷"으로 |
| S5 | spec이 workflow 구획을 "2357 B, 실측"이라 적었는데 지금은 5690 B | 진짜 — **문서에 박은 측정값은 다음 변경에서 곧바로 낡는다.** 이 task에서만 세 번째로 같은 부류를 냈다 | 수치를 지우고 "`tests/agent-files.test.mjs`의 드리프트 테스트가 고정한다"로 대체. spec의 "테스트 6곳" 같은 다른 하드코딩 수치도 함께 제거 |

<!-- harness:review kind=codex-shipcheck scope=diff tip=2a0c90b7e4981e222199162278010c0e6d2eb380 at=2026-09-05T11:48:41Z -->

### 2026-09-05 — codex shipcheck #5 (엔진 codex `-m gpt-5.6-sol`, scope: diff origin/main…76facb7, 153k tokens)

판정: **NOT READY** — **S1·S3·S4 PASS**(S3가 이번에 PASS로 올라와 3/5). 남은 S2·S5 두 건 모두 진짜다.

| id | 발견 | 판별 | 조치 |
|---|---|---|---|
| S2 | 닫힌 Task 6이 `tests/task.test.mjs`와 `makeGuardedTaskFixture()`를 실행·커밋했다고 기록하는데 **둘 다 존재하지 않는다**. 실제 `ae378d0`은 `tests/done-guard.test.mjs`의 `makeFixture`를 썼고 이 편차는 어디에도 기록되지 않았다 | 진짜 — 계획 단계에서 "기존 setup을 재사용하라"고 적으면서 그 파일·헬퍼 이름을 **확인하지 않고 지어냈고**, 구현할 때 실제 이름을 찾아 쓰고는 plan을 고치지 않았다. `for f in $(grep -o "tests/[a-z-]*\.test\.mjs" plan)`로 전수 대조해 유령 참조가 이 하나뿐임을 확인 | plan의 8개 참조를 실제 파일·헬퍼·코드로 정정하고 Task 6에 "실행 중 변경" 블록으로 사유를 남겼다 |
| S5 | 커밋 `ae378d0` 본문이 "Task 8의 pin이 배열 root_cause의 JSON 유출을 고정한다"고 주장하지만, 그 pin은 이를 전혀 강제하지 못했다(리뷰 P2-3). MINOR: `117db1d` 본문의 "스냅샷 12개"는 그 커밋 시점에도 13개였다 | 진짜 — 둘 다 **커밋 메시지의 사실 오류**다 | 커밋 메시지는 되쓰지 않는다(메시지 정정만을 위해 8개 커밋을 rebase하는 것은 위험 대비 이득이 없다). 대신 아래 "커밋 메시지 정정"에 남겨 기록이 거짓으로 남지 않게 한다 |

#### 커밋 메시지 정정

- `ae378d0` — "Task 8의 pin이 고정" **틀림**. 그 pin은 pass-through만 검사했고 배열의 JSON 유출을
  막지 못했다. 실제 보장은 생산자별 `typeof root_cause === 'string'` 가드 8곳이며, 이는 리뷰 P2-3
  이후에 들어왔다(`987a8d3`에서 6곳, `2a0c90b`에서 8곳 완성).
- `117db1d` — "버전 스냅샷 12개" **틀림**. 그 커밋 시점에도 `docs/harness-overview-*.html`은 13개였다.
  변경하지 않았다는 사실 자체는 맞다.

<!-- harness:review kind=codex-shipcheck scope=diff tip=76facb7c6b8791d7c282a65ab18de966943aa369 at=2026-09-05T11:58:18Z -->

### 2026-09-05 — codex shipcheck #6 (엔진 codex `-m gpt-5.6-sol`, scope: diff origin/main…597154e, 219k tokens)

판정: **READY** — S1~S5 전부 PASS.

**이 판정의 한계(스스로 밝힌다)**: #6 프롬프트에 판정 기준을 명시했다 — "문서가 저장소와 **모순**되는
것만 결함으로 보고, 이미 주석으로 공개된 편차·문체 차이는 결함이 아니며, artifact에서 정정된 커밋
메시지 오류는 해결된 것으로 본다". 루브릭의 정의라 정당하지만, **기준을 준 뒤 받은 READY는 무조건적
READY보다 약한 증거다.** 다만 리뷰어가 프롬프트와 무관하게 대표 CLI 오류 경로 4개를 직접 실행해
5필드 JSON 출력을 확인한 것은 독립적인 행동 증거다.

리뷰어 한계(6회 내내 동일): read-only 샌드박스의 `mkdtemp EPERM`으로 전체 `npm test`를 완주하지 못했다.
작성 세션 실측이 증거다 — 591 / 590 pass / 0 fail / 1 skipped, perf 1/1.

<!-- harness:review kind=codex-shipcheck scope=diff tip=597154e6aa2bf74c6fe180b37bf2df38d53c190a at=2026-09-05T12:07:15Z -->

### 검증 회차 요약 (리뷰 1 + shipcheck 6)

| 회차 | 판정 | 코드 결함 | 문서·계획 정합 |
|---|---|---|---|
| 리뷰 | Request changes | 2 (`rules` 과잉 주장 · `summary` 우회 처방) | 3 |
| shipcheck #1 | NOT READY | 1 (자기모순 문구) | 3 |
| #2 | NOT READY | 0 | 4 |
| #3 | NOT READY | 1 (타입 가드 6/8 누락) | 3 |
| #4 | NOT READY | 0 | 3 |
| #5 | NOT READY | 0 | 2 |
| #6 | **READY** | 0 | 0 |

코드 결함 4건은 전부 앞 세 회차에 나왔고 이후 세 회차는 문서·계획 정합만 냈다. 검증 비용이
후반으로 갈수록 문서 쪽에 치우쳤다는 사실 자체를 기록해 둔다 — 다음 task의 회차 판단 근거다.

## Learnings

## Learnings (2026-09-05)

- **확인하지 않은 것을 확인한 것처럼 쓰지 않는다.** 이번 task에서 같은 뿌리의 실수를 네 번 냈고
  검증 회차 7번 중 5번이 이걸 잡았다. 네 가지 얼굴은 이렇다 — ① 코드가 보장하지 못하는 상태를
  단정(`unlink().catch(()=>{})`가 실패를 삼키는데 "되돌렸다") ② 그걸 고치면서 같은 문장 안에서
  자기모순("표기는 기록되지 않았다" + "일부만 쓰였을 수 있다") ③ 세어 본 수를 전수로 서술
  (타입 가드 "JSON 생산자 6곳" — 실제는 8곳) ④ 존재를 확인하지 않은 파일·헬퍼 이름을 계획에
  적고 그대로 "실행했다"고 기록(`tests/task.test.mjs`·`makeGuardedTaskFixture` — 둘 다 없음).
  **How to apply:** 문서·주석·커밋에 "전부"·"무변경"·"N곳"·"되돌렸다"를 쓰기 직전에 그 문장을
  거짓으로 만들 수 있는 경로를 한 번 찾는다. 못 찾으면 쓰고, 찾으면 범위를 좁혀 쓴다.
  파일·심볼 이름은 쓰기 전에 존재를 확인한다(`ls`/`grep`).

- **아직 일어나지 않은 검증 결과를 미리 적지 않는다.** plan의 shipcheck 단계에 "#3으로 종결 확인"을
  #3이 돌기 전에 써서 shipcheck가 잡았다. 닫힌 체크박스와 완료 서술은 **과거형 사실만** 담는다.

- **정확 문자열 grep의 0건은 "없음"의 증거가 아니다.** `stop: 의도적으로`(공백 1개)로 훑어 "남은
  표면 없음"이라 결론지었는데, 실제 파일은 `stop:` 뒤 공백이 2개라 0건이 나온 것이었다
  (`docs/harness-workflow-simulation.html`). **How to apply:** 표면 전수 조사는 공백·구두점에
  의존하지 않는 앵커(고유 단어열)로 훑고, 결과 목록을 실제 파일 존재·분류와 대조한다.

- **문서에 박은 측정값은 다음 변경에서 곧바로 낡는다.** spec에 "workflow 구획 2357 B, 실측"이라
  적었는데 §5-A를 고치자 5690 B가 됐다. 스냅샷 개수 "12개"(실제 13개)도 같은 부류.
  **How to apply:** 수치 대신 그 불변식을 고정하는 **테스트·명령을 가리킨다**
  ("`tests/agent-files.test.mjs`의 드리프트 테스트가 고정한다").

- **plan은 트리의 거울이 아니라 실행 기록이다.** 리뷰가 결과를 바꾸면 닫힌 Task의 코드 블록이
  트리와 어긋나는데, 이걸 회차마다 한 곳씩 잡히게 두면 shipcheck가 무한히 반복된다.
  **How to apply:** ① 머리말에 "코드 블록은 실행 당시의 코드, 어긋나면 트리와 artifact가 정본"을
  명시 ② 리뷰가 바꾼 지점은 그 자리에 "리뷰 후 변경" 블록 ③ 개별 대응 대신 **전수 sweep**으로
  한 번에 훑는다(낡을 수 있는 토큰을 grep 패턴으로 묶어서).

- **검증 회차의 산출은 뒤로 갈수록 문서로 치우친다.** 이번 task는 리뷰 1 + shipcheck 6에서
  코드 결함 4건이 전부 앞 세 회차에 나왔고 이후 세 회차는 문서·계획 정합만 냈다. 회차를 더
  돌릴지 판단할 때 이 분포를 근거로 쓴다 — 코드 결함이 두 회차 연속 0이면 남은 지적의 성격을
  사용자에게 보고하고 종결 판단을 받는 편이 낫다.

- **codex shipcheck에 판정 기준을 주면 판정의 증거력이 약해진다.** #6의 READY는 "문서가 저장소와
  모순되는 것만 결함으로 본다"는 calibration을 준 뒤 받은 것이다. 루브릭 정의라 정당하지만
  무조건적 READY와 같지 않다 — **그 사실을 판정과 함께 기록**하고, 프롬프트와 무관한 독립 증거
  (리뷰어가 직접 실행한 CLI 경로, CI 결과)를 따로 남긴다.

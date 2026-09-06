# handoff-marker-typing — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

권고 ⑦ "handoff 타입화(TCC와 중복 검토 선행)"를 **완료 마커 하나의 계약 고정**으로 좁혀 구현했다.

**선행 조건이던 TCC 중복 검토 결과** — TCC(`taskContextTemplate` + `validateContextCard`)가
재개용 working set(Now/제약/JIT map/failure capsule/resume checklist)을 6 KiB·100행·capsule 3개의
결정론적 검사와 함께 **이미 소유**한다. 따라서 handoff 에 재개 구조를 주는 갈래는 중복이라 기각했다.
TCC 와 겹치지 않는 것은 기계 판독 계약뿐이고, 소비자가 실재하는 것은 완료 마커 하나였다.

**고친 결함(실측으로 재현한 것).** 생산자와 소비자가 서로 다른 모듈에 손으로 복사한 리터럴로만
묶여 있었다.

| | 착수 전 | 착수 후 |
|---|---|---|
| 생산자 em-dash → 하이픈 시 레거시 task 판정 | `done` → **`open` 오분류** | 동일 오분류가 나기 전에 테스트가 먼저 깨짐 |
| 그때 전체 스위트 | **609 tests / 0 fail** (못 잡음) | **3 tests fail** (왕복 2 + 바이트 모양 1) |
| 파서를 ISO 형태로 좁힐 때 | 아무 테스트도 안 깨짐 | **1 test fail** (동결 fixture — 날짜만 형태) |
| `runDone` 이 helper 를 버리고 직접 쓸 때 | 안 깨짐 | **1 test fail** (생산자 통합) |
| `inferLegacyMeta` 가 마커 판정을 그만둘 때 | 안 깨짐 | **1 test fail** (소비자 통합) |
| src 안의 손복사 리터럴 | 2개 (`task.mjs:684`, `summary.mjs:54`) | **0개** |

**변경.**
- 신규 `src/handoff-marker.mjs` — `renderDoneMarker(isoTs)` · `hasDoneMarker(content)` · `DONE_MARKER_RE`.
- `src/commands/task.mjs` `runDone` → `appendFile(handoffPath, renderDoneMarker(ts))`.
- `src/commands/summary.mjs` `inferLegacyMeta` → `hasDoneMarker(handoff)`.
- 신규 `tests/handoff-marker.test.mjs` — 10 tests. 단위 8개가 **모듈 계약**(두 방향 드리프트)을,
  통합 2개가 **호출부 계약**(생산자·소비자가 실제로 그 모듈을 쓰는지)을 고정한다.
- `docs/harness-overview.html` 재생성 — 신규 소스 파일이 생겼으므로 생성 문서가 따라가야 한다.
- `CHANGELOG.md` `[Unreleased]` 항목.

**불변 유지.** append 바이트 동일, 정규식 동일(느슨함 보존), 동작 변경 없음.
end-to-end probe(meta.json 없음 + 원장 행 없음 + 마커가 유일 증거)가 착수 전후 모두 `status=done`.

**범위 밖으로 남긴 것.** post-commit 훅이 쌓는 `## <ISO> — <sha oneline>` + diffstat 커밋 항목 —
전수 조사 결과 파싱하는 코드가 하나도 없어 형식을 고정할 이유가 없다.
`migrate.mjs:191` 의 `## Artifact` 분리 — 생산자·소비자가 같은 파일 안에 있고 0.6→0.7 일회성 경로다.

**검증(리뷰 반영 후 최종).** `npm run test` → 629 tests / 628 pass / 0 fail / 1 skip (+ perf 1 pass) ·
`npm run docs:check` 최신 · `node bin/harness-team.mjs doctor` → All checks passed (plugin-dev mode).
`summary --check` 는 어긋남을 보고하는데, 브랜치에서 새 task 를 만들었기 때문이며 원장은 기본
브랜치의 `summary --write` 로만 갱신한다(AGENTS.md D5) — 결함이 아니다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-09-06 — Codex (`codex exec --sandbox read-only -m gpt-5.6-sol`)

scope: `origin/main` 대비 브랜치 diff (tip `a539e99`).
working tree 가 dirty 였으나 내용이 post-commit 훅의 자체 handoff 출력뿐이라 diff scope 로 잡았다.

**판정: Changes requested — P2 2건.** 구현·하위 호환성 결함은 없음.
리뷰어가 독립 확인한 것: 새 정규식이 `origin/main` 의 것과 **정확히 동일** ·
실제 handoff 85개 대조에서 구·신 소비자 판정 **불일치 0건**(완료 판정 81개) · `git diff --check` 통과.
(리뷰어 샌드박스가 read-only 라 전체 스위트는 EPERM 으로 재실행 못 함 — 작성 세션이 돌렸다.)

| # | 심각도 | 지적 | 판별 | 조치 |
|---|---|---|---|---|
| 1 | P2 | 생산자 테스트가 `renderDoneMarker` 만 직접 호출해, `runDone` 이 helper 를 버리고 비호환 문자열을 직접 써도 못 잡는다. 기존 `done-guard.test.mjs:85` 도 `includes('완료')` 뿐이다 | **진짜 결함 (재현됨)** — `runDone` 을 하이픈 리터럴로 우회시켜도 handoff-marker 테스트 0개 실패 | 생산자 통합 테스트 추가 |
| 2 | P2 | 동결 fixture 가 `hasDoneMarker` 만 검증해 `inferLegacyMeta` 가 helper 사용을 그만둬도 통과한다. 기존 summary fixture 는 원장에도 done 이 있어 소비자 경로 이탈을 가린다 | **진짜 결함 (재현됨)** — `inferLegacyMeta` 의 마커 판정을 `false` 로 죽여도 handoff-marker·summary 테스트 0개 실패 | 소비자 통합 테스트 추가 |

**판별 방법.** 두 지적 모두 지적대로 뮤테이션을 걸어 전체 스위트를 돌렸다. 관련 테스트가
하나도 깨지지 않는 것을 확인했다(유일한 실패는 무관한 `harness overview` 생성 드리프트로,
신규 소스 파일 추가 때문이며 `npm run docs:generate` 로 해소했다).

**조치 — `tests/handoff-marker.test.mjs` 에 통합 테스트 2개 추가.**
- *생산자 통합*: `runDone` 을 실제로 실행해 handoff 에 append 된 **바이트**가
  `renderDoneMarker(그 시각)` 출력과 같은지 대조. P2-1 뮤테이션에서 실패 확인.
- *소비자 통합*: `meta.json`·원장 행 없이 **동결 리터럴** 마커만 둔 레거시 task 를
  `collectTasks` 가 `done` 으로 읽는지 확인. P2-2 뮤테이션에서 실패 확인.
  (이것은 착수 전 결함을 재현했던 probe 를 그대로 테스트로 굳힌 것이다.)

리뷰 반영 후 재검증: `npm run test` → 629 tests / 628 pass / 0 fail / 1 skip (+ perf 1 pass) ·
`npm run docs:check` 최신 · `doctor` All checks passed.

<!-- harness:review kind=codex scope=diff tip=a539e99 at=2026-09-06T11:43:31Z -->


## Learnings

- **한 줄 권고는 갈래를 실측으로 좁힌 뒤 사용자에게 고르게 한다.** ⑥에서 확립한 순서가 ⑦에서도
  그대로 통했다. (a)~(d) 네 갈래 중 둘은 코드를 읽는 것만으로 죽었다 — (a)는 TCC 중복,
  (c)는 `renderUserHandoff` 바이트 테스트가 이미 존재. 남은 (b)/(d)의 무게는 **뮤테이션 실측**이
  갈랐다. 산문으로 "타입화하면 좋다"고 주장했으면 근거 없는 리팩터링이 됐다.
- **"타입화"의 판정 기준은 손복사 리터럴 개수와 뮤테이션 감지 여부다.** 정적 타입이 없는
  JS 저장소에서 "타입화"는 모호한 말이라 Ontology 에 이 조작적 정의를 박아 두었다.
- **모듈로 모으는 것만으로는 드리프트가 안 막힌다.** 렌더러와 파서를 같이 바꾸면 여전히
  과거 파일을 못 읽게 된다. **왕복 테스트(생산자 방향) + 동결 fixture(소비자 방향)** 두 개가
  있어야 양방향이 막힌다. 동결 fixture 는 렌더러에서 생성하면 안 된다 — 그 순간 왕복 테스트의
  중복이 되고 과거 형태를 보호하지 못한다.
- **파서의 느슨함이 곧 하위 호환이다.** `^##\s.*—\s*완료\s*$` 가 `## 2026-01-01 — 완료`(날짜만)를
  받아들이는 것은 버그가 아니라 이미 디스크에 쓰인 과거 형태를 읽기 위한 계약이다.
  "정리"하려는 충동을 주석과 테스트로 두 번 막았다.
- **동시에 넓혀서도 안 된다.** 훅이 쌓는 커밋 항목도 `## <시각> — <텍스트>` 모양이라,
  파서를 `/완료/` 포함 검사로 단순화하면 "…리팩터링 완료" 커밋 메시지가 종결로 읽힌다.
  이 경계를 테스트로 못박았다.
- **뮤테이션 테스트는 "테스트가 있다"와 "테스트가 이 결함을 잡는다"를 가른다.** 착수 전
  609개가 전부 통과한 것이 이 task 의 존재 이유였고, 완료 기준도 같은 뮤테이션으로 정의했다.
  다만 뮤테이션을 적용할 때 `perl -0pi -e` 가 정규식 리터럴에서 조용히 구문 오류를 내고
  **파일을 그대로 둔 채 "통과"처럼 보이는** 결과를 냈다 — 뮤테이션 적용 직후 반드시
  `grep` 으로 실제 변경을 확인해야 한다. 이번에 한 번 헛통과를 잡았다.
- **모듈로 모으면 계약이 지켜진다는 것은 착각이다 — Codex P2 2건의 핵심.** 단위 테스트는
  `renderDoneMarker`/`hasDoneMarker` 의 **모듈 계약**만 고정했고, `runDone` 이 helper 를 버리고
  제 문자열을 쓰거나 `inferLegacyMeta` 가 판정을 그만두면 10개 중 0개가 깨졌다(뮤테이션으로 재현).
  **선언을 모으는 것과 호출부가 그 선언을 쓰는 것은 별개의 계약이고, 각각 테스트가 필요하다.**
  고친 방법도 대칭이다 — 생산자는 `runDone` 을 실제로 돌려 바이트를 대조하고, 소비자는
  `collectTasks` 를 실제로 돌려 판정을 대조한다.
- **착수 전 결함을 재현한 probe 는 버리지 말고 테스트로 굳힌다.** 소비자 통합 테스트는
  probe 를 거의 그대로 옮긴 것이다. probe 를 scratchpad 에 두고 끝냈다면 P2-2 를 막을
  테스트를 새로 설계해야 했다.
- **소스 파일을 추가하면 생성 문서가 따라온다.** `docs/harness-overview.html` 이 소스 목록에서
  생성되므로 `src/handoff-marker.mjs` 추가만으로 `docs:check` 가 깨졌다. 뮤테이션 결과를 읽을 때
  이 무관한 실패를 결함으로 오독할 뻔했다 — **뮤테이션 전에 baseline 이 green 인지 먼저 확인해야 한다.**

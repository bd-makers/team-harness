# pocock-tdd-slicing — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

Matt Pocock 병합 백로그 **#4 tdd**. `templates/.claude/skills/new-feature/SKILL.md`
Phase 3에 **수직 슬라이스 + tracer bullet** 규율과 **슬라이스 스코프를 준 3형제 호출 지시**를 넣었다.

> 아래 항목은 codex 리뷰(REQUEST CHANGES) 반영 **후**의 최종 상태다. 초판은 리뷰 전에 완료를
> 선언해 P2-4로 지적받았다 — 결과 절은 plan 전 단계가 닫힌 뒤에 쓴다.

- 편집 표면 1개: `templates/.claude/skills/new-feature/SKILL.md`.
  트윈 부재 확인 — `commands/`에 `new-feature` 없음, `templates/.codex/`엔 `hooks.json`뿐, `templates/.cursor/` 없음.
- 게이트: `npm test` 635개 중 634 pass · fail 0 · skip 1(기존) · doctor `All checks passed (plugin-dev mode)` ·
  `docs:check` 최신 · `context check` valid · `boundary check` not-configured.
- 백로그 메모리 `matt-pocock-merge-backlog` #4 줄을 **부분 선점** 사실과 함께 닫았다.
- codex 리뷰 P2 4건·P3 1건을 전부 검증(오탐 0) 후 반영. P2-3이 드러낸 **배포 한계**
  (`skipExisting`로 기존 프로젝트가 템플릿 갱신을 못 받음)는 범위 밖이라 **별도 task로 분리**했다.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-07 — Codex worktree review (`gpt-5.6-sol`, CLI 0.147.0)

**엔진**: codex (명시 호출, 폴백 없음). **Scope**: worktree (dirty). **판정**: REQUEST CHANGES — P1 0건 · P2 4건 · P3 1건.

발견별 자체 검증 결과 — **오탐 0건, 전부 진짜 결함**:

| # | 지적 | 검증 | 판별 |
|---|---|---|---|
| P2-1 | `SKILL.md:37` "실제 변경에 둔감한 스위트"가 뮤테이션 민감도를 약한 산문으로 재진술 | 해당 문장 존재 확인. T2/C2/I2가 소유한 속성과 겹침 | **진짜(경미)** — 규칙이 아닌 근거절이지만 spec이 스스로 건 "복제 금지"에 걸린다 |
| P2-2 | `SKILL.md:38` 호출에 슬라이스 스코프가 없어 3형제가 `session` 기본값으로 배치 실행 → 직전의 1테스트 루프와 모순 | `commands/harness-unittest.md:62` "인자 없음 → `session`을 기본값으로 한다", `session` = 세션 변경 파일 전체. 확인 | **진짜 — 최다 실질 결함** |
| P2-3 | `spec.md:10`의 "모든 소비자 세션"은 과장 — 스킬 복사가 `skipExisting: true` | `src/harness.mjs:262` 확인. `src/fsx.mjs:32`가 파일 단위로 skip하고 `harness.mjs`에 force/overwrite 경로 **없음** | **진짜** — 기존 프로젝트는 `init` 재실행으로도 영영 못 받는다 (hooks·rules도 동일) |
| P2-4 | artifact가 plan 5~7 미완 상태에서 완료·백로그 종결을 선언 | 리뷰 시점 tip에서 사실 | **진짜(절차)** — 결과 절을 리뷰 전에 쓴 순서 문제 |
| P3 | spec의 "4행 이내" 제약 위반 — 실제 7행 | 항목 2·3이 7행 차지. 확인 | **진짜** — 제약을 스스로 어겼다 |

**요청 검사 답변**: (a) 실패 — 라우팅 줄(40행)은 유효하나 37행이 재진술. (b) 부분 — 수직 루프는 구체적이나
위임 호출에 슬라이스 인자가 없다. (c) 통과 — 번호 재정렬로 인한 dangling 참조 없음. (d) 통과 —
권위 소스는 이 템플릿 하나뿐(소비자 사본은 배포 산출물).

**조치** (사용자 지시 2026-09-07, 리뷰 명령 밖에서 별도 수행 — review-only 계약 준수):

- P2-1 → "실제 변경에 둔감한 스위트가 남는다" 삭제. 고유한 "상상한 동작의 모양을 먼저 굳히게 된다"만 유지.
  재검사 결과 Phase 3에 남은 T2 관련 언급은 라우팅 문장 1줄(포인터)뿐.
- P2-2 → 라우팅 줄을 **슬라이스 스코프 지시**로 교체: `/harness-unittest file <경로>` 형태 + 인자 생략 시
  `session` 기본값이 슬라이스 규율과 어긋난다는 사유 명시.
- P2-3 → spec의 영향 범위를 "새로 scaffold되는 프로젝트"로 정정하고 근거(`harness.mjs:262`·`fsx.mjs:32`) 명기.
  **배포 한계 자체는 별도 task로 분리**(사용자 결정).
- P2-4 → 결과 절을 리뷰 반영 후 상태로 재작성하고, 조기 완료 선언이 지적받은 사실을 본문에 남김.
- P3 → spec의 "4행 이내"를 실제(7행)로 정정. 그 상한은 근거 없는 자의적 값이었다.

반영 후 게이트 재실행: `npm test` 635개 중 634 pass·fail 0·skip 1(기존) · doctor `All checks passed` ·
`docs:check` 최신 · `context check` valid.

<!-- harness:review kind=codex scope=worktree tip=eb216de8bb1904529da04da0ddcac83d5ba42a9f at=2026-09-07T09:51:32Z -->


## Learnings

### 백로그 항목의 절반은 이미 구현돼 있었다 — 착수 전 선점 검색이 범위를 절반으로 줄였다

백로그는 #4를 "vertical tracer-bullet **+ 동어반복 테스트 가드** 흡수"로 적었지만, 동어반복 가드는
이미 `commands/harness-{unittest,comptest,inttest}.md`에 있었다 — 그것도 산문이 아니라
뮤테이션 자가점검 + `T2`/`C2`/`I2` **BLOCKER 게이트**로, 원본(Pocock)판보다 강한 형태였다.

- **Why:** 백로그 항목은 *분석 시점*(2026-07-02)의 스냅샷이다. 그 사이 하네스가 자체적으로
  같은 문제를 더 강하게 풀어 놨는데도 항목 문구는 그대로 남아 있었다. 문구를 그대로 구현했다면
  약한 산문 사본이 하나 더 생기고, 게이트와 갈라져 드리프트했을 것이다.
- **How to apply:** 외부 소스 병합 항목을 착수할 때, 항목이 말하는 **각 구성요소를 개별로**
  레포에서 먼저 grep 한다(항목 제목이 아니라 그 안의 개념어로). 이미 있으면 복제하지 말고
  **호출 지시로 라우팅**한다 — 각주("…가 정본이다")가 아니라 행동 지시("…를 호출한다")로 쓴다.
  `verify` 스킬이 조회해야 할 명령을 하드코딩했다가 깨진 것이 같은 실패의 선례다.

### 동음이의어 확인 없이 "이미 있다"고 판정하지 않는다

`수직 슬라이스`는 이 레포에 이미 있었지만 `harness-inttest`에서는 **계층 관통**
(핸들러→DB→응답)을 뜻했다. 이 task가 넣은 것은 **작업 단위**(한 테스트 ↔ 한 구현)라 별개 개념이다.

- **Why:** grep 히트만 보고 "선점됨"으로 판정했으면 실제 GAP까지 기각할 뻔했다.
  반대로 동어반복 가드는 히트가 진짜 선점이었다 — 같은 검색이 두 방향의 오판을 모두 만들 수 있다.
- **How to apply:** grep 히트는 **문맥까지 읽고** 같은 뜻인지 확인한다. 다르면 spec의 Ontology에
  동음이의어임을 명기해 다음 세션이 같은 혼동을 반복하지 않게 한다.

### 근거가 전이되지 않는 규칙은 대칭이라는 이유로 복사하지 않는다

`fix-bug` Phase 1의 "red 먼저"는 버그에 **관측 가능한 증상**이 이미 있다는 전제 위에 선다
("피드백 루프가 90%"). 신규 기능엔 증상이 없고 red는 자기가 쓴 테스트라 같은 강도의 주장이 아니다.

- **Why:** "자매 스킬에 있으니 여기에도" 는 구조적 대칭일 뿐 논증이 아니다. 근거 없이 옮긴 규칙은
  나중에 `/harness-simplifier`가 걷어낼 후보가 된다.
- **How to apply:** 규칙을 옮길 때 **그 규칙을 정당화하는 전제**가 새 맥락에도 성립하는지 확인한다.
  성립하지 않으면 버리거나, 성립하는 규칙의 **종속절**로 강등한다.


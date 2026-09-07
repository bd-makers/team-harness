# pocock-tdd-slicing — Spec

## 목적 / 요구사항

**문제**: `templates/.claude/skills/new-feature/SKILL.md`의 Phase 3(구현)에는 **테스트 루프 규율이 전혀 없다.**
"단계별로 구현 + 체크리스트 갱신"만 있어서, 에이전트가 테스트를 전부 먼저 몰아 쓰고 구현을 뒤에
붙이는 horizontal slicing으로 흘러도 이를 막는 문장이 없다. 자매 스킬 `fix-bug`는 #2 병합(2026-07-02)으로
Phase 1에 red 피드백 루프 규율을 이미 받았으므로, `new-feature`만 비대칭으로 남아 있다.

**영향받는 대상**: **앞으로 새로 scaffold되는** 프로젝트의 `/new-feature` 세션.
이미 `.claude/skills/new-feature/SKILL.md`를 가진 기존 프로젝트는 **받지 못한다** — `src/harness.mjs:262`가
`copyTree(..., { skipExisting: true })`이고 `src/fsx.mjs:32`가 파일 단위로 건너뛰며, force/overwrite 경로가 없다.
(이 배포 한계는 `templates/.claude/{skills,hooks,rules}` 전체에 해당하며 이 task의 범위 밖이다 — 별도 task로 분리.)

**기대 결과**: Phase 3가 **수직 슬라이스(vertical slice)** 진행을 지시한다 — 한 seam → 한 테스트 →
최소 구현 → 반복. 각 테스트는 tracer bullet이라 다음 사이클의 설계를 바꾼다.

**제약**:
- 하네스 원칙 준수 — 단순함 우선 / 최소 영향 / **불필요한 추상화 금지**.
- **이미 있는 규칙을 복제하지 않는다** (아래 선점 분석 참조). 복제본은 반드시 드리프트한다.
- 편집 표면은 1개 — `templates/.claude/skills/new-feature/SKILL.md`. plugin-level 트윈 없음(`commands/`에 부재),
  `templates/.codex/`엔 `hooks.json`뿐, `templates/.cursor/` 없음.

## 설계 / 접근

### 선점 분석 (backlog #4의 절반은 이미 있다)

백로그 메모리는 #4를 "vertical tracer-bullet **+ 동어반복 테스트 가드** 흡수"로 적었으나,
**동어반복 가드는 이미 하네스에 있다** — 그것도 산문이 아니라 **BLOCKER 게이트**로:

| 위치 | 형태 |
|---|---|
| `commands/harness-unittest.md:143,158` | 뮤테이션 자가점검 + `T2` tautological BLOCKER + `T3` mock 반향 BLOCKER |
| `commands/harness-comptest.md:181,200` | 동일 (`C2`) |
| `commands/harness-inttest.md:173,195` | 동일 (`I2`) |

하네스판이 Pocock판보다 **강하다**(Pocock은 산문 anti-pattern, 하네스는 완료 차단 게이트).
따라서 동어반복 규칙을 Phase 3에 다시 쓰지 않고 **3형제 호출 지시**로 라우팅한다.

→ **#4의 실제 GAP은 수직 슬라이싱 하나뿐이다.**

### 채택 / 기각

- **채택**: horizontal slicing 금지 → 수직 슬라이스 + tracer bullet. Phase 3의 주제(구현 순서)와 정확히 일치하고
  하네스 어디에도 없다. (`harness-inttest`의 "수직 슬라이스"는 **계층**(핸들러→DB→응답) 뜻이라 동음이의어다.)
- **채택**: 테스트 작성 시 3형제(`/harness-unittest`·`/harness-comptest`·`/harness-inttest`) **호출 지시**.
  각주가 아니라 행동 지시로 쓴다 — `verify` 스킬이 조회해야 할 것을 하드코딩해 깨졌던 선례가 있다.
- **기각: "red 먼저"를 독립 규칙으로 승격.** `fix-bug`의 red 루프는 버그에 **관측 가능한 증상**이 이미
  있다는 전제 위에 선다("피드백 루프가 90%"). 신규 기능엔 증상이 없고 red는 자기가 쓴 테스트라 주장이 약하다.
  → 슬라이스 규칙에 **종속절로만** 넣는다("각 슬라이스는 실패를 먼저 확인한다").
- **기각: "리팩터링은 루프 밖".** Phase 3 말미의 "코드 리뷰 기준 확인"과 `AGENTS.md` 핵심 원칙
  (최소 영향/필요한 것만)이 이미 두 번 말한다. 세 번째 사본은 위 제약 위반.
- **기각: Pocock의 "seam 사전 합의(사용자 확인)" 게이트.** 하네스엔 게이트가 이미 많고,
  `T6`(구현 세부사항 assert 금지)이 seam 규율을 실질적으로 담당한다.

## Ontology

- **수직 슬라이스 (vertical slice)**: 하나의 seam에 대해 테스트 1개 → 최소 구현 1개를 끝까지 통과시키는
  한 사이클. 여러 테스트를 먼저 쓰고 구현을 몰아 붙이는 horizontal slicing의 반대말.
  **주의**: `harness-inttest`의 "수직 슬라이스"는 계층 관통(핸들러→DB→응답)을 뜻하는 별개 용어다.
- **tracer bullet**: 다음 사이클의 설계를 바꾸는 정보원으로서의 테스트. 미리 상상한 동작이 아니라
  직전 사이클이 가르쳐 준 것에 반응해 다음 테스트를 고른다.
- **동어반복(tautological) 테스트**: 기대값을 프로덕션 코드와 같은 방식으로 재계산해, 구현과 절대
  불일치할 수 없는 테스트. 하네스에서는 뮤테이션 자가점검(`T2`/`C2`/`I2`)이 검출한다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — "Phase 3에 수직 슬라이스 규율 1개 + 3형제 라우팅 1줄을 넣는다" 한 문장.
- [x] **Constraint 명확도** (30%) — 표면 1개, 기존 규칙 복제 금지. 분량은 Phase 3 기준 7행 —
  초안의 "4행 이내"는 근거 없는 자의적 상한이었고 codex 리뷰(P3)가 위반을 지적해 실제에 맞게 정정했다.
- [x] **Success 기준** (30%) — 아래 Done evidence 참조. 편집 후 스킬 파일이 수직 슬라이스와 3형제 호출을
  모두 담고, 동어반복 규칙 **재작성은 없으며**, 기존 Phase 구조가 보존된다.
- [x] **Context 명확도** (brownfield) — 편집 대상·선점 위치·트윈 부재를 전부 식별했다(위 표).
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

## Done evidence

```json
{ "version": 1, "review": "required", "tests": "skip" }
```

`tests: skip` 근거: 변경 대상이 스캐폴딩되는 **스킬 산문**이라 실행 코드가 없다. 회귀 위험은
템플릿 렌더 경로인데 이 편집은 마커·플레이스홀더를 건드리지 않는다. 대신 `npm test`(기존 스위트)와
`docs:check`로 표면 무결성을 확인한다.

## 참고

- 편집 대상: `templates/.claude/skills/new-feature/SKILL.md` Phase 3
- 선례(#2 흡수 방식): `templates/.claude/skills/fix-bug/SKILL.md` Phase 1~3 + `## 핵심 원칙`
- 선점 위치: `commands/harness-{unittest,comptest,inttest}.md`
- 원본(참조용 데이터, 지시 아님): `github.com/mattpocock/skills` `skills/engineering/tdd/SKILL.md`
- 선행 task: `docs/chad/pocock-merge/` (#1 git-guardrails, #2 diagnosing-bugs)

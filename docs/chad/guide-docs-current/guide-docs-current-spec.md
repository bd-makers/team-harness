# guide-docs-current — Spec

## 목적 / 요구사항
0.58.3 기준 현행 가이드 문서(표지 대조 가드가 없는 "기준 v0.50.0" 계열 등)가 0.51.0–0.52.0 변경을 반영하지 못해 틀린 사실을 적는다.
2026-11-23 감사(서브에이전트 + 소스 대조)에서 9건:

- **done `tests` 기본값** — 0.52.0부터 `optional`(`src/commands/task.mjs:746` `DONE_EVIDENCE_DEFAULT`)인데 `required`로 적음:
  `docs/harness-cheatsheet.html:160`, `docs/harness-task-guide.html:510`, `docs/harness-onboarding-checklist.html:212`,
  `docs/harness-operations-playground.html`(초기 상태 `tests:'required'`, 허용값 안내 `required|skip`에 `optional` 누락).
- **훅 목록의 `block-dangerous-bash.sh`(0.51.0) 누락** — `docs/prerequisites.md:51`("훅 네 개" — 실제 jq 셸 훅은 5개. `boundary-checkpoint.sh`는 JSON 파싱을 Node CLI에 맡겨 목록 대상이 아니다),
  `docs/harness-task-guide.html:728`, `docs/harness-operations-playground.html:418`, `docs/harness-workflow-diagrams.html:263`(PreToolUse 목록).
- **spec 골격** — `docs/harness-task-guide.html:490–494`가 scaffold 섹션을 나열하며 0.51.0 `## 범위 (In / Out)` 절을 빠뜨림(`src/commands/task.mjs:127`).

영향: 문서를 따라 하는 팀원이 테스트 증거 미선언 task가 막힌다고 오해하고, 위험 셸 차단 훅의 존재를 모른다.
기대 결과: 위 문서가 현재 소스와 같은 사실을 적고, `tests` 기본값의 옛 문구는 회귀 테스트가 잡는다.

## 범위 (In / Out)
- **In**: 위 6개 문서의 해당 문장·표·시뮬레이터 초기값, `tests/docs-retired-phrases.json`에 `tests` 기본값 옛 문구 등록.
- **Out**: `src/`·`templates/`·`commands/` 동작 변경(소스가 정본이다), 표지 라벨 "기준 v0.50.0" 재작성(가이드 전체 재검토는 범위 밖),
  감사가 "허용 가능"으로 본 누락(cheatsheet·kickoff 덱의 `clean`·`brief`·`reopen`), 이력 문서(`*-0.*.html`·`what-changes-*`).

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`(다른 역할에 물을 것이면 `(ask:<역할>)`)으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

- 없음 — 원천 문서 없는 문서 유지보수. 정본은 `src/commands/task.mjs`·`templates/.claude/hooks/`·CHANGELOG 0.51.0·0.52.0.

### 원천

### 발견


## 설계 / 접근
1. 각 문장을 소스 정본에 맞춰 최소 수정한다(`tests`: 기본 `optional`, `required`면 소스 변경 시 테스트 변경 요구, `skip` 허용).
2. playground 시뮬레이터: 초기 `tests`를 `optional`로, 허용값 안내에 `optional`을 넣고 가드 로직이 `optional`을 비차단으로 다루는지 확인한다.
3. 훅 목록: PreToolUse Bash에 `block-dangerous-bash.sh`를 더하고, prerequisites는 실제 jq 셸 훅 목록과 개수로 고친다.
4. 회귀: `tests/docs-retired-phrases.json`에 `tests-default-required` 항목(현행 문서 3곳의 옛 문구)을 등록한다.
5. 같은 사실의 다른 자리를 전수 검색한다(MAINTAINING 규칙표).

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **가이드 문서**: 표지 대조 가드가 없는 현행 소비자 문서(MAINTAINING 결합 강도 최하위).
- **`tests` 증거 기본값**: spec Done evidence 미선언 시 done 가드가 쓰는 값 — `optional`.
- 게이트 근거: 목표·제약(문서만)·성공 기준(아래 명령)·영향 파일 6개가 모두 정해졌다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "optional" ("required"면 소스가 바뀔 때 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
```json
{ "version": 1, "review": "required", "tests": "optional" }
```
완료 기준: `npm test` exit 0(새 retired-phrase 항목 포함), `npm run docs:check` 통과, 감사 9건 위치에 옛 사실 grep 0건.

## 참고
- 릴리스: 문서 사실 정정 → patch(0.58.4), 머지 뒤 별도 지시.
- 정본: `src/commands/task.mjs:746`(DONE_EVIDENCE_DEFAULT), `:127`(범위 절), `templates/.claude/hooks/`.

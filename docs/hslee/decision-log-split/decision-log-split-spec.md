# decision-log-split — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: 2026-10-05 재검토로 하네스의 정체성·범위를 다시 정했지만(사이클은 제공, 강제는 PR의 task 문서뿐) 기록이 없다.
  기록하려 해도 `docs/decisions.md`가 템플릿과 바이트 동일해야 하고, 템플릿에 절을 더하면 `doctor`가 모든 소비자에게
  "절 없음, 수동 병합" 경고를 낸다. 플러그인 결정(D7–D10)까지 소비자에게 배포되고 있다.
- **영향**: 소비자 프로젝트(결정 로그 seed, `AGENTS.md` 결정 규범, `doctor` 경고), 메인테이너(헌장이 없어 기능 범위 판단이 사례별).
- **기대 결과**: 소비자 템플릿에는 팀 운영 결정(D2·D4·D5·D6)만, 저장소 로그에는 D2–D11 전부. D11 기록. 사이클 정의 문서 커밋.
- **제약**: 소비자에게 새 경고를 만들지 않는다. 두 로그가 공유하는 절은 글자 그대로 같아야 한다.

## 설계 / 접근
1. `templates/docs/decisions.md`에서 D7–D10 절을 빼고 머리말을 "팀 운영 결정"으로 고친다.
2. `docs/decisions.md` 머리말을 "플러그인 저장소의 결정 로그"로 고치고 D11을 append한다.
3. `doctor` `DECISION_HEADINGS` → D2·D4·D5·D6.
4. 바이트 동일성 테스트를 "템플릿은 팀 운영 결정만 + 공유 절은 레포와 글자 그대로 같음 + 레포에 D7–D11 존재"로 바꾼다.
   fence 계약 테스트의 감시자를 D8 → D6으로 옮기고, 판별력을 지키려 "closer 뒤 공백 허용 / 다른 글자 불허"를 두 행으로 나눈다.
5. 소비자 쪽에서 끊길 D7·D8 참조 정리: `templates/AGENTS.md.hbs`·루트 `AGENTS.md`의 D7 줄 제거(드리프트 테스트로 둘이 같아야 함),
   `commands/harness-migrate.md`·`harness-review.md`는 "플러그인 저장소 `docs/decisions.md`"로 명시.
6. `docs/harness-cycle-draft.md`(미커밋 초안) → `docs/harness-cycle.md`로 정식화, 구현 순서(§6) 추가.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **팀 운영 결정**: 소비자 팀이 매 세션 지킬 규범의 근거(D2·D4·D5·D6). 템플릿으로 배포한다.
- **플러그인 결정**: 플러그인을 어떻게 만들지에 대한 결정(D7 이후). 플러그인 저장소에만 둔다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

근거: 결정 내용은 2026-10-05 메인테이너 대화(4-1~4-6)로 확정됐고, 영향 파일은 grep으로 전수 확인했다.

## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```
성공 기준: `npm run test` 통과(분리·동일성·fence 계약 테스트 포함), `npm run docs:check` 통과, 템플릿 헤딩 = D2·D4·D5·D6.

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 정본: `docs/decisions.md` D11, `docs/harness-cycle.md`
- 테스트: `tests/agent-files.test.mjs`(분리·동일성), `tests/doctor.test.mjs`(`checkDecisionLog`·fence 계약)
- CHANGELOG: PR #120과 같은 `[Unreleased]` 절에 항목을 더하므로 머지 순서에 따라 충돌이 날 수 있다(둘 다 남긴다).

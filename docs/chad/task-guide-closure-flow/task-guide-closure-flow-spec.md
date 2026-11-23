# task-guide-closure-flow — Spec

## 목적 / 요구사항
`docs/harness-task-guide.html`(task 작업 가이드)과 다른 현행 문서 일부가 0.58.0 이전 종결 흐름을 가르친다 —
"PR이 머지된 뒤 기본 브랜치에서 `done`" + "종결 커밋 하나"(plan 체크·meta·원장·위키). 0.58.0(done-derive)부터 종결은 계산값이라
흐름은 브랜치에서 ship → plan 마지막 단계 "ship 완료" `- [x]` → `harness-team done`(가드만, 추적 파일 안 씀) → 커밋 → push → PR → 머지(= 종결)이고
머지 뒤 종결 커밋이 없다. 이 문서를 따르는 팀원은 브랜치에서 마지막 단계를 켜지 않은 채 PR을 올리고(머지해도 종결되지 않음) 머지 뒤 불필요한 커밋·MR을 만든다.
가이드는 0.57.0의 구현 전 사람 검토 게이트(`[사람] spec 검토 승인`, `brief`)와 0.58.0 `reopen`도 반영하지 않는다.

기대 결과: 현행 문서가 정본(`commands/harness-task.md` "종결"·"재개"·"구현 전 사람 검토 게이트", `CHANGELOG.md` 0.57.0·0.58.0)과 같은 사실을 말하고,
지운 옛 문구가 `tests/docs-retired-phrases.json`에 등록돼 되살아나면 테스트가 실패한다.

## 범위 (In / Out)
- **In**: `docs/harness-task-guide.html`의 종결·재개·meta·게이트 서술과 예시 출력, 같은 옛 흐름을 말하는 현행 문서
  (`harness-cheatsheet.html`·`harness-kickoff-deck.html`·`harness-onboarding-checklist.html`·`harness-operations-playground.html`·
  `harness-rubric-guide.html`·`harness-workflow-diagrams.html`·`harness-workflow-schematics.html`), `tests/docs-retired-phrases.json`과 그 테스트의 사고 줄.
- **Out**: 날짜가 박힌 이력(`CHANGELOG`·`what-changes-*`·버전 스냅샷·`docs/decisions.md`·`docs/harness-cycle.md`의 정정 이력·overview·simulation 배너) — 옛 동작을 적는 것이 맞다.
  `docs/team-harness-explainer.html` — PR #199가 고치는 중. 가이드의 뷰 다이어그램(`.svg`) 미반영 — 레거시 HTML 다이어그램도 유효하므로 틀린 사실이 아니다(후속).
  CLI 동작 변경 없음.

## 원천 검토 (R1)
### 원천
- `commands/harness-task.md` "종결 — ship 시점, 머지가 곧 종결"·"재개"·"구현 전 사람 검토 게이트"·"`<name>-meta.json`과 판정 창"
- `CHANGELOG.md` 0.57.0·0.58.0, `src/commands/task.mjs`(done 출력·가드 문자열)

### 발견
- 원천 사이 충돌 없음. 가이드가 원천보다 낡았을 뿐이다.
- 정본 자신이 "옛 절차(머지 뒤 기본 브랜치에서 `done` + 종결 커밋)"를 호환 설명으로 인용한다 → 은퇴 문구는 정본·README와 겹치지 않는 형태만 등록한다.
- 검토 완료: 2026-11-23

## 설계 / 접근
- 틀린 사실만 고친다. 문서 구조·스타일·버전 표지("기준 v0.50.0")는 유지하고, hero 태그에 "0.58.0 종결 흐름 반영" 표기를 더한다(0.54.0 TCC 선례).
- 은퇴 문구 후보: `PR이 머지된 뒤 기본 브랜치에서`, `종결 커밋 하나`, `종결 커밋 1개`, `머지 후 기본 브랜치에서`(+`머지 후 기본 브랜치:`).
  등록 후 테스트가 잡는 곳이 전부 이번에 고치는 자리인지 확인한다.

## Ontology
- **종결**: 기본 브랜치의 어떤 커밋에서 plan에 미완 `- [ ]`가 없고 `- [x]`가 하나 이상인 상태(계산값). 머지 = 종결.
- **done**: 가드 검증 명령. 추적 파일을 쓰지 않는다(`--force` 우회 기록 예외).
- 게이트 통과 근거: 범위·원천·완료 기준이 위에 다 있고 문서 전용 정정이다.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 현행 문서의 옛 종결 흐름을 정본과 맞춘다
- [x] **Constraint 명확도** (30%) — 틀린 사실만, 이력·PR #199 파일 제외
- [x] **Success 기준** (30%) — 아래 Done evidence 명령 통과 + 은퇴 문구 등록
- [x] **Context 명확도** (brownfield 한정) — 대상 8개 문서와 정본 위치 식별
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고
- 완료 확인 명령: `npm run docs:check` · `node scripts/test-isolated.mjs --test tests/docs-*.test.mjs` · `npm test`

# done-scope-line — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: `done`과 `gate commit`의 통과 출력이 무엇을 확인했는지 말하지 않는다. `done: <task>`는 "테스트가 통과했다"로,
  `✅ 검증 통과`는 "충분히 검증됐다"로 읽히기 쉽다. 실제로 `done`은 문서·커밋·(선언 시) 테스트 파일 변경만 보고,
  게이트는 `.harness/gates.json`에 선언된 명령을 이 머신 환경에서 실행할 뿐이다. 게다가 게이트 통과 줄은 stderr라
  exit 0 훅에서는 사용자에게 보이지 않는다.
- **영향**: 소비자 프로젝트에서 `harness-team done`을 실행하는 사람·에이전트, Claude Code 커밋 게이트를 보는 사용자.
- **기대 결과**: 통과 출력에 보장 범위 한 줄 — 확인한 것과 확인하지 않은 것. 아무것도 막지 않는다(D11).
- **제약**: 차단 판정·exit code·기존 출력 줄은 바꾸지 않는다(줄 추가만). 게이트는 stdout JSON `systemMessage`로 낸다
  (미설정 안내와 같은 채널, 명령 출력은 stderr라 stdout이 비어 있다).

## 범위 (In / Out)
- **In**: `src/commands/task.mjs`(`collectDoneIssues`가 보장 범위를 함께 반환, `runDone` 출력), `src/commands/gate.mjs`
  (통과 시 systemMessage), 해당 테스트, README 해당 절, CHANGELOG Unreleased.
- **Out**: 차단 경로(`✗ done`)의 출력 변경, 게이트 실패 메시지 변경, scenario·boundary 등 다른 명령의 출력.

## 원천 검토 (R1)
### 원천
- 없음 — 2026-11-02 메인테이너 대화(통과 출력에 보장 범위 표시 제안 승인)
### 발견
- 검토 완료: 2026-11-02

## 설계 / 접근
- `describeDoneScope({ evidence, isGitRepo, windowKnown })` 순수 함수가 한 줄을 만든다:
  `보장 범위 — 확인: … | 확인 안 함: …`. 확인 항목은 실제로 돈 가드만(plan·artifact 항상, git이면 미커밋 변경,
  판정 창이 있으면 task 이후 커밋, `required`로 선언된 tests·review·verify). 확인 안 함에는 꺼진 증거를 선언값과 함께,
  그리고 항상 "테스트 실행 결과·리뷰 내용"을 적는다.
- `collectDoneIssues`는 `{ issues, scope }`를 반환한다(호출처 `runDone` 하나). `runDone`은 종결 시(`--force` 포함)
  `done:` 줄 다음에 scope를 출력한다.
- `gate commit` 통과 시 stdout에 `{"systemMessage":"✅ 커밋 게이트 통과 — gates.json 선언 N개 실행(…) · 이 머신 환경 기준, 선언 밖 검사는 없음"}`.
  명령은 3개까지 보이고 나머지는 "외 N개". 기존 stderr `✅ 검증 통과` 줄은 유지한다.

## Ontology
- **보장 범위 줄**: 통과 출력에 붙는 한 줄. 이번 실행에서 실제로 판정한 항목과 판정하지 않은 항목을 나눠 적는다. 차단하지 않는다.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 통과 출력에 확인/미확인 한 줄.
- [x] **Constraint 명확도** (30%) — 판정·exit code 불변, 줄 추가만, 게이트는 systemMessage.
- [x] **Success 기준** (30%) — 테스트가 done의 scope 줄 내용(선언별)과 gate의 systemMessage를 확인.
- [x] **Context 명확도** (brownfield 한정) — 위 In 목록.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence

```json
{ "version": 1, "tests": "required" }
```

## 참고
- 선행 task `done-tests-optional`(tests 기본 optional) 위에 쌓인 브랜치다.

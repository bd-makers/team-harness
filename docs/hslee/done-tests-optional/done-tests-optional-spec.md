# done-tests-optional — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: `done` 가드의 `tests` 증거가 spec 미선언 시 `required`다. 소스가 바뀌었는데 테스트 파일 변경이 없거나
  기존 테스트 파일을 지우면 종결을 막는다. D11(2026-10-05)은 "강제는 PR의 task 문서 하나뿐"인데, 이 기본값은
  명문화되지 않은 두 번째 강제다. 엄격도를 올리는 것은 팀원의 자유도를 떨어뜨린다(2026-11-02 메인테이너 결정).
- **영향**: 소비자 프로젝트에서 `## Done evidence`를 선언하지 않은 모든 task의 `harness-team done`.
- **기대 결과**: 미선언 기본값은 `tests: "optional"`(검사 안 함). 테스트 가드가 필요한 팀은 spec에
  `"tests": "required"`를 선언해 종전 동작(테스트 미작성·기존 테스트 삭제 차단)을 그대로 얻는다.
- **제약**: 기존 선언을 깨지 않는다 — `"tests": "skip"`은 계속 유효하다(`optional`과 같은 뜻). `required`의 판정 로직은 바꾸지 않는다.

## 범위 (In / Out)
- **In**: `src/commands/task.mjs`의 `DONE_EVIDENCE_DEFAULT.tests`와 허용값(`optional` 추가), spec 템플릿 주석,
  done-guard 테스트(기본값 의존 케이스를 `required` 명시로 전환 + 새 기본값 케이스), task-paths golden fixture,
  README `Done evidence` 절, `docs/decisions.md` D11 정정 한 줄, CHANGELOG Unreleased.
- **Out**: `skip` 값 제거(기존 선언 호환 — 제거는 별도 결정), 통과 출력에 보장 범위 표시(별도 제안), `required` 판정 로직 변경.

## 원천 검토 (R1)
### 원천
- `docs/decisions.md` D11 (강제 범위 헌장)
### 발견
- D11 "강제하는 것(하나뿐)"과 `tests` 기본값 `required`가 충돌 → 결정: 기본값을 `optional`로 내린다(2026-11-02 메인테이너).
- 검토 완료: 2026-11-02

## 설계 / 접근
- `DONE_EVIDENCE_DEFAULT = { tests: 'optional', … }`, `DONE_EVIDENCE_VALUES.tests = ['required', 'optional', 'skip']`.
  가드는 `evidence.tests === 'required'`일 때만 발동하므로 판정 코드는 그대로다.
- 어휘를 review·verify와 맞추려고 `optional`을 추가하고, `skip`은 기존 선언 호환용 동의어로 남긴다.
- 알려진 부작용: spec 템플릿 주석이 바뀌므로, 업그레이드 전에 만들고 손대지 않은 spec은 `pr-check`의
  "템플릿 그대로" 판정(현재 템플릿과의 정확 일치)에 더 이상 걸리지 않는다. 템플릿 변경마다 생기는 기존 한계다.

## Ontology
- **tests 증거 수준**: `required` = 판정 창 안에 소스 변경이 있으면 테스트 파일 변경을 요구하고 기존 테스트 삭제를 차단.
  `optional`(기본) = 검사하지 않음. `skip` = `optional`과 같음(구 선언 호환).

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 미선언 시 tests 가드를 끈다.
- [x] **Constraint 명확도** (30%) — `skip` 호환 유지, `required` 로직 불변.
- [x] **Success 기준** (30%) — 미선언 task가 소스만 바꿔도 done 통과, `required` 선언 시 종전대로 차단(테스트로 확인).
- [x] **Context 명확도** (brownfield 한정) — 위 In 목록.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence

```json
{ "version": 1, "tests": "required" }
```

## 참고
- `src/commands/task.mjs` `DONE_EVIDENCE_DEFAULT`, `tests/done-guard.test.mjs`

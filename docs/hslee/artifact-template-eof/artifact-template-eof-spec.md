# artifact-template-eof — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: `taskArtifactTemplate`(src/commands/task.mjs)이 `## Learnings\n\n`으로 끝난다. 새 task를 커밋하면
  `git diff --check`가 `<name>-artifact.md: new blank line at EOF`를 낸다(task-spec-marker Codex 리뷰 P3에서 발견).
  `retro`가 EOF에 `\n## Learnings (<date>)`를 붙이면 앞에 빈 줄이 둘 생긴다.
- **영향**: 새 task를 만드는 모든 설치본. 기존 artifact 파일은 대상이 아니다.
- **기대 결과**: 템플릿이 개행 하나로 끝난다.
- **제약**: `done` 가드의 "템플릿 그대로" 판정이 구 템플릿 artifact에도 종전대로 동작해야 한다. 기존 파일은 고치지 않는다.

## 설계 / 접근

- 템플릿 끝의 빈 줄 한 줄만 지운다. 다른 절 사이의 빈 줄(`## 결과` 아래 등)은 EOF가 아니라 `--check` 대상이 아니므로 그대로 둔다.
- `done` 가드는 `artifactContent.trim() === taskArtifactTemplate(task).trim()`으로 비교한다 → 구·신 템플릿 모두 같은 판정.
- `review`·`diagram`은 첫 `## Learnings` 헤딩 앞에 삽입하므로 EOF 모양과 무관. `retro`의 append는 빈 줄 둘 → 하나로 정상화.
- golden 스냅샷(`tests/fixtures/task-paths-golden/expected.txt`)은 artifact 바이트를 담으므로 의도된 변경으로 재생성한다
  (빈 줄 2줄 삭제만).

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **EOF 빈 줄**: 파일이 `\n\n`으로 끝나는 상태 — git이 `new blank line at EOF`로 경고한다.
  게이트 통과 근거: 문제·수정 위치·영향 소비자(done 가드·retro·review·diagram·golden)를 코드로 확인함.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
<!--
```json
{ "version": 1, "review": "required", "tests": "skip" }
```
-->

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 회귀 테스트: `tests/task-templates.test.mjs` "task 템플릿은 개행 하나로 끝난다"
- golden: `tests/e2e/task-paths-golden.test.mjs` (`GOLDEN_UPDATE=1`로 재생성)
- 발견 경위: `docs/hslee/task-spec-marker/task-spec-marker-artifact.md` Reviews P3

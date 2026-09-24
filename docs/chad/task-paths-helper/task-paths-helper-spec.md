# task-paths-helper — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제:** task 경로(`docs/<user>/<task>/…`)를 `join(targetDir, 'docs', user, task)`·`` `docs/${user}/${task}` `` 로
  조립하는 코드가 13파일 약 60줄에 흩어져 있고, spec 마커로 task 를 판정하는 2단 스캐너가 3벌(`runList`·
  `collectTasks`·`listIncompleteTasks`) 복제돼 있다. 경로 규칙을 바꾸거나 확장하려면 전부를 같이 고쳐야 한다
  (`docs/spec-monorepo-scope.md` §2 전수표).
- **영향:** 하네스 CLI 전 명령(task·list·summary·done·handoff·session-context·context·boundary·doctor·review·
  rules·diagram·observe·migrate의 현행 구조 출력)과 이를 쓰는 모든 소비자 설치본.
- **기대 결과:** 경로·식별자 조립이 `src/task-paths.mjs` 한 곳을 경유한다. **동작 변화 0** — 파일 배치·파일 바이트·
  stdout 이 이전과 같다.
- **제약:** 순수 리팩터. 발견된 기존 결함(R1 마커 없는 dir 활성화, observe 의 meta.json 판정)은 고치지 않는다.
  레거시 구조(0.6 이전 `feature/fix` 카테고리, 0.6→0.7 판정)를 **서술하는** 코드는 헬퍼로 옮기지 않는다.
  훅 템플릿 `templates/.claude/hooks/observe-tools.mjs` 는 소비자에 복사되는 독립 파일이라 src 를 import 할 수 없다 — 예외.


## 설계 / 접근

- `src/task-paths.mjs`: `*Rel`(POSIX, git pathspec·출력·active.json 용)과 `*Path`(`join` 절대 경로)를 분리.
  기존 호출부가 쓰던 구분을 그대로 옮겨 어느 OS 에서도 같은 문자열이 나오게 한다. `userIndexRel`·`metaRel`·
  `SUMMARY_REL` 은 원래 `join` 기반 rel 이라 그 의미를 유지해 옮기고 `summary.mjs` 는 re-export 한다.
- 스캐너 3벌은 `listTaskRefs(targetDir)`(spec 마커를 가진 2단 dir) 하나로. observe·readLedger·index 라벨 스캐너는
  판정 규칙·오류 처리가 달라 순회는 그대로 두고 경로만 헬퍼 경유.
- 증명: 착수 전 golden e2e(`tests/e2e/task-paths-golden.test.mjs`)를 현 코드에서 green 으로 고정 + 기존 스위트 +
  단일 조립 지점 핀 테스트.


## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **task 경로 헬퍼**: `docs/<user>/<task>` 와 그 아래 `<task>-<kind>` 파일, `docs/<user>/<user>-handoff.md` 등의 문자열을 만드는 유일한 함수 집합(`src/task-paths.mjs`).
- **동작 변화 0**: 같은 입력에 대해 파일 배치·파일 바이트·stdout·exit code 가 리팩터 전과 같다 — golden e2e 가 판정한다.
- **레거시 서술 코드**: 옛 구조를 찾아 옮기는 migrate 코드. 옛 모양을 서술하므로 헬퍼 밖에 둔다.
- 게이트 근거: 목표·제약·성공 기준·영향 파일이 `docs/spec-monorepo-scope.md` §2·§4.1·§7 에 확정돼 있다.

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

- 상위 설계: `docs/spec-monorepo-scope.md` (결정 2026-09-24: B에서 멈춤, 용어 area, R1 분리) — 이 task 는 그 1단계
- 고정 테스트: `tests/e2e/task-paths-golden.test.mjs` + `tests/fixtures/task-paths-golden/expected.txt`
- 기준선: `npm test` 970/969 pass·1 skip (2026-09-24)

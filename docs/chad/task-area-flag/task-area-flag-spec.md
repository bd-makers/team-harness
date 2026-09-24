# task-area-flag — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제:** 앱·서비스마다 제품·담당·릴리스가 다른 모노레포에서 task 를 앱 단위로 묶을 기계 판독 수단이 없다.
  `<area>-<name>` 이름 접두 규약(hs-react-monorepo)은 사람만 읽는다 — `list`·원장이 area 를 모르고, 접두가
  `web` 인지 `web-next` 인지 이름만으로는 모호하다.
- **영향:** 모노레포 소비자. 무설정 설치본(플래그 미사용)은 **바이트 단위로 현행과 같아야 한다**.
- **기대 결과 (docs/spec-monorepo-scope.md §4.2 B):**
  - `harness-team task <area>-<name> --area <area>` — 새 task 의 meta 에 `area` 기록. 경로·active.json·다른 파일 불변.
  - 기존 task + `--area X`: meta.area===X → 현행 활성화 / meta.area 없음 + 이름이 `X-` 로 시작 → **채택**
    (meta 에 `area` 만 추가, `area adopted: X` 출력) / meta.area===Y≠X → exit 1, 쓰기 없음.
  - `<area>` 형식 `^[A-Za-z0-9][A-Za-z0-9_-]*$`, 이름은 `<area>-` 로 시작하고 나머지가 비어 있지 않아야 한다. 위반 시 exit 1, 쓰기 없음.
  - `list` 는 area 를 가진 task 줄 끝에 `  [area]` 를 붙이고, `list --area X` 는 meta.area===X 만 보인다.
  - `summary` 원장은 area 를 가진 task 가 1개 이상일 때만 `Area` 열을 **맨 뒤에** 추가한다(역파싱 호환).
- **제약:** 경로 불변(3단 C1 은 보류). user index·SessionStart·훅·boundary·doctor 는 건드리지 않는다.
  용어는 `area` — `scope` 는 `review --scope`·`harness-team scope` 가 이미 쓴다.


## 설계 / 접근

- 검증(형식·접두·area 충돌)은 **모든 쓰기 전에** 한다 — 실패 경로가 meta·active.json 을 건드리지 않게.
- 새 task: `taskMetaTemplate(user, task, created, firstActivatedAt, area)` — area 가 있을 때만 `task` 다음에 키.
- 기존 task: reopen 과 채택이 같은 meta 쓰기 한 번으로 합쳐진다(판정 창 필드는 건드리지 않음).
- `list` 는 task 별 `readTaskMeta` 로 area 를 읽는다(원장 추론 없음 — area 는 meta 에만 산다).
- AGENTS 템플릿에는 넣지 않는다 — eager 소계가 상한까지 24 B 뿐(17,476/17,500 B). 정본은 `commands/harness-task.md`.
- 증거: `tests/task-area.test.mjs`(행동 매트릭스) + 기존 golden e2e 무변경(무설정 바이트 동일).


## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **area**: 한 저장소 안에서 독립 운영되는 앱·서비스 단위의 이름. task 의 `meta.area` 에만 저장되는 기계 판독 라벨이며 경로를 바꾸지 않는다.
- **채택(adopt)**: 접두 규약으로 이미 만든 task 에 `--area` 로 `meta.area` 를 처음 기록하는 전이. area 를 **바꾸는** 전이는 없다.
- 게이트 근거: 목표·제약·성공 기준·영향 파일이 docs/spec-monorepo-scope.md §4.2·§7 2단계 표에 확정돼 있다.

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

- 상위 설계: `docs/spec-monorepo-scope.md` §4.2 (결정 2026-09-24: B 에서 멈춤, 용어 area)
- 선행: task-paths-helper (#93, `src/task-paths.mjs`)

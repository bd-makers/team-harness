---
max_turns: 8
timeout_seconds: 180
allowed_tools: [Read, Glob, Grep, Skill]
runs: 3
---
이 spec으로 내일 구현 시작하려고 해. 들어가기 전에 spec 인터뷰로 모호한 데가 남았는지 확인해줘.

```markdown
# list-json — spec

## 목적 / 요구사항
`harness-team list`에 `--json` 플래그를 추가해 task 목록을 JSON 배열로 출력한다.
문제: 지금 `list`는 사람이 읽는 표만 출력해서, 플랫폼팀의 대시보드 CI 스크립트가 표를 정규식으로 파싱하고 있다. 열 너비가 바뀔 때마다 이 스크립트가 깨졌고 지난달에만 2회 장애가 났다.

## 범위 (In / Out)
- In: `list --json` 출력, 인수 파싱
- Out: 다른 명령의 JSON 출력, 표 출력 형식 변경

## 원천 검토 (R1)
### 원천
- 없음 — 내부 CLI 개선이라 외부 기획·디자인 원천이 없다
### 발견

## 설계 / 접근
`list`가 표를 그릴 때 쓰는 task 배열에서 `name`·`user`·`status`·`updatedAt` 4개 필드만 골라 새 객체 배열을 만들고, 표와 같은 순서로 `JSON.stringify(arr, null, 2)`에 줄바꿈 하나를 붙여 stdout에 출력한다. `--json`일 때 stdout에는 JSON만 쓰고, 경고는 stderr로 보낸다.

## 제약
- Node 18+, 새 의존성 없음
- `--json` 없이 실행한 기존 표 출력은 바이트 단위로 동일해야 한다
- 이번 스프린트(5영업일) 안에 머지

## Ontology
- task: `docs/<user>/<name>/` 디렉터리 하나
- name: task 디렉터리 이름 / user: 그 상위 디렉터리 이름
- status: `open` 또는 `done` (`<name>-meta.json` 기준, meta 파일이 없으면 `open` — 지금 표 출력과 같은 규칙)
- updatedAt: `<name>-meta.json`의 `updatedAt` 값, ISO 8601 UTC 문자열. meta 파일이 없거나 그 키가 없으면 `null` (키는 항상 존재)

## Context (영향 파일)
- `src/commands/list.mjs`, `src/cli-args.mjs`, `tests/list.test.mjs` — 그 외 파일은 바꾸지 않는다

## Ambiguity 자가진단
- [ ] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [ ] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [ ] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [ ] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [ ] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence
- `harness-team list --json | jq length`가 표 출력의 데이터 행 수(헤더 제외)와 같다. task가 0개면 표는 `(no tasks)` 한 줄, JSON은 `[]`
- 배열의 각 원소는 정확히 `name`, `user`, `status`, `updatedAt` 4개 필드만 가진다
- 기존 테스트 전부 통과 + 새 테스트 3개(빈 목록이면 `[]`, task 3개, `--json` 없는 표 출력의 golden 스냅샷 불변 — fixture와 기대값은 모두 `tests/list.test.mjs` 안에 인라인)

## 참고
```

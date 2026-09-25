# task-reserved-names — Spec

## 목적 / 요구사항
**문제**: `harness-team task list`처럼 하위명령 이름을 `task`의 인자로 넘기면 이름 규칙(`^[\w.-]+$`)을 통과해
`docs/<user>/list/`가 생기고 `.harness/active.json`이 그쪽으로 옮겨진다. 2026-09-25에도 재발했다.
`commands/harness-task.md:13`에 경고가 있지만 슬래시 명령을 거칠 때만 읽힌다 — 에이전트가 CLI를 직접 치면 막을 것이 없다.

**영향**: 가짜 task 스캐폴드 6파일 + 활성 포인터 오염. 되돌리는 데 삭제(권한 게이트)가 필요하다.

**기대 결과**: 새로 만들려는 task 이름이 `harness-team` 명령 이름이면 아무것도 쓰지 않고 exit 1, 뜻했을 명령을 안내한다.

**제약**: 이미 그 이름의 task(spec 마커 있음)가 있으면 종전대로 활성화한다 — 소비자 프로젝트에 `review`·`release` 같은
이름의 task가 있어도 깨지지 않게. 이 저장소에는 충돌하는 기존 task가 없다(2026-09-25 스캔).

## 설계 / 접근
- 예약어 집합 = `src/cli-args.mjs`의 `COMMANDS` 이름 전체(단일 소스 — 명령이 늘면 자동으로 따라온다).
- `runTask`에서 spec 마커 판정(`isTask`) 직후, `!isTask && 예약어`면 기존 `emitTaskError` 경로로 5필드 패킷을 낸다.
  위치를 마커 판정 뒤로 둔 이유: 기존 task 활성화를 막지 않기 위해서다.
- 문서: `commands/harness-task.md`의 경고 문단을 "CLI가 거부한다"로 현행화.

## Ontology
- **예약 이름**: `harness-team`의 최상위 명령 이름(`COMMANDS[].name`). task 이름으로 *새로 만들* 수 없다.
- **기존 task**: `<name>-spec.md` 마커가 있는 디렉터리 — `list`·`summary`와 같은 기준(task-spec-marker).
- 게이트 근거: 목표·제약·성공 기준·영향 코드(`src/commands/task.mjs` runTask, `src/cli-args.mjs` COMMANDS)가 모두 특정됨.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 명령 이름으로 새 task를 만들지 않는다.
- [x] **Constraint 명확도** (30%) — 기존 task 활성화 유지, 예약어는 COMMANDS 단일 소스.
- [x] **Success 기준** (30%) — 아래 테스트: 신규는 exit 1·무쓰기, 기존은 활성화.
- [x] **Context 명확도** (brownfield 한정) — `runTask`·`COMMANDS`·`commands/harness-task.md`.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0

## Done evidence
```json
{ "version": 1, "review": "required" }
```

## 참고
- 테스트: `tests/task-reserved-names.test.mjs` (형식은 `tests/task-spec-marker.test.mjs`)
- 선례: task-spec-marker(#95) — 같은 `runTask` 사전 거부 패턴

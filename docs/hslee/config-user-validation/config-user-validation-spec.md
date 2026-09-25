# config-user-validation — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: `.harness/config.json` 의 `user` 가 검증 없이 `docs/<user>/<task>/` 경로 조립에 쓰인다. `init` 은 입력값을
  그대로 저장하고 `task` 는 그대로 읽는다. 재현(2026-09-25): `{"user":"../../x"}` 인 `<root>` 에서 `task foo` →
  `created: docs/../../x/foo/`, task 파일 6개가 **프로젝트 root 밖** `<root>/../x/foo/` 에 생기고 `active.json` 이 그곳을 가리킨다.
  출처: PR #98 codex 3차 리뷰 P1(그 PR 에서는 기존 동작으로 판별해 후속 후보로 넘김).
- **영향**: config 를 손으로 고치거나 `config set user …` 로 넣은 사람, `init` 에서 이름을 잘못 입력한 사람. 공격보다 사고 방지다.
- **기대 결과**: 경로를 벗어나게 하는 user 는 `task` 가 **아무것도 쓰기 전에** 거부하고, `init`/`sync` 는 저장하기 전에 거부한다.
- **제약**:
  - 비-ASCII 이름(한글)과 공백(`Chad Lee`)은 실제 입력이다 — 계속 통과해야 한다. 문자 집합 화이트리스트·config user sanitize 는 기각.
  - `--member` 의 sanitize 비대칭(PR #98 결정)은 유지한다.

## 설계 / 접근

- **거부 규칙 하나** `userNameError(name)` → 사유 문자열 | `null` (`src/user-config.mjs`). 거부: 문자열 아님 · 빈 문자열/공백뿐 ·
  `/` 또는 `\` 포함 · 선행 `.`(`.`·`..`·숨김 디렉터리) · 제어문자(U+0000–U+001F, U+007F).
  구분자를 막으면 `..` 은 단독 세그먼트일 때만 의미가 있고 그것은 선행 `.` 이 덮는다 — `a..b` 는 무해한 한 세그먼트라 통과.
- **읽기(보안 경계)**: `task.mjs` `resolveUser` 가 **최종 결정된 user**(config · `--member` · git · $USER 어느 출처든)에 규칙을 적용하고,
  `runTask` 가 모든 쓰기 전에 `emitTaskError` 로 거부한다. 수동 편집·`config set` 까지 여기서 막힌다.
  config `user` 가 falsy(빈 문자열·`null`·`false`·`0`)면 종전대로 미설정으로 보고 git 폴백한다 — `resolveUsername` 의
  `if (config.user)` 와 같은 기준이고, 폴백 결과도 같은 규칙을 거치므로 탈출 경로가 아니다. truthy 비문자열(숫자·객체)만 거부된다.
- **저장(조기 거부 UX)**: `resolveUsername` 이 확정한 이름이 비어 있지 않은데 규칙을 어기면 throw — init 의 쓰기(Apply) 전이라
  아무것도 남지 않는다. 빈 입력은 종전대로 저장하지 않는다. `ensureUsername`(sync)도 같은 경로를 탄다.
- 범위 밖: `config set` 명령 자체의 키별 검증(읽기 경계가 덮는다), 이미 저장된 `active.json` 의 user(쓰기 전 검증으로 새로 생기지 않는다),
  `list` 원격 브랜치 문제.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **config user**: `.harness/config.json` 의 `user` — raw 로 `docs/<user>/` 디렉터리 이름이 된다(sanitize 없음).
- **거부 규칙**: 경로 세그먼트 하나로 해석될 수 없는 이름을 거부하는 블랙리스트. 문자 집합은 제한하지 않는다.
- 게이트 근거: 재현으로 문제 확정, 위치(읽기+저장)는 사용자 결정(2026-09-25), 규칙은 인계 §3 에서 기각 대안과 함께 확정.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? (재현 케이스가 거부되고 아무 파일도 안 생김 · 한글/공백 이름 통과 · `npm test` green)
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? (`src/user-config.mjs`, `src/commands/task.mjs` resolveUser·runTask)
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

-

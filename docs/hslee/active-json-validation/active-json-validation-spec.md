# active-json-validation — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: `.harness/active.json` 의 `user`·`task` 를 context·boundary·review·diagram·done·doctor 가 검증 없이
  `docs/<user>/<task>/` 경로 조립에 쓴다. config-user-validation(#99) 뒤로 `task` 는 검증된 값만 쓰지만,
  손으로 고친 포인터(`{"user":"../../x"}`)는 그 검증을 거치지 않는다. 출처: #99 범위 밖으로 남긴 후속 후보.
- **기대 결과**: 한 세그먼트가 아닌 user·task 포인터는 "활성 task 없음" 으로 보고 stderr 에 경고 한 줄. 파일을 찾지도 쓰지도 않는다.
- **제약**: init 의 빈 placeholder `{}` 와 한글 user 는 종전대로 통과. 경고는 stdout(JSON 봉투·훅 주입)을 오염시키지 않도록 stderr.

## 설계 / 접근

- 판독 한 곳: `task.mjs` `readActive` 가 `user`·`task` 가 있으면 `userNameError`(#99 의 세그먼트 규칙)로 검사하고 위반이면 null.
  모든 `readActive` 소비자가 한 곳에서 막힌다.
- doctor 의 `checkActiveSpecGate`·`checkActiveDoneOnMain` 은 active.json 을 직접 읽던 사본이었다 — `readActive` 로 바꿔 같은 판독을 쓴다.
- 범위 밖: `templates/.claude/hooks/observe-tools.mjs` 는 active 값으로 HMAC 만 계산하고 경로를 만들지 않는다.
  `migrate.mjs` 의 active.json 갱신은 구버전 구조 이관 전용.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **active 포인터**: `.harness/active.json` 의 `{ user, task }` — gitignore 된 로컬 상태, `task` 가 쓰고 여러 명령이 읽는다.
- **세그먼트 규칙**: `userNameError` — 비문자열·빈 값·`/`·`\`·선행 `.`·제어문자 거부. task 이름에도 같은 규칙을 적용한다.
- 게이트 근거: 위치(readActive)는 사용자 결정(2026-09-25), 규칙은 #99 재사용.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? (위반 포인터 → readActive null·경고, doctor 무판독, `{}`·한글 통과, `npm test` green)
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? (`readActive` 소비자 12곳, doctor 직접 판독 2곳)
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

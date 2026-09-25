# task-member-collision — Spec

## 목적 / 요구사항
**문제**: `resolveUser` 가 `cfg.user || detectMember(flags)` 라 `.harness/config.json` 의 user 가 `--member` 를 이긴다.
README "member 식별 규칙"은 `--member` 최우선이라고 적었다 — 문서와 코드 불일치. 그 결과 config user=chad 인 checkout 에서
hslee 의 task 를 가리킬 방법이 없고, `task <name>` 이 `docs/chad/<name>/` 을 새로 만든다(2026-09-19 실측, 수동 복구).

**기대 결과**:
1. `--member` 가 config user 보다 우선한다.
2. member 를 추론했고(플래그 없음) 추론한 member 에 그 task 가 없는데 다른 member 에 같은 이름의 task(spec 마커)가 있으면
   exit 1·무쓰기, `--member <그 member>` 안내.
3. `--member` 명시 시 2번 가드는 끈다(팀에서 같은 이름을 의도적으로 쓰는 경우의 탈출구).

**제약**: 추론한 member 의 기존 task 활성화는 불변. 결정(2026-09-25 사용자): "암묵 member일 때만 거부".

## 설계 / 접근
- `resolveUser` → `{ user, explicit }`. `flags.member` 가 있으면 `explicit: true`.
- `runTask` 에서 명령 이름 거부 다음, `!isTask && !explicit && docs 존재` 일 때 `listTaskRefs` 로 같은 이름·다른 user 를 찾는다.
- 문서: README 식별 규칙에 빠져 있던 config user 단계 추가 + 가드 설명, `commands/harness-task.md` 한 줄, CHANGELOG.

## Ontology
- **명시 member**: `--member` 로 준 member. 충돌 가드 대상이 아니다.
- **추론 member**: config user → git user.name → $USER 순으로 정한 member.
- **이름 충돌**: 추론 member 에 없는 task 이름이 다른 member 디렉터리에 spec 마커와 함께 있는 상태.
- 게이트 근거: 목표·결정·영향 코드(`task.mjs` resolveUser/runTask 단일 호출부)가 특정됨.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%)
- [x] **Constraint 명확도** (30%)
- [x] **Success 기준** (30%) — `tests/task-member-collision.test.mjs` 4건
- [x] **Context 명확도** (brownfield 한정) — member 결정 지점은 `task.mjs:resolveUser` 하나(grep 확인)
- [x] **Ambiguity ≤ 0.2**

## Done evidence
```json
{ "version": 1, "review": "required" }
```

## 참고
- 선행: task-reserved-names(#97) — 같은 `runTask` 사전 거부 패턴
- 기존 테스트는 모두 `--member tester` 를 넘겨 가드 영향 없음

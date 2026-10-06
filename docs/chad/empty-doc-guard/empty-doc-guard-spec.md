# empty-doc-guard — Spec

## 목적 / 요구사항
출처: task `followups-14-16-close`의 전수 검사(2026-10-06).

- **문제**: 두 가드 모두 0바이트·공백뿐인 문서를 **통과시킨다**. pr-check와 `done`의 artifact 검사는 "템플릿과 같은가"만 비교하고, `done`의 plan 검사는 "미완 `- [ ]`가 남았는가"만 본다.
  - pr-check: `src/commands/pr-check.mjs` `taskFindings` — 4문서 모두.
  - `done`: `src/commands/task.mjs` `collectDoneIssues` — plan은 미완 `- [ ]`가 없으면 통과, artifact는 템플릿 비교만.
- **실례**: `docs/chad/dangerous-git-end-boundary/dangerous-git-end-boundary-plan.md`.
  - 미완 3단계가 남은 상태에서 `bb93755`("plan 완료")로 0바이트가 됐다.
  - `done`은 `--force`였지만 meta `forcedIssues`는 "커밋되지 않은 변경" 1건뿐이다. 빈 plan이라 plan 가드가 발동하지 않았다.
  - 0바이트가 된 원인(iCloud 잘림 / 에이전트가 비움)은 확인하지 못했다.
- **기대 결과**:
  - pr-check는 빈 문서를 `<rel> 가 비어 있음`으로 막는다(exit 1).
  - `done`은 빈 plan·빈 artifact를 차단 사유로 낸다.
  - 실례 plan은 복원한다. 복원하지 않으면 그 디렉터리를 건드리는 PR이 새 판정에 막힌다(옛 16번 상황).
- **제약**: 판정 한 줄씩. 새 명령·새 검사 항목은 만들지 않는다. 기존 "없음"·"템플릿 그대로" 문구와 순서는 유지한다.

## 설계 / 접근
- pr-check: `content === null`(없음) → **`!content.trim()`(비어 있음)** → 템플릿 비교 순서로 판정한다. 메시지 접미 hint는 기존과 같다.
- done: plan이 있으면 `!trim()` → `plan.md가 비어 있음 (단계 없음)`, 아니면 기존 미완 체크박스 검사를 한다.
  artifact도 `!trim()` → `artifact.md가 비어 있음 (결과/학습 미기록)`.
- **plan이 없는 경우(파일 부재)는 done에서 종전대로 건너뛴다.** 범위 밖으로 둔다.
  - 근거: 기존 코드가 의도적으로 "부재는 신호 아님"으로 두었다.
  - 근거: 강제 지점(D11)인 pr-check가 부재를 이미 막는다.
- 실례 plan 복원: `a4e45a3` 판을 되살리고 미완 3단계를 증거로 체크한다. 증거는 END 교체(템플릿 81행), meta.reviews 2건, meta closedAt이다. 복원 사실은 그 plan의 `## 참고`에 남긴다.
- 문서 3곳의 판정 서술에 "비었거나"를 더한다(README pr-check 절, `docs/harness-cycle.md` §4-6, `commands/harness-ship.md`).
  예시 출력(`cause:` 줄)을 담은 HTML 문서들은 여전히 맞으므로 손대지 않는다.

### 2차 장치 규칙
새 장치가 아니라 기존 두 가드의 비교식을 바로잡는 것이다. 검토한 "줄이는 안":
1. **done의 plan 검사를 지우고 pr-check에만 맡긴다** — 기각. 이 실례에서 우회된 것은 done의 plan 검사였고, pr-check도 같은 구멍이 있었다. 하나를 지우면 구멍이 그대로 남는다.
2. **템플릿 비교 자체를 "의미 있는 본문 줄 수" 휴리스틱으로 바꾼다** — 기각. 판정이 주관적이 되고 오탐 경계가 생긴다. 빈 문서는 trim 한 번으로 객관 판정된다.

## Ontology
- **빈 문서**: 존재하지만 `trim()` 결과가 빈 문자열인 task 문서. "없음"과도 "템플릿 그대로"와도 다른 세 번째 실패 상태다.
- 게이트 근거: 결함 위치·실례·기대 판정·제약이 위에 고정돼 있고, 성공 기준이 테스트로 표현된다.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 빈 task 문서를 pr-check·done이 막는다.
- [x] **Constraint 명확도** (30%) — 판정 한 줄씩, 새 장치 없음, plan 부재는 범위 밖.
- [x] **Success 기준** (30%) — 회귀 테스트가 통과하고 `npm run test`가 green이다.
  - pr-check: 4문서 × (0바이트, 공백뿐)
  - done: 빈 plan 2형태 + 빈 artifact
- [x] **Context 명확도** (brownfield 한정) — `pr-check.mjs` `taskFindings`, `task.mjs` `collectDoneIssues`, 문서 3곳, 실례 plan.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0

## Done evidence
```json
{ "version": 1, "review": "required" }
```

## 참고
- `tests/pr-check.test.mjs` "빈 문서(0바이트·공백뿐)도 잡는다", `tests/done-guard.test.mjs` "빈 plan·빈 artifact"
- task `followups-14-16-close` spec — 전수 검사 절차

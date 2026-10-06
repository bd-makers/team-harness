# followups-14-16-close — Spec

## 목적 / 요구사항
`docs/followups.md`의 남은 후보 14–16번(출처: task `pr-check`, PR #125)을 실측해 처리를 정한다.
셋 다 "미실측" 또는 "관측만" 상태였다. 이 task는 **실측으로 판정하고 followups를 갱신하는 것까지**다 — 코드 변경 없음.

- 14번: origin이 아닌 원격으로 push할 때 base가 origin 기준인 문제(fork 워크플로).
- 15번: 구버전 템플릿으로 만들어 손대지 않은 문서가 "템플릿 그대로"로 잡히지 않는 문제.
- 16번: PR이 옛 task 문서를 부수적으로 건드리면 그 task도 검사되는 문제.

## 설계 / 접근

### 14번 실측 (2026-10-06)
임시 저장소에 bare `up.git`(원본)과 그 시점의 `fork.git`(이후 낡음)을 만든다. upstream에 task `other`를 하나 더 머지하고,
feature 브랜치에 task `mine`을 커밋한 뒤 `harness-team pr-check --pre-push --json`에 git과 같은 형식의 stdin을 넣었다.

| 배치 | base | 검사된 task | 판정 |
|---|---|---|---|
| A: origin=fork(낡은 main), upstream=원본, origin으로 push | `refs/remotes/origin/main`(낡음) | `u/mine`, `u/other` | 통과 — 이미 머지된 `u/other`가 끼어 안내 줄만 는다 |
| B: origin=원본, fork 원격으로 push | `refs/remotes/origin/main`(원본) | `u/mine` | 통과 — PR 대상과 같아 정확 |

- followups의 제안(훅이 `"$1"`을 넘기고 `refs/remotes/<remote>/HEAD`를 먼저 봄)을 적용하면 결과가 이렇게 된다.
  - A: push 대상이 origin이라 결과가 같다.
  - B: base가 낡은 `fork/main`으로 바뀌어 **더 나빠진다**.
- PR 대상 원격은 push 원격과 다를 수 있고 pr-check는 그것을 알 수 없다. 그래서 원격 이름으로 base를 바꾸는 안은 기각한다.
- A의 과포함은 upstream task가 이미 자기 PR의 pr-check를 통과한 문서라 막히지 않는다. 우회는 fork main 동기화다.
- 메인테이너 확인(2026-10-06): fork 워크플로를 쓰는 팀이 없다. → **코드 변경 없이 닫는다.**

### 15·16번 실측 (2026-10-06)
이 저장소의 task 디렉터리 143개 전부에 pr-check `taskFindings`와 같은 기준을 적용했다.
기준: 4문서 존재 + 현재 템플릿과 trim 비교.
- 실패(16번 노출 — 부수적으로 건드리면 PR이 막힐 task): **0건**.
  스캔 스크립트는 `docs/diagrams/pr`도 잡았지만 오탐이다. pr-check의 `changedTaskRefs`는 `<dir>-<kind>` 정확한 이름만 마커로 쓰므로 선택하지 않는다.
- 15번 후보(현재 템플릿과 다르지만 본문이 사실상 없는 문서): handoff 17건은 `done`이 쓴 "완료" 항목이 있는 정상 문서다.
  나머지 1건은 0바이트 plan(`dangerous-git-end-boundary`)으로, 15번이 아니라 **새 결함**이다(아래).
- → 둘 다 관측으로 유지한다. followups "이 목록에 없는 것"에 재론 조건과 함께 옮긴다.

### 새로 드러난 결함 — 별도 task `empty-doc-guard`
- pr-check와 `done` 가드는 "템플릿과 같은가"만 비교한다. 그래서 빈 문서(0바이트·공백뿐)는 통과한다.
- 실례: `dangerous-git-end-boundary-plan.md`는 미완 `- [ ]` 3개가 남은 상태에서 `bb93755`("plan 완료")로 0바이트가 됐고, `done`을 통과했다.
- 범위가 코드·테스트라 이 문서 정리 task와 분리한다(메인테이너 승인 2026-10-06).

### 2차 장치 규칙
새 장치를 추가하지 않는다. 15·16번은 장치를 늘리는 대신 관측으로 두는 결정이다.

## Ontology
- **노출(exposure)**: 현재 pr-check 판정 기준으로 실패하는 task. PR이 그 디렉터리를 건드리면 막힌다.
- **과포함**: base가 낡아 `base...rev` diff에 이미 머지된 남의 변경이 섞이는 것. 검사 대상 task가 늘지만 판정은 그 task 문서 품질에 따른다.
- 게이트 근거: 대상·실측 방법·판정 기준이 위에 고정돼 있고, 산출물은 followups 갱신 하나다.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 14–16번을 실측으로 판정하고 followups를 갱신한다.
- [x] **Constraint 명확도** (30%) — 코드 변경 없음, 새 장치 없음, 새 결함은 별도 task.
- [x] **Success 기준** (30%) — followups에 14–16이 없고 닫은 근거·재론 조건이 남는다. `npm run docs:check` 최신.
- [x] **Context 명확도** (brownfield 한정) — `src/commands/pr-check.mjs` `changedTaskRefs`·`taskFindings`, `review.mjs` `resolveScope`.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0

## Done evidence
```json
{ "version": 1, "tests": "skip", "review": "optional" }
```

## 참고
- `docs/followups.md` — 우선순위 절 괄호 기록, "이 목록에 없는 것"
- 실측 스크립트는 세션 scratchpad(`fork-exp.sh`, `tmpl-scan.mjs`)에 있었다. 재현은 위 표의 절차로 충분하다.

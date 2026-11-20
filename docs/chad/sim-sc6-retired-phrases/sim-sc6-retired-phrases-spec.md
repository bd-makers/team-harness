# sim-sc6-retired-phrases — Spec

## 목적 / 요구사항
2026-11-06 `handoff-no-sweep` 세션이 띄운 하위 세션 두 개의 결과가 push되지 않은 채 남았다(PR 없음).

- `claude/jovial-blackwell-bfcd1f`(`c8a98c4`·`e8f617c`): SC6 `init installs harness (doctor green)`이 늘 실패하던 원인
  (env 선언 soft warning·`CODEX_HOME` 미격리)을 고치고, SC6을 `npm test`에 넣는다(`tests/e2e/sim-smoke.test.mjs`).
- `claude/ecstatic-herschel-b3c503`(`8e35a1e`): 없앤 표면의 옛 문구가 현행 문서에 남으면 실패하는 테스트
  (`tests/docs-retired-phrases.*`)와 그 테스트가 찾은 문서 3곳 수정. 선행 조건이던 `fix/handoff-no-sweep`은 #179로 머지됐다.

오늘 main(0.58.0)에서 `node tests/sim/agentloop.mjs sc6`은 3건 실패한다. doctor green 외 2건은 브랜치 이후 main 변경 때문이다:
- `plan 체크박스 진행` — `15aab2e`(11-18)가 새 plan 첫 단계에 검토 게이트 `- [ ]`를 넣어, 첫 박스만 켜는 SC6은 미완 박스가 남는다.
  그 결과 `done`이 막혀 `--force`로 떨어진다.
- `meta status done + closedAt` — 0.58.0 done-derive로 `done`은 추적 파일을 쓰지 않는다. 종결은 `src/task-closure.mjs` 계산값이다.

기대 결과: 두 브랜치를 한 브랜치로 합치고, SC6이 `--force` 없이 녹색이며 `npm test`에서 돈다.

## 범위 (In / Out)
- **In**: 두 브랜치 병합과 충돌 해소(`docs/harness-workflow-simulation.html`), `tests/sim/agentloop.mjs` SC6의 plan 체크·종결 판정 현행화,
  retired-phrases 테스트가 0.58.0 문서에서 새로 잡는 것의 처리.
- **Out**: `src/` 동작 변경 — SC6 실패는 테스트 기대값이 낡은 것이지 CLI 결함이 아니다. `src/`가 바뀌어야 하면 멈추고 보고한다.
  SC1~SC5·SC7(인증 필요)은 돌리지 않는다.

## 원천 검토 (R1)
- 없음 — 원천 문서 없는 내부 테스트 유지보수. 근거는 두 브랜치의 커밋·세션 기록과 main 커밋.

### 원천

### 발견

## 설계 / 접근
1. 이 브랜치(`claude/remaining-work-check-3a3fec`, main `03d90b7`)에 두 브랜치를 `git merge`로 합친다(커밋 원본·작성 이력 보존).
2. SC6 plan 체크: 첫 박스만이 아니라 **모든** 줄머리 `- [ ]`를 켠다(내용 없는 박스는 `sim lifecycle step`으로 채운다).
   검토 게이트도 사람 승인을 흉내 내 켠다 — 게이트는 생성 기본값이므로 SC6은 기본 경로를 그대로 탄다.
3. SC6 종결 신호: meta `status`/`closedAt` 대신 `closureFromContent({ plan, meta })`로 판정하고, 신호 이름을 `종결 판정(plan 파생)`으로 바꾼다.
   `done 완료` 신호는 `--force`가 필요하면 FAIL이다 — 아무것도 dirty하지 않고 plan이 닫혔으니 우회는 finding이 아니라 회귀다(리뷰 P1).

## Ontology
- **SC6**: CLI만으로 도는 결정적 task 라이프사이클 시뮬레이션(`node tests/sim/agentloop.mjs sc6`, 인증 불필요).
- **retired phrase**: 없앤 표면을 설명하던 옛 문구. `tests/docs-retired-phrases.json`에 등록된 것만 현행 문서에서 금지한다.
- 게이트 근거: 목표·제약(src 불변)·성공 기준(아래 명령)·영향 파일이 모두 정해졌다.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 두 브랜치를 살리고 SC6을 녹색으로 만든다.
- [x] **Constraint 명확도** (30%) — `src/` 불변, 테스트·문서만.
- [x] **Success 기준** (30%) — 아래 Done evidence 명령.
- [x] **Context 명확도** (brownfield 한정) — `tests/sim/agentloop.mjs`, 두 브랜치의 7+7 파일.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```
완료 기준: `node tests/sim/agentloop.mjs sc6` exit 0이고 `--force 불필요`, `node scripts/test-isolated.mjs --test tests/docs-retired-phrases.test.mjs tests/e2e/sim-smoke.test.mjs` 통과, `npm test` exit 0.

## 참고
- 하위 세션 기록: jovial = transcript `0640f68e`(sc6-doctor-green, `local_5bd8ae78`), ecstatic = transcript `a527b24c`.
- 원 세션 artifact: `docs/chad/handoff-no-sweep/handoff-no-sweep-artifact.md:26`("원인은 조사하지 않았다").
- 종결 판정 정본: `src/task-closure.mjs` `closureFromContent`.

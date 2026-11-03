# gate-fail-cause — Spec

## 목적 / 요구사항
- **문제**: 커밋 게이트 명령이 실패하면 `커밋 게이트 실패: <cmd> (exit N)`만 나온다. 원인이 설치 누락(환경)이어도 코드 결함처럼 보인다 —
  2026-10-11 heliosent-profile AO 워크트리에 `node_modules`가 없어 tsc가 실패했고 사람이 `bun install --frozen-lockfile`을 찾았다(`docs/harness-cycle.md:279`).
  "코드 탓 전에 installTrace 확인" 안내는 lazy 스킬(`skills/harness-team/SKILL.md:36`)에만 있어 훅이 실패한 순간에는 로드되지 않는다.
- **영향**: `harness-team gate commit`(pre-commit-check 훅)을 쓰는 소비자.
- **기대 결과**: 게이트가 실패하고 installTrace가 `absent`면 차단 메시지에 "환경 원인일 수 있음 — lockfile·흔적·bootstrap 명령" 한 줄을 붙인다.
- **제약**: 차단 여부·exit code는 바뀌지 않는다. 단서 계산이 실패해도 원래 메시지 그대로. 새 명령 없음, 언어 지식은 프리셋 `env.installTrace`·`bootstrap`만(D11). eager 0 B.

## 범위 (In / Out)
- **In**: `src/commands/gate.mjs`(실패 분기의 단서 한 줄), `tests/gate-command.test.mjs`(단서 있음·없음 1개).
- **Out**: 127 설정 오류 분기(원인이 명령 부재로 이미 명확), 런타임 버전 불일치(D12 Q5 no-go), 게이트 통과 시 메시지.

## 원천 검토 (R1)
### 원천
- task `subsystem-audit` spec 후보 C(피드백 F4), `docs/decisions.md` D12 Q5 결과(설치 축).
### 발견
- 없음 — 원천이 감사 결과 하나이고 D12 Q5 계약(`detectInstallTrace`)을 그대로 재사용한다.
- 검토 완료: 2026-11-04

## 설계 / 접근
`gateCommit`의 exit≠0 분기에서 `installHint(targetDir)`를 부른다 — `loadRenderState`의 stack 고정 → `resolveStack` → `detectInstallTrace`(`stack` 명령과 같은 판정).
`absent`일 때만 한 줄을 붙이고, bootstrap이 `(configure)`면 "저장소의 설치 방법"으로 둔다. 예외는 삼켜 빈 문자열.
2차 장치 규칙: 새 장치가 아니라 기존 차단 메시지의 확장이다 — 원래 장치(게이트)를 줄일 대안은 없다.

## Ontology
- **설치 흔적 단서**: 게이트 실패 메시지 끝의 한 줄. D12 Q5 installTrace `absent`의 재표시이며 차단 판정에 관여하지 않는다.
- 게이트 통과 근거: 목표·제약·범위가 한 함수로 닫혀 있다.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%)
- [x] **Constraint 명확도** (30%)
- [x] **Success 기준** (30%) — 단서 있음·없음 테스트, `npm test` fail 0.
- [x] **Context 명확도** (brownfield 한정) — `gate.mjs` `gateCommit`, `presets.mjs` `detectInstallTrace`.
- [x] **Ambiguity ≤ 0.2**

## Done evidence
<!--
```json
{ "version": 1, "review": "required", "tests": "required" }
```
-->

## 참고
- `tests/gate-command.test.mjs` "실패했는데 lockfile만 있고 설치 흔적이 없으면…"

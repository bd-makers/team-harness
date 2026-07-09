# codex-plugin-sim-check — Plan

## 목표
Codex plugin support 이후 `harness-sim` L5 probe/full run을 실행하고, 결과를 증거 기반으로 기록한다.

## 단계
- [x] AGENTS.md와 현재 task 상태 확인
- [x] 활성 task 부재 확인 후 `codex-plugin-sim-check` task 생성
- [x] harness-sim Phase 0 프리플라이트 확인
- [x] `node tests/sim/agentloop.mjs probe` 실행 및 결과 판정
- [x] probe 통과 시 full run 가능 여부 판단
- [x] 가능하면 `node tests/sim/agentloop.mjs run` 실행
- [x] report PASS/FAIL/MANUAL 요약 및 실패 격리 검증 기록
- [x] task artifact/handoff 최종 갱신

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-07-08: L5 시뮬레이션, probe, PASS 증거, MANUAL 정의 추가.

## 참고
- `tests/sim/agentloop.mjs`

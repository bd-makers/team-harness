# sim-stack-matrix — Plan

## 목표
`tests/sim/agentloop.mjs`의 SC1 init / SC2 apply를 node/next/react-native 3 stack 매트릭스로
확장하고, stack-discriminating signal + stack별 매트릭스 리포트 + stack별 골든 스냅샷을 추가한다.

## 단계
- [x] 1. `tests/e2e/sandbox.mjs`의 `STACKS` import + `EXPECTED_LABEL` 오라클 맵 추가
- [x] 2. `makeSandbox(name, { seed, pkg })` — 하드코딩 pkg(line 160)를 옵션으로 대체 (기본값 하위호환)
- [x] 3. `sc1Init(token, stack)` — stack pkg 주입 + stack-discriminating 라벨 신호 추가
- [x] 4. `sc2Apply(token, stack)` — stack pkg 주입
- [x] 5. `runFull` — SC1/SC2를 STACKS 루프로, SC3/4/5는 canonical(node) apply dir 위 1회
- [x] 6. 매트릭스 렌더 함수(`renderMatrix`) + 리포트 헤더에 검증 범위(전제 정정) 명시
- [x] 7. `snapshot`을 stack별(`<stack.id>-{init,apply}`)로 호출
- [x] 8a. syntax/import/오라클 검증 — node --check OK, EXPECTED_LABEL 3/3 detectStack 일치, 매트릭스 렌더 OK
- [x] 8b. `probe` 실행으로 헤드리스 계약 확인 — auth/파싱/transcript/slash 전부 green
- [x] 9. 백그라운드 run → 매트릭스 리포트 (PASS 51 · FAIL 0 · MANUAL 1) + 스냅샷 stack delta 실증
- [x] 10. 무오염 사후검증: `.sim-tmp` 제거 + playground 3프로젝트 clean
- [x] 11. artifact.md에 결과·학습 기록 → commit → `harness-team done`

## Ontology 변경 로그
- stack matrix / stack-discriminating signal / canonical stack — spec.md Ontology에 정의됨.

## 참고
- spec.md 핵심 결정 1~6, 정직성 규칙 계승 섹션 참조.

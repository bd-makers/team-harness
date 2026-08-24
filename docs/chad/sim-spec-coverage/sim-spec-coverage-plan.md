# sim-spec-coverage — Plan

## 목표

`tests/sim/agentloop.mjs`에 SC7(`/harness-spec` 산출물 검증)을 추가해 task `spec-writing-skill`의
열린 plan 항목("대화형 드라이런")을 닫는다.

## 단계
- [x] `agentloop.mjs` 엔트리 가드 추가 (`codex-agentloop.mjs` 선례) — import 시 자동 실행 차단
- [x] 순수 채점 함수 `scoreSpecArtifacts()` 작성 + export
- [x] SC7a: fresh task + confluence·interview 소스 프롬프트 접기 → 트리거 pass-rate + 산출물 신호
- [x] SC7b: 기존 spec 존재 시 merge 분기 — 알 수 없는 절 보존 검증
- [x] `runFull()`에 SC7 편입 + `sc7` 단독 서브커맨드 (SC6 관례)
- [x] 리포트에 범위 밖 항목 N/A + 사유 렌더 (MCP fetch · 멀티턴 UX · replace/cancel)
- [x] `tests/agentloop-spec-signals.test.mjs` 단위 테스트 (토큰 없이 CI 검증)
- [x] `npm run test` — 409 tests · 407 pass · 1 skipped · **1 fail은 선재**
      (`docs/what-changes-0.18.1.html` 부재 — origin/main에도 없음, 워커 `-20` 소관)
- [x] sim SC7 실제 실행 — 2026-08-24T1809 전 신호 PASS/N-A (리뷰 조치 후 재실행, artifact에 출력 전문)
- [x] `spec-writing-skill` plan 마지막 항목 닫기 + artifact `### 검증 한계` 날짜 붙여 append
- [x] `/harness-review codex` 실행 → P1 2 / P2 4 전부 진짜 판별 → 조치 → artifact `## Reviews` 기록
- [ ] PR 생성 → CI 그린

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-08-24: "SC7", "프롬프트 접기", "산문 예외 신호" 신규 정의 (spec.md Ontology 반영됨)

## 참고
- 브리프: 오케스트레이터 `sim-spec-coverage`
- 상위 task: `docs/chad/spec-writing-skill/`

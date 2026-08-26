# verify-evidence-gate — Plan

## 목표

D6 4단계: done 가드에 `verify` evidence 키·kind allowlist를 넣고(src + 유닛테스트),
sim 순수 채점 함수를 tests/sim/rules.mjs로 승격하며, AO 워커 §8에 검증 슬롯을
최소 추가한다.

## 단계
- [x] `src/commands/task.mjs`: `verify` 키(required|optional, 기본 optional) +
      검증 프레이밍 접미사 allowlist 상수 + done 가드 verify 판정(판정 창 내
      allowlist kind 마커 존재)
- [x] `tests/done-guard.test.mjs`: verify 케이스 5종(통과·일반 마커 차단·기본
      미검사·창 밖 무효·잘못된 값 invalid) + allowlist ↔ harness-review.md 열거
      동기화 pin — TDD red(차단 2건) → green 47/47
- [x] `commands/harness-review.md`: "가드는 kind 값을 목록 대조하지 않으므로"
      문구를 review(비대조)/verify(접미사 대조) 구분으로 갱신
- [x] `taskSpecTemplate` 주석에 `verify` 키 문서화 (+ 템플릿 pin 테스트 영향 확인)
- [x] `tests/sim/rules.mjs` 신설: agentloop.mjs 순수 채점 함수 이동 + import 갱신
      (`agentloop-spec-signals.test.mjs` 포함), 동작 불변 확인
- [x] `codex-agentloop.mjs`·`skilltest.mjs` 중복 헬퍼를 rules.mjs로 통일
      — 판별 결과 **동일 구현 없음**(drift 사본): 통일하지 않고 artifact에 차이 기록
- [x] `docs/ao-worker-rules.md` §8: 외부 검증 슬롯 1항목 최소 추가
      (100행 초과는 기존 상태 — 보고만)
- [x] CHANGELOG `[Unreleased]` 갱신
- [x] 검증: `npm run test:unit` green (429/428/0/1 skip) + `npm run docs:check` 최신
- [ ] 외부 리뷰 `/harness-review` (probe 체인) → 발견 판별·반영 → artifact
      `## Reviews` 기록

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-08-26: **verify evidence**·**검증 프레이밍 kind allowlist**·**sim rule 층**·
  **AO §8 검증 슬롯** 신규 정의 (spec Ontology 참조)

## 참고
- spec: verify-evidence-gate-spec.md (요구사항 6건·범위 제외·dogfooding 함정)

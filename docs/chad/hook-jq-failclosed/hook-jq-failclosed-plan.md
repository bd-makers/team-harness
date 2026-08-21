# hook-jq-failclosed — Plan

## 목표
jq 부재 시 조용히 무력화되는 훅 4개를 fail-closed 로 고치고, 지금까지 하나도 없던 자동화
매트릭스 테스트를 jq 있음/없음 양쪽에서 처음 만든다.

## 단계
- [x] 결함 실측 재현(통제된 PATH) — 4개 훅 각각
- [x] 공통 폴백 블록 설계 확정(payload 전체 스캔 기각 근거 실측 포함) → spec.md
- [x] `block-dangerous-git.sh` fail-closed 수정
- [x] `protect-files.sh` fail-closed 수정
- [x] `pre-commit-check.sh` fail-closed 수정 (`.scripts.test` 판정 포함)
- [x] `auto-format.sh` 폴백 파서 공유 (판정 변경 없음)
- [x] `bash -n` 문법 검사 4개
- [x] `tests/hooks-jq-fallback.test.mjs` 신규 — 차단/허용 매트릭스 × {jq 있음, jq 없음} + 공통 블록 드리프트 가드
- [x] `doctor` 의 jq 표시 optional → warning + `tests/doctor.test.mjs` 회귀 가드
- [x] `npm run test` 전체 + `npm run docs:check` 실행 출력 확인
- [x] CHANGELOG `[Unreleased] ### Fixed` 에 이어 붙이기
- [x] artifact.md 결과·리뷰·잔여 리스크 기록
- [x] PR 생성(main 대상, 머지하지 않음) → PR 번호 보고

## Ontology 변경 로그
- 2026-08-21 — **저정밀(degraded) 모드** 정의 추가: 판정 기준은 동일하고 입력 해석 정밀도만 낮은 상태.
- 2026-08-21 — **fail-closed** 를 "전부 차단"이 아니라 "판정 가능한 것은 판정, 불가능한 것만 보수적"으로 한정.

## 참고
- spec.md 의 실측 표와 기각 근거가 이 plan 의 전제다.

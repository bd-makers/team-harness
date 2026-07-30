# skilltest-ast-grader — Plan

## 목표

`tests/sim/skilltest.mjs`의 GWT/AAA 3구획 판정을 원시 텍스트 basis에서 토큰화 basis로
이전하고, 회귀 assert가 **옛 basis에서 붉어짐**을 실증한 상태로 selftest를 그린으로 만든다.

## 단계
- [x] 부모 커밋 `skilltest.mjs` + 기존 50개 selftest 정독 → 실제 basis 상태 확정
- [x] 브리프 전제(전면 regex grader) vs 실제(본문 경계는 이미 구조적) 불일치 기록
- [x] round-4 false-PASS 실측 재현 (템플릿 안 마커 · 템플릿/블록 주석 안 빈 줄)
- [x] spec.md Ambiguity 게이트 통과 (5/5)
- [x] `maskNonCode(body, { keepComments })` 헬퍼 작성 — 토큰화기 재사용, 무수정
- [x] `markerLineWords`/`regionsIn` 두 호출 지점을 마스킹된 본문 위로 이전
- [x] FIX-B: sentinel을 비공백(`MASK='#'`)으로, line comment 종료 개행은 코드로 보존
      — 3안 배터리 비교로 양방향 무결 확인
- [x] round-4 회귀 assert 3개 + line-comment guard 2개 + across-files guard 3개 추가
- [x] mask seam을 원시 텍스트로 되돌린 사본에서 3개 assert ❌(56/59) 실증
- [x] `node tests/sim/skilltest.mjs selftest` 59/59 그린 · `npm run test:unit` 128 pass
- [x] 유지 특례 2개(`.then(` 주석 한정 · `// When & Then` 분절) artifact에 명시 disclosure
- [x] 범위 밖 잔여(presence 신호 raw `.test()`) 콜아웃 — 조용히 확장 안 함
- [x] 리뷰 라운드 1 (2026-07-30): FIX-C — `hasMisparsedString`으로 개행을 넘는
      `'…'`/`"…"` 스팬(JSX 아포스트로피 오파싱)을 잡아 해당 본문을 MANUAL로 라우팅
- [x] 리뷰 라운드 1: artifact sentinel 서술 정정(공백 하나 → 비공백 `MASK='#'`)
- [x] 리뷰 라운드 1: task SSOT 4파일 완성 + 두 레지스트리 등록

## Ontology 변경 로그

- **"basis 제거" ≠ "경계 패치"** — 본문 *경계*를 구조화해도 본문 *안* 판정이 원시
  텍스트면 누수는 콘텐츠로 이동한다. 같은 토큰화기를 판정 지점까지 밀어야 클래스가 닫힌다.
- **마스킹 sentinel은 판정의 일부** — 비코드 스팬을 공백으로 치우면 그 치환 자체가
  빈 줄/개행 병합을 만들어 새 오판을 낳는다. sentinel은 비공백, line comment의 종료
  개행은 코드로 보존이 유일한 양방향 무결 조합(FIX-B).
- **마스킹은 스팬 판정을 신뢰한다** — 틀린 스팬은 원시 basis에선 무해했지만 마스킹
  basis에선 false-FAIL로 증폭된다. 토큰화기를 못 고치면 **불가능한 모양**을 탐지해
  채점을 거부(MANUAL)하는 것이 정답(FIX-C).

## 참고
- `tests/sim/skilltest.mjs` — grader + selftest 배터리 SSOT.
- `<name>-artifact.md` — criterion 매핑 · 유지 특례 disclosure · 범위 밖 콜아웃.

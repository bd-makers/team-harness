# wiki-fence-nested — Plan

## 목표
`wiki sources`가 인용문·목록 안 펜스의 예시 마커를 `compiled`로 세지 않게 한다(C1 후속 P2-b). 다이어그램: 옵트아웃(작은 버그 — 사람 결정).

## 단계
- [x] 1. 재현 테스트 작성 → 실패 확인 (`compiled: ['wiki/90_system/rules.md']`)
- [x] 2. `wikiMarkersIn` 펜스 판정 수정(인용 깊이 · 목록 내용 열) → wiki 테스트 통과
- [x] 3. 전체 검증: `npm test` · `npm run docs:check` · `scenario check`
- [ ] 4. R3 외부 리뷰(`review codex`) — P1 없으면 통과, P2는 반영 후 재검 1회까지
- [ ] 5. CHANGELOG `[Unreleased]` Fixed 한 줄 → `/harness-ship`

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-07: "예시 마커"의 범위를 맨 위 펜스에서 인용문·목록 안 펜스까지로 넓힘.

## 참고
- 브리프: 오케스트레이터 p2b-wiki-fence-brief (push·PR은 사람 승인 후)

# commit-gate-lint — Plan

## 목표
커밋 게이트가 package.json `lint`를 typecheck와 test 사이에 돌린다 — 위반은 차단, 127은 경고 후 통과.

## 단계
- [x] 훅: `has_script` 일반화 + lint 단계(0 통과 / 127 ⚠ / 그 외 exit 2)
- [x] 배달: 직전 판을 `KNOWN_STOCK_HOOK_SHA256`·`tests/fixtures/stock-hooks/pre-lint/`·fixture README에 추가
- [x] 테스트: hooks-jq-fallback(위반·통과·없음·127, jq 매트릭스) + migrate-hooks(pre-lint 판 refresh)
- [x] 문서: overview 카드·`hooks.mmd`(127 비대칭 명시), `npm run docs:check`
- [ ] 검증: `npm run test` 전체 통과
- [ ] Codex read-only 리뷰 → artifact `## Reviews`

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-05: "lint 위반"과 "lint 실행 불가(127)"를 구분 — 후자는 경고만.

## 참고
- spec의 PM별 127 실측 표

# done-tests-optional — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- 2026-11-02: `DONE_EVIDENCE_DEFAULT.tests` `required` → `optional`, 허용값에 `optional` 추가(`skip`은 동의어 유지).
  spec 템플릿 주석·예시, README, decisions.md(D11 정정), CHANGELOG(Unreleased/Changed), golden fixture 갱신.
- done-guard 테스트: 가드 검증 케이스는 `tests: required`를 명시하도록 전환, 새 기본값(소스만 변경·테스트 삭제 모두 통과)과
  `optional` 선언 케이스 추가 — 82/82 pass.
- `npm test` 1272개 중 pass 1271 · fail 0 · skipped 1(기존 skip) · `npm run docs:check` 최신.
- 알려진 부작용: 업그레이드 전에 만든 미작성 spec은 새 템플릿과 글자가 달라 `pr-check`의 "템플릿 그대로" 판정에 걸리지 않는다.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

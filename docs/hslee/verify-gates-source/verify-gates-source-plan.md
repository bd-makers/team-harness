# verify-gates-source — Plan

## 목표
`/verify`가 `.harness/gates.json` 커밋 게이트 목록을 정본으로 읽고, 없을 때만 `## 명령`으로 내려간다(eager 0 B).

## 단계
- [x] 위치·도달 경로·stock sha 확인과 spec — §5-A 정지 후 D-1 안 ② 결정(2026-11-04)
- [x] 직전 판을 stock fixture로 보존(`2026-09-03-58b22848`)·`KNOWN_STOCK_TEMPLATE_SHA256` 등록
- [x] 템플릿 `verify/SKILL.md` 갱신(안 ②)
- [x] fixtures README·드리프트 가드 개수(22 → 23)·CHANGELOG `[Unreleased]`
- [x] 커밋 후 `npm test` fail 0(1,302개 중 pass 1,301, 완전성 가드 포함), `docs:check` 최신
- [x] 커밋(브랜치 `feat/verify-gates-source` `ff91954`, push 없음)

## Ontology 변경 로그
- (none)

## 참고
- R3 리뷰는 PR 전에 메인테이너가 정한다.

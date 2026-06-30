# done-guard-handoff — Plan

## 목표
done-guard "미커밋" 검사를 handoff-aware하게 좁혀, 훅이 더럽힌 handoff만 있을 땐 통과시킨다.

## 단계
- [x] `parsePorcelainPaths` 헬퍼 + dirty 검사에서 handoff 2개 제외 (task.mjs)
- [x] 테스트 3종 추가: handoff-only→통과 / handoff+실파일→차단 / parsePorcelainPaths 단위
- [x] `npm test` 전체 green (107/107, 무회귀)
- [x] playground(bare-node) `done`이 --force 없이 통과 실검증 — active=null, 무오염
- [x] CHANGELOG [Unreleased] + artifact + done

## Ontology 변경 로그
- (none)

## 참고
- harness-sim 마찰 발견 → 이 task로 개선

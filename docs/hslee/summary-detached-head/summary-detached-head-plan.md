# summary-detached-head — Plan

## 목표
동기화된 detached HEAD에서 `summary --write`가 통과하게 한다 — 가드 의미는 불변.

## 단계
- [x] 재현 실패 테스트 (synced detached 허용 · behind detached 거부 · origin 없는 detached 거부)
- [x] `branchState`에 `detached` 분리 + 가드를 `isSyncedWithDefault`로 라우팅
- [x] `npm test`·`npm run docs:check` green
- [x] CHANGELOG [Unreleased]
- [x] codex 리뷰 기록
- [x] PR·CI green
- [x] 머지 후 종결 — detached HEAD에서 `summary --write` 실측

## Ontology 변경 로그
- `branchState` 결과에 `detached` 추가 (종전엔 `error`에 흡수)

## 참고
- done 가드는 브랜치 조회 없음 — 종결 실측으로 확인

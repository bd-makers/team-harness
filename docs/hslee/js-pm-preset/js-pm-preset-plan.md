# js-pm-preset — Plan

## 목표
JS lockfile→pm 판정을 `node.json` `env.packageManager`와 `firstHolding()`으로 옮긴다 — 동작 변화 0.

## 단계
- [x] spec 작성(D11 판정 질문·D-1–D-5·동작 변화 0 증명 방법)
- [x] pm 표 테스트를 현재 코드에서 green으로 고정 — `tests/detect-stack.test.mjs`
- [x] `node.json` `env.packageManager` 규칙 + `detectPackageManager()` 본문을 `firstHolding()`으로
- [x] 검증 — 표 테스트 green 유지, `npm test` fail 0, `docs:check` 최신, `stack --json` 기준선 diff 0
- [x] codex 리뷰 판별·조치 → artifact `## Reviews`
- [x] CHANGELOG `## [Unreleased]`(소비자 영향 없음)·artifact 결과
- [ ] 커밋(푸시·PR은 메인테이너 지시 대기)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-03: "pm 판정 규칙"이 JS에도 생겼다 — 규칙 밖 기본값(npm/null)은 코드 기본값으로 정의(spec D-1).

## 참고
- spec `## 설계 / 접근`의 "동작 변화 0의 증명" 1–4가 검증 단계의 체크리스트다.

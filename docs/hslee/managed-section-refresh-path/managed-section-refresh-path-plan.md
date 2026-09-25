# managed-section-refresh-path — Plan

## 목표
미편집 관리 절이 템플릿보다 낡았으면 doctor가 `harness-team init`을 처방하고, migrate·init 문서가 관리 절 경로를 바로 적는다.

## 단계
- [x] `tests/doctor.test.mjs`에 `findStaleManagedSections` 4종(stale·편집됨·최신·부트스트랩) — red 확인
- [x] `src/commands/doctor.mjs` `findStaleManagedSections` 구현 + 배선(경고·`nextActions`)
- [x] `commands/harness-migrate.md`·`commands/harness-init.md` 문장 정정
- [x] CHANGELOG Unreleased
- [x] `npm test`·`docs:check` + 소비자 1곳 실측(doctor가 stale 없음을 보고)
- [x] codex 리뷰 → artifact `## Reviews` (1차 P2 1·P3 1 반영, 2차 PASS)
- [x] 커밋·PR — #106 머지(`423ecd5`)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- stale 관리 절: 신규 정의(doctor 판정 = init 교체 조건).

## 참고
- 다이어그램: 옵트인 질문에 "넣지 않음"(2026-09-26).

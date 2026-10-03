# harness-version-stamp — Plan

## 목표
init이 render-state에 적용 하네스 버전(`harnessVersion`)을 기록하고, doctor가 project·CLI·plugin 버전을
한 줄로 보여 주며 project ≠ CLI면 방향별 경고를 낸다.

## 단계
- [x] spec/plan 다이어그램 — 미실행(orchestrator 위임 — 소규모 변경)
- [x] render-state: `readHarnessVersion` + `loadRenderState`의 `harnessVersion` semver 필터
- [x] planChanges: renderState에 `harnessVersion` 기록 (init 저장 경로 재사용)
- [x] doctor: `compareVersions`·`harnessVersionReport`·`readInstalledHarnessVersion` + 출력/JSON/next_actions
- [x] 테스트: init 후 기록 / 필드 없음 unknown / 경고 작음·같음·큼 / 잘못된 형식 폐기
- [x] README: render-state 설명·doctor 절 갱신, `npm run docs:check`
- [x] `npm run test` 통과
- [x] codex read-only 리뷰 → artifact ## Reviews 기록·반영
- [ ] ship: spec·plan·artifact 최종 갱신, push, PR 생성

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-03: applied version(`harnessVersion`) 신설 — render-state 스키마 `version`과 구분.

## 참고
- 후속 후보: SessionStart 훅 nudge(기록 < CLI일 때 한 줄) — 이번 범위 밖.

# docs-refresh-0181 — Plan

## 목표

첨부 HTML 3종을 0.18.1 기준으로 갱신하고, 스냅샷 계열이 있는 2종에 `-0.18.1.html` 스냅샷을 남긴다.

## 단계
- [x] 0.14.0 → 0.18.1 사이의 사실 변화를 소스로 확인해 spec의 교정 표를 확정
- [x] `docs/harness-workflow-simulation.html` 갱신 (배너·S2·S4·명령 카드·ship·버전 표기)
- [x] `docs/harness-fleet-guide.html` 갱신 (§1·§4·§6·§7·§8·§9·버전 표기)
- [x] `docs/harness-overview.template.html` 갱신 후 `npm run docs:generate`로 재생성
- [x] 스냅샷 2종 생성 (`harness-overview-0.18.1.html`, `harness-workflow-simulation-0.18.1.html`)
- [x] `npm run docs:check` · `npm test` 통과 확인 (422 tests · 0 fail)
- [x] 외부 리뷰(`/harness-review` codex) 실행 후 artifact `## Reviews`에 기록 — P2 2건·P3 2건 전건 조치
- [x] (범위 확장) `docs/harness-task-guide.html` 갱신 — 사용자 지시로 4번째 문서 포함
- [x] (범위 확장) 2차 외부 리뷰 실행 후 artifact `## Reviews`에 기록
- [x] artifact `## 결과` 작성

## Ontology 변경 로그

- **집계 파일(ledger)** — 0.16.0에서 "task/done이 쓰는 상태"에서 "summary가 렌더하는 생성물"로
  의미가 바뀌었다. 세 문서 모두 옛 의미로 서술하고 있어 이번 갱신의 가장 큰 교정 항목이다.
- **버전 기준선** — `package.json`의 버전이며 `## [Unreleased]`는 포함하지 않는다고 이 task에서 확정.

## 참고
- spec의 "무엇이 틀려졌나" 표가 이 plan의 각 단계가 무엇을 고치는지에 대한 정본

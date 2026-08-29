# docs-refresh-0210 — Plan

## 목표

소비자 문서 6종을 0.21.0 기준으로 정합화하고, 벤더링 인벤토리와 전체 스킬 옵트인 표를 추가한다.
스냅샷 관례가 있는 2종에 `-0.21.0.html` 스냅샷을 남긴다.

## 단계
- [x] 서브에이전트로 인벤토리 조사 — 커맨드·스킬 전수, 옵트인 근거(`옵트인` 전건 grep),
      비번들 의존성, CI 결합(생성기·테스트) 확인
- [x] `docs/prerequisites.md` §5에 "벤더링되지 않은 스킬" 절 신설 —
      `prerequisites:external-tools` 마커 블록은 건드리지 않는다
- [x] `docs/harness-workflow-simulation.html` 0.21.0 갱신 — 배너·가드 7종·S7 정합 검증·
      `/harness-diagram` 명시 + **전체 스킬 로스터 표** 신설
- [x] (범위 확장) `docs/harness-overview.template.html` 갱신 후 `npm run docs:generate` 재생성 —
      "다음 릴리스 예고" 블록을 출시 사실로 전환
- [x] (범위 확장) `docs/harness-task-guide.html` 0.21.0 갱신 — 라벨·SVG 게이트·`verify` 키·
      판정 창·페르소나 외부 엔진 모드·kind 접미사
- [x] (범위 확장) `docs/harness-fleet-guide.html` 0.21.0 갱신 — 라벨·가드 7종 3곳·D6 콜아웃·
      판정 창·검증 마커 함정 행
- [x] 스냅샷 2종 생성 + `docs/index.html` 버전 목록 등재
      (`harness-overview-0.21.0.html` · `harness-workflow-simulation-0.21.0.html`)
- [x] `npm test`(453 pass · 0 fail) · `npm run docs:check` green · HTML 태그 균형 검사 · 렌더 확인
- [x] `CHANGELOG.md` `## [Unreleased]`에 기록
- [x] 외부 리뷰(`/harness-review`) 실행 후 artifact `## Reviews`에 기록
- [x] artifact `## 결과` 작성

## Ontology 변경 로그

- **벤더링되지 않은 스킬** — 이 task에서 처음 목록으로 확정했다. 결론은 "하나뿐"이며,
  그 사실 자체(= 나머지는 전부 번들이라 설치할 것이 없다)가 문서에 필요한 정보라고 판단했다.
- **옵트인** — "계약으로 선언된 옵트인"과 "생략 가능한 규범"을 이 task에서 분리했다.
  스킬 로스터의 배지 체계(기본·옵트인·조건부·페르소나·상황별)가 그 구분의 산물이다.
- **종결 가드 수** — 6종(0.18.1) → **7종**(0.20.0 `verify`). 네 문서가 모두 6종으로 서술하고
  있었고, task guide는 라이프사이클 SVG 안에까지 박혀 있었다.

## 참고
- spec의 파일 표가 이 plan의 각 단계가 무엇을 고치는지에 대한 정본
- 다이어그램 옵트인: **아니오**(2026-08-29 사용자 확인) — plan에 그 단계를 두지 않는 것이 옵트아웃 상태

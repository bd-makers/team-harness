# team-onboarding-kit — Plan

## 목표

팀 전달용 진입로·실행물 4종을 `docs/`에 만들고, `index.html`이 역할별로 라우팅하게 한다.
코드·템플릿·훅은 건드리지 않는다.

## 단계

- [x] 기존 문서 자산 조사 — 6종 590 KB의 커버 범위 확인, 중복 제작 회피 근거 확보
- [x] `docs/index.html` — 역할별 진입로 카드 (5분 / 새 팀원 / 리뷰어 / 크루 운용 / 팀 소개 / 메인테이너)
- [x] `harness-operations-playground.html` — 운용 시나리오 구성기 (상황·게이트·리뷰·격리 → 실행 순서 · 자동 훅 · done 가드 판정 · 프롬프트)
- [x] `harness-onboarding-checklist.html` — 24항목 5페이즈, 진행률 localStorage, 게이트 경고, 막힘 리포트
- [x] `harness-kickoff-deck.html` — 16장 자립형 덱 (키보드 네비 · 개요 · 발표자 노트 · 인쇄)
- [x] `harness-cheatsheet.html` — A4 1장 인쇄용 (명령 8 · 4파일 · 세 게이트 · Done evidence · 하지 말 것 7 · 막혔을 때 · 자동 훅 · 채널 3 · D2~D6)
- [x] 덱 문구 확정 — 14장 1번 "가급적"으로 완화, 15장을 7개 전체로 확장 (사용자 승인)
- [x] 검증 — index 링크 121개 해석(앵커 포함), 치트시트 A4 1페이지(headless Chrome PDF), 덱 16장 오버플로 0, DOM 스텁 인터랙션 테스트 3종 통과, `npm run docs:check` green
- [ ] 커밋
- [ ] `/harness-ship` — spec·plan·artifact 최종 갱신 후 PR 준비 완료 보고

## Ontology 변경 로그

- 2026-09-13 — **진입로(route)** · **실행물** · **파생물** · **전달(delivery)** 4개념을 spec.md에 신규 정의.
  특히 "파생물"은 규약 변경 시 정본(`AGENTS.md` 등)을 먼저 고치고 이 산출물을 따라 고친다는 방향을 고정한다.

## 참고

- 산출물 5개 전부 `docs/` 안. 코드·`templates/`·훅 무변경
- 치트시트만 밝은 종이 테마 — 인쇄 대상이라 의도적으로 다른 계열

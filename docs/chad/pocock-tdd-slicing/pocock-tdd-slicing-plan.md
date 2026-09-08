# pocock-tdd-slicing — Plan

## 목표

Matt Pocock 병합 백로그 **#4 tdd**를 닫는다 — 실제 GAP인 **수직 슬라이싱**만
`templates/.claude/skills/new-feature/SKILL.md` Phase 3에 흡수하고, 이미 선점된 동어반복 가드는
3형제 호출 지시로 라우팅한다(복제 금지).

## 단계

- [x] 1. Phase 3에 수직 슬라이스 규율 삽입 — horizontal slicing 금지, 한 seam → 한 테스트 →
      최소 구현 → 반복, tracer bullet. "실패 먼저 확인"은 **종속절**로만.
- [x] 2. Phase 3에 3형제 **호출 지시** 1줄 — `/harness-unittest`·`/harness-comptest`·`/harness-inttest`.
      각주가 아니라 행동 지시로 쓴다(뮤테이션 자가점검·T2/T3 게이트가 거기 있음을 명시).
- [x] 3. 복제 금지 자가검사 — 편집 후 Phase 3에 동어반복 규칙 **재작성이 없음**을 grep으로 확인.
- [x] 4. 표면 무결성 — `npm test` 635개 중 634 pass·fail 0·skip 1(기존) · doctor `All checks passed` · `docs:check` 최신.
- [x] 5. 외부 리뷰 — codex(`gpt-5.6-sol`) REQUEST CHANGES, P2 4건·P3 1건 **전부 진짜(오탐 0)**.
      검증·판별·조치를 artifact `## Reviews`에 마커와 함께 기록하고 5건 모두 반영.
- [x] 6. 백로그 메모리 `matt-pocock-merge-backlog` #4 줄 갱신 — **부분 선점** 사실을 남겨
      다음 세션이 중복 분석을 반복하지 않게 한다.
- [x] 7. artifact `## Learnings`에 선점 분석 기록 후 `harness-team done`.

## Ontology 변경 로그

- **수직 슬라이스**가 이 레포에서 **동음이의어**임을 확정 — `harness-inttest`는 *계층 관통*
  (핸들러→DB→응답), 이 task는 *작업 단위*(한 테스트 ↔ 한 구현)를 뜻한다. spec.md Ontology에 반영함.
- **tracer bullet** 신규 정의 — 다음 사이클 설계를 바꾸는 정보원으로서의 테스트.

## 참고
- 다이어그램: 신규 task 직후 1회 제안 → **사용자가 패스 선택**(2026-09-07). 옵트인하지 않았으므로
  `## 단계`에 다이어그램 항목을 두지 않는다(AGENTS.md: plan에 그 단계가 있는지가 곧 상태다).
- 편집 표면 1개 확인: `commands/`에 트윈 없음, `templates/.codex/`엔 `hooks.json`뿐, `templates/.cursor/` 없음.

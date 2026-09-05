# summary-branch-guard — Plan

## 목표

`summary --write` 가드가 브랜치 **이름** 대신 **HEAD 커밋이 `origin/<기본브랜치>`와 같은지**를
보게 한다. 워크트리 세션의 상시 `--force` 우회를 없애되, 갈라진 브랜치는 계속 거부한다.

## 단계
- [x] spec.md 작성 · Ambiguity 게이트 통과(4/4) · Done evidence 선언(`review: required`)
- [ ] 실패 테스트 ①: origin/main과 **같은 커밋**의 비-main 브랜치에서 `--write`가 성공한다
- [ ] 실패 테스트 ②: 그 브랜치에 커밋을 하나 얹으면(ahead) 다시 거부하고 파일을 쓰지 않는다
- [ ] 실패 테스트 ③: origin/main보다 **뒤진**(behind) 브랜치도 거부한다
- [ ] 실패 테스트 ④: origin 없는 로컬 전용 저장소는 종전과 동일하다 (이름 판정만, 회귀 방지)
- [ ] 구현: `runSummary`의 `--write` 가드에 synced-branch 판정 추가 — `rev-parse` 실패는
      fail-closed로 기존 거부에 떨어뜨린다
- [ ] `CHANGELOG.md` `[Unreleased]`에 기록 (동작 완화이므로 Changed)
- [ ] `npm test` 전체 green · `npm run docs:check` exit 0
- [ ] codex read-only 리뷰 → artifact `## Reviews`에 마커와 함께 기록, 발견 재현·판별 후 반영
- [ ] ship — spec·plan·artifact 최종 갱신 후 준비 완료 보고 (PR 생성은 사용자 지시 후)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-09-05 신규: **동기화된 브랜치(synced branch)** · **갈라진 브랜치** 정의(spec Ontology).
  `fail-closed`는 `branchState` 주석에 있던 개념을 이 task가 명시적으로 이름 붙인 것이다.

## 참고
- 계약 정본: `tests/summary.test.mjs`
- 가드 본문: `src/commands/summary.mjs`의 `runSummary` `--write` 분기
- 유래 사례: `docs/hslee/settings-ask-tier/` 종결 시 워크트리 `--force` 우회

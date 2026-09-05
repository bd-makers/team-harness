# summary-branch-guard — Plan

## 목표

`summary --write` 가드가 브랜치 **이름** 대신 **HEAD 커밋이 `origin/HEAD`가 가리키는 브랜치와
같은지**를 보게 한다. 워크트리 세션의 상시 `--force` 우회를 없애되, 갈라진 브랜치는 계속 거부한다.

## 단계
- [x] spec.md 작성 · Ambiguity 게이트 통과(4/4) · Done evidence 선언(`review: required`)
- [x] 실패 테스트 ①: origin/main과 **같은 커밋**의 비-main 브랜치에서 `--write`가 성공한다
      — RED 확인(가드 거부로 실패) 후 구현으로 GREEN
- [x] 실패 테스트 ②: 그 브랜치에 커밋을 하나 얹으면(ahead) 다시 거부하고 파일을 쓰지 않는다
      — 이름 판정 시절부터 통과하는 회귀 방지 테스트다. 커버리지는 mutation B(정확 동일성 →
      ref 존재만으로 허용)로 실증했다 — ②③이 함께 RED이 된다
- [x] 실패 테스트 ③: origin/main보다 **뒤진**(behind) 브랜치도 거부한다 — ②와 같은 mutation B로 실증
- [x] 실패 테스트 ④: origin 없는 로컬 전용 저장소는 종전과 동일하다 (이름 판정만, 회귀 방지)
      — **중복 테스트 미추가**: 기존 `--write: origin 없는 master 저장소에서도 기본 브랜치로
      인정한다`와 `--write는 기본 브랜치가 아니면 거부한다`가 이 케이스를 이미 고정한다.
      mutation C(origin ref 없을 때 fail-open)로 둘이 RED이 되는 것을 확인했다.
      대신 mutation A가 드러낸 **미커버 경로**에 테스트를 새로 넣었다 — 커밋이 하나도 없는
      (unborn HEAD) 저장소에서 `rev-parse HEAD` 실패를 '동기화됨'으로 읽지 않는지
- [x] 구현: `runSummary`의 `--write` 가드에 synced-branch 판정 추가 — `rev-parse` 실패는
      fail-closed로 기존 거부에 떨어뜨린다
- [x] `CHANGELOG.md` `[Unreleased]`에 기록 (동작 완화이므로 Changed)
- [x] `npm test` 전체 green (604 tests / 603 pass / 0 fail / 1 skip + perf 1/1) · `npm run docs:check` exit 0
      · 추가로 clone 에서 end-to-end 실증 (BEFORE 거부 → AFTER `updated: docs/task_summary.md`)
- [x] codex read-only 리뷰 → artifact `## Reviews`에 마커와 함께 기록, 발견 재현·판별 후 반영
      — P2 1건(BRG-01). 재현 후 **수용**하고 `139bd3f`에서 고쳤다(synced 판정을 `origin/HEAD`로
      좁힘). 회귀 테스트 추가 + mutation E로 커버리지 실증. 마커 `tip=`은 조치 커밋을 가리킨다
- [x] ship — spec·plan·artifact 최종 갱신 후 준비 완료 보고 (PR 생성은 사용자 지시 후)
      — 다이어그램: 건너뜀(사용자 선택). 정합 검증(shipcheck): 실행 → REJECT(S1·S5 BLOCKER)
      → 둘 다 수용·수정 후 재대조 통과. PR 생성은 지시 대기

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-09-05 신규: **동기화된 브랜치(synced branch)** · **갈라진 브랜치** 정의(spec Ontology).
  `fail-closed`는 `branchState` 주석에 있던 개념을 이 task가 명시적으로 이름 붙인 것이다.
- 2026-09-05 정정: **동기화된 브랜치**의 기준을 "`origin/<후보>` 중 하나"에서
  "**`origin/HEAD`가 가리키는 브랜치**"로 좁혔다 — codex 리뷰 BRG-01(재현 완료). 후보 폴백은
  이름 판정에서는 아무것도 열지 않지만 커밋 판정에서는 쓰기를 연다. spec Ontology·설계 절과
  구현·CHANGELOG를 함께 갱신했다.

## 참고
- 계약 정본: `tests/summary.test.mjs`
- 가드 본문: `src/commands/summary.mjs`의 `runSummary` `--write` 분기
- 유래 사례: `docs/hslee/settings-ask-tier/` 종결 시 워크트리 `--force` 우회

# done-status-expiry — Plan

## 목표

`meta.status`를 정본으로 만든다 — done된 task를 재활성화하면 완료가 만료되어(`done → open`)
`reopenedAt`이 새 판정 창의 시작점이 되고, 재개 후보 판정이 `status`를 읽는다.

## 단계

- [x] 1. reopen 전이 테스트 작성 (실패 확인) — done meta → `runTask` → `status: open`·
      `closedAt: null`·`reopenedAt` 기록·`firstActivatedAt` 불변, 출력 `reopened:`
- [x] 2. 일반 재활성화 무변화 테스트 작성 (실패/통과 확인) — `status: open`인 task는 meta 무변경, 출력 `activated:`
- [x] 3. `runTask` reopen 분기 구현 → 1·2 통과
- [x] 4. 판정 창 테스트 작성 (실패 확인) — `reopenedAt`이 있으면 창 시작점이 그것이고,
      reopen 이전 커밋은 증거로 인정되지 않는다
- [x] 5. 창 해석을 `reopenedAt || firstActivatedAt`으로 구현 → 4 통과
- [x] 6. 재개 후보 테스트 작성 (실패 확인) — `status: done` + 열린 체크박스 task는 후보에서 제외,
      meta 없는 레거시 task는 후보 유지
- [x] 7. `listIncompleteTasks`에 status 필터 구현 → 6 통과
- [x] 8. 전체 검증 — `npm run test` 무회귀 + `doctor` 통과
- [x] 9. 문서 갱신 — AGENTS.md의 meta 설명에 `reopenedAt`·만료 규약 반영, CHANGELOG `[Unreleased]`
- [ ] 10. Codex read-only 리뷰(`review: required` 선언) → 발견 반영 → artifact `## Reviews` 기록
- [ ] 11. artifact 결과·학습 기록 → `harness-team done`

## Ontology 변경 로그

- **만료(expiry)**: 시간 경과가 아니라 **상태 전이**로 정의한다 — 재활성화가 완료를 무효로 만든다.
- **reopen**: `done → open` 전이. 신규 meta 키 `reopenedAt`이 그 시각을 기록한다.
- **판정 창 시작점**: `firstActivatedAt` → `reopenedAt || firstActivatedAt`으로 확장.
  `firstActivatedAt`의 "생성 시 1회만" 불변식은 그대로 유지된다.

## 참고
- spec의 `## 설계 / 접근`이 변경 3곳(파일·행)을 지목한다.
- 다이어그램: 만들지 않음(2026-09-06 사용자 옵트인 질문에 "아니오").

# scaffold-pm-permissions — Plan

## 목표
`harness-team init`의 `.claude/settings.json` 권한 목록을 감지된 패키지 매니저(npm·yarn·pnpm·bun)와
스택(RN 여부)에 맞게 생성한다 — pnpm·Expo 고정 해소.

## 단계
- [x] spec 작성 — Ambiguity 자가진단 4/4 통과 (2026-09-04)
- [ ] 실패 테스트 먼저 — `tests/settings-permissions.test.mjs`: pm(npm·yarn·pnpm·bun·none) × stack(RN·비RN·없음) 매트릭스
- [ ] 구현 — `src/settings-permissions.mjs` 생성 함수 + `templates/.claude/settings.json`에서 pm·RN 항목 제거 + `planChanges` 합성
- [ ] planChanges 통합 테스트 — node fixture: `npm test`·`npm run lint` 있음, Expo·pnpm 없음 / expo fixture: Expo allow 3·deny 2 있음
- [ ] 전체 검증 — `npm test` green, `git add -A && npm run docs:generate`(신규 테스트 파일 인벤토리) 후 `npm run docs:check` exit 0
- [ ] 문서 — `CHANGELOG.md` [Unreleased]에 Changed 항목(재실행 시 옛 pnpm 항목 잔존 한계 포함), 가이드에 pnpm 권한 서술이 있으면 갱신
- [ ] 리뷰 — `/harness-review codex` → artifact `## Reviews` 기록·마커
- [ ] ship — spec·plan·artifact 최종 갱신, PR 생성은 별도 지시

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-09-04 "pm 의존 허용 항목"·"RN 전용 항목"·"유효 stack id" 정의 (spec 초안)

## 참고
- 다이어그램 옵트인: 아니오 (2026-09-04, 신규 생성 시 1회 질문)
- 브랜치 `claude/scaffold-pm-permissions` (main c9945bc 기준, worktree handoff-documentation-a0bfe8 재사용)

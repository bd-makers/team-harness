# release-publish-workflow — Plan

## 목표

`v*` 태그 push만으로 CHANGELOG 본문을 담은 GitHub Release가 발행되게 한다.

## 단계

### §1 추출기
- [x] `scripts/changelog-section.mjs` — `extractChangelogSection(changelog, version)` export +
      CLI(`node scripts/changelog-section.mjs <version>`) — 검증: 존재하는 버전은 본문만,
      없는 버전은 비영(非0) 종료
- [x] `tests/changelog-section.test.mjs` — 검증: 절 경계를 다음 `## `로 잡지 않게 바꾸면
      fail 하는가 (인접 버전 본문 혼입 감지)

### §2 워크플로우
- [x] `.github/workflows/release.yml` — `on: push: tags: ['v*']`, `contents: write`,
      태그↔package.json 버전 정합 검사 → 절 추출 → `gh release create` — 검증: 버전
      불일치 시 실패하는 분기가 명시돼 있는가

### §3 문서
- [x] `MAINTAINING.md` 릴리스 절차에 9단계(자동 발행) 추가 — 검증: 8단계가 종점이라는
      서술이 남아 있지 않은가

### §4 종결
- [x] `npm run test` 전체 통과
- [x] Codex 리뷰(`/harness-codex-review` 절차) + artifact `## Reviews` 기록
- [x] artifact `## 결과` 작성 → 커밋 → done
- [x] 머지 후 v0.14.0 태그 재push로 실제 발행 확인 — 사용자 승인 대기(범위상 별도 단계, artifact에 미완으로 기록)

## Ontology 변경 로그

- (none)

## 참고

- 태그 재push는 삭제 후 재생성이므로 사용자 승인 없이는 하지 않는다

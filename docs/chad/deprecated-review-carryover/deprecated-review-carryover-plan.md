# deprecated-review-carryover — Plan

## 목표

0.20.0에서 누락된 이월 기록을 `## [Unreleased]`에 정정 기록으로 남기고,
0.21.0 제거의 실행 단계를 후속 범위로 준비해 둔다.

## 단계

### 이번 PR 범위 — CHANGELOG 정정 기록
- [x] 다이어그램 옵트인 — 미실행(비대화 세션이라 기본값 "아니오"로 건너뜀)
- [x] spec 작성 — 목적·선행 조건 체크리스트·Ambiguity 자가진단·Done evidence
- [x] `CHANGELOG.md` `## [Unreleased]`에 정정 기록 추가 — 0.19.0 이월 기록 규칙의
      0.20.0 미준수 사실 + 포워딩 4개가 0.20.0 트리에 남은 것은 의도된 하위 호환이라는 사실.
      발행된 `## [0.20.0]` 절은 수정하지 않는다
- [x] 검증 — `node --test tests/what-changes-latest-version.test.mjs tests/manifest-sync.test.mjs
      tests/documentation-inventory-pointers.test.mjs` 12/12 green + `npm run docs:check` 최신
- [x] artifact 기록 → 커밋 → push → PR (머지는 하지 않는다)

### 후속 범위 — 0.21.0 제거 (선행 조건: 홈 머신 hsonpro 전역 CLAUDE.md 전환 확인, 사용자만 가능)
- [ ] `commands/harness-codex-review.md`·`commands/harness-codex-adversarial-review.md` 제거
- [ ] `skills/harness-codex-review/`·`skills/harness-codex-adversarial-review/` 제거
      (`skills/harness-codex-sim`은 별개 — 건드리지 않는다)
- [ ] `.claude-plugin/plugin.json` commands 배열에서 위 커맨드 2개 항목 제거
- [ ] `npm test`로 `tests/manifest-sync.test.mjs` 통과 확인
- [ ] `npm run docs:generate` 재생성
- [ ] 제거 사실을 그 릴리스의 CHANGELOG 절에 기록 (이월 시에는 Notes에 이월 기록 — 0.19.0 규칙)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
- `CHANGELOG.md` `## [0.19.0]` `### Notes` — 이월 규칙 원문

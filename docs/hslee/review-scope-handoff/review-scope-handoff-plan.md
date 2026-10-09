# review-scope-handoff — Plan

## 목표
`--scope` 없는 리뷰·`scope` 판정이 post-commit 훅이 쓴 handoff 변경을 dirty로 세지 않는다 — 그것뿐이면 diff로 간다.
그 밖의 변경이 있으면 종전대로 worktree, 명시 `--scope`는 불변.

## 단계
- [ ] spec/plan 다이어그램 (옵트인 — 사람 결정 대기)
- [x] 1. 실패 재현 테스트 먼저 — `tests/review-command.test.mjs` S1·S2, `tests/scope-command.test.mjs` S3 → 수정 전 코드에서 S1·S2·S3 빨강 확인
- [x] 2. 구현 — `src/commands/task.mjs` `repoPrefix` export · `src/commands/review.mjs` `resolveScope` dirty 판정(`-z` 파싱 + 활성 task 훅 handoff 제외)
- [x] 3. 문서 — `commands/harness-review.md` 2단계 · `commands/harness-task.md` post-commit 절 한 줄 · CHANGELOG `[Unreleased]` · `docs/followups.md` 17·18번
- [x] 4. 검증 — `npm test` · `npm run docs:check` · `harness-team scenario check` → artifact 기록
- [ ] 5. 리뷰 — R2 `review codex --framing scenario --scope diff` · R3 `review codex --scope diff`(codex 실패 시 claude 폴백) → artifact `## Reviews`
- [ ] 6. ship 준비 보고 — spec·plan·artifact 최종 갱신, 로컬 커밋까지(push·PR 금지 — brief)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-10 "실제 dirty" 정의를 scope 자동 판정에도 적용 — done 가드와 같은 훅 출력 제외 집합.

## 참고
- spec Done evidence S1–S3, 설계 절 "B 판단"·"관련 잠재 문제"
- 다이어그램 단계는 brief 지시로 옵트인 질문 없이 열어 둔다 — 사람 결정 대기(보고에 포함).

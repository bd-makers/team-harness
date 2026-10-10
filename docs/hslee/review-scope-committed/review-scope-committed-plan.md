# review-scope-committed — Plan

## 목표
worktree scope 리뷰가 base 와의 merge-base 이후 커밋 + 미커밋을 보게 하고, 기록의 `base`·`mergeBase` 키로 신·구 의미를 구분하고 리뷰 범위를 사후 증명한다(spec 설계 1–7).

## 단계
- [x] spec 승인 대기 — needs-input 보고 → 2026-10-11 승인(Q1 base+mergeBase 기록·Q2 경고만·Q3 다이어그램 생략)
- [x] 실패 재현 테스트 먼저 — S1·S2·S3(`tests/review-command.test.mjs`), S4(`tests/scope-command.test.mjs`)
- [x] `resolveScope` — base 사다리 추출, worktree 에 base·mergeBase 판정, degrade/error 비대칭
- [x] `buildPrompt` fill · `runReview` entry `base`·`mergeBase` 키 · degrade 경고 · 블록 줄 base
- [x] `scope.mjs` — `extra.mergeBase` · degrade 경고
- [x] 문서 — `commands/harness-review.md` 2·3·5단계, `commands/harness-ship.md` 2·7·8단계·예시, `summary.mjs` 주석, `CHANGELOG.md` [Unreleased]
- [x] 검증 — `npm test` · `npm run docs:check` · `harness-team scenario check`
- [x] 리뷰 — `harness-team review <engine> --framing scenario` 및 기본 리뷰, artifact `## Reviews`에 판별 기록 (codex-scenario 1차 E1 na → 기록 보강 → 2차 pass · codex 발견 0)
- [ ] 머지 (사람 지시 후 — 종결은 기본 브랜치에서)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-11 Q1 결정: 기록에 `mergeBase` 도 남긴다 — '리뷰 범위 증명' 개념 추가, degrade 는 두 키 모두 null
- 2026-10-11 worktree scope 의미 확장(미커밋 → merge-base 이후 커밋 + 미커밋) · base·merge-base·worktree degrade·과거 worktree 기록 정의 추가

## 참고
- spec 설계 절 · 선행 task `review-scope-handoff`

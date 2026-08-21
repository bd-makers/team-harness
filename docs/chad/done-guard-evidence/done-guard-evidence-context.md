# done-guard-evidence — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `collectDoneIssues`에 증거 기반 체크 2종(테스트 작성 / 리뷰 마커)을 추가하고 리뷰 명령의 마커 계약을 확장한다.
- Current atomic step: plan 1~13 완료 + codex 리뷰 6건 조치. 남은 것: artifact 기록 마무리(plan 14) 후 커밋.
- Stop / human-decision condition: `--force` 훈련 리스크 관련 설계 변경이 필요해지면 중단하고 사용자 판단을 받는다.

## Constraints and settled decisions
- stale 리뷰 판정은 이번 범위에서 하지 않는다 (plan Ontology 로그).
- 선언 invalid는 조용한 기본값 폴백 금지 — 차단 사유로 배선한다 (plan 6).
- 잘못된 리뷰 마커는 조용히 무시하며 마커 없음과 동일 취급 (plan 3).
- 2026-08-22 브랜치를 main(0.18.0)으로 ff 후 WIP 재적용. 마커 계약 대상은 0.17 재편된
  `commands/harness-review.md`·`harness-adversarial-review.md` (옛 codex-* 파일은 포워딩 stub이라 미수정).
- 원장 2종(task_summary.md·<user>-task.md)은 0.18부터 파생 생성물 — feature 브랜치에서 직접 수정 금지,
  대신 `done-guard-evidence-meta.json` 생성으로 대체 (decisions.md D5).

## JIT retrieval map
- Identifiers / symbols: `taskArtifactTemplate`, `collectDoneIssues`, `parseReviewMarkers`, `parseDoneEvidenceDeclaration`, `classifyChangedPaths`
- Narrow globs: `src/commands/task.mjs`, `tests/done-guard.test.mjs`, `commands/harness-review.md`, `commands/harness-adversarial-review.md`
- Verification command: `node --check src/commands/task.mjs && npm run test`

## Failure capsules (max 3 unresolved)
- (none — F-001 해소: 템플릿 리터럴 내 마크다운 인라인 백틱 미이스케이프가 원인.
  `\`` 이스케이프 후 `node --check` 통과, 학습은 artifact로 이관 예정)

## Resume checklist
- [x] F-001 해소 — task.mjs 백틱 이스케이프 → `node --check` 통과
- [x] 워킹 트리 구현분을 plan 1~10과 대조 검증 후 plan.md 체크박스 갱신
- [x] plan 11~12 — `tests/done-guard.test.mjs` 신규 케이스 작성 + `npm run test` 전체 통과 (386 pass)
- [ ] plan 13 — `/harness-review` 외부 리뷰 → artifact `## Reviews` 기록 (+ 신규 마커 계약 dogfood)
- [ ] plan 14 — 리뷰 발견 검증·조치, artifact `## 결과`/`## Learnings` 정리
- [ ] 커밋 후 post-commit hook의 handoff 자동 갱신 확인
- [ ] 드리프트(별건): AGENTS.md 컨텍스트 파일 표가 이 repo에 없는 `.claude/rules/`·`opencode.json`·`.cursor/rules`를 나열 — 개발 repo 예외를 문서에 명시할지 결정
- [ ] 드리프트(별건): 이 repo의 Claude Code용 SessionStart task-gate 훅 미배선(templates에만 존재) — 의도인지 결정

# handoff-sweep-fold — Spec

## 목적 / 요구사항

**오늘 무엇이 안 되는가.** post-commit 훅(`harness-team handoff`)은 커밋 **뒤에** `<name>-handoff.md`와
`<user>-handoff.md`를 쓴다. 트리가 dirty로 남으니 세션이 매 작업 커밋 직후 그 변경만 담는 sweep 커밋을
하나씩 붙였다 — 2026-09-20~25 이력 98커밋 중 23개가 "post-commit 훅이 갱신한 handoff 반영"이다.
0.38.1(`handoff-hook-churn`)은 sweep이 **무한 루프**가 되는 것만 막았고, sweep 자체는 줄이지 않았다.

**영향.** 이 저장소와 소비자 프로젝트의 git 이력(리뷰·bisect 노이즈), PR 커밋 수.

**기대 결과.** handoff만 담는 커밋이 푸시·브랜치 전환 직전에만 생긴다(보통 PR/MR당 1개) — 나머지는 다음 작업 커밋에 접힌다.

**제약.**
- **훅 동작·코드는 바꾸지 않는다**(2026-09-25 전하 결정 A). pre-commit stage(B)와 gitignore(C)는 기각 — 아래 참고.
- `AGENTS.md` eager 예산(`PROJECT_EAGER_MAX_BYTES` 17,500 B)의 여유가 24 B뿐이다 — AGENTS 줄은
  길이를 거의 유지하고, 상세는 정본인 `commands/harness-task.md`에 둔다.
- `protocol` 절은 마커 관리 구간이다 — 루트 `AGENTS.md`와 `templates/AGENTS.md.hbs`를 같이 바꾼다.

## 설계 / 접근

규범만 바꾼다. 세 표면:

1. `AGENTS.md`·`templates/AGENTS.md.hbs` `commit 시` 줄 — "단독 커밋 말고 다음 커밋에 담는다".
2. `commands/harness-task.md` post-commit handoff 절(정본) — 규칙·근거 수치·예외(푸시·브랜치 전환 직전
   남은 변경이 handoff뿐이면 PR/MR당 1회 단독 sweep 허용)·`done` 가드가 dirty handoff를 무시한다는 사실.
3. `commands/harness-ship.md` 5단계 — ship 문서 커밋에 남은 handoff를 함께 담는다.

**예외를 두는 이유.** 로컬 변경을 잃게 되는 브랜치 전환은 git이 거부하고, dirty 워크트리는 일반
`git worktree remove`가 거부한다 — 미커밋 handoff가 **유실되는 것은 `--force`·수동 삭제 때뿐**이지만, 어느 쪽이든
그 순간 정리가 필요하다. 푸시 직전도 같다(푸시되지 않은 handoff는 다른 세션·머신에 안 간다).
그래서 이 시점들에만 단독 sweep을 허용한다. 보통 PR/MR당 한 번이지만 상한은 두지 않는다 — 푸시 뒤 리뷰 대응
커밋이 생기면 다음 푸시 직전에 다시 필요하다(codex P2).

**기각한 대안.**
- **B. pre-commit/commit-msg 단계에서 같은 커밋에 stage**: 항목에 자기 sha를 못 넣고 amend 중복 제거
  (`amendCutPoint`)를 다시 짜야 하며, `git commit <path>` 부분 커밋은 임시 index라 불안정. 소비자 migrate 필수.
- **C. handoff gitignore**: SSOT 4파일 계약과 git 경유 세션·머신 인계가 깨진다.

## Ontology

- **sweep 커밋**: 직전 커밋의 handoff churn만 담는 커밋. 이 task 뒤로는 푸시·브랜치 전환·워크트리 정리 직전에만 만든다(보통 PR/MR당 1개).
- **접기(fold)**: churn을 다음 작업 커밋에 함께 stage하는 것. 기본 동작.
- 게이트 근거: 목표·제약·성공 기준이 모두 한 문장으로 서고, 영향 파일 4개가 식별됐다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — "handoff만의 커밋은 푸시·전환 직전에만".
- [x] **Constraint 명확도** (30%) — 코드 불변·eager 예산·마커 절 동기.
- [x] **Success 기준** (30%) — 세 표면에 규칙 반영, `npm test`·`docs:check` 통과, eager 상한 유지.
- [x] **Context 명확도** (brownfield) — `AGENTS.md`, `templates/AGENTS.md.hbs`, `commands/harness-task.md`, `commands/harness-ship.md`.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

## Done evidence
```json
{ "version": 1, "review": "required", "tests": "skip" }
```

## 참고

- 선행 task: `docs/chad/handoff-hook-churn/`(0.38.1, sweep 무한 루프 차단) · `handoff-amend-dedup`(0.38.2).
- 강제력은 없다 — 규범 준수에 의존한다. 효과는 다음 몇 PR의 커밋 이력으로 확인한다.

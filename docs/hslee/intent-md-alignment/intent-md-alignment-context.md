# intent-md-alignment — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: intent.md 요소 2개(Problem · Open questions)를 spec 표면에 흡수 + observe 트립 → task nudge. 파일·게이트·가중치 추가 없음.
- Current atomic step: **완료** — 구현·테스트·Codex 리뷰(P2 1건 반영)·artifact 기록 끝. 커밋·릴리스 대기.
- Stop / human-decision condition: 커밋·릴리스는 사용자 지시로만. `harness-team done`은 커밋 뒤(가드가 git 증거를 본다).

## Constraints and settled decisions
- 6번째 파일(intent.md) 금지 — AGENTS.md 포인터 껍데기 금지 + doctor `checkActiveSpecGate`가 막아 둔 실패 모드
- Problem은 Goal 차원 안에서만 발사(채점 차원·가중치 추가 없음). 5축 승격(B안)은 누락이 반복 관측된 뒤
- `(open)`은 `## 참고` 절 목록 항목. 게이트는 답 반영 또는 `(open → <대상>)` 요구
- observe nudge는 emitter가 아님 — task 자동 생성 금지(임계값 미보정)
- 다이어그램 옵트아웃(생성 시 "아니오"). Codex 리뷰 실행 승인됨(2026-09-06)

## JIT retrieval map
- Identifiers / symbols: `observeLoopbackNudge` · `renderObserveText` · `taskSpecTemplate` · `ambiguityCounts`(sim)
- Narrow globs: `commands/harness-{spec,interview,observe}.md` · `src/commands/{task,observe}.mjs` · `tests/{observe,task-templates,agent-files}.test.mjs`
- Read next: `tests/documentation-inventory-pointers.test.mjs` (templates/docs/README.md 검사 범위)
- Verification command: `npm test && npm run docs:check`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- plan 전 항목 `[x]`. 남은 행동은 커밋 → (선택) `harness-team done` → 다음 릴리스에 `[Unreleased]` 포함.
- `git status --short`: 수정 10 + 신규 task 디렉터리 1.

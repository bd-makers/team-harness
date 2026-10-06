# default-loop-skill — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 다이어그램: docs/chad/default-loop-skill/default-loop-skill-diagram.html 생성 — inline SVG swimlane — 브라우저 pane 렌더 확인, 텍스트 경계 JS 검증 (2026-10-06)
- 루프 dogfood 진입(2026-10-06): plan 3단계부터 `/harness-loop` 절차로 실행. 진입 질문의 답은 사용자가 승인한 plan("3. `/harness-loop`로 실행")으로 갈음. 게이트 미설정(`.harness/gates.json` 없음) — 기계 검사는 시나리오 선언에 기댄다.
- loop: 2026-10-06 · 수단 subagent · 단계 3 README 설계 스코프 정정 + 사이클 문서 갱신 · QA pass · commit 789dcf8
  - 무엇·왜: README의 "런타임 오케스트레이션 비채택" 문구가 선택형 루프까지 금지한 것처럼 읽혀 "서비스형은 비채택, 선택형 루프는 제공"으로 구분했다(R-11). Dev가 지시 밖으로 §6 B의 "(§4-3 미검증)"을 "(§4-3)"으로 고쳤다 — 미검증 줄을 바꾼 결과와 맞추는 변경이라 수용.
  - QA: gate not-configured(exit 0) · boundary not-configured · scenario S1–S5 pass, S6는 이 단계 전 증거 없음(기록 줄 자체가 증거)이라 진전 판정 제외.
  - `✔ loop: README distinguishes a service orchestrator from the optional loop command`
- loop: 2026-10-06 · 수단 subagent · 단계 4 CHANGELOG + overview·docs:check · QA pass · commit 498badd
  - 무엇·왜: 소비자에게 새 슬래시 명령이 하나 생기므로 `[Unreleased] > Added`에 기록. overview는 2단계 커밋 때 pre-commit 훅(docs:check)이 먼저 요구해 이미 재생성돼 있었다.
  - QA: gate not-configured · boundary not-configured · scenario S1–S6 pass · docs:check pass.
- 5단계(검증만, Dev 턴 없음): `npm run test` → tests 1188 · pass 1187 · fail 0 · skip 1(전 1183 + 신규 5). `node bin/harness-team.mjs scenario check` → `scenario: pass (6 checked)`.
  dogfood 발견: plan에 구현 없는 검증 단계가 있으면 루프 문서에 처리 규칙이 없었다 → `commands/harness-loop.md` 진입 절에 "Dev 턴 없이 QA 1–4로 닫는다" 한 줄 추가.
  시나리오별 이름 찍힌 실행 출력(R2 E1 근거):
  - S1 `✔ manifest-sync: Claude harness commands have Codex command-equivalent skills` · `✔ manifest-sync: commands/*.md ⟺ plugin.json commands`
  - S2 `✔ loop: the four stop conditions are pinned and no-progress has no numeric cap`
  - S3 `✔ loop: QA runs machine checks before the read-only rubric and records named test output`
  - S4 `✔ loop: entry asks orchestrator-or-individual and the loop never pushes or opens a PR`
  - S5 `✔ loop: README distinguishes a service orchestrator from the optional loop command`
  - S6 grep exit 0 — 위 `- loop:` 기록 줄 2개가 증거(테스트 러너 아님)
- loop: 2026-10-06 · 수단 subagent · 단계 6 R2 E1 반영(S3·S4 assertion 보강) · QA pass · commit 28e6858
  - 무엇·왜: R2 루브릭(codex)이 E1 fail — 루브릭 담당 변이(S3)·승인 필요 미멈춤 변이(S4)를 테스트가 못 잡았다. 오케스트레이터는 테스트 코드를 읽어 재현했다(문서 변이 실행은 자동 모드 분류기가 안전 규칙 약화로 거부).
    Dev가 문장 단위 비교(공백 정규화)로 고정하고, 일회성 스크립트에서 변이 문자열 9/9 기대대로 판정됨을 확인.
  - QA: gate not-configured · boundary not-configured · scenario S1–S6 pass. 진전 판정: 실패 집합 E1(S3,S4) → 없음, diff 변화 있음.
  - `✔ loop: QA runs machine checks before the read-only rubric and records named test output` · `✔ loop: entry asks orchestrator-or-individual and the loop never pushes or opens a PR`
- R2 재검(codex-scenario, tip 32ae06d): E1·E2 pass.
- loop: 2026-10-06 · 수단 subagent · 단계 6 R3 P2×3 반영(검증 단계 명령 실행 · 커밋 실패 시 체크 되돌림 · untracked 진전 포함) · QA pass · commit 9f9f0eb
  - 무엇·왜: R3(codex) changes requested, P1 없음. 오케스트레이터 판별 — 셋 다 유효. 특히 "체크 후 커밋 실패" 상태는 이번 dogfood 2단계에서 pre-commit docs:check 실패로 실제 발생했다(같은 턴 재커밋으로 넘어감).
  - QA: gate not-configured · boundary not-configured · scenario pass (6 checked) · docs:check pass. 진전 판정: 실패 집합 R3(P2×3) → 없음, diff 변화 있음.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-10-06T10:34:58.847Z — codex-scenario (harness-team review)

- engine: codex · scope: diff · tip: 747405f8fe307e7902b452d8fcf365aa5294b4d9 · exit 0 · 2352 B

```text
**E1 · 각 시나리오 증거가 Then을 실제로 검증 · BLOCKER · fail**

실제 테스트 이름은 artifact에 기록되어 있고, S3·S4의 지정 명령에서도 확인했습니다. 그러나 다음 변이를 기존 assertion이 잡지 못했습니다. 파일 변경 없이 메모리에서 입력 문서만 변이했습니다.

- **S3:** 루브릭 담당을 “별도 프로세스의 read-only 검증자”에서 “오케스트레이터가 직접”으로 바꿔도 통과했습니다. [테스트](/Users/chadonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/default-loop-skill/tests/loop-command.test.mjs:45)는 검사 순서와 기계 검사 담당만 확인하고, 루브릭 담당은 assert하지 않습니다.
  실행 출력: `✔ loop: QA runs machine checks before the read-only rubric and records named test output`
- **S4:** 승인 필요 조건의 “하지 않고 멈춘다”를 “하지 않고 다음 단계로 계속한다”로 바꿔도 통과했습니다. [테스트](/Users/chadonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/default-loop-skill/tests/loop-command.test.mjs:60)는 push·PR 금지 문구를 확인하지만, 필요한 상황에서 멈추는지는 assert하지 않습니다.
  실행 출력: `✔ loop: entry asks orchestrator-or-individual and the loop never pushes or opens a PR`

**E2 · spec 밖 동작 변경 없음 · MAJOR · pass**

`origin/main` 대비 diff의 명령·래퍼·등록·README·interview·cycle·overview·CHANGELOG 변경은 spec의 요구사항과 영향 파일 목록에 대응합니다. 추가된 “검증만 하는 단계는 Dev 턴 없이 QA 1–4로 닫는다” 규칙도 [artifact](/Users/chadonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/default-loop-skill/docs/chad/default-loop-skill/default-loop-skill-artifact.md:16)에 dogfood 발견과 변경 사유가 기록되어 있습니다.

**최종 verdict: fail — 실패 항목 전체: E1(S3, S4).** 두 Then을 깨뜨리는 변이에서 테스트가 실패하도록 assertion 보강이 필요합니다. 파일은 수정하지 않았습니다.
```

<!-- harness:review kind=codex-scenario scope=diff tip=747405f8fe307e7902b452d8fcf365aa5294b4d9 at=2026-10-06T10:34:58.847Z -->

### 2026-10-06T10:43:52.150Z — codex-scenario (harness-team review)

- engine: codex · scope: diff · tip: 32ae06d609a29b3396e21dc5deeceb4c5a5f8dd1 · exit 0 · 2318 B

```text
검토 범위: `refs/remotes/origin/main` 대비 현재 워킹트리(`HEAD 32ae06d`). 파일은 수정하지 않았습니다.

**E1 · 각 시나리오의 증거가 Then을 실제로 검증 · BLOCKER · pass**

- **S1:** manifest의 양방향 등록 비교와 래퍼 이름·명령 참조 assertion을 확인했습니다. 등록 제거·래퍼 이름 변경·참조 변경 변이에서 해당 테스트가 모두 실패했습니다.
- **S2–S5:** 대상 테스트 이름이 실제 실행 출력에 나왔습니다. [테스트 코드](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/default-loop-skill/tests/loop-command.test.mjs:48>)의 assertion과 Then을 대조하고, 파일 변경 없이 입력 문서를 메모리에서 변이했습니다. S1–S5 변이 **16개 모두 해당 테스트에서 exit 1**로 거부됐습니다.
- 기존 실패 **S3·S4**도 재현 변이가 이제 실패합니다. 출력: `✖ loop: QA runs machine checks before the read-only rubric and records named test output`, `✖ loop: entry asks orchestrator-or-individual and the loop never pushes or opens a PR`.
- **S6:** [artifact](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/default-loop-skill/docs/chad/default-loop-skill/default-loop-skill-artifact.md:9>)에 `수단 subagent · 단계 … · QA pass · commit 789dcf8` 등 기록 줄이 있습니다. 메모리에서 기록 줄·`QA pass`·SHA를 각각 제거하면 선언된 grep이 exit 1입니다.

**E2 · spec 밖 동작 변경 없음 · MAJOR · pass**

diff의 명령·래퍼·등록·README·interview·cycle·overview·CHANGELOG 변경은 spec 요구사항과 영향 파일 목록에 대응합니다. 추가된 “검증만 하는 단계는 Dev 턴 없이 QA 1–4로 닫는다” 규칙도 [artifact](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/default-loop-skill/docs/chad/default-loop-skill/default-loop-skill-artifact.md:17>)에 dogfood 발견과 변경 사유가 기록되어 있습니다.

**최종 verdict: pass — 실패 항목 전체: 없음.**
```

<!-- harness:review kind=codex-scenario scope=diff tip=32ae06d609a29b3396e21dc5deeceb4c5a5f8dd1 at=2026-10-06T10:43:52.150Z -->

### 2026-10-06T10:46:01.963Z — codex (harness-team review)

- engine: codex · scope: diff · tip: 02d5f5e9254d80739c2f91aa01298a68811f6d15 · exit 0 · 1383 B

```text
- **P2 should-fix — [commands/harness-loop.md:39](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/default-loop-skill/commands/harness-loop.md:39>):** Verification-only steps close after QA 1–4 without running the step’s explicit command; a planned full test run can be marked complete after only limited scenario checks.
- **P2 should-fix — [commands/harness-loop.md:89](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/default-loop-skill/commands/harness-loop.md:89>):** The checkbox is marked complete before committing, with no rollback on hook failure; restarting then skips an uncommitted step.
- **P2 should-fix — [commands/harness-loop.md:105](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/default-loop-skill/commands/harness-loop.md:105>):** `git diff HEAD` excludes untracked files, so useful changes confined to newly created files can incorrectly trigger “no progress.”

Relevant tests: **14 passed**. `docs:check` and diff whitespace checks passed. No files modified.

**Final verdict: Changes requested — three P2 findings; no P1 blockers found.**
```

<!-- harness:review kind=codex scope=diff tip=02d5f5e9254d80739c2f91aa01298a68811f6d15 at=2026-10-06T10:46:01.963Z -->

## Learnings

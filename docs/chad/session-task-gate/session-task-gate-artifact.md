# session-task-gate — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과 (2026-06-17)

SessionStart task-gate 구현 완료. 활성 task 없이 프롬프트로 작업을 시작하는 우회를
세션 시작 시 nudge로 잡는다 (block 아님 — 판단은 Claude).

**구현 (6 task, TDD):**
- `src/commands/session-context.mjs` (신규): `buildSessionContext(targetDir)` 순수 함수.
  활성 task 있으면 breadcrumb 1줄, 없으면 미완 task 나열한 `<system-reminder>` nudge.
- `src/commands/task.mjs`: `planHasOpenBoxes()` 추출(done-guard와 "미완" 단일 정의 공유) +
  `readActive` export.
- `bin/harness-team.mjs`: `session-context` 서브커맨드 배선.
- `templates/.claude/settings.json` + 이 repo `.claude/settings.json`(dogfood):
  `hooks.SessionStart` 등록. 템플릿은 전역 `harness-team`, dogfood는 `node bin/...`.
- `AGENTS.md` + `templates/AGENTS.md.hbs`: task-gate 동작 문서화 (SSOT).

**검증:**
- `npm test` → 89/89 통과 (신규 session-context 5건 + done-guard 회귀 8건 포함).
- 수동: active task 있는 현재 repo → breadcrumb 출력 확인.
- 수동: active 없는 fixture → 재개 줄 없이 "새 task / task 없이 진행" nudge 출력 확인.

**한계 (의도된):** nudge지 hard gate 아님. inject(non-block)라 Claude가 따라야 동작.
첫 작업 프롬프트를 실제로 놓치면 UserPromptSubmit per-prompt(B안)로 승격 — 지금은 YAGNI.

## 후속 (2026-06-17, 0.9.0 릴리스 후)

- **라이브 스모크 통과 ✅:** 0.9.0 릴리스 후 세션을 재개하니 SessionStart 훅이
  `[harness] 활성 task: chad/session-task-gate — …plan.md 확인.` breadcrumb을 실제로
  context에 주입함을 육안 확인. advisor가 짚었던 end-to-end 수용 테스트 통과 — 기능 실재 확정.
- **migrate 업그레이드 경로 추가 (Task 7):** 사용자 질문("migrate가 0.8→0.9 갱신하나?")에서
  갭 발견 — migrate는 구조 전용이라 hook을 안 건드림. `migrateSessionStartHook` 추가로
  0.9 이전 프로젝트가 migrate로도 task-gate hook을 보강받게 함(템플릿 단일 소스 + deepMergeJson, 멱등).
  CHANGELOG `[Unreleased]` 기록 — 0.9.0 이후 변경이라 다음 릴리스 대상.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### advisor 완료 리뷰 (2026-06-17)
- **#1 BLOCKING — SessionStart stdout→context 계약**: 훅이 plain stdout을 주입한다고 가정.
  만약 CC가 JSON `additionalContext`만 인정하면 기능이 silent no-op이 될 위험.
  → **조치/해소**: claude-code-guide가 공식 문서로 확인 — SessionStart는 plain stdout을
  context로 주입(전용 기능). 기능 실재 확인. (JSON 봉투는 선택)
- **#2 SCOPE — apply가 기존 settings.json에 훅을 배포하나**: 비파괴 apply가 새 훅을 누락할 우려.
  → **해소**: `harness.mjs:74` + `merge.deepMergeJson`이 `hooks` 객체를 재귀 deep-merge →
  기존 PreToolUse/PostToolUse 옆에 SessionStart 키 추가됨. templates 경로도 live.
- **minor — `<system-reminder>` 리터럴 태그가 harness 주입 framing을 가짜로 흉내**:
  → **조치**: 평문+firm 문구로 교체(커밋 1c5f3aa).
- **남은 후속 (비블로킹)**:
  - **end-to-end 수용 테스트**: 단위 89/89는 *문자열 빌더 동작*만 증명. 실제 주입은
    **새 세션을 이 repo에서 열어 breadcrumb이 뜨는지** 눈으로 확인해야 함(다음 세션 스모크).
  - **doctor.mjs**: 새 SessionStart 훅 존재를 점검하지 않음(무결성 갭) — 후속 task 후보.
  - **nudge 강도**: inject(non-block)라 단호해야 행동이 바뀜. 실제로 놓치면 (B)
    UserPromptSubmit per-prompt 승격.


## Learnings

- **dogfooding 즉시 검증**: `harness-team task`로 task를 만들면 `active.json`이 세팅되어,
  이 repo의 task-gate가 곧장 "활성 task 있음" 경로를 실증한다. 기능이 자기 자신을 검증.
- **"미완"의 단일 정의**: done-guard와 task-gate가 같은 `^\s*- \[ \]` 규칙을 쓰므로
  `planHasOpenBoxes`로 추출 — 규칙이 갈라지지 않게 SSOT화.


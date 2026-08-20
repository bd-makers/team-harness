# d5-parallel-pr-scope — Spec

## 목적 / 요구사항

AGENTS.md의 D4(2026-07-28)는 "Claude·OpenCode는 동시에 병렬로 쓰지 않는다"고만 말하고 **금지 범위를
명시하지 않는다.** 같은 파일의 작업 프로토콜 절(집계 파일 규칙)은 이미 "브랜치를 병렬로 둬도 충돌하지
않는다"고 쓰고 있어 문서 내부에 긴장이 있다. 실제 운용도 PR 머지(#18~#21) 기반이고, AO
오케스트레이터+워커 구조 자체가 격리 워크트리 병렬이다.

요구사항:

1. D4 **바로 다음에** D5(2026-08-20) 결정 노트를 append 한다. D4는 수정·삭제·덮어쓰기 금지 —
   날짜 붙은 결정을 쌓는 것이 이 파일의 설계 의도다(D4도 D2를 지우지 않고 정정했다).
2. D5의 요지:
   - 단일 스레드 쓰기 규칙의 범위 = **같은 워킹트리/브랜치 내 동시 쓰기 금지**.
   - 격리된 브랜치·git worktree에서 각자 작업하고 **PR/MR로 병합**하는 것은 허용·권장 병렬 경로.
   - D4를 뒤집는 것이 아니라 **범위를 정정**한다 (D4의 "OpenCode는 순차 전환 세션" 규정은
     같은 워킹트리 기준으로 유지).
   - 이때도 유지되는 제약: task SSOT 4파일은 각 task 디렉터리에 격리되고, `docs/task_summary.md`·
     `docs/<user>/<user>-task.md`는 생성물이라 기본 브랜치에서 `summary --write`로만 갱신한다.
   - 근거 한 줄: 격리 작업공간 + 리뷰 게이트를 통한 병합은 병렬 쓰기의 상충 위험을 제거하면서
     병렬성을 얻는 표준 방식이다.
3. 문체는 기존 D2/D4와 동일 (한국어, blockquote, 굵은 강조).
4. **쌍 편집**: `AGENTS.md` ↔ `templates/AGENTS.md.hbs`를 동일하게 고친다.
   `CLAUDE.md:27` ↔ `templates/CLAUDE.md.hbs:27`의 "병렬 작성·결정 에이전트는 두지 않는다" 불릿이
   D4를 참조하므로 오해가 남지 않도록 손볼지 판단하고, 손본다면 역시 양쪽 모두.
5. `CHANGELOG.md` `[Unreleased]`에 항목 추가. **버전 범프 금지.**

비-요구사항(명시적 범위 밖): `src/` 코드 변경, 릴리스, 버전 범프, main 직접 푸시, PR 머지.

## 설계 / 접근

- 편집 대상 4파일: `AGENTS.md`, `templates/AGENTS.md.hbs`, `CLAUDE.md`, `templates/CLAUDE.md.hbs`
  (+ `CHANGELOG.md`).
- 루트 파일과 템플릿의 `harness:section` 관리 절은 `tests/agent-files.test.mjs`의 드리프트 테스트가
  **문자 단위로 대조**한다(`extractSections(render(template)) === extractSections(rootFile)`).
  따라서 두 쌍은 같은 텍스트여야 한다.
- 기존 테스트가 고정한 문자열(회귀 가드)은 반드시 살아남아야 한다:
  - `AGENTS.md.hbs`: `**D2 (2026-06-11)`, `**D4 (2026-07-28)`, `동시에 병렬로 쓰지 않는다`
  - `AGENTS.md.hbs` 역할 표 행(`| **…`)에는 `병렬`이라는 낱말이 등장하면 안 된다
    → D5는 blockquote이므로 역할 표 행 파서(`/^\|\s*\*\*/`)에 걸리지 않는다.
  - `CLAUDE.md.hbs`: `병렬 작성·결정 에이전트는 두지 않는다`, `쓰기는 단일 스레드로 유지한다`,
    `컨텍스트 격리 서브에이전트` 유지 / `병렬 분석은 서브에이전트에게 위임` 회귀 금지
    → CLAUDE 불릿은 **문구를 덧붙이는 방식**으로만 손본다(고정 문자열 보존).
- 검증: `npm run test` 전체(unit + e2e + perf) 실행 후 실제 출력으로 보고.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **단일 스레드 쓰기(single-threaded write)**: 하나의 워킹트리/브랜치에 대해 같은 시점에 쓰기를
  수행하는 에이전트 세션이 하나뿐인 상태. 프로세스 개수가 아니라 **쓰기 대상 공유 여부**로 정의된다.
- **격리 병렬(isolated parallelism)**: 각 에이전트가 자기 브랜치 또는 git worktree에서 작업해 쓰기
  대상이 겹치지 않는 상태. 통합은 PR/MR 리뷰 게이트에서만 일어난다.
- **결정 노트(D-note)**: `AGENTS.md` roles 절에 날짜와 함께 append 되는 blockquote. 과거 항목을
  수정하지 않고 뒤 항목이 앞 항목을 정정·보완한다(append-only ledger).
- **범위 정정(scope correction) vs 반전(reversal)**: 정정은 기존 규칙의 적용 경계를 명시할 뿐
  규칙 자체를 유지한다. D5는 정정이며 D4를 무효화하지 않는다.
- **생성물(derived file)**: `docs/task_summary.md`, `docs/<user>/<user>-task.md`. 브랜치에서
  갱신하지 않고 기본 브랜치의 `summary --write`로만 렌더한다.

**게이트 통과 근거:** 요구사항·금지사항·검증 명령(`npm run test`)이 모두 명시됐고 영향 파일 5개가
식별되어 자가진단 5/5 체크 — 진입 가능.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — D4 아래에 D5(2026-08-20) 결정 노트를 append 해 단일 스레드 쓰기 규칙의
  범위를 "같은 워킹트리 내"로 명시하고, 격리 브랜치/worktree + PR 병합을 허용 경로로 규정한다.
- [x] **Constraint 명확도** (30%) — 문서 전용(`src/` 금지), D4 수정 금지, 쌍 편집 필수,
  버전 범프·릴리스·main 푸시·`--help` 실행 금지.
- [x] **Success 기준** (30%) — `npm run test` 전체 통과(실제 출력 근거) + main 대상 PR 오픈(머지 금지).
- [x] **Context 명확도** (brownfield 한정) — 영향 파일 5개 식별: `AGENTS.md`,
  `templates/AGENTS.md.hbs`, `CLAUDE.md`, `templates/CLAUDE.md.hbs`, `CHANGELOG.md`.
  가드 테스트 2개 식별: `tests/agent-files.test.mjs`, `tests/e2e/ssot-consistency.test.mjs`.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 = 1.0

## 참고
- `AGENTS.md` roles 절 D2/D4 blockquote
- `AGENTS.md` 작업 프로토콜 — 집계 파일은 생성물, 브랜치 병렬 무충돌 규정
- `tests/agent-files.test.mjs` — 템플릿↔루트 드리프트 및 D2/D4 회귀 가드
- `tests/e2e/ssot-consistency.test.mjs` — AGENTS.md가 SSOT 마커 보유, thin 파일은 @import

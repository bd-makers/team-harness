---
tags:
  - project
  - ai
  - obsidian
created: 2026-06-02
modified: 2026-08-07
---

# Changelog

<!--
  유지 방법:
  - 새 변경은 ## [Unreleased] 아래에 추가하세요.
  - 릴리스 시 Unreleased 항목을 새 버전 헤딩(## [X.Y.Z] - YYYY-MM-DD)으로 이동하세요.
  - 형식: Keep a Changelog (https://keepachangelog.com/ko/1.0.0/)
-->

## [Unreleased]

### Added
- **Codex SessionStart 훅 템플릿** — `templates/.codex/hooks.json`을 신설해 `apply`/`init`이 대상 프로젝트에 설치한다. Claude 쪽 `.claude/settings.json`과 동일하게 `harness-team session-context`를 호출하므로 Codex 세션도 활성 task의 Context Card를 주입받는다. 훅은 Codex 세션의 cwd에서 실행되므로 `--target "$(git rev-parse --show-toplevel || pwd)"`로 저장소 루트를 직접 해석한다 — 하위 디렉터리에서 Codex를 띄워도 "활성 task 없음"으로 오보하지 않는다. `.claude/settings.json`·`.opencode/opencode.json`과 같은 JSON deep-merge 레인을 쓰므로 이미 자기 Codex 훅을 작성한 프로젝트도 harness 그룹을 추가로 얻는다(사용자 훅 보존, 재적용 멱등). `doctor`는 파일 존재·JSON 유효성만이 아니라 **harness SessionStart 훅이 실제로 들어 있는지**까지 확인한다 — 손으로 편집해 harness 그룹이 빠진 파일은 유효한 JSON이라 파싱 검사만으로는 healthy로 보이지만, 그 상태가 곧 Codex 세션이 조용히 task context를 잃는 드리프트다. apply 스모크가 3개 스택 전부에서 생성을 어써션한다.
- **`.codex`를 백업 아키텍처 관리 대상에 포함** — `backup`/`clone`/`symlink`/`delete`/`upgrade`의 item 목록(JS 5곳 + shell 템플릿 3곳)과 AI gitignore 항목에 `.codex`가 빠져 있었다. 그대로면 `backup` 시 `.codex`만 프로젝트에 실물로 남고 `delete` 시 잔재가 남는다.

### Changed
- **규칙 표면의 비대칭 명시** — README 강제력 표에 `경로 스코프 규칙` 열을 추가하고, `.claude/rules`가 팀 전체 규칙이 아니라는 경고를 넣었다. 경로 스코프 규칙을 읽는 건 Claude Code(+미러를 받는 Cursor)뿐이고 Codex·Gemini·OpenCode는 `.claude/`를 보지 않는다 — 리뷰어(Codex)가 모르는 기준으로 리뷰하는 상황을 막으려면 리뷰 기준은 `AGENTS.md`에 있어야 한다.
- **강제력 비대칭 표 정정** — README의 `Codex | hooks 0`은 0.11.0 probe 기준이라 낡았다. Codex CLI 0.147.0은 프로젝트 로컬 `.codex/hooks.json`을 지원한다(`~/.codex/config.toml` `[hooks.state]`에 신뢰 등록 확인). 훅이 Claude Code 전용 메커니즘이라는 설명을 걷어내고, 훅 표면과 커맨드 표면을 분리해 기술했다 — 슬래시 커맨드는 여전히 Claude Code 전용이고 Codex 스킬은 `.codex-plugin` 별도 설치가 필요하다.

### Fixed
- **Cursor 규칙 미러가 경로 스코프를 파괴하던 문제** — `.claude/rules/*.md`의 `paths:` frontmatter는 Claude Code가 매칭 파일을 읽을 때만 로드하라는 선언인데, 미러는 이를 무시하고 `alwaysApply: true`를 붙인 뒤 원본 frontmatter를 본문에 그대로 남겼다. 결과적으로 Cursor에서는 좁혀 둔 규칙이 항상 로드되고 죽은 frontmatter가 리터럴 텍스트로 남았다. 이제 `paths:` → Cursor `globs:`(auto-attach, `alwaysApply: false`)로 번역하고 원본 frontmatter는 소비한다. `paths:`가 없는 규칙만 `alwaysApply: true`로 유지한다.
- **`globs:` 값이 YAML로 파싱되지 않던 경우** — `**/*.ts`·`[id].tsx`처럼 YAML indicator로 시작하는 glob이 첫 항목이면 생성된 Cursor frontmatter가 통째로 파싱 불가였다(`**`는 alias, `[`는 flow sequence로 읽힌다). 현 템플릿 4개는 전부 `src/`·`app/` 선행이라 우연히 통과하고 있었다. 이제 indicator로 시작할 때만 작은따옴표로 감싼다 — 일반 케이스는 Cursor 문서의 평문 형태를 그대로 유지한다.
- **하위 디렉터리 규칙이 Cursor에 누락되던 문제** — 미러가 최상위 `readdir` 하나만 돌아 `.claude/rules/frontend/styling.md` 같은 규칙을 건너뛰었다. Claude Code는 `.claude/rules/**/*.md`를 재귀 탐색하므로, 규칙을 폴더로 정리한 프로젝트는 Claude에는 있고 Cursor에는 없는 규칙이 조용히 생긴다. 이제 재귀 탐색으로 구조를 보존해 미러하고(`frontend/styling.md` → `.cursor/rules/frontend/styling.mdc`), 공유 규칙 심볼릭 링크도 따라가되 realpath 집합으로 순환을 차단한다.
- **Codex 스킬 커맨드 안내 공백** — `skills/harness-team/SKILL.md`의 커맨드 목록에 에이전트가 직접 호출해야 하는 `context init|check`(0.13)와 `release`(0.12)가 빠져 있었다. Codex는 이 스킬이 유일한 진입점이라 안내 공백이 곧 기능 공백이다. 훅·하네스가 호출하는 `session-context`·`boundary check`는 직접 호출 금지로 명시했다.

## [0.14.0] - 2026-08-08

### Added
- **Codex 외부 리뷰 커맨드** — `/harness-codex-review`와 적대적 변형 `/harness-codex-adversarial-review`를 추가했다. 두 커맨드는 `codex exec --sandbox read-only`를 직접 실행하고 인수(`--base <ref>`·focus)를 해석하며, base가 없으면 `origin/main` → `main`으로 물러난다. 커맨드가 절차 SSOT이고 동명의 스킬이 Codex 표면 래퍼다. openai-codex 플러그인의 `/codex:review`류는 `disable-model-invocation`이라 모델이 호출할 수 없어, 타 플러그인 내부가 아닌 CLI 계약에만 의존하도록 하네스가 절차를 소유한다. (#19)
- **복구 명령 회귀 테스트** — npm 공개 저장소를 가리키는 설치 형태(`npm i`/`install`, `-g`/`--global`, 따옴표 유무)가 `doctor` 출력과 README 어디에도 없음을 어써션한다. plugin-dev 저장소의 n/a skip 분기와 실제 bin `--help` 검증도 함께 고정했다. mutation 4건이 전부 실패로 잡히는 것을 확인했다. (#18)

### Fixed
- **`checkHookCli` 타임아웃 정합** — 같은 작업(node spawn)을 하는 `checkSelfCli`와 동일하게 5초로 맞췄다. 짧은 예산은 느린 머신의 spawn을 "훅이 실행되지 않음"으로 오보할 수 있다. (#18)

## [0.13.0] - 2026-08-07

### Added
- **task 활성화 평문 다음 단계 안내** — `harness-team task <name>`으로 task를 새로 만들거나 재활성화할 때, 평문 출력이 spec 작성부터 done까지 이어지는 다음 단계를 안내한다. 재활성화 시에는 plan의 현재 단계 힌트도 함께 보여준다. `--json` 스키마는 변경하지 않는다.
- **doctor 훅 CLI 실행 가능성 검사** — `harness-team doctor`가 PATH의 `harness-team`이 실제로 실행되며 `session-context`/`handoff`를 지원하는지 확인하고, 실패하면 전역 CLI를 다시 링크하라는 복구 안내를 낸다. 플러그인 소스 저장소 자신은 이 검사를 n/a로 skip한다(소비자 전용 검사이므로).

### Changed
- **README 온보딩 3채널 문서화** — `apply` / Claude Code 플러그인 설치 / 전역 CLI 링크가 서로 독립된 채널임을 표로 명시하고, 이미 하네스가 적용된 저장소를 clone한 팀원이 밟아야 할 복구 절차(플러그인 설치 → 전역 CLI 링크 → `doctor`)를 추가했다.
- **에이전트별 강제력 비대칭 표** — Claude Code(hooks 4종 + 커맨드 19개)와 그 외 에이전트(OpenCode/Gemini/Cursor/Codex, hooks 0)가 받는 강제력 차이를 README에 표로 명시했다. 훅이 Claude Code 전용 메커니즘이라는 구조적 이유를 함께 설명한다.

### Fixed
- **설치 안내 결함** — `npm i -g harness-aijient-team`은 이 패키지가 npm 공개 저장소에 배포되지 않아 404로 실패하던 안내였다. README·`doctor`의 경고 detail·JSON `nextActions`를 모두 `/plugin install`이 만드는 로컬 마켓플레이스 클론 경로(`npm i -g ~/.claude/plugins/marketplaces/harness-aijient-team-marketplace`)를 링크하는 실제 동작 절차로 일치시켰다. npm 공개 배포는 하지 않기로 확정했다.

## [0.12.0] - 2026-08-03

### Added
- **최신 변경 설명 드리프트 가드** — 릴리스 도구가 매니페스트 버전을 bump한 뒤 사람이 최신 변경 설명을 갱신하고 같은 버전의 스냅샷을 남긴다. Node 내장 테스트가 패키지 버전·문서 제목·요약·스냅샷·두 파일의 완전한 일치를 확인해 오래된 최신 문서를 차단한다.
- **Task Context Card 생명주기** — task를 만들 때 현재 작업에 필요한 작은 비-SSOT 카드를 함께 만들고, 세션 시작 시 유효한 카드만 breadcrumb 뒤에 주입한다. 긴 task를 재개할 때 전체 문서를 다시 읽지 않고도 현재 단계와 다음 검색 단서를 복원할 수 있다.
- **컴포넌트·통합 테스트 워크플로우** — `/harness-comptest`와 `/harness-inttest`가 테스트 경계에 맞는 전략, 목킹 규칙, 실패 경로 검증을 안내한다. 단위 테스트가 맡지 않아야 할 UI·프로세스 경계 테스트를 명확히 분리한다.
- **L5 skilltest 하네스** — 에이전트 워크플로우 스킬을 fixture 프로젝트에서 실제로 실행하고, 생성된 테스트와 production source 비파괴 여부까지 채점할 수 있다. CLI·scaffold 테스트가 닿지 못하던 스킬 동작을 검증한다.
- **경계 계약 검증** — task가 선언한 생산자·소비자 JSON Schema를 plan 단계 완료 전에 결정론적으로 대조한다. 응답 래핑, 이름, 케이스 변환처럼 한쪽 명세만 봐서는 놓치는 불일치를 조기에 차단한다.
- **비공개 도구 호출 관측 기록** — Claude 도구 호출의 빈도·시간·결과 크기를 원문 없이 허용목록 메타데이터로 기록한다. 안전한 키를 확보하지 못하면 기록하지 않아 프롬프트·경로·자격증명이 로그로 새지 않는다.
- **agent 파일 드리프트 검사** — 실제 apply 대상 목록을 정본으로 사용해 템플릿의 managed section과 저장소 루트 적용본이 같은지 CI에서 확인한다.

### Changed
- 프로젝트 설명을 런타임 오케스트레이터가 아닌 **설정·상태 하네스**로 정정하고, 쓰기 작업은 단일 스레드로 수행하도록 역할 문서를 일치시켰다. 탐색용 서브에이전트와 순차 드라이버 전환은 그대로 지원한다.
- 아키텍처 개요를 Mermaid 원본·manifest·추적 소스에서 생성하도록 전환했다. 명령과 파일 인벤토리는 각 정본을 가리키므로 문서를 손으로 중복 갱신하지 않는다.
- README와 개요에 복제돼 있던 목록은 최신화하지 않고 정본 포인터로 축소했다. 같은 사실의 사본이 서로 다른 상태로 남는 문제를 제거했다.

### Fixed
- skilltest 채점이 문자열·템플릿·주석 속 가짜 GWT 표식을 코드 구조로 오인하지 않도록 구문 기반으로 바꾸고, 닫히지 않은 문자열이 다음 줄까지 가짜 인용 구간을 만들던 근본 원인을 수정했다. 정상 테스트가 조용히 실패하던 오탐과 이를 위한 우회 계층이 사라졌다.
- failure capsule의 범위를 CommonMark 제목 문법에 맞췄다. 하위 제목은 capsule 안에 남되 제목 자체는 내용 예산으로 세지 않고, fenced code와 들여쓴 코드의 heading 유사 줄은 올바르게 구분한다.

### Removed
- 아무 코드나 문서도 참조하지 않고 실제 시뮬레이션 출력과도 맞지 않던 `harness-sim` 리포트 템플릿을 제거했다.

---

## [0.11.0] - 2026-07-11

### Added
- **`/harness-unittest` 커맨드** (`commands/harness-unittest.md` + `skills/harness-unittest/SKILL.md`) — JS/TS/React/React Native 프로젝트에 Vladimir Khorikov 원칙 기반 단위테스트를 작성하는 에이전트 워크플로우. 기술스택 자동 감지(Vitest/Jest·web/RN·TS·Testing Library·msw) → 스코프 파싱(file/session/feature/folder/project) → Khorikov 4대 기둥(리팩토링 내성 최우선)을 금지/허용 규칙으로 강제 → GWT 구조 → React/RN 특화 규칙 → 위험 기반 커버리지 → 뮤테이션 자가점검 검증. `plugin.json` `commands` + README 커맨드 표 + Codex 래퍼 스킬에 등록.
- Codex 플러그인 어댑터 추가: `.codex-plugin/plugin.json`과 `skills/harness-team`을 통해 같은 레포를 Codex 플러그인으로도 사용할 수 있게 함. Claude Code 플러그인 구조는 유지하고 공통 코어(`bin/`, `src/`, `templates/`, `AGENTS.md`)를 공유.

### Changed
- `harness-team release`와 manifest-sync 테스트가 `.codex-plugin/plugin.json`까지 포함해 4개 매니페스트 버전 일치를 강제하도록 확장.

---

## [0.9.5] - 2026-06-30

### Fixed
- **done-guard: post-commit 훅 handoff 마찰 제거** (`task.mjs`) — `done`의 "커밋되지 않은 변경" 가드가 post-commit 훅이 자동 재생성하는 handoff 2개(`<task>-handoff.md`·`<user>-handoff.md`)를 제외하도록 좁힘. 커밋 직후 훅이 handoff를 더럽혀 `done`이 항상 `--force`를 요구하던 마찰을 해소 — 이제 handoff만 dirty면 통과하고, handoff 외 실제 미커밋 작업이 있을 때만 차단. `parsePorcelainPaths` 헬퍼 추출(상태접두/rename/quotepath 파싱). 훅 amend·재커밋(SHA 변형·무한루프 위험)은 배제하고 가드 측에서 해결. (harness-sim 리포트 2건이 실증한 발견 → playground `done` --force 없이 통과 재확인.)

---

## [0.9.4] - 2026-06-29

### Added
- **harness-sim 커맨드 래퍼** (`commands/harness-sim.md`) — `harness-sim` 스킬의 얇은 슬래시 래퍼. 스킬은 메뉴에 bare name(`harness-sim`)으로 뜨지만, 커맨드는 다른 harness-*와 동일하게 `harness-aijient-team:harness-sim` 프리픽스로 표시된다. 절차 SSOT는 스킬 본문(`skills/harness-sim/SKILL.md`)이며 래퍼는 위임만 한다(복제 없음). `plugin.json` `commands`에 등록.

---

## [0.9.3] - 2026-06-29

### Added
- **harness-sim 시뮬레이션 스킬** (`skills/harness-sim/`) — 영속 playground(`../harness-playground`)의 3개 프로젝트(bare-node/next/rn)에서 *설치된* 하네스 설정을 에이전트가 실제로 굴려 L4(살아있는 세션)를 시뮬레이션하고 날짜 박힌 리포트(`harness-playground/sim-reports/`)를 남긴다. e2e의 휘발성 tmpdir L1·L2·L3 재구현이 아니라 설치된 설정 + 리포트. 격리 브랜치(`harness-sim/<ts>`)·잔재 reclaim·더미 변경(`.sim-scratch`)·사후 무오염 검증(git clean + doctor green). 트리거류(slash/skill/SessionStart nudge)는 시뮬 중 관찰 불가라 `⚠️수동확인`으로 분류(위조 금지). 판정은 기존 `--json` 출력 호출로 요약. bare-node에서 전체 사이클 실검증 — done-guard 3조건(미완 박스·미커밋·artifact 템플릿)과 post-commit 훅이 handoff를 더럽혀 `done`이 항상 미커밋 가드를 발동하는 마찰을 확인.
- **E2E 검증 하네스** (`tests/e2e/`) — 실제 `bin/harness-team.mjs`를 child_process로 spawn해 ephemeral sandbox에 하네스를 적용하고 L1(apply 스모크 + `doctor` green)·L2(task 라이프사이클 + post-commit 훅 handoff 갱신)·L3(AGENTS.md SSOT + CLAUDE/GEMINI `@AGENTS.md` import 일관성)을 bare-node/next/react-native 3스택 매트릭스로 검증. `npm test`에 통합, `test:unit`/`test:e2e` 분리 스크립트 추가. (배포 산출물에는 미포함 — `files`에 `tests` 없음)

---

## [0.9.2] - 2026-06-18

### Added
- **doctor: SessionStart task-gate 점검** (`checkSessionStartHook`) — `.claude/settings.json`에 task-gate hook이 없으면 ⚠️ 경고 + `harness-team apply` 유도(JSON `next_actions` 포함). 소프트 경고라 `fail`/exit code에 가산하지 않음(구버전 프로젝트 CI 비파괴). hook 감지식은 `settingsHasSessionGate`로 추출해 migrate·doctor가 공유. → enforcement 삼각 완성(apply/migrate 추가, doctor 감지).

---

## [0.9.1] - 2026-06-17

### Added
- **migrate: SessionStart task-gate 보강** (`migrateSessionStartHook`) — `migrate`가 `.claude/settings.json`에 SessionStart task-gate hook이 없으면 템플릿(`templates/.claude/settings.json`)을 단일 소스로 읽어 `deepMergeJson`으로 추가. 0.9 이전 프로젝트가 구조 변경 없이 hook만 보강받는 경로(`apply`의 전체 deep-merge 대안). 멱등 — 이미 있으면 `up to date`. (배경: "migrate가 0.8→0.9 갱신하나?" 질문에서 갭 발견.)

---

## [0.9.0] - 2026-06-17

> **세션 시작 task-gate** — "task로 시작" 규율을 강제가 아닌 nudge로 상기. (0.8.0 "선언→강제" 라인의 연장: 활성 task 없이 프롬프트로 작업을 시작하는 우회를 세션 시작 시점에 잡는다.)

### Added
- **SessionStart task-gate:** 세션 시작 시 `harness-team session-context`를 호출하는 `SessionStart` 훅 추가(`templates/.claude/settings.json`). 활성 task가 있으면 plan 확인 breadcrumb을, 없으면 미완 task를 나열해 `AskUserQuestion`(재개 / 새 task / task 없이 진행)을 유도하는 nudge를 context로 주입. block이 아닌 inject — 판단은 Claude. apply의 deep-merge로 기존 harness 프로젝트에도 비파괴 배포.
- **`harness-team session-context` 서브커맨드:** 활성 task 유무에 따라 breadcrumb 또는 nudge를 stdout으로 출력(SessionStart 훅 전용). 재개 후보 = `<name>-plan.md`에 미완 체크박스(`- [ ]`)가 남은 task.

### Changed
- **`planHasOpenBoxes` 공유 헬퍼 추출:** done-guard와 task-gate가 "미완"의 단일 정의(줄 시작 `- [ ]`)를 공유하도록 `task.mjs`에서 추출하고 `readActive`를 export.

### Notes
- 한계(의도됨): nudge는 inject(non-block)라 최종적으로 Claude가 따라야 동작 — hard gate 아님. 첫 작업 프롬프트를 실제로 놓치면 `UserPromptSubmit` per-prompt 게이트(B안)로 승격 예정. doctor의 SessionStart 훅 점검은 후속.

---

## [0.8.0] - 2026-06-15

> 세 축: **P0 — 선언→강제 전환** · **P1 — SSOT 역전(AGENTS.md 오픈 표준)** · **P2 — CLI `--json` 계약**. (배경: 2026-06-10 dogfooding 실증 — 강제되는 scaffold는 100%, 권장되는 process는 채택 ~0%. 0.8.0은 "선언을 강제로 옮긴다".)

### Added
- **P1 — `AGENTS.md` 공유 코어:** 단일 진실의 원천(SSOT)을 `CLAUDE.md`(벤더 master)에서 `AGENTS.md`(Linux Foundation 오픈 표준 · 공유 코어 *실파일*)로 역전. `templates/AGENTS.md.hbs`(코어: principles·stack·roles·protocol) 신설, `CLAUDE.md`/`GEMINI.md`는 `@AGENTS.md`를 import하는 thin 파일로 분리(코어 복제 0). Cursor·OpenCode는 `AGENTS.md`를 네이티브 소비.
- **P0 — `task done` 종결 가드** (`collectDoneIssues`): plan 미완(`- [ ]`)·`artifact.md` 미작성 또는 템플릿 그대로·task 활성화 이후 커밋 0개·미커밋 변경을 감지하면 done을 차단. ("결과를 증명하지 않은 done"을 코드가 거부.)
- **P0 — `doctor` spec-gate:** Ambiguity 자가진단 섹션이 없는 "포인터 껍데기" spec을 감지·경고.
- **P0 — 리뷰 산출물 규약:** task `artifact.md`에 `## Reviews` 섹션 — 기록 없는 리뷰는 "안 한 것"으로 간주. spec 경로 단일화(task 4파일 SSOT·포인터 껍데기 금지)를 protocol에 명문화.
- **P2 — CLI `--json` observation 계약:** drive 4커맨드(`task`/`retro`/`release`/`doctor`)에 opt-in `--json` 통합 엔벨로프(`harness/observation/v1`: `{schema, command, status, summary, next_actions, artifacts, error}`). `doctor`는 per-check `checks:[{label, status, detail}]` 추가. 불변식 `status === 'error' ⟺ error !== null` 전 커맨드 공통. 신규 `src/observation.mjs`(`buildEnvelope`·`emitObservation`). 사람용 출력은 바이트 동일하게 보존(기본). 테스트 71 → 84.
- HTML 문서(`harness-overview`·`harness-workflow-simulation`)를 0.8.0(세 축)으로 갱신.

### Changed
- **결정 기록 (2026-06-11 brainstorming):** **D1** = (C) 단일 소스 → 렌더(`AGENTS.md` 코어 + thin `@import`). **D2** = drive 주체는 Claude·OpenCode, Codex·Gemini는 리뷰어 유지(role 표 명문화). **D3** = 실험 기능(Ambiguity 게이트·페르소나) enforced 승격은 2026-08-말 측정 후 재평가(연기).
- `migrate`에 `migrateToAgentsMd` 경로 추가 — 레거시(`CLAUDE.md` master + alias symlink) → `AGENTS.md` 코어 구조 원스텝 마이그레이션. `CLAUDE.md.bak` 백업, 마커 기반 사용자 텍스트 보존, 멱등.
- `doctor`를 reporter 패턴으로 리팩토링 — 사람용 출력은 바이트 동일하게 유지하며 `checks[]` 누적. `@AGENTS.md` import 마커 검증 + 레거시 alias symlink 감지.
- 플러그인 레포 자기 dogfooding 적용 — `harness-team task` 워크플로우를 실제 운용(강제 갭 상시 노출).

### Fixed
- `harness` write-through 손상 가드 — 레거시 alias symlink 환경에서 `apply`/`init`이 symlink를 따라가 사용자 `CLAUDE.md`를 무경고 덮어쓰던 위험 차단 (리뷰 발견).
- `task done` 종결 가드의 체크박스 탐지 false positive — 산문 속 인라인 `- [ ]` 리터럴을 줄 시작 앵커 regex로 수정 (dogfooding 발견, 회귀 테스트 추가).
- `list`가 `docs/<user>/`가 아닌 디렉토리(`superpowers/` 등)를 task로 오인하던 버그 수정.

### Removed
- alias symlink(`AGENTS.md`/`GEMINI.md`/`.cursorrules` → `CLAUDE.md`) 폐기, orphan이 된 `src/symlink.mjs`(setupSymlinks 제거에 따른 dead code) 제거.

---

## [0.7.3] - 2026-06-02

### Added
- `harness-team migrate`에 **0.6.0 → 0.7.x task 구조 업그레이드** 경로 추가 — 기존 task의 `handoff.md`에 접혀 있던 `## Artifact` 섹션을 별도 `<name>-artifact.md`(4번째 파일)로 분리한다. Artifact 섹션이 없으면 빈 scaffold를 생성. 멱등(이미 artifact.md가 있으면 skip). **spec.md / plan.md는 건드리지 않는다** — Ambiguity·Ontology 섹션을 사후 주입하지 않는다(이미 진입 시점이 지난 task에는 죽은 게이트일 뿐이고, 손으로 쓴 문서를 훼손할 위험이 있음). 신규 task는 생성 시점부터 두 섹션을 포함한다.

---

## [0.7.2] - 2026-06-02

### Changed
- `templates/CLAUDE.md.hbs`: 복잡도 게이트(§5-A) 추가 — 어려운 작업(아키텍처/대규모 리팩토링/보안/동시성, 영향 파일 5개 이상)을 감지하면 멈추고 사용자에게 상위 모델/effort/`/advisor` 사용을 **권유**한다. 모델·effort·advisor 전환은 Claude 권한 밖(사용자/harness 소관)이라 자기실행 지시 대신 "권유"로 설계하고, 기존 레버(플랜 모드·서브에이전트·페르소나)로 라우팅하도록 명시.

---

## [0.7.1] - 2026-06-02

### Fixed
- `harness-team release`가 마켓플레이스 `marketplace.json`을 마켓플레이스 **루트**에 잘못 기록하던 버그 수정 — Claude Code가 실제로 읽는 권위 경로인 `.claude-plugin/marketplace.json`에 동기화하도록 변경 (다른 모든 설치 마켓플레이스와 동일). 0.7.0에서는 루트에 stray 파일이 생기고 `.claude-plugin/marketplace.json`이 stale 상태로 남았음. 회귀 방지 테스트 추가.

---

## [0.7.0] - 2026-06-02

### Added
- spec/plan 템플릿에 4차원 Ambiguity 자가진단 + Ontology 섹션, task 생성 시 `artifact.md` 4번째 파일 scaffold
- 페르소나 3종 슬래시 커맨드: `/harness-interview`(Socratic), `/harness-contrarian`, `/harness-simplifier`
- `/harness-retro` + `harness-team retro` 서브커맨드 — 활성 task의 `artifact.md`에 학습/교정 내용 append (자기개선 루프)
- `/harness-release` + `src/commands/release.mjs` — 3개 매니페스트 동시 bump + 캐시/마켓플레이스/`installed_plugins.json` 동기화 자동화 (휴먼 에러 차단)
- `CHANGELOG.md`(0.4.0~0.6.4 복원) + `MAINTAINING.md`(릴리스 절차 명문화) 도입

### Changed
- `templates/CLAUDE.md.hbs`: Ambiguity 게이트(1-A) 룰 + 페르소나 호출 가이드 추가
- `src/commands/doctor.mjs`: 외부 도구(gh/codex/gemini/opencode/jq) healthcheck + 자체 CLI 실행성 검사 추가 (동시 실행)

---

## [0.6.4] - 2026-05-20

### Fixed
- `harness-symlink` CLI에 `same_tree` 가드 추가 — 실파일과 백업 경로가 동일 트리일 때 `rm -rf` 방지

---

## [0.6.3] - 2026-05-19

### Fixed
- `scripts/`: 백업 및 실파일 보호 — `rm -rf` 제거, 동일 경로 안전 가드 추가

---

## [0.6.2] - 2026-05-19

### Fixed
- `harness-doctor`: `clone/symlink/delete.sh`를 프로젝트 루트에서 점검 (init 직후 doctor 실패 문제 해결)
- `templates/.opencode/opencode.json`: 존재하지 않는 plan/handoff/review skill 참조 제거, fix-bug/new-feature/verify만 노출

### Changed
- README: task 구조 표기를 실제 구현(`docs/<member>/<name>/` 평탄 구조)에 맞춰 정정

---

## [0.6.1] - 2026-05-15

### Fixed
- `harness-init`: `AI_GITIGNORE_ENTRIES`에서 `docs/` 제거 — 팀 공유 문서가 gitignore에 등록되던 버그 수정

---

## [0.6.0] - 2026-05-15

### Added
- `harness-task`: flat path 구조(`docs/<member>/<name>/`) + prefix 파일명 + `handoff` auto 재설계
- `harness-init` / `harness-sync`: username 자동 감지(`git config user.name` → `$USER`) 및 저장
- `harness-init` / `harness-sync`: post-commit hook 자동 설치로 handoff 자동 갱신
- `harness-migrate`: pre-0.6.0 task 구조 → v0.6.0 flat path 마이그레이션 지원
- HTML 문서: harness-overview·workflow-simulation v0.6.0 반영

### Fixed
- `harness-task`: prefix 매칭 버그, regex 이스케이프, plan 체크 분리 수정
- `harness-init`: 미사용 `join` import 제거

### Changed
- `ensureUsername` + `installPostCommitHook`를 공유 모듈로 분리
- 새 task 인터페이스를 `harness-task.md`, skills, `CLAUDE.md.hbs`에 반영

---

## [0.5.1] - 2026-04-28

### Added
- `harness-init` / `harness-apply` / `harness-migrate`: `CLAUDE.md` 마커 외부 커스텀 감지 시 AskUserQuestion으로 이전 여부 확인
- `harness-doctor`: `CLAUDE.md` 미반영 내용 진단 결과 표시

### Changed
- `CLAUDE.md.hbs` 내용 업데이트

---

## [0.5.0] - 2026-04-28

### Added
- `CLAUDE.md.hbs`에 코드 리뷰 기준 내장 — 외부 도구 의존 없이 팀원이 직접 인지 가능

### Changed
- `harness-review` 커맨드 및 review skill 제거 — 인프라 의존성 대비 효용 불명확

---

## [0.4.0] - 2026-04-27

### Added
- `harness-upgrade`: v0.3.x 실제 파일 → v0.4+ symlink 원스텝 전환 커맨드
- `harness-delete`: `--include-real` 플래그로 실제 파일/디렉토리 삭제 지원
- `harness-backup`: `opts.backupDir` override + auto-detect fallback
- `harness-symlink`: `--backup-dir` 플래그 지원

### Fixed
- `harness-clone`: `ctx.flags['backup-dir']` 지원 추가
- `harness-upgrade`: resolved backupDir를 clone에 전달 + clone.sh/delete.sh 삭제 방지
- `harness-delete`: abort 경로에서 savedBackupConfig null 대신 실제 값 반환
- `harness-backup`: parent+name 경로 `resolve()`로 정규화
- 심볼릭 링크 관련 코드 리뷰 이슈 수정 (tilde 확장, loadBackupDir resolve, upgrade ALIAS_ITEMS 감지, symlink-probe 테스트)

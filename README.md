---
tags:
  - project
  - ai
  - obsidian
created: 2026-06-02
modified: 2026-08-28
---

# harness-aijient-team

> **Claude 메인 + Codex · Gemini · Cursor · OpenCode** — 다섯 AI 에이전트의 설정과 상태를 하나의 프로젝트에서 통일하는 멀티에이전트 **설정·상태 하네스** 플러그인.

프로젝트에 통일된 멀티 에이전트 설정을 **새로 scaffold**하거나 **기존 repo에 비파괴적으로 적용**합니다.
`AGENTS.md`(Linux Foundation 오픈 표준)를 공유 코어 단일 진실의 원천(SSOT)으로 삼고, `CLAUDE.md` / `GEMINI.md`는 `@AGENTS.md`를 import하는 얇은 파일로 두어 drift가 없습니다.

> 이 레포를 수정하는 에이전트/메인테이너는 [MAINTAINING.md](./MAINTAINING.md)를 먼저 확인하세요 (릴리스 절차·작업 규칙).

---

## 목차
- [왜 필요한가](#왜-필요한가)
- [빠른 시작](#빠른-시작)
- [사전 준비](#사전-준비)
- [설치](#설치)
- [동반 플러그인 (선택)](#동반-플러그인-선택)
- [명령어 레퍼런스](#명령어-레퍼런스)
- [task 관리 (팀원·기능별)](#task-관리-팀원기능별)
- [스크립트 3종 사용법](#스크립트-3종-사용법)
- [설치 결과물](#설치-결과물)
- [CLAUDE.md 섹션 마커](#claudemd-섹션-마커)
- [문서 (HTML)](#문서-html)
- [개발 / 기여](#개발--기여)
  - [버전 범프 체크리스트](#버전-범프-체크리스트)
- [변경 이력](#변경-이력)

---

## 왜 필요한가

에이전트마다 설정 파일 위치·형식이 다릅니다:

| 에이전트 | 읽는 파일 |
|---|---|
| Claude Code | `CLAUDE.md`, `.claude/` |
| Codex | `AGENTS.md`, `.codex-plugin/`, `skills/` |
| Gemini CLI | `GEMINI.md` |
| Cursor | `AGENTS.md`, `.cursor/rules/*.mdc` |
| OpenCode | `AGENTS.md`, `opencode.json` |

각각 관리하면 동기화 지옥이 됩니다. 이 플러그인은:

- `AGENTS.md`를 공유 코어 실파일(오픈 표준)로 두고 `CLAUDE.md` / `GEMINI.md`는 `@AGENTS.md` import 얇은 파일 (Cursor·OpenCode는 `AGENTS.md` 네이티브 인식)
- `.claude/rules/*.md`를 원본으로 `.cursor/rules/*.mdc`를 자동 미러링 — `paths:`가 있으면 Cursor의 `globs:`(auto-attach)로, 없으면 `alwaysApply: true`로 번역
- `opencode.json`은 `.claude/skills/*/SKILL.md`를 **참조**(복사 아님)
- `.codex-plugin/plugin.json` + `skills/harness-team`으로 Codex에서도 같은 CLI/AGENTS.md 워크플로우를 사용
- Codex/Gemini는 read-only 리뷰어로 Bash를 통해 호출 (first-token 매칭 규칙 준수)
- 작업은 `docs/<member>/<name>/` 구조로 팀원·task별 격리

결과: 규칙·스킬을 한 곳에서 편집하면 모든 에이전트가 같은 내용을 읽고, 팀원이 서로의 작업에 간섭하지 않습니다.

> **예외 — `.claude/rules`는 팀 전체 규칙이 아닙니다.** 경로 스코프 규칙(`paths:` frontmatter)을
> 네이티브로 읽는 건 Claude Code와 미러를 받는 Cursor뿐입니다. Codex·Gemini·OpenCode는 `.claude/`를
> 보지 않으므로, 이들에게도 적용돼야 하는 규칙은 `AGENTS.md`(전역) 또는 하위 디렉터리
> `AGENTS.md`(경로별)에 둬야 합니다. 특히 Codex는 리뷰어 역할이라 — 작성자만 아는 기준으로
> 리뷰하는 상황을 만들지 않으려면 리뷰에 쓰일 기준은 `AGENTS.md`에 있어야 합니다.

**설계 스코프: 설정·상태 하네스이지 런타임 오케스트레이션이 아닙니다.** 지휘자·공유 작업큐·
팬아웃/팬인 같은 런타임 협업 계층은 두지 않습니다 — 이는 누락이 아니라 의도된 설계입니다.
Anthropic·OpenAI·Cognition·12-Factor Agents 등 최근 1차 소스는 병렬로 "쓰는" 에이전트를
상충·신뢰성 위험으로 보고, 단일 스레드 실행 + 얇고 직접 소유한 제어흐름을 권장합니다. 이 플러그인의
드라이버(Claude·OpenCode) → 리뷰어(Codex·Gemini, read-only) 순차 루프는 그 방향과 정합적입니다.
단, 이 원칙이 금지하는 것은 **같은 워킹트리에 동시에 쓰는 것**입니다 — 각자 격리된 브랜치·git
worktree에서 작업하고 PR/MR로 병합하는 병렬 경로는 허용되며 권장됩니다(`docs/decisions.md` D5).
산출물의 품질 판정에는 **별도 컨텍스트의 read-only 검증자**(적대적 검증)를 붙일 수 있습니다 —
검증자는 루브릭(finding 스키마)으로 반박만 하고, 반영은 작성 세션이 재현·판별 후 단일 스레드로
수행합니다(D6, 0.20.0 — 상세는 [루브릭 평가 가이드](docs/harness-rubric-guide.html)).
반면 조사·탐색을 위한 **컨텍스트 격리 서브에이전트**(별도 창에서 조사 후 요약만 반환)는 이 원칙과
무관하게 표준 실무이며 계속 활용합니다 — 자세한 구분은 [`CLAUDE.md` §2](./CLAUDE.md) 참고.
OS/네트워크 격리는 이 플러그인의 스코프 밖입니다 — devcontainer·sandbox 등 운영
환경이 담당할 영역입니다.

---

## 적용과 설치: 독립된 3개 채널

하네스 구성요소는 서로 독립된 다음 세 채널로 도달합니다. 한 채널을 완료해도 다른 채널이 자동으로 완료되지는 않습니다.

| 채널 | 대상/시점 | 제공하는 것 |
|---|---|---|
| `apply` | 프로젝트당 1회 | hooks·rules·AGENTS/CLAUDE/GEMINI·docs 구조·`opencode.json`·`.cursor/rules` |
| Claude Code 플러그인 설치 | 사람·머신마다 | `/harness-*` 슬래시 커맨드 26개 |
| 전역 `harness-team` CLI 링크 | 사람마다 | 터미널과 훅이 호출하는 `harness-team` CLI |

**`apply`만으로는 `/harness-*` 슬래시 커맨드가 설치되지 않습니다.** `apply`는 `commands/*.md` 26개를 프로젝트에 복사하지 않으며, 해당 명령은 Claude Code 플러그인 설치 채널에서 제공됩니다.

이 패키지는 **npm 공개 저장소에 배포되지 않습니다** — 전역 CLI는 `/plugin install`이 만든
로컬 마켓플레이스 클론을 `npm i -g`로 링크해 얻습니다. 이미 하네스가 적용된 저장소를 clone한
팀원은 프로젝트에 다시 `apply`하지 마세요. 먼저 자신의 Claude Code에 플러그인을 설치하고,
자신의 PATH에 CLI를 링크한 뒤 점검합니다.

```bash
/plugin marketplace add https://github.com/bd-makers/team-harness
/plugin install harness-aijient-team
npm i -g "${CLAUDE_PLUGINS_ROOT:-$HOME/.claude/plugins}/marketplaces/harness-aijient-team-marketplace"
cd cloned-project
harness-team doctor
```

에이전트별 강제력은 의도적으로 대칭이 아닙니다.

| 에이전트 | hooks | 커맨드/적용 표면 | 경로 스코프 규칙 |
|---|---|---|---|
| Claude Code | 5개 이벤트 / 스크립트 6종 | 플러그인 설치 시 26개 슬래시 커맨드 | `.claude/rules` `paths:` — 매칭 파일 **Read 시** 로드 |
| Codex | SessionStart 1종 (신뢰 승인 필요) | 슬래시 커맨드는 없고 별도 `.codex-plugin` 설치 시 동명의 스킬 | 없음 — 하위 디렉터리 `AGENTS.md`로 대체 |
| OpenCode | 0 | `new-feature` / `fix-bug` / `verify` 3개 | 없음 |
| Gemini | 0 | `GEMINI.md` 텍스트만 | 없음 |
| Cursor | 0 | `.cursor/rules/*.mdc` 규칙만 | `.mdc` `globs:` — `.claude/rules`에서 미러 |

`apply`는 Claude Code용 `.claude/settings.json` 훅과 Codex용 `.codex/hooks.json` SessionStart 훅을 설치합니다. 둘 다 `harness-team session-context`를 호출해 활성 task의 Context Card를 주입합니다. 나머지 에이전트는 훅 메커니즘이 없어 하네스 규칙이 결정론적 강제가 아니라 규범으로 적용됩니다.

> **Codex 훅은 설치만으로 동작하지 않습니다 — 한 번의 신뢰 승인이 필요합니다.** Codex는 새로 나타난
> 프로젝트 훅을 사용자가 검토·신뢰할 때까지 실행하지 않고, 승인 결과를 `~/.codex/config.toml`
> `[hooks.state]`에 해시로 기록합니다. `apply` 이후 첫 Codex 세션에서 승인하세요. 훅 파일을 수정하면
> 해시가 바뀌어 재승인이 필요합니다 — **하네스 업그레이드 후 재`apply`로 훅 커맨드가 바뀌었을 때도
> 마찬가지입니다.** 또한 `harness-team` CLI가 PATH에 없으면 훅은 조용히 no-op으로
> 넘어갑니다(전역 CLI 링크는 별도 채널 — 위 표 참조).
> `harness-team doctor`가 `.codex/hooks.json`이 존재하는데 harness SessionStart 훅이 없는 상태를
> 경고로 잡아 줍니다.

> 커맨드 표면은 별개입니다 — 슬래시 커맨드(`commands/`)는 Claude Code 전용이고, Codex는 `.codex-plugin`을 따로 설치해야 동명의 스킬(`skills/`)을 받습니다. `apply`가 설치해 주지 않습니다.

---

## 빠른 시작

```bash
# 1. 플러그인 설치 (Claude Code)
/plugin marketplace add https://github.com/bd-makers/team-harness
/plugin install harness-aijient-team

# 2. 프로젝트에 적용
cd my-project
/harness-apply        # 기존 프로젝트면 (비파괴 병합)
# 또는
/harness-init         # 빈 디렉토리면

# 3. 첫 작업 시작
/harness-task user-auth
# → task 파일 계약은 AGENTS.md의 작업 프로토콜 및 templates/docs/README.md 참조
# → .harness/active.json이 이 task를 가리킴

# 4. PR/MR 올리기 직전
/harness-ship         # spec·plan·artifact 최종 갱신 + 준비 완료 보고 (PR 생성은 별도)

# 5. 세션 종료 전
/harness-task done    # 활성 task 완료 처리 (handoff.md 갱신, task_summary 반영)
```

> **task-gate (자동):** 3번을 건너뛰고 그냥 프롬프트로 작업을 시작해도, 세션 시작 시
> `SessionStart` 훅이 활성 task 유무를 감지해 **재개 / 새 task / task 없이 진행** 중 하나를
> 물어봅니다(block이 아닌 nudge — 판단은 Claude). "task로 시작" 규율을 강제가 아니라
> 부드럽게 상기시킵니다.

---

## 사전 준비

**하드 요구사항은 Node.js ≥ 24 하나뿐입니다** (`engines.node`, 런타임 npm 의존성 0개).
나머지는 "있으면 켜지고 없으면 그 기능만 꺼지는" 능력 매트릭스입니다.
`git` 아래 다섯 개는 `harness-team doctor`가 런타임에 유무를 확인해 줍니다.

| 도구 | 없으면 |
|---|---|
| Node.js ≥ 24 | `harness-team` CLI가 실행되지 않음 — 유일한 하드 요구사항 |
| `jq` | Claude Code 훅이 **저정밀 모드**로 판정 — 차단은 유지되지만 정확도가 떨어짐. 다른 넷과 달리 doctor가 `warning`으로 알림 |
| `git` | CLI는 동작하되 post-commit handoff·summary 브랜치 감지·task 전환 diff가 no-op |
| `gh` | `/harness-ship` 이후 **사용자가 직접 여는** PR 단계용 — 하네스 명령은 영향 없음 |
| `codex` | `/harness-review codex`, `/harness-adversarial-review codex`, Codex L5 시뮬레이션 |
| `gemini` | 병렬 외부 리뷰 — 건너뛰되 artifact에 "미실행"을 기록 |
| `opencode` | OpenCode 순차 드라이버 세션 (하네스는 설정 파일을 쓰기만 합니다) |

> **⚠ jq를 먼저 확인하세요.** 없으면 훅이 grep 폴백으로 판정합니다 — 차단 자체는 유지되지만
> JSON 이스케이프를 디코드하지 못해 일부 명령을 놓칠 수 있습니다. 자세한 한계는
> [docs/prerequisites.md §3](./docs/prerequisites.md)에 있습니다.

에이전트별 연동, 실측 근거, 호환성 주의(특히 `mattpocock-skills`의 `writing-for-agents`)는
**[docs/prerequisites.md](./docs/prerequisites.md)** 를 보세요.

---

## 설치

### 방법 A: Claude Code 플러그인 (권장)

```
/plugin marketplace add https://github.com/bd-makers/team-harness
/plugin install harness-aijient-team
```

설치되는 슬래시 명령과 설명은 `commands/*.md` 및 `.claude-plugin/plugin.json`에서 확인합니다.

### 방법 B: Codex 플러그인

이 레포는 Codex 플러그인 manifest도 함께 제공합니다:

- `.codex-plugin/plugin.json` — Codex 플러그인 메타데이터
- `skills/harness-team/SKILL.md` — Codex에서 `harness-team` CLI와 task workflow를 사용하는 진입점
- `skills/harness-codex-sim/SKILL.md` — `codex exec --json` 기반 Codex L5 시뮬레이션 운용 가이드

Codex 쪽 marketplace/설치 위치는 개인·팀 환경에 따라 다릅니다. 로컬 개발 중에는 이 레포를 Codex local plugin source로 등록한 뒤, 새 Codex thread에서 `harness-team` 및 `harness-*` command-equivalent skills가 노출되는지 확인하세요.

주의: Codex 플러그인은 Claude Code의 `.claude-plugin/plugin.json` `commands[]`를 같은 slash command 목록으로 가져오지 않습니다. Codex의 플러그인 표면은 `skills`, apps, MCP 서버이며, 명시 호출은 `/harness-*`가 아니라 `$harness-aijient-team:harness-apply`처럼 `$` skill invocation을 사용합니다. 이 레포는 Claude의 `/harness-*` 명령에 대응하는 `skills/harness-*` 래퍼를 제공하고, 각 wrapper는 `commands/harness-*.md`를 SSOT로 읽습니다. 단, `harness-sim`은 방향이 반대로 — 커맨드가 얇은 래퍼이고 절차 SSOT는 스킬 본문입니다.

Codex headless L5 검증은 먼저 probe로 auth/JSONL 계약을 확인한 뒤 full run을 실행합니다:

```bash
node tests/sim/codex-agentloop.mjs probe
node tests/sim/codex-agentloop.mjs run
```

full run은 throwaway `../harness-playground/.sim-tmp/<TS>/` 안에서 `.git/hooks/post-commit` 설치까지 검증하므로 Codex sandbox를 `danger-full-access`로 올립니다. 실제 프로젝트 디렉토리에는 실행하지 말고, 결과는 `../harness-playground/sim-reports/codex-agentloop-<TS>.md`에서 확인하세요.

### 방법 C: 독립 CLI

이 패키지는 npm 공개 저장소에 배포되지 않습니다. 전역 `harness-team` CLI는 Claude Code
플러그인 설치가 만든 로컬 마켓플레이스 클론을 링크해서 얻습니다:

```bash
npm i -g "${CLAUDE_PLUGINS_ROOT:-$HOME/.claude/plugins}/marketplaces/harness-aijient-team-marketplace"
harness-team --help
```

로컬 개발(이 레포를 직접 clone한 경우):
```bash
git clone <this-repo>
cd harness-aijient-team-plugin
npm link          # 전역에 harness-team 명령 등록 (이 클론 경로를 가리킴)
harness-team --help
```

---

## 동반 플러그인 (선택)

이 마켓플레이스는 하네스가 **소유하지도 번들하지도 않는** 외부 플러그인을 커밋 sha로 **핀을 걸어**
함께 등재합니다. 전부 **선택 사항**입니다 — 설치하지 않아도 하네스는 정상 동작합니다.

| 플러그인 | 무엇을 하나 | 라이선스 | 핀 |
|---|---|---|---|
| `diagram-design` | spec/plan 다이어그램을 자립형 inline SVG HTML로 생성 | MIT © [Cathryn Lavery](https://github.com/cathrynlavery/diagram-design) | `0ab077f` |

```
/plugin marketplace add https://github.com/bd-makers/team-harness
/plugin install diagram-design@harness-aijient-team-marketplace
```

`@<marketplace>`를 붙이는 이유: 같은 이름의 플러그인이 다른 마켓플레이스에도 있으면(업스트림
저장소를 이미 추가해 뒀다면 실제로 그렇습니다) 이름만으로는 **핀이 걸린 이쪽**이 선택된다는 보장이
없습니다.

- **핀은 자동으로 따라가지 않습니다.** 업스트림이 갱신돼도 메인테이너가 sha를 올리기 전까지
  설치본은 바뀌지 않습니다. 올리는 절차와 판단 기준은 `MAINTAINING.md`의 "동반 플러그인" 절에 있습니다.
- **복사(vendoring)하지 않는 이유:** 업스트림이 활발히 갱신되고, 스킬이 `SKILL.md` + `references/` +
  `assets/`로 구성돼 있으며, 브랜드 토큰이 스킬 디렉터리 안에 쓰이기 때문입니다. 사본을 들고 있으면
  리싱크가 영구히 이 저장소의 일이 되고, 사용자의 브랜드 색이 릴리스에 실려 나갑니다.
- **하네스 안에서의 호출:** 다이어그램은 `/harness-diagram`으로 실행합니다. 상류 스킬을 직접
  부르면 산출물 경로·자립형 inline SVG 제약·artifact 기록 같은 하네스 규약이 적용되지 않으므로,
  하네스는 어댑터 커맨드로 그 규약을 주입합니다(`commands/harness-diagram.md`).
- **없을 때의 동작:** 다이어그램 단계는 옵트인이고 `probe → degrade → record` 계약을 따릅니다.
  도구가 없으면 실패시키지 않고 건너뛴 뒤 활성 task의 artifact에 미실행 사실을 한 줄 남깁니다.

---

## 명령어 레퍼런스

아래는 전체 목록이 아니라 자주 쓰는 명령만 다루는 부분 안내입니다 — 등록된 전체 명령은 `commands/*.md` 및 `.claude-plugin/plugin.json`이 정본입니다.

### `/harness-init` — 신규 scaffold

빈 디렉토리 또는 이미 `package.json`만 있는 프로젝트에 전체 하네스 설치.

```bash
/harness-init                          # 스택 자동 탐지
/harness-init --stack next             # 명시적 지정
/harness-init --yes                    # 비대화식 (diff 확인 건너뜀)
```

스택 옵션: `react-native` | `react` | `next` | `node` | `python` | `generic`

### `/harness-apply` — 기존 프로젝트에 비파괴 적용

기존 `CLAUDE.md`, `.claude/settings.json` 등이 있는 repo에 하네스를 **안전하게** 추가합니다.

동작:
1. 기존 파일 탐지 & 파싱
2. HTML 주석 마커(`<!-- harness:section="..." -->`) 섹션만 교체/추가
3. JSON은 deep-merge (배열은 union, 중복 제거)
4. hooks/rules는 덮지 않고 건너뜀
5. Diff를 보여주고 `[y/N]` 확인 → 승인 시 적용

```bash
/harness-apply                  # 대화식 (diff 확인 후 승인)
/harness-apply --yes            # 비대화식 (CI에서 사용)
```

### `/harness-sync` — 내부 정합성 동기화

`.cursor/rules` 미러를 재생성. rules를 수정했을 때 실행. (에이전트 파일은 실파일이라 symlink 재생성 없음 — `AGENTS.md`/`CLAUDE.md`/`GEMINI.md` 갱신은 `apply`.)

```bash
/harness-sync
```

수행:
- `.claude/rules/*.md` → `.cursor/rules/*.mdc` 미러링 갱신

> ⚠️ `symlink.sh` 와는 **다른 기능**입니다. 아래 [스크립트 3종](#스크립트-3종-사용법) 참조.

### `/harness-doctor` — 무결성 점검

symlink · JSON 유효성 · 실행 권한 · 외부 도구 존재 여부 체크.

```bash
/harness-doctor
```

문제가 있으면 exit 1 + 문제 항목 리포트.

출력 예시 (외부 도구 + 자체 CLI + consumer hook CLI 섹션):

```
external tools:
✓ gh (GitHub CLI)
- codex (Codex CLI)  (not found, optional)
✓ gemini (Gemini CLI)
- opencode (OpenCode CLI)  (not found, optional)
✓ jq (JSON processor)
✓ harness-team CLI  (--help OK)
✓ SessionStart/post-commit hook CLI  (session-context/handoff supported)

All checks passed.
```

심볼: `✓` 정상, `✗` 실패(exit 1), `-` 선택 항목 없음(정상).
소비자 프로젝트에서는 PATH의 `harness-team`이 `session-context`와 `handoff`를 지원하는지도 경고로 점검합니다. 플러그인 소스 저장소는 소비자 훅을 설치하지 않으므로 이 항목이 n/a로 건너뛰어집니다.

### `/harness-spec` — spec 초안 생성 (writer)

활성 task의 `<name>-spec.md` 초안을 3소스에서 생성합니다 — Confluence(PRD·spec·policy),
Figma(wireframe·design-spec), task 이름 기반 인터뷰. 프로젝트별 소스 기본 위치는 첫 실행 시
입력받아 `.harness/config.json`의 `specSources`에 저장하며, MCP 미연결 환경에서는 본문
붙여넣기 폴백으로 동작합니다. 검증(validator)은 `/harness-interview`가 담당합니다.

### `/harness-task` — task 관리

아래 [task 관리](#task-관리-팀원기능별) 섹션 참조.

### `/harness-ship` — PR/MR 직전 최종 갱신

활성 task의 spec·plan·artifact를 코드 현실과 맞춘 뒤 **PR/MR 준비 완료 상태를 보고**합니다.
다이어그램 갱신·생성은 실행 시점에 한 번 묻는 **옵트인**이며, `diagram-design` 스킬이 없는
머신에서는 실패하지 않고 건너뛴 뒤 artifact에 '미실행'으로 기록합니다.

```bash
/harness-ship
/harness-ship --base origin/develop   # diff 기준 ref 지정
/harness-ship --no-diagram            # 다이어그램 질문 없이 건너뛰기
```

**PR/MR을 만들지 않습니다** — 준비 완료 보고에서 멈추고 생성·푸시는 사용자 지시로 진행합니다.
`harness-team done`(task 완료 처리)을 대체하지도, 실행하지도 않습니다.

### `/harness-review` · `/harness-adversarial-review` — 외부 read-only 리뷰

엔진 중립 외부 리뷰입니다. 첫 토큰이 엔진(`codex`·`claude`·`gemini`·`custom`)이면 그 엔진으로,
없으면 probe 폴백 체인(codex → gemini → claude)으로 실행합니다. 결과는 활성 task의 artifact
`## Reviews`에 날짜·엔진과 함께 기록되고, 기록 끝의 기계 판독용 마커
(`<!-- harness:review kind=... -->`)가 `harness-team done` 가드의 `review`·`verify` 증거가 됩니다.

```bash
/harness-review                              # 엔진 자동 (codex → gemini → claude)
/harness-review claude --base origin/develop # claude-only 머신, 브랜치 리뷰
/harness-adversarial-review codex            # 설계·가정에 반박을 시도하는 적대적 프레이밍
```

D6 검증 프레이밍(테스트 3형제의 testcritic, ship 7단계의 shipcheck, 페르소나 외부 엔진 모드의
contrarian·simplifier)은 이 명령의 절차·엔진 표를 재사용하며 `kind=<engine>-<프레이밍>` 접미사로
구분됩니다 — 루브릭·마커 계약·증거 게이트의 전체 그림은
[docs/harness-rubric-guide.html](docs/harness-rubric-guide.html)에 있습니다.

### `/harness-clone` — project → backup dir 동기화

프로젝트 파일을 백업 디렉토리로 복사(merge, newer-wins). 이미 harness symlink인 항목은 건너뜁니다.

```bash
/harness-clone
/harness-clone --backup-dir ~/my-backups/project-a
```

### `/harness-symlink` — backup dir → project symlink 생성

백업 디렉토리의 harness 아티팩트를 프로젝트 루트로 symlink합니다.

```bash
/harness-symlink
/harness-symlink --backup-dir ~/my-backups/project-a
```

### `/harness-delete` — harness symlink/파일 제거

프로젝트 루트에서 harness 항목을 제거합니다.

```bash
/harness-delete                      # symlink만 제거 (기본)
/harness-delete --include-real       # 실제 파일/디렉토리도 삭제 (구버전 마이그레이션용)
/harness-delete --yes                # 비대화식
```

`--include-real`은 구버전(파일이 symlink가 아닌 실제 파일로 존재)에서 신버전으로 전환할 때 사용합니다.

### `/harness-migrate` — v0.2.x → v0.3+ 스크립트 위치 이전

v0.2.x에서 backup dir에 있던 `clone.sh`, `symlink.sh`, `delete.sh`를 프로젝트 루트로 이전합니다.

```bash
/harness-migrate
```

> migrate는 **구조 마이그레이션**도 함께 수행합니다 — task 디렉토리 레이아웃(→0.6/0.7),
> 레거시 `CLAUDE.md` → `AGENTS.md` 코어, 그리고 `settings.json`에 **SessionStart task-gate
> hook**이나 **PreToolUse boundary checkpoint hook**이 없으면 추가합니다(0.9+). 단,
> `.claude/settings.json`이 없거나 JSON으로 파싱되지 않으면 해당 hook은 설치하지 않고 안내만 출력합니다.
> 모두 멱등이라 이미 최신이면 `up to date`로 건너뜁니다.
> (hook은 `apply`의 deep-merge로도 들어옵니다 — migrate는 구조 변경 없이 hook만 보강할 때 유용.)

### `/harness-upgrade` — v0.3.x → v0.4+ 원스텝 전환

실제 파일로 존재하는 harness 아티팩트를 symlink 구조로 일괄 전환합니다.

```bash
/harness-upgrade                            # backup dir 자동 탐지
/harness-upgrade --backup-dir ~/backups/p   # 경로 명시 (tilde 지원)
/harness-upgrade --yes                      # 비대화식
```

내부 동작 순서:
1. backup dir 확인 (없으면 clone 먼저 실행)
2. project → backup 동기화 (`/harness-clone`)
3. 실제 파일/디렉토리 목록 표시 + 확인
4. 실제 항목 삭제 (`.harness/backup.json` 내용 보존)
5. `.harness/backup.json` 복원
6. symlink 생성 (`/harness-symlink`)

---

## task 관리 (팀원·task별)

모든 작업은 팀원별·task별로 격리된 디렉토리에서 관리됩니다.

### 디렉토리 구조

task 디렉토리 구조와 파일 계약은 scaffold 되는 `AGENTS.md`의 **작업 프로토콜** 및 **Task Context Card (TCC)** 섹션이 정본입니다. `task_summary.md`·`<member>-task.md` 같은 docs 트리 인덱스는 `templates/docs/README.md`(설치 시 `docs/README.md`)가 정본입니다. 활성 task 포인터는 `.harness/active.json`에 보관되며, `harness-team context init` / `context check`로 카드를 생성·검사합니다(검사는 카드를 수정하지 않음).

### member 식별 규칙

1. `--member <name>` 플래그 (최우선)
2. `git config user.name` (프로젝트 git 설정)
3. `$USER` / `$USERNAME` 환경변수
4. fallback: `unknown`

공백은 `-`로, 특수문자는 제거됩니다 (예: `Chad Lee` → `Chad-Lee`).

### 명령어

```bash
# 생성 또는 활성화 (동일 이름이 이미 있으면 그 task를 active로 전환)
/harness-task <name>                   # ex: user-auth

# 목록 (* = active)
/harness-task list

# 활성 task 완료 — task_summary.md / <member>-task.md 상태 갱신
/harness-task done

# 활성 task의 handoff.md를 최신 커밋 정보로 갱신 (post-commit hook이 자동 호출)
/harness-task handoff

# spec에 선언한 JSON Schema producer/consumer boundary 대조
harness-team boundary check
```

> `feature/` · `fix/` 같은 중간 카테고리는 사용하지 않는다 — 모든 task는 `docs/<member>/<name>/` 평탄 구조로 관리한다.

### Boundary contracts

API 응답 래핑, `camelCase`/`snake_case`, 필드명처럼 생산자와 소비자 선언을 함께 봐야 하는
불일치는 task spec의 `## Boundary contracts` 바로 아래 JSON fenced block으로 명시합니다.
선언이 없으면 기존 task는 그대로 통과하며, 선언이 있으면 Claude가 plan checkbox를 완료로
바꾸기 직전에 hook이 `harness-team boundary check`를 실행합니다. 이 검사는 LLM이 아니라
local JSON Schema를 읽는 결정론적 CLI입니다.

```json
{
  "version": 1,
  "boundaries": [
    {
      "id": "user-response",
      "producer": { "path": "contracts/server-user.json", "pointer": "/data" },
      "consumer": { "path": "contracts/web-user.json" }
    }
  ]
}
```

V1은 object schema의 `properties`, `required`, 기본 `type`만 비교합니다. consumer가 필수로
읽는 field가 producer에 없거나 producer가 required로 보장하지 않으면 실패합니다. `/data`처럼
schema instance의 object root를 가리키는 pointer와 표준 document pointer(`/properties/data`)를
모두 지원합니다. OpenAPI resolver, TypeScript type parser, runtime schema 실행은 범위 밖입니다.

기존 설치에는 `harness-team apply` 또는 `harness-team migrate`로 이 기능을 추가할 수 있습니다.
`apply`는 settings 템플릿을 deep-merge하고, `migrate`는 구조 마이그레이션과 별도로 위 설정 파일
조건을 만족하는 기존 설치의 hook을 보강합니다. 알려진 기본 protect hook은 한 번만 실행되도록
업그레이드하지만, 커스터마이즈한 hook group/script는 덮어쓰지 않습니다. 커스터마이즈된 group은
그대로 두고 안전한 경우 template boundary group을 추가합니다.

### Done evidence — `done` 가드의 증거 선언

`harness-team done`은 task 판정 창(meta의 `firstActivatedAt` 이후) 안의 증거를 결정론적으로
검사합니다. 요구 수준은 spec의 `## Done evidence` 아래 JSON으로 선언합니다:

```json
{ "version": 1, "review": "required", "verify": "required", "tests": "skip" }
```

- `tests` (기본 `required`) — 소스가 바뀌었으면 테스트 파일 변경도 요구
- `review` (기본 `optional`) — `required`면 판정 창 안의 리뷰 마커를 요구 (kind는 대조하지 않음)
- `verify` (기본 `optional`, 0.20.0) — `required`면 **검증 프레이밍 kind** 마커(`-adversarial` ·
  `-testcritic` · `-shipcheck` · `-contrarian` · `-simplifier` 접미사)만 증거로 인정합니다.
  검증 마커는 review 증거를 겸하지만 역은 성립하지 않습니다.

가드는 마커의 존재·kind·시각만 읽습니다 — finding 내용의 품질 판정은 결정론 게이트 밖이며
별도 컨텍스트의 검증자와 driver의 재현·판별이 담당합니다(D6,
[루브릭 평가 가이드](docs/harness-rubric-guide.html) 참조).

### 실전 예제

```bash
# 팀원 A: 인증 리디자인 시작
$ /harness-task auth-redesign
created: docs/chad/auth-redesign/
active: chad/auth-redesign

# spec.md에 요구사항 작성 (에디터로)
$ vim docs/chad/auth-redesign/auth-redesign-spec.md

# 코드 작성 + plan.md 체크리스트 갱신
# ...

# 세션 종료
$ /harness-task done

# 다음 날 다른 task로 전환 (같은 명령으로 생성 또는 활성화)
$ /harness-task token-refresh-race
$ /harness-task list
  chad/auth-redesign
* chad/token-refresh-race
```

---

## 스크립트 3종 사용법

`harness-team init/apply` 실행 시 **프로젝트 루트에** 설치되는 세 스크립트입니다. 백업 클론 폴더(`BACKUP_DIR`)는 프로젝트와 같은 레벨의 형제 폴더 아래에 위치하며, 그 경로는 생성 시점에 각 스크립트에 박혀 들어갑니다.

### 설치 구조

```
~/work/
  ├── project-a/                  ← 실제 작업 디렉토리 (CWD)
  │   ├── CLAUDE.md
  │   ├── .claude/
  │   ├── clone.sh                ← 스크립트는 프로젝트 루트에 위치
  │   ├── symlink.sh
  │   ├── delete.sh
  │   └── .harness/backup.json    ← 백업 경로 기억
  │
  └── harness-backup/             ← 형제 레벨 상위 폴더 (이름 사용자 지정)
      └── project-a/              ← BACKUP_DIR (clone.sh가 여기에 복사)
```

실제 사용 방식 (프로젝트 루트에서 실행):

```bash
cd ~/work/project-a
./clone.sh     # project-a → BACKUP_DIR 로 병합 복사 (newer-wins, 백업 파일 삭제 없음)
./symlink.sh   # BACKUP_DIR 의 자산을 project-a 로 symlink
./delete.sh    # BACKUP_DIR 을 가리키는 symlink만 제거
```

### 안전 원칙 — 어느 스크립트도 파괴적이지 않음

- **백업 디렉토리는 어떤 스크립트도 삭제하지 않습니다.** 원본 파일들(CLAUDE.md, docs 등)은 항상 보존됩니다.
- **프로젝트 쪽 실파일도 함부로 지우지 않습니다.** symlink만 다룹니다.
- 실파일을 정말 제거하려면 인터랙티브 CLI(`harness-team delete --include-real`)를 사용하세요.

### init 시 설정

`harness-team init` 실행 시 상위 폴더명을 입력받습니다(기본값: `harness-backup`):

```
$ harness-team init
harness-team init → /Users/chad/work/project-a
  stack: react-native (rn)

Backup clone parent folder (sibling of project, holds clone.sh/symlink.sh/delete.sh)? [harness-backup] my-backups
  backup clone dir: /Users/chad/work/my-backups/project-a
...
```

- 입력한 이름대로 `../<입력값>/<프로젝트명>/` 디렉토리가 자동 생성됩니다.
- 경로는 `.harness/backup.json` 에 저장되어 이후 `doctor` 등에서 재사용됩니다.
- 비대화(`--yes`) 실행 시 `--backup-parent=<name>` 으로 지정할 수 있습니다.

### 언제 쓰나?

플러그인만 쓰는 경우 이 스크립트는 **불필요**합니다. 다음과 같은 경우에만 유용:

- 같은 팀이 여러 관련 프로젝트(예: `web-app`, `mobile-app`, `admin`)를 운영
- 프로젝트 스냅샷/백업을 별도 디렉토리로 주기적으로 떠두고 싶음
- 여러 프로젝트가 공통 harness 내용을 공유하고 한쪽의 개선을 다른 쪽으로 역동기화

### `symlink.sh` — BACKUP_DIR → 프로젝트로 심볼릭 링크

**용도**: BACKUP_DIR의 자산을 프로젝트 루트에 symlink로 연결.

링크 대상(ITEMS):
`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.claude`, `.cursor`, `.opencode`, `docs`, `.harness`

**사용 예**:
```bash
cd ~/work/project-a
./symlink.sh
# 출력:
#   linked: CLAUDE.md -> /Users/chad/work/harness-backup/project-a/CLAUDE.md
#   linked: .claude -> /Users/chad/work/harness-backup/project-a/.claude
#   ...
```

**안전장치**:
- 이미 BACKUP_DIR로 링크된 항목은 건너뜀
- 다른 곳을 가리키는 symlink는 즉시 교체 (실파일 손실 없음)
- 프로젝트 쪽 실파일이 있을 때:
  - 백업본과 **byte-identical** 이면 symlink로 교체
  - **다르면 건드리지 않고 skip** — `./clone.sh`로 백업에 병합 후 재실행하라고 안내

### `clone.sh` — 프로젝트 → BACKUP_DIR 병합 복사

**용도**: 프로젝트 현재 내용을 BACKUP_DIR에 **병합 복사**. `rsync -a --update` 기반(newer-wins, **`--delete` 없음**), 백업에만 있는 파일은 보존됩니다.

**사용 예**:
```bash
cd ~/work/project-a
./clone.sh
# 출력:
#   merged dir: .claude -> /Users/chad/work/harness-backup/project-a/.claude
#   copied (newer): CLAUDE.md -> /Users/chad/work/harness-backup/project-a/CLAUDE.md
#   ...
```

### `delete.sh` — 링크 제거 (init의 정반대)

**용도**: `symlink.sh`가 만든 링크만 제거. 백업 디렉토리와 프로젝트의 실파일은 모두 보존합니다.

**사용 예**:
```bash
cd ~/work/project-a
./delete.sh
# 출력:
#   removed: CLAUDE.md (backup symlink)
#   removed: .claude (backup symlink)
#   skip: docs (real file/dir — use 'harness-team delete --include-real' to remove)
```

**안전장치**:
- BACKUP_DIR을 가리키는 symlink만 제거 (`[[ "$target" == "$BACKUP_DIR"* ]]` 체크)
- 다른 곳을 가리키는 symlink는 건드리지 않음
- 실파일/디렉터리는 skip + 안내. 실제로 지우려면 인터랙티브 CLI(`harness-team delete --include-real`) 사용

### `/harness-sync` vs `./symlink.sh` — 한 줄 요약

| | `/harness-sync` | `./symlink.sh` |
|---|---|---|
| 대상 | 같은 프로젝트 내부 (`.cursor/rules` 미러) | 외부 중앙 harness repo |
| 목적 | 플러그인이 설치한 구조의 무결성 유지 | 여러 프로젝트가 하나의 harness를 공유 |
| 주요 작업 | `.cursor/rules` 미러링 (에이전트 파일 갱신은 `apply`) | 중앙의 `AGENTS.md`, `CLAUDE.md`, `.claude`, `docs` 등을 현재 프로젝트로 심볼릭 링크 |
| 언제 | rules 수정 후 | 중앙 harness를 새 프로젝트에 적용할 때 |

---

## 설치 결과물

설치되는 파일과 task 계약은 scaffold 되는 `AGENTS.md`의 **작업 프로토콜** 및 `templates/`를 확인합니다. 개인 상태 파일은 `.harness/active.json`에 보관됩니다. 반면 백업 클론 폴더 경로를 기억하는 `.harness/backup.json`은 팀이 공유하는 설정이므로 commit을 권장합니다.

자동으로 `.gitignore`에 추가되는 항목:
- `.claude/settings.local.json` (개인 권한 오버라이드)
- `.harness/active.json` (개인 활성 task 상태)
- `.harness/observability/` (로컬 도구 관측 로그와 HMAC 키)

Claude Code 도구 관측은 원문을 보존하지 않는 로컬 JSONL만 `.harness/observability/`에 기록합니다.
보존 데이터·권한·회전·정리 정책은 [Hooks 레퍼런스](docs/harness-overview.html#hooks)를 참조하세요.

---

## 에이전트 파일 섹션 마커

하네스는 HTML 주석 마커로 관리 영역을 구분하며, 각 파일을 독립적으로 마커-머지합니다:

```markdown
<!-- harness:section="roles" begin -->
## AI 팀 역할 분담
...(apply 시 이 블록만 갱신)...
<!-- harness:section="roles" end -->

<!-- harness:user:begin -->
이 아래 사용자 내용은 harness가 절대 수정하지 않음.
<!-- harness:user:end -->
```

관리되는 섹션:
- `AGENTS.md` (공유 코어): `principles`, `stack`, `roles`, `protocol`
- `CLAUDE.md` (얇음): 최상단 `@AGENTS.md` import + `workflow`
- `GEMINI.md` (얇음): 최상단 `@AGENTS.md` import + `reviewer`

이 섹션들을 직접 수정해도 `/harness-apply` 재실행 시 템플릿으로 덮어쓰여집니다.
영구 커스터마이즈는 `<!-- harness:user -->` 블록 또는 마커 밖에 작성하세요.

---

## 문서 (HTML)

아키텍처·워크플로우를 시각적으로 확인할 수 있는 HTML 문서입니다.  
로컬 클론 후 브라우저에서 바로 열 수 있습니다.

| 문서 | 설명 |
|---|---|
| [index.html](docs/index.html) | docs 전체 색인 — 가이드·릴리스 노트·버전별 스냅샷 |
| [harness-overview.html](docs/harness-overview.html) | 플러그인 전체 아키텍처 다이어그램 — 에이전트 연결, symlink 구조, 명령 흐름. 소스 변경 뒤 `npm run docs:generate`로 갱신하는 생성 산출물 |
| [harness-task-guide.html](docs/harness-task-guide.html) | init 이후 개발자용 — 첫 task를 만들어 닫을 때까지의 실제 절차 |
| [harness-fleet-guide.html](docs/harness-fleet-guide.html) | 여러 명·여러 워크트리로 나눠 쓰는 상황(D5 격리 병렬) 가이드 |
| [harness-rubric-guide.html](docs/harness-rubric-guide.html) | 루브릭 평가(D6) 가이드 — finding 스키마, 5개 검증 프레이밍, 마커 계약과 `verify` 증거 게이트 |
| [harness-workflow-simulation.html](docs/harness-workflow-simulation.html) | task 워크플로우 시나리오 시뮬레이션 — new → done 흐름 단계별 인터랙티브 |
| [what-changes-latest-version.html](docs/what-changes-latest-version.html) | 최신 릴리스의 변경 내용과 그 근거 |

```bash
open docs/index.html
open docs/harness-overview.html
open docs/harness-rubric-guide.html
open docs/what-changes-latest-version.html
```

---

## 개발 / 기여

```bash
git clone <this-repo>
cd harness-aijient-team-plugin

# 로컬 테스트
rm -rf /tmp/test && mkdir /tmp/test && cd /tmp/test
git init && git config user.name "test-user"
node /path/to/plugin/bin/harness-team.mjs init --yes
node /path/to/plugin/bin/harness-team.mjs task demo
node /path/to/plugin/bin/harness-team.mjs doctor
```

### 저장소 레이아웃

현재 파일 목록은 저장소 트리가 정본입니다. 명령 등록은 `commands/` 및 `.claude-plugin/plugin.json`, 구현은 `src/`, 설치 산출물은 `templates/`에서 확인합니다.

### 버전 범프 체크리스트

권장 경로는 `harness-team release <minor|patch|major>`입니다(항상 `--dry-run` 먼저) — 매니페스트 버전을 일괄 bump하고 캐시·마켓플레이스·`installed_plugins.json`까지 동기화합니다. 절차는 `MAINTAINING.md`의 **릴리스 절차**가 정본입니다.

아래는 자동화를 쓸 수 없을 때의 수동 절차입니다. 버전을 올릴 때 반드시 **4개 파일** 모두 갱신하고, 로컬 캐시까지 동기화해야 합니다.

```bash
VERSION="0.x.0"

# 1. package.json
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json

# 2. .claude-plugin/plugin.json  (플러그인 메타)
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" .claude-plugin/plugin.json

# 3. .claude-plugin/marketplace.json  ← 자주 누락! /plugin 목록에 표시되는 버전
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" .claude-plugin/marketplace.json

# 4. .codex-plugin/plugin.json  ← Codex 플러그인 목록에 표시되는 버전
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" .codex-plugin/plugin.json

# 5. 커밋
git add package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json .codex-plugin/plugin.json
git commit -m "chore(plugin): plugin.json 버전 $VERSION + 신규 커맨드 추가"
git commit -m "chore(release): 버전 $VERSION으로 범프"  # 또는 한 커밋으로 합치기

# 6. 로컬 플러그인 캐시 동기화
CACHE=~/.claude/plugins/cache/harness-aijient-team-marketplace/harness-aijient-team/$VERSION
mkdir -p "$CACHE"
rsync -a \
  --exclude='.git' --exclude='.claude-plugin' --exclude='docs/superpowers' \
  --exclude='node_modules' --exclude='.harness' \
  ./ "$CACHE/"

# 7. marketplace 경로에도 반영
cp .claude-plugin/marketplace.json \
   ~/.claude/plugins/marketplaces/harness-aijient-team-marketplace/.claude-plugin/marketplace.json
rsync -a \
  --exclude='.git' --exclude='.claude-plugin' --exclude='docs/superpowers' \
  --exclude='node_modules' --exclude='.harness' \
  ./ ~/.claude/plugins/marketplaces/harness-aijient-team-marketplace/
```

**확인 포인트:**

| 파일 | 역할 | 누락 시 증상 |
|---|---|---|
| `package.json` | npm 버전 | `npm info`에서 구버전 |
| `.claude-plugin/plugin.json` | 플러그인 로드 메타 | 슬래시 명령 누락 가능 |
| `.claude-plugin/marketplace.json` | `/plugin` 목록 표시 버전 | **`/plugin`에서 구버전 표시** |
| `.codex-plugin/plugin.json` | Codex 플러그인 로드 메타 | Codex에서 구버전/skill 누락 가능 |
| 로컬 캐시 rsync | 실행 코드 반영 | 새 명령어가 실제 구버전 코드로 실행됨 |

> `/reload-plugins` 후에도 구버전이 보이면 `marketplace.json`의 **자기 항목**(`plugins` 중
> `name`이 `harness-aijient-team`인 항목)의 `version`을 확인합니다. 같은 배열의 동반 플러그인
> 항목은 버전을 갖지 않습니다.

### 요구사항

[사전 준비](#사전-준비) 참조 — 상세는 [docs/prerequisites.md](./docs/prerequisites.md).

---

## 변경 이력

버전별 변경 이력의 정본은 [CHANGELOG.md](./CHANGELOG.md)입니다 (Keep a Changelog 형식).
각 릴리스에서 **무엇이 왜** 바뀌었는지는
[docs/what-changes-latest-version.html](docs/what-changes-latest-version.html)
(최신본)과 `docs/what-changes-<버전>.html` 스냅샷이 사람이 검토한 근거와 함께 설명합니다.

---

## 라이선스

MIT

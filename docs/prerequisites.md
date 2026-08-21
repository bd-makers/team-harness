---
tags:
  - project
  - ai
  - obsidian
created: 2026-08-21
modified: 2026-08-21
---

# 사전 준비 (Prerequisites)

이 하네스는 **설치 목록이 아니라 능력 매트릭스**로 읽어야 합니다.
하드 요구사항은 **Node.js ≥ 18 하나뿐**이고(`package.json`의 `engines.node`, 런타임 npm
의존성 0개 — `dependencies` 없음), 나머지는 전부 **"있으면 켜지고, 없으면 그 기능만 꺼지는"**
선택 도구입니다. 무엇을 설치하느냐가 아니라 **무엇을 안 하면 무엇이 꺼지느냐**를 보세요.

> 이 문서는 **하네스 자체**를 쓰기 위한 준비입니다. `harness-team apply`가 소비자 프로젝트에
> 설치하는 내용이 아닙니다(`templates/`에 들어가지 않습니다).

---

## 1. 하드 요구사항

| 요구 | 확인 | 없으면 |
|---|---|---|
| Node.js ≥ 18 | `node --version` | `harness-team` CLI가 실행되지 않음. 이것 하나뿐입니다. |

런타임 의존성이 0개이므로 `npm install` 없이도 CLI가 동작합니다. `npm install`은 이 저장소를
**개발**할 때(테스트 실행) 필요한 devDependencies용입니다.

---

## 2. 능력 매트릭스 — 외부 도구

아래 표의 도구는 `harness-team doctor`가 검사하는 목록(`src/commands/doctor.mjs`의
`EXTERNAL_TOOLS`)과 **1:1로 일치**합니다. `tests/prerequisites-doc.test.mjs`가 양방향으로
검사하므로 한쪽만 바뀌면 CI가 깨집니다.

<!-- prerequisites:external-tools — tests/prerequisites-doc.test.mjs가 이 블록을
     src/commands/doctor.mjs의 EXTERNAL_TOOLS와 양방향 대조합니다. 마커를 지우지 마세요. -->
| 도구 | 켜지는 기능 | 없으면 |
|---|---|---|
| `jq` | Claude Code 훅의 입력 파싱 | **보안 훅이 조용히 무력화됩니다 — §3 참조.** doctor는 `optional`로 보고하지만 optional이 아닙니다. |
| `gh` | GitHub PR 흐름 | 하네스 명령은 아무것도 깨지지 않습니다. `/harness-ship`은 **PR을 만들지 않고** 준비 완료 보고에서 멈추므로, `gh`는 그 다음에 **사용자가 직접 여는 PR** 단계용입니다. |
| `codex` | `/harness-codex-review`, `/harness-codex-adversarial-review`, Codex L5 시뮬레이션(`tests/sim/codex-agentloop.mjs`) | 위 세 가지를 실행할 수 없습니다. 다른 명령은 영향 없음. |
| `gemini` | 병렬 외부 리뷰 (규범 — 하네스 코드가 호출하지 않습니다) | 리뷰를 건너뛰되 활성 task의 `<name>-artifact.md`에 **"미실행"을 기록**합니다(`commands/harness-codex-review.md`). 기록 없는 미실행은 "안 한 것"입니다. |
| `opencode` | OpenCode 순차 드라이버 세션 (`AGENTS.md` D4) | 하네스는 `.opencode/opencode.json`을 **쓰기만** 합니다 — CLI를 호출하지 않으므로 하네스 동작에는 영향이 없고, 그 세션을 열 수 없을 뿐입니다. |
<!-- /prerequisites:external-tools -->

**중요:** `doctor`는 이 다섯 개를 전부 `not found, optional`로 보고하며 **exit code에 반영하지
않습니다.** 즉 *"doctor가 통과했다"가 "훅이 정상 동작한다"를 뜻하지 않습니다.* jq가 그 예외입니다.

```bash
harness-team doctor          # 도구 유무를 런타임에 확인
```

---

## 3. ⚠ jq는 optional이 아닙니다 — 보안 훅 fail-open

`templates/.claude/hooks/`의 훅 스크립트는 Claude Code가 stdin으로 넘기는 JSON을 `jq -r`로
파싱합니다. **jq가 없으면** `jq: command not found`로 죽고 `TOOL_NAME`/`FILE_PATH`가 빈
문자열이 되어, 훅이 "관여하지 않음" 분기로 빠져 **exit 0(허용)** 합니다.

jq만 제거한 PATH(다른 명령은 정상)로 실측한 결과:

| 훅 | jq 있을 때 | jq 없을 때 | 결과 |
|---|---|---|---|
| `block-dangerous-git.sh` | exit 2 (차단) | **exit 0 (통과)** | `git push --force`가 그대로 실행됩니다 |
| `protect-files.sh` | exit 2 (차단) | **exit 0 (통과)** | `.env` · `.git/` 편집이 그대로 실행됩니다 |
| `pre-commit-check.sh` | typecheck·test 게이트 | **exit 0 (통과)** | commit 전 검증이 조용히 건너뛰어집니다 |
| `auto-format.sh` | 포맷 실행 | exit 0 | 무해 — 포매팅만 안 됩니다 |

**에러 메시지도, doctor의 fail도 없습니다.** 가드가 걸려 있다고 믿는 상태에서 아무것도 막히지
않는 것이 가장 위험한 실패 방식이라, jq는 사실상 필수로 취급하세요.

```bash
command -v jq || echo "jq 없음 — 보안 훅이 fail-open 상태입니다"
# macOS: brew install jq   /   Debian·Ubuntu: apt-get install jq
```

---

## 4. git

git은 **하드 요구사항이 아닙니다.** 없어도 CLI는 실행되지만 아래가 조용히 no-op이 됩니다.

| 기능 | git 없을 때 | 근거 |
|---|---|---|
| 사용자 이름 감지 (`docs/<user>/` 경로) | `$USER` → `unknown`으로 폴백 | `src/member.mjs` `detectMember` |
| post-commit handoff 자동 갱신 | 훅이 설치되지 않음 (`.git/hooks` 없으면 조용히 return) | `src/git-hooks.mjs` `installPostCommitHook` |
| `harness-team handoff`의 커밋 메시지·diff | 빈 값으로 계속 진행 | `src/commands/task.mjs` |
| `harness-team summary`의 기본 브랜치 감지 | 감지 실패 | `src/commands/summary.mjs` |

실전에서는 task 문서·handoff·summary가 전부 커밋 흐름에 얹혀 있으므로 **git 저장소에서 쓰는
것을 전제**로 하되, "git이 없으면 아무것도 안 된다"는 사실이 아닙니다.

---

## 5. 에이전트별 연동

각 에이전트는 **독립된 설치 채널**입니다. 하나를 설치해도 다른 것이 따라오지 않습니다.

### Claude Code — 슬래시 명령 (`/harness-*`)

```
/plugin marketplace add https://github.com/bd-makers/team-harness
/plugin install harness-aijient-team
```

없으면: `/harness-*` 슬래시 명령 전부. CLI(`harness-team ...`)는 그대로 쓸 수 있습니다.

훅이 실제로 도는지는 별개입니다 — `SessionStart`·post-commit 훅은 PATH의 `harness-team`을
셸에서 호출하므로, 전역 CLI가 링크되어 있지 않으면 **조용히 no-op**입니다. `harness-team doctor`가
이 상태를 경고로 잡아 줍니다.

### Codex — `$` 스킬 호출

`.codex-plugin/plugin.json` + `skills/`를 Codex 플러그인으로 등록합니다. Codex는
`/harness-*`가 아니라 `$harness-aijient-team:harness-apply` 형태로 호출합니다.
Codex 플러그인은 Claude의 `commands[]`를 가져오지 않으므로 **따로 설치해야** 합니다.

### Gemini / Cursor / OpenCode — 파일만

`apply`가 `GEMINI.md`, `.cursor/rules/*.mdc`, `.opencode/opencode.json`을 **쓰기만** 합니다.
세 CLI 중 어느 것도 하네스가 호출하지 않습니다 — 설치 여부는 그 도구를 여러분이 쓸지에만
영향을 줍니다.

### 옵트인 외부 플러그인 — diagram-design

spec/plan 단계 다이어그램은 **옵트인**이며 `diagram-design`은 하네스가 소유하지 않는 별도
플러그인입니다. 없으면 **실패시키지 않고** 그 단계를 건너뛴 뒤 `<name>-artifact.md`에
"다이어그램 미실행 — 도구 없음"을 한 줄 남깁니다(probe → degrade → record).
plan의 해당 단계는 지우지 말고 `- [x] … — 미실행(도구 없음)`으로 닫습니다.

---

## 6. 설치 확인

```bash
node --version              # ≥ 18 (유일한 하드 요구사항)
command -v jq               # 없으면 §3 — 보안 훅 fail-open
harness-team doctor         # 파일·훅·CLI PATH·외부 도구 종합 점검
```

`doctor`가 green이어도 §2의 외부 도구는 `optional`로만 보고된다는 점을 기억하세요.

---

## 7. 호환성 주의

### ⚠ `mattpocock-skills`의 `writing-for-agents`를 이 저장소의 `AGENTS.md`/`CLAUDE.md`에 쓰지 마세요

팀원이 [mattpocock/skills](https://github.com/mattpocock/skills)를 개별적으로 설치할 수
있습니다(하네스에 번들하지 않습니다 — 각자 판단). 그중 `writing-for-agents`는 설명이
*"Use when creating or editing skills, or modifying AGENTS.md or CLAUDE.md"* 라서 **이 저장소에서
자동으로 발동합니다.** 그런데 이 저장소의 `AGENTS.md`·`CLAUDE.md`·`GEMINI.md`는
`templates/*.hbs`에서 **생성**되고, `harness:section` 마커 블록은 루트와 템플릿이 **쌍으로**
같아야 합니다:

- `tests/agent-files.test.mjs` — 루트 파일의 마커 절이 렌더된 템플릿과 다르면 실패
- `tests/e2e/ssot-consistency.test.mjs` — `AGENTS.md`가 SSOT 마커를 갖고 `CLAUDE.md`/`GEMINI.md`가
  `@AGENTS.md`를 import만 하는지 검사

루트만 고치면 **CI가 깨지고 원인을 찾기 어렵습니다.** 이 저장소의 에이전트 파일을 고칠 때는
항상 `templates/*.hbs`와 함께 고치세요.

### 무해한 중복 (알아두면 되는 정도)

같은 일을 하는 스킬이 겹치는 것은 문제가 되지 않습니다 — 어느 쪽을 쓸지만 정하면 됩니다.

| mattpocock-skills | 하네스 쪽 대응 |
|---|---|
| `diagnosing-bugs` | `templates/.claude/skills/fix-bug` (이미 이 방법론을 흡수했습니다) |
| `tdd` | `/harness-unittest` · `/harness-comptest` · `/harness-inttest` |
| `code-review` | `/harness-codex-review` · `/harness-codex-adversarial-review` |
| `grilling` | `/harness-interview` |
| `domain-modeling` | spec의 **Ontology** 섹션 |

---

## 8. 개발자용 (이 저장소를 수정할 때)

```bash
npm install                 # devDependencies (테스트 러너)
npm run test                # 단위 + e2e + perf
npm run docs:check          # docs/harness-overview.html 생성 상태 확인
```

`scripts/generate-harness-overview.mjs`의 `sourceTreeEntries`에 `tests`가 포함되므로,
**테스트 파일을 추가·삭제하면** `npm run docs:generate`를 다시 돌려 생성된 HTML을 함께
커밋해야 `docs:check`가 통과합니다.

운영 절차(릴리스·버전 범프)는 [MAINTAINING.md](../MAINTAINING.md)를 보세요.

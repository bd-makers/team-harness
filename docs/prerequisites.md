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
하드 요구사항은 **Node.js ≥ 24 하나뿐**이고(`package.json`의 `engines.node`, 런타임 npm
의존성 0개 — `dependencies` 없음), 나머지는 전부 **"있으면 켜지고, 없으면 그 기능만 꺼지는"**
선택 도구입니다. 무엇을 설치하느냐가 아니라 **무엇을 안 하면 무엇이 꺼지느냐**를 보세요.

> 이 문서는 **하네스 자체**를 쓰기 위한 준비입니다. `harness-team apply`가 소비자 프로젝트에
> 설치하는 내용이 아닙니다(`templates/`에 들어가지 않습니다).

---

## 1. 하드 요구사항

| 요구 | 확인 | 없으면 |
|---|---|---|
| Node.js ≥ 24 | `node --version` | `harness-team` CLI가 실행되지 않음. 이것 하나뿐입니다. |

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
| `jq` | Claude Code 훅의 정밀한 입력 파싱 | **차단은 유지되지만 판정 정확도가 떨어집니다 — §3 참조.** 다른 넷과 달리 doctor가 `optional`이 아니라 **`warning`** 으로 보고합니다. |
| `gh` | GitHub PR 흐름 | 하네스 명령은 아무것도 깨지지 않습니다. `/harness-ship`은 **PR을 만들지 않고** 준비 완료 보고에서 멈추므로, `gh`는 그 다음에 **사용자가 직접 여는 PR** 단계용입니다. |
| `codex` | `/harness-codex-review`, `/harness-codex-adversarial-review`, Codex L5 시뮬레이션(`tests/sim/codex-agentloop.mjs`) | 위 세 가지를 실행할 수 없습니다. 다른 명령은 영향 없음. |
| `gemini` | 병렬 외부 리뷰 (규범 — 하네스 코드가 호출하지 않습니다) | 리뷰를 건너뛰되 활성 task의 `<name>-artifact.md`에 **"미실행"을 기록**합니다(`commands/harness-codex-review.md`). 기록 없는 미실행은 "안 한 것"입니다. |
| `opencode` | OpenCode 순차 드라이버 세션 (`AGENTS.md` D4) | 하네스는 `.opencode/opencode.json`을 **쓰기만** 합니다 — CLI를 호출하지 않으므로 하네스 동작에는 영향이 없고, 그 세션을 열 수 없을 뿐입니다. |
<!-- /prerequisites:external-tools -->

**중요:** 이 다섯 개는 없어도 **exit code에 반영되지 않습니다.** gh·codex·gemini·opencode는
`not found, optional`(기능이 꺼질 뿐)로, **jq만 `warning`** 으로 보고됩니다 — 없으면 기능이
꺼지는 게 아니라 훅의 **판정 정밀도**가 떨어지기 때문입니다(§3).

```bash
harness-team doctor          # 도구 유무를 런타임에 확인
```

---

## 3. ⚠ jq는 "있으면 좋은 것"이 아닙니다 — 없으면 훅이 저정밀 모드로 떨어집니다

`templates/.claude/hooks/`의 훅 네 개(`block-dangerous-git.sh`, `protect-files.sh`,
`pre-commit-check.sh`, `auto-format.sh`)는 Claude Code가 stdin으로 넘기는 JSON payload를
파싱해서 판단합니다. jq가 있으면 정확히 파싱하고, **없으면 `"key": "value"` 문자열만 잘라내는
grep 폴백**으로 같은 검사에 넘깁니다.

| | jq 있음 | jq 없음 (저정밀 모드) |
|---|---|---|
| 파싱 | `jq -r`로 정확히 추출 | `grep`으로 `"key": "value"` 문자열만 추출 |
| `git push --force` | 차단 (exit 2) | **차단 (exit 2)** |
| `.env` 편집 | 차단 (exit 2) | **차단 (exit 2)** |
| 값을 못 뽑았을 때 | 해당 없음 | **통과시키지 않고** payload 전체를 검사 |
| 알림 | 없음 | 차단 메시지에 저정밀 모드임을 명시 + `doctor`가 `warning` |

**차단은 유지됩니다.** 다만 폴백 파서에는 구조적 한계가 있습니다:

- **JSON 이스케이프를 디코드하지 않습니다** — `git push\t--force`처럼 구분자가 인코딩된
  명령은 폴백에서 매치되지 않아 통과할 수 있습니다.
- 같은 키가 payload에 여러 번 나오면 **첫 매치만** 읽습니다.
- 값을 못 뽑아 payload 전체를 검사할 때는 검사 범위가 넓어져 정밀도가 떨어집니다.

그래서 jq는 "없으면 기능 하나가 꺼지는" 도구가 아니라 **보안 훅의 판정 정확도를 결정하는
도구**입니다. `doctor`가 다른 넷과 달리 `warning`으로 알리는 이유입니다(exit code는 그대로 —
`fail++` 하지 않습니다).

```bash
command -v jq || echo "jq 없음 — 훅이 저정밀 모드로 판정합니다"
# macOS: brew install jq   /   Debian·Ubuntu: apt-get install jq
```

> **왜 "jq 없으면 무조건 차단"이 아닌가:** 훅은 **매 도구 호출마다** 돕니다. 파싱 실패를
> 전부 차단으로 처리하면 어떤 bash 명령도 못 쓰는 상태가 됩니다. 반대로 payload 전체를
> 항상 스캔하면 모델이 쓴 `description` 문구가 정규식을 완성시켜
> `git checkout -b feat/x`(설명에 ` -- ` 포함) 같은 **안전한 명령이 차단**됩니다.
> 저정밀 모드는 그 사이의 선택입니다.

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

### 동반 플러그인 (선택) — diagram-design

spec/plan 단계 다이어그램은 **옵트인**이며 `diagram-design`은 하네스가 소유하지도 번들하지도
않는 외부 플러그인입니다. 이 마켓플레이스가 **커밋 sha로 핀을 걸어** 함께 등재하지만 설치는
선택입니다 — 설치 여부·명령·핀 갱신 절차는 README의
[동반 플러그인 (선택)](../README.md#동반-플러그인-선택) 절이 정본입니다.

하네스 안에서는 상류 스킬을 직접 부르지 않고 `/harness-diagram` 어댑터로 실행합니다
(산출물 경로·자립형 inline SVG 제약·artifact 기록 규약을 주입).
없으면 **실패시키지 않고** 그 단계를 건너뛴 뒤 `<name>-artifact.md`에
"다이어그램 미실행 — 도구 없음"을 한 줄 남깁니다(probe → degrade → record).
plan의 해당 단계는 지우지 말고 `- [x] … — 미실행(도구 없음)`으로 닫습니다.

---

## 6. 설치 확인

```bash
node --version              # ≥ 24 (유일한 하드 요구사항)
command -v jq               # 없으면 §3 — 훅이 저정밀 모드로 판정
harness-team doctor         # 파일·훅·CLI PATH·외부 도구 종합 점검
```

`doctor`는 외부 도구가 없어도 **exit code를 올리지 않습니다.** jq만 `warning`으로 눈에 띄고
나머지 넷은 `optional`로 조용히 지나가므로, doctor가 green이라고 전부 갖춰졌다는 뜻은 아닙니다.

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

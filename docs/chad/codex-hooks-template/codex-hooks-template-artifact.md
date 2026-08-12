# codex-hooks-template — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`apply`/`init`이 대상 프로젝트에 Codex SessionStart 훅을 설치하도록 만들고, README의 강제력 비대칭
표를 실측 기준으로 정정했다.

| 파일 | 변경 |
|---|---|
| `templates/.codex/hooks.json` | 신규 — SessionStart → `harness-team session-context 2>/dev/null \|\| true` |
| `src/harness.mjs` | `copyStaticAssets`에 `.codex/` 복사 1줄 추가 (skipExisting) |
| `src/commands/doctor.mjs` | `CHECKS`에 `.codex/hooks.json` optional/json 항목 추가 |
| `README.md` | 강제력 표 Codex 행 정정 + 훅 표면과 커맨드 표면 분리 서술 |
| `tests/e2e/apply-smoke.test.mjs` | `REQUIRED_PATHS`에 `.codex/hooks.json` 추가 |
| `skills/harness-team/SKILL.md` | (선행 수정) `context init\|check`·`release` 안내 추가 |

검증:
- `npm test` → **218 pass / 0 fail** + perf 1 pass
- `npm run test:e2e` → apply-smoke 3개 스택(bare-node/next/react-native) 전부 `.codex/hooks.json` 어써션 통과
- `npm run docs:check` → 최신
- 임시 디렉터리 실제 apply → `.codex/hooks.json` 생성 확인, `doctor` 출력에 `✓ .codex/hooks.json (valid JSON)` 노출

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-08-12 — Codex read-only 외부 리뷰 (`codex exec --sandbox read-only`)

Scope: working tree 전체. Verdict: **request changes**. P1 없음, P2 3건 + P3 1건.
검증 결과 **4건 전부 실재**(오탐 0). Gemini 병렬 리뷰는 `gemini` CLI 미설치로 **미실행**.

| # | 심각도 | 발견 | 판별 | 조치 |
|---|---|---|---|---|
| 1 | P2 | `skipExisting`이 기존 사용자 `.codex/hooks.json`을 통째로 건너뛰어 harness 훅이 조용히 누락되고, doctor는 JSON 유효성만 봐서 healthy로 보고 | **진짜** — 설계 실수. `.claude/settings.json`·`.opencode/opencode.json`은 deep-merge 레인인데 `.codex`만 copyTree 레인에 넣었다. 이 머신의 firstmate·bodoc4가 실제 해당 케이스 | **양쪽 절 모두 조치.** (a) 설치 경로: `copyStaticAssets` → `planChanges` JSON deep-merge로 이동. (b) 탐지: `codexHooksHaveSessionContext()` + `checkCodexSessionHook()`으로 doctor가 내용까지 검사 — `settingsHasBoundaryCheckpoint` 패턴과 동일. 회귀 테스트 8건 (`tests/codex-hooks.test.mjs`) |
| 2 | P2 | Codex는 훅을 세션 cwd에서 실행하는데 `session-context`는 `process.cwd()`를 프로젝트 루트로 간주 — 하위 디렉터리에서 띄우면 "활성 task 없음" 오보 | **진짜** — CLI 쪽은 코드로 확인(`bin/harness-team.mjs:88`, 상향 탐색 없음). Codex의 cwd 동작은 리뷰어의 재현 보고 + 공식 문서 인용 | 템플릿 훅이 `--target "$(git rev-parse --show-toplevel \|\| pwd)"`로 루트를 직접 해석. 공유 CLI는 건드리지 않음 |
| 3 | P2 | README가 "apply하면 컨텍스트가 주입된다"고 쓰지만 Codex는 사용자가 훅을 신뢰(trust)하기 전까지 실행하지 않음 — 활성화 단계 미문서화 | **진짜** — `~/.codex/config.toml` `[hooks.state]` trusted_hash가 그 증거 | README에 신뢰 승인 절차 + 해시 변경 시 재승인 + CLI 부재 시 no-op을 경고 블록으로 추가 |
| 4 | P3 | "Claude Code \| 4종"이 부정확 — `templates/.claude/settings.json`은 5개 이벤트 키 선언 | **진짜** — 이벤트 키 5개(PreToolUse/PostToolUse/PostToolUseFailure/PermissionDenied/SessionStart), 훅 커맨드 7개(스크립트 5 + observe-tools.mjs + CLI). "4종"은 어느 쪽도 아님 | 표를 "5개 이벤트 / 스크립트 6종"으로 정정 |

리뷰어가 확인해 준 것: Codex 스키마(`SessionStart` PascalCase, matcher-group 중첩, `timeout`) 정상,
fresh-install 스모크 어써션과 doctor optional 항목이 상호 정합, 부분 `.codex/` 생성이 다른 파일을 훼손하지 않음.

리뷰어가 확인하려다 실패한 것 — 직접 확인해 보완:
- 패키징: 리뷰어의 `npm pack --dry-run`이 npm 캐시 EPERM으로 실패. `--cache`를 따로 줘서 재실행한 결과
  `templates/.codex/hooks.json`이 패키지에 정상 포함(총 120개 파일).

리뷰 범위 밖에서 자체 발견 + 조치:
- `.codex`가 백업 아키텍처 관리 목록 8곳(JS 5 + shell 3)과 `AI_GITIGNORE_ENTRIES`에서 누락돼 있었다.
  그대로면 `backup` 시 `.codex`만 실물로 남고 `delete` 시 잔재가 남는다. 전부 추가하고
  apply → backup(symlink 전환) → delete 전 구간을 실제 디렉터리로 검증했다.

## Learnings

### 2026-08-12 — "구조적 한계"로 적어둔 것이 실은 만료된 실측이었다

README에 `Codex | hooks 0`과 함께 "훅은 `.claude/settings.json`에 사는 Claude Code 전용
메커니즘이므로 이 비대칭은 구조적입니다"라고 적혀 있었다. 이 문장은 0.11.0 시점 probe로는
맞았지만, Codex CLI 0.147.0이 프로젝트 로컬 `.codex/hooks.json`을 지원하면서 사실이 아니게 됐다.
문서가 "구조적"이라고 단정한 탓에 갭이 재검토 대상에서 빠져 있었다.

**Why:** 외부 도구의 능력을 근거로 한 설계 결정은 그 도구의 버전과 함께 만료된다. "구조적 한계"와
"현재 버전의 한계"를 같은 문장으로 쓰면 후자가 전자로 굳는다.

**How to apply:** 외부 CLI의 미지원을 근거로 문서에 한계를 적을 때는 측정 시점 버전을 함께
적고(예: "0.11.0 probe 실측"), 단정 표현 대신 재검토 조건을 남긴다. 이번처럼 버전 질문이
들어왔을 때가 재검토 트리거다.

### 2026-08-12 — 발견을 근거 강도별로 분리해서 보고할 것

`.codex/hooks.json` 검증에서 확인된 것은 "Codex가 이 경로를 발견해 신뢰 등록한다"(config.toml
`[hooks.state]` trusted_hash)까지였고, "훅이 실행되어 컨텍스트가 주입된다"는 확인하지 못했다
(`codex exec --dangerously-bypass-hook-trust`가 샌드박스 정책에 막힘). 두 주장을 뭉뚱그리지 않고
분리해 보고했다.

**Why:** 앞 턴에서 "Codex가 프로젝트 로컬 훅을 읽는지 미확인"이라고 정직하게 남긴 항목이 다음
턴의 조사 대상이 됐다. 미확인을 미확인으로 표시해두는 것이 후속 작업의 진입점이 된다.

**How to apply:** 검증 결과는 확인된 범위와 확인 못 한 범위를 나눠 적고, 막힌 이유(권한·정책)를
함께 남긴다. spec.md `## 참고`가 그 자리다.

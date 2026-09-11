# 후속 후보 — 새 세션 검토용

> 이 파일은 **task가 아니다.** 결정·착수 전의 후보 목록이며, 항목을 task로 올리면 여기서 지운다.
> 각 항목은 새 세션이 이 파일만 읽고 spec을 쓸 수 있도록 맥락·정본 위치·선행 조건을 담는다.
> 출처: 2026-09-10 세션 — 4요소(agent loop / tool interface / context management / control mechanisms)
> 관점 분석 → `done-force-audit-trail`(0.34.0, main에서 별도 구현) → `review-evidence-cli-owned`(0.37.0).

## 우선순위

**남은 것: 2 · 4 · 6 · 7.** 2번은 2026-09-12에 정리했다 — **결정보다 선행 검증이 먼저**이고,
지금 설치되는 Codex SessionStart 훅이 발화하지 않는 정황이 잡혔다(그 항목 참조). 나머지는 급하지 않다.
(1·5번은 2026-09-11 task `review-codex-live-check`·`done-on-main-nudge`로, 3·8번은 같은 날 task
`review-adopt-record-quality`로, 9번은 2026-09-12 task `handoff-amend-dedup`으로 올려 여기서 지웠다 —
번호는 참조 안정을 위해 유지.)

---

## 2. Codex 훅 확장 — 결정 항목 (task 아님)

> 2026-09-12 실측으로 정리했다. **결론부터: 결정보다 선행 검증이 먼저다** — 지금 설치되는 Codex SessionStart
> 훅이 **동작하지 않는 정황**이 잡혔다. 확장을 논하기 전에 있는 훅부터 살아 있는지 확인해야 한다.

### 결정 요청 (한 가지)

`README.md:111`의 *"에이전트별 강제력은 의도적으로 대칭이 아닙니다"* 를 **유지할 것인가.**
유지하면 이 항목은 영구 종결이고, 뒤집으면 Codex에도 control 계층(PreToolUse 차단·관측)을 배선하는 task가 된다.

### 새로 확인된 사실 — 플랫폼 한계가 아니다 (확증)

codex-cli **0.153.4** 바이너리 문자열 실측:

- **이벤트 12종**: `PreToolUse` · `PostToolUse` · `PermissionRequest` · `PreCompact` · `PostCompact` ·
  `SessionStart` · `SessionEnd` · `UserPromptSubmit` · `SubagentStart` · `SubagentStop` · `Stop` · `Interrupt`.
- **차단이 실제로 구현돼 있다**: `Command blocked by PreToolUse hook:` · `Tool call blocked by PreToolUse hook:`
  문자열과 `PreToolUseDecisionWire`(`approve`/`block`/`allow`/`deny`/`ask`)가 바이너리에 있다.
- **wire protocol이 Claude와 같다**: `hookSpecificOutput` · `permissionDecision` · `additionalContext` ·
  `decision`/`reason` · `continue`/`stopReason`/`suppressOutput`, 훅 항목 필드도 `matcher`·`timeout`·`command`.
  즉 **스크립트를 거의 그대로 재사용할 수 있다**(`protect-files.sh`·`block-dangerous-git.sh`·`observe-tools.mjs`).
- `observe-tools.mjs`의 `toolCategory()`는 이미 Codex 도구명(`exec_command`·`apply_patch`·`spawn_agent`)을 매핑한다.

**즉 "배선만 안 된 상태"라는 종전 판단은 맞다.** 남은 것은 의지의 문제가 아니라 아래 선행 검증이다.

### 선행 검증 — 지금 훅이 살아 있는가 (부정 정황 2건)

- **(1) 마커 훅이 발화하지 않았다.** 새 git 저장소에 `.codex/hooks.json`(SessionStart → 마커 파일 생성)을 두고
  `codex exec --sandbox read-only --dangerously-bypass-hook-trust` 실행 → 세션은 정상 완료(다른 훅의
  `hook: Stop Completed` 출력은 보임)했지만 **마커 파일이 생기지 않았다.**
- **(2) 신뢰 등록이 한 번도 안 됐다.** `~/.codex/config.toml`의 `[hooks.state]`에는 `~/.codex/hooks.json`과
  플러그인 훅 항목만 있고, **project-level 경로 항목이 하나도 없다.** 이 저장소는 `trust_level = "trusted"`이고
  `.codex/hooks.json`을 2026-09-03부터 갖고 있으며 codex를 수십 번 돌렸는데도 그렇다.
- **아직 모르는 것**: 바이너리에는 `Error parsing project hooks config file` · `Failed to read project hooks config file`
  문자열이 있으므로 project-level 훅 자체는 **개념으로 존재한다**. 경로가 `.codex/hooks.json`이 아닌지,
  별도 활성화가 필요한지는 **미규명**이다.
- **`~/.codex/hooks.json`(전역)은 같은 스키마로 실제 동작 중이다** — 사용자 환경의 Orca·Otty 훅이 그 파일에
  Claude와 동일한 중첩 구조로 등록돼 있고 `[hooks.state]`에 신뢰 해시가 있다. **스키마는 맞다**는 뜻이다.

### 선택지

| | 무엇 | 비용 | 남는 위험 |
|---|---|---|---|
| **A. 검증 먼저 (권장)** | 코드 변경 없는 작은 task로 project-level 훅의 **정확한 로딩 경로**를 규명한다. 결과에 따라 B/C로 간다 | 로컬 codex 실험 1회분 | 없음 — 지금 README가 사실과 다를 수 있는 상태만 정리된다 |
| **B. 확장** | A에서 경로가 확인되면 `PreToolUse`(보호 경로·위험 git)와 관측을 Codex에 배선 | 훅 스크립트는 재사용 가능하나 테스트·문서·doctor 표면이 늘어난다 | Codex가 리뷰어(D2)인데 쓰기 차단 훅을 다는 것이 역할과 맞는지 |
| **C. 비대칭 유지** | README 문장을 그대로 두고 이 항목을 종결 | 0 | Codex 세션의 control 부재가 영구 고정 |

**권장: A.** B/C 어느 쪽을 고르든 "설치했지만 발화하지 않는 훅"이 남아 있으면 안 된다. 검증 결과가
"project-level 훅은 지원되지 않는다"로 나오면 C가 자동으로 옳아지고, 경로가 밝혀지면 B의 비용이 크게 준다.

### 정본

`templates/.codex/hooks.json` · `README.md:111` 표 · `docs/chad/codex-hooks-template/codex-hooks-template-spec.md`
(종전 미검증 기록) · `templates/.claude/hooks/observe-tools.mjs`의 `toolCategory()`.

## 4. 프레이밍 프롬프트 src 이관 — 0.37.0 후속

- **무엇**: 검증 프레이밍 5종(adversarial·testcritic·shipcheck·contrarian·simplifier)의 프롬프트는 각 커맨드
  문서가 정본이고, 에이전트가 파일에 써서 `--prompt-file`로 넘긴다. src에 두면 `harness-team review codex
  --framing adversarial`만으로 실행된다.
- **비용**: 공용 프롬프트처럼 문서 ↔ src pin 테스트 5개가 더 생긴다(`tests/review-command.test.mjs`의
  `REVIEW_PROMPT_TEMPLATE` pin 참조). 문서가 정본이라는 현 구조를 유지할지, src가 정본이 되고 문서가
  포인터가 될지 결정 필요.

## 6. `tests/sim/agentloop.mjs` 헤더 주석 정정 — 한 줄

- **무엇**: 헤더가 *"a nested `claude -p` spawned from inside a Claude session is NOT logged in (credential
  isolation — verified empirically)"* 라고 한다. `commands/harness-review.md` claude 엔진 절은 *"부모 세션의
  인증을 상속한다 (2026-08-21 실측 검증)"*이고, 2026-09-10 원격 컨테이너 실측도 상속 동작(0.37.0의 dogfood
  리뷰가 그 경로로 돌았다). 두 실측이 문서 쪽을 지지한다.
- **주의**: sim이 OAuth 토큰 파일(`~/.claude-sim-oauth-token`)을 쓰는 이유가 그 주석이므로, 주석만 고칠지
  토큰 경로 자체를 제거할지는 실측 후 결정. 환경(로컬 vs 원격 컨테이너)에 따라 다를 수 있음 — **미검증**.

## 7. `delegation-router` 스킬 가격 표의 `$1`·`$2`… 치환 깨짐 — 레포 밖

- **무엇**: `~/.claude/skills/.../delegation-router/references/context-and-model.md`의 모델 티어 표에서
  `$1`·`$2`·`$5`·`$10`·`$25`·`$50`이 슬래시 커맨드 인자 치환(`$1` = 첫 인자)에 잡혀 셀이 인자 문자열로
  바뀐다(2026-09-10 실측: haiku 행 입력 가격이 "작동한건가?"로 렌더).
- **어떻게**: `USD 1` 또는 `1 $/MTok`처럼 `$숫자` 패턴을 피한다. 이 저장소가 아니라 스킬 저장소의 변경.

---

## 이 목록에 없는 것 (의도적으로)

- **context check를 done 게이트로**: 4요소 분석에서 한때 "약점"으로 꼽았다가 철회. TCC는 AGENTS.md가
  **비-SSOT cache/workpad**로 정의하므로 cache 유효성으로 종결을 막으면 정의와 충돌한다. 다시 올리지 말 것.
- **리뷰 마커 HMAC 서명**: `review-evidence-cli-owned` spec `### 왜 서명이 아니라 meta인가`에서 기각.
  머신별 키는 두 머신 작업을 깨고, 공유 키는 얻는 게 없으며, 위조는 가드의 위협 모델 밖.

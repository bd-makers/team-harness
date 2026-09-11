# codex-hook-injection-fix — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

followups 2번의 **A'**를 구현했다 — Codex 훅이 **실제로 주입한다**. 실측으로 확인했다: 이 저장소에서
`codex exec --dangerously-bypass-hook-trust`를 돌려 "컨텍스트에 `[harness]` 줄이 있으면 인용하라"고 묻자
`[harness] 활성 task: chad/codex-hook-injection-fix — …` 를 그대로 돌려줬다. 고치기 전에는 `NONE`이었다.

### (a) 봉투 — `session-context --codex-hook`

`renderCodexHookEnvelope()`가 `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"…"}}`
한 줄을 낸다. **Claude 경로는 불변** — Claude는 평문 stdout을 읽으므로 기본 출력은 그대로다.
템플릿과 이 저장소의 `.codex/hooks.json`에 플래그를 넣었고, 기존 pin(`HARNESS_COMMAND_RE`)이 이제 플래그까지
본다 — 빠뜨리면 훅은 돌지만 아무것도 주입되지 않는 **조용한 죽음**이라 pin이 그것을 잡아야 한다.

트레이드오프 하나를 코드에 적었다: 봉투는 한 덩어리라 버퍼링이 필요해서, 평문 경로의 "gate를 먼저 흘려
훅 타임아웃(10 s)에서 지킨다"는 보호가 codex 경로엔 없다. 대신 observe가 **던지는** 경우에는 gate만이라도 낸다.

### (b) doctor — 설치는 동작이 아니다

`checkCodexHookTrust`가 `CODEX_HOME ?? ~/.codex`의 `config.toml`을 **읽기만** 해서 신뢰 2겹을 본다.
이 저장소에서 즉시 발화했다:

```
⚠️ .codex/hooks.json 은 설치됐지만 Codex 가 실행하지 않는다 (훅 소스 신뢰 없음) — 이 프로젝트에서
대화형 `codex` 를 한 번 띄워 훅 승인을 받으면 이후 세션부터 주입된다; 승인 없이 확인만 하려면
`codex exec --dangerously-bypass-hook-trust`
```

프로젝트 신뢰는 있고 훅 소스 신뢰만 없다는 것까지 정확히 가린다. codex 설정이 없으면(= codex를 안 쓰면) 침묵한다.

### (c) README

`:111` 표의 *"SessionStart 1종 (신뢰 승인 필요)"* → *"신뢰 2겹이 모두 있어야 실행"*, 그 아래 *"둘 다 …
주입합니다"* 에 **"단 Codex 쪽은 설치만으로 동작하지 않습니다"** 와 조건·형식을 담은 인용 블록을 붙였다.

### 부수 수정 — e2e 샌드박스의 `CODEX_HOME` 격리

새 검사를 넣자 init-smoke 3종이 빨개졌다. 원인은 검사가 아니라 **샌드박스가 개발 머신의 실제 `~/.codex`를
읽고 있던 것** — 임시 경로에 신뢰 항목이 있을 리 없으니 모든 샌드박스가 경고한다. `CLAUDE_CONFIG_DIR`와
같은 이유로 `CODEX_HOME`을 격리했다. CI에서는 초록이고 로컬에서만 빨개지는 종류의 결함이었다.

### 검증

- 신규 테스트 9건(`tests/codex-hook-injection.test.mjs`): 봉투 형태·평문과 봉투의 내용 일치·빈 봉투 금지·
  `parseCodexTrust` 4경우·경고 문구가 없는 신뢰만 지목·둘 다 없을 때·codex 미사용 침묵·훅 없음 무대상.
- `npm run test` 807 tests green.
- **실제 codex 세션 주입 확인**(위). 단위 테스트가 아니라 진짜 훅 경로다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-09-11T16:48:04.913Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 64d8ccca0495d4e7c4b519cdf4a3590853f4d0fb · exit 0 · 2369 B

```text
### 2026-09-12 — Codex read-only worktree review

**P1 blocking**

- [src/harness.mjs:32](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/harness.mjs:32>) — Production health detection still accepts the legacy `session-context` command without `--codex-hook`; existing installations can therefore be reported healthy while Codex ignores their plain stdout. Reproduced as `legacyPlainAcceptedAsHealthy: true`.

**P2 should-fix**

- [src/commands/doctor.mjs:324](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/doctor.mjs:324>) — `hookSource` becomes true from a path substring in any section header without checking the exact event/index or a current `trusted_hash`, so stale approval, another hook in the same file, a commented/missing hash, or a different project path containing this path can suppress the warning.

No P3 findings.

Checks requested:

- Envelope: valid one-line JSON; newline, quote, control-character, Unicode line-separator, and lone-surrogate inputs round-tripped correctly.
- Claude path: observed output is byte-equivalent to `additionalContext +` its stdout terminator; the default branch remains unchanged.
- Commented section headers do not false-positive, but a live matching header with only a commented-out `trusted_hash` does.
- One-missing-trust warning formatting is correct when parser results are accurate; the current repository correctly reports only `훅 소스 신뢰 없음`. The parser flaw can make those inputs inaccurate.
- `CODEX_HOME` sandbox isolation looks correct.
- Syntax checks and `git diff --check` passed. Two pure targeted tests passed; filesystem-dependent tests could not run in this read-only environment because `mkdtemp` returned `EPERM`, so the claimed full 807-test result was not independently reproduced.
- Public OpenAI documentation did not expose the current hook-state storage contract; trust validation used the installed `codex-cli 0.153.4`, its local config shape, and repository probe evidence.

**Final verdict: CHANGES REQUESTED.** Fix the legacy-command health predicate before release; the trust parser should then identify the exact harness SessionStart hook and validate meaningful/current trust state.
```

<!-- harness:review kind=codex scope=worktree tip=64d8ccca0495d4e7c4b519cdf4a3590853f4d0fb at=2026-09-11T16:48:04.913Z -->


**판별 (2026-09-12, 1차).** P1·P2 **둘 다 진짜**라 모두 고쳤고, P1은 범위를 하나 넓혔다.

- **P1 (진짜, 수정함 + 범위 확장)** — `codexHooksHaveSessionContext`가 `--codex-hook` 없는 옛 커맨드도
  healthy 로 봤다. 즉 **기존 설치 전부**(0.38.2 이하)가 "괜찮다"고 보고되면서 실제로는 아무것도 주입하지 않는다.
  판정을 `isHarnessCodexSessionCommand`로 좁혀 플래그를 요구하게 했다. 여기서 멈추면 경고만 남고 고칠 길이
  없어서 — `init`의 배열 union 은 새 그룹을 *추가*할 뿐 옛 훅을 죽은 채 남긴다 — **`migrate`에 제자리 업그레이드
  단계**를 더했다(`migrateCodexHookFlag`). 하네스 CLI 를 부르는 커맨드만 고치고 사용자 훅은 건드리지 않으며 멱등이다.
- **P2 (진짜, 수정함)** — `hookSource` 가 아무 섹션 헤더의 경로 **부분 문자열**로 참이 됐다. 정확한 헤더 접두
  (`[hooks.state."<path>:`)와 **주석이 아닌 `trusted_hash`** 를 함께 요구하도록 좁혔다.
  **남는 한계를 코드에 적었다**: 기록된 해시가 *현재 파일의 것*인지는 확인 못 한다(codex 해시 계약 비공개).
  이 경고는 **없는 신뢰를 잡고, 낡은 신뢰는 놓친다** — 방향이 안전한 쪽이다.
- 리뷰어가 확인해 준 것: 봉투는 개행·따옴표·제어문자·유니코드 line separator·lone surrogate 입력에서
  한 줄 유효 JSON 으로 round-trip 하고, Claude 평문 경로는 바이트 동등하며, 주석 처리된 섹션 헤더는 오탐이 없다.

### 2026-09-11T16:51:57.786Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 64d8ccca0495d4e7c4b519cdf4a3590853f4d0fb · exit 0 · 1660 B

```text
전하, **남은 P2 3건**을 확인했습니다. 추가 P1은 발견하지 못했습니다.

- **P2 — [src/harness.mjs:50](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/harness.mjs:50>)**: 명령 경계를 확인하지 않아 사용자 훅 `my-harness-team session-context`와 `echo "harness-team session-context"`까지 마이그레이션 대상으로 판정하고 변경합니다.
- **P2 — [src/commands/migrate.mjs:989](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/migrate.mjs:989>)**: 첫 문자열을 치환하므로 `node "/opt/session-context/bin/harness-team.mjs" session-context`의 실행 경로를 손상시키며, 손상된 명령도 healthy로 판정됩니다.
- **P2 — [src/commands/doctor.mjs:331](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/doctor.mjs:331>)**: 경로 접두만 검사하고 이벤트·인덱스를 무시하여, 같은 파일의 다른 훅(`session_start:1:0`)만 승인되어도 미승인 하네스 훅의 신뢰 경고를 숨깁니다.

기본 수정 관련 테스트 4건은 통과했습니다. 위 문제는 메모리 기반으로 재현했으며, 정상 명령의 멱등성·승인 거절·잘못된 JSON 보존도 확인했습니다. 파일 변경은 없으며 전체 테스트는 실행하지 않았습니다.

**최종 판정: 수정 필요 — 사용자 훅 보존과 정확한 치환·신뢰 판정을 보완해야 합니다.**
```

<!-- harness:review kind=codex scope=worktree tip=64d8ccca0495d4e7c4b519cdf4a3590853f4d0fb at=2026-09-11T16:51:57.786Z -->


**판별 (2026-09-12, 2차).** P2 3건 **전부 진짜**라 모두 고쳤다. 셋 다 "내가 만든 매칭이 너무 헐겁다"는 같은 모양이다.

- **커맨드 경계 (수정함)** — `/harness-team(\.mjs)?["']?\s/` 가 `my-harness-team session-context` 도 잡았다.
  앞자리를 줄머리·공백·`/`·따옴표로 한정했다. 덤으로 `echo "harness-team session-context"` 도 빠진다 —
  `session-context` 뒤가 따옴표라 **독립 인자 규칙**에 걸리지 않는다.
- **치환 위치 (수정함)** — `replace('session-context', …)` 가 첫 occurrence 를 바꿔
  `/opt/session-context/bin/harness-team.mjs` 의 **실행 경로를 망가뜨렸다**. `withCodexHookFlag()` 로 뽑아
  독립 인자 위치에만 붙인다. 망가진 커맨드가 healthy 로 읽히던 것도 함께 사라졌다.
- **신뢰 키 정밀도 (수정함)** — 경로 접두만 봐서 **같은 파일의 다른 훅**(`session_start:1:0`)이 승인된 것만으로
  경고가 사라졌다. 이제 하네스 훅의 `(group, hook)` 위치로 정확한 키를 만들어 대조한다.
  키 형식은 추측이 아니라 **실측**이다 — 사용자 전역 `hooks.json` 의 SessionStart 5그룹이 config 의
  `:session_start:0:0`~`:4:0` 과 1:1로 맞는다.

### 2026-09-11T16:55:17.224Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 64d8ccca0495d4e7c4b519cdf4a3590853f4d0fb · exit 0 · 2062 B

```text
전하, **P1은 발견하지 못했으며, P2 4건이 남아 있습니다.**

- **P2 — [src/commands/doctor.mjs:351](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/doctor.mjs:351>)**: `init`으로 구형·신형 훅이 공존하면 구형 훅의 승인만으로도 신뢰 검사를 통과하여, 실제 봉투를 출력하는 신형 훅의 미승인 상태를 숨깁니다.
- **P2 — [src/harness.mjs:33](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/harness.mjs:33>)**: `echo "harness-team session-context --target x"`도 하네스 실행으로 오인하여 마이그레이션이 사용자 출력 문자열을 변경합니다.
- **P2 — [src/harness.mjs:46](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/harness.mjs:46>)**: `printf " session-context started "; harness-team session-context --target x`에서는 앞의 출력 문자열에 플래그를 삽입하고 실제 실행 인자는 그대로 둡니다.
- **P2 — [src/harness.mjs:41](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/harness.mjs:41>)**: `--target /work/--codex-hook-repro`처럼 경로에 포함된 문자열도 플래그로 인정하여, 봉투 플래그가 없는 훅을 정상 판정하고 마이그레이션에서 제외합니다.

`my-harness-team` 제외, `/opt/session-context/bin/…` 경로 보존, 정확한 `(group, hook)` 키 생성은 확인했습니다. 위 잔여 문제는 메모리 내 실행으로 재현했습니다. 관련 순수 테스트 5건·구문 검사·`git diff --check`는 통과했으며, 파일 생성이 필요한 전체 테스트는 읽기 전용 제약으로 실행하지 않았습니다. 파일 변경은 없습니다.

**최종 판정: CHANGES REQUESTED — 위 P2 수정이 필요합니다.**
```

<!-- harness:review kind=codex scope=worktree tip=64d8ccca0495d4e7c4b519cdf4a3590853f4d0fb at=2026-09-11T16:55:17.224Z -->


**판별 (2026-09-12, 3차).** P1 없음. P2 4건 중 **1건은 설계 결함이라 고쳤고, 3건은 한 가지 해법으로 닫았다.**

- **공존 시 옛 훅의 승인이 새 훅을 가린다 (진짜, 수정함)** — `init` 의 배열 union 은 업그레이드 때 옛 훅 **옆에**
  새 훅을 둔다. 신뢰 키를 두 훅 모두에서 만들면 옛 훅(주입 못 함)의 승인만으로 경고가 사라진다.
  키 생성을 **봉투를 내는 훅만**으로 좁혔다. 옛 훅만 있는 설치는 `checkCodexSessionHook` 이 따로 잡는다.
- **셸 문자열 3건 (진짜지만 한 가지 해법)** — `echo "harness-team session-context …"` 를 실행으로 오인,
  `printf " session-context "; harness-team …` 에서 앞 문자열에 플래그 삽입, `--target /work/--codex-hook-repro`
  의 경로 조각을 플래그로 인정. 앞의 둘은 **셸 파싱 없이는 일반해가 없다.** 그래서 이 저장소의 기존 idiom
  (`refreshClaudeHooks` 의 sha 테이블 = "출하한 적 있는 바이트만 건드린다")을 따라
  **migrate 의 쓰기 대상을 출하 형태 allowlist 로 한정**했다. 판정(doctor 경고)은 넓게, 쓰기는 좁게 —
  allowlist 밖 형태는 고치지 않고 사람에게 넘긴다. 세 번째는 플래그를 **독립 토큰**으로 세어 닫았다.
- 재확인: 좁힌 뒤에도 이 저장소의 훅은 healthy 로 읽히고, **실제 codex 세션이 `[harness]` 줄을 그대로 인용**한다.

**여기서 리뷰 루프를 닫는다.** 3차까지의 발견은 전부 반영했고, 남는 것은 셸을 파싱해야 잡히는 종류다 —
그 경계를 코드(allowlist)와 이 기록에 남겼다. 더 쥐어짜는 대신 실제 동작 검증(주입 재현)으로 마감한다.

## Learnings

- **"설치됐다"를 건강으로 보고하면 결함이 6개월을 산다.** 이번 P1 은 새 코드의 버그가 아니라 **낡은 판정 기준**이었다.
  형식을 바꿀 때는 그 형식을 *검사하는* 술어도 같이 바꿔야 한다 — 안 그러면 새 규약과 옛 설치가 동시에 green 이다.
- **고칠 길 없는 경고는 절반짜리다.** doctor 가 옛 훅을 잡게 만든 순간 `migrate` 업그레이드가 필수가 됐다.
  경고를 추가할 때는 "이 경고를 본 사람이 다음에 무엇을 치는가"를 같이 만든다.
- **모르는 것은 코드에 적는다.** codex 의 해시 계약을 모르니 낡은 신뢰는 못 잡는다. 그 한계를 주석에 남겨
  다음 사람이 "왜 이 경고가 안 떴지"를 재조사하지 않게 했다.
- **문자열 매칭으로 소유권을 판정하면 남의 것을 건드린다.** 세 P2가 전부 그 한 가지였다 —
  경계 없는 이름, 위치 없는 치환, 접두만 보는 키. 쓰기를 하는 코드(`migrate`)에서는 특히,
  "무엇을 고칠 것인가"의 판정이 **정확한 위치**로 되어야 한다.
- **쓰기와 판정은 다른 폭을 가져야 한다.** 리뷰가 민 세 건은 전부 "문자열 매칭으로 남의 것을 고친다"였다.
  판정(경고)은 넓게 유지하고 **쓰기만 출하 형태로 좁히자** 세 건이 한 번에 닫혔다. 이 저장소는 이미
  `refreshClaudeHooks` 에서 같은 선택을 해 뒀다 — 새 규칙을 만들기 전에 기존 idiom 을 먼저 찾을 것.
- **적대적 리뷰는 스스로 멈춰야 한다.** 셸 문자열 공격 표면은 파싱 없이는 끝이 없다. 어디서 멈췄는지와
  왜 멈췄는지를 적어 두는 것이 계속 깎는 것보다 낫다.

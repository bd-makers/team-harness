# stack-detection-cli — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

테스트 3형제 커맨드의 0단계에서 **의존성 조회**를 `harness-team stack` 서브커맨드로 내렸다.

| 구분 | 파일 |
|---|---|
| 신규 | `src/detect-testing.mjs` · `src/commands/stack.mjs` · `tests/detect-testing.test.mjs` |
| 수정 | `src/cli-args.mjs` · `bin/harness-team.mjs` · `tests/cli-args.test.mjs` · `commands/harness-{unittest,comptest,inttest}.md` |
| 생성물 | `docs/harness-overview.html` |

산문에서 사라진 것: package.json 의존성 조회(3중 중복, 107줄).
산문에 남은 것: 기존 테스트 샘플링(팀 컨벤션 귀납) · 러너 부재 분기(`AskUserQuestion`·웹 검색) ·
Docker 분기(머신 상태 + 대안 선택) — 전부 CLI가 볼 수 없는 입력에 의존한다.

**함께 고친 드리프트**: `harness-unittest.md:41`의 예외 참조가 `§5`를 가리켰는데 스냅샷 정책은
`§4`(114–131)에 있다 — `harness-comptest.md:67`의 `§4`가 옳았고 unittest 쪽이 틀렸다.

### 검증

```
npm test        → 909 tests, 908 pass, 0 fail, 1 skipped (skip은 기존 것)
npm run docs:check → harness overview 생성 상태가 최신입니다.
```

실제 소비자 프로젝트 대조(fixture는 내가 만든 것이라 감지 규칙의 오류를 못 잡는다):

- `~/projects/workspace/deep-math` (RN/Expo) → `러너: jest · React Native (Expo) · TypeScript · npm ·
  TL: react-native · preset: jest-expo · 프로바이더: zustand+expo-router+react-navigation`.
  package.json 의존성과 대조해 누락 없음을 확인했다.
- `~/projects/workspace/job-scraper` (Python/uv) → `러너: 해당 없음 (JS 매니페스트 없음)`.

### 남은 리스크

- 의존성 라벨 표는 **화이트리스트**다. 표에 없는 라이브러리(예: `@testing-library/jest-native`)는
  조용히 빠진다 — 감지 실패가 아니라 "그 축에 없다"로 보이므로, 새 라이브러리가 흔해지면 표를 늘려야 한다.
- 커밋하지 않았다. `docs/harness-overview.html`은 `git ls-files` 기반이라 **stage된 상태에서** 생성했다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-17T12:52:51.572Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: fbc73d754a2827a62f39e65919efa7372a988168 · exit 0 · 1360 B

```text
전하, P1은 없습니다.

- P2 — [src/commands/stack.mjs:68](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/src/commands/stack.mjs:68): 깨진 `package.json`도 “runner missing” warning으로 분류되어, 세 명령 문서의 warning→러너 설치 분기로 잘못 안내됩니다.
- P2 — [src/commands/stack.mjs:44](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/src/commands/stack.mjs:44): `renderSummary`는 5줄 제한을 구현하지 않아 모든 축이 감지된 프로필에서 13줄을 반환하며, 문서의 “5줄 이내” 계약을 깨뜨립니다.
- P3 — [stack-detection-cli-artifact.md:14](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/docs/hslee/stack-detection-cli/stack-detection-cli-artifact.md:14): EOF의 새 빈 줄 때문에 `git diff --check`가 실패합니다.

`node --check` 및 현재 저장소 대상 `stack --json` 실행은 성공했습니다. 최종 판정: **P2 두 건을 수정한 뒤 병합 권장**입니다.
```

<!-- harness:review kind=codex scope=worktree tip=fbc73d754a2827a62f39e65919efa7372a988168 at=2026-09-17T12:52:51.572Z -->

### 2026-09-17T12:57:12.469Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: fbc73d754a2827a62f39e65919efa7372a988168 · exit 0 · 815 B

```text
전하, P1은 없습니다.

- P2 — `src/detect-testing.mjs:159`: 빈 `package.json`을 “파일 없음”으로 분류해 `status: success`와 “JS 매니페스트 없음” 안내를 내므로, 실제로는 깨진 매니페스트를 고쳐야 할 프로젝트가 러너 점검·수리 흐름에서 빠집니다.
- P2 — `commands/harness-unittest.md:34`, `commands/harness-comptest.md:56`, `commands/harness-inttest.md:62`: `status: "warning"`을 러너 부재로만 해석하지만 CLI는 파싱 불가 `package.json`에도 warning을 내므로, 매니페스트 수리 대신 러너 설치 분기로 잘못 안내합니다.

최종 판정: **P2 두 건 수정 후 병합 권장**. `git diff --cached --check`, 신규 모듈 syntax check, 현재 저장소 대상 `stack --json` 실행은 통과했습니다.
```

<!-- harness:review kind=codex scope=worktree tip=fbc73d754a2827a62f39e65919efa7372a988168 at=2026-09-17T12:57:12.469Z -->

### 2026-09-17T13:00:08.965Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: fbc73d754a2827a62f39e65919efa7372a988168 · exit 0 · 746 B

```text
전하, P1은 없습니다.

- P2 — `src/detect-testing.mjs:168` — `package.json`이 유효 JSON인 `null`이면 parse 예외를 통과한 뒤 `pkg.dependencies` 접근에서 CLI가 crash하므로, 객체가 아닌 manifest도 `unreadable`로 처리해야 합니다.
- P2 — `src/commands/stack.mjs:82` — `--stack not-a-stack`이 검증 없이 `resolveStack`에 전달되어 실제 Node 프로젝트를 `generic`/`success`로 보고하므로, `init`처럼 `KNOWN_STACK_IDS` 검증이 필요합니다.

P3은 없습니다.

최종 판정: 수정 요청. 두 P2를 처리한 뒤 merge하는 편이 안전합니다. staged/unstaged 전체 diff를 확인했고 `git diff --check`는 통과했습니다. 파일은 변경하지 않았습니다.
```

<!-- harness:review kind=codex scope=worktree tip=fbc73d754a2827a62f39e65919efa7372a988168 at=2026-09-17T13:00:08.965Z -->

### 2026-09-17T13:03:38.736Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: fbc73d754a2827a62f39e65919efa7372a988168 · exit 0 · 667 B

```text
전하, P1은 없습니다.

- P2 — `src/detect-testing.mjs:162`: `readTextSafe()`가 `ENOENT`뿐 아니라 권한/I/O 오류도 `null`로 숨기므로, 읽을 수 없는 `package.json`을 “없음”으로 오인해 `status: success`와 빈 testing profile을 냅니다. 실제 관측 실패는 `unreadable` warning으로 분리해야 합니다.

최종 판정: **P2 수정 후 병합 권장**입니다. `git diff`와 `git diff --cached`를 모두 검토했고, syntax check·현재 저장소 대상 `stack --json` smoke test·두 diff의 whitespace check는 통과했습니다. 전체 `npm test`는 이 읽기 전용 환경에서 실행하지 않았습니다.
```

<!-- harness:review kind=codex scope=worktree tip=fbc73d754a2827a62f39e65919efa7372a988168 at=2026-09-17T13:03:38.736Z -->

### 2026-09-17T13:06:58.498Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: fbc73d754a2827a62f39e65919efa7372a988168 · exit 0 · 302 B

```text
전하, P1/P2/P3 발견 사항은 없습니다.

최종 판정: **Approve**. staged working-tree diff를 검토했고, whitespace check·신규 모듈 syntax check·`stack --json` smoke test도 통과했습니다. 전체 `npm test`는 이번 읽기 전용 리뷰에서 재실행하지 않았습니다.
```

<!-- harness:review kind=codex scope=worktree tip=fbc73d754a2827a62f39e65919efa7372a988168 at=2026-09-17T13:06:58.498Z -->

## Learnings

**5회차 (13:06:58): Approve — P1/P2/P3 없음.** 리뷰가 수렴했다.

### 판별과 조치 (2026-09-17, codex worktree 리뷰)

- **P2 `stack.mjs:68` — 깨진 package.json이 "러너 없음" warning으로 분류됨: 진짜 결함, 수정함.**
  재현: `{ not json`만 둔 디렉터리에서 `stack --json`이 `summary: "…러너 부재 분기를 수행하세요"`와
  `next_actions[0]: "package.json을 파싱할 수 없습니다"`를 동시에 냈다 — envelope 자기모순.
  조치: `UNREADABLE_SUMMARY` 분리 + `runnerMissing`에서 unreadable 제외 + text 모드 러너 줄도 분기.
  회귀 테스트: `summary`가 `러너 부재 분기`를 포함하지 않음을 assert.
- **P2 `stack.mjs:44` — `renderSummary`가 5줄 계약을 지키지 않음: 진짜 결함, 수정함.**
  재현: 모든 축이 감지되는 fixture에서 text 모드가 13줄을 찍었다(문서 계약은 "5줄 이내").
  조치: `packSummary(parts, SUMMARY_MAX_LINES=5)`로 축을 줄에 나눠 담는다. JSON 모드는 원래 한 줄로
  join하므로 영향 없다. 회귀 테스트: 축이 상한보다 많은 fixture에서 `<= 5` + 축 손실·순서 변경 없음.
- **P3 artifact.md EOF 빈 줄 — 오탐(내 회귀 아님).** `src/commands/task.mjs:172`의
  `taskArtifactTemplate`이 `## Learnings\n\n`으로 끝나는 기존 scaffold 동작이고, 모든 task가 같다.
  Learnings를 채우면 사라지므로 템플릿은 건드리지 않았다.

### 판별과 조치 (2026-09-17, codex 2회차 리뷰 — 1회차 수정분 대상)

- **P2 `detect-testing.mjs:159` — 빈 package.json이 "부재"로 분류됨: 진짜 결함, 수정함.**
  재현: `: > package.json` 후 `stack --json`이 `status: success` + "JS 매니페스트 없음"을 냈다.
  원인: `readTextSafe`는 부재에 `null`, 빈 파일에 `''`을 주는데 `!raw`가 둘을 합쳤다.
  조치: `raw === null`로 좁혀 빈 문자열은 `JSON.parse`로 흘려보내 `'unreadable'`이 되게 했다.
- **P2 세 커맨드 문서 — `warning`을 러너 부재로만 해석: 진짜 결함, 수정함.**
  1회차 수정으로 warning이 두 원인(러너 부재·매니페스트 파싱 실패)을 갖게 됐는데 문서를 같이
  고치지 않았다. 조치: 세 문서 모두 "`warning`을 러너 부재로 단정하지 말고 `next_actions`를 읽어라"로 교체.
  — 코드 분기를 늘리면 그것을 읽는 산문도 같은 커밋에서 따라가야 한다는 것을 놓쳤다.

### 판별과 조치 (2026-09-17, codex 3회차 리뷰)

- **P2 `detect-testing.mjs:168` — 객체가 아닌 유효 JSON 매니페스트에서 CLI crash: 진짜 결함, 수정함.**
  재현: `echo null > package.json` → `TypeError: Cannot read properties of null (reading 'dependencies')`.
  `null`·`[]`·`"x"`·`42`는 전부 `JSON.parse`를 통과한다. 조치: parse 직후 객체 여부를 확인해
  `'unreadable'`로 떨어뜨린다. 회귀 테스트는 네 값을 모두 돈다.
- **P2 `stack.mjs:82` — `--stack` 오타 미검증: 진짜 결함, 수정함.**
  재현: vitest가 있는 프로젝트에 `--stack not-a-stack` → `프레임워크: Generic` + `status: success`.
  감지 실패를 감지 결과처럼 보이게 한다. 조치: `init`과 같은 `KNOWN_STACK_IDS` 가드(exit 2, stdout 없음).
  — 새 커맨드에 플래그를 복제할 때 그 플래그의 **기존 가드까지** 복제했는지 확인해야 했다.

### 판별과 조치 (2026-09-17, codex 4회차 리뷰)

- **P2 `detect-testing.mjs:162` — `readTextSafe`의 null이 부재와 읽기 실패를 합침: 진짜 결함, 수정함.**
  재현: `mkdir package.json`(EISDIR) → `manifest: null` + `status: success`. 권한 오류도 같은 경로다.
  조치: `raw === null`일 때 `exists(manifestPath)`로 갈라 파일이 있으면 `'unreadable'`.
  회귀 테스트는 chmod 대신 디렉터리로 EISDIR을 만든다 — 실행 uid와 무관하게 재현된다.

### 학습

- **생성 문서는 `git ls-files` 기반이라 stage 전에는 신규 파일을 못 본다.** `docs:generate`를
  `git add` 전에 돌리면 "최신입니다"라고 답하면서 새 모듈을 표에서 빠뜨린다 — 통과하는 게이트가
  거짓 안심을 준다. 순서는 `git add -A` → `docs:generate` → `docs:check`.
- **리뷰 3회가 전부 새 P2를 냈고 전부 진짜였다.** 1회차 수정이 2회차 결함을 낳았고(warning의
  원인이 둘로 늘었는데 문서를 안 고침), 2회차 수정이 3회차 결함을 드러냈다(`unreadable` 경로가
  넓어지자 비-객체 JSON이 들어옴). 경계 분기를 건드린 뒤에는 **수렴할 때까지** 다시 돌려야 한다.
- **직접 만든 fixture는 감지 규칙의 오류를 못 잡는다.** deep-math·job-scraper 실측이 없었다면
  Python 저장소에 JS 러너 설치를 권하는 안내(`manifest` 축 신설의 계기)를 못 찾았을 것이다.

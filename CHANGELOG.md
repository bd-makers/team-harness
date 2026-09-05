---
tags:
  - project
  - ai
  - obsidian
created: 2026-06-02
modified: 2026-09-05
---

# Changelog

<!--
  유지 방법:
  - 새 변경은 ## [Unreleased] 아래에 추가하세요.
  - 릴리스 시 Unreleased 항목을 새 버전 헤딩(## [X.Y.Z] - YYYY-MM-DD)으로 이동하세요.
  - 형식: Keep a Changelog (https://keepachangelog.com/ko/1.0.0/)
-->

## [Unreleased]

### Changed
- **`summary --write` 가드가 브랜치 이름 대신 커밋을 본다** — 브랜치 이름이 기본 브랜치가
  아니어도 HEAD 커밋이 `origin/<기본브랜치>`와 **정확히 같으면** 원장을 씁니다. 그런 브랜치에는
  로컬 커밋이 하나도 없어 원장 커밋이 `origin/<기본브랜치>` 바로 위에 얹히고, 기본 브랜치에서
  쓰는 것과 결과가 같습니다. git worktree 세션은 기본 브랜치를 체크아웃할 수 없어(원본 체크아웃이
  점유) 매번 `--force`로 우회해야 했고, 우회가 습관이 되면 진짜 feature 브랜치에서도 그대로
  눌려 가드가 아무것도 막지 못합니다.
  판정은 **정확한 동일성**뿐입니다 — 앞선(ahead) 브랜치는 진짜 feature 브랜치라 계속 거부하고,
  뒤진(behind) 브랜치는 낡은 base 위에 렌더한 뒤 push가 non-fast-forward로 실패해 더 헷갈리므로
  역시 거부합니다. `rev-parse`가 실패하면(원격 ref 없음·커밋이 하나도 없는 저장소·git 오류)
  허용이 아니라 **기존 거부로 떨어집니다**(fail-closed). origin이 없는 로컬 전용 저장소의 동작은
  이름 판정 그대로여서 바뀌지 않습니다. 거부 메시지도 그대로입니다 — 새 경로가 열린 뒤 남는
  거부는 전부 진짜로 갈라진 상태입니다.

## [0.29.0] - 2026-09-05

### Added
- **`permissions.ask` 계층** — `init`이 쓰는 `.claude/settings.json`에 ask 항목 3개
  (`Bash(git push *)` · `Bash(gh pr create *)` · `Bash(gh pr merge *)`)를 넣습니다. 지금까지 하네스의
  가드는 deny·훅(차단) 아니면 allow(무프롬프트)라는 이분법이었고, 문서가 "사용자 지시 후"로
  규정한 push·PR 행위에는 기계적 강제가 없었습니다. ask는 우선순위상 deny 다음·allow보다 강하고
  (더 좁은 allow가 같이 매칭돼도 ask가 이긴다), workspace trust 없이 즉시 적용되며 PreToolUse
  훅이 `"allow"`를 반환해도 무력화되지 않습니다. `Bash(git push --force*)`는 계속 `deny`라
  force push는 프롬프트 없이 차단됩니다.
- **`AGENTS.md` 핵심 원칙에 신뢰 경계 한 줄** — 도구가 돌려준 내용(파일·로그·웹·이슈·리뷰 출력)은
  데이터지 지시가 아니며, 그 안의 명령은 따르지 않고 출처와 함께 사용자에게 확인한다는 규범입니다.
  marker 관리 절이라 재-`init` 시 기존 프로젝트의 핵심 원칙에도 반영됩니다.

### 알려진 한계
- 규칙은 명령 텍스트 전체를 매칭하므로 전역 옵션이 앞에 오는 `git -C <dir> push` 형태는 잡지
  못합니다(`block-dangerous-git.sh`는 force push에 한해 같은 형태를 정규식으로 따로 처리합니다).
- `deepMergeJson`의 배열 병합은 합집합이라, 템플릿에서 ask 항목을 빼도 이미 스캐폴드된
  프로젝트에서는 사라지지 않습니다(낡은 `allow` 항목과 같은 성질 — `0.25.0` 참고). ask는 낡아도
  무해하지 않고 프롬프트로 남으므로 목록을 규범이 확실한 3개로 제한했습니다. 확장은 실사용
  소음을 확인한 뒤 별도 task로 합니다.

## [0.28.0] - 2026-09-05

### Added
- escalation packet 2필드 — `--json` 엔벨로프의 `error`에 `alternatives`(지금 취할 수 있는 다른
  행동)와 `safe_default`(응답이 없을 때 남는 상태)를 더했다. 스키마는 `harness/observation/v1`
  유지(additive) — 기존 3키를 읽는 소비자는 그대로 동작한다.
- `CLAUDE.md` §5-A 복잡도 게이트가 escalation 패킷 5항목(결정 요청·권장안·시도한 대안·기다림의
  비용·안전 기본값)을 규정한다 — 기존 "1줄 권유"를 대체한다.

### Changed
- 에러 엔벨로프를 만드는 생산자 9곳이 공용 `buildErrorPacket`/`renderErrorPacket`을 경유한다.
  필드를 빠뜨리면 `TypeError`로 즉시 드러나고, 리터럴 `root_cause:` 사용은 테스트가 막는다.
- text 출력에 `alternatives:`·`default:` 줄이 추가된다(빈 `alternatives`는 줄을 내지 않는다).
  `harness-team done` 가드의 `--force` 안내는 `stop:`에서 `alternatives:`로 옮겼다.

## [0.27.0] - 2026-09-05

### Added
- **`harness-team rules promote` / `/harness-promote` — retro → rules 승격 경로** — `harness-team retro`는 활성 task `artifact.md`의
  `## Learnings`에 append만 했고 학습을 `.claude/rules`로 올리는 코드 경로가 없었습니다(외부 6층 플레이북 비교 분석의 권고 ②).
  새 하위명령이 Learnings 항목을 번호 목록으로 보여 주고(`rules promote`, read-only), 사용자가 고른 항목을
  `rules promote <n> --name <slug> [--paths a,b]`로 `.claude/rules/<slug>.md`에 복사한 뒤 cursor 미러를 재생성합니다. 규칙 본문 첫 줄에
  유래 마커 `<!-- harness:rule origin=<user>/<task> since=<YYYY-MM-DD> -->`가 붙고, artifact 원 항목 끝에는 `(→ rules/<slug>.md, <날짜>)`가
  남아 재승격을 거부합니다. 승격 대상 판단은 사용자 승인이며 LLM 자동 승격은 없습니다. 기존 규칙 파일은 덮어쓰지 않고 artifact 항목은 지우지 않습니다. 대상 이름이
  파일·symlink로 이미 점유돼 있으면(dangling symlink 포함) 거부하고, artifact 표기 쓰기가 실패하면 방금 쓴 규칙을 되돌립니다.
  `--json`은 `harness/observation/v1` envelope입니다.
- **doctor `rule provenance` 경고** — `.claude/rules/**/*.md` 중 유래 마커가 없는 파일을 나열합니다(warning, exit code 영향 없음).

### Changed
- **규칙 템플릿 4종에 유래 마커** — `templates/.claude/rules/{navigation,state-management,styling,testing}.md` 본문 첫 줄(frontmatter 뒤)에
  `<!-- harness:rule origin=harness-aijient-team/templates since=2026-09-05 -->`가 들어갑니다. 이전에 설치된 사본은 doctor가 경고하며, 같은 줄을 직접 추가하면 됩니다.
- **CLAUDE.md 템플릿 자기개선 루프 절** — 반복되는 학습을 `/harness-promote`로 승격하라는 한 줄을 추가했습니다(`init` 재실행으로 `workflow` 관리 구획에 전파).

## [0.26.0] - 2026-09-05

### Added
- **`harness-team observe` — 관측 로그의 첫 소비자** — observe-tools 훅은 도구 호출마다 `.harness/observability/v1/<day>/*.jsonl`을
  써 왔지만 읽는 코드가 없었습니다(외부 6층 플레이북 비교 분석의 권고 ①). 새 read-only 하위명령이 창(기본 7일, `--days 1..14`) 안의
  레코드를 일별·task별·도구 분류별로 집계하고(text는 호출·완료·failed·denied·실패거부율·p95·interrupted 열, `--json`은 succeeded·p50·바이트·usage 토큰까지), 트립와이어 2종 —
  `failure-rate-2x`(오늘 완료 ≥20·실패+거부 ≥5·비율이 직전 날들 평균의 2배) · `repeat-failure-3x`(한 세션에서 같은 도구 3회 실패) —
  를 판정합니다. 발화하면 exit 1이라 훅·CI가 센서로 쓸 수 있습니다. task 참조는 로컬 `.key`와 `docs/<user>/<task>/`로만 되돌리고
  도구 이름은 복원하지 않으며, 깨진 줄·버전 불일치·심볼릭 링크는 건너뛰고 셉니다. `/harness-observe` 슬래시 명령과 Codex
  `harness-observe` 스킬이 함께 들어갑니다. (task `observability-consumer`)

## [0.25.0] - 2026-09-05

### Changed
- **`init`이 쓰는 `.claude/settings.json` 권한 목록이 감지된 패키지 매니저·스택을 따릅니다** — 템플릿에 `pnpm test`·
  `pnpm add *` 등 pnpm 전용 8개와 Expo 전용 항목(`pnpm expo start`·`npx expo install *`, `Edit(./ios/**)` deny)이 고정돼 있어
  npm·yarn·bun 프로젝트는 쓸모없는 항목을 받고 실제 명령은 허용되지 않았으며, 순수 Node·Python 프로젝트에도 Expo 항목이
  들어갔습니다(RN 전용 rules를 스택으로 게이트한 0.23.0 수정과 불일치). 이제 템플릿에는 pm·스택 무관 항목만 남고
  (`templates/.claude/settings.json`), 새 순수 함수 `stackPermissions`(`src/settings-permissions.mjs`)가 스택 프로필의
  install·add·test·lint·typecheck 명령을 허용 항목으로 만들며, RN 계열(`react-native`·`expo`)에만 Expo allow 3종과
  `ios/android` deny 2종을 더합니다. RN 판정은 `excludesRnRules`와 같은 입력(명시 `--stack` > 감지값)이고 `RN_STACK_IDS`는
  새 모듈에서 공유합니다. TypeScript인데 typecheck 스크립트가 없으면 pm별 exec 접두로 `tsc --noEmit`만 허용합니다
  (`npx`·`yarn`·`pnpm`·`bunx`). **알려진 한계**: 기존 settings와의 병합은 합집합이라 이미 스캐폴드된 프로젝트의 옛
  `pnpm …` 항목은 남습니다(무해하지만 낡음) — 필요하면 손으로 지우십시오. 자동 제거는 별도 결정으로 둡니다.
  (task `scaffold-pm-permissions`)

### Fixed
- **`doctor`의 결정 로그 검사가 D6·D7 절 누락도 경고합니다** — `docs/decisions.md`에 D6(적대적 검증)·D7(멤버 제외)이
  추가된 뒤에도 `DECISION_HEADINGS`는 D2/D4/D5에 머물러 있어, 그 이전에 스캐폴드된 프로젝트는 AGENTS.md 코어가
  가리키는 절이 없어도 doctor가 침묵했습니다(스캐폴드는 기존 파일을 덮어쓰지 않으므로 이 경고가 유일한 신호).
  부재 메시지가 나열하는 절 ID도 같은 상수에서 파생해 재드리프트를 막습니다. (task `doctor-decision-headings`)

## [0.24.0] - 2026-09-03

### Removed
- **BREAKING — `apply` 명령을 삭제했습니다** — `runInit`의 별칭이었고(`src/commands/apply.mjs`), `init`이 마커 병합·JSON
  deep-merge로 멱등이라 재실행 동사를 둘 이유가 없었습니다. `/harness-apply` 슬래시 커맨드와 Codex `harness-apply`
  스킬도 함께 사라졌습니다. 기존 프로젝트에는 `init`을 다시 실행하면 됩니다(사용자 텍스트·기존 hooks/rules 보존).
  doctor·migrate가 안내하던 `harness-team apply`는 전부 `harness-team init`으로 바뀌었습니다.
- **BREAKING — OpenCode·Gemini를 하네스 멤버에서 제외했습니다 (D7)** — `GEMINI.md`·`.opencode/opencode.json` 스캐폴드, 역할표 행,
  doctor의 외부 도구·파일 검사, `.gitignore` 항목, 백업 스크립트 ITEMS, 리뷰 엔진 목록(`codex`·`claude`·`custom`)과
  probe 폴백 체인(codex → claude)에서 모두 뺐습니다. `migrate`는 레거시 `GEMINI.md` alias를 다시 만들지 않고
  제거만 합니다. 근거와 재도입 조건은 `docs/decisions.md` D7에 있습니다.

### Fixed
- **관측 훅이 공백·비ASCII 경로에서 조용히 아무것도 기록하지 않던 결함** — `observe-tools.mjs`의 entry 게이트가
  `URL.pathname`(퍼센트 인코딩)과 `resolve(argv[1])`을 비교해 `Mobile Documents` 같은 경로에서 절대 같지 않았습니다.
  `fileURLToPath`로 비교합니다. 이 파일과 `boundary-checkpoint.sh`가 `migrate`의 stock 훅 갱신 목록에 없어 고쳐도
  기존 설치본에 도달할 경로가 없었기에, 둘을 `REFRESHABLE_HOOK_FILES`와 sha 표에 편입하고 doctor CHECKS에
  `block-dangerous-git.sh`·`observe-tools.mjs`를 추가했습니다.
- **마커가 한쪽만 남은 에이전트 파일을 두 번 `init`하면 사용자 텍스트가 지워지던 결함** — 1차는 "섹션 없음"으로
  블록을 끝에 붙이고, 2차는 옛 begin부터 새 end까지를 통째로 치환해 `harness:user` 영역까지 삼켰습니다.
  `mergeMarkdown`이 begin/end 개수 불일치를 거부하고, `init`은 그 파일을 건너뛰며 경고합니다.
- **boundary checkpoint 차단 사유가 Claude에게 보이지 않던 결함** — 실패 출력이 stdout뿐이었는데 Claude Code는 exit 2에서
  stderr만 보여줍니다. checkpoint 경로에서 stderr로도 미러합니다. 또 `Edit|Write`로 배선된 훅이 `Write`를 무시해
  plan 전체를 다시 쓰며 checkbox를 채우면 검사가 돌지 않던 것을 고쳤습니다(`- [X]` 대문자 포함).
- **`.claude/hooks/block-dangerous-git.sh` 우회·오탐** — `git push -fu`·`+refspec`·`git -C <dir> push -f`·
  `push --delete`/`:branch`·`branch --delete --force`·`restore --staged --worktree`·`stash drop|clear`를 막고,
  `--force-if-includes`(안전장치)·`restore -S`·`push -u`·`git log | grep "push -f"`는 통과시킵니다.
  `protect-files.sh`는 경로 경계를 보도록 바꿔 `.envrc`·`src/dev.env.md`·`src/android/builder.ts`·`android/build.gradle`
  편집이 더는 막히지 않습니다(`.env.*`는 settings deny와 같은 범위로 계속 보호).
- **post-commit 훅이 worktree·`core.hooksPath`(husky 등)에서 설치되지 않거나 git이 읽지 않는 곳에 쓰이던 결함** —
  `git rev-parse --git-path hooks`로 실제 hooks 디렉터리를 찾고, "harness"라는 단어만으로 설치됨으로 오판하던
  마커 판정을 `harness-team handoff` 줄로 좁혔습니다.
- **스택 감지** — package.json만 있으면 무조건 TypeScript로 판정하던 것을 tsconfig·typescript 의존성 기준으로
  고쳤고(이 저장소의 AGENTS.md도 이제 JavaScript라고 말합니다), `bun.lock`(텍스트 lockfile)을 bun으로 감지합니다.
  `--stack`은 허용 목록 밖의 값을 exit 2로 거부하고, JS 계열 override는 감지된 패키지 매니저·스크립트를 유지합니다
  (예전에는 모든 명령이 `(configure)`로 지워졌습니다). React Native 전용 rules 4종은 **감지된** stack이 RN 계열일 때만
  설치됩니다 — 예전에는 `--stack`을 명시하지 않으면 Node·Python 프로젝트에도 Expo 규칙이 들어갔습니다. 그 결과
  비-RN 프로젝트에는 `.cursor/rules` 미러가 생기지 않습니다(미러할 규칙이 없으므로).
- **`.gitignore`가 `.harness/`를 통째로 무시해 README가 커밋을 권하는 `backup.json`을 커밋할 수 없던 모순** —
  `.harness/active.json`·`.harness/config.json`·`.harness/observability/`만 무시합니다.
- **`/harness-task done`이 "done"이라는 task를 만들던 문서 결함** — 커맨드 문서의 유일한 실행 줄이 `task $ARGUMENTS`였습니다.
  첫 토큰 `list`·`done`·`handoff`는 별개 하위명령으로 분기하도록 문서를 고쳤습니다.
- **`boundary-checkpoint.sh`가 전역 CLI 부재 시 매 Edit마다 exit 127 에러를 띄우던 것** — SessionStart·post-commit 훅과 같은
  정책으로 조용히 통과하고, doctor의 hook CLI 검사가 `boundary`까지 확인합니다. 파일 모드도 실행 가능(100755)으로 고쳤습니다.
- 문서 정정 — `/harness-review` description이 YAML 주석(`#`)으로 잘리던 것, `sync`가 "symlink 재생성·양방향 동기화"라고
  세 곳에서 주장하던 것(실제는 단방향 미러 + post-commit 훅 재설치), `done`이 task_summary를 갱신한다는 README 문장,
  `init`의 gitignore 미리보기가 실제 목록과 다르던 것, `prerequisites.md`의 devDependencies 서술, `harness-retro`만
  PATH의 CLI를 부르던 것, `harness-release.md`에 MAINTAINING 문서 단계 포인터가 없던 것, `verify` 템플릿 스킬의 `pnpm`
  하드코딩(AGENTS.md `## 명령` 절을 읽도록), `styling.md`의 `Animated` 귀속, `delete.sh`/`clone.sh`의 접두 매치.

- **codex 1차 리뷰가 잡은 후속 결함 6건** — (P1) `block-dangerous-git.sh`가 값 없는 전역 옵션(`--no-pager`·`-p`)과 공백 분리
  `--work-tree <dir>` 프리픽스를 통과시키던 것(원래 패턴에서도 통과하던 사전 결함); (P2) `mergeMarkdown`이 마커 개수만 보고
  `end … begin` 순서 오류를 통과시키던 것 → 문서 순서로 교대·비중첩 검증; (P2) boundary Write 판정이 순증 비교라
  `[ ]→[x]`+`[x]→[ ]` 스왑을 놓치던 것 → 항목 단위 판정; (P2) `settingsHasBoundaryCheckpoint`가 matcher `Edit`만으로
  정상 판정하던 것 → doctor는 Edit·Write 둘 다 요구(migrate는 Edit-only 커스터마이즈를 존중); (P2) post-commit 훅 설치
  판정이 주석 줄의 `harness-team handoff`로도 성립하던 것 → 비주석 줄만; (P3) `--stack` 도움말 목록을 `KNOWN_STACK_IDS`에서 생성.

### Changed
- `--json` 도움말이 `summary`도 나열합니다. `--stack` 허용 목록은 `KNOWN_STACK_IDS`에서 렌더합니다(`expo`·`go` 포함).
- 플러그인 소스 저장소가 자기 하네스를 dogfood하지 않는 관행을 D7에 결정으로 기록했습니다.


## [0.23.1] - 2026-09-01

### Fixed
- **`doctor`의 eager 계층 측정이 실제 상시 로드량을 재도록 고쳤습니다** — 프로젝트 `AGENTS.md`+`CLAUDE.md`만
  세던 `EAGER_TIER_MAX_BYTES`(24 KiB) 검사에 **프로젝트 `.claude/CLAUDE.md`** 와 **사용자 전역 `CLAUDE.md`**
  (`CLAUDE_CONFIG_DIR ?? ~/.claude` 아래)를 더합니다. 셋 다 매 세션 무조건 로드되는 같은 계층인데
  측정에서 빠져 있었습니다.
  - **결함의 근거는 "지금 임계를 넘었다"가 아니라 "넘어도 doctor가 그것을 볼 수 없다"는 사각지대 자체입니다.**
    파일마다 임계를 따로 두면 "프로젝트 15,968(통과) + 전역 8,734(통과) = 24,702(초과)"가 두 줄 모두
    green으로 빠져나갑니다 — 그래서 **예산은 합계에 겁니다.** 컨텍스트 윈도우는 바이트의 출처를
    구분하지 않습니다. 이 변경으로 특정 머신이 바로 노랗게 변하는지는 성공의 척도가 아니며,
    검증은 `CLAUDE_CONFIG_DIR`로 fixture를 가리키는 결정론적 테스트가 담당합니다.
  - 경고 문구가 **파일별 내역**과 **전역 파일의 해결된 실제 경로**를 함께 출력합니다 —
    `CLAUDE_CONFIG_DIR`이 설정되면 `~/.claude`가 아니므로 라벨만으로는 조치 대상을 찾을 수 없습니다.
    처방도 나뉩니다: 프로젝트 파일에는 "절차를 lazy 정본으로" 안내가 붙고, **전역 파일에는 사실만
    보고합니다** — 프로젝트 밖(사용자 소유)이라 하네스는 **읽기만 하며** 조치는 사용자 판단입니다.
  - 전역 파일 **부재·읽기 불가(디렉터리 등)** 시 조용히 건너뛰고 기존 동작을 그대로 유지합니다 —
    CI·컨테이너·새 머신에서 흔한 정상 상태입니다. `CLAUDE_CONFIG_DIR`이 절대경로가 아니면
    (Claude Code 자신도 거부하는 값) 전역 항목을 건너뜁니다 — cwd 기준으로 풀려 프로젝트
    `CLAUDE.md`를 이중 계산하는 것을 막습니다.
  - 여전히 **warning이지 fail이 아닙니다** — 크기만 재고 자동 요약·삭제는 하지 않습니다(0.23.0 판단 유지).
  - `checkEagerTierSize(targetDir, env = process.env)`로 서명을 넓혀 테스트가 격리된 config home을
    주입합니다. 없으면 테스트가 **실행 머신의 진짜 `~/.claude/CLAUDE.md`** 를 읽어 머신마다 결과가 달라집니다.
    e2e·sim 샌드박스 env 빌더(`tests/e2e/sandbox.mjs`, `tests/sim/agentloop.mjs`,
    `tests/sim/codex-agentloop.mjs`)도 같은 이유로 `CLAUDE_CONFIG_DIR`를 핀합니다 — 기존
    `CLAUDE_PLUGINS_ROOT` 핀과 같은 논리입니다. 핀이 없으면 `doctor status === 'success'` 단언이
    레포 밖 파일에 물려, **CI는 green인데 로컬만 red**가 됩니다(외부 리뷰에서 발견·재현).
  - 경고의 처방은 **기여 바이트가 큰 계층부터** 말합니다 — 프로젝트가 10 B, 전역이 24 KiB인
    상황에서 "프로젝트 파일은…"으로 시작하면 초과를 만들지 않은 파일로 독자를 보냅니다.

### Changed
- **`docs/harness-task-guide` 0.23.0 현행화 + 두 가이드 footer 기준 버전 상향.**
  task 가이드의 `doctor` 서술에 0.23.0의 **eager 계층 크기 경고**(`AGENTS.md`+`CLAUDE.md` 합산 24 KiB
  초과 시 경고)를 더했습니다 — **fail이 아니라 warning이라 doctor는 계속 green**이고 대응은 지시 삭제가
  아니라 절차를 lazy 정본으로 옮기는 것이라는 점까지 적었습니다. 세션 nudge 서술에는 재개 후보가
  `plan.md` mtime 순 **최대 8개**로 잘리고 나머지는 `… 외 N개`로 접힌다는 캡을 명시했습니다 —
  **3택 자체는 바뀌지 않았다**는 점을 문장에 못박아 캡을 프롬프트 변경으로 오해하지 않게 했습니다.
  - `harness-fleet-guide`는 **내용을 바꾸지 않았습니다.** 0.23.0 대조에서 고칠 것이 없다고 확인했을
    뿐이라 footer를 `0.23.0 기준 갱신`이 아니라 **`0.23.0 기준 점검`**으로 적었습니다 — 갱신이라고
    쓰면 하지 않은 일을 기록하는 것이 됩니다. `실측 표기는 2026-08-11 확인`은 재측정하지 않았으므로
    그대로 뒀습니다.
  - `docs:check`는 `harness-overview.html`만 검사하므로 이 두 가이드의 footer에는 가드가 없습니다 —
    낡음을 잡아 주는 것은 절차뿐입니다.
  - 이 변경은 ② 소비자 문서라 **별도 릴리스를 하지 않습니다.** 다음 릴리스에 딸려 갑니다.
  - **0.23.1 발행 시점에 한 번 더 고쳤습니다.** 이 가이드의 `doctor` 절은 검사 목록을
    누적 서술하는 **현재 동작 레퍼런스**라, 위 Fixed 항목이 측정 범위를 넓힌 순간
    "`AGENTS.md`+`CLAUDE.md` 합산"이라는 서술이 틀린 사실이 됩니다. 네 파일 합계·전역 파일
    읽기 전용·부재 시 skip을 한 문단으로 더하고 footer를 `0.23.1 기준 갱신`으로 올렸습니다.
    `docs/harness-workflow-simulation`의 같은 문장은 **고치지 않았습니다** — 그쪽은
    `0.23.0` 라벨이 붙은 릴리스 이력 배너의 항목이라 "0.23.0이 무엇을 했나"로서 여전히 참입니다.
- **`docs/harness-workflow-simulation` 0.23.0 현행화 + 스냅샷 추가.**
  이 문서도 hero 배지·배너·footer가 `v0.21.0`에 멈춰 있었습니다(overview와 같은 하드코딩 패턴이지만
  이쪽은 템플릿 없이 파일을 직접 관리합니다). 본문 워크플로우 서술은 손대지 않았습니다 — 0.23.0이 캡을
  건 것은 활성 task가 **없을 때**의 nudge인데 이 시뮬레이션은 활성 task 분기만 보여주므로 서술이 여전히
  정확하기 때문입니다. 그 사실을 배너에 한 줄로 명시해 독자가 캡을 이 흐름에 잘못 적용하지 않게 했습니다.
- **`docs/harness-overview-0.23.0.html` 버전 스냅샷 추가 + `docs/index.html` 등재.**
  이 시리즈의 마지막 스냅샷은 0.21.0이었습니다. 스냅샷은 태그 시점 생성물이 아니라 **그 버전 기준으로
  현행화된 overview의 사본**입니다 — 0.21.0 스냅샷도 태그가 아니라 사후 문서 정합화 커밋에서 떴고,
  태그 시점 파일은 배지가 `v0.18.1`이었습니다. 이번 스냅샷은 배지·배너·footer가 0.23.0으로 맞춰진
  현행 overview와 바이트 동일합니다.
- **릴리스 절차 5단계에 가드 없는 문서 표면 2종의 갱신을 명시.**
  `docs/harness-overview.template.html`의 hero 배지·최신 그룹 배너 산문·footer는 생성물이 아니라
  **템플릿에 하드코딩**돼 있어 `docs:generate`가 손대지 않습니다(자동 갱신되는 것은 커맨드·파일
  인벤토리뿐). 그래서 `docs:check`가 green이어도 낡습니다. `docs/index.html`의 what-changes 목록도
  가드가 없어 빠뜨리면 새 릴리스 노트가 문서 허브에서 도달 불가가 됩니다.
  - 근거는 실제 재발입니다 — **0.22.0과 0.23.0이 연속으로** 이 템플릿을 놓쳐 배지가 두 세대
    (`v0.21.0`) 밀린 채 발행됐고, 0.23.0 릴리스 직후 점검에서야 잡혔습니다. 두 릴리스 모두
    `docs:check`는 green이었습니다.
  - 절차에 **결합 강도 순서**를 함께 적었습니다: `what-changes-*`(3방향 강제) >
    `harness-overview`(생성+pin, 산문은 무방비) > `prerequisites.md`(doctor 양방향) >
    `index.html`·simulation·guide류(가드 0). 가드가 약한 표면일수록 절차가 유일한 방어선입니다.
  - 이 변경 자체는 ③ 메인테이너 전용이라 **릴리스하지 않습니다.** 다음 릴리스에 딸려 갑니다.
- **워크플로우 다이어그램 문서 2종 추가 + `docs/index.html`·README 문서 표 등재.**
  `docs/harness-workflow-diagrams.html`(mermaid 5관점 — 플로우차트·역할 스윔레인·시퀀스·상태·
  gitGraph)과 같은 워크플로우를 정적 inline SVG 5단면으로 그린 `docs/harness-workflow-schematics.html`
  입니다. **두 벌인 이유는 렌더 환경이 갈리기 때문입니다** — mermaid 판은 렌더에 JS가 필요해
  브라우저에서만 보이고, Obsidian 볼트는 script를 제거하므로 볼트에서 읽는 독자에게는 SVG 판이
  유일하게 렌더되는 사본입니다.
  - 이 변경은 ② 소비자 문서라 **별도 릴리스를 하지 않았습니다.** 이 릴리스에 딸려 갑니다.
- **`docs/harness-overview-0.23.1.html` 스냅샷은 뜨지 않았습니다 — 근거를 남깁니다.**
  스냅샷의 정의는 "그 버전 기준으로 현행화된 overview의 사본"인데, 재생성한
  `harness-overview.html`과 `harness-overview-0.23.0.html`의 차이는 hero 배지·배너 제목·
  배너 한 줄·footer **4곳뿐**이고 커맨드·파일 인벤토리는 바이트 동일합니다(슬래시 커맨드 24개 그대로).
  이 시리즈는 릴리스마다가 아니라 **내용이 실제로 갈릴 때만** 떠 왔으므로
  (0.7.0·0.8.0·0.9.2·0.9.5·0.12.0·0.14.0·0.18.1·0.21.0·0.23.0), 사실상 중복 사본을 더하면
  시리즈의 신호가 흐려집니다. 같은 이유로 `docs/index.html`의 overview 스냅샷 목록도 손대지
  않았습니다 — 이번에 등재한 것은 what-changes 목록뿐입니다.

## [0.23.0] - 2026-08-30

### Added
- **`doctor`에 eager 계층 크기 경고 신설.** 매 세션 무조건 로드되는 지시 계층
  (`AGENTS.md` + `CLAUDE.md`)의 UTF-8 합산이 24 KiB(`EAGER_TIER_MAX_BYTES`)를 넘으면 경고합니다.
  TCC에는 6 KiB 예산이 있었지만 정작 always-on 계층에는 예산도 검사도 없었습니다.
  **차단이 아니라 경고입니다** — 문서가 커지는 데에는 정당한 이유가 있을 수 있어 판단은 사람 몫이고,
  검사는 자동 요약·삭제 없이 크기만 결정론적으로 잽니다(TCC 예산과 같은 철학). 임계값 24 KiB는
  이 저장소 도그푸딩 실측(~16 KB)의 1.5배입니다. `MAINTAINING.md`에 "절차는 lazy 정본(커맨드
  문서·스킬)으로 옮긴다"는 지침을 함께 실었습니다.

### Changed
- **`templates/CLAUDE.md.hbs`에 auto-memory와 `artifact.md`의 저장 경계를 명시.**
  Claude 5 세대가 학습을 개인 메모리에 자동 저장하면서, **팀이 공유해야 할 학습이 한 사람의
  로컬로 새어 SSOT에서 사라지는 경로**가 생겼습니다(개인 메모리는 다른 팀원·리뷰 엔진에게
  보이지 않습니다). 팀·프로젝트 학습은 활성 task의 `artifact.md`에, 개인 선호·머신 환경만
  auto-memory에 두고 **겹치면 `artifact.md`가 우선**임을 자기개선 루프(§3)에 못박았습니다.
- **`templates/CLAUDE.md.hbs` §4·§5·§6을 판단 기반으로 압축(72 → 69줄).**
  완료 전 검증·우아함 추구·자율 버그 수정의 서술형 불릿을 줄이고, 무엇을 어디까지 할지는
  모델 판단에 맡겼습니다. 페르소나 호출 순서 같은 **레버와 예외("작은 버그·문서 수정에는 생략")는
  그대로 유지**했습니다 — 줄인 것은 서술이지 장치가 아닙니다. 근거는 두 가지입니다: Anthropic의
  Claude 5 컨텍스트 엔지니어링 지침(시스템 프롬프트 80% 삭제에도 코딩 평가 손실 없음)과, 이
  저장소의 0.8.0 도그푸딩 기록(선언 레버 9개 중 실제 가동 1개). **`AGENTS.md`는 건드리지
  않았습니다** — Codex·Gemini·Cursor·OpenCode가 공유하는 규범이라 준수가 서술의 명시성에
  의존하므로, 판단 기반 전환은 Claude 전용 파일에만 적용했습니다.
- **`session-context`의 유일한 무상한 출력 경로에 상한.** 활성 task가 없을 때 띄우는 nudge가
  미완 task를 한 줄씩 **전부** 나열해, task를 닫지 않는 프로젝트에서 SessionStart 주입이 선형으로
  커졌습니다(이 저장소 기준 71개 task 디렉터리). 최근 활동순(`plan.md` mtime 내림차순, 동률이면
  user → name 오름차순)으로 최대 8개(`SESSION_CONTEXT_MAX_TASKS`)만 나열하고 나머지는
  `… 외 N개 (harness-team list로 전체 확인)` 한 줄로 요약합니다. 스캔 도중 task가 이동·삭제돼도
  그 항목만 건너뛰고 주입 전체가 실패하지 않습니다.
- **`MAINTAINING.md`에 "릴리스 크기 판단 — 특히 문서 전용 변경" 절 신설.**
  0.22.0이 **첫 문서 전용 릴리스**였는데 기준이 없어 minor/patch 판단이 즉석에서 이뤄졌다.
  기준을 새로 발명하지 않고 이력에서 도출했다 — 판단축은 semver 문자가 아니라 **blast radius**다.
  - 표면을 3계층으로 갈랐다: ① 에이전트 행동 표면(`templates/**`는 `apply`가 소비자 프로젝트에
    복사, `commands/`·`skills/`·`src/`는 플러그인 채널로 배포 — `templates/`에 없다),
    ② 소비자가 읽는 문서(`docs/*.html`·`README.md` — 캐시에는 복사되지만 프로젝트엔 안 쓴다),
    ③ 메인테이너 전용(`MAINTAINING.md` — 어디에도 배포되지 않아 **릴리스 레인이 없다**).
    ①의 근거는 0.16.1이다 — `commands/*.md`의 한 줄(`< /dev/null` 누락)이 이 하네스를 쓰는
    모든 프로젝트에서 재발했고, 문서 수정이지만 patch로 발행됐다.
  - "깔끔한 semver를 기대하지 말라"를 명시했다 — `0.18.1`은 patch인데 `### Added`를 담고 있다.
    이 절이 자기 저장소에 대해 거짓이 되지 않게 하려는 것이다.
  - 크기와 무관하게 **모든 릴리스가 what-changes 문서를 요구한다**는 사실을 못박았다
    (`tests/what-changes-latest-version.test.mjs`가 3방향 강제 — 빠뜨리면 태그 push에서 빨개진다).
  - 파괴적 변경 표기가 갈려 있던 것을 규범으로 통일했다 — 0.19.0은 CHANGELOG에 `BREAKING:`을
    적었지만 0.21.0은 커밋 마커와 what-changes에만 적어 **CHANGELOG 절에는 그 단어가 없다.**
    소비자가 먼저 보는 곳(CHANGELOG = GitHub Release 본문)에 적는 것을 정본으로 삼았다.
  - `0.22.0`은 이 기준 이전에 발행됐고 이 기준이면 ②에 해당해 patch였다는 사실을 기록했다.
    선례로 인용되지 않게 하려는 것이다.
  - 이 변경 자체가 ③이라 **릴리스하지 않는다.** 다음 릴리스에 딸려 간다.
- **위 절의 사실 오류 정정 — ③계층의 "도달 경로".** 초판이 `MAINTAINING.md`를 "어디에도
  배포되지 않음"이라고 적었는데 **틀렸다.** 버전별 캐시는 `tests`·`scripts`·`docs/superpowers`만
  빼고 트리 전체를 복사하므로 `MAINTAINING.md`도 들어간다(0.22.0 캐시에서 실측 확인).
  계층을 가르는 진짜 기준은 "배포되느냐"가 아니라 **누가 읽고 무엇이 그대로 동작하느냐**이며,
  그 문장을 표 아래에 명시했다. 문서가 틀린 사실을 말하는 것을 고치자고 만든 절이 스스로
  틀린 사실을 담고 있었다.
- **task spec 템플릿 `## 참고` 섹션에 코드 기반 참조 우선 안내를 내장.**
  산문 설계보다 테스트 스위트·Boundary contract(JSON Schema)·다이어그램·기존 코드 경로가
  더 정밀한 참조라는 안내를 템플릿에 직접 실었다 — 새 task부터 spec 작성 시 산문 대신
  코드 기반 참조를 먼저 찾도록 유도한다(Claude 5 컨텍스트 엔지니어링 검토 후속).

### Fixed
- **`copyStaticAssets`가 React Native 전용 rules 4종을 모든 stack에 무조건 복사하던 결함.**
  `navigation.md`·`state-management.md`·`styling.md`·`testing.md`(Expo Router 등 RN 전용
  가이드)가 `--stack python|node|generic` 같은 비-RN 프로젝트에도 그대로 복사됐다. 명시적
  비-RN `--stack`에는 이 4종을 제외하고, RN 계열(`react-native`)과 `--stack` 미지정(자동감지
  경로, 하위 호환)에는 기존 동작을 그대로 유지하도록 게이트했다.

## [0.22.0] - 2026-08-29

### Changed
- **소비자 문서 5종 0.21.0 현행화** — 벤더링되지 않은 스킬 목록 + 전체 스킬 로스터 +
  overview·fleet·task 가이드의 버전 정합. 세 HTML 가이드가 모두 0.18.1 세대에 멈춰 있어
  0.19.0–0.20.0이 인도한 것(Node 24 · 판정 창 `firstActivatedAt` · D6 검증자 · `verify` 증거 키)이
  **문서 어디에도 없었다** — 특히 done 가드는 세 문서가 입을 모아 "6종"이라고 말하고 있었다.
  - `docs/prerequisites.md` §5: "벤더링되지 않은 스킬 — 미리 설치해야 켜지는 것" 절 신설.
    번들 여부의 전체 인벤토리를 명시했다 — `/harness-*` 커맨드·스킬 24종(+Codex 전용 스킬 2종)은
    전부 플러그인 번들이라 별도 설치가 없고, 비번들은 `diagram-design` 하나뿐이다. 설치 명령과
    없을 때의 degrade 동작(probe → degrade → record, doctor 미검사 사유)을 표로 정리.
    핀 갱신 절차·번들하지 않는 이유는 README 동반 플러그인 절이 계속 정본이다.
  - `docs/harness-workflow-simulation.html`: 0.18.1에 멈춰 있던 것을 0.21.0 기준으로 갱신.
    0.19.0–0.21.0 배너(Node ≥ 24 · D6 적대적 검증 · 옛 리뷰 이름 제거), done 종결 가드
    6종 → **7종**(`verify` 증거 키)·선언 기본값·판정 창 `firstActivatedAt`, S7에 정합
    검증(shipcheck) 단계 추가, 다이어그램 옵트인의 실행 주체가 `/harness-diagram` 어댑터임을
    본문에 명시(그동안 옵트인을 설명하면서 실행 커맨드를 한 번도 이름으로 부르지 않았다),
    그리고 **전체 스킬 로스터 표**(24 커맨드 + 커맨드 없는 스킬 2종, 옵트인 여부 배지) 신설.
    스냅샷 `harness-workflow-simulation-0.21.0.html`을 남기고 `docs/index.html` 버전 목록에 등재.
  - `docs/harness-overview.template.html` → `docs/harness-overview.html` 재생성: hero·footer의
    v0.18.1 표기를 v0.21.0으로 올리고, 0.19.0에서 이미 출시된 내용(Node 24·`firstActivatedAt`)을
    아직 미래형으로 예고하던 **"⚠️ 다음 릴리스 예고" 블록을 출시 사실로 전환** —
    0.19.0–0.21.0 배너 그룹으로 대체(문서에 미래 릴리스 번호를 남기지 않는 원칙).
    생성 인벤토리(커맨드 표 등)는 이미 0.21.0 기준이었고 산문·버전 라벨만 낡아 있었다.
    스냅샷 `harness-overview-0.21.0.html`을 남기고 `docs/index.html` 버전 목록에 등재.
  - `docs/harness-task-guide.html`: 버전 라벨(title·nav·eyebrow·tag·footer)과 라이프사이클
    SVG의 게이트 문구를 0.21.0/**가드 7종**으로. `## Done evidence` 절에 `verify` 키 설명
    (검증 프레이밍 kind만 증거로 세며, 검증 마커는 review를 겸하지만 역은 성립하지 않는다)과
    "가드는 마커의 존재·kind·시각만 읽는다"는 D6 경계를 추가. §8에 판정 창 `firstActivatedAt`
    문단과 검증 마커 가드 행, 페르소나 절에 contrarian·simplifier의 외부 엔진 모드와 interview
    선행 채점, 리뷰 절에 kind 접미사 규약을 추가.
  - `docs/harness-fleet-guide.html`: 같은 버전 라벨 갱신 + 완료 판정 증거를 가드 7종으로,
    체크시트의 `# 6종:` 주석과 §7 종결 단계 주석을 7종으로. D6 콜아웃 신설(검증자는 반박만
    하고 고치지 않으며 반영은 작성 세션이 단일 스레드로 — 크루 운용에서 워커 보고서의
    "다 됐습니다"를 대체하는 증거가 된다), 재활성화가 판정 창을 밀지 않는다는 항목,
    "리뷰를 돌렸는데도 검증 마커 없음으로 막힌다" 함정 행 추가.
  - 두 가이드는 버전 스냅샷을 두지 않는 관례(0.19.0도 제자리 갱신)라 그대로 갱신했다.
    남아 있는 `0.18.1` 표기는 전부 **기능이 도입된 릴리스**를 가리키는 역사적 귀속이라 유지.
  - `docs/what-changes-latest-version.html`을 0.22.0 내용으로 갱신하고 동일 내용을
    `docs/what-changes-0.22.0.html` 스냅샷으로 남겼다(`docs/index.html` 목록에 등재).
    이 세트에 없던 표 스타일(`.table-wrap`)을 이 문서에 추가했다 — 문서×생성×가드×낡은 정도의
    4열 대조는 카드보다 표가 정확하다.

## [0.21.0] - 2026-08-29

### Added
- **`docs/harness-rubric-guide.html` — 루브릭 평가(D6) 가이드** (task `root-docs-0200-rubric`).
  finding 스키마(id·항목·심각도·판정·근거), 검증 프레이밍 5종(adversarial·testcritic·
  shipcheck·contrarian·simplifier) + interview 선행 채점, 엔진 층(probe 폴백 체인·claude
  엔진의 컨텍스트 분리 한계), 마커 계약과 `verify` 증거 게이트를 한 문서로 묶었다.
  0.20.0이 D6를 4단계로 완성했는데 규범(decisions.md)·절차(커맨드 5곳)·구현(src)에 흩어져
  있어 전체 그림을 보여 주는 문서가 없었다. 기존 가이드와 같은 디자인 토큰의 **자립형
  inline SVG**(script를 제거하는 뷰어에서도 렌더)로 작성, `docs/index.html` Guides와
  README 문서 표에 등재.

### Changed
- **루트 문서 0.20.0 정합화** (task `root-docs-0200-rubric`).
  - `README.md`: D6 언급이 0곳이었다 — 설계 스코프 문단에 검증자 계층 1문단, 명령어
    레퍼런스에 `/harness-review`·`/harness-adversarial-review` 절, task 관리에
    **Done evidence** 절(`tests`·`review`·`verify` 키와 기본값)을 추가. v0.6.2에서 멈춰
    있던 "변경 이력" 절은 CHANGELOG.md·what-changes 포인터로 교체(정본 중복 제거).
    문서(HTML) 표에 index·task guide·fleet guide·rubric guide 등재.
  - `MAINTAINING.md`: "필수 검증"의 `node --test tests/`를 `npm test`로 정정 — 디렉터리
    글롭은 perf 스위트의 `--test-concurrency=1` 격리를 건너뛰어 0.19.0에서 잡은 부하성
    flake를 되살린다. 작업 규칙에 verify kind 접미사의 양방향 동기화 표면
    (`commands/harness-review.md` 5단계 ↔ `src/commands/task.mjs` `VERIFY_KIND_SUFFIXES`)
    을 추가.
  - `docs/prerequisites.md`: §2·§7이 여전히 옛 리뷰 커맨드 이름(`/harness-codex-review` 등)
    을 안내하고 있었다 — 0.19.0 엔진 중립 재편 이후 이름으로 정정(포워딩은 남아 있지만
    문서가 옛 이름을 권하지는 않는다는 0.19.0 Notes의 원칙 적용).
- **옛 이름을 안내하던 문서 정정** — 위 제거의 동반 갱신 (task `deprecated-review-carryover`).
  포워딩만 지우면 "0.19.0에서 제거됩니다"라고 적힌 안내가 그대로 남아, 이미 제거된 것을
  미래형으로 예고하는 문서가 된다.
  - `README.md` 3곳 — 슬래시 커맨드 개수 26 → 24
  - `docs/harness-fleet-guide.html`·`docs/harness-task-guide.html` 각 2곳,
    `docs/harness-workflow-simulation.html` 2곳 — "0.19.0에서 제거" 예고를 제거 완료 사실로 정정.
    릴리스 번호를 새로 박지 않고 완료 시제로 쓴다 — 번호를 박으면 이월 때마다 또 틀린다.
  - `commands/harness-diagram.md` — 어댑터 역할 유추 대상을 `harness-review`로 교체
  - `docs/harness-overview.html` 재생성. 버전 스냅샷(`docs/harness-overview-*.html`·
    `what-changes-*.html`·`harness-workflow-simulation-0.18.1.html`)은 발행된 기록이라 손대지 않는다.

### Removed
- **옛 리뷰 이름 4개 제거 — 3릴리스 이월 끝** (task `deprecated-review-carryover`).
  0.17.0에서 엔진 중립으로 재편(`/harness-review`·`/harness-adversarial-review`)하며
  1개 마이너 수명으로 남긴 deprecated 포워딩이 0.18.0·0.19.0·0.20.0 세 릴리스를 살아남았다.
  제거의 선행 조건이던 **팀원 머신 전역 `~/.claude/CLAUDE.md`의 새 이름 전환**이 2026-08-28
  홈 머신(hsonpro) 확인으로 두 머신 모두 충족돼 게이트가 닫혔고, 이번에 실제로 지운다.
  - `commands/harness-codex-review.md`·`commands/harness-codex-adversarial-review.md`
  - `skills/harness-codex-review/`·`skills/harness-codex-adversarial-review/` (디렉터리째)
  - `.claude-plugin/plugin.json` commands 배열의 위 커맨드 2개 항목 — 슬래시 커맨드 26개 → **24개**
  - `skills/harness-codex-sim`은 **별개 스킬**이며 제거 대상이 아니다(이름이 비슷해 grep 오탐을 부른다).
  - 대체 경로: `/harness-review codex`·`/harness-adversarial-review codex`. 엔진 인자를 생략하면
    probe 폴백 체인(codex → gemini → claude)이 첫 가용 엔진을 쓴다.

### Notes
- **0.20.0 이월 기록 누락 정정** (task `deprecated-review-carryover`). 0.19.0 Notes는
  옛 리뷰 이름 4개(`/harness-codex-review`·`/harness-codex-adversarial-review`의 커맨드·스킬,
  포워딩 4개) 제거를 0.20.0으로 다시 이월하며 **"다시 이월한다면 그 사실을 그 릴리스의
  이 절에 적는다"**는 규칙을 스스로 정했다. 0.20.0은 제거를 수행하지 않았는데 그 절에
  이월 언급이 없다 — 자기 규칙 위반이다. 발행된 0.20.0 절은 소급 수정하지 않고
  여기 정정 기록으로 남긴다.
  - 사실 관계: 포워딩 4개(`commands/harness-codex-review.md`·
    `commands/harness-codex-adversarial-review.md`와 동명의 스킬 2개)는 0.20.0 트리에
    **그대로 남아 있다.** 이는 실수로 남은 것이 아니라 **의도된 하위 호환**이다 —
    제거의 선행 조건인 팀원 머신 전역 `CLAUDE.md`의 새 이름(`/harness-review codex` 계열)
    전환이 릴리스 시점에 확인되지 않았다(회사 머신은 전환 확인, 홈 머신은 미확인).
    옛 이름을 부르는 안내가 살아 있는 동안 포워딩을 지우면 그 안내가 그대로 실패한다는
    0.19.0의 이월 사유가 그대로 유효했다.
  - 제거는 **홈 머신 전역 `CLAUDE.md` 전환 확인 후 0.21.0 목표**로 이월했다.
    그 확인이 2026-08-28에 완료돼 게이트가 닫혔고, 제거는 이 릴리스에서 수행했다 —
    위 `### Removed` 참조. 이월은 여기서 끝난다.

## [0.20.0] - 2026-08-28

### Added
- **D6 — 적대적 검증(작업 단위 read-only 검증자 + 루브릭) 규범** (task `adversarial-verify-rubric`).
  결정론적 가드는 "기록했는가"만 강제하고 품질 판단은 작업자 자신에게 남아 있었다 —
  0.19.0 조사에서 비평 목적의 서브에이전트·외부 엔진 사용이 review·sim 계열 밖에는 0곳으로
  확인됐다. D6는 이를 D2(작성자·리뷰어 분리)의 작업 단위 적용으로 규범화한다.
  - `docs/decisions.md`·`templates/docs/decisions.md`(byte-identical)에 D6 전문 —
    finding 스키마(id·항목·심각도 BLOCKER/MAJOR/MINOR·판정·근거), 정직성 규칙(산문은 신호가
    아니다), 검증자→작업자 자동 수정 루프 금지. `AGENTS.md`·`templates/AGENTS.md.hbs` 결정
    규범에 요약 1줄 짝수정.
  - `commands/harness-review.md` 마커 계약에 `kind=<engine>-<프레이밍>` 접미사 규약 명문화
    (`-adversarial`·`-testcritic`·`-shipcheck`) — done 가드가 kind를 목록 대조하지 않아
    코드 변경 없이 오늘 동작하는 확장점임을 문서화.
  - 테스트 3형제(`harness-unittest`·`harness-comptest`·`harness-inttest`) 6단계에
    **검증자 인계(옵트인)** + testcritic 루브릭 — 기존 자가점검(뮤테이션 사고실험·mock 반향·
    tautological)을 finding 표로 승격하고, 중요한 변경이면 별도 컨텍스트 검증자가 채점한다.
  - `commands/harness-ship.md`에 7번 **정합 검증** 단계 + shipcheck 루브릭 — PR 직전 문서↔diff
    정합(spec 대응 구현·plan 체크 실재·스코프 밖 변경·리뷰 기록·증거 인용)을 별도 검증자가
    반박한다. 준비 완료 보고는 8번으로 재번호, 보고 항목에 정합 검증 상태 추가.
  - 회귀 고정: `tests/agent-files.test.mjs`에 D6 전문/요약 보존과 kind 접미사 소비 표면
    4곳 일치 테스트 추가.
  - 범위 제외(후속): contrarian/simplifier external 엔진 옵션, interview 채점 선행,
    done 가드 `verify` evidence 키·kind allowlist(src 변경), AO 워커 §8 검증 슬롯.
- **D6 3단계 — 페르소나 층 외부 검증** (task `persona-external-verify`). 1–2단계가 코드·ship
  층에 검증자를 붙였다면, 이번에는 spec/plan **문서 층**이다 — 반론자·제거자가 문서를 쓴
  세션 자신이면 sunk-cost 편향이 비평을 무디게 한다.
  - `commands/harness-contrarian.md`·`commands/harness-simplifier.md`에 **외부 엔진 모드**
    (옵트인): 첫 토큰이 엔진(`codex`·`claude`·`gemini`·`custom`)이면 4각도 반론(A1–A4)·
    4체크 제거 후보(R1–R4)를 별도 컨텍스트의 read-only 검증자가 D6 finding 스키마로 채점한다.
    절차·엔진 표는 `/harness-review` 재사용, scope 결정만 제외(대상이 diff가 아니라 task
    문서) — 마커는 `kind=<engine>-contrarian|-simplifier scope=task-docs`. 반영은 대화형과
    동일하게 driver가 사용자와 판별 후 수행한다(자동 수정 루프 금지).
  - `commands/harness-interview.md`에 **선행 채점** 단계: 질문 전에 spec 텍스트 증거만으로
    4차원을 pass/fail/na로 채점하고, fail/na 차원만 질문하며, Ambiguity 체크박스는 채점표에서
    pass가 된 항목만 갱신한다(증거 없는 pass는 na — D6 정직성 규칙). 외부 엔진은 쓰지 않는다 —
    문답은 여전히 사용자와의 대화다.
  - `commands/harness-review.md` kind 접미사 열거에 `-contrarian`·`-simplifier` 추가,
    `tests/agent-files.test.mjs` 소비 표면 pin 4→6곳 확장 + interview 선행 채점 pin.
  - 범위 제외(후속 = 4단계): done 가드 `verify` evidence 키·kind allowlist 등 src 변경,
    sim 순수 채점 함수 rule 층 승격, AO 워커 §8 검증 슬롯.
- **D6 4단계(최종) — 검증 증거의 결정론적 게이트 연결** (task `verify-evidence-gate`).
  1–3단계가 문서 층에 심은 검증 마커 계약을 src + 유닛테스트로 닫는다.
  - done 가드에 **`verify` evidence 키** (`src/commands/task.mjs`): Done evidence 선언에
    `verify: required|optional`(기본 optional — review와 같은 근거) 추가. required면 판정 창
    안에 **검증 프레이밍 kind** 마커가 artifact에 있어야 done을 통과한다.
  - **verify kind allowlist**: `VERIFY_KIND_SUFFIXES`(`-adversarial`·`-testcritic`·
    `-shipcheck`·`-contrarian`·`-simplifier`) 접미사로 끝나는 마커만 verify 증거로 센다 —
    일반 `review` 증거는 현행대로 kind 비대조. 검증 마커는 review 증거를 겸하지만 역은
    성립하지 않는다. 열거의 정본은 `commands/harness-review.md` 5단계이며 src 상수와의
    양방향 동기화를 pin 테스트로 고정. 가드는 마커 존재·kind·시각만 읽는다(D6: finding 내용
    판정은 결정론 게이트 밖). spec 템플릿 주석에 `verify` 키 문서화.
  - **sim 순수 채점 함수 rule 층 승격**: `tests/sim/rules.mjs` 신설 — `agentloop.mjs`의
    순수 채점 함수(sig·na·manual·scoreSpecArtifacts·aggregateTrials·renderSignals 등)를
    이동해 하네스(I/O)와 규칙(순수)을 층으로 분리, 동작 불변.
    `codex-agentloop.mjs`·`skilltest.mjs`의 유사 헬퍼는 구현이 달라(절단 한도·ico 폴백·
    sanitize 유무) 통일하지 않고 차이만 기록.
  - **AO 워커 §8 검증 슬롯** (`docs/ao-worker-rules.md`): 보고 계약에 외부 검증 항목
    (kind·요약 또는 미실행 사유) 최소 추가.
  - 회귀 고정: `tests/done-guard.test.mjs`에 verify 케이스 6종(일반 마커 차단·allowlist 전
    접미사 통과·review 겸용·창 밖 무효·기본 optional·선언 검증) + allowlist↔문서 동기화 pin.

### Fixed
- **`done` 이후 사용자 handoff 가 영구 동결되던 결함** (task `done-user-handoff-freeze`).
  `docs/<user>/<user>-handoff.md`는 `AGENTS.md`가 규정한 **세션 진입점**인데, `runDone`은
  task handoff만 갱신하고 활성을 `null`로 비웠고, 이 파일을 쓰는 **유일한** 경로인
  `runHandoffAuto`(post-commit 훅)는 활성이 null이면 즉시 반환했다. 맞물린 결과 종결 직후
  파일이 마지막 활성 커밋 상태로 얼어붙어, 다음 세션이 **이미 끝난 task를 활성으로 안내**했다.
  특정 task의 문제가 아니라 구조적이다.
  - `runDone`이 종결 시점에 **1회** 종결 형태로 쓴다. 훅의 early return은 그대로 둔다 —
    없애면 활성 없는 기간의 모든 커밋이 이 파일을 재작성해 diff 소음이 되고, 활성이 null이면
    가리킬 task를 몰라 포인터를 만들 재료도 없다.
  - 쓰기 지점은 가드 **뒤**의 공유 tail이다. 차단된 `done`은 파일을 건드리지 않는다 —
    active.json은 task를 가리키는데 진입점만 "활성 없음"이 되면 같은 종류의 거짓말이 된다.
  - 종결 형태에는 커밋 sha를 담지 않는다. 종결 후 훅이 더는 갱신하지 않으므로 박아 둔 sha는
    다음 커밋 즉시 낡는다 — 계속 갱신되는 task handoff를 가리킨다(형식 기준: `bbbc885`).
  - 두 형태(활성·종결)를 순수 렌더러 `renderUserHandoff` 하나로 모아 형식 드리프트를 차단.
  - 회귀 고정: `tests/user-handoff.test.mjs` 12케이스(종결 후 활성 미선언·Last Completed 분리·
    sha 부재·파일 부재 시 생성·차단 시 바이트 무변경·`--force` 갱신·활성 없음 무변경·렌더러 3종).

- **`node:test` 역직렬화 flake 해소 — 확인됨** (task `node-test-runner-flake`).
  0.19.0 Notes는 "`node-version: 24`가 최신 24.x로 해석되므로 24.20.0이 나오면 자동으로
  해소된다"고 적었다. **그 전제가 틀렸다.** 24.20.0이 게시된(2026-08-27) 뒤에도 rerun과
  새 `pull_request` 런을 포함해 모든 런이 `runtime v24.19.0`을 기록했다 —
  `actions/setup-node`는 `check-latest`가 꺼져 있으면 dist 매니페스트를 **조회조차 하지 않고**
  `tc.find('node','24')`로 러너 이미지 toolcache를 먼저 보기 때문이다
  (v5 `base-distribution.ts`, `setupNodeJs` → `findVersionInHostedToolCacheDirectory`).
  당시 `ubuntu-latest` 이미지(`ubuntu24/20260823.283`)의 toolcache는 22.23.2/24.19.0이었고
  24.19.0이 `24`를 만족했다. **이미지가 캐시한 패치 릴리스가 실질적인 pin이었다.**
  - `.github/workflows/test.yml`의 setup-node 스텝에 **`check-latest: true`** 추가 —
    해석을 이미지가 아니라 매니페스트에 묻게 한다. 같은 파일 matrix 주석의 거짓 주장
    ("this job picks it up automatically once released")을 실제 메커니즘·근거·관측값으로 교체.
  - **검증: `runtime v24.20.0`에서 5회 연속 green** (run 33147199419 attempt 1~5, 커밋
    `30d1273`). 확률적 flake라 1회 통과는 증거가 되지 않으므로 반복으로 확인했다.
    setup-node 단계는 toolcache 히트일 때 0~1초에서 매니페스트 경로로 바뀌며 5~13초가 됐다 —
    다운로드 실패로 깨진 런은 없었고, 따라서 green streak는 네트워크 운이 아니라
    패치된 런타임에 귀속된다.
  - matrix `[24]`·`engines ">=24"`는 그대로다. 정확한 패치 버전 pin·자동 재시도·`22` 추가는
    채택하지 않았다.

### Changed
- **문서 내비게이션 허브 신설과 릴리스 노트 가독성 정리** (커밋 `fc9f586`).
  `docs/`가 버전별 스냅샷으로 늘어나면서 어디서부터 읽어야 하는지가 사라졌다.
  - `docs/index.html` 신설 — 버전별 overview·simulation, what-changes 릴리스 노트,
    다이어그램 소스, task 원장으로 가는 로컬 내비게이션 허브. **손으로 관리하는 정적
    페이지이며 빌드 산출물이 아니다**(`npm run docs:generate` 대상 아님).
  - 릴리스 노트 콜아웃의 버전 항목 구분자를 `·`에서 `<br>`로 바꿔 버전마다 한 줄씩 읽히게
    했다 — overview·simulation의 현행본·template·버전 스냅샷 전체에 동일 적용.
  - `.tree` 블록에 `white-space: pre-wrap` — 긴 트리 라인이 잘리지 않고 접힌다.
  - 현행 simulation 문서의 예시를 실제 산출물과 맞췄다 — `.harness/active.json`은
    user·task·path·switchedAt 전체 형태로, `<name>-meta.json` 주석에 `firstActivatedAt` 포함.
  - 이번 릴리스에서 허브의 what-changes 목록에 `0.19.0`(누락분)과 `0.20.0`을 등재했다.

## [0.19.0] - 2026-08-26

### Added
- **`harness-sim` SC7 — `/harness-spec` 산출물 검증 시나리오** (task `sim-spec-coverage`).
  0.18.0이 인도한 `/harness-spec`은 시뮬레이션 커버리지가 **0건**이었다 — 커맨드가 실제로
  spec 초안을 쓰는지, `.harness/config.json`의 `specSources`를 read-modify-write 하는지
  아무도 굴려본 적이 없었다. SC5를 일반화하는 대신 전용 시나리오를 둔 이유는 두 가지다 —
  SC5는 `canon.dir`를 SC3·SC4와 공유하는데 `harness-spec`은 **writer**라 그 자리에 spec과
  config를 쓰고, SC4가 `active.json`을 null로 만든 뒤라 그대로 돌리면 "활성 task 없음"으로
  조기 종료해 아무것도 검증하지 못한다. `runHeadless`가 단발 `claude -p`라 멀티턴이 없으므로
  사람이 할 답변을 프롬프트에 심어 한 턴으로 접고 **결정적 산출물만 채점**한다(트리거 해석·
  `(interview)` 출처 태그·자가진단 절·`specSources` read-modify-write·merge 시 알 수 없는 절
  보존). 접히지 않는 것(라이브 MCP fetch·대화 UX·replace/cancel)은 PASS로 위조하지 않고
  **N/A + 사유**로 리포트에 남긴다. 채점을 순수 함수로 분리해 export했으므로 토큰 없이 CI에서
  검증된다 — `tests/agentloop-spec-signals.test.mjs`.

### Fixed
- **`done`의 테스트 증거 가드를 실제로 동작하게 했다** (task `testpath-extension-gate`).
  `isTestPath()`가 **문서를 테스트 파일로 오분류**해 "소스는 바뀌었는데 테스트 파일 변경이
  없음" 검사가 사실상 죽어 있었다. 두 경로였다 — ① basename 규칙(`(^|[._-])(test|spec)s?\.`)에
  `<name>-spec.md`의 `-spec.md`가 걸렸고, **모든 task가 자기 spec을 커밋하므로 소스만 바꾸고
  테스트를 한 줄도 안 써도 가드가 통과했다.** ② 디렉터리 규칙(`specs?/`)에 `docs/**/specs/*.md`가
  걸렸다(이 리포에도 2개 있다). 이제 두 규칙이 **신호의 세기에 맞는 확장자 조건**을 각각 쓴다 —
  디렉터리 규칙(경로가 스스로 "테스트"라고 말하는 **강한** 신호)은 산문 문서(`md`·`rst`·`org` 등)와
  dotfile만 걷어내고(`json`·`yml`·`txt`는 golden·fixture일 수 있어 남긴다), basename 규칙(이름의 우연한 일치라 **약한** 신호)은 코드 확장자(`SOURCE_EXTENSIONS`)만
  인정한다. 두 규칙에 같은 화이트리스트를 걸면 `tests/foo.test.mts`·`tests/run-e2e`처럼 목록 밖
  확장자·무확장자 테스트가 증거에서 빠져 **정직한 작업이 차단**된다(codex 리뷰 P2에서 반증).
  `SOURCE_EXTENSIONS`에 `mts`·`cts`를 추가했다.
  기존 언어별 관례 판정(`foo.test.ts`·`foo_test.go`·`FooTests.swift`·`tests/` 하위 코드)은 그대로다.
  ⚠️ 이 수정으로 가드가 **처음으로 실제 발동**한다. 소스를 바꾸고 테스트를 쓰지 않은 task는
  이제 `done`에서 막힌다 — 불필요한 경우 spec에 `"tests": "skip"`을 선언한다(`--force` 상습화 금지).
- **`done` 가드의 판정 창 오탐 제거** (task `done-guard-window`). 가드가 증거를 찾는 창의
  시작점이 `active.json`의 `switchedAt`이었는데, 이 값은 "**마지막 활성화 시각**"이지
  "이 task의 작업 구간"이 아니다. `done`은 활성 task만 대상이라 끝난 task를 닫으려면
  재활성화해야 하고, 그 재활성화가 창을 초기화해 **이미 만족된 리뷰 마커·커밋을 창 밖으로
  밀어냈다** — 종결 시 항상 재현됐고, task를 전환했다 되돌아오기만 해도 났다.
  이제 창의 시작은 `<name>-meta.json`의 새 필드 **`firstActivatedAt`**(생성 시 1회만 기록,
  재활성화가 건드리지 않음)이며 `switchedAt`은 판정에서 빠진다.
  기존 의도는 그대로다 — 창보다 **앞선** 리뷰 마커는 여전히 무효다.
- 필드가 없는 기존 task는 **시각 비교를 포기**해 degrade한다(구 `active.json`에 `switchedAt`이
  없을 때와 같은 원칙): 리뷰 마커는 존재만 확인하고, 커밋 0개·테스트 미작성 가드는 건너뛴다.
  다른 시각으로 대체하지 않는 이유는 `git log --since`가 **리포지터리 전체**를 스캔하기 때문이다 —
  창을 넓히면 *다른* task의 커밋·테스트가 이 task의 가드를 만족시켜, 가드가 "이 task를 했는가"가
  아니라 "리포가 활발했는가"를 재게 된다.
- 커밋 0개 가드의 메시지를 "task 활성화 이후" → "task 시작 이후"로 바꿨다(판정 기준과 일치).
- **`harness-sim` SC7의 false-PASS 경로 7건 차단** (task `sim-spec-coverage`, codex 리뷰 +
  오케스트레이터 지적). 형태는 전부 하나였다 — **신호는 PASS인데 정작 검증하려던 일은
  일어나지 않았을 수 있다.** ① 기존 `user` 값 보존을 "비어 있지 않음"으로 봤고 ② merge 보존을
  우리가 심은 sentinel의 잔존만으로 봤으며 ③ `specSources`는 저장 여부만, ④ `(interview)` 출처
  태그는 문서 어디든 있으면, ⑤ 자가진단은 문자열이 있으면 PASS였고 ⑥ trial들이 샌드박스를
  공유해 앞 trial의 산출물이 뒤 trial을 통과시켰다. 이제 원래 값과의 동등성·merge가 spec을
  실제로 갱신했다는 증거·프롬프트로 준 `baseUrl`/`spaceKey` 값 대조·요구사항 절의 목록 항목
  한정·실제 heading + 체크박스 존재·trial마다 독립 샌드박스로 판정하며, 트리거·인계 판정에
  `a.ok`를 더해 **타임아웃·spawn 실패가 PASS로 집계**되던 경로도 닫았다.
  ⑦번째가 가장 미묘했다 — "보존했다"와 "**쓰기가 아예 없었다**"를 구분하지 못했다. 기대값을
  실행 직전 파일에서 읽으므로 커맨드가 config를 아예 건드리지 않아도 비교가 참이 되는데,
  유닛 테스트가 그 false-PASS를 의도된 동작으로 못박고 있어 회귀 방지가 아니라 **회귀 고정**
  이었다. 이제 실행 전 원문과 대조해 쓰기가 없으면 PASS가 아니라 N/A로 접고, N/A를 FAIL로
  접던 `aggregateTrials`도 함께 고쳤다(전부 N/A → N/A, 일부 N/A → N/A, FAIL이 섞이면 FAIL).
- **boundary perf 가드가 CI에서 무작위로 빨개지던 문제** (task `boundary-perf-invariant`).
  예산이 bare `node -e ''` 스폰을 분모로 삼은 **차(ms)** 였는데, 그 분모는 스폰 비용 변동만
  상쇄한다. 부하에서는 CLI 본체 작업(20 × 10KiB 스키마 read+parse + ~20개 모듈 그래프)도 함께
  느려지고 그 작업량 비례 지연은 분모가 흡수하지 못한다. wall time ≈ 작업량 × 감속계수이므로
  차는 감속계수를 남기지만 **비(배수)는 소거한다** — 이제 분모는 `boundary check`가 읽는 것과
  같은 21개 파일을 같은 방식으로 읽고 파싱하되 `src/`를 import 하지 않는 **동일 작업량
  baseline**이고, 예산은 cold 3배·checkpoint 5배다. 절대 상한 500/800ms는 값 그대로 두되 모든
  스폰 shape에 untimed warmup을 붙였다 — 부하 중 첫 cold 샘플이 453~541ms(정상 60~90ms)로 튀어
  **상한 자체가 flake 발생원**이었다. matrix 경합설은 기각했다: `gh api .../jobs`로 확인한 결과
  두 job은 서로 다른 hosted 러너 VM에서 돌아 `max-parallel: 1`이 no-op이고, 실제 부하원은 제거할
  수 없는 호스트의 noisy neighbour다. 탐지력은 낮추지 않았다 — CPU burn 주입 mutation test에서
  신규 가드가 잡는 회귀 임계는 +58ms → **+35ms**로 오히려 좁아졌다.
- **CI annotation이 실패 없이 조용히 비어 있던 문제.** 계측 패턴이 `^# spawn floor`처럼 **TAP
  접두사에 앵커**돼 있었는데, node ≤20은 기본 리포터가 TAP이고 ≥22는 spec(`ℹ`·`✖`·
  `AssertionError`)이다. matrix를 `[24]`로 옮긴 첫 실행은 green이었지만 annotation은 한 줄도
  나오지 않았다 — raw 로그를 못 읽는 머신에게는 가장 나쁜 형태의 침묵이다. 이제 접두사가 아니라
  **내용으로** 매칭하고 실패 패턴에 두 리포터를 모두 넣었다. 이번에는 추정하지 않고 네
  조합(node 20·24 × 통과·실패)의 실제 출력을 캡처해 패턴을 검증했다.

### Changed
- **BREAKING: 최소 Node 버전을 18 → 24로 올렸다** (`engines.node: ">=24"`, task
  `node-test-runner-flake`). 두 가지가 겹친 결과다. ① Node 18(2025-04-30)·20(2026-04-30)이
  **둘 다 지원 종료**라 CI가 EOL 런타임만 시험하고 있었고, 릴리스 발행 job도 node 20에서
  돌고 있었다. ② `node:test` 러너의 결과 payload 길이를 **부호 있는 정수로 읽는 버그**
  (nodejs/node#64061)가 CI를 간헐적으로 빨갛게 만들었는데, 수정(nodejs/node#64706)은
  26.7.0에 들어간 뒤 **v24 라인에만 백포트**됐다 — v22는 활성 LTS인데도 받지 못했다.
  그래서 "활성 LTS 두 개(22·24)"가 아니라 **24 단독**이다. 22를 넣으면 flake가 되돌아온다.
- CI 테스트 matrix를 `[18, 20]` → `[24]`로, 릴리스 발행 런타임을 20 → 24로 옮겼다.
  README·`docs/prerequisites.md`의 "Node.js ≥ 18" 서술도 함께 갱신했다.
- **`MAINTAINING.md`의 "Node.js 18+"도 24+로 정정하고, CI가 실제 런타임을 기록하게 했다.**
  위 항목의 1차 grep 범위가 README·templates·skills·commands로 좁아 이 파일을 놓쳤다(저장소
  전체로 재확인했고, 남은 히트는 종결 task SSOT와 과거 plan 문서라 historical record로 두었다).
  함께 워크플로우가 매 실행마다 `::notice::runtime vX.Y.Z`를 남긴다 — 아래 Notes의 "24.20.0
  이후에야 flake가 사라진다"를 **추정이 아니라 사후 확인**으로 만들기 위해서다. 24.20.0 pin은
  그 시점(2026-08-25)에 불가능했다(릴리스 PR open·태그 404 → `setup-node` 해석 실패로 CI 즉사).
  26.7.0 이동도 택하지 않았다 — 26은 Current라 그쪽으로 옮기면 `engines`가 선언한 **최소 지원
  런타임을 더 이상 시험하지 않게** 된다.
- **소비자용 HTML 문서 4종을 0.18.1 기준으로 갱신하고 0.18.1 스냅샷 2종을 남겼다**
  (task `docs-refresh-0181`). `harness-fleet-guide`·`harness-task-guide`는 0.14, `harness-workflow-simulation`은
  0.13.0에 멈춰 있어 **문서가 틀린 말을 하고 있었다** — task-guide §8의 "task가 닫히면
  `<user>-task.md`와 `task_summary.md`가 갱신된다"는 0.16.0의 원장 생성물화 이후 명시적으로
  거짓이고, fleet guide는 0.15.1에서 고쳐진 `release --help` 사고를 아직 경고로 띄우고 있었으며,
  "훅은 Claude Code 전용"은 0.15.0의 `.codex/hooks.json`으로 틀렸다. 갱신 범위는 원장 생성물화,
  `<name>-meta.json`(+`firstActivatedAt`), done 가드 4종 → 6종 + 선언 유효성, 리뷰 커맨드 엔진
  중립 재편, ship 단계 삽입(§1 흐름 SVG 9 → 10단계), `## Done evidence` 절, Node 배지 ≥24다.
  본문만 고치고 **그림을 놓치면 같은 문서 안에서 글과 그림이 서로 반박**하므로 다이어그램
  원본(`task-files.mmd`·`task-lifecycle.mmd`)도 다시 쓰고 재생성했으며, 재작성이 어려운 사전 렌더
  SVG는 캡션에 "참조이지 쓰기 방향이 아니다"를 명시했다. 이 세트에 전례 없는 mermaid 구문
  (`-.->|라벨|`)은 걷어냈다 — 문법 오류가 `docs:check`를 초록으로 통과하고 **렌더 시점에만**
  드러나기 때문이다.

### Notes
- 이 수정이 실제로 flake를 없애는 것은 **Node 24.20.0(2026-08-26) 이후**다. `node-version: 24`는
  최신 24.x로 해석되는데, 그 이전 최신인 24.19.0에는 아직 백포트가 반영돼 있지 않다.
- CI 워크플로우가 테스트 출력을 **annotation으로 되돌린다** — 이 저장소를 유지보수하는
  머신은 raw CI 로그를 받을 수 없어(blob storage 403) `gh run view --log-failed`가 실패한다.
  `gh api repos/<owner>/<repo>/check-runs/<job_id>/annotations`로 읽는다.
- 0.18.0이 0.19.0으로 이월한 **옛 리뷰 이름 4개**(`/harness-codex-review`·
  `/harness-codex-adversarial-review`의 커맨드·스킬) 제거는 이 릴리스에서도 **수행하지 않고
  0.20.0으로 다시 이월한다.** 제거 대상은 `commands/harness-codex-review.md`·
  `commands/harness-codex-adversarial-review.md`와 동명의 스킬 2개(포워딩 4개)이며, 이월 사유는
  선행 조건인 **팀원 머신 전역 `CLAUDE.md`의 새 이름 전환이 아직 확인되지 않았기 때문**이다 —
  릴리스 시점에도 이 머신의 전역 `CLAUDE.md`가 여전히 `/harness-codex-review`를 안내하고 있었다.
  아직 옛 이름을 부르는 안내가 살아 있는 동안 포워딩을 지우면 **그 안내가 그대로 실패**한다.
  포워딩 4개는 0.19.0 트리에 그대로 남으며, 전환이 확인되는 시점에 0.20.0에서 제거한다.
  다시 이월한다면 그 사실을 그 릴리스의 이 절에 적는다.
- 이번 릴리스에서 `README.md`의 전제 조건 표가 안내하던 **옛 리뷰 이름을 새 이름으로 고쳤다**
  (`/harness-codex-review`·`/harness-codex-adversarial-review` → `/harness-review codex`·
  `/harness-adversarial-review codex`). 포워딩은 남기되 **문서가 옛 이름을 권하지는 않는다** —
  이월된 것은 하위 호환이지 권장 경로가 아니다.

## [0.18.1] - 2026-08-22

### Added
- **`harness-team done` 증거 기반 종결 가드 2종** (PR #38, task `done-guard-evidence`).
  ① **테스트 작성 체크(기본 ON)** — `git log --since=<switchedAt> --name-only`로 task 기간
  변경을 분류해, 소스 변경이 있는데 테스트 파일 변경이 없으면 차단한다. 문서·설정만 바뀐
  task는 발동하지 않으며, `core.quotepath=false` + C-quote 해제로 non-ASCII 경로도 정확히
  분류한다. ② **리뷰 마커 체크(spec opt-in)** — spec이 `review: required`를 선언한 task는
  artifact의 `<!-- harness:review kind=... at=... -->` 마커(`at >= switchedAt`, ISO8601 형태만
  인정) 존재를 요구한다. 검증 강도는 정직하게 선언한다: 이 가드가 막는 것은 악의가 아니라
  **망각**이며, 기존 4개 가드와 같은 등급이다.
- **spec `## Done evidence` JSON 선언** — `{ "version": 1, "tests": "required|skip",
  "review": "required|optional" }`. 미선언은 기본값(`tests: required` / `review: optional`)으로
  동작하고, 깨진 선언·미종결 fence·미지 키는 **invalid로 차단 사유**가 된다(조용한 폴백 금지,
  `boundary check`의 `not-configured` 전례). spec 템플릿에 주석 형태의 선언 자리를 추가했다.
- **리뷰 마커 기록 계약** — `/harness-review` 5단계 기록에 기계 판독용 마커 한 줄을 append
  하는 계약을 추가했다 (`/harness-adversarial-review`는 `kind=<engine>-adversarial`).
  artifact 템플릿 `## Reviews` 안내문에도 마커 형식을 명시했다.

### Fixed
- codex 외부 리뷰(P1 1건·P2 4건) 전건 조치 — staged index 오염, 미종결 fence fail-open,
  미지 키 미거부, C-quoted 경로 오분류, `Date.parse` 관대 파싱. 상세는
  `docs/chad/done-guard-evidence/done-guard-evidence-artifact.md` `## Reviews`.

### Notes
- 이 릴리스는 0.18.0이 선언한 전환 창(0.18.x) 안의 patch다 — 옛 리뷰 이름 4개의 포워딩은
  유지되며, 제거는 예정대로 **0.19.0**에서 수행한다(선행 조건: 팀원 머신 전역 CLAUDE.md 전환).

## [0.18.0] - 2026-08-22

### Added
- **`/harness-spec` — spec 초안 생성 커맨드/스킬 (writer).** 활성 task의 `<name>-spec.md` 초안을
  3소스에서 생성한다: ① Confluence(PRD·spec·policy) ② Figma(wireframe·design-spec) ③ task 이름 기반
  생성형 인터뷰(Goal/Constraint/Success/Ontology, 한 번에 질문 하나). 소스 접근은 MCP 우선 +
  수동 붙여넣기 폴백이며, 프로젝트별 소스 기본 위치는 첫 실행 시 lazy로 입력받아
  `.harness/config.json`의 `specSources`에 저장한다(task별 구체 URL은 실행 시 입력). 초안은
  기존 taskSpecTemplate 골격을 유지하고 요구사항별 출처를 표기하며, 원문 덤프 대신 요약+링크만
  남긴다. 자가진단은 근거 있는 항목만 체크하고 미달 항목은 `/harness-interview`(validator)로
  인계한다 — writer/validator 역할 분리. 리서치 근거: OpenSpec(config context 주입, explore 톤),
  GSD Core(`--auto @prd.md` 문서 추출, spec-phase ambiguity 스코어링). Codex 래퍼
  `skills/harness-spec/` 동봉, `harness-task` 생성 안내와 CLAUDE.md Ambiguity 자가진단 게이트에 연결.

### Deprecated
- **옛 리뷰 이름 4개(`/harness-codex-review`·`/harness-codex-adversarial-review` 커맨드·스킬) 제거를
  0.19.0으로 이월.** 0.17.0은 "다음 마이너 버전에서 제거"를 예고했으나, 이번 마이너는 `/harness-spec`
  인도가 목적이고 제거의 선행 조건(팀원 머신 전역 CLAUDE.md의 새 이름 전환)이 아직 완료되지 않았다.
  참조가 남은 채 제거하면 실패가 아니라 무반응으로 조용히 깨진다 — 포워딩은 0.18.x 동안 유지되며
  제거는 0.19.0에서 수행한다.

### Fixed
- **post-commit handoff 생성기의 EOF 빈 줄 재발 근절.** `runHandoffAuto`의 append 포맷이 항목 끝에
  빈 줄을 남겨 매 커밋 `git diff --check`에 걸렸다. 파일만 고치면 다음 커밋에서 재발하므로 생성기
  포맷 자체에서 여분 개행을 제거하고 기존 handoff 꼬리를 정리했다 — 항목 구분은 다음 항목의 선행
  개행이 담당한다. 설치본에는 이 릴리스의 캐시 동기화부터 반영된다(그 전까지는 수동 꼬리 트림 필요).

## [0.17.0] - 2026-08-22

### Added
- **`/harness-review`·`/harness-adversarial-review` — 리뷰 커맨드의 엔진 중립 재편.** 엔진(codex·
  claude·gemini·custom)과 프레이밍(통상/적대적)은 직교하는데 기존 이름은 엔진을 커맨드명에 박아
  claude-only 팀원이 쓸 리뷰 경로가 없었고, 엔진이 늘 때마다 커맨드가 프레이밍 수만큼 곱으로
  늘어날 구조였다. 절차(scope → 실행 → 발견 검증 → artifact 기록 → 보고)는 `harness-review.md`가
  한 번만 소유하고 엔진 차이는 runner 표 한 줄이다. 엔진 인자 생략 시 **probe 폴백 체인**
  (codex → gemini → claude)으로 첫 가용 엔진을 쓴다 — claude는 Claude Code 환경에 항상 존재하므로
  어느 머신에서든 리뷰어가 보장된다. claude 엔진은 `claude -p --permission-mode plan`(쓰기 차단·
  read-only git 허용·인증 상속, 2026-08-21 실측)이며 **컨텍스트 분리만 제공**(vendor 분리 없음)
  한다는 한계를 문서에 명시했다 — 폴백 체인에서 마지막인 이유다. custom 엔진은 커밋 가능한 팀
  공유 설정 `.harness/reviewers.json`의 `{"custom": {"command": "... {prompt} ..."}}` 템플릿을
  치환해 실행하고, 미설정이면 실패시키지 않고 스키마 안내 후 종료한다. Codex 표면도 같은 체계로
  재편했다(`skills/harness-review/`·`skills/harness-adversarial-review/`, command 문서를 SSOT로 읽음).

- **spec/plan 단계 다이어그램 옵트인.** 신규 task를 만든 직후 다이어그램을 함께 만들지 **1회만**
  묻고, "예"면 `<name>-plan.md` 단계에 체크박스를 추가하고 "아니오"면 아무것도 추가하지 않는다.
  기존 task 재활성화 시에는 묻지 않는다 — 계획에 없는 단계를 다시 묻는 것은 계획을 무시하는 것이다.
  **전용 설정 키(`.harness/config.json`)·doctor 체크·상태 파일을 만들지 않았다**: 두 상태를 모두
  plan.md가 표현한다 — 그 단계가 있으면 옵트인, 없으면 옵트아웃이다. plan.md는 이미 SSOT이자 세션
  시작 프로토콜이 반드시 읽는 파일이다 — **plan.md가 곧 상태다.** 실행 여부(만들었는지, 도구가 없어
  건너뛰었는지)는 체크박스 사유와 artifact 기록이 말하며, 건너뛴 단계는 지우지 않고 닫는다.
- **산출물 `docs/<user>/<name>/<name>-diagram.html`을 명시적 SSOT 제외 생성물로 선언.**
  `AGENTS.md` 작업 프로토콜에서 `<name>-meta.json`·`<name>-context.md`와 같은 급으로 못 박아
  다섯 번째 SSOT로 오해되지 않게 했다. 형식은 **자립형 inline SVG** — `docs/`는 Obsidian 볼트에서
  열리고 Obsidian은 script를 제거하므로 mermaid 같은 런타임 JS 다이어그램은 렌더되지 않는다.
- **문서 계층 분리와 하드 의존 금지.** `AGENTS.md`는 Codex·Cursor·OpenCode도 네이티브로 읽는
  멀티에이전트 SSOT이므로 도구 중립적으로만 기술했고(특정 스킬 이름 없음), Claude 전용 호출은
  `CLAUDE.md` §1-B와 `commands/harness-task.md`에만 뒀다. 실행 계약은
  `commands/harness-codex-review.md`와 동일한 **probe → degrade → record** — 다이어그램 도구가
  없는 머신에서는 실패시키지 않고 건너뛴 뒤 artifact에 "미실행"을 한 줄 남긴다.
  `tests/agent-files.test.mjs`가 core에 Claude 전용 스킬 이름이 새는 회귀를 차단한다.
- CLI(`src/`)는 변경하지 않았다 — Codex 표면(`skills/harness-task/SKILL.md`)도
  `commands/harness-task.md`를 SSOT로 읽으므로 두 에이전트 경로가 한 문서로 커버된다.
- **`/harness-ship` — PR/MR 직전 최종 갱신 커맨드.** 라이프사이클이 `harness-team done`에서 끝나
  문서와 실제 머지 사이가 비어 있었다. 리뷰어가 문서를 읽는 시점은 PR인데 그때 spec·plan·artifact가
  최신이라는 보장이 없었다. ship은 활성 task를 확인해 세 문서를 코드 현실과 맞춘 뒤 **"PR/MR 준비
  완료" 상태를 보고하는 데서 멈춘다** — PR/MR 생성·푸시는 하지 않는다. `harness-team done`은 손대지
  않았다(이 저장소의 릴리스 플로우는 PR 없이 main 직접 범프 커밋 → 태그 푸시이므로 done에 PR 단계를
  끼우면 깨진다). 다이어그램 갱신·생성은 실행 시점에 한 번 묻는 **옵트인**이며 응답을 저장하지
  않는다(설정 스키마·전용 doctor 체크 없음). `diagram-design`은 별도로 설치되는 외부 플러그인이라
  머신마다 있을 수도 없을 수도 있어 **하드 의존하지 않는다** — probe → degrade → record: 없으면 실패시키지
  않고 건너뛴 뒤 artifact에 '미실행' 한 줄을 남긴다. 산출물
  `docs/<user>/<name>/<name>-diagram.html`은 SSOT 4파일이 아닌 **생성물**이고, task 문서는 Obsidian
  처럼 script를 제거하는 뷰어에서 열리는 경우가 많아 자립형 inline SVG HTML이 기본값이다. Claude 전용 스킬 호출은 배포되는 계약 문서 중
  `commands/harness-ship.md`에만 두고 `AGENTS.md`에는 도구 중립 한 줄만 추가했다(Codex·Cursor·
  OpenCode도 읽는 SSOT). 새 CLI 서브커맨드는 만들지 않았다 — ship은 에이전트 판단 작업이고,
  `tests/manifest-sync.test.mjs`가 command 문서의 모든 `harness-team <sub>` 표기를 router case와
  대조하므로 CLI 없는 서브커맨드는 애초에 문서화할 수 없다. Codex에서는
  `skills/harness-ship/SKILL.md` 래퍼가 같은 command 계약을 SSOT로 읽는다.
- **`tests/ship-command.test.mjs` — ship 계약 회귀 가드.** manifest-sync는 등록·router 구조만 보므로
  ship을 안전하게 만드는 두 가지(PR을 스스로 열지 않는다 / 다이어그램 도구에 하드 의존하지 않는다)와
  `AGENTS.md` 쌍의 도구 중립성은 아무도 지키지 않았다. 5개 테스트로 고정한다.
- **`diagram-design`을 커밋 sha로 핀을 건 동반 플러그인으로 마켓플레이스에 등재.** 복사(vendoring)
  하지 않는다 — 업스트림이 활발히 갱신되고, 스킬이 `SKILL.md` + `references/` + `assets/`로 구성돼
  references가 assets를 다수 참조하며, 브랜드 토큰이 스킬 디렉터리 안 `references/style-guide.md`에
  쓰이기 때문이다. 사본을 들면 리싱크가 영구히 이 저장소의 일이 되고 사용자의 브랜드 색이 릴리스에
  실려 나간다. 이미 `doctor`의 `EXTERNAL_TOOLS`가 codex·gemini를 **번들하지 않고 탐지만** 하는 것과
  같은 철학이다. 형식은 Anthropic 공식 카탈로그를 그대로 따랐다 —
  `{"source": "url", "url": "...git", "sha": "<40hex>"}`. 공식 카탈로그의 `url` source 150개 중
  146개가 정확히 이 세 키만 쓰고 `ref`를 쓰는 항목은 0개라 `ref`도 넣지 않았다(브랜치 출처는
  `MAINTAINING.md` 표에 남긴다). 핀은 `0ab077f`(1.0.0)다. 업스트림 main(`5538b35`, 2.6.1)의 트리도
  실제로 받아 확인했고 구조는 온전했지만, 저장소 루트에 `commands/`가 추가돼 `/doctor`·`/profile`
  같은 **범용 이름의 슬래시 커맨드를 사용자 세션에 주입**하게 되고 major 2개 분량의 동작 변화가
  미검증이라 이 머신에서 실제로 동작이 확인된 커밋을 핀했다. "구조가 온전함"은 "검증됨"이 아니다.
  **doctor 체크는 넣지 않았다** — 스킬은 `command -v`로 잡히지 않고, 유일한 탐지 후보였던
  `~/.claude/plugins/known_marketplaces.json`은 스키마도 `$schema`도 없는 Claude Code 내부 상태
  파일이라 공개 계약으로 볼 근거가 없으며, 다이어그램은 옵트인이라 미설치를 결함으로 보고하면
  오탐이다. 못 만들 체크를 약속하지 않는 편이 정직하다.
- **`/harness-diagram` — 다이어그램 실행 어댑터.** 별칭이 아니라 **어댑터**다. 상류 스킬을 직접
  부르면 산출물 경로(`docs/<user>/<name>/<name>-diagram.html`)도, 자립형 inline SVG 제약도, SSOT
  4파일이 아닌 **생성물** 지위도, artifact 기록 의무도 하나도 적용되지 않는다 — 이 커맨드가 그
  규약을 상류 호출에 실어 준다. `harness-codex-review`가 `codex exec`에 대해 하는 일과 같다.
  계약을 네 번째로 복붙하지 않았다: **옵트인 계약의 정본은 `commands/harness-task.md`**(질문 시점,
  plan.md가 곧 상태, 건너뛴 단계를 지우지 않고 닫는 형식)이고 이 문서는 그것을 참조하며 **실행**만
  다룬다. `commands/harness-task.md`·`commands/harness-ship.md`·`CLAUDE.md` §1-B에는 실행 정본을
  가리키는 한 줄씩만 더했다. `AGENTS.md`는 건드리지 않았다 — 도구 중립 SSOT이고
  `tests/ship-command.test.mjs`가 그 중립성을 강제한다. Codex 표면은
  `skills/harness-diagram/SKILL.md` 래퍼가 같은 command 계약을 SSOT로 읽으며, description은
  상류 스킬과 트리거가 경합하지 않도록 **활성 harness task 문맥으로 한정**했다.
- **동반 항목 계약 회귀 가드.** `tests/release.test.mjs`에 4건(동반 항목이 있어도 자기 항목만 범프되고
  동반 항목은 그대로 / 자기 항목이 배열 첫 번째가 아니어도 이름으로 찾음 / 자기 항목 중복은 throw /
  동반 항목이 `version`을 들면 `manifest-format`으로 throw)을 추가하고, `tests/manifest-sync.test.mjs`의
  `plugins[0]` 인덱스 접근을 이름 조회로 강화한 뒤 "동반 항목은 40hex `source.sha`로 핀되고 `version`을
  갖지 않으며 저작자를 표기한다"는 저장소 불변식을 새로 고정했다.
- **`docs/prerequisites.md` — 사전 준비 문서.** README에 `## 설치`와 `## 빠른 시작`만 있고
  "무엇이 없으면 무엇이 안 되는가"를 말하는 절이 없었다. 평평한 설치 목록이 아니라 **능력
  매트릭스**로 썼다 — 하드 요구사항은 **Node ≥18 하나뿐**이고(`engines.node`, 런타임 의존성 0개)
  나머지는 전부 degrade 대상이다. `git`조차 하드 요구사항이 아니다: `detectMember`는 `$USER` →
  `unknown`으로 폴백하고 `handoff`는 git 실패를 catch하며 `installPostCommitHook`은 `.git/hooks`가
  없으면 조용히 return한다 — 없으면 "아무것도 안 되는" 게 아니라 post-commit handoff·summary
  브랜치 감지·task 전환 diff가 no-op이 된다. `gh`는 하네스 코드가 한 번도 호출하지 않고
  (`/harness-ship`은 PR을 만들지 않고 멈춘다) `gemini`·`opencode`도 마찬가지다 — 셋 다 **사용자가
  직접 쓰는** 도구지 하네스가 의존하는 도구가 아니다. 에이전트별 연동·확인 방법·호환성 주의
  포함. `README.md`에는 요약표 한 절만 넣고 상세는 이 문서로 링크한다(기존 `### 요구사항`은
  새 절과 모순되므로 포인터 한 줄로 축약).
- **`tests/prerequisites-doc.test.mjs` — 문서↔doctor 드리프트 가드.** `harness-team doctor`가 이미
  런타임 체커이므로 문서가 `EXTERNAL_TOOLS`와 어긋나는 순간 문서가 거짓말이 된다. `EXTERNAL_TOOLS`를
  export하고 **양방향**으로 검사한다: doctor가 검사하는 도구가 문서에 없으면 실패하고, 문서가
  나열한 도구를 doctor가 검사하지 않아도 실패한다. 한 방향만으로는 영원히 통과하므로 역방향이
  실제로 잡아 주는 쪽이다. 표는 한국어 제목이 아니라 `<!-- prerequisites:external-tools -->` 주석
  마커로 찾아 문구를 다듬어도 테스트가 깨지지 않는다.

### Deprecated
- **`/harness-codex-review`·`/harness-codex-adversarial-review` — 1개 마이너 버전 유지 후 제거.**
  두 커맨드와 동명 스킬은 새 커맨드를 엔진 `codex`로 수행하는 얇은 포워딩 문서로 교체했고
  plugin.json 등재는 유지한다. 전역 CLAUDE.md·팀원 워크플로우의 옛 이름 참조가 조용히 깨지는 것을
  막기 위한 전환 창이며, 다음 마이너 버전에서 제거한다.

### Changed
- **AGENTS.md에 D5(2026-08-20) 결정 노트 추가 — 단일 스레드 쓰기 규칙의 범위 정정.** D4(2026-07-28)는
  "Claude·OpenCode는 동시에 병렬로 쓰지 않는다"고만 말하고 금지 범위를 적지 않아, 같은 파일의 작업
  프로토콜 절("집계 파일은 생성물이므로 브랜치를 병렬로 둬도 충돌하지 않는다")과 긴장을 만들었다.
  D5는 그 범위를 **같은 워킹트리·브랜치 안에서의 동시 쓰기 금지**로 명시하고, 격리된 브랜치 또는 git
  worktree에서 작업해 **PR/MR로 병합하는 경로는 허용·권장**임을 못 박는다. D4를 뒤집지 않는다 —
  D4의 "OpenCode는 순차 전환 세션" 규정은 같은 워킹트리를 공유할 때의 기준으로 유지되며, D4 원문도
  그대로 보존된다(D2를 지우지 않은 D4와 같은 append-only 방식). task SSOT 4파일은 각 task 디렉터리에
  격리되고 `docs/task_summary.md`·`docs/<user>/<user>-task.md`는 기본 브랜치에서
  `summary --write`로만 갱신한다는 기존 제약은 그대로다.
- **`CLAUDE.md` §2 서브에이전트 전략 불릿의 범위 명시.** "병렬 작성·결정 에이전트는 두지 않는다"가
  격리 브랜치 병렬까지 금지하는 것으로 읽히지 않도록 "같은 워킹트리·브랜치 안에서"라는 한정을 넣고,
  격리 병렬(브랜치·worktree + PR/MR 병합)이 허용됨을 별도 불릿으로 덧붙였다.
- **`README.md` 설계 스코프 절에 D5 포인터 추가.** "단일 스레드 실행 + 얇은 제어흐름" 문단이 격리
  브랜치 병렬까지 부정하는 것으로 읽히지 않도록, 금지 대상이 같은 워킹트리 동시 쓰기임을 한 문장으로
  명시했다.
- 위 변경은 루트 파일과 `templates/*.hbs` 양쪽에 동일하게 반영되어 새로 scaffold 되는 프로젝트도
  같은 문서를 받는다(`README.md`는 이 저장소 전용이라 짝이 없다).
- **`block-dangerous-git.sh`에 상류 출처 표기 추가 — 동작 변경 없음.** 이 훅은 Matt Pocock의
  [mattpocock/skills](https://github.com/mattpocock/skills)(MIT) `skills/misc/git-guardrails-claude-code`에서
  출발한 **파생물**이며 사본이 아니다. 훅 주석과 `docs/chad/pocock-merge/pocock-merge-artifact.md`에 상류
  경로·대조 커밋(`885e2ca`)·정책 분기(상류는 `git push`를 전부 차단하지만 여기서는 force push만 차단하고
  `checkout -- <file>`·워킹트리 `restore`를 추가로 막는다)를 기록했다. 상류를 핀 참조로 대체하려던 시도는
  성립하지 않는다 — 상류 `plugin.json`이 노출하는 스킬 25개에 이 스크립트가 없고, 이 파일은 `copyTree`가
  소비자 프로젝트의 `.claude/hooks/`로 배달하는 하네스 소유 코드다. 정규식·패턴·exit 코드는 그대로다.
- **`release`의 marketplace 가드를 "배열 길이 1"에서 "이름으로 찾은 자기 항목이 정확히 1개"로 일반화.**
  `marketplace.json.plugins`가 이제 **자기 항목 1개 + 동반 항목 N개**이므로 길이 가드는 동반 항목을
  넣는 순간 릴리스를 깨뜨렸다. 버전 동기화 대상도 `plugins[0]`이 아니라 이름으로 찾은 자기 항목으로
  바꿨다 — 배열 순서에 의존하지 않는다. **가드는 약해지지 않았다**: 자기 항목이 0개(빈 배열·이름
  불일치)거나 2개 이상(중복 등재)이면 여전히 `schema`로 throw 하며, 등재된 이름 목록을 메시지에 싣는다.
  동반 항목 개수를 하드코딩하지 않았으므로 항목이 더 늘어도 코드는 그대로다.
  **동반 항목에는 `version` 필드를 넣지 않는다** — `surgicalVersionReplace`가 매니페스트당
  `"version": "<현재버전>"` 문자열의 **1회 출현**을 가정하므로, 값이 겹치는 날 릴리스가
  `manifest-format`으로 멈춘다. 핀은 `source.sha`로만 표현한다.
- **`MAINTAINING.md`에 "동반 플러그인 — 핀을 올리는 절차" 절 추가.** 핀은 걸어놓고 올리는 법을 안 적으면
  방치된 의존성이 된다. 언제 올리는가("최신이니까"는 이유가 아니다), 올리기 전에 확인할 것(임시
  디렉터리에서 실제로 받아 스킬 표면 확인 / 저장소 루트에 `commands/`가 생겼는지 / major 점프면 동작
  직접 확인), 형식 규칙(`ref`·`version` 금지), 그리고 **옛 clone으로 release를 돌리지 말 것**을 적었다 —
  PATH의 `harness-team`은 보통 marketplace clone 심볼릭 링크라, 옛 길이 가드를 가진 clone은 정상적인
  `marketplace.json`을 읽고도 `schema` 오류로 멈춘다.
- **`README.md`에 "동반 플러그인 (선택)" 절 추가.** 없어도 하네스가 정상 동작한다는 사실, 설치 명령,
  MIT 저작자 표기(Cathryn Lavery), 핀이 자동으로 따라가지 않는다는 사실, vendoring 하지 않는 이유,
  하네스 안에서는 `/harness-diagram`으로 부른다는 사실을 함께 적었다.
- **jq 부재 시의 저정밀 모드를 문서에 명시.** `templates/.claude/hooks/`의 훅 넷은 stdin JSON을
  파싱해 판단하는데, jq가 없으면 grep 폴백으로 `"key": "value"` 문자열만 잘라내 **같은 검사에**
  넘긴다 — **차단은 유지되고 정밀도만 떨어진다.** 한계(JSON 이스케이프 미디코드, 같은 키의 첫
  매치만 읽음, 값을 못 뽑으면 payload 전체 검사)와 "왜 무조건 차단이 아닌가"(훅은 매 도구
  호출마다 돌기 때문에 파싱 실패를 전부 차단하면 어떤 bash 명령도 못 쓴다)를 `docs/prerequisites.md`
  §3과 README 요약표에 적었다. 이 변경은 **훅 코드를 건드리지 않는다** — 동작 수정은 별도 작업이며
  여기서는 사실만 기술한다. `doctor`가 jq만 `optional`이 아닌 `warning`으로 보고한다는 점도 함께
  명시했다(다른 넷은 없으면 기능이 꺼질 뿐이지만 jq는 판정 정확도를 좌우한다).
- **호환성 주의 — `mattpocock-skills`의 `writing-for-agents`.** 그 스킬의 description이
  *"Use when … modifying AGENTS.md or CLAUDE.md"* 라 이 저장소에서 자동 발동하는데, 여기의
  `AGENTS.md`·`CLAUDE.md`·`GEMINI.md`는 `templates/*.hbs`에서 생성되고 `harness:section` 마커 블록이
  루트와 템플릿 쌍으로 같아야 `tests/agent-files.test.mjs`·`tests/e2e/ssot-consistency.test.mjs`가
  통과한다. 루트만 고치면 CI가 깨지고 원인을 찾기 어렵다. 나머지 중복(`diagnosing-bugs`↔`fix-bug`,
  `tdd`↔`harness-unittest` 계열, `code-review`↔`harness-codex-review`, `grilling`↔`harness-interview`,
  `domain-modeling`↔spec의 Ontology)은 **무해한 중복**이라 어느 쪽을 쓸지만 정하면 된다.


### Fixed
- **`MAINTAINING.md`의 "새 커맨드 추가" 표 정정.** 모든 커맨드에 `bin/harness-team.mjs` 서브커맨드
  등록을 요구했지만 실제로는 **CLI를 감싸는 커맨드만** 해당한다(`harness-interview`·`harness-ship`처럼
  절차가 전부 에이전트 판단인 커맨드는 CLI가 없다). 반대로 `manifest-sync`가 실제로 강제하는
  `skills/<name>/SKILL.md` 래퍼와 `docs/harness-overview.html` 재생성은 표에서 빠져 있었다 —
  재생성은 `git ls-files` 기반이라 **새 파일을 `git add` 한 뒤** 돌려야 한다는 함정까지 함께 적었다.
- **`README.md`의 슬래시 커맨드 수 3곳 동기화** (21 → 22).
- **`diagram-design`을 "Claude Code 전용"이라고 단정한 서술 정정.** 그 저장소에는
  `.codex-plugin/plugin.json`이 있고 `"skills": "./skills/"`를 선언한다 — Codex도 이 스킬에 접근할
  수 있다. `CLAUDE.md` §1-B(및 템플릿 쌍), `commands/harness-task.md`, `commands/harness-ship.md`,
  `skills/harness-ship/SKILL.md`의 표현을 "별도로 설치되는 외부 플러그인이며 머신마다 있을 수도
  없을 수도 있다"로 바꿨다. 핵심(하드 의존 금지·probe → degrade → record)은 그대로다.
- **`README.md`의 슬래시 커맨드 수 3곳 동기화** (22 → 23, `/harness-diagram` 추가).
- **`plugins[0]`을 가리키던 문서 2곳 정정.** `commands/harness-release.md`의 스키마 오류 대응 절과
  `README.md`의 버전 확인 팁이 인덱스 0을 "우리 항목"으로 단정하고 있었다. 이름으로 찾는 **자기 항목**
  기준으로 바꾸고, 동반 항목은 버전 동기화 대상이 아니므로 지우지 말라는 사실을 함께 적었다.
- **`doctor`의 거짓 CLI-drift 경고 차단.** `installedHarnessVersion`이 installed record를
  `<plugin>@<marketplace>` 키의 **marketplace 반쪽만으로** 찾고 있었다 — "하네스는 이 마켓플레이스에
  플러그인 하나만 소유한다"는 전제였고, 동반 항목을 등재하는 순간 그 전제가 깨진다. 동반 플러그인
  레코드가 먼저 열거되면 그 버전을 하네스 버전으로 읽어 실제로는 없는 drift를 경고한다. 키의 양쪽
  반을 대조하도록 고치고 `HOOK_CLI_PLUGIN_NAME`을 노출했다.
- **surgical 치환이 의도한 대상에 적중했는지 검증.** needle은 raw 문자열이라 "정확히 1회 출현"이
  "우리 필드에 적중"을 뜻하지 않는다. 자기 항목이 `"version":"x"`(공백 없음)이고 동반 항목이
  `"version": "x"`면 count는 1이고 **동반 항목이 범프되며 하네스 버전은 조용히 남는다.** 치환 후
  파싱해 매니페스트 4개 각각의 의도한 필드가 실제로 새 버전이 됐는지 확인하고, 아니면
  `manifest-format`으로 멈춘다.
- **marketplace 카탈로그 유효성 검사 강화.** 자기 항목 개수만 세면 중복된 **동반** 이름이나
  `null`/이름 없는 항목을 통과시킨 채 잘못된 카탈로그를 clone으로 복사한다. 모든 항목이 문자열
  `name`을 가진 객체이고 이름이 유일해야 한다는 검사를 추가했다 — release는 그 복사 전 마지막 게이트다.
- **`--dry-run`을 진짜 preflight로 만듦.** 형식 검증(surgical 치환 계산) 전에 반환하고 있어서,
  실제 실행이 `manifest-format`으로 멈추는 트리에서도 dry-run은 성공을 보고했다. 계산·검증을 반환
  앞으로 옮겼다. dry-run이 byte 무변경이라는 성질은 그대로다(테스트로 확인).
- **jq가 없으면 Claude 훅 4개가 조용히 무력화되던 fail-open 수정.**
  `auto-format.sh`·`block-dangerous-git.sh`·`pre-commit-check.sh`·`protect-files.sh`는 stdin
  payload를 `jq -r`로 파싱했다. jq가 PATH에 없으면 `TOOL_NAME`/`FILE_PATH`가 빈 문자열이 되어
  `!= "Bash"` 분기로 빠지고 **exit 0(허용)** 했다 — 통제된 PATH 실측: `git push --force`가
  jq 있으면 exit 2, 없으면 exit 0. `.env` 편집도 마찬가지. 이제 jq 부재를 `command -v`로 감지해
  `"key": "value"` 문자열만 잘라내 **같은 패턴·같은 판정**으로 검사한다(저정밀 모드).
  "jq 없으면 무조건 차단"은 하지 않는다 — 훅은 매 도구 호출마다 돌기 때문에 그건 어떤 bash 명령도
  못 쓰는 상태를 만든다. payload 전체 스캔도 채택하지 않았다: 모델이 쓴 `description` 문구가
  정규식을 완성시켜 `git checkout -b feat/x`(설명에 ` -- ` 포함) 같은 **안전한 명령이 차단**된다.
  차단 시 메시지와 `doctor`가 저정밀 모드임을 알린다. 잔여 한계: JSON 이스케이프를 디코드하지
  않으므로 `git push\t--force`처럼 구분자가 인코딩된 명령은 폴백에서 통과한다.
- **`doctor`의 jq 표시를 optional → warning으로 승격.** 나머지 4개(gh·codex·gemini·opencode)는
  없으면 기능이 꺼질 뿐이지만 jq는 없으면 훅의 판정 정밀도가 떨어진다. `fail++`는 하지 않으므로
  exit code 계약은 그대로다.
- **훅 차단/허용 매트릭스 자동화 테스트 신규**(`tests/hooks-jq-fallback.test.mjs`). 2026-07-02
  병합 당시 수동으로만 돌리던 매트릭스를 **jq 있는 PATH와 없는 PATH 양쪽**에서 돌린다 —
  차단 10종·허용 12종 + description 오탐 가드 + 알려진 잔여 리스크(커밋 메시지 오탐, `git -C`
  프리픽스 우회) 현재 동작 고정 + 4개 훅 공통 폴백 블록 동일성(복붙 드리프트) 가드.
- **jq-fallback 보안 수정이 기존 설치에 도달하지 못하던 배달 갭 수정 (PR #29 후속 P1-1).**
  훅 수정은 템플릿에만 실렸고 `copyStaticAssets`는 훅을 `skipExisting`으로 복사한다 — init/apply
  어느 쪽도 설치본을 갱신하지 않아, 실측으로 구버전 설치본은 여전히 fail-open이었다.
  `migrate`의 `refreshClaudeHooks`를 훅 4개로 확장했다: 설치본이 **과거에 배포된 버전과 바이트
  동일**(sha256 테이블, 출처는 git blob 이력·`tests/fixtures/stock-hooks`)할 때만 confirm/`--yes`
  후 최신 템플릿으로 갱신하고, 목록 밖(커스터마이즈)은 절대 덮지 않고 안내만 한다.
  기존 pnpm-hardcoded 시그니처 분기는 바이트 드리프트한 초기 설치본용 그물로 보존.
- **폴백 블록 없는 설치본에 "차단은 유지"라고 말하던 `doctor` 거짓 안내 수정 (P1-2).**
  jq 부재 경고가 설치본 훅의 `harness:jq-fallback` 마커를 확인해 분기한다 — 마커 없는 훅이
  있으면 "조용히 무력화(fail-open), `harness-team migrate` 필요"로, 전부 마커가 있으면 현행
  저정밀 문구로. 어느 쪽이든 warning이며 `fail++`하지 않는다(exit code 계약 유지).
- **jq 경고에 remedy 없던 `next_actions` 공백 수정 (P2-3).** jq 부재 시 플랫폼별 설치
  명령(`jqInstallAction`)을, 마커 없는 훅이 있으면 `harness-team migrate`를 함께 push한다 —
  "remedy 없는 경고는 노이즈" 원칙 준수. 중복 action은 Set으로 정리.
- **extraction-failure 경로 행위 커버리지 추가 (P2-2).** 기존 32개 테스트는 정상 payload만
  덮어서, tool_name 게이트의 `&&` 가드를 `;`로 바꾸거나 `|| COMMAND="$INPUT"` 폴백을
  `|| COMMAND=""`로 무력화해도(원래의 fail-open 재현) 0 fail이었다. tool_name 추출 실패
  payload 차단·command 추출 실패 시 전체 스캔 차단을 nojq 모드에서 고정 — mutation 2종
  각각이 신규 테스트를 fail시키는 것을 실측 확인.
- **폴백 한계 서술 일반화 + `\uXXXX` 우회 핀 (P2-1).** 우회는 `\t` 한 종류가 아니라 일반적이다
  — 값 속 문자 하나만 `\uXXXX`로 인코딩해도 저정밀 매칭이 뚫린다(`--force` 실측).
  블록 주석을 "이스케이프를 일절 디코드하지 않는다"로 고치고, nojq exit 0 / jq exit 2를
  잔여 리스크 핀 테스트로 고정했다. bash 이스케이프 디코더는 구현하지 않는다(해법: jq 설치).
- **폴백 추출을 `tool_input` 이후로 스코프 (P3-1).** 공유 블록에 `json_input_field()`를 추가해
  command/file_path 추출을 `"tool_input"` 마커 뒤로 좁혔다 — 최상위 동명 키를 먼저 잡는
  오인을 차단하고, 마커가 없으면 `${...#...}`가 원문을 그대로 돌려줘 전체 스캔이 유지된다
  (fail-closed). tool_name은 tool_input 밖이므로 종전 그대로.

## [0.16.1] - 2026-08-19

### Fixed
- **`codex exec` 리뷰가 무한 blocking 되던 문제** — `codex exec`는 프롬프트를 인자로 받고도 stdin이 열려
  있으면 추가 입력을 기다린다. 출력에 `Reading additional input from stdin...` 한 줄만 남고 CPU 0.01~0.04s로
  멈춘 채 끝나지 않는다. `commands/harness-codex-review.md`와 `harness-codex-adversarial-review.md`가
  `< /dev/null` 없는 호출을 문서화하고 있었고, 에이전트가 그대로 복사하므로 이 하네스를 쓰는 **모든
  프로젝트에서 재발**했다. 실제로 리뷰 2건이 각각 38분·63분을 멈춘 채 소모했다. 두 명령 문서의 모든
  호출 예시에 `< /dev/null`을 넣고 생략하지 말라는 경고를 달았다.
  (`tests/sim/codex-agentloop.mjs`는 이미 `stdio: ['ignore', …]`라 영향 없음.)
- **`summary --write` 가드가 fail-open이던 문제** — git 조회가 실패하면 `branch === null`이 되어 가드를
  통째로 건너뛰고 원장을 썼다. git이 없거나 저장소를 읽을 수 없는 상황을 "브랜치가 없다"로 오해하는
  것인데, 그때가 바로 어디에 있는지 모르는 상황이다. 이제 "저장소가 아님"(안전 — 충돌할 브랜치가 없다),
  "브랜치 확인 실패"(거부), "브랜치 확인됨"을 구분한다. 저장소 여부는 두 번째 git 호출이 아니라
  파일시스템에서 `.git`을 찾아 판정하므로, 깨진 git 바이너리가 "저장소 아님"으로 위장할 수 없다.
  브랜치 조회도 `rev-parse --abbrev-ref HEAD` 대신 `branch --show-current`를 쓴다 — 전자는 커밋이 없는
  새 저장소(unborn HEAD)에서 실패하는데, 그곳은 원장을 렌더링하기에 아무 문제 없는 자리다.
- **`release`의 self-copy 판정이 심볼릭 링크를 놓치던 문제** — `path.resolve()` 문자열 비교라, source를
  clone의 심볼릭 링크 경로로 열면 물리적으로 같은 디렉터리인데도 다르다고 봤다. `realpath`로 비교한다.
- **`src/commands/summary.mjs`가 git에서 binary로 취급되던 문제** — Map 키 구분자로 리터럴 NUL 바이트가
  들어가 있었다. 동작에는 문제가 없지만 `git diff`·`git show --stat`이 내용을 보여주지 못했고,
  **이 파일을 대상으로 한 리뷰에서 정작 파일이 통째로 안 보였다.** 구분자를 `/`로 바꾸고
  NUL 부재를 회귀 테스트로 고정했다.

## [0.16.0] - 2026-08-19

### Changed
- **원장(`docs/task_summary.md`, `docs/<user>/<user>-task.md`)이 생성물이 되었다 — 병렬 브랜치 충돌 제거.**
  이전에는 `task`가 요약표 끝에 행을 append하고 사용자 인덱스의 `## Open` 헤더 바로 아래에 항목을
  insert했으며, `done`이 두 파일을 다시 고쳤다. 새 항목이 **항상 같은 위치**에 들어가므로 내용이 서로
  겹치지 않는 브랜치끼리도 반드시 머지 충돌이 났다. 실제로 소비 프로젝트에서 MR 두 건이 이 두 파일
  때문에 충돌해 수동 rebase와 force-push가 필요했고, 정작 각 MR의 실제 변경 파일은 겹치지 않았다.
  이제 `task`/`done`은 자기 task 디렉터리의 `<name>-meta.json`만 쓰고 원장은 건드리지 않는다.
  브랜치가 공유 파일을 수정하지 않으므로 충돌이 **구조적으로 불가능**하다.

### Added
- **`harness-team summary`** — task 디렉터리를 스캔해 원장을 렌더링한다. 인자 없이 실행하면 stdout으로
  출력하고(읽기 전용), `--write`는 파일을 갱신하며, `--check`는 원장이 낡았으면 exit 1(mutation 없음, CI용).
  `--write`는 **기본 브랜치에서만** 동작한다 — 이 가드가 없으면 누군가 feature 브랜치에서 실행해 방금
  없앤 충돌을 되살린다(`--force`로 우회 가능). 렌더는 결정론적이라(요약표 created 오름차순, 인덱스 최신순)
  재생성해도 diff가 튀지 않는다.
- **`<name>-meta.json`** — task별 기계 소유 상태(`created`/`status`/`closedAt`). SSOT 4파일이 아니며 손으로
  고치지 않는다. spec.md는 에이전트가 통째로 덮어쓰고 handoff.md는 post-commit hook이 다시 쓰므로
  둘 다 harness가 읽어야 하는 상태를 담을 수 없다.
- **`migrate`의 원장 → meta.json 백필** — 과거 task는 상태와 created가 디렉터리에서 파생되지 **않는다**.
  실측: 한 저장소에서 원장의 `✅ done`은 6개인데 handoff의 `— 완료` 마커는 4개뿐이었고, `done`이 인덱스의
  `- <name> (created …)`를 `- ✅ <name>`으로 덮어쓰기 때문에 완료된 task는 원장이 created의 유일한 출처였다.
  백필 없이 전환하면 과거 task가 전부 open으로, 날짜 없이 표시된다.

### Fixed
- **`release`가 개발 저장소와 marketplace clone이 같은 디렉터리일 때 중단되던 문제** — 메인테이너는 보통
  marketplace clone 안에서 개발하므로 `root === marketplaceDir`이 된다. 8단계의 marketplace 동기화가
  `marketplace.json`을 자기 자신에게 복사하려 해 `cp`가 `EINVAL (src and dest cannot be the same)`로
  던졌고, 매니페스트 4개와 cache는 이미 새 버전으로 올라간 **반쯤 적용된 트리**가 남았다. 실제로 0.16.0
  릴리스에서 발생했다. 이제 두 경로가 같으면 동기화를 건너뛴다(clone이 곧 source이므로 옮길 것이 없다).
  같은 경우 stale clone 경고도 내지 않는다 — 자기 자신을 뒤처졌다고 경고하는 셈이었다.
- **`summary --write`가 `master` 기본 브랜치 저장소를 오거부하던 문제** — `origin/HEAD`가 없으면 기본
  브랜치를 `main`으로 단정했다. 이제 `origin/HEAD`가 없을 때 `main`/`master` 둘 다 인정한다.
  `init.defaultBranch`는 조회하지 않는다 — 대개 전역 설정이라 "새 repo를 만들 때의 선호"일 뿐이고,
  `main` 선호를 가진 사용자가 `master` 저장소에서 작업하면 같은 오거부가 발생한다.

## [0.15.2] - 2026-08-13

### Fixed
- **전역 CLI가 조용히 구버전으로 남던 문제** — 릴리스 뒤 이 플러그인은 세 곳에 존재한다: 버전별 cache(설치본), marketplace clone(카탈로그), 그리고 PATH의 `harness-team`(훅과 터미널이 실제로 실행하는 바이너리). 세 번째는 보통 clone을 가리키는 심볼릭 링크인데 `release`는 clone의 `marketplace.json`·`commands/`만 덮어쓴다. 그래서 clone이 옛 커밋에 멈춘 채 버전만 새 값이 되는 **자기모순 트리**가 되고, `installed_plugins.json`은 새 버전을 가리키는데 훅은 옛 코드로 돈다. 실제로 0.15.1 직후 이 상태에서 전역 CLI가 0.14.0이었고, 0.15.1이 고친 `--help` 가드가 없어 `harness-team release --help`가 또 진짜 릴리스를 수행했다. 이제 `release`가 clone이 뒤처졌음을 `⚠️`와 `next:` 힌트로 알리고, `doctor`에 `global CLI version drift` 검사가 추가돼 PATH CLI 버전과 설치 버전이 다르면 경고한다. 이 검사는 **plugin-dev 저장소에서도 실행된다** — 다른 소비자 전용 검사와 달리, 전역 CLI와 소스 트리가 가장 크게 벌어지는 곳이 메인테이너 머신이고 이번 사고도 거기서 났다. `release`가 clone을 대신 git pull 하지는 않는다(남의 checkout을 건드리는 것은 이 명령의 일이 아니다). MAINTAINING.md에 세 위치와 갱신 주체를 표로 명시했다.
- **doctor가 warning 뒤에도 `All checks passed`를 출력하던 문제** — 텍스트 모드의 경고 집계가 JSON 모드에서만 채워지는 `checks` 배열을 읽어 항상 0이었다. `⚠️` 줄을 출력한 직후 초록 결론을 내는 셈이라, 같은 실행의 JSON(`status: "warning"`)과도 어긋났다. 이제 두 모드가 같은 카운터를 공유한다. 드리프트 검사와 무관한 선행 결함이지만 새 경고가 이 모순을 눈에 띄게 만들었다.

## [0.15.1] - 2026-08-13

### Fixed
- **`--help`가 명령을 실제로 실행하던 문제** — CLI는 `--help`를 **command 자리에 있을 때만** 인식했다. `harness-team release --help`는 `help`를 평범한 boolean 플래그로 파싱한 뒤 라우터로 내려가 **진짜 patch 릴리스를 수행**했다(매니페스트 4개 범프 + `~/.claude` 캐시·마켓플레이스·`installed_plugins.json` 쓰기). 처음 보는 CLI를 `--help`로 탐색하는 건 사람과 에이전트 모두의 기본 동작이라, 이 구멍은 우연이 아니라 반복해서 밟힌다. 같은 원인으로 **모르는 플래그가 조용히 `true`로 수용**돼 오탈자(`--dryrun`)도 기본값 릴리스가 됐고, 값이 빠진 `--target`은 boolean이 경로 해석에 도달해 무관한 TypeError로 죽었다. 이제 `src/cli-args.mjs`의 `resolveInvocation`이 argv 전체를 먼저 해석해 help/version 응답·미지 플래그 거부(exit 2)·값 누락 거부를 **라우터에 닿기 전에** 끝낸다. 명령 테이블이 help 문구와 허용 플래그의 단일 소스라 "허용되는 플래그"와 "문서화된 플래그"가 구조적으로 같아진다.
- **`--no-symlinks` 죽은 문서** — `3ebbbc2`에서 구현이 사라졌는데 help 문구에만 남아 있었다. 엄격 검증이 들어오면서 실제로 거부되므로 help에서 제거했다.
- **수용되지만 무시되던 backup 플래그** — 1차 수정이 `--backup-dir`/`--backup-parent`를 backup 계열 명령 전체에 허용했는데, `backup`·`migrate`는 `loadBackupDir`만 호출해 둘 다 읽지 않고 `--backup-parent`는 init/apply만 읽는다. `harness-team backup --backup-dir B`가 조용히 기존 설정 A에 대해 파일을 옮기는, 고치려던 것과 같은 종류의 실패다(Codex 외부 리뷰 지적). 이제 각 명령은 자기 구현이 실제로 읽는 플래그만 선언하고, 선언한 플래그가 해당 모듈에서 읽히지 않으면 테스트가 실패한다.
- **`--` 종료자와 값 위치의 help 토큰** — `--`가 빈 이름 플래그로 파싱돼 `retro -- --help` 같은 자유 텍스트가 거부됐고, argv 전체를 훑는 help 스캔 탓에 `doctor --target -h`처럼 `-h`가 값인 경우도 help로 새어 나갔다. 이제 `--` 뒤는 전부 positional이고, 플래그로 소비된 help 토큰만 usage 요청으로 센다. `relase --help`처럼 모르는 명령은 `--help` 유무와 무관하게 exit 1로 통일했다.

### Added
- **`harness-team --version`** — 없던 명령이라 `Unknown command`로 떨어졌다. CLI를 안전하게 탐색하려는 호출이 에러가 되면, 다음 시도는 부작용 있는 명령이 된다.

## [0.15.0] - 2026-08-13

### Added
- **Codex SessionStart 훅 템플릿** — `templates/.codex/hooks.json`을 신설해 `apply`/`init`이 대상 프로젝트에 설치한다. Claude 쪽 `.claude/settings.json`과 동일하게 `harness-team session-context`를 호출하므로 Codex 세션도 활성 task의 Context Card를 주입받는다. 훅은 Codex 세션의 cwd에서 실행되므로 `--target "$(git rev-parse --show-toplevel || pwd)"`로 저장소 루트를 직접 해석한다 — 하위 디렉터리에서 Codex를 띄워도 "활성 task 없음"으로 오보하지 않는다. `.claude/settings.json`·`.opencode/opencode.json`과 같은 JSON deep-merge 레인을 쓰므로 이미 자기 Codex 훅을 작성한 프로젝트도 harness 그룹을 추가로 얻는다(사용자 훅 보존, 재적용 멱등). `doctor`는 파일 존재·JSON 유효성만이 아니라 **harness SessionStart 훅이 실제로 들어 있는지**까지 확인한다 — 손으로 편집해 harness 그룹이 빠진 파일은 유효한 JSON이라 파싱 검사만으로는 healthy로 보이지만, 그 상태가 곧 Codex 세션이 조용히 task context를 잃는 드리프트다. apply 스모크가 3개 스택 전부에서 생성을 어써션한다.
- **`.codex`를 백업 아키텍처 관리 대상에 포함** — `backup`/`clone`/`symlink`/`delete`/`upgrade`의 item 목록(JS 5곳 + shell 템플릿 3곳)과 AI gitignore 항목에 `.codex`가 빠져 있었다. 그대로면 `backup` 시 `.codex`만 프로젝트에 실물로 남고 `delete` 시 잔재가 남는다.

### Changed
- **규칙 표면의 비대칭 명시** — README 강제력 표에 `경로 스코프 규칙` 열을 추가하고, `.claude/rules`가 팀 전체 규칙이 아니라는 경고를 넣었다. 경로 스코프 규칙을 읽는 건 Claude Code(+미러를 받는 Cursor)뿐이고 Codex·Gemini·OpenCode는 `.claude/`를 보지 않는다 — 리뷰어(Codex)가 모르는 기준으로 리뷰하는 상황을 막으려면 리뷰 기준은 `AGENTS.md`에 있어야 한다.
- **강제력 비대칭 표 정정** — README의 `Codex | hooks 0`은 0.11.0 probe 기준이라 낡았다. Codex CLI 0.147.0은 프로젝트 로컬 `.codex/hooks.json`을 지원한다(`~/.codex/config.toml` `[hooks.state]`에 신뢰 등록 확인). 훅이 Claude Code 전용 메커니즘이라는 설명을 걷어내고, 훅 표면과 커맨드 표면을 분리해 기술했다 — 슬래시 커맨드는 여전히 Claude Code 전용이고 Codex 스킬은 `.codex-plugin` 별도 설치가 필요하다.

### Fixed
- **Cursor 규칙 미러가 경로 스코프를 파괴하던 문제** — `.claude/rules/*.md`의 `paths:` frontmatter는 Claude Code가 매칭 파일을 읽을 때만 로드하라는 선언인데, 미러는 이를 무시하고 `alwaysApply: true`를 붙인 뒤 원본 frontmatter를 본문에 그대로 남겼다. 결과적으로 Cursor에서는 좁혀 둔 규칙이 항상 로드되고 죽은 frontmatter가 리터럴 텍스트로 남았다. 이제 `paths:` → Cursor `globs:`(auto-attach, `alwaysApply: false`)로 번역하고 원본 frontmatter는 소비한다. `paths:`가 없는 규칙만 `alwaysApply: true`로 유지한다.
- **원본이 사라진 Cursor 미러가 영구히 남던 문제** — 미러가 쓰기만 하고 지우지 않아, 규칙 이름을 바꾸거나 하위 폴더로 옮기면 옛 `.mdc`가 그대로 남고 Cursor는 그것을 계속 로드했다. 규칙 하나가 옛 스코프와 새 스코프로 두 번 적용되는 셈이다(재귀 미러링이 들어가면서 "규칙을 폴더로 정리"가 실제 시나리오가 됐다). 이제 `.harness/cursor-mirror.json`에 **직전 실행이 쓴 경로를 기록**하고, 그 기록에 있으면서 이번에 다시 쓰이지 않은 산출물만 제거한다. 삭제 권한을 파일 내용이 아니라 기록에서 가져오는 이유는, 생성 `.mdc`에 찍는 `<!-- harness:mirror -->` 스탬프가 공개 문자열이라 생성물을 복사해 만든 사용자 규칙도 그 스탬프를 갖기 때문이다 — 그런 사본과 구버전 하네스 산출물은 기록에 없으므로 안전하다. 스탬프는 2차 게이트로 남아, 사용자가 스탬프를 지우면 인수한 것으로 보고 건드리지 않는다. `.claude/rules`가 통째로 삭제된 경우도 prune 대상이며, 비게 된 디렉터리를 정리하고 `sync`가 prune 건수를 보고한다.
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

---
tags:
  - project
  - ai
  - obsidian
created: 2026-06-02
modified: 2026-08-21
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

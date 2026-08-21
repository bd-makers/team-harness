# ship-command — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과 (2026-08-20)

`/harness-ship` — PR/MR 직전 최종 갱신 커맨드를 추가했다. PR #25 (base: main, 머지하지 않음).

- `commands/harness-ship.md` (신규) — 핵심 제약 → 실행 절차 7단계 → 예시.
  `commands/harness-codex-review.md`의 구조·문체를 따랐다.
- `skills/harness-ship/SKILL.md` (신규) — Codex 래퍼. `skills/harness-task/SKILL.md` 형식대로
  command 문서를 SSOT로 읽고 Claude 전용 참조(`AskUserQuestion` 등)를 Codex 문맥으로 번역한다.
- `.claude-plugin/plugin.json` commands 배열 등록 (version 필드 불변, 21 → 22개).
- `AGENTS.md` ↔ `templates/AGENTS.md.hbs` — task 워크플로우에 **도구 중립 한 줄**만 추가(쌍 동일).
- `README.md` — 커맨드 수 21 → 22, 빠른 시작에 ship 단계, `/harness-ship` 절 추가.
- `CHANGELOG.md` `[Unreleased]` → Added (버전 범프 없음).
- `docs/harness-overview.html` — `npm run docs:generate` 재생성(생성물).
- 다이어그램: 미실행 (이 task 자체는 다이어그램 산출물이 필요 없는 문서·커맨드 변경 —
  `diagram-design` 스킬 호출 없음).

### 검증 (실제 출력)

```
$ npm run docs:check
harness overview 생성 상태가 최신입니다.

$ npm run test
ℹ tests 290 / pass 290 / fail 0        (tests/*.test.mjs + tests/e2e/*.test.mjs)
ℹ tests 1   / pass 1   / fail 0        (tests/perf/*.test.mjs)
```

샌드박스(`tests/e2e/sandbox.mjs`의 `appliedSandbox`)로 실제 scaffold 결과도 확인:
새로 apply 된 프로젝트의 `AGENTS.md`에 ship 한 줄이 들어가고, 특정 도구 이름(`diagram-design`)
호출은 들어가지 않으며, `CLAUDE.md`가 protocol 절을 복제하지 않는다.

### CI (PR #25)

- `test (20)`: 3회 모두 pass. `test (18)`: 처음 2회 pass → 3번째 run에서 fail → **동일 커밋
  재실행에서 pass**. 실패한 커밋(`e172bb6`)은 handoff 마크다운 2개만 바꾼 커밋이라 코드 델타가
  없었다. 따라서 Node 18 러너의 flake로 판단한다. 실패 로그 원문은 확보하지 못했다 — GitHub의
  로그 blob 호스트가 이 샌드박스에서 차단되어 `gh run view --log`·직접 다운로드·WebFetch가 모두
  막혔다. 현재 PR 체크는 18/20 모두 green.

### main 리베이스 + 사실 수정 (2026-08-21)

PR #26(spec/plan 단계 다이어그램 옵트인)이 main에 머지되어 `origin/main` 위로 리베이스했다.

- **`AGENTS.md` task 워크플로우 목록** — #26의 "다이어그램(옵트인)" 불릿과 이 브랜치의
  "PR/MR 직전(ship)" 불릿이 같은 목록에 들어간다. 양쪽 다 살렸고 순서는
  시작 → 다이어그램 → 진행 → 경계 계약 → commit 시 → **ship** → 완료.
- **`CHANGELOG.md` `[Unreleased]`** — #26의 Added 항목을 앞에, 이 브랜치 항목을 뒤에 두고
  Keep a Changelog 순서(Added → Changed → Fixed)로 정리했다. 상대 항목은 지우지 않았다.
- **`docs/chad/chad-handoff.md`** 충돌은 hook 생성물이라 이 브랜치의 활성 task(ship-command)
  쪽을 취했다. 리베이스 중에는 post-commit hook이 매 커밋마다 handoff를 다시 써서 rebase가
  멈추므로 `git -c core.hooksPath=<빈 디렉터리> rebase`로 훅을 끈 채 진행했다.
- **사실 수정**: `diagram-design`을 "Claude Code 전용"이라고 단정한 서술이 **틀렸다.** 그
  저장소에는 `.codex-plugin/plugin.json`이 있고 `"skills": "./skills/"`를 선언한다(이 머신의
  `~/.claude/plugins/marketplaces/diagram-design/.codex-plugin/plugin.json`에서 직접 확인).
  Codex도 접근할 수 있으므로 "별도로 설치되는 외부 플러그인이며 머신마다 있을 수도 없을 수도
  있다"로 고쳤다 — `CLAUDE.md` §1-B(+템플릿 쌍), `commands/harness-task.md`(#26 파일),
  `commands/harness-ship.md`, `skills/harness-ship/SKILL.md`, CHANGELOG·spec·TCC.
  하드 의존 금지와 probe → degrade → record 계약 자체는 그대로다.
- 재검증: `npm run docs:check` 통과, `npm run test` → tests 300 / pass 300 / fail 0 (+ perf 1/1).

### 하지 않은 것 (의도적)

- `harness-team done`·릴리스 플로우 무변경. `harness-team release` 미실행, main 직접 푸시 없음.
- 새 CLI 서브커맨드 없음(근거는 spec.md 설계 절).
- 다이어그램 옵트인 응답을 저장하는 상태 저장소(`.harness/config.json` 스키마·전용 doctor 체크) 없음.
- PR은 열기만 하고 머지하지 않았다.


## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-08-20 — Codex read-only 외부 리뷰 (`codex exec --sandbox read-only`, branch diff vs origin/main)

**Gemini 병렬 리뷰는 미실행** — 이 머신에 `gemini` CLI가 설치되어 있지 않다(`command -v gemini` 없음).

Verdict: **P1 blocking 없음. P2 수정 후 병합 권장.** 커맨드 자체에서 PR/MR 생성·push·`done`·
release 실행 경로는 발견되지 않았고, CLI/release/version 변경 없음, AGENTS/template managed
섹션 동기화 확인.

발견별 판별과 조치:

| # | 발견 | 판별 | 조치 |
|---|---|---|---|
| P2-1 | `MAINTAINING.md`가 새 커맨드마다 CLI 서브커맨드 등록을 요구해 no-new-CLI 설계와 충돌. `SKILL.md`는 ship에 없는 CLI 실행을 권함 | **진짜 결함** — MAINTAINING의 표는 `skills/<name>/SKILL.md`와 overview 재생성도 빠져 있었다(이번에 직접 밟은 함정) | MAINTAINING 표를 재작성: bin 등록은 **CLI를 감싸는 커맨드만**, skill 래퍼·overview 재생성·`git add` 선행 규칙 추가. SKILL.md의 "prefer the CLI" 문구를 ship 사실(CLI 서브커맨드 없음)로 교체 |
| P2-2 | "`docs/`는 Obsidian 볼트라 script가 제거된다"를 일반 계약으로 고정 — 소비자 프로젝트에 보장되지 않고, 이 저장소의 `docs/harness-overview.html`은 실제로 mermaid JS(`vendor/mermaid.min.js`)를 쓴다 | **진짜 결함** — 근거를 확인함(`docs/harness-overview.html:7`) | 조건부 서술로 교체: "script를 제거하는 뷰어에서 열리는 경우가 많으므로 자립형 inline SVG가 **기본값**"이고, 뷰어가 script를 실행하는 것이 확실하면 다른 형식도 가능하되 근거를 artifact에 남긴다 |
| P2-3 | `README.md:109`가 여전히 슬래시 커맨드 21개 | **진짜 결함** — 87·90행만 고치고 이 행을 놓쳤다 | 22개로 수정 |
| P2-4 | "Claude 전용 호출은 commands에만"이라는 주장과 달리 spec에도 슬래시 토큰이 있음 | **부분 인정** — 제약의 대상은 *배포되는* 계약 문서(AGENTS/템플릿)이고 spec은 배포되지 않는 task 문서다. 다만 문장이 무조건적이었다 | spec·CHANGELOG 문구를 "배포되는 계약 문서 중에서는"으로 한정 |
| P2-5 | no-PR/no-done·다이어그램 옵트인·AGENTS 도구 중립 계약의 회귀를 막는 테스트 없음 | **진짜 결함** — manifest-sync는 등록·router 구조만 본다 | `tests/ship-command.test.mjs` 신규 5개: PR 미생성·`done` 미실행, probe/degrade/record 옵트인, AGENTS 쌍의 도구 중립성(`diagram-design`·`/harness-ship` 토큰 금지), commands·skills 어디서도 `harness-team ship`을 만들지 않음 |
| P3-1 | "PR/MR 전수 grep 0건"은 현재 `origin/main`과 다름 | **진짜 결함** — D5(PR #24)가 머지되며 AGENTS·README에 PR/MR 서술이 들어왔다. 브리프 작성 시점의 사실이 그 뒤 낡았다 | spec을 "라이프사이클 **커맨드**에 PR/MR 단계가 없다"로 정정하고 D5를 명시 |
| P3-2 | PR·artifact 완료 후에도 TCC의 current step이 "PR 생성"으로 남음 | **진짜 결함** | TCC 갱신 |

조치 후 재검증: `npm run docs:check` 통과, `npm run test` → tests 295 / pass 295 / fail 0
(+ perf 1/1). 신규 테스트 5개 포함.


## Learnings

- **생성물은 `git add` 다음에 생성한다.** `scripts/generate-harness-overview.mjs`는 source tree를
  `git ls-files`로 열거하므로, 새 파일이 untracked인 채로 `npm run docs:generate`를 돌리면 새 행이
  빠진 HTML이 생성되고 커밋 후(추적 상태) 테스트가 깨진다. 순서: 파일 작성 → `git add` →
  `docs:generate` → `git add` 재생성물 → commit.
- **문서 규칙은 항상 쌍으로 존재한다.** `AGENTS.md`↔`templates/AGENTS.md.hbs`,
  `CLAUDE.md`↔`templates/CLAUDE.md.hbs`. `tests/agent-files.test.mjs`가 마커 절을 `assert.equal`로
  비교하므로 공백·줄바꿈까지 바이트 동일해야 한다.
- **커맨드 추가는 4곳을 동시에 건드린다**: `commands/<name>.md`, `skills/<name>/SKILL.md`(같은
  `name:` + `commands/<name>.md` 참조 필수), `.claude-plugin/plugin.json` commands 배열,
  `docs/harness-overview.html`(생성물). manifest-sync가 네 방향을 모두 강제한다.
- **skills frontmatter는 allowlist다** — `name`/`description`/`license`/`allowed-tools`/`metadata`만
  허용되고 description에 꺾쇠(`<`, `>`)를 쓸 수 없다. command 쪽 `phase:`·`argument-hint:`를 그대로
  복사하면 즉시 실패한다.
- **command 문서에 존재하지 않는 `harness-team <sub>`를 쓰면 CI가 막는다.** manifest-sync가 백틱·
  줄머리 표기를 모두 스캔해 router case와 대조하므로, 예시 코드펜스 안이라도 안 된다. 이것이
  "새 CLI를 만들지 않는다"는 결정의 실제 강제 지점이었다.
- **probe 대상이 바이너리가 아니면 `command -v`를 쓸 수 없다.** `diagram-design`은 플러그인
  스킬이라 존재 확인이 "스킬이 노출되는가 / 호출이 성공하는가"로 표현되어야 한다.
  codex-review에서 가져올 것은 문구가 아니라 **구조**(probe → 단정적 설치 안내 금지 → degrade →
  '미실행' 기록)였다.


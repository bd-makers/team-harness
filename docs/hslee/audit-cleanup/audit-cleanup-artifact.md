# audit-cleanup — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

### 2026-09-03 — 감사 수정 + apply 삭제 + OpenCode·Gemini 제외 (D7)

**입력**: 2026-09-03 전수 점검(서브에이전트 4렌즈: 문서·커맨드/스킬/CLI·훅·룰, 표본 검증 19건 전부 일치) + 사용자 결정
"apply 삭제", "opencode·gemini 부분 우선 제거".

**제거**
- `apply`: `src/commands/apply.mjs`, bin 라우터, `cli-args` COMMANDS, `commands/harness-apply.md`, `skills/harness-apply/`,
  plugin.json commands. doctor·migrate 안내는 `harness-team init`으로. `init` summary를 "scaffold or refresh"로.
- OpenCode·Gemini: `templates/GEMINI.md.hbs`, `templates/.opencode/`, 루트 `GEMINI.md`, `AGENT_FILE_TEMPLATES`, planChanges의
  opencode 병합, gitignore 항목, ITEMS 5곳 + 템플릿 sh 3곳, doctor EXTERNAL_TOOLS·CHECKS, 역할표·D2/D4 요약, 컨텍스트 표,
  settings.json `Bash(gemini:*)`, 리뷰 엔진 목록·체인(codex → claude), 매니페스트 4종 설명·키워드, migrate의 GEMINI.md 재생성.
  `docs/decisions.md` = `templates/docs/decisions.md`에 D7 append(멤버 제외 + 소스 저장소 비-dogfood 결정).

**수정(코드)**
- P0 observe-tools entry 게이트: `URL.pathname` → `fileURLToPath` + realpath 비교. 공백·한글 경로 spawn 테스트.
- migrate `REFRESHABLE_HOOK_FILES`(+boundary-checkpoint.sh, observe-tools.mjs) + sha 표 4건(pre-audit-cleanup fixture 4파일).
  doctor CHECKS에 block-dangerous-git.sh(exec)·observe-tools.mjs 추가.
- merge `MarkerMismatchError`(begin/end 개수 불일치 거부) → planChanges `brokenMarkerFiles` → init 경고·건너뜀.
- boundary checkpoint: 실패 줄 stderr 미러(`ctx.mirrorStderr`), Write 처리(checked 개수 증가 시 검사), `- [X]` 허용.
- detect-stack: TS는 tsconfig/typescript 의존성 기준(이 저장소 AGENTS.md → JavaScript), `bun.lock` 감지, `KNOWN_STACK_IDS` 검증(exit 2),
  `resolveStack`(JS 계열 override는 감지 pm·스크립트 유지). RN rules 게이트를 유효 stack(`ctx.stackId`)으로 — 비-RN 프로젝트는
  rules 0개, `.cursor/rules` 미러 없음(e2e 기대값 갱신).
- git-hooks: `git rev-parse --git-path hooks`(worktree·core.hooksPath), 마커 `harness-team handoff`, append 시 exec 비트 보정.
- protect-files: 경계 있는 ERE(`.envrc`·`dev.env.md`·`android/builder.ts`·`build.gradle` 통과, `.env.*` 보호 유지).
- block-dangerous-git: `-fu`·`+refspec`·`-C`/`-c`/`--git-dir` 프리픽스·`--delete`/`:branch`·`branch --delete --force`·
  `restore --worktree|-W`·`stash drop|clear` 차단; `--force-if-includes`·`-S`·`-u`·`HEAD:main`·`--dry-run` 통과.
  저정밀 payload 스캔을 위해 토큰 끝 경계에 `"` 포함(`END`).
- boundary-checkpoint.sh: CLI 부재 시 조용히 exit 0, 100755. doctor `checkHookCli`가 `boundary`까지 확인.
- gitignore `harnessNeeded`: `.harness/active.json`·`config.json`·`observability/`만(backup.json 커밋 가능).
- 자기 저장소 `.codex/hooks.json`: toplevel 절대경로 + `--target`.

**수정(문서)**: README(멤버·init-only·23개·doctor 표·done 원장·backup.json·ITEMS·마커 안내), MAINTAINING, prerequisites(표·devDependencies·
Cursor 절·23종), commands 12개(review 엔진·init 재실행/gitignore 정본·task 예약어 분기·delete/upgrade 경고·sync·doctor·retro 경로·release
`node bin`+MAINTAINING 단계), skills 6개, 템플릿 스킬 3개(verify는 AGENTS.md `## 명령` 절 참조), rules 2개, clone/delete.sh 경계 매치,
overview 템플릿+mmd 4개+훅 카드 2개, 현행 가이드 6개, index.html hslee 등재, CHANGELOG `[Unreleased]`. 스킬 6개 `agents/openai.yaml` 추가.

**리뷰 반영(codex 1차, 6건)**: GIT 프리픽스에 값 없는 전역 옵션·공백 분리 값 옵션 포함; `assertMarkerPairs`(교대·비중첩);
boundary Write 항목 단위 판정; `settingsHasBoundaryCheckpoint(requireWrite)` — doctor 엄격/migrate 관대; post-commit 마커 비주석 줄만;
`--stack` help를 `KNOWN_STACK_IDS`에서 렌더. 각 건에 테스트 추가.

**검증**: `npm test` 508 pass / 1 skip(CI 전용) + perf 1 pass; `npm run docs:check` exit 0; 신규 테스트 6파일
(git-hooks·detect-stack·observe-tools-entry·boundary-checkpoint-write·gitignore-entries + agent-files/migrate-hooks/stack-rules/hooks-jq 확장).
현행 문서의 `opencode|gemini|harness-apply` 잔존 0(이력 스냅샷·부정 단언 테스트·D7 본문 제외).

**남긴 것**: 커밋·푸시는 사용자 지시 대기(변경은 스테이징만). `templates/.claude/settings.json`의 pnpm 권한 목록은 범위 밖.
`docs/task_summary.md` 원장은 기본 브랜치에서 `summary --write`로 갱신.


## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


### 2026-09-03 — codex (read-only, scope=worktree, 스테이징된 120파일)

**실행**: `codex exec --sandbox read-only "<공용 프롬프트 + focus>" < /dev/null` (백그라운드, 150,586 tokens). 폴백 없음(명시 codex).
**요약**: P1 1 · P2 4 · P3 1. "apply 삭제·OpenCode/Gemini 제거는 현행 문서·실행 경로에서 일관됨, 잔존은 이력·D7 설명뿐."
**판별(재현 결과)** — 6건 전부 진짜 결함:
- P1 `block-dangerous-git.sh` — 값 없는 전역 옵션(`--no-pager`·`-p`)과 공백 분리 `--work-tree <dir>`가 subcommand 인접을 깨뜨려
  `git --no-pager reset --hard HEAD`·`git --work-tree /tmp/repo clean -fd` exit 0. **재현됨**(원래 패턴에서도 통과하던 사전 결함이나,
  이번에 전역 옵션을 열거하면서 빠뜨림). 조치: 일반 `-<opt>` 토큰과 공백 분리 값 옵션까지 GIT 프리픽스에 포함 + 테스트.
- P2 `merge.mjs` — 개수만 비교해 `end … begin` 순서 오류를 통과시키고 2차 실행에서 USER TEXT를 삭제. **재현됨**. 조치: 마커를
  문서 순서로 걸어 begin/end 교대·비중첩을 검증.
- P2 `boundary.mjs` Write — 순증 비교라 `[ ]→[x]` + `[x]→[ ]` 스왑이 우회. **재현됨**. 조치: 항목 단위로 "새로 체크된 항목" 존재 여부로 판정.
- P2 `settingsHasBoundaryCheckpoint` — matcher `Edit`만으로 정상 판정해 Write 배선 누락을 doctor·migrate가 놓침. **코드 확인**. 조치: Edit·Write 둘 다 요구.
- P2 `git-hooks.mjs` — 주석에 `harness-team handoff`만 있어도 설치됨으로 오인. **코드 확인**. 조치: 비주석 줄만 인정.
- P3 `cli-args.mjs` help — `expo` 누락. **확인**. 조치: help 목록을 `KNOWN_STACK_IDS`에서 생성.
**조치**: 6건 모두 같은 세션에서 단일 스레드로 반영(아래 2차 리뷰 참조). 리뷰어는 어떤 파일도 수정하지 않음.

<!-- harness:review kind=codex scope=worktree tip=3c659bbe1df837b279b487a3fbab3394c9b6c6b0 at=2026-09-03T00:20:15Z -->

### 2026-09-03 — codex 2차 (read-only, scope=worktree, 1차 발견 6건의 수정분 재검증)

**실행**: `codex exec --sandbox read-only "<공용 프롬프트 + 6건 재검증 focus>" < /dev/null` (백그라운드, 131,702 tokens). 폴백 없음.
**결과**: P1/P2/P3 발견 없음. 리뷰어가 직접 실행해 확인: git 훅 차단 3·허용 2 + jq 없는 payload 스캔 fail-closed, 마커 순서 오류 거부·
균형 복수 pair 병합·깨진 파일 제외, Write 스왑 차단·완료 plan 재작성 무시, doctor(Edit|Write)/migrate(Edit-only 존중) 분리 일관,
주석 마커 비인정, `KNOWN_STACK_IDS` 단일 원천(import cycle·I/O 없음). 리뷰어 자체 실행: `node --test tests/harness-settings.test.mjs tests/cli-args.test.mjs` 23 pass.
**판정**: "여섯 수정 범위는 승인 가능, 유의미한 회귀 없음." 작성 세션 검증: `npm test` 508 pass / 1 skip + perf 1 pass, `docs:check` exit 0.
**조치**: 없음.

<!-- harness:review kind=codex scope=worktree tip=3c659bbe1df837b279b487a3fbab3394c9b6c6b0 at=2026-09-03T00:28:06Z -->

## Learnings


## Learnings (2026-09-03)

- 감사→수정 세션: 위임 표본검증, 휴리스틱 교체 시 문법 전체 테스트, 개수 검사의 한계, docs:generate 전 git add
- **위임 결과는 표본 검증이 실제로 잡는다** — 4개 서브에이전트의 발견 중 19건을 직접 재현했고 전부 일치했지만, 그 확인이 있어야
  "추정"으로 온 merge 데이터 손실 건을 확정으로 올릴 수 있었다. 산문 결론이 아니라 `path:line`을 받게 한 프롬프트 형식이 이를 가능하게 했다.
- **휴리스틱을 고칠 때는 보고된 케이스가 아니라 문법 전체를 테스트한다** — `git -C` 우회를 닫으며 값 있는 전역 옵션만 열거했더니
  codex가 값 없는 옵션(`--no-pager`)과 공백 분리 값(`--work-tree x`)으로 곧바로 뚫었다. "어떤 토큰이 subcommand 앞에 올 수 있나"를
  먼저 적고 그 목록으로 매트릭스를 만들었어야 했다.
- **개수 검사는 구조 검사가 아니다** — 마커 begin/end 개수, 체크박스 개수 둘 다 codex가 순서·스왑으로 뚫었다. 짝·순서가 의미인 것은
  문서 순서로 걸어 검증하고, 집합의 변화는 원소 단위로 비교한다.
- **`docs:generate` 전에 `git add -A`** — 인벤토리가 `git ls-files` 기준이라 삭제·신규 파일이 index에 없으면 삭제된 `apply` 파일이
  생성물에 그대로 남고 새 테스트는 빠진다(docs:check는 그래도 green이라 잡지 못한다).
- **비-TTY에서 readline은 답할 수 없다** — 슬래시 커맨드 문서는 CLI 프롬프트에 의존하지 말고 AskUserQuestion으로 받은 답을 플래그로
  넘겨야 한다(`init`은 그렇게 돼 있었고 `apply` 문서는 아니었다 — 삭제로 해소).
- **"우선은 제거"는 멤버 표면 전체를 뜻한다고 읽고 명시했다** — 스캐폴드·역할표·doctor·gitignore·ITEMS·리뷰 엔진 체인·매니페스트·
  문서 7종·다이어그램까지 한 표면이라도 남기면 규범과 실체가 다시 어긋난다. 이름을 부르는 모든 곳을 plan에 적는 규칙이 여기서도 맞았다.

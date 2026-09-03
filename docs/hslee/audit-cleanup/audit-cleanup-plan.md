# audit-cleanup — Plan

## 목표
감사 발견 수정 + `apply` 명령 삭제 + OpenCode·Gemini 멤버 제거. 전체 테스트·docs:check green, 외부 리뷰 기록 후 done.

## 단계

### 1. 코어 제거 (CLI·템플릿·테스트)
- [x] `apply` 삭제: `src/commands/apply.mjs`, `bin` 라우터·import, `cli-args` COMMANDS·주석·help, `commands/harness-apply.md`, `skills/harness-apply/`, `.claude-plugin/plugin.json` commands
- [x] OpenCode·Gemini 스캐폴드 삭제: `templates/GEMINI.md.hbs`, `templates/.opencode/`, 루트 `GEMINI.md`, `harness.mjs` AGENT_FILE_TEMPLATES·opencode 병합·gitignore 항목, `init.mjs` 메시지
- [x] ITEMS 목록 정리: `src/commands/{backup,clone,delete,symlink,upgrade}.mjs`, `templates/{clone,delete,symlink}.sh`
- [x] doctor: EXTERNAL_TOOLS(gemini·opencode 제거), CHECKS(GEMINI.md·opencode.json 제거, block-dangerous-git.sh·observe-tools.mjs 추가), 경고 문구 `apply` → `init`
- [x] migrate: `migrateToAgentsMd`에서 GEMINI.md 생성 제거(레거시 symlink는 unlink만), 메시지 `apply/init` → `init`, CLAUDE_HOOK_FILES·sha 표에 observe-tools.mjs·boundary-checkpoint.sh 편입
- [x] 템플릿 문서: `AGENTS.md.hbs`(헤더·역할표·D2/D4 요약·컨텍스트 표), `templates/.claude/settings.json`(`Bash(gemini:*)`), `task.mjs` artifact 템플릿 문구
- [x] `docs/decisions.md` = `templates/docs/decisions.md`에 D7 append(멤버 제거 + 자기 저장소 비-dogfood)
- [x] 테스트 갱신: agent-files, cli-args, doctor, codex-hooks, migrate-agents, done-guard, e2e(apply-smoke → init-smoke, ssot-consistency, sandbox), sim 스크립트의 `apply` 호출
- [x] 루트 `AGENTS.md`·`CLAUDE.md` 관리 절 재렌더, `.codex/hooks.json` 템플릿 형태로 교정

### 2. 감사 발견 코드 수정 + 회귀 테스트
- [x] P0 `observe-tools.mjs` main-module 게이트 `fileURLToPath` + 공백 경로 spawn 테스트
- [x] `merge.mjs` begin/end 마커 개수 불일치 시 append 대신 오류 + 테스트
- [x] `boundary.mjs` checkpoint 실패 사유 stderr 미러 + Write 도구 판정 + 테스트
- [x] `detect-stack.mjs` TypeScript 판정(tsconfig·typescript 의존성) + `init.mjs --stack` 검증·감지 cmd 유지 + RN rules 게이트를 유효 stack id로 + 테스트
- [x] `git-hooks.mjs` `git rev-parse --git-path hooks`(worktree·core.hooksPath) + 마커 판정 강화 + 테스트
- [x] `protect-files.sh` 경계 있는 패턴, `block-dangerous-git.sh` `-fu`·`+refspec`·`-C`·`branch --delete --force` 변형 + 테스트
- [x] `boundary-checkpoint.sh` CLI 부재 시 조용히 통과 + 실행 비트, doctor `checkHookCli`에 boundary 포함
- [x] `harness.mjs` gitignore `harnessNeeded`를 `.harness/active.json`·`.harness/config.json`·`.harness/observability/`로 좁힘 + 테스트
- [x] `cli-args` `--json` 도움말에 summary 추가, `--stack` 허용 목록 검증

### 3. 커맨드·스킬·룰 문서
- [x] `harness-task.md` 예약어(list·done·handoff) 분기, `harness-review.md` description 따옴표·gemini 절 제거·체인 codex → claude, `harness-adversarial-review`·`contrarian`·`simplifier` 힌트
- [x] `harness-init.md` description·gitignore 미리보기 문단·`react` 힌트, `harness-doctor.md` `/harness-apply` 참조, `harness-sync.md`·sync SKILL description, `harness-retro.md` 호출 경로, `harness-delete.md`·`harness-upgrade.md` `--include-real`·`--yes` 경고, `harness-release.md` MAINTAINING 절차 포인터
- [x] skills: harness-review·adversarial-review SKILL 엔진 목록·체인, harness-team SKILL(`apply` 줄·`--skip-cache`), harness-sim·codex-sim SKILL `apply` 참조
- [x] 템플릿 스킬: verify(pnpm 하드코딩 → AGENTS.md 명령 절 참조), new-feature(spec 게이트·`/handoff`), fix-bug(코드 리뷰 기준 위치)
- [x] 룰: `styling.md` Animated 귀속, `testing.md` lint 규칙 2줄 제거; `templates/delete.sh`·`clone.sh` 접두 매치
- [x] 6개 스킬 `agents/openai.yaml` 추가(review·adversarial-review·ship·diagram·comptest·inttest) — codex-wrapper-skills spec의 규칙

### 4. 루트 문서·생성 문서
- [x] README: 멤버·`apply`·`gemini`·`opencode` 서술 전부, 훅 도구 표(:171), done 원장 문구(:157·:483), backup.json 문구(:703·:707), `.codex` 누락(:638), artifact 파일명 통일
- [x] MAINTAINING(:57·:93·:103 표기), docs/prerequisites.md(외부 도구 표·devDependencies·boundary 훅 no-op), docs/ao-worker-rules.md 정합
- [x] docs/index.html hslee 원장·handoff 링크, `docs/harness-overview.template.html` 산문·훅 표 → `npm run docs:generate`
- [x] 매니페스트 4종 description·keywords·author 정합
- [x] CHANGELOG `## [Unreleased]` 기록(Removed / Fixed / Changed)

### 5. 검증·리뷰·종결
- [x] `npm test` exit 0, `npm run docs:check` exit 0, 현행 문서 `grep -i "opencode|gemini|harness-apply"` 잔존 0(이력 제외)
- [x] `/harness-review` 외부 리뷰 실행 → artifact `## Reviews` 기록, 발견 반영 (codex 1차 6건 반영 → 2차 발견 0)
- [x] `/harness-retro` 학습 기록 (artifact ## Learnings 2026-09-03)
- [x] `harness-team done` — 사용자 지시로 121파일 단일 커밋(2026-09-03) 직후 실행. 통과 증거는 handoff `— 완료` 절·meta.json `status: done`(별도 종결 커밋)

### 실행 기록
- 2026-09-03: §1–§4 완료. `npm test` 505 pass / 1 skip(CI 전용) + perf 1 pass, `npm run docs:check` exit 0.
  현행 문서의 `opencode|gemini|harness-apply` 잔존 0(이력·부정 단언 테스트·D7 본문 제외).

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-09-03: "멤버"에서 OpenCode·Gemini 제외. "재실행 동사"가 `apply`에서 `init`으로.

## 참고
- 감사 보고서(세션 2026-09-03), spec `## 참고`의 코드 경로.

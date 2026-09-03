# audit-cleanup — Handoff

## 상태 (2026-09-03, 세션 종료 시점)
- 위치: git worktree `.claude/worktrees/delegation-router-review-9d679d` · 브랜치 `claude/delegation-router-review-9d679d` · base `main` 3c659bb (0.23.1)
- 구현·문서·테스트·리뷰 **모두 완료**. 변경 121파일은 **스테이징만** 되어 있고 커밋은 없다(커밋은 사용자 지시로만).
- 검증: `npm test` 508 pass / 1 skip(CI 전용) + perf 1 pass · `npm run docs:check` exit 0 · `node bin/harness-team.mjs doctor` green(plugin-dev)
- 외부 리뷰: codex 1차(P1 1·P2 4·P3 1 → 전부 재현·반영) → codex 2차(발견 0, 승인). 마커 2개는 artifact `## Reviews`에 있다.
- 남은 단계 하나: **사용자 커밋 → `node bin/harness-team.mjs done`**. 가드가 "미커밋 변경 있음·task 시작 이후 커밋 0개"로 현재 막고 있다. `--force`는 쓰지 않는다.

## 다음 세션이 할 일 (순서대로)
1. 이 worktree에서 `git status --short | wc -l` — 121이면 아직 미커밋. 0이면 이미 커밋된 것이니 3번으로.
2. 사용자에게 커밋을 확인받고 커밋한다(아래 메시지 초안). post-commit 훅이 handoff를 자동 갱신한다.
3. `node bin/harness-team.mjs done` 실행 → 통과하면 task 종결. 집계 원장은 기본 브랜치에서 `harness-team summary --write`.
4. PR은 `/harness-ship` 후 사용자 지시로. 릴리스는 별도 작업 — `apply` 삭제·멤버 제외는 소비자에게 깨지는 변경이라 **minor bump**를 권한다
   (`commands/harness-release.md` + MAINTAINING.md 릴리스 절차; what-changes 페이지·index.html·overview 배지·CHANGELOG 헤딩 이동 필요).

## 커밋 메시지 초안
```
feat!: apply 삭제·OpenCode/Gemini 멤버 제외(D7) + 2026-09-03 감사 발견 수정

- apply → init 단일화(재실행은 마커 병합), /harness-apply·Codex harness-apply 스킬 제거
- OpenCode·Gemini: 스캐폴드·역할표·doctor·gitignore·ITEMS·리뷰 엔진 체인(codex → claude)·매니페스트에서 제외, decisions.md D7
- observe-tools 공백 경로 no-op, 마커 손상 병합 가드, boundary stderr 미러·Write 판정, 스택 감지(TS·bun.lock·--stack 검증·RN rules 게이트),
  git-hooks hooksPath/worktree, protect-files·block-dangerous-git 패턴, .harness gitignore 범위, 문서 결함 다수
- codex 리뷰 1차 6건 반영(전역 옵션 우회·마커 순서·checkbox 스왑·Edit|Write·주석 마커·help), 2차 발견 0
- 회귀 테스트 6파일 신규, npm test 508 pass; docs:generate 재생성; CHANGELOG [Unreleased]

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

## 결정·해석 (재론하지 말 것)
- "opencode·gemini 부분 제거"는 **리뷰 엔진 체인까지 포함**으로 해석해 사용자에게 명시했고 이의는 없었다. Gemini 리뷰가 필요하면 `custom` 엔진.
- 비-RN 프로젝트는 이제 rules 0개라 `.cursor/rules` 미러가 생기지 않는다(설치 rules 4종이 전부 Expo 전용). e2e 기대값을 그에 맞췄다.
- `settingsHasBoundaryCheckpoint`: doctor는 Edit·Write 둘 다 요구, migrate는 `requireWrite:false`로 Edit-only 커스터마이즈를 존중.
- 플러그인 소스 저장소는 자기 하네스를 dogfood하지 않는다(D7에 기록). SessionStart 훅이 없으므로 새 세션은 이 파일을 직접 읽어야 한다.

## 함정
- `npm run docs:generate` 전에 `git add -A` — 인벤토리가 `git ls-files` 기준이라 삭제·신규 파일이 index에 없으면 생성물이 낡는다(docs:check는 green).
- 사용자 전역 `~/.claude/CLAUDE.md`에 `/harness-review gemini`·폴백 체인 codex → gemini → claude 문장이 남아 있다. 개인 파일이라 손대지 않았다 — 사용자에게 안내만.
- 설치된 플러그인(마켓플레이스 캐시)은 아직 0.23.1이라 `/harness-review` 스킬 본문에 gemini가 보인다. 이 저장소의 `commands/harness-review.md`가 정본.

## 범위 밖으로 남긴 것
- `templates/.claude/settings.json`의 pnpm 전용 권한 목록 · `docs/task_summary.md`의 `root-docs-0200-rubric` open 상태 · 이력 스냅샷 문서의 옛 서술.

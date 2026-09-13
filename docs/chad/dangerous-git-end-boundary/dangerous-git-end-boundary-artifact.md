# dangerous-git-end-boundary — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`block-dangerous-git.sh`의 토큰 경계 `END`를 `([[:space:]]|$|")`에서 `([^[:alnum:]_-]|$)`(비단어 문자 전부)로 교체 —
`git push --force;echo`·`git push -f; echo`·`git push --force>/dev/null`·`bash -c 'git push -f'`·`git checkout .;echo`가
양 jq 모드에서 차단된다. 허용 목록(`--force-if-includes`·`-u`·`HEAD:main`·`restore -S` 등)은 불변.
restore의 **허용** 판정만은 `SAFE_END='([[:space:]]|$)'`로 좁혔다(codex P1: 셸 인용 제거 후 `-SW`가 되는 `-S'W'` 우회).
직전 stock 판을 `tests/fixtures/stock-hooks/pre-end-boundary/`에 보존, sha 테이블·README·드리프트 가드 16개.
검증: `npm test` 892 pass / 1 CI-only skip · `docs:check` 통과 · codex diff 리뷰 2라운드(P1 수정 → Approve).
PR #89 위 스택 브랜치 — 머지 후 base를 main으로 전환.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-13T04:23:40.948Z — codex (harness-team review)

- engine: codex · scope: diff · tip: 01dad03074057d8a6a041be21dcb2f05bfdaeb0d · exit 0 · 982 B

```text
전하, **P1 결함 1건**을 확인했습니다.

- **P1 blocking — [templates/.claude/hooks/block-dangerous-git.sh:81](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/templates/.claude/hooks/block-dangerous-git.sh:81>)**: 확대된 `END`가 `git restore -S\W src/app.ts`를 `-S`만 있는 것으로 오판해 허용하지만, 실제 셸 인자는 워킹트리까지 덮어쓰는 `-SW`입니다. jq 유무 모두 기준 브랜치 `exit 2` → 현재 `exit 0`으로 재현했습니다. `restore` 허용 예외에는 별도의 엄격한 경계 판정이 필요합니다. ([Git 동작 근거](https://git-scm.com/docs/git-restore))

훅 매트릭스 104건과 변경 전 fixture·SHA 검증은 통과했습니다. 전체 테스트는 실행하지 않았으며, 파일 수정이나 실제 파괴적 명령 실행은 없었습니다.

**최종 판정: Request changes — P1 수정 전 병합 보류.**
```

<!-- harness:review kind=codex scope=diff tip=01dad03074057d8a6a041be21dcb2f05bfdaeb0d at=2026-09-13T04:23:40.948Z -->

**판별·조치 (2026-09-13)** — P1 **진짜 결함, 이 변경이 만든 회귀**. `git restore -S'W' f`·`-S\W f`·`-S"W" f`는 셸이 인용 제거 후
`-SW`(워킹트리 덮어쓰기)로 넘기는데, 넓힌 END가 `'`·`\`·`"`를 경계로 보아 staged=1로 허용했다(base exit 2 → 변경본 exit 0 재현).
원인: END는 **차단 방향**(fail-closed)용인데 restore의 **허용 판정**에도 썼다. 허용 판정만 `SAFE_END='([[:space:]]|$)'`(공백·끝)로
좁히고 worktree 차단 판정은 END 유지. 세 형태를 GIT_BLOCK에, `restore -S f; git status`를 GIT_ALLOW에 추가.

### 2026-09-13T04:28:37.930Z — codex (harness-team review)

- engine: codex · scope: diff · tip: 3b04de4ae095da814c2adf8fe4ad830e8e64da02 · exit 0 · 392 B

```text
전하, `task/hook-git-opts-init-cancel` 대비 현재 HEAD(`3b04de4`)를 직접 검토했으며, **보고할 유의미한 결함은 발견하지 못했습니다.**

훅 매트릭스 112건, stock 해시 16개, 셸 문법 검사, 생성 문서 최신성 검증이 통과했습니다. 전체 테스트는 실행하지 않았으며 파일 변경도 없습니다.

**최종 판정: Approve.**
```

<!-- harness:review kind=codex scope=diff tip=3b04de4ae095da814c2adf8fe4ad830e8e64da02 at=2026-09-13T04:28:37.930Z -->

**판별·조치 (2026-09-13)** — Approve. 코드 변경 없음.

## Learnings

- 2026-09-13: 경계를 넓히는 변경은 **차단 방향과 허용 방향을 분리해 검토**해야 한다 — 같은 정규식 조각이 차단 패턴에서는 fail-closed를
  넓히지만 허용 예외(`restore -S`)에서는 fail-open을 넓힌다. 셸 인용(`-S'W'`)은 hook이 보는 문자열과 git이 받는 인자를 다르게 만든다.
- 2026-09-13: 같은 파일을 건드리는 후속 task는 원 PR 위에 스택 브랜치로 — fixture 개수·README 줄 충돌을 피하고 머지 후 base만 바꾼다.
- 2026-09-13 `done --force` 사유: 가드의 미커밋 변경은 task 이전부터 있던 미추적 `.lavish/`(사용자 소유 분석 HTML)뿐 — task 산출물은 전부 커밋됨.

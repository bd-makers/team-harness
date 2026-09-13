# dangerous-git-end-boundary — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과


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

## Learnings


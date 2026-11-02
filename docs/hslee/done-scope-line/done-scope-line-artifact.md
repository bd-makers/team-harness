# done-scope-line — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- 2026-11-02: `describeDoneScope` 추가, `collectDoneIssues`가 `{ issues, scope }` 반환, `runDone`이 `done:` 다음 줄에 보장 범위 출력.
  `gate commit` 통과 시 stdout `systemMessage`로 실행한 선언 수·목록(3개까지)과 "이 머신 환경 기준, 선언 밖 검사는 없음".
- 테스트: describeDoneScope 4개(기본값·required·판정 창 없음·비 git), done 통합 1개, gate 2개(통과 systemMessage·차단 시 stdout 없음),
  golden fixture 재생성(done 출력 1줄 추가) — `npm test` 1279개 중 pass 1278 · fail 0 · skipped 1, `docs:check` 최신.
- 수동 확인: 임시 저장소에서 `templates/.claude/hooks/pre-commit-check.sh`를 이 브랜치 CLI로 실행 → stdout JSON 1줄, exit 0.
  Claude Code UI에 실제로 렌더되는지는 보지 않았다(미설정 안내와 같은 채널이라는 근거뿐).


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

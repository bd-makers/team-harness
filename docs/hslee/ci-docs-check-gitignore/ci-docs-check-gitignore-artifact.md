# ci-docs-check-gitignore — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 출처: 2026-09-05 cross-session 인계 정정(항목 5) — 원 세션 "Harness PDF 검토 및 비교".
- `.github/workflows/test.yml`: `Run tests` 뒤 `Check generated docs` 스텝(`npm run docs:check`). 별도 job 없음.
- `.gitignore`: `.claude/handoffs/` 추가(9행).
- 검증(로컬): YAML 파싱 5스텝, `git check-ignore -v .claude/handoffs/x.md` → `.gitignore:9` 매치, `npm run docs:check` 최신,
  `npm test` unit+e2e 526 / fail 0 · perf 1 / fail 0.
- 검증(CI): PR #72 run 33949366273 — job `test (24)` success 17s, 스텝 `Check generated docs` ✓, runtime v24.20.0.
- PR: https://github.com/bd-makers/team-harness/pull/72 (머지는 지시 대기).
- ship(2026-09-05): 다이어그램 건너뜀(task 생성 시 옵트아웃). 외부 리뷰·shipcheck 미실행 — CI 스텝 1개·gitignore 1줄의
  사소 변경(AGENTS.md 리뷰 프로토콜의 "사소한 변경" 예외), 실제 CI 실행 결과로 대체 검증.
- 범위 제외 기록: CHANGELOG(이전 CI-only 커밋 3건도 미기재), release.yml, 소비자 스캐폴드 gitignore(별도 결정).


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

- 새 CI 스텝은 pull_request 이벤트가 PR 브랜치의 워크플로우를 쓰므로 PR 자체 run에서 검증된다 — `gh-axi run watch <id>`가
  스텝 단위 ✓를 보여 주어 "스텝이 실제로 돌았는가"를 산문이 아니라 출력으로 확인할 수 있다.
- `docs:check`류 생성 비교 검사를 CI에 넣기 전에 생성기의 git 의존(이력 vs `ls-files`)을 확인해야 shallow checkout 오탐을 피한다.


# stack-inprocess-docker — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
2026-11-01 — `stack`의 `next_actions`가 감지된 DB 드라이버가 전부 인프로세스(`better-sqlite3`)면 `docker info` 대신 "docker 확인이 필요 없다"는 안내를 낸다. 서버형 드라이버가 하나라도 있거나 ORM만 있으면 종전 안내를 유지한다.

- 바뀐 파일: `src/commands/stack.mjs`(`IN_PROCESS_DB_DRIVERS`·`nextActions` 분기), `tests/detect-testing.test.mjs`(CLI 테스트 1개 — `better-sqlite3`만·`pg`만·혼합·ORM만 4경우), `CHANGELOG.md` `[Unreleased]`
- 검증: 새 테스트가 수정 전 red(`better-sqlite3: 인프로세스 DB에 docker info 를 권하지 않는다`), 수정 후 green. `npm run test` exit 0(1269 tests, pass 1268, skip 1, fail 0) · `docs:check` exit 0
- 검증하지 못한 것: eval 41의 fixture는 `node:sqlite`(의존성 아님)라 드라이버가 감지되지 않아 이번 분기를 타지 않는다 — 실제 에이전트 동작 변화는 측정하지 않았다
- 묻지 않고 내린 결정: 작은 버그라 Ambiguity 게이트·다이어그램 옵트인 질문·codex 리뷰를 생략했다. 감지 목록 확장(`sql.js`·`pglite`)은 범위 밖으로 두었다


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

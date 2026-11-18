# spec-ask-markers — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- 외부 질의 마커 3상태 계약을 `commands/harness-spec.md` 6단계에 정의했다. `commands/harness-interview.md` 6단계의 열린 질문 검사(spec 전체)·R1 ②가 세 상태를 막는다. 역할은 이월 대상이 아니다.
- spec 템플릿 안내문(`src/commands/task.mjs` 목적 절·R1 절)과 `templates/docs/README.md` 규약 줄에 마커를 더했다.
- pin: `tests/agent-files.test.mjs` 새 테스트 1건, `tests/task-templates.test.mjs` 단언 추가. 템플릿 바이트가 바뀌어 `tests/fixtures/task-paths-golden/expected.txt`를 `GOLDEN_UPDATE=1`로 재생성했다(diff는 안내문 두 줄뿐).
- 검증(2026-11-18): `npm test` exit 0 — tests 1314 · pass 1313 · fail 0 · skipped 1(기존). `npm run docs:check` → "harness overview 생성 상태가 최신입니다."
- 미검증: 새 pin 테스트의 변이 생존 여부(문구를 바꿔 실패하는지)는 돌리지 않았다. 외부 리뷰(Codex 등) 미실행.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

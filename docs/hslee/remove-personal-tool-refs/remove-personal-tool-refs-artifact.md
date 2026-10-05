# remove-personal-tool-refs — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- 2026-10-05 제거 6건 적용. AO 규칙 파일은 `~/.ao/ao-worker-rules.md`로 옮겼다(바이트 동일, `cmp` 확인).
- 검증: `npm run test` tests 1079 · pass 1078 · fail 0, perf 1/1 통과. `npm run docs:check` 최신.
- 이력 표면(CHANGELOG, what-changes, 기존 task 문서, `loop-graph-workflow-qna-0.13.html`)의 언급은 남겼다.
- 메인테이너 후속: AO가 규칙 파일 경로를 저장하고 있다면 `ao project set-config --agent-rules-file ~/.ao/ao-worker-rules.md`로 다시 지정해야 한다(저장 위치 미확인).
- 제거로 잃는 것: fleet 가이드는 D5(격리 병렬) 운용 안내도 겸했다. 팀용 병렬 운용 안내가 필요하면 Claude·Codex 기본 기능 기준으로 새로 쓴다(사이클 초안 §4-3).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

- 2026-10-05 외부 리뷰 엔진은 실행하지 않았다 — 제거·문서 정리이고 제품 동작 변화는 init의 gitignore 항목 하나뿐이다(Done evidence `review: optional`).

## Learnings
- 개인 도구의 규칙 파일이 팀 저장소에 있으면, 저장소가 그 도구의 설정 저장소 역할까지 떠안는다. 개인 설정은 홈 디렉터리에 둔다.

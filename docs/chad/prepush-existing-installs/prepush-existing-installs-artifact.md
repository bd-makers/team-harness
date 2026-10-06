# prepush-existing-installs — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- followups 12번을 (a)로 닫았다 — 코드 변경 없음. CHANGELOG `[Unreleased]` Added에 pr-check(#125)·doctor pre-push 검사(#126) 항목과
  "기존 설치본은 `harness-team sync` 1회" 안내를 넣고, README pr-check·migrate 절에 한 줄씩 더했다.
- 발견: #125·#126이 CHANGELOG에 항목을 남기지 않았다 — 12번 제안("릴리스 노트로 안내")의 자리 자체가 비어 있었다.
- 검증: `npm run test` → tests 1163 · pass 1162 · fail 0 · skipped 1 (perf 1/1), `npm run docs:check` → 최신.
- 미검증: 실제 업그레이드한 소비자 저장소에서 sync 1회로 pre-push가 들어오는지는 이 task에서 다시 돌리지 않았다(#125 sync 설치 테스트에 의존).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings
- 문서 표현은 코드 경로를 다 확인한 뒤 좁게 쓴다: "migrate는 git 훅을 설치하지 않는다"는 0.6 이전 변환 경로(`migrate.mjs:165`, post-commit)에서 틀린 말이라
  "pre-push 훅"으로 좁혔다.
- 머지된 기능 PR이 CHANGELOG를 빠뜨리면 다음 릴리스 노트에서 사라진다 — ship 단계에서 `[Unreleased]` 항목 유무를 함께 본다.

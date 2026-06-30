# done-guard-handoff — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `src/commands/task.mjs`: `collectDoneIssues`의 dirty 검사가 handoff 2개(`docs/<user>/<task>/<task>-handoff.md`, `docs/<user>/<user>-handoff.md`)를 제외. `parsePorcelainPaths` 헬퍼 export(상태접두/rename/quotepath 파싱).
- `tests/done-guard.test.mjs`: +3 테스트 (handoff-only→통과 / handoff+실파일→차단 / parsePorcelainPaths 단위). 전체 107/107 green.
- 실검증: bare-node에서 실작업 커밋 후 `done`(--force 없이) → 성공(active=null). task-handoff(`M`)·user-handoff(`??` untracked) 둘 다 제외 확인. 정리 후 무오염.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*


## Learnings

- **user-handoff는 untracked(`??`)로 나타난다** — `.harness/`와 달리 `docs/<user>/<user>-handoff.md`는 gitignore 아님. 첫 생성 시 `??`, 이후 `M`. 두 상태 모두 parsePorcelainPaths가 동일 경로로 추출하므로 제외 Set이 양쪽 다 커버.
- **가드 측 제외가 정답**(훅 amend 아님): post-commit 훅에서 amend/재커밋하면 SHA 변형으로 push 깨짐 + 커밋이 또 post-commit을 트리거해 무한루프. 자동 생성 파일은 "생성하는 쪽"이 아니라 "검사하는 쪽"에서 무시하는 게 안전.
- **dogfooding 루프 완성**: harness-sim이 마찰을 발견 → 이 task가 수정 → 같은 시뮬로 수정 검증. 도구가 자기 도구의 결함을 잡아낸 사례.


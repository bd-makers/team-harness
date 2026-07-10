# update-comparison-html — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 2026-07-09 `docs/chad/codex-l5-sim-plan/claude-vs-codex-l5-sim.html` 업데이트.
- 반영 내용:
  - header meta에 `updated: Codex wrapper skills + cache refresh` 추가.
  - 핵심 결론을 Codex command-equivalent `$harness-*` skills 기준으로 갱신.
  - plugin surface 비교표에 command parity와 SSOT 관계 추가.
  - Codex 사용자 호출 예시를 `$harness-aijient-team:harness-apply`, `$harness-aijient-team:harness-doctor`로 갱신.
  - `Codex Skill Surface 업데이트` 섹션 추가: 16 command-equivalent, 18 installed skills, missing 0.
  - `Cache Refresh 검증` 섹션 추가: personal marketplace, installed cache, count verification.
  - 실행 명령에 `codex plugin add harness-aijient-team@personal`와 `node --test tests/manifest-sync.test.mjs` 추가.
- 검증:
  - HTML smoke: required text 확인 및 closing `</html>` 확인.
  - `node --test tests/manifest-sync.test.mjs`: pass, 8 tests.
  - installed cache count: `commands=16`, `skills=18`, `missing=[]`.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*


## Learnings

- L5 수치와 plugin surface 수치는 서로 다른 증거 축이므로 HTML에서 분리해 기록하는 편이 오해가 적다.

# harness-sim — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `skills/harness-sim/SKILL.md` — 에이전트 구동 L4 시뮬레이션 스킬. 프리플라이트(PATH·playground·잔재 reclaim·스냅샷) → 프로젝트별 격리 브랜치에서 S1(코어&스킬)·S2(새 피처)·S3(기존 수정) → 정리(무오염) → 날짜 리포트.
- `skills/harness-sim/report-template.md` — 3×3 매트릭스 리포트 골격.
- `CHANGELOG.md` [Unreleased] 항목 추가.
- 등록: `plugin.json` `"skills": ["./skills"]` 글롭이 자동 발견 — 매니페스트 수정 불필요.
- 검증: bare-node에서 전체 사이클 1회 실행 후 무오염 확인(HEAD 일치·git clean·sim 브랜치/문서 0·active.json `{}`·doctor green).

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*


## Learnings

- **done-guard는 3조건**(미완 박스·미커밋 변경·artifact 템플릿 그대로)을 검사한다 — open-box 하나만이 아님. 시뮬에서 한 조건만 테스트하려면 나머지를 미리 만족시켜야 가드를 정확히 분리 관찰 가능.
- **post-commit 훅이 매 커밋 후 handoff를 더럽힌다** → 커밋 직후 `done`은 "미커밋 변경" 가드가 항상 발동. 실완료 경로는 `done --force`. playground가 잡아낸 실제 마찰 — 자동 e2e는 가드 통과를 force로 우회하므로 이 마찰을 표면화하지 않음.
- **`.harness/`는 gitignore** → `active.json`은 git이 복원 못 함. 시뮬 정리는 active.json을 수동 스냅샷/복원해야 무오염.
- **트리거류 정직성**: slash/skill 해석·SessionStart 실주입은 비대화형 실행 중 관찰 불가. command `.md` 존재 확인을 PASS로 칠하면 리포트가 green인데 L4를 안 본 게 됨 → `⚠️수동확인` 분류 필수.


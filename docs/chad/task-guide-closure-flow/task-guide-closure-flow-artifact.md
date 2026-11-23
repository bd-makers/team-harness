# task-guide-closure-flow — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 검토 게이트: task 생성 질문에서 사용자가 "게이트 빼기"를 골라 plan에서 지웠다(2026-11-23, 문서 전용 정정).
- `docs/harness-task-guide.html`: 흐름도(10 · done → PR, 사람 검토 게이트 표기)·캡션, `task` 출력 예시(`review gate:` 줄), reopen 서술(0.58.0 조건·`reopen --reason`),
  사람 검토 게이트 callout(0.57.0·`brief`), 생성 파일 표(5개 — handoff는 선택 메모, meta의 `status`·`closedAt`은 옛 CLI 값·`baseSha`), 프롬프팅 표(종결·재개 행),
  plan 예시(게이트 첫 단계·"ship 완료" 마지막 단계), PLAN_COMPLETE·재개 후보 문장, §8 종결 전면(계산값·흐름 블록·`plan.md가 없음` 가드·done이 추적 파일을 쓰지 않음·원장/위키 선택 묶음·여러 PR/리뷰 수정/재개 callout),
  자동 표의 pre-push done 가드, 함정 표(원장 행·"머지했는데 열린 채" 행), hero 태그·footer에 "0.58.0 종결 흐름 반영".
- 같은 옛 흐름이 남은 현행 문서 정정: cheatsheet·kickoff-deck·onboarding-checklist(Phase 3 마지막 3항목을 done → 커밋/pr-check → PR 머지 = 종결로, 항목 수 24 유지)·
  operations-playground(단계 순서·프롬프트 생성문)·rubric-guide·workflow-diagrams(flowchart·sequence·state·gitGraph)·workflow-schematics·workflow-simulation(summary 카드).
- `tests/docs-retired-phrases.json`에 `done-after-merge` 11문구 등록, 이번에 고친 실제 줄 8개를 사고 줄 테스트에 더했다.
  정본(`commands/harness-task.md`의 "옛 절차(머지 뒤 … 종결 커밋)" 호환 설명)·README·위키 문서의 "머지 뒤 기본 브랜치에서"는 맞는 사실이라 등록하지 않았다.
- 검증: `npm run docs:check` exit 0 · `node scripts/test-isolated.mjs --test tests/docs-*.test.mjs` 81/81 · `npm test` 1466 중 1465 pass·0 fail(1 skip) ·
  workflow-diagrams Mermaid 5개가 로컬 서버에서 오류 없이 렌더 · 가이드·schematics SVG 라벨 겹침/박스 이탈 없음(getBBox).
- PR #199(`docs/team-harness-explainer.html`)는 건드리지 않았고, 그 브랜치의 파일에 등록 문구가 없음을 확인했다.
- 미검증·후속: 가이드는 뷰 다이어그램(`.svg`, 0.57.0)을 아직 다루지 않는다 — 레거시 HTML 다이어그램도 유효해 틀린 사실은 아니다.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

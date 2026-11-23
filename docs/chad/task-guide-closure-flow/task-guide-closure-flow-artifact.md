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

### 2026-11-23T01:37:05.707Z — codex (harness-team review)

- engine: codex · model: default · scope: diff · base: refs/remotes/origin/main · mergeBase: 62aeacad051fc622f528b2e5ccc2cb24adbf00bd · tip: 820004ba7acf035a4c4e78653b74d3bec6af28a9 · exit 0 · 3366 B

```text
### P2 · 수정 권장

- 가이드와 플레이그라운드의 `ship → retro → done` 순서를 따르면 `retro`가 남긴 미커밋 artifact 변경 때문에 `done` 가드가 실패합니다. [harness-task-guide.html:458](<docs/harness-task-guide.html:458>), [harness-operations-playground.html:402](<docs/harness-operations-playground.html:402>)
- 가이드는 `done` 직후 커밋에서 `PLAN_COMPLETE`가 출력된다고 설명하지만, `done`이 활성 포인터를 비우므로 post-commit 훅은 즉시 반환합니다. [harness-task-guide.html:594](<docs/harness-task-guide.html:594>), [src/commands/task.mjs:1390](<src/commands/task.mjs:1390>)
- Mermaid 캡션, SVG 스윔레인, 루브릭 본문에 `PR 머지 → done` 순서가 남아 같은 페이지의 0.58.0 안내와 충돌합니다. [harness-workflow-diagrams.html:172](<docs/harness-workflow-diagrams.html:172>), [harness-workflow-schematics.html:351](<docs/harness-workflow-schematics.html:351>), [harness-rubric-guide.html:518](<docs/harness-rubric-guide.html:518>)
- 온보딩은 기본 설정으로 task를 만든 뒤 spec 승인이나 게이트 제외 단계 없이 파일을 수정하도록 안내해 0.57.0 절차를 건너뜁니다. [harness-onboarding-checklist.html:217](<docs/harness-onboarding-checklist.html:217>), [commands/harness-task.md:130](<commands/harness-task.md:130>)
- 플레이그라운드는 기본 브랜치의 종결만으로 `reopened:`를 예고하지만, 이미 재개한 브랜치에서 재개 항목을 체크한 뒤 머지 전 다시 `task`를 호출하면 `activated:`가 나옵니다. [harness-operations-playground.html:343](<docs/harness-operations-playground.html:343>), [commands/harness-task.md:304](<commands/harness-task.md:304>)
- 은퇴 문구 검사는 현재 정본을 통과시키지만, 같은 의미의 “위키 컴파일은 선택이고 머지 후 기본 브랜치에서 한다”도 차단하면서 실제 옛 흐름인 `PR 머지 → done`은 놓칩니다. 두 경우 모두 검사 정규식으로 재현했습니다. [docs-retired-phrases.json:40](<tests/docs-retired-phrases.json:40>), [commands/harness-task.md:277](<commands/harness-task.md:277>)

### P3 · 경미

- 온보딩이 순번 기반 저장 키를 재사용해, 기존 사용자가 체크한 `pr-check` 항목이 새 `done` 검증의 완료 상태로 표시됩니다. [harness-onboarding-checklist.html:250](<docs/harness-onboarding-checklist.html:250>)
- Mermaid 시퀀스는 `done` 뒤에 ship 준비 완료를 보고하지만, 정본에서는 그 보고로 ship을 마친 뒤 마지막 체크박스를 켜고 `done`을 실행합니다. [harness-workflow-diagrams.html:309](<docs/harness-workflow-diagrams.html:309>), [commands/harness-ship.md:183](<commands/harness-ship.md:183>)

`refs/remotes/origin/main` 대비 `git status`와 `git diff`로 검토했으며 파일은 변경하지 않았습니다. `git diff --check`, `npm run docs:check`, 읽기 전용 문서 테스트 69개, 인라인 JS와 수정된 정적 SVG의 구문 검사가 통과했습니다. Mermaid 5개는 브라우저 DOM 없이 문법을 확인했습니다. 실제 브라우저 렌더링과 임시 파일 쓰기가 필요한 테스트는 검증하지 못했습니다.

**최종 판정** · P1은 없습니다. 종결 절차와 은퇴 문구 검사의 P2를 수정한 뒤 병합을 권장합니다.
```

<!-- harness:review kind=codex scope=diff tip=820004ba7acf035a4c4e78653b74d3bec6af28a9 at=2026-11-23T01:37:05.707Z -->

#### 판별·조치 (2026-11-23)

- P2 retro → done 미커밋: **진짜**. `done` 가드는 체크박스만 켠 plan 외의 미커밋 변경을 막는다. 가이드 프롬프팅 행·§8 흐름 블록·통과 문단과 playground 단계 순서를 "ship·retro 문서는 done 전에 커밋, done 뒤 커밋은 체크박스뿐"으로 고쳤다.
- P2 PLAN_COMPLETE: **진짜**. `runHandoffAuto`는 활성 task가 없으면 바로 반환하고 `done`이 포인터를 먼저 비운다. 가이드 문장을 "활성일 때만 — done 뒤 커밋에서는 나오지 않음"으로 고쳤다.
- P2 남은 `PR 머지 → done` 순서: **진짜**. workflow-diagrams 절 설명·schematics 스윔레인 박스·rubric-guide 라이프사이클 문장을 고쳤다.
- P2 온보딩 게이트: **진짜**. task 생성 항목에 게이트(승인 전 task 문서 밖 수정 금지·온보딩은 게이트 빼기 가능)를, plan 예시에 "ship 완료" 단계를 넣었다. 항목 수는 그대로.
- P2 playground 재개 조건: **진짜(경미)**. "기본 브랜치와 작업 트리 모두에서 종결된 task면 reopened:"로 고쳤다.
- P2 은퇴 문구 과잉·누락: **진짜**. 넓은 `머지 후 기본 브랜치`를 실제 사고 형태 3개로 좁히고 `PR 머지 → done`을 더했다. 위키·정본 호환 문장이 통과하는지 보는 테스트와 놓쳤던 사고 줄 2개를 더했다.
- P3 온보딩 순번 저장 키: **진짜, 수용**. 키를 올리면 모든 사용자의 진행률이 지워져 그 비용이 더 크다. 영향은 옛 pr-check 체크가 새 done 검증 칸에 보이는 것뿐이다.
- P3 시퀀스 순서: **진짜**. 준비 완료 보고를 체크·done 앞으로 옮겼다(`commands/harness-ship.md` 183행 순서).
- 재검증: `tests/docs-*.test.mjs` 82/82 · `npm run docs:check` exit 0 · 인라인 JS 파싱 통과 · `npm test` 1467 중 1466 pass·0 fail(1 skip) · PR #199 파일에 추가 문구 없음.

## Learnings

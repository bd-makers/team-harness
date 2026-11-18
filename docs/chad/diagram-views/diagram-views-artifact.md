# diagram-views — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 뷰별 다이어그램(옵트인): `<name>-diagram-<view>.html`(뷰 `sequence`·`module`, 정본 `FLAG_CHOICES.view` = `src/cli-args.mjs` `DIAGRAM_VIEWS`),
  경로 조립 `diagramKind(view)`(`src/task-paths.mjs`).
- `diagram record --view <v>`: 그 뷰 파일 존재로 생성 판정, plan의 `spec/plan 다이어그램(<v>)` 단계만 닫음, 생략 줄
  `- 다이어그램: 미실행 — [<v>] <사유> (날짜)`. 레거시 열림·닫힘 정규식은 `다이어그램(` 를 거부해 뷰 단계를 건드리지 않는다.
  `--json` envelope에 `view`. 모르는 뷰는 CLI(`FLAG_CHOICES`)와 직접 호출 모두 exit 2.
- `pr-check`: 레거시나 뷰 HTML 중 하나라도 rev에 있으면 권장 안내 없음. `clean` `TASK_FILE`에 `diagram(?:-[a-z]+)?`.
- 문서: `commands/harness-task.md` 옵트인 절(정본 — 1·2·4·5·6번), `commands/harness-diagram.md` 3·6·7단계,
  `commands/harness-ship.md` 6단계, `skills/harness-diagram/SKILL.md`(본문·description), `templates/docs/README.md`, CHANGELOG `[Unreleased]`.
  doctor·`AGENTS.md`·`templates/AGENTS.md.hbs`는 바꾸지 않음(A1-2, eager 예산).
- 검증(2026-11-18, 이 커밋 직전 작업 트리):
  - `npm test` → exit 0 — 단위·e2e `tests 1326 / pass 1325 / fail 0 / skipped 1`(jq 매트릭스 CI 전용 SKIP), perf `tests 1 / pass 1`.
  - `npm run docs:generate` 후 `npm run docs:check` → "harness overview 생성 상태가 최신입니다." exit 0.
  - `node bin/harness-team.mjs doctor` → 1 warning(`.codex/hooks.json` 훅 신뢰 없음 — 이 머신의 Codex 승인 상태, 이 변경과 무관), 에러 없음.
  - 변이 확인: 레거시 정규식의 `(?!\()` 제거 시 diagram 테스트 2건 실패, `TASK_FILE`을 원복 시 clean 신규 테스트 실패 — 둘 다 복원 후 통과.
  - `node bin/harness-team.mjs pr-check --base origin/main`(task 문서까지 커밋한 HEAD 기준 — plan 7단계·이 줄을 넣은 amend 전후 모두) → `✓ pr-check HEAD: chad/diagram-views`, exit 0.
    권장 안내 "다이어그램 없음"은 이 task가 옵트아웃이라 정상(새 안내 문구에 뷰별 경로가 함께 나옴을 확인).
  - Codex skill validator(`quick_validate.py`) → `ModuleNotFoundError: No module named 'yaml'`로 미실행(MAINTAINING 104행의 PyYAML 제약).
- 남은 리스크: 뷰 단계를 쓰는 plan에 옛 CLI로 `record`하면 뷰 단계를 레거시 형식으로 닫는다(CHANGELOG 호환 줄). Codex 리뷰 미실행.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

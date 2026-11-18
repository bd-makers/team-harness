# task-brief — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `harness-team brief [--stage spec]`(`src/commands/brief.mjs`, 결정 A3-1): 활성 task spec의 `## 목적`·`## 범위`·`## 원천 검토`의 `### 발견`·`## 설계`·`## Ontology`
  (`###` 하위 절마다 한 장, 위 절 제목이 출처 표지), 열린 항목(목록 항목의 맨 글자 태그 — 백틱 안 제외), configured Done evidence `scenarios`를 그대로 렌더해
  `<name>-brief.html`을 쓴다. 장식 글자 0·생성 시각 0(같은 spec → 같은 바이트), 줄머리 HTML 주석·템플릿 안내 문단 제외, script 0·외부 자산 0·system font stack·
  `scroll-snap-type: y mandatory`. 오류(활성 task 없음·spec 없음·렌더할 절 없음)는 exit 1·쓰지 않음, 위치 인자·모르는 `--stage`는 exit 2.
- CLI 표면: router·`taskCmds`, `cli-args` COMMANDS `brief`·`VALUE_FLAGS` `stage`·`BRIEF_STAGES`/`FLAG_CHOICES.stage = ['spec']`·`--json` 목록. `brief`가 task 예약어가 됨(확인: 새 task `brief` 거부).
- 형제 경로: `clean` `TASK_FILE` kind `brief`, `task-paths` kind 주석, `templates/docs/README.md` 트리·규약(sha 등록 없음).
- 문서: `commands/harness-task.md` "검토용 슬라이드 (`brief`)" 절(게이트와 독립), README 명령어 블록, `skills/harness-team/SKILL.md`, CHANGELOG `[Unreleased]` Added, `docs/harness-overview.html` 재생성.
- `--stage ship` 제외(spec R1). 생성된 `task-brief-brief.html`은 커밋하지 않았다(생성물 — spec에서 다시 만든다).
- 검증(2026-11-18): 아래 명령과 출력.
  - `node scripts/test-isolated.mjs --test tests/brief-command.test.mjs` → pass 19 fail 0. clean·cli-args·brief·task-reserved-names 묶음 → tests 74 pass 74.
  - 실제 입력 전수: 이 저장소 task spec 187개를 렌더 → 새 사실 판정 실패는 scenarios `cmd`의 JSON escape(`\"`) 8건뿐 → 판정에 선언된 scenarios 값(푼 문자열)을 원문으로 세기로 정함(spec R1).
    테스트가 전수(≥100)에 새 사실 0·외부 참조 0을 단언한다. 열린 항목 표본 검토 중 `(open 아님, …)` 산문 오탐 1건 → 태그를 `(open)`·`(open →`로 좁힘.
  - 변이 19개(안내 문단·주석 제거·백틱 언급·`ask:` 누락·산문 태그·escape·R1 범위·펜스 안 제목·이음 줄·중첩·장식 글자·빈 절 누락 표시·쓰기 순서·표 구분 줄·
    코드 안 `**`·위치 인자·중첩 열린 항목 등)를 손으로 넣어 돌림 → 1차 생존 4개(표본 부족 3, 동치 1) → 표본 보강 뒤 동치 1개만 생존 → 그 중복 조건을 코드에서 지움.
    `clean` `TASK_FILE`에서 `brief`를 지우는 변이 → fail 1. 소스 복원 `cmp` 확인.
  - 로컬 브라우저 실측(내장 브라우저, 1280×800, `task-brief-brief.html`): 계산 스타일 `scroll-snap-type: y mandatory`·`.slide` `scroll-snap-align: start`·
    script 0·글꼴 `system-ui…`. 스크롤 300→0, 900→800, 1500→1600으로 스냅, 뷰포트보다 긴 슬라이드(1175px) 안 2600은 그대로(긴 슬라이드 내용 도달 가능).
  - `npm test` → exit 0 — tests 1385 · pass 1384 · fail 0 · skipped 1(CI 전용 기존 skip), perf 1/1.
  - `npm run docs:check` → "harness overview 생성 상태가 최신입니다."
  - `node bin/harness-team.mjs doctor` → 1 warning(`.codex/hooks.json` 신뢰 없음 — 이 머신의 Codex 훅 승인 상태, 이 변경과 무관).


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

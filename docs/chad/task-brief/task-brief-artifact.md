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
- `--stage ship` 제외(spec R1). 이 task의 브리프 `task-brief-brief.html`은 최종 spec에서 다시 만들어 함께 커밋했다(codex 1차 P2 결정 — 검토 스냅샷).
- 검증(2026-11-18): 아래 명령과 출력.
  - `node scripts/test-isolated.mjs --test tests/brief-command.test.mjs` → pass 19 fail 0. clean·cli-args·brief·task-reserved-names 묶음 → tests 74 pass 74.
  - 실제 입력 전수: 이 저장소 task spec 187개를 렌더 → 새 사실 판정 실패는 scenarios `cmd`의 JSON escape(`\"`) 8건뿐 → 판정에 선언된 scenarios 값(푼 문자열)을 원문으로 세기로 정함(spec R1).
    테스트가 전수(≥100)에 새 사실 0·외부 참조 0을 단언한다. 열린 항목 표본 검토 중 `(open 아님, …)` 산문 오탐 1건 → 태그를 `(open)`·`(open →`로 좁힘.
  - 변이 19개(안내 문단·주석 제거·백틱 언급·`ask:` 누락·산문 태그·escape·R1 범위·펜스 안 제목·이음 줄·중첩·장식 글자·빈 절 누락 표시·쓰기 순서·표 구분 줄·
    코드 안 `**`·위치 인자·중첩 열린 항목 등)를 손으로 넣어 돌림 → 1차 생존 4개(표본 부족 3, 동치 1) → 표본 보강 뒤 동치 1개만 생존 → 그 중복 조건을 코드에서 지움.
    `clean` `TASK_FILE`에서 `brief`를 지우는 변이 → fail 1. 소스 복원 `cmp` 확인.
  - 로컬 브라우저 실측(내장 브라우저, 1280×800, `task-brief-brief.html`): 계산 스타일 `scroll-snap-type: y mandatory`·`.slide` `scroll-snap-align: start`·
    script 0·글꼴 `system-ui…`. 스크롤 300→0, 900→800, 1500→1600으로 스냅, 뷰포트보다 긴 슬라이드(1175px) 안 2600은 그대로(긴 슬라이드 내용 도달 가능).
  - `npm test` → exit 0 — tests 1385 · pass 1384 · fail 0 · skipped 1(CI 전용 기존 skip), perf 1/1. codex 1차 반영 뒤 재실행: tests 1388 · pass 1387 · fail 0 · skipped 1, perf 1/1.
  - `npm run docs:check` → "harness overview 생성 상태가 최신입니다."
  - `node bin/harness-team.mjs doctor` → 1 warning(`.codex/hooks.json` 신뢰 없음 — 이 머신의 Codex 훅 승인 상태, 이 변경과 무관).
- A5 머지 뒤 rebase(2026-11-18): `origin/main` `bef05f1`(PR #191) 위로 rebase. 충돌은 CHANGELOG `[Unreleased] ### Added` 한 곳 — A5·A3 항목 둘 다 유지.
  `cli-args.mjs`(A5 `--no-review-gate`)·`clean.mjs`·`harness-task.md`·`bin`은 자동 병합. 독립 절 "검토용 슬라이드 (`brief`)"를 게이트 절 항목으로 옮기고
  승인 줄 슬라이드 칸이 `brief` 경로를 가리키게 했다. 재검증: `npm test` exit 0 — tests 1399 · pass 1398 · fail 0 · skipped 1, perf 1/1. `docs:check` 최신,
  doctor 1 warning(동일·무관), `pr-check --base origin/main` 아래 커밋 뒤 확인.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-18T13:05:29.315Z — codex (harness-team review)

- engine: codex · model: default · scope: diff · base: origin/main · mergeBase: 7afaa409bc2c8b7f4176cad8de5c2c88db4034ed · tip: 17037b37dc2315cfbd034c96cb31df238b13ca5e · exit 0 · 2642 B

```text
### P1 · Blocking

- [src/commands/brief.mjs:114](src/commands/brief.mjs#L114) — Removing a standalone comment between `keep this` and `and this` joins them into a single text node whose normalized text is absent from the spec.
- [src/commands/brief.mjs:326](src/commands/brief.mjs#L326) — The scenario parser receives raw Markdown, so a `## Done evidence` example inside an HTML comment or a fenced code block becomes an active scenario slide.
- [src/commands/brief.mjs:331](src/commands/brief.mjs#L331) — Valid JSON with escaped keys such as `"\u0073cenarios"` emits literal labels absent from the source, even under the documented exception for decoded scenario values.

### P2 · Should fix

- [src/commands/brief.mjs:275](src/commands/brief.mjs#L275) — The matcher accepts incomplete tags such as `(ask:)` and treats the existing spec sentence “두 (open)이 사용자 답변으로 닫혔다” as an open item.
- [src/commands/brief.mjs:167](src/commands/brief.mjs#L167) — A blank line before an indented child flattens the child into a separate list, and a same-level switch from bullets to numbers keeps rendering bullets.
- [src/commands/brief.mjs:143](src/commands/brief.mjs#L143) — A two-column header followed by a one-column delimiter is accepted as a table, turning malformed table text into structured review content.
- [src/commands/brief.mjs:223](src/commands/brief.mjs#L223) — The guide filter drops every standalone italic paragraph, including authored requirements farther down a section.
- [commands/harness-task.md:180](commands/harness-task.md#L180) — The documented workflow leaves an untracked brief in the worktree, which `done` counts as a change and blocks on unless the file is removed, ignored, or committed.

### P3 · Nit

- [src/commands/clean.mjs:116](src/commands/clean.mjs#L116) — The `brief` alternative also protects `-brief.md`, `-brief.json`, and `-brief.svg`, which can make `clean` refuse unrelated files.
- [src/commands/brief.mjs:242](src/commands/brief.mjs#L242) — An escaped opener such as `\**literal**` still creates a `<strong>` element.

Reviewed `git status` and the diff against `origin/main`. All 25 CLI argument tests, 13 read-only renderer tests, the docs check, and `git diff --check` passed. The renderer tests found no script or external references in the repository corpus. In-memory cases reproduced the blocking findings. The full suite and write-path tests were outside this read-only run. No files were modified.

**Verdict: Request changes.** The brief can present hidden scenarios as active and emit text nodes that violate the A3 source-text invariant.
```

<!-- harness:review kind=codex scope=diff tip=17037b37dc2315cfbd034c96cb31df238b13ca5e at=2026-11-18T13:05:29.315Z -->

판별·조치(2026-11-18, 작성 세션이 표본으로 재현 — 아래 회귀 테스트는 고치기 전 코드에서 fail 7):
- P1 줄 사이 주석을 걷으면 앞뒤 줄이 한 텍스트 노드로 붙음 — 진짜. 걷은 자리를 빈 줄로 남긴다. 테스트 `주석 앞 문단`·`stripComments`.
- P1 주석·펜스 안 `## Done evidence` 예시가 시나리오로 렌더됨 — 기각. 브리프는 done 가드와 같은 파서(`parseDoneEvidenceDeclaration`)를 쓴다 — 가드가 그 예시를 선언으로 읽으면
  `done`·`scenario check`가 실제로 강제하므로 브리프가 숨기면 안 된다. 파서 수정은 done 가드 변경이라 이 task 밖(spec R1).
- P1 escape로 쓴 키(`"\u0073cenarios"`)의 라벨이 원문에 없음 — 진짜(판정 정의). JSON을 푼 키도 원문으로 센다고 정의를 넓혔다(값과 같은 이유). 테스트 `JSON escape 로 쓴 scenarios 키·값`.
- P2 `(ask:)` 역할 없는 태그를 셈 — 진짜. 역할 필수. `두 (open)이 닫혔다` — 기각: harness-interview 규칙에서 목록 항목의 맨 글자 `(open)`은 표기다(게이트와 같은 판정).
- P2 빈 줄 뒤 하위 목록이 평평해짐·글머리↔번호 전환 — 진짜. 느슨한 목록(빈 줄 뒤 들여 쓴 줄·같은 종류 항목은 이어짐), 맨 위 수준 종류 전환은 새 목록.
- P2 칸 수가 다른 구분 줄을 표로 받음 — 진짜. GFM대로 칸 수가 같아야 표.
- P2 본문 중간의 기울임 문단도 안내로 버림 — 진짜. 절 첫 블록(템플릿 자리)일 때만 버린다.
- P2 미추적 브리프가 `done`을 막음 — 진짜. 브리프는 검토 스냅샷으로 task 문서와 함께 커밋한다고 정했다(spec R1, harness-task 절·docs README·CHANGELOG). 이 task의 브리프도 커밋.
- P3 `clean` `TASK_FILE`이 `-brief.md` 등도 보호 — 진짜. `brief`는 `.html`만. 테스트 `TASK_FILE matches only <task>-brief.html`.
- P3 `\**글자**`가 굵게를 엶 — 진짜. 백슬래시 뒤 `**`는 열지 않는다.
- 변이 재실행: 기존 18개 + 새 8개(주석 자리 빈 줄·안내 문단 위치·느슨한 목록·종류 전환·표 칸 수·escape 굵게·역할 없는 ask 등) → 모두 fail ≥ 1. 소스 복원 `cmp` 확인.

## Learnings

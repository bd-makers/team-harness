# done-derive — Plan

## 목표
종결을 기록이 아니라 기본 브랜치 상태에서 파생해, 머지 뒤 종결 커밋(과 보호 브랜치 저장소의 종결 MR)을 없앤다. 재개는 `task <name>`(유지)과 선택형 `reopen <name>`으로 한다.
순서는 판정 함수 → 소비자 → 명령 → 문서다. 각 단계는 끝날 때 `npm run test`가 통과하는 상태로 닫는다.

## 단계
- [x] spec/plan 다이어그램 작성 → docs/chad/done-derive/done-derive-diagram.html
- [x] 1. 판정 함수 신설 — `src/task-closure.mjs`의 `taskClosure(targetDir, user, task, { ref })` (작업 트리 / `git show <ref>:` 두 입력, `remote-task.mjs`의 `GIT_NO_LAZY_FETCH`·timeout 재사용).
      R1(체크된 박스 ≥1 · 미완 없음 / 유효한 우회 기록 / 레거시 meta done)과 `closedAt` 산출. 단위 테스트 `tests/task-closure.test.mjs` — S4·S4b
- [x] 2. `done`에서 추적 파일 쓰기 제거 — `task.mjs:1197-1200`의 `status`·`closedAt` 쓰기를 빼고 `--force` 우회 시 `forcedAt`·`forcedIssues`만 쓴다. 활성 포인터·user handoff는 유지.
      `tests/done-guard.test.mjs` 갱신(meta 무변경 단언, force 기록 단언)
- [x] 3. 로컬 소비자 이전 — `summary.mjs`(원장 렌더)·`session-context.mjs:34`·`wiki.mjs:215`·`migrate.mjs:979`가 `taskClosure`(작업 트리)를 쓴다.
      `summary`·`session-context`·`wiki` 테스트 갱신 — 레거시 meta 판정 불변 확인
      (실행 주석: `session-context.test.mjs`는 무변경 — 레거시 meta 판정 불변을 기존 `:122` 테스트가 이미 검사한다)
- [x] 4. 원격 판정 이전 — `remote-task.mjs`(done-on-main 판정·nudge 침묵 조건·`list --remote`)와 `doctor.mjs` done-on-main이 `taskClosure({ ref: 기본 브랜치 })`를 쓴다.
      원장 폴백은 유지. `remote-task`·`task-done-on-main`·`list-remote` 테스트 갱신 — S1(머지 후 추가 커밋 없이 closed)
      (실행: `task-done-on-main.test.mjs`는 무변경 — 판정을 주입해 원격 판정 구현과 무관하다. `readRemoteTaskMeta` → `readRemoteClosure`, 침묵 조건은 작업 트리 R1 판정. `list --remote`는 종결 상태를 읽지 않아 변경 없음 — doctor·session-context는 `checkDoneOnMain` 경유로 자동 이전)
- [x] 5. 재개 — `runTask`의 reopened 전이(`task.mjs:453-484`)를 함수로 빼고, 판정 입력을 로컬 meta에서 `taskClosure({ ref: 기본 브랜치 })`로 바꾼다.
      전이 시 plan `## 단계`에 `- [ ] 재개: <사유>` 추가. `harness-team reopen <name> [--reason <text>]` 하위명령 추가(closed 아니면 exit 1·무변경).
      `bin/` 라우팅·예약 이름(`task-reserved-names`) 반영. 테스트 `tests/task-reopen.test.mjs` — S2
- [x] 6. `clean` 기준 — `clean.mjs:283`을 "기본 브랜치에서 closed"로 바꾼다. `tests/clean.test.mjs` — S5
      (실행: R = 원격 추적 기본 브랜치 → 없으면 로컬 `main`/`master` → 둘 다 없으면 작업 트리. 재개와 `closedAtRef`(R1 + 레거시 원장 폴백)를 공유)
- [x] 7. `pr-check` pre-push 가드 — rev가 HEAD이고 트리가 깨끗하면, 변경 task 중 R1을 충족하는 것에 `collectDoneIssues`를 실행한다. 유효한 `forcedAt`이면 경고만. CI·다른 rev는 기존 문서 검사만.
      `tests/pr-check.test.mjs` — S3
      (실행: `collectDoneIssues` export. 건너뛴 경우(HEAD 아님·미정리 트리)는 notes 로 안내, 가드 실패 시 문서 누락 문구 대신 가드 안내)
- [x] 8. 문서 — `commands/harness-task.md`(§머지 후 종결 → ship 시점 종결, done·reopen·원격 nudge, 다중 MR은 단계를 미리 적음, 재개 전 fetch 권고, 원장은 필요할 때 `summary --write`)·
      `commands/harness-ship.md`(끝에 "마지막 단계 체크 → done → 커밋" 안내)·AGENTS.md와 `templates/AGENTS.md.hbs`(완료 절·plan.md 계약)·Codex skill 사본 확인
      (실행: + `harness-wiki.md`(위키 컴파일은 머지 뒤 원장 갱신과 묶음)·README·`templates/docs/README.md`(`summary --check` CI 게이트 비권장)·`harness-overview.html` 재생성·`tests/wiki-command.test.mjs` 문구 갱신. Codex skill은 commands 포인터라 무변경)
- [x] 9. 결정 로그 — `docs/decisions.md` D11 정정 문단과 기각 대안 줄 수정, D5 원장 문구. `templates/docs/decisions.md`는 D5만 해당하면 반영
      (실행: D11 2026-11-19 정정 문단 + 기각 대안 줄 취소선·뒤집힘 주석, D5 정정 문단은 두 로그에 글자 그대로. plan 템플릿은 마지막 단계가 없어 무변경 — "ship 완료"는 문서 관례)
- [x] 10. spec Done evidence — 시나리오 `test`를 실제 테스트 이름으로 채우고 주석을 벗긴다. `harness-team scenario check` 통과
      (실행: 6개 시나리오의 `test`를 실제 테스트 이름으로(ship 정합 검증 뒤 S1 golden 이름·S3 5건 정정), `cmd`를 `node scripts/test-isolated.mjs --test <파일>`로 좁힘. `scenario check` → pass (6 checked))
- [x] 11. CHANGELOG(동작 변경: done이 meta status를 쓰지 않음, reopen 추가) · 전체 `npm run test` 통과
      (실행: Unreleased에 Changed BREAKING 1건(판정·done·pre-push 가드·재개 조건·clean·원장·호환·소비자 조치) + Added `reopen`. `npm run test` 1371/0 fail/1 skip — 리뷰 수정 전 수치, 최종 수치는 artifact 결과)
- [x] 12. 리뷰 — `harness-team review codex`(diff) → 발견 재현·판별 후 반영 → artifact `## Reviews` 기록
      (실행: codex 1차 → 진짜 결함 7건 수정, codex 재리뷰는 네트워크 실패(기록 없음) → claude 재리뷰 → 회귀 1건·P3 2건 처리. P2-6 판단 보류·P2-3 기존 동작은 후속 후보)
- [ ] 13. ship 완료 — `/harness-ship` → 이 단계 체크 → `harness-team done` → 커밋 (이 task가 새 흐름의 첫 사례)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-18 — "종결"을 기록(meta `status`)에서 파생(기본 브랜치 plan 상태)으로 재정의. "ship"·"shipped"·"유효한 우회 기록" 신설. `done`은 검증 명령으로 의미 변경.

## 참고
- spec: `docs/chad/done-derive/done-derive-spec.md` (R1~R12, S1~S5·S4b)
- 버전 bump·릴리스는 이 plan 밖 — 머지 뒤 `harness-release` 스킬로 별도 진행

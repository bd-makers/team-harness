# p0-enforcement — Plan

## 목표

0.8.0 P0(선언 → 강제 전환) 6개 항목을 작은 PR 단위로 머지해, dogfooding이 입증한
enforcement 갭을 메운다.

## 단계

### 완료
- [x] **① `task done` 종결 가드** — `collectDoneIssues`가 plan 미완 `- [ ]`·artifact
  부재/템플릿 그대로·미커밋 변경·활성화 후 커밋 0개를 검사, `--force`로만 우회.
  (commit `1b28b97`, `src/commands/task.mjs` + `tests/done-guard.test.mjs`)
- [x] **② `doctor` 게이트 우회 감지** — `checkActiveSpecGate`가 활성 task spec.md에
  "Ambiguity 자가진단" 섹션이 없으면 ⚠️ 경고(포인터 껍데기 spec 감지).
  (commit `1b28b97`, `src/commands/doctor.mjs` + `tests/doctor.test.mjs`)
- [x] **④ README↔CLAUDE.md 화해** — task 구조를 코드 SSOT(`docs/<user>/<name>/`,
  4파일 prefix, `task <name>` 시그니처)에 정렬.
  (commit `b18eeb9`, `README.md`·`templates/CLAUDE.md.hbs`·`templates/docs/README.md`)

### 미완 / 진행 중
- [~] **⑥ 플러그인 레포 자기 dogfooding** (in progress) — 이 task 자체. 플러그인 레포에
  `.harness/active.json` + 실제 task 디렉토리를 운용해 강제 갭을 상시 노출. 본 task 생성·
  채움으로 착수, P0 잔여 항목이 끝날 때까지 active 유지.
- [ ] **⑤ spec 경로 단일화** — docs 루트·`superpowers/plans`에 spec/plan을 만들면 게이트
  템플릿이 우회된다. `task <name>` 생성 spec을 정본으로 하고 외부 본문은 링크가 아니라 흡수.
  (대상: 워크플로우 규약 + 필요 시 `migrate` 보강)
- [ ] **③ 리뷰 산출물 규약** — Codex/Gemini 리뷰 결과를 task 디렉토리에 남기는 규약 문서화.
  없으면 "리뷰함"이 영구 미검증. (P3와 연계)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-06-10: "강제 vs 선언", "포인터 껍데기 spec", "종결 가드", "메타 아이러니" 개념을
  spec.md Ontology에 신규 정의(이 task 착수와 함께).

## 참고
- `- [~]`는 진행 중 표기(plan 종결 가드는 `- [ ]`만 미완으로 카운트하므로 ⑥은 가드를
  트리거하지 않음). P0 미완(③⑤)이 남아 있어 task는 done 처리하지 않고 active로 둔다.

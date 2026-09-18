# diagram-record-cli — Spec

## 목적 / 요구사항

**문제.** 다이어그램 옵트인의 **기록** 단계가 세 문서에 산문으로 흩어져 있고 이미 문구가 갈렸다:

| 문서 | 기록 형식 |
|---|---|
| `commands/harness-diagram.md` 7번 | `- 다이어그램: <path> 생성 (2026-08-21)` / `- 다이어그램: 미실행 — 도구 없음 (2026-08-21)` |
| `commands/harness-task.md` 6번 | "산출물 경로를 … 날짜와 함께 한 줄" / `"다이어그램 미실행 — 도구 없음"` |
| `commands/harness-ship.md` Record | `- 다이어그램: 미실행 (diagram-design 스킬이 이 머신에 없음 — 2026-08-20)` |

plan 체크박스 닫기도 두 곳(diagram.md 5·6번, task.md 4번)에 나뉘어 있다 — 만들면 `- [x]`, 건너뛰면
`- [x] spec/plan 다이어그램 — 미실행(도구 없음)`. 이 두 쓰기(artifact 한 줄 + plan 한 줄)는 결과가 정해지면
판단이 없는데 에이전트가 매번 손으로 두 파일을 고친다. 하나만 고치면 "plan.md가 곧 상태" 계약이 깨지고,
`- [ ]`를 열어 두면 `done` 가드가 막는다.

**영향.** 옵트인한 모든 task, `/harness-diagram`·`/harness-ship`을 쓰는 세션.

**기대 결과.** 결과(생성 | 미실행+사유)를 받아 artifact 한 줄과 plan 체크박스를 **함께** 쓰는
`harness-team diagram record`를 둔다. probe(이 세션에 어떤 스킬이 노출됐는가)와 degrade(건너뛸지)는 산문에
남는다 — 세션 전용 입력과 판단이다.

**제약.**

- 활성 task가 없으면 error 패킷(exit 1). 생성 기록인데 `docs/<user>/<name>/<name>-diagram.html`이 없으면 기록하지
  않는다 — 없는 산출물을 "생성"으로 남기는 것이 산문이 막으려던 거짓 기록이다.
- plan에 다이어그램 단계가 **하나도 없으면** 거부한다(exit 1, 무쓰기). 옵트인은 plan 단계 추가로 남기는 사용자 결정이고
  (task.md 2번 · diagram.md 2번은 `--force`에서도 단계를 먼저 추가한다), 기록 명령이 조용히 옵트인을 만들면 두 결정이
  섞인다.
- 열린 `- [ ] … 다이어그램` 단계가 없고 닫힌 단계만 있으면 plan은 건드리지 않는다(`already-closed`). artifact 줄이
  최신 결과의 기록이다.
- `--skipped`는 사유가 필수다 — "미실행"만으로는 "묻지 않은 것"과 구분되지 않는다.
- artifact 줄은 `## 결과` 절의 끝(fence 밖 첫 `## Reviews` 앞)에 넣는다. `review.mjs`의 fence 추적 삽입을
  헤딩 패턴만 받게 일반화해 공유한다 — `insertReviewBlock`의 동작은 그대로다.

## 설계 / 접근

| 단계 | 판정 | 근거 |
|---|---|---|
| Probe — 스킬 노출 확인 | **산문 유지** | 세션 전용 입력 |
| Degrade — 건너뛸지·예외(script 실행 뷰어) 판단 | **산문 유지** | 판단 |
| 생성 — 상류 스킬 호출 | **산문 유지** | 세션 전용 |
| Record — artifact 한 줄 + plan 체크박스 | **CLI** `diagram record [--skipped] [사유·메모…]` | 결과가 정해지면 판단 없음 · 3문서 드리프트 |

구성:

- `src/commands/diagram.mjs` (신규) — `runDiagram(ctx)`. 액션 `record`만. `closeDiagramStep(plan, outcome)`·
  `diagramRecordLine(...)` 순수 함수 export.
- `src/commands/review.mjs` — `insertBeforeHeading(artifact, block, pattern)` 추출, `insertReviewBlock`은 래퍼.
- 배선 — `cli-args.mjs` `COMMANDS`(flags `['skipped']`)·`OPTIONS_HELP`, `bin` `taskCmds`·`taskArgs`·`case`.
- 문서 — diagram.md 7번·task.md 6번·ship.md Record를 CLI 호출로, SKILL common commands, CHANGELOG, overview.

## Ontology

- **record**: 결과 하나를 두 파일에 같은 시각으로 남기는 것. 생성(`produced`) 또는 미실행(`skipped` + 사유).
- **생성 vs 갱신**: artifact에 이미 같은 경로의 `생성`/`갱신` 줄이 있으면 이번 줄은 `갱신`. 파일 상태가 아니라
  **기록**으로 판정한다 — git 추적 여부는 세션마다 다르다.
- **옵트인 상태**: plan의 다이어그램 단계 존재 여부(task.md 정본). record는 이 상태를 읽기만 하고 만들지 않는다.
- **판단이 없다**: 같은 task 상태·같은 인자면 같은 두 줄.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — 다이어그램 기록 단계(artifact 줄 + plan 체크박스)를 `harness-team diagram record`로 대체한다.
- [x] **Constraint 명확도** (30%) — 산출물 없으면 거부 · 옵트인 단계 없으면 거부 · 사유 필수 · 닫힌 단계는 불변.
- [x] **Success 기준** (30%) — `npm test` 통과 + 세 문서의 기록 형식 산문이 CLI 호출 한 줄로 수렴 + 실제 task에서
      `record --skipped` 실행 후 두 파일 대조.
- [x] **Context 명확도** (brownfield 한정) — 영향 파일: `src/commands/diagram.mjs`(신규), `src/commands/review.mjs`,
      `src/cli-args.mjs`, `bin/harness-team.mjs`, `commands/harness-diagram.md`, `commands/harness-task.md`,
      `commands/harness-ship.md`, `skills/harness-team/SKILL.md`, `tests/diagram-command.test.mjs`(신규),
      `tests/cli-args.test.mjs`, `CHANGELOG.md`, `docs/harness-overview.html`(생성물).
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence

```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고

- 옵트인 계약 정본: `commands/harness-task.md` "spec/plan 다이어그램 옵트인" · 실행 어댑터: `commands/harness-diagram.md`
- artifact 삽입 선례: `src/commands/review.mjs` `insertReviewBlock` (fence 추적)
- 선례(같은 원칙): `docs/hslee/config-rmw-cli/`, `docs/hslee/stack-detection-cli/`

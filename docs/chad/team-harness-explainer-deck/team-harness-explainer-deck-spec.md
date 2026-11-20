# team-harness-explainer-deck — Spec

## 목적 / 요구사항
팀 온보딩 덱 `docs/team-harness-explainer.html`이 11-10에 로컬 브랜치 `fix/handoff-no-sweep`(`679641e`)에만 커밋된 채 main에 들어가지 않았다. 이 덱을 main에 올린다.
덱은 v0.54.0 기준이라 0.57.0·0.58.0 이후 틀린 사실을 말한다. 특히 명령 순서 슬라이드가 "`/harness-task done` — 머지 후, 기본 브랜치에서 종결"이라고 적는다. 0.58.0부터는 push 전에 `done`을 돌리고, 머지가 곧 종결이다.
기대 결과: 덱이 main에 있고 0.58.1의 사실(검토 게이트, 계산된 종결, pre-push done 가드)과 맞는다.

## 범위 (In / Out)
- **In**: `679641e` cherry-pick. 그 덱에서 0.55.0 이후 바뀐 사실을 고친다(브랜드 버전, meta.json 설명, 사이클 장표의 S2·S7·S8 상자, 명령 순서, 장표 notes의 종결 순서).
- **Out**: 장표 구성·디자인·새 장표 추가 — 사실 정정만 한다. `docs/index.html` 등재 — 원본 덱도 허브에 없었고 등재는 별도 결정이다. 로컬 브랜치 정리(같은 세션에서 끝냈다, 백업 ref `refs/backup/2026-11-20/*`).

## 원천 검토 (R1)
- 없음 — 원천 문서 없는 문서 정정. 사실의 정본은 `commands/harness-task.md`("종결", "구현 전 사람 검토 게이트")와 CHANGELOG 0.57.0·0.58.0.

### 원천

### 발견

## 설계 / 접근
`DECK`·`slides` 데이터의 문장만 바꾼다. 렌더 코드는 건드리지 않는다.
| 위치 | 전 | 후 |
|---|---|---|
| 브랜드 | v0.54.0 | v0.58.1 |
| 03·DOCS meta.json | 판정 창 · 완료 상태 | 판정 창 · 리뷰 증거 (0.58.0부터 done이 status를 쓰지 않음) |
| 12·CYCLE S2 상자 | — | 첫 단계 `[사람] spec 검토 승인` 한 줄 추가 (0.57.0) |
| 12·CYCLE S7 상자 | pre-push가 같은 pr-check 실행 | pr-check + done 가드 (0.58.0) |
| 12·CYCLE S8 노드 | done · S8 지식화 / 머지 뒤 | S8 종결 · 지식화 / 머지 = 종결 |
| 12·CYCLE S8 상자 | done: 미완·미커밋 차단 · main에서 이미 done | done(push 전) · main에서 이미 종결 |
| 12 notes | PR → 머지 → 기본 브랜치에서 done | ship → 마지막 단계 [x] → done → push → PR → 머지(= 종결) |
| 13·COMMANDS | done을 머지 후에 | `harness-team brief` 추가 · done을 push 전으로 · 머지 = 종결 · wiki는 머지 뒤 |

## Ontology
- **온보딩 덱**: `docs/team-harness-explainer.html` — 1920×1080 자립형 HTML 슬라이드. 소비자가 읽는 ② 문서다.
- 게이트 근거: 목표(덱을 main에 올리고 현행화)·제약(사실 정정만)·성공 기준(아래)·영향 파일(덱 1개)이 정해졌다.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 덱을 main에 올리고 0.58.1 사실과 맞춘다.
- [x] **Constraint 명확도** (30%) — 문장만 바꾸고 장표 구성·렌더 코드는 그대로 둔다.
- [x] **Success 기준** (30%) — 아래 Done evidence 줄.
- [x] **Context 명확도** (brownfield 한정) — `docs/team-harness-explainer.html` 하나.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence
```json
{ "version": 1, "review": "required" }
```
완료 기준: 덱이 브라우저에서 15장으로 렌더되고 숨은 로직 상자에 넘치는 줄이 없다. `npm run docs:check`와 `tests/docs-*.test.mjs`(옛 문구 테스트 포함)가 통과한다.

## 참고
- 원 커밋: `679641e` (`fix/handoff-no-sweep`, 11-10).
- 종결 정본: `commands/harness-task.md` "종결 — ship 시점, 머지가 곧 종결". 게이트 정본: 같은 문서 "구현 전 사람 검토 게이트".

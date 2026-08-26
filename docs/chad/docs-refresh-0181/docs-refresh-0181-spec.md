# docs-refresh-0181 — Spec

## 목적 / 요구사항

사용자가 첨부한 HTML 문서 3종을 **0.18.1 기준**으로 갱신하고 버전 표기를 붙인다.

| 첨부 | 저장소 파일 | 첨부 시점 버전 | 현재 저장소 버전 표기 |
|---|---|---|---|
| attachment-1 | `docs/harness-fleet-guide.html` | 0.14.0 | 0.14.0 |
| attachment-2 | `docs/harness-overview.html` (생성물) | 0.14.0 | 0.14.0 |
| attachment-3 | `docs/harness-workflow-simulation.html` | 0.12.0 | 0.13.0 |

요구사항:

1. 세 문서의 버전 표기(제목·태그·eyebrow·footer)를 **0.18.1**로 맞춘다.
2. 표기만 바꾸지 않는다 — 0.14.0(또는 0.13.0) 이후 실제로 **틀려진 서술**을 고친다.
3. 저장소에 이미 존재하는 `*-<version>.html` 스냅샷 관례를 따르는 두 문서에 한해
   `-0.18.1.html` 스냅샷을 남긴다. 관례가 없는 문서(fleet guide)에는 스냅샷을 만들지 않는다.
4. `docs/harness-overview.html`은 **생성물**이므로 손대지 않고 템플릿을 고친 뒤 재생성한다.

## 설계 / 접근

### 갱신 기준선

`package.json`의 `version`(= 0.18.1)을 기준으로 삼는다. `what-changes-latest-version.html`이
같은 기준을 쓴다. `## [Unreleased]`에 있는 변경(Node 18→24 BREAKING, `done` 판정 창의
`firstActivatedAt` 전환)은 **아직 릴리스되지 않았으므로 본문 서술의 기준으로 삼지 않는다.**

예외 하나 — **Node 버전**은 같은 `package.json`의 `engines.node`(= `>=24`)에서 오고
`docs/prerequisites.md`도 이미 `Node ≥ 24`를 하드 요구사항으로 적고 있다. overview 배지에만
`≥18`을 남기면 같은 트리 안에서 두 문서가 서로를 반박하므로, 배지는 `≥24`로 맞추고
**"다음 릴리스 예고(BREAKING)"로 명시**한다. 같은 블록에서 `firstActivatedAt` 전환도 예고로만 적는다.

### 무엇이 틀려졌나 (소스로 확인)

| # | 낡은 서술 | 실제 (0.18.1) | 근거 |
|---|---|---|---|
| 1 | `task`/`done`이 `docs/task_summary.md`·`docs/<user>/<user>-task.md`를 갱신 | 두 파일은 **생성물**. `task`/`done`은 건드리지 않고 `summary --write`가 렌더 | `src/commands/task.mjs:238-247`, `src/commands/summary.mjs:13` (0.16.0) |
| 2 | 병렬 브랜치에서 집계 파일 3개가 충돌 | 충돌하는 건 `<user>-handoff.md` **1개**뿐 | 위와 동일 |
| 3 | `harness-team release --help`가 실제 patch 릴리스를 수행 | `--help`는 argv 어디에 있든 usage만 출력. 오탈자 플래그는 dispatch 전에 exit 2 | `src/cli-args.mjs:203-224` (0.15.1) |
| 4 | `done` 종결 가드 4종 | 6종 — plan 미완·artifact 미작성/템플릿·미커밋·커밋 0개 + **테스트 미작성**·**리뷰 마커**(spec opt-in), 그리고 `## Done evidence` 선언 자체가 invalid면 차단 | `src/commands/task.mjs:413-525` (0.18.1) |
| 5 | task 디렉터리 = 파일 5개 | 5 md + **`<name>-meta.json`**(harness 소유 기계 상태, SSOT 아님) | `src/commands/task.mjs:222-241` (0.16.0) |
| 6 | 리뷰는 `/harness-codex-review` | 엔진 중립 `/harness-review`·`/harness-adversarial-review`. codex 이름 2개는 deprecated alias, **0.19.0에서 제거** | `commands/harness-review.md`, CHANGELOG 0.17.0·0.18.0 |
| 7 | task 생성 후 곧바로 spec 초안 | `/harness-spec`(3소스 writer) → `/harness-interview`(validator). 신규 task 직후 다이어그램 **옵트인 1회 질문** | CHANGELOG 0.17.0·0.18.0 |
| 8 | 라이프사이클이 `done`에서 끝남 | PR/MR 직전 `/harness-ship` 단계가 있다 | CHANGELOG 0.17.0 |

### 파일별 작업

- **`docs/harness-workflow-simulation.html`** — 직접 편집. 릴리스 배너를 0.15–0.18.1로 교체,
  S2(task 생성)에 meta.json·다이어그램 옵트인 반영, S4(done)의 가드 목록을 6종으로 확장하고
  집계 파일 갱신 서술 제거, 명령 카드에 `summary`·`context`·`boundary` 추가, ship 단계 추가.
- **`docs/harness-fleet-guide.html`** — 직접 편집. §1 가드 수, §4 리뷰 커맨드 이름·모드 표,
  §6 충돌 지도(집계 파일 2행 재작성), §7 `release --help` 경고 블록 재작성, §8 체크리스트,
  §9 함정 표를 0.18.1 사실로 교정.
- **`docs/harness-overview.template.html`** — 버전 태그·footer·스냅샷 목록·히스토리 블록을
  고치고 `npm run docs:generate`로 `harness-overview.html` 재생성.

### 스냅샷 정책

- 만든다: `docs/harness-overview-0.18.1.html`, `docs/harness-workflow-simulation-0.18.1.html`
  (두 파일 모두 기존 버전별 스냅샷 계열이 있다)
- 만들지 않는다: `docs/harness-fleet-guide-0.18.1.html` — 스냅샷 계열이 없다.
  없는 관례를 이 task에서 발명하지 않는다.
- 백필하지 않는다: `harness-workflow-simulation-0.13.0.html` (누락돼 있으나 이 task 범위 밖)

## Ontology

- **버전 기준선(baseline)**: 문서가 설명하는 대상 버전. 여기서는 `package.json`의 `0.18.1`이며
  `## [Unreleased]`는 포함하지 않는다.
- **스냅샷(snapshot)**: `docs/<doc>-<version>.html`. 그 버전 시점의 문서를 그대로 얼린 사본.
  최신본(`docs/<doc>.html`)과 내용이 동일한 상태로 릴리스마다 추가된다.
- **생성물(generated artifact)**: 소스에서 재생성 가능해 손으로 고치지 않는 파일.
  `docs/harness-overview.html`, `docs/task_summary.md`, `docs/<user>/<user>-task.md`가 해당한다.
- **집계 파일(ledger)**: 여러 task를 가로지르는 요약 파일. 0.16.0에서 생성물이 되어
  병렬 브랜치 충돌 원인에서 빠졌다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — 첨부 3종을 0.18.1 사실로 교정하고 버전 표기를 붙인다. 대상 파일이 diff로 특정됨.
- [x] **Constraint 명확도** (30%) — overview는 템플릿 경유만 허용(`docs:check`가 CI 게이트),
      스냅샷은 기존 계열이 있는 문서에만, Unreleased는 제외.
- [x] **Success 기준** (30%) — 세 문서에 0.18.1 표기 + 위 8개 교정 항목 반영 + `npm test`·`npm run docs:check` 통과.
- [x] **Context 명확도** (brownfield 한정) — 영향 파일 5개(문서 3 + 템플릿 1 + 스냅샷 2) 식별 완료.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 1.0

## Done evidence
```json
{ "version": 1, "tests": "skip", "review": "optional" }
```
문서 전용 task라 새 테스트를 만들지 않는다. 회귀 방어는 기존 `docs:check`·
`tests/documentation-inventory-pointers.test.mjs`가 이미 담당한다.

## 참고
- `MAINTAINING.md` — 릴리스 절차 5단계(문서 갱신 + 버전별 스냅샷 관례)
- `CHANGELOG.md` `## [0.15.0]` ~ `## [0.18.1]`
- `docs/what-changes-0.15.0.html` ~ `docs/what-changes-0.18.1.html`

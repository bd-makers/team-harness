# managed-section-refresh-path — Spec

## 목적 / 요구사항

**오늘 무엇이 안 되는가.** `AGENTS.md`·`CLAUDE.md`의 관리 절(`<!-- harness:section="…" -->`)은 `init`이
마커 병합으로 다시 렌더한다 — `migrate`는 렌더하지 않는다. 그런데 두 가지가 겹쳐 소비자가 새 규범을 못 받는다.

1. **신호가 없다.** doctor는 관리 절이 템플릿보다 낡았는지 보지 않는다. 2026-09-26 deep-math에서 `protocol`
   절이 0.42.0 문구인 채로 doctor 경고는 D10·Codex 신뢰·eager 크기뿐이었다.
2. **문서가 반대로 가리킨다.** `commands/harness-migrate.md` description·본문이 migrate를 "템플릿 수정이 도달하는
   유일한 경로"라 적는다(파일 단위로만 참). 0.42.1 릴리스 노트가 이 문장을 믿고 "소비자는 `migrate`로 받는다"고
   썼고, 실측에서 `migrate`는 "Nothing to migrate"로 끝났다.

**기대 결과.** 사용자가 편집하지 않은 관리 절이 템플릿보다 낡았으면 doctor가 경고하고 `harness-team init`을
처방한다. migrate·init 문서는 "관리 절은 `init`"을 명시한다.

**제약.**
- doctor는 **읽기 전용**이다 — 렌더·해시만 하고 쓰지 않는다.
- **init이 실제로 바꿀 절만** 센다. 판정은 `mergeMarkdown`의 교체 조건과 같아야 한다 — 다르면 doctor가 init이
  하지 않을 일을 처방한다.
- plugin-dev 저장소(템플릿의 원천)에서는 건너뛴다 — 기존 stale 템플릿 경고와 같은 게이트.

## 설계 / 접근

`findStaleManagedSections(targetDir, root)`(doctor.mjs, export):

- 파일별로 `loadRenderState(targetDir).sections[file]`(기록 해시)이 **없으면 건너뛴다** — 부트스트랩이라
  편집 여부를 알 수 없고, 이 경우는 migrate의 관리 절 백업이 이미 다룬다.
- symlink 레거시 파일은 건너뛴다(init·migrate와 같은 가드).
- 렌더 컨텍스트는 `{ projectName: basename(targetDir), ...detectStack(targetDir) }` — migrate의 관리 절 백업과 같다.
- 절마다: 현재 블록 해시 == 기록 해시(미편집) **이고** 새 렌더 해시 ≠ 현재 → stale. 결과는 `"<file>#<section>"` 목록.
- doctor 배선: `pluginDev ? [] : …`, 경고 1건 + `nextActions`에 `harness-team init`.

**알려진 한계.** `init --stack X`로 강제한 스택은 어디에도 저장되지 않는다. 그런 설치에서는 `stack` 절이 stale로
보일 수 있는데, `init --yes`(플래그 없이)도 감지 스택으로 다시 렌더하므로 **경고는 init의 실제 동작과 일치한다**.
강제 스택 저장은 범위 밖이다.

**범위 밖.** 사용자가 편집해 init이 건너뛰는 절의 템플릿 변경 알림(init 실행 시 이미 diff로 경고한다).

문서 정정: `commands/harness-migrate.md`(description·본문 2곳), `commands/harness-init.md`의 skills·rules·hooks 한정 문장.

## Ontology

- **관리 절**: 마커로 감싼 블록. init이 교체 단위로 쓰고, render-state에 블록(마커 포함) sha256을 기록한다.
- **stale 관리 절**: 기록 해시 == 현재 해시(미편집)인데 현재 템플릿 렌더와 다른 절. `init`이 교체할 절과 동치.
- 게이트 근거: 판정식이 `mergeMarkdown`의 교체 조건에서 그대로 나오고, 영향 파일이 식별됐다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — "미편집 관리 절이 낡았으면 doctor가 init을 처방".
- [x] **Constraint 명확도** (30%) — 읽기 전용·init 판정과 동치·plugin-dev 제외.
- [x] **Success 기준** (30%) — 단위 테스트 4종(stale·편집됨·최신·부트스트랩) + 문서 정정 + `npm test`.
- [x] **Context 명확도** (brownfield) — `src/commands/doctor.mjs`, `src/merge.mjs`, `src/render-state.mjs`, `src/harness.mjs`(`AGENT_FILE_TEMPLATES`), `commands/harness-migrate.md`, `commands/harness-init.md`, `tests/doctor.test.mjs`.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고

- 발견 경위: 0.42.1 소비자 현행화(2026-09-26) — `migrate` "Nothing to migrate", `init --yes` 뒤 `commit 시` 줄 갱신.
- 판정 정본: `src/merge.mjs` `mergeMarkdown`(교체·건너뜀), `src/harness.mjs` `planChanges`(렌더 컨텍스트).

# migrate-init-gaps — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

**출처**: 2026-09-09 소비자 3곳(deep-math·job-scraper·heliosent-profile) 0.35.0 현행화 실측 —
인계 `.claude/handoffs/2026-09-09-2053-consumer-refresh.md`(종결). 레거시(AGENTS.md symlink) 설치에
`migrate` → `init`을 처음 실제로 돌려 본 기록이며, 아래 3건이 그 경로에서 드러났다.

**결함 1 — `migrate`가 설치하지 않은 훅을 배선한다.**
`migrateSessionStartHook`(src/commands/migrate.mjs)가 템플릿 `hooks.SessionStart` 그룹 전체를 deep-merge하므로
`node ".../.claude/hooks/observe-tools.mjs"` 항목이 함께 들어가지만, `refreshClaudeHooks`는 **설치본만 갱신**하고
없는 파일은 설치하지 않는다(`installed === null → continue`). 결과: `init`을 이어 돌리기 전까지 SessionStart가
없는 파일을 가리킨다(deep-math·job-scraper 실측). 기대: migrate가 배선하는 훅 파일은 같이 설치하거나,
SessionStart 병합을 `session-context` 항목으로 좁힌다.

**결함 2 — `init` 재실행이 관리 절의 사용자 편집을 지운다.**
`mergeMarkdown`(src/merge.mjs)은 관리 절을 템플릿 렌더로 **통째로 교체**한다. 사용자가 `stack` 절 안에
적어 둔 실제 명령·라이브러리(deep-math: Expo 명령 24행 → 13행, job-scraper: uv → pip·`(configure)`)와
`principles`에 추가한 항목(advisor·세션분할)이 사라졌다. 명령 문서는 "마커 블록만 갱신·사용자 텍스트 보존"이라
말하지만 보존 대상은 user 영역뿐이다. 추가로 stack 감지가 uv 프로젝트를 `pip`으로 렌더했다.
기대(선택지, 인터뷰로 확정): (a) `stack`을 docs seed처럼 1회 설치·비갱신으로 분류, (b) 관리 절도 provenance
(마지막 렌더 결과와 일치할 때만 교체)로 보호, (c) 최소한 `init` 문서에 "관리 절 재렌더" 경고 + `--dry-run`.

**결함 3 — `doctor`가 dangling 훅 참조를 못 잡는다.**
`.claude/settings.json`이 존재하지 않는 훅 파일을 가리켜도(결함 1 상태) 경고가 없고 `observe-tools.mjs
(not present, optional)`로만 보고한다. 기대: settings의 `command`가 가리키는 프로젝트 내부 스크립트가 없으면 ⚠️.

**영향**: 0.9 이전 설치본을 가진 모든 소비자. 실측 결과 refresh의 provenance 판정 자체는 옳았다
(건너뛴 파일 11개의 바이트가 플러그인 git 이력에 없음 = 진짜 사용자 편집) — 그 부분은 손대지 않는다.

**제약**: 사용자 편집 보존 원칙(D8) 유지. 새 플래그보다 기존 명령의 계약 수정을 우선.

## 설계 / 접근
미정 — 결함 2의 선택지 (a)/(b)/(c)는 `/harness-interview`로 확정한 뒤 plan.md 작성.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **관리 절(managed section)**: `<!-- harness:section="…" -->` 마커로 감싼 블록. init 재실행 시 템플릿 렌더로 교체된다.
- **user 영역**: `<!-- harness:user:begin/end -->` 블록. 하네스가 절대 수정하지 않는 유일한 영역.
- **provenance refresh(D8)**: 설치본 바이트가 배포 이력의 sha와 일치할 때만 갱신하는 정책. 현재 훅·스킬·규칙에만 적용.
- **dangling 훅 참조**: settings.json의 `command`가 가리키는 프로젝트 내부 파일이 존재하지 않는 상태.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 결함 3건이 재현 경로·기대 결과와 함께 적혀 있다.
- [ ] **Constraint 명확도** (30%) — 결함 2의 해결 방향(a/b/c)이 미확정.
- [x] **Success 기준** (30%) — 레거시 fixture에 migrate→init을 돌렸을 때 (1) settings가 가리키는 훅 파일이 모두 존재 (2) stack 절 사용자 편집 보존 (3) doctor가 dangling 참조를 경고.
- [x] **Context 명확도** (brownfield 한정) — migrate.mjs·harness.mjs(planChanges)·merge.mjs(mergeMarkdown)·doctor.
- [ ] **Ambiguity ≤ 0.2** — 결함 2 확정 전까지 미통과. 구현 진입 금지.

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
<!--
```json
{ "version": 1, "review": "required", "tests": "skip" }
```
-->

## 참고
- 실측 로그: 인계 파일 `## 인계 종결` 절 + 소비자 3곳의 `harness-team doctor` 출력(2026-09-09).
- (open) 결함 2에서 `stack` 절을 비갱신으로 돌리면, 템플릿이 stack 절에 새 항목(예: 명령 키)을 추가할 때 도달 경로가 없어진다 — (b)와의 trade-off.
- (open) 결함 1은 `init`을 이어 돌리면 해소되므로, "migrate 뒤 init 필수"를 문서화하는 것만으로 충분한지도 선택지.

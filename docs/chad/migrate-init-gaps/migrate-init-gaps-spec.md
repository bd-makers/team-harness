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
없는 파일을 가리킨다(deep-math·job-scraper 실측).
**기대(확정)**: `migrate` 단독 실행이 끝난 상태도 유효해야 한다. 그러므로 SessionStart 병합을 **`session-context`
항목으로 좁히고**, 그 훅이 파일을 필요로 하면 **함께 설치한다**. 사용자가 의도적으로 지운 선택적 훅
(`observe-tools` 등)은 되살리지 않는다 — `installed === null → continue`의 방어를 유지한다.

**결함 2 — `init` 재실행이 관리 절의 사용자 편집을 지운다.**
`mergeMarkdown`(src/merge.mjs)은 관리 절을 템플릿 렌더로 **통째로 교체**한다. 사용자가 `stack` 절 안에
적어 둔 실제 명령·라이브러리(deep-math: Expo 명령 24행 → 13행, job-scraper: uv → pip·`(configure)`)와
`principles`에 추가한 항목(advisor·세션분할)이 사라졌다. 명령 문서는 "마커 블록만 갱신·사용자 텍스트 보존"이라
말하지만 보존 대상은 user 영역뿐이다. 추가로 stack 감지가 uv 프로젝트를 `pip`으로 렌더했다.
**기대(확정)**: 관리 절 다섯(`protocol`·`roles`·`workflow`·`stack`·`principles`)에 **렌더 provenance**를 도입한다 —
절의 현재 바이트가 저장된 마지막 렌더 해시와 **일치할 때만 교체**하고, 다르면 **그 절만 건너뛰고 경고**한다.
`stack`을 따로 "비갱신"으로 분류하지 않는다(§설계 근거).

**결함 3 — `doctor`가 dangling 훅 참조를 못 잡는다.**
`.claude/settings.json`이 존재하지 않는 훅 파일을 가리켜도(결함 1 상태) 경고가 없고 `observe-tools.mjs
(not present, optional)`로만 보고한다.
**기대(확정)**: `command`가 **프로젝트 내부 스크립트**를 가리키는데 파일이 없으면 ⚠️. 전역 CLI 호출은 검사하지
않는다. 어느 모양에도 해당하지 않는 `command`는 침묵하지 않고 **"판정 불가"로 보고**한다.

**영향**: 0.9 이전 설치본을 가진 모든 소비자. 실측 결과 refresh의 provenance 판정 자체는 옳았다
(건너뛴 파일 11개의 바이트가 플러그인 git 이력에 없음 = 진짜 사용자 편집) — 그 부분은 손대지 않는다.

**제약**:
- 사용자 편집 보존 원칙(D8) 유지. 새 플래그보다 기존 명령의 계약 수정을 우선.
- `--yes`의 의미는 **"묻지 말고 안전한 기본값으로 진행"** 이다 — "묻지 말고 덮어써라"가 아니다.
  사용자 텍스트를 지우게 되는 절은 `--yes` 경로에서도 건너뛰고 경고한다(실패시키지 않는다).
- `migrate`의 정의는 **"구조를 최신으로 옮긴다"** 이지 "설치를 템플릿과 동일하게 만든다"가 아니다.

## 설계 / 접근

**결함 2 — 렌더 provenance.**
- 저장: `.harness/`에 관리 절별 마지막 렌더 결과 해시. **커밋 대상**이다 — 커밋하지 않으면 팀원이 clone한 뒤
  첫 `init`마다 부트스트랩 판정이 다시 일어난다.
- 판정: 절의 현재 바이트 해시 == 저장값 → 교체(하네스가 렌더한 그대로다). 불일치 → 그 절만 건너뛰고 경고.
- 대화형: 지우게 될 내용을 `dry-run` diff로 **먼저 보여주고 확인받는다**. 비대화형(`--yes`): 건너뛰고 경고.
- **부트스트랩(해시가 없는 기존 설치본 = 소비자 전부)**: "모른다"를 **stock으로 간주**한다(교체). "사용자 편집으로
  간주"를 기각한 이유 — 그 설치본은 관리 절 다섯을 영영 건너뛰고, 해시를 남길 렌더 자체가 일어나지 않아
  스스로 빠져나오지 못한다. 대신 손실을 복구 가능·가시로 만든다: **`migrate`가 관리 절 원본을 백업하고
  템플릿 렌더와의 diff를 경고로 보여준다.** `migrate`는 원본과 렌더 예정 내용을 동시에 볼 수 있는 유일한 지점이다.
- **`stack`을 따로 취급하지 않는 근거**: 감지는 최초 설치 때만 맞고 재실행 때는 사용자가 더 정확하다는 것이
  (a)안의 논거였는데, 렌더 provenance가 그 보호를 이미 준다. 그리고 (a)의 부작용(템플릿이 stack에 새 항목을
  추가할 때 도달 경로 소실)도 사라진다 — 손대지 않은 설치본에는 도달하고, 손댄 설치본에는 경고로 알린다.

**결함 1 — 배선을 좁히고 파일을 같이 설치.**
`migrateSessionStartHook`의 deep-merge 대상을 `session-context` 항목으로 한정. `refreshClaudeHooks`의
`installed === null → continue`는 유지하되, migrate가 **자기가 배선한** 훅에 한해 파일 설치를 보장한다.

**결함 3 — doctor의 dangling 검사.**
검사 대상은 `command` 중 (1) 프로젝트 상대경로(`./.claude/hooks/*.sh`) (2) `${CLAUDE_PROJECT_DIR}` 접두 경로.
전역 CLI(`harness-team session-context 2>/dev/null || true`)는 제외 — 하네스 스스로 `|| true`로 부재를 허용한다.
파싱되지 않는 `command`는 `unknown`으로 보고한다. "경고 0"이 "검사한 범위 안에서만 문제 없음"을 뜻하게 되는 것이
이번 결함의 본질이므로, 침묵은 금지다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **관리 절(managed section)**: `<!-- harness:section="…" -->` 마커로 감싼 블록. 다섯 개 — `protocol`·`roles`·
  `workflow`·`stack`·`principles`(`src/merge.mjs`·`templates/AGENTS.md.hbs`·`templates/CLAUDE.md.hbs`).
- **user 영역**: `<!-- harness:user:begin/end -->` 블록. 하네스가 절대 수정하지 않는 유일한 영역.
- **provenance refresh(D8)**: 설치본 바이트가 **출하 이력의 sha 테이블**과 일치할 때만 갱신하는 정책
  (`migrate.mjs:342,360,410`). 훅·스킬·규칙처럼 **바이트가 프로젝트와 무관한** 파일에만 쓸 수 있다.
- **렌더 provenance (신규)**: 관리 절의 **마지막 렌더 결과 해시**를 설치 측(`.harness/`)에 기록해 두고 대조하는 정책.
  관리 절은 렌더 결과가 프로젝트마다 다르므로(`stack`은 감지 결과, `roles`는 사용자명) 출하 sha 테이블을 만들 수
  없다 — D8과 목적은 같고 판정 근거의 소재지만 다르다(출하 측 → 설치 측).
- **dangling 훅 참조**: settings.json의 `command`가 가리키는 프로젝트 내부 파일이 존재하지 않는 상태.
- **판정 불가(unknown)**: doctor가 `command`의 모양을 해석하지 못한 상태. "문제 없음"과 구분해 보고한다.

**게이트 통과 근거(2026-09-09 인터뷰)**: 결함 2의 미확정 방향이 유일한 미통과 사유였고, 인터뷰가 (a)/(b)/(c)를
"렌더 provenance + migrate 백업·diff"로 통합 확정했다 — (a)는 (b)에 흡수, (c)는 대화형 경로로 편입. 결함 1은
`migrate` 단독 유효성이라는 상위 계약에서, 결함 3은 "침묵 금지"에서 각각 범위가 도출됐다. 열린 질문 2건 모두 닫힘.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 결함 3건이 재현 경로·기대 결과와 함께 적혀 있다.
- [x] **Constraint 명확도** (30%) — 결함 1·2·3의 해결 방향 확정, `--yes` 경로 동작 확정, 부트스트랩 판정 확정.
- [x] **Success 기준** (30%) — 레거시 fixture에 migrate→init을 돌렸을 때 (1) settings가 가리키는 프로젝트 내부 훅
  파일이 모두 존재 (2) 손대지 않은 관리 절은 갱신되고 **손댄 절은 건너뛰고 경고**(`--yes` 포함) (3) doctor가
  dangling 참조를 ⚠️로, 해석 불가 command를 `unknown`으로 보고 (4) migrate가 관리 절 원본 백업 + diff 경고.
- [x] **Context 명확도** (brownfield 한정) — `src/commands/migrate.mjs`(migrateSessionStartHook≈690·
  refreshClaudeHooks≈498) · `src/harness.mjs`(planChanges≈130) · `src/merge.mjs`(mergeMarkdown) ·
  `src/commands/doctor.mjs` · `src/cli-args.mjs`(`--yes`) · `templates/.claude/settings.json`.
- [x] **Ambiguity ≤ 0.2** — 통과(2026-09-09 인터뷰). 근거는 Ontology 절 마지막 문단.

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
- ~~(open) stack 절 비갱신 시 템플릿 새 항목 도달 경로~~ → **닫힘**: 렌더 provenance가 (a)를 흡수해 문제가 소멸.
- ~~(open) 결함 1을 "migrate 뒤 init 필수" 문서화만으로 해결~~ → **닫힘**: `migrate` 단독 실행도 유효해야 한다는
  계약을 확정했으므로 문서화만으로는 부족.
- (open → plan.md) `migrate`의 관리 절 원본 백업 파일의 위치·이름·수명(1회용인가, 누적인가).
- (open → 소비자 조치) 렌더 해시를 `.harness/`에 두고 커밋하려면 소비자 3곳의 `.gitignore`(`.harness/`)를
  고쳐야 한다. 같은 이유로 `.harness/backup.json`도 현재 미커밋 — 현행 정책(팀 공유)과 불일치.

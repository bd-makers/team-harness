# eager-budget-headroom — Spec

## 목적 / 요구사항
- **문제**: 프로젝트 eager 소계(`AGENTS.md` 11,711 + `CLAUDE.md` 5,784 = 17,495 B)가 상한
  `PROJECT_EAGER_MAX_BYTES` 17,500 B에 5 B 남았다. 이후 모든 규범 변경(② task 종결 의식 축소 등)이
  한 줄도 못 들어간다.
- **영향**: 이 저장소 + `init --yes`로 관리 절을 받는 소비자(렌더 템플릿도 같은 상한).
- **기대 결과**: 규범의 의미를 바꾸지 않고 `protocol` 관리 절에서 **1 KB 이상** 여유 확보.
- **제약**: 상한 상향 금지(v0.32.2 사고 뒤 둔 가드). 루트 `AGENTS.md`와 `templates/AGENTS.md.hbs`
  마커 절은 동일해야 한다(drift 테스트). Cursor는 `commands/`를 못 읽으면서 plan.md를 편집하므로
  Cursor가 지켜야 하는 **규칙 문장**은 AGENTS에 남긴다 — 근거·상세·절차만 lazy 정본에 맡긴다.

## 설계 / 접근
전하 선택(2026-09-26) A+B+C. 셋 다 lazy 정본이 이미 있어 새 문서를 만들지 않는다 — 압축만 한다.

| 절 | 현재 | 남기는 규칙 | 정본(이미 존재) |
|---|---|---|---|
| A. task 워크플로우 › 다이어그램(옵트인) | 871 B | 1회만 묻기·재활성화 시 안 묻기·plan이 상태·지우지 말고 `미실행(도구 없음)`으로 닫기·산출물 inline SVG·없는 task 정상 | `commands/harness-task.md` §spec/plan 다이어그램 옵트인 |
| B. plan.md 계약 | 1,058 B | 체크박스는 기계 입력 → 미리 `- [x]` 금지 | `commands/harness-interview.md:42-45`(writer·색인), plan 템플릿(Ontology 로그) |
| C. `<name>-meta.json` 문단 | 470 B | harness 소유 기계 상태, 손으로 고치지 않는다 | `commands/harness-task.md` §meta.json과 판정 창 |

`### plan.md 계약` 제목은 유지한다 — `harness-interview.md`와 `new-feature` 스킬이 그 이름으로 가리킨다.

## Ontology
- **eager 계층**: 매 세션 무조건 로드되는 파일(`AGENTS.md`·`CLAUDE.md`). **lazy 정본**: 호출 시에만 로드되는 명령 문서·스킬.
- **압축(이 task의 의미)**: 규칙 문장은 eager에 남기고 근거·상세·절차를 lazy 정본으로 넘기는 것. 규칙 삭제가 아니다.
- 게이트 통과 근거: 목표·제약·성공 기준이 바이트로 측정 가능하고 영향 파일이 3곳으로 특정됨.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — protocol 절 압축으로 eager 여유 ≥ 1 KB
- [x] **Constraint 명확도** (30%) — 상한 불변·마커 drift 0·Cursor 규칙 문장 보존·기존 테스트 문구 보존
- [x] **Success 기준** (30%) — `wc -c` 소계 ≤ 16,500 B, `npm test`·`npm run docs:check` PASS
- [x] **Context 명확도** (brownfield 한정) — `AGENTS.md`, `templates/AGENTS.md.hbs`, `tests/agent-files.test.mjs`(고정 문구), `MAINTAINING.md`(실측 수치)
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
```json
{ "version": 1, "review": "required", "tests": "skip" }
```
- tests skip 사유: 소스 변경은 `doctor.mjs` 주석 수치와 템플릿 문구뿐(동작 불변). 기존 `tests/agent-files.test.mjs`가
  protocol drift·eager 상한·고정 문구를 이미 검사하고 통과했다(1033 tests, fail 0).

## 참고
- 인계: `.claude/handoffs/2026-09-26-0811-eager-budget-and-cleanup.md` (§3 상한 상향 기각)
- Cursor 근거: `tests/agent-files.test.mjs:193-196`, 고정 문구 `:178-191`, `:239-246`
- 기각: D(JIT retrieval, lazy 사본 없음)·E(TCC 한도)·F(D-규범, 핵심) — 전하 선택 범위 밖

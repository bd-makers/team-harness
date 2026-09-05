# ci-docs-check-gitignore — Spec

## 목적 / 요구사항

2026-09-05 인계 정정(원 세션 "Harness PDF 검토 및 비교")에서 확인된 저장소 위생 2건을 닫는다.

1. **`docs:check`를 CI에 추가** — `docs/harness-overview.html`은 `scripts/generate-harness-overview.mjs`가
   소스 트리에서 생성하는 파일인데 `npm run docs:check`는 유지자 로컬에서만 돌았다(`.github/workflows/test.yml`·
   `release.yml` 어디에도 없음). overview 드리프트가 main에 그대로 들어갈 수 있다.
2. **`.claude/handoffs/`를 `.gitignore`에 추가** — 세션 인계 파일(`/session-handoff`)이 untracked로 남아
   `git status`를 더럽힌다. 인계 파일에는 결정 근거·머신 환경이 들어가 기본 권고가 gitignore다.

범위 제외: CHANGELOG(소비자 플러그인 동작 변화 없음 — 저장소 내부 CI·위생), 소비자 스캐폴드 `.gitignore`
목록(`src/harness.mjs`)에 handoffs 추가(인계 스킬은 개인 스킬이라 하네스 계약이 아님 — 별도 결정), release.yml.

## 설계 / 접근

- `test.yml`의 `test` job에 **`Run tests` 다음** 스텝 `Check generated docs`(`npm run docs:check`)를 추가한다.
  별도 job을 두지 않는 이유: setup 보일러플레이트(checkout·setup-node·check-latest 주석) 중복을 피하고,
  테스트 실패가 먼저 드러나야 하므로 순서를 tests → docs로 둔다. 생성기는 `git ls-files`만 쓰므로
  `actions/checkout@v5`의 shallow checkout에서도 로컬과 같은 결과가 나온다(이력 의존 없음).
- `.gitignore`에 `.claude/handoffs/` 1줄(`.claude/` 항목 옆).

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **생성 문서(docs/harness-overview.html)**: 소스 트리(명령·스킬·템플릿·매니페스트)에서 렌더되는 산출물. 정본은 소스이며 커밋본은 캐시다.
- **docs:check**: 생성 결과와 커밋본의 바이트 동등 검사(`--check`). 드리프트면 exit 1.
- **세션 인계 파일**: `.claude/handoffs/*.md`. 개인 스킬 산출물이며 저장소 계약이 아니다.
- 게이트 근거: 목표 2건·제약(별도 job 없음, release.yml 불변)·완료 기준(CI에서 docs 스텝 pass, `git check-ignore` 통과)·영향 파일 2개가 위에 특정됨.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

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
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- `.github/workflows/test.yml` `Run tests` 스텝 / `scripts/generate-harness-overview.mjs` `listTrackedSourceFiles`(git ls-files) · `main`(`--check`)
- `tests/done-guard.test.mjs:357` — `.github/workflows/test.yml`은 source도 test도 아님(done 가드 영향 없음)
- 발견 출처: cross-session 정정 메시지(2026-09-05, 항목 5) ← `.claude/handoffs/2026-09-05-1330-harness-pdf-6layer-comparison.md`

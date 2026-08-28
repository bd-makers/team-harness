# root-docs-0200-rubric — Spec

## 목적 / 요구사항

0.20.0 릴리스(D6 적대적 검증 4단계 완성) 이후에도 루트 문서들이 0.19.0 이전 상태에
머물러 있다. 세 가지를 인도한다:

1. **루트 문서 0.20.0 정합화** — `README.md`·`MAINTAINING.md`(+ 직결 드리프트인
   `docs/prerequisites.md`)에서 0.20.0 기준으로 낡은 서술을 찾아 갱신한다.
   - README에 D6(작업 단위 read-only 검증자) 언급이 0곳 — 설계 스코프 문단·명령어
     레퍼런스에 반영
   - README "변경 이력" 절이 v0.6.2에서 멈춤 — CHANGELOG.md 포인터로 교체
   - README 문서(HTML) 표에 fleet/task 가이드·index.html 누락
   - MAINTAINING "필수 검증"이 `node --test tests/`를 안내 — perf 격리(`--test-concurrency=1`)를
     건너뛰므로 `npm test`로 정정
   - MAINTAINING 작업 규칙에 verify kind allowlist 동기화 표면(commands/harness-review.md
     5단계 ↔ `src/commands/task.mjs` `VERIFY_KIND_SUFFIXES`) 누락
   - prerequisites.md §2·§7이 옛 리뷰 커맨드 이름(`/harness-codex-review` 등)을 권장 경로처럼 표기
2. **루브릭 평가 가이드 HTML 신규** — `docs/harness-rubric-guide.html`. D6 finding 스키마,
   5개 루브릭 프레이밍(adversarial·testcritic·shipcheck·contrarian·simplifier) + interview
   선행 채점, 엔진 층, 마커 계약과 `verify` 증거 게이트를 한 문서로. 기존 가이드
   (`harness-task-guide.html`)와 동일한 디자인 토큰, **자립형 inline SVG**(Obsidian이
   script 제거 — `docs/`가 그 환경).
3. **하네스 컨셉 완성도 리뷰** — 사용자 보고(대화)로 인도, 요약은 artifact에 기록.

## 설계 / 접근

- 문서 수정은 마커·테스트가 고정하는 문구를 깨지 않는 범위에서 한다
  (`tests/documentation-inventory-pointers.test.mjs`·`tests/prerequisites-doc.test.mjs` 확인).
- `AGENTS.md`·`CLAUDE.md`·`GEMINI.md`는 0.20.0에서 이미 D6 반영 완료 + managed 섹션이
  템플릿과 pin — 이번 범위에서 제외.
- 새 HTML은 `docs/index.html` Guides와 README 문서 표에 등재한다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **루브릭 평가**: D6가 규범화한 검증 방식 — 별도 컨텍스트의 read-only 검증자가
  finding 스키마(id·항목·심각도·판정·근거)로 산출물을 채점하고, 반영은 driver가
  재현·판별 후 단일 스레드로 수행한다.
- **루트 문서**: 저장소 루트의 사람용 문서(README·MAINTAINING·CHANGELOG + 에이전트
  파일 3종). 에이전트 파일 3종은 이미 0.20.0 정합이라 이번 수정 대상이 아니다.

문서 작업이라 Ambiguity 게이트는 생략 가능 범위지만, 요구사항이 사용자 지시 3항으로
구체적이어서 체크한다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? (문서 테스트 green + 3산출물 인도)
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence
```json
{ "version": 1, "tests": "skip" }
```
문서·HTML만 변경하는 task라 테스트 증거는 skip — 기존 문서 pin 테스트(`npm test`)의
green으로 회귀만 확인한다.

## 참고
- CHANGELOG.md `## [0.20.0]` — D6 1~4단계 전문
- docs/decisions.md D6 — finding 스키마·정직성 규칙·자동 수정 루프 금지의 정본
- commands/harness-review.md 5단계 — kind 접미사 열거의 정본

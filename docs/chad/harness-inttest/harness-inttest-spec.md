# harness-inttest — Spec

## 목적 / 요구사항

`/harness-unittest`, `/harness-comptest`의 세 번째 형제 커맨드 `/harness-inttest`를
플러그인에 기본 장착한다. 대상은 **프로세스 경계를 넘거나 여러 모듈이 실제 인프라와
함께 배선되는 코드** — API 라우트/핸들러, 리포지토리·DB 접근 계층, 캐시/큐 연동,
파일시스템, 아웃바운드 HTTP 슬라이스. Vladimir Khorikov *Unit Testing …* Part III
(통합 테스트) 전략을 [허용]/[금지] 실행 규칙으로 강제한다.

산출물:
- `commands/harness-inttest.md` (SSOT 계약, 한국어, 형제 문체 계승)
- `skills/harness-inttest/SKILL.md` (Codex 얇은 래퍼)
- `.claude-plugin/plugin.json` commands 배열 등록 + README 커맨드 표 행
- 두 형제 계약 라우팅 섹션에 inttest 교차 참조 **각 1줄**
- CHANGELOG 기록, `npm run test:unit` 통과

## 설계 / 접근

형제 계약의 단계 골격을 그대로 계승: 라우팅 → 0단계 스택 감지 → 1단계 스코프 →
2단계 전략 → 3단계 GWT → 4단계 프레임워크 특화 → 5단계 커버리지 → 6단계 검증 →
종료 조건. 대상 영역만 통합 층으로 교체하고 통합 특화 판별/규칙을 각 단계에 추가한다.

핵심 규율 = **managed vs unmanaged 의존성 구분**:
- managed(우리 소유 DB·캐시·FS)는 **실물로**(testcontainers 등), 목킹 금지.
- unmanaged(서드파티 API·결제·메일)는 **HTTP 경계에서만** msw(node)/nock 목킹.

## Ontology
*이 task가 다루는 핵심 개념의 정의.*

- **3형제 라우팅 경계**: 순수 로직 → unittest, 렌더/상호작용 → comptest,
  프로세스 경계/인프라 배선 → inttest. 어떤 코드든 소관 커맨드가 유일하게 결정됨.
- **managed 의존성**: 우리가 소유·전권 통제하는 상태 저장소(DB·캐시·FS). 통합
  테스트는 이것을 **실물로** 검증하는 것이 존재 이유.
- **unmanaged 의존성**: 우리가 통제 못 하는 외부 시스템(서드파티 API·게이트웨이).
  경계(HTTP)에서만 목킹하고 계약을 assert.
- **4-파일 동기화 invariant**: `commands/<name>.md` ⟺ `plugin.json.commands` ⟺
  README 표 ⟺ (CLI 래핑 시) bin 라우터. inttest는 CLI 서브커맨드가 아니라 에이전트
  워크플로우이므로 bin 라우터 대상 아님(unittest/comptest와 동일). 추가로 Codex
  래퍼 스킬(`skills/<name>/SKILL.md`)이 커맨드명·계약 참조를 만족해야 함.

**Ontology gate 통과 근거**: 세 형제 계약(unittest/comptest)과 manifest-sync 테스트,
README 표를 정독해 문체·라우팅·동기화 invariant를 확정함. inttest는 기존 두 형제와
동일한 4-파일 패턴을 따르며 bin 라우터를 건드리지 않는다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — 프로세스 경계 코드 통합 테스트 작성 커맨드 `/harness-inttest`
  신설. 사양 1~8 + 작업 순서 1~8이 프롬프트에 명시.
- [x] **Constraint 명확도** (30%) — SSOT=commands, 형제 문체 계승, manifest-sync
  invariant 준수, 형제 계약은 교차참조 1줄만, 커밋은 명시 요청 시만.
- [x] **Success 기준** (30%) — `npm run test:unit`(manifest-sync 포함) 통과 +
  3형제 라우팅 상호 모순 없음 + managed/unmanaged가 실행 규칙으로 표현.
- [x] **Context 명확도** (brownfield 한정) — 영향 파일 식별: 신규 2개(계약·스킬),
  수정 4개(plugin.json·README·형제 계약 2개 각 1줄·CHANGELOG).
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0 ≥ 0.8.

## 참고
- `commands/harness-unittest.md`, `commands/harness-comptest.md` — 형제 계약(문체·단계).
- `commands/harness-comptest.md` "라우팅" 섹션 — 경계 서술 golden reference.
- `skills/harness-unittest/SKILL.md` — Codex 래퍼 규약.
- `tests/manifest-sync.test.mjs` — 4-파일 동기화 invariant.

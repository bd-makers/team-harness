# harness-comptest — Spec

## 목적 / 요구사항

`/harness-unittest`의 형제 커맨드로 `/harness-comptest`를 추가한다. 대상은
**렌더링 결과와 사용자 상호작용이 관심사인 코드**(React/RN 컴포넌트·화면·UI 훅·폼 플로우).
Kent C. Dodds Testing Trophy의 통합(integration) 층 관점 + Testing Library
"테스트가 실제 사용 방식을 닮을수록 신뢰도가 높다" 원칙을 [허용]/[금지] 실행 규칙으로 강제.

산출물: 커맨드 계약(`commands/harness-comptest.md`), Codex 래퍼
(`skills/harness-comptest/SKILL.md`), `plugin.json`·README 등록, CHANGELOG,
통과하는 `npm run test:unit`.

## 설계 / 접근

- unittest 계약의 골격을 그대로 계승: frontmatter 형식, 0단계(스택 감지) → 스코프 →
  전략 → GWT → 특화 규칙 → 커버리지 → 검증, [허용]/[금지] 문체.
- 대상 영역만 교체 + 컴포넌트 특화 추가(프로바이더 감지, custom render 헬퍼, msw 경계 목킹,
  조건부 렌더 3상태, RN 특화, a11y-first 쿼리, act 경고 0건).
- unittest와의 경계를 서두 라우팅 규칙으로 명시(양방향 교차 참조).

## Ontology
*이 task가 다루는 핵심 개념의 정의.*

- **comptest 대상**: 렌더 결과·사용자 상호작용이 관심사인 코드(컴포넌트/화면/UI 훅/폼).
  순수 로직(포맷터·계산·리듀서)은 추출 후 `/harness-unittest`로 라우팅.
- **통합 층**: 자식을 실제로 렌더하고 네트워크(msw)만 경계에서 목킹하는 테스트.
- **4-파일 동기화 invariant**: `commands/<name>.md` ⟺ `plugin.json` ⟺ README 표 ⟺
  `skills/<name>/SKILL.md`. manifest-sync 테스트가 강제. (게이트 통과 근거: 이 invariant를
  기존 unittest와 동일 패턴으로 충족하므로 구조 변경 없음.)

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — comptest 커맨드 4-파일 + 계약 8단계 사양이 명시됨.
- [x] **Constraint 명확도** (30%) — 저장소 규약(SSOT, frontmatter 키, manifest-sync,
  스킬 이름 규칙, 커밋 금지)이 프롬프트에 열거됨.
- [x] **Success 기준** (30%) — `npm run test:unit`(manifest-sync 포함) 통과 + 경계 명확성.
- [x] **Context 명확도** (brownfield) — 영향 파일 식별: `commands/harness-comptest.md`(신규),
  `skills/harness-comptest/SKILL.md`(신규), `plugin.json`, `README.md`, `CHANGELOG.md`,
  (선택) `commands/harness-unittest.md` 교차 참조 1줄.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

## 참고
- 형제 계약: `commands/harness-unittest.md`
- invariant 가드: `tests/manifest-sync.test.mjs`

# harness-unittest — Spec

## 목적 / 요구사항

JS/TS/React/React Native 프로젝트에서 Khorikov 원칙을 따르는 단위테스트를 작성해 주는
신규 커맨드 `/harness-unittest`를 플러그인에 "기본 장착" 수준으로 추가한다.

산출물(5종):
1. `commands/harness-unittest.md` — 커맨드 계약(SSOT). 스택 감지 → 스코프 파싱 →
   Khorikov 전략 → GWT 강제 → React/RN 규칙 → 커버리지 → 검증의 7단계를 자기완결적으로 명시.
2. `skills/harness-unittest/SKILL.md` — Codex용 얇은 래퍼(harness-contrarian 본).
3. `.claude-plugin/plugin.json` commands 배열 등록.
4. README 커맨드 표 행 추가.
5. 통과하는 `npm run test:unit` (manifest-sync 4-파일 동기화 무결성).

## 설계 / 접근

- 이 커맨드는 **에이전트 워크플로우**다 (harness-contrarian/interview 계열) — `harness-team`
  CLI 서브커맨드가 **아니다**. 따라서 계약 본문에 `harness-team unittest` 형태의 라우터
  참조를 두지 않는다 (manifest-sync의 bin-router 테스트가 이를 강제).
- 절차 SSOT는 커맨드 계약(`commands/harness-unittest.md`)에 직접 쓰고, SKILL.md는 그것을
  Source of Truth로 가리키는 얇은 위임 래퍼로 둔다.
- Khorikov 원칙은 선언이 아니라 **실행 가능한 금지/허용 규칙**으로 표현한다
  (예: "내부 클래스 목킹 금지 — 발견 시 리팩토링 먼저 제안").

## Ontology
*이 task가 다루는 핵심 개념의 정의.*

- **커맨드 계약(contract)**: `/harness-unittest`의 관찰 가능한 동작을 규정하는 SSOT 문서.
  다른 세션의 Claude/Codex가 이 문서만 읽고 동일하게 동작할 수 있어야 한다.
- **래퍼 스킬(wrapper skill)**: Codex가 슬래시 커맨드 대신 로드하는 얇은 위임 문서.
  절차를 복제하지 않고 계약을 가리킨다.
- **4-파일 동기화**: command 파일 ⟺ plugin.json ⟺ README 표 ⟺ (CLI 래퍼면) bin 라우터가
  틀어지지 않아야 한다는 릴리스 불변식. harness-unittest는 CLI 래퍼가 아니므로 라우터 제외.
- **리팩토링 내성**: 구현 세부사항이 아닌 관찰 가능한 동작만 검증해, 리팩토링 시 테스트가
  깨지지 않는 성질. Khorikov 4대 기둥 중 최우선.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지.*

- [x] **Goal 명확도** (40%) — 목표: "Khorikov 원칙 기반 단위테스트 작성 커맨드를 5종 산출물로 기본 장착."
- [x] **Constraint 명확도** (30%) — 기존 계약 문체·frontmatter 준수, manifest-sync invariant 유지, CLI 서브커맨드 아님.
- [x] **Success 기준** (30%) — `npm run test:unit` 전체 통과 + 계약 자기완결성 + Khorikov 실행규칙화.
- [x] **Context 명확도** (brownfield) — 영향 파일 식별 완료: commands/, skills/, plugin.json, README.md, CHANGELOG.md.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0 ≥ 0.8.

> **게이트 통과 근거:** 사용자가 사양 1~7과 작업 순서·평가 기준·중지 조건을 완전 명세로 제공.
> 남은 모호성은 도구 기본 추천값뿐이며 웹 검색으로 2026 기준 확정(Vitest/web·library, Jest/RN).

## 참고
- 본: `commands/harness-contrarian.md`(에이전트 워크플로우), `commands/harness-interview.md`(문체).
- 래퍼 본: `skills/harness-contrarian/SKILL.md`.
- 무결성 게이트: `tests/manifest-sync.test.mjs`.
- 도구 기준: Vitest+Testing Library(web/library), Jest+@testing-library/react-native(RN) — 2026 확인.

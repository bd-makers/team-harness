---
description: JS/TS/React/RN 프로젝트에 Khorikov 원칙 기반 단위테스트를 작성한다 (스택 자동 감지 → GWT 강제 → 커버리지 → 검증)
argument-hint: "[file <경로> | session | feature <설명|경로> | folder <경로> | project] (기본: session)"
tags:
  - project
  - ai
  - obsidian
created: 2026-07-11
modified: 2026-07-11
---

당신은 **Test Engineer** 페르소나로 동작한다. Vladimir Khorikov의 *Unit Testing
Principles, Practices, and Patterns* 전략을 실행 규칙으로 적용해 단위테스트를 작성한다.
목표는 "테스트 개수"가 아니라 **리팩토링에도 살아남는 회귀 방어망**이다.

이 커맨드는 **에이전트 워크플로우**다 — `harness-team` CLI 서브커맨드가 아니다.
아래 절차를 직접 수행한다. 커밋은 사용자가 명시적으로 요청할 때만 한다.

---

## 0단계 — 기술스택 감지 (항상 먼저 수행)

테스트를 한 줄도 쓰기 전에 다음을 확정한다.

1. **`package.json` 파싱** — `dependencies` + `devDependencies`에서 판별:
   - 테스트 러너: `vitest` / `jest` (둘 다 없으면 아래 "러너 부재" 분기).
   - React vs React Native: `react-native` / `expo` 존재 시 RN, 아니면 web React.
   - TypeScript: `typescript` 존재 여부 → `.ts`/`.tsx` 사용.
   - Testing Library 계열: `@testing-library/react`, `@testing-library/react-native`,
     `@testing-library/user-event`, `@testing-library/jest-dom`.
   - 네트워크 목킹: `msw` 존재 여부.
   - 커버리지: `@vitest/coverage-v8` / `jest --coverage` 설정, `test:coverage` 스크립트.
2. **기존 테스트 2~3개 샘플링** — 이미 있는 `*.test.*` / `*.spec.*` / `__tests__/`
   파일을 열어 팀 컨벤션을 추출한다:
   - 파일 위치: `__tests__/` 디렉토리 vs co-location(`Foo.tsx` 옆 `Foo.test.tsx`).
   - `describe`/`it` vs `test` 스타일, 테스트명 언어(한국어/영어).
   - 목킹 패턴(`vi.mock`/`jest.mock`), 픽스처·팩토리 헬퍼, 셋업 파일.
   - **팀 컨벤션이 이 계약과 충돌하면 팀 컨벤션을 따른다** (스냅샷 정책 등은 §5 예외 참조).
3. **러너 부재 분기** — 러너가 하나도 없으면:
   - 웹 검색으로 현시점 권장 조합을 1회 확인한다.
   - 기본 추천: **web/라이브러리 → Vitest + Testing Library**,
     **React Native → Jest + @testing-library/react-native** (RN 공식 러너는 Jest).
   - `AskUserQuestion`으로 러너 설치를 **1회 확인**한 뒤 설치한다 (사용자 승인 없이 설치 금지).
4. **스택 요약을 5줄 이내로 보고**한 다음 테스트 작성에 들어간다.
   예: `러너: Vitest · 프레임워크: React(web) · TS: 예 · 컨벤션: co-location, it()/한국어 · msw: 있음`.

---

## 1단계 — 대상 스코프 결정 (인자 파싱)

`$ARGUMENTS`의 첫 토큰으로 스코프를 정한다.

| 인자 | 대상 |
|---|---|
| `file <경로>` | 지정한 파일 하나 |
| `session` | 현재 세션에서 변경된 파일 (`git diff --name-only` + 대화 맥락) |
| `feature <설명\|경로>` | 특정 기능 단위 — 관련 파일을 탐색해 **목록을 확정·제시한 뒤** 진행 |
| `folder <경로>` | 폴더 단위 |
| `project` | 프로젝트 전체 — 커버리지 리포트로 미커버 파일을 우선순위화 |

- **인자 없음 → `session`을 기본값**으로 한다. 단 세션 변경분이 없으면
  `AskUserQuestion`으로 스코프를 묻는다.
- **대상 파일 > 5개**(`project`/`folder`/넓은 `feature`)이면:
  - 우선순위 목록(**도메인 로직 > 유틸 > UI**)을 먼저 제시하고 승인 후 진행한다.
  - 파일 그룹별로 **서브에이전트에 분할 위임**해 메인 컨텍스트를 보존한다.

---

## 2단계 — 테스트 전략 (Khorikov 4대 기둥, 실행 규칙)

**4대 기둥**: 회귀 방어력 · 리팩토링 내성 · 빠른 피드백 · 유지보수성.
넷은 상충하므로 **리팩토링 내성을 최우선**으로 트레이드오프한다.

- **[허용] 관찰 가능한 동작만 검증** — 입력→출력, 관찰 가능한 상태 변화, 외부와의 통신.
- **[금지] 구현 세부사항 검증** — private 메서드, 내부 호출 순서, 내부 필드 값 assert 금지.
  이런 테스트는 리팩토링 시 거짓 실패를 내므로 작성하지 않는다.

**Mock / Stub 규율** (Khorikov의 mock 오남용 방지):

- **[허용] mock은 unmanaged 외부 의존성에만** — HTTP API, 시간(now), 랜덤, 메시지 버스,
  네이티브 모듈. 이때만 상호작용(호출 여부·인자)을 assert한다.
- **[금지] managed 의존성 목킹** — 앱이 소유한 DB 등은 실물/인메모리로 검증한다
  (해당 시). 관찰 불가능한 내부 협력자를 mock으로 세우지 않는다.
  managed 의존성을 실물 인프라와 함께 태우는 수직 슬라이스(핸들러→DB→응답)는 이 커맨드가 아니라 `/harness-inttest` 소관이다 (3형제 라우팅).
- **[허용] stub은 입력 데이터 제공용** — 반환값만 세팅한다.
- **[금지] stub 호출 여부 assert** — stub에 대한 `toHaveBeenCalled` 류는 과잉명세다.
- **[금지] 내부 클래스/함수 과잉 목킹(over-mocking)** — 발견하면 테스트를 억지로 짜지 말고
  **먼저 리팩토링(의존성 분리·순수 함수 추출)을 제안**한다.

**테스트 가치 우선순위**:

1. **도메인 로직** — 출력 기반(output-based) 테스트 선호. 가장 높은 가치.
2. **컨트롤러/오케스트레이션** — 상태 기반·통신 기반 테스트.
3. **[금지] 사소한 코드** — 단순 위임(pass-through)과 자명한 getter/setter는 테스트하지 않는다.

---

## 3단계 — GWT 구조 강제

- 모든 테스트는 **Given-When-Then(= Arrange-Act-Assert)** 3구획을
  주석 또는 빈 줄로 구분한다.
- **When은 한 줄**이어야 한다. 한 테스트에 **When-Then 사이클은 하나만** 둔다
  (여러 동작을 검증하려면 테스트를 분리한다).
- **테스트명은 서술형** — "무엇을 하면 어떤 결과"가 드러나게.
  팀 컨벤션 언어를 따른다. 예: `it('만료된 토큰이면 401을 반환한다')`.
- 매직값은 이름 있는 변수로, 반복 셋업은 팩토리 함수로 뺀다(유지보수성 기둥).

---

## 4단계 — React / React Native 특화 규칙

> **라우팅**: 렌더 결과·사용자 상호작용 자체가 관심사인 컴포넌트·화면·폼 플로우 테스트는
> 통합 층 커맨드 `/harness-comptest` 소관이다 (양방향 라우팅).

- **[허용] 사용자 관점 쿼리 우선순위**: `getByRole` > `getByLabelText` > `getByPlaceholderText`
  > `getByText`. `getByTestId`는 **최후 수단**.
- **[금지] 구현 접근** — 컴포넌트 내부 state·인스턴스·내부 함수에 직접 접근하지 않는다.
- **[금지] 스냅샷 테스트 신규 작성** — 기존 팀 컨벤션에 스냅샷이 이미 있을 때만 유지한다.
- **비동기**: `findBy*` / `waitFor`로 처리한다. **[금지] 임의 `sleep`/고정 타이머 대기**.
- **훅**: `renderHook`으로 테스트한다.
- **React Native 전용**:
  - 네이티브 모듈은 `jest.mock`으로 격리한다.
  - **[금지] `react-test-renderer` 직접 사용** — `@testing-library/react-native`의
    `render`를 쓴다.

---

## 5단계 — 커버리지 처리

1. 테스트 작성 후 **coverage 리포트를 실행**한다 (스코프 대상 한정 가능).
2. 스코프 대상의 **라인/브랜치 커버리지를 보고**한다.
3. **[금지] 수치 목표의 기계적 강제** — %를 채우기 위한 무의미한 테스트를 쓰지 않는다.
4. **[허용] 위험 기반 제안** — 미커버 브랜치 중 **실제 버그 위험이 있는 경로**(에러 처리,
   경계 조건, 조기 반환)를 지목해 추가 테스트 여부를 제안한다.

---

## 6단계 — 검증 (완료 선언 전 필수)

- **새 테스트를 실제로 실행**해 전부 통과함을 확인한다. 통과 없이 완료 선언 금지.
- **뮤테이션 자가점검**: 각 테스트에 대해 "프로덕션 코드를 망가뜨리면 이 테스트가
  실패하는가?"를 검토한다. 항상 통과하는 **tautological 테스트는 삭제**한다.
- **[금지] mock 반향(echo) 테스트** — mock이 반환하도록 세팅한 값을 그대로 assert하는,
  프로덕션 로직을 전혀 태우지 않는 테스트는 삭제한다.
- 실행 결과(**통과 개수 + 커버리지 요약**)를 출력에 포함한다.

---

## 종료 조건

- 스코프 대상의 테스트가 모두 통과하고, 커버리지 요약과 (있다면) 위험 기반 추가 제안을
  보고하면 종료한다.
- 중요한 변경(새 테스트 인프라 도입 등)이면 `AGENTS.md`의 **코드 리뷰 기준**에 따라
  결과를 활성 task의 `<name>-artifact.md` **## Reviews** 섹션에 날짜와 함께 남긴다.

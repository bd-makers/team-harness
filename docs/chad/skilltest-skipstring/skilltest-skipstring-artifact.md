# skilltest-skipstring — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`skipString`이 `'`/`"` 스캔 중 raw ECMAScript line terminator(`LF`, `CR`, `LS`, `PS`)를
만나면 개행 직전을 스팬의 끝으로 반환하게 했다. 호출자가 개행을 코드로
보존하므로 다음 줄의 마커와 `it()` 선언을 계속 스캔한다. 백틱 템플릿은
기존처럼 개행을 넘고, 역슬래시 줄 이음도 LF·CRLF 모두 유지한다.

근본 경계가 오파싱을 막으며 기존 사후 우회 `hasMisparsedString`은 항상 false가 되어
함수와 `testBodies` 가드를 제거했다. 외부 의존성·채점 규칙·출력 형식은 변경하지
않았다.

### RED → GREEN 증거

- 수정 전 `node tests/sim/skilltest.mjs selftest` → **61/64**, exit 1.
  - JSX 아포스트로피 사이 주석 마커: FAIL.
  - JSX 아포스트로피 사이 빈 줄 구획: FAIL.
  - 두 아포스트로피가 `it()` 선언 2개를 가림: FAIL.
- 수정 후 동일 회귀 + line-terminator 경계 assert → **65/65**, exit 0.
  선언 fixture는 `declared=2`, `bodies=2`, `unparsed=0`, `truncated=false`, PASS를 모두 확인.

### A2 선언부 안전장치 판정

**불필요하므로 넣지 않았다.** 기존에 `decls=[] / truncated=false`로 조용히 FAIL하던
재현 fixture가 `skipString` 개행 경계 하나로 선언 2개를 모두 회복했다. A2를
더하면 동일 원인을 별도 계층에서 다시 탐지하는 중복 방어가 된다.

### 기존 채점 결과 전수 비교

- 저장소의 실제 grader 대상 패턴(`*.test|spec.[jt]s(x)`, `seed` 제외) 파일: **0개**.
  현재 테스트는 `.test.mjs`라 grader 대상이 아니므로 파일 단위 변경은 없다.
- 대신 기준 커밋 c81162d의 selftest GWT 호출 **53회 / 고유 소스 52개**를
  OLD-vs-NEW로 전수 재채점: 48개 불변, 4개 변경.
  - 유효 JSX 주석 마커 fixture: MANUAL → PASS — **false-MANUAL 제거**.
  - 유효 JSX 빈 줄 fixture: MANUAL → PASS — **false-MANUAL 제거**.
  - raw 개행이 든 미완결 문자열: MANUAL → FAIL.
  - 이스케이프된 역슬래시 뒤 raw 개행이 든 문자열: MANUAL → PASS.
- 마지막 두 소스는 둘 다 문법적으로 **불법 JS**이며 실제 grader 파일이 아니다.
  이 task가 승인한 line-end 복구 규칙의 결과이지 유효 파일의 신규 오판은 아니다.
  selftest에서는 불법 JS의 GWT 상태를 보증하는 대신 `skipString` 경계를 직접 보증하고,
  EOF까지 미완결인 소스에 대한 MANUAL 보증은 유지했다.

### 검증

- `node --check tests/sim/skilltest.mjs` → pass.
- `node tests/sim/skilltest.mjs selftest` → 65/65 pass.
- `npm run test:unit` → 142 pass / 0 fail.
- `npm run test` → 151 pass / 0 fail.


## Reviews

- **2026-07-30 · 코드 리뷰** — 정확성·엣지 케이스·회귀·보안·단순성·테스트 검토.
  발견 0건. 원인 지점의 경계 분기 1개로 두 발현을 닫고 중복 가드를 제거했다.
  백틱, LF·CRLF 줄 이음, escaped-backslash 뒤 raw 개행, EOF 미완결 경로를
  selftest로 확인했다. 입력·권한·민감 데이터 경계 변경은 없다.
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*


## Learnings

- 복구용 토큰화기도 문법이 금지하는 경계를 스팬 상한으로 삼아야 한다.
  다음 따옴표를 찾을 때까지 전진하면 줄별 JSX 산문이 전역 오파싱으로 바뀐다.
- 근본 경계를 고친 뒤에는 사후 오파싱 가드와 A2 안전장치가 모두 불필요했다.
  재현 fixture의 선언·본문 개수를 직접 검사해 "PASS라서 괜찮다"보다 강한 근거를 남겼다.

# docs-html-stub-tests — Spec

## 목적 / 요구사항

**오늘 안 되는 것.** `docs/`의 인터랙티브 HTML 산출물 3종은 인라인 `<script>` 안에 상태 기계와
문자열 생성 로직을 통째로 담고 있는데, 이를 검증하는 DOM 스텁 3종이 `/tmp`에만 있다.
저장소에서 재현되지 않고 `npm test`에 물리지 않으므로, 산출물을 고칠 때 회귀를 잡아 주는 것이 없다.

**영향.** 이 HTML들은 팀 전달용이고(`docs/index.html`이 라우팅한다), 규약이 바뀔 때마다
따라 고쳐야 하는 **파생물**이다(team-onboarding-kit Ontology). 고칠 일이 반복되는데 가드가 없다.

**기대 결과.** 세 스텁을 `node:test` 기반 `tests/*.test.mjs`로 승격해 `npm test`가 실행하고,
검증 대상 JS를 벤더링하지 않고 **HTML에서 실행 시점에 추출**한다.

**제약.**
- 런타임 의존성 0개를 유지한다 — 이 저장소의 `node_modules`는 비어 있고 `package.json`에
  `dependencies`·`devDependencies`가 없다. **jsdom·happy-dom을 도입하지 않는다.**
  기존 손수 만든 DOM 스텁을 그대로 쓴다.
- 대상 HTML 3종의 내용·동작을 바꾸지 않는다. 이 task는 테스트만 추가한다.
- `docs/harness-cheatsheet.html`은 인쇄 전용이라 스크립트가 없다 — 범위 밖이다.

## 설계 / 접근

### 결정 1 — JS를 벤더링하지 않고 HTML에서 추출한다 (핵심)

각 HTML은 `<script>` 블록이 **정확히 1개**라서 추출이 결정론적이다(2026-09-13 실측).

| HTML | script 블록 | 크기 |
|---|---|---|
| `docs/harness-operations-playground.html` | 1개 | 24,699자 |
| `docs/harness-onboarding-checklist.html` | 1개 | 10,173자 |
| `docs/harness-kickoff-deck.html` | 1개 | 15,817자 |

추출한 소스는 `new Function(src + ';return {…};')()` 로 평가해 내부 심볼을 꺼낸다 —
원본 스텁이 이미 쓰는 방식이고, 산출물이 ESM이 아니라 클래식 스크립트라 그대로 맞는다.

**벤더링을 기각한 근거(실측).** `/tmp/pg.js`·`/tmp/ob.js`는 현재 HTML과 바이트 단위로 일치했지만
`/tmp/dk.js`는 **이미 한 줄 낡아 있었다** — 슬라이드 14번 `class="body top"` → `class="body"`.
덱 문구 확정 커밋이 HTML만 고쳤고 추출본은 따라가지 않은 것이다. 사본은 조용히 썩고,
그 사이 테스트는 "통과"를 계속 보고한다. 추출 방식은 이 실패 모드를 구조적으로 없앤다.

### 결정 2 — 배치 위치는 `tests/*.test.mjs`

`tests/e2e/`가 아니다. 세 테스트 모두 순수 in-process이고 샌드박스·파일시스템 조작·CLI 실행이
없다. `tests/*.test.mjs`에 두면 `npm test`와 `npm run test:unit` 양쪽이 잡는다.

**기존 관례와 일치한다** — `tests/harness-overview-generation.test.mjs`,
`tests/documentation-inventory-pointers.test.mjs`, `tests/what-changes-latest-version.test.mjs`가
이미 `docs/*.html`을 읽어 검사한다. 새 패턴이 아니라 기존 패턴에 DOM 스텁을 더하는 것이다.

### 결정 3 — 추출 헬퍼를 공유한다

세 테스트가 같은 추출·평가 절차를 쓰므로 `tests/helpers/html-script.mjs`(신규)에 둔다.
`mkEl` 계열 DOM 스텁은 **공유하지 않는다** — 세 산출물이 요구하는 DOM 표면이
서로 다르다(덱만 `classList.toggle`·`addEventListener`·`location.hash`, 체크리스트만
`localStorage`). 억지로 합치면 각 테스트가 무엇을 가정하는지 읽기 어려워진다.

### 승격 대상과 기각 대상

| 원본 | 대상 HTML | 검사 수 | 처리 |
|---|---|---|---|
| `domstub2.mjs` (4,836 B) | operations-playground | 29 | **승격** → `tests/docs-playground.test.mjs` |
| `obstub.mjs` (3,397 B) | onboarding-checklist | 14 | **승격** → `tests/docs-onboarding-checklist.test.mjs` |
| `dkstub.mjs` (4,098 B) | kickoff-deck | 22 | **승격** → `tests/docs-kickoff-deck.test.mjs` |
| `domstub.mjs` (1,009 B) | — | 0 | **기각** — `console.log`만 하고 단언이 없는 초기 습작. `domstub2`가 대체했다 |
| `/tmp/pg-test.js` (29,816 B) | — | — | **기각** — 산출물 JS의 중간 스냅샷이지 테스트가 아니다 |

파일이 4개 보이더라도 **3개만 승격한다.**

### 변환 시 필요한 것

원본은 하네스 손수 러너다 — `t(name, ok, extra)` + 실패 카운트 + `process.exit(fail?1:0)` +
최상위 `console.log`. 변환은 다음을 요구한다:

- `node:test`의 `test()`/`describe()` + `node:assert/strict`
- `process.exit` 제거 (러너가 종료 코드를 관리한다)
- 진행 상황 `console.log` 제거 — 단언 메시지로 옮긴다
- 파일명을 `*.test.mjs`로 (그래야 `npm test` 글롭이 잡는다)
- 하드코딩된 `/tmp/*.js` 경로를 `docs/*.html` 추출로 교체

**단언 내용은 바꾸지 않는다.** 세 스텁 모두 2026-09-13에 현재 HTML 기준으로 전부 통과했다 —
playground 29 · checklist 14 · deck 22, **총 65건**. 변환 후에도 같은 65건이 통과해야 한다.

이 수치는 2026-09-13 실행 출력을 직접 센 것이다. `team-onboarding-kit-artifact.md:25-29`는
26 · 14 · 25로 적고 있으나 **두 값이 틀렸다**(playground 실제 29, deck 실제 22). 그 산문 수치를
기준으로 삼지 말 것.

## Ontology

- **산출물 스크립트(artifact script)**: `docs/*.html` 안 인라인 `<script>` 블록의 본문.
  이 task의 검증 대상이며, 저장소 안 유일한 정본이다. 별도 `.js` 파일로 복제하지 않는다.
- **추출(extraction)**: 테스트 실행 시점에 HTML에서 산출물 스크립트를 읽어 내는 것.
  **벤더링(vendoring)** — 사본을 저장소에 두는 것 — 과 대비되며, 이 task는 추출을 택했다.
- **DOM 스텁(DOM stub)**: 산출물 스크립트가 기대하는 브라우저 전역(`document`·`localStorage`·
  `location` 등)의 최소 손수 구현. 완전한 DOM이 아니라 **그 산출물이 실제로 건드리는 표면만** 흉내 낸다.
- **승격(promotion)**: `/tmp`의 일회성 검증 스크립트를 `tests/`의 상시 실행 테스트로 옮기는 것.
  파일 이동이 아니라 러너·경로·단언 형식의 변환을 포함한다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — "DOM 스텁 3종을 HTML 추출 방식의 `node:test` 테스트로 승격해
      `npm test`에 물린다." 대상 파일·개수·배치 위치가 전부 확정돼 있다.
- [x] **Constraint 명확도** (30%) — 의존성 0개 유지, HTML 무변경, 치트시트 제외가 명시됐다.
- [x] **Success 기준** (30%) — `npm test`가 통과하고, 세 테스트에서 총 65건이 실행된다(파일별 기준선은 plan).
      추가로 "HTML을 고의로 깨면 실패한다"는 음성 검증이 있다(plan 참조).
- [x] **Context 명확도** (brownfield) — 영향 파일이 전부 식별됐다: 신규 4개
      (`tests/docs-playground.test.mjs`·`tests/docs-onboarding-checklist.test.mjs`·
      `tests/docs-kickoff-deck.test.mjs`·`tests/helpers/html-script.mjs`), 삭제 1개
      (`docs/chad/docs-html-stub-tests/raw-stubs/`). `docs/*.html`과 `package.json`은 무변경.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0

**게이트 통과 근거** — 위 Ontology의 "추출 vs 벤더링" 정의가 이 task의 유일한 설계 분기였고,
`dk.js` 드리프트 실측으로 추출 쪽이 결정됐다. 남은 작업은 기계적 변환이다.

## Done evidence

```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고

- 상위 task: `docs/chad/team-onboarding-kit/` — 이 리스크를 기록한 곳은
  `team-onboarding-kit-artifact.md:84-86`("남은 리스크")이고, `:57`의 S2 판정이 같은 공백을 지목한다.
- 원본 3종은 `raw-stubs/`에 보존돼 있다(sha256은 `raw-stubs/README.md` 옆 plan 1단계 참조).
  변환 완료 후 삭제한다.
- 기존 HTML 검사 테스트 3종 — `tests/harness-overview-generation.test.mjs` ·
  `tests/documentation-inventory-pointers.test.mjs` · `tests/what-changes-latest-version.test.mjs`
- (open) 네 번째 산출물 `docs/harness-cheatsheet.html`은 스크립트가 없어 이 task 밖이다.
  인쇄 레이아웃(A4 1장·오버플로 0)에 대한 가드는 여전히 없으며, 필요하다면 별도 task다.

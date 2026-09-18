# stack-detection-cli — Spec

## 목적 / 요구사항

**문제.** 테스트 3형제 커맨드(`commands/harness-unittest.md:22`·`harness-comptest.md:41`·
`harness-inttest.md:48`)의 **0단계 — 기술스택 감지**가 같은 절차를 29 / 42 / 36줄로 세 벌 들고 있다.
산문이 정본이라 이미 드리프트가 났다:

- comptest가 단계를 끼워 넣으며 번호를 3→4→5로 밀었다
- 예외 참조가 갈렸다 — unittest는 `§5`, comptest는 `§4`를 가리킨다. 두 문서 모두 스냅샷 정책이 §4에
  있으므로 **unittest 쪽이 틀렸다**(실측: `harness-unittest.md:122`, `harness-comptest.md:152`)
- 러너 추천 문장이 각자 진화했다(`Vitest + Testing Library` vs `Vitest + @testing-library/react + jsdom + msw`)

**영향.** 세 커맨드를 쓰는 모든 세션. 에이전트가 매번 `package.json`을 읽고 의존성 유무를 눈으로 판별하므로
같은 저장소에서도 세션마다 판정이 흔들릴 수 있고, 문서 세 곳을 따로 고쳐야 해서 드리프트가 재발한다.

**기대 결과.** 판단이 필요 없는 부분(= 의존성 유무 조회)을 `harness-team stack` 서브커맨드로 내린다.
세 문서는 CLI 한 줄을 호출하고, 산문에는 판단이 필요한 부분만 남는다.

**제약.**

- `src/detect-stack.mjs`의 `buildProfile` 출력은 **건드리지 않는다** — `init`/`migrate`가 AGENTS.md
  렌더 변수로 쓰므로 테스트 축을 섞으면 템플릿에 샌다.
- CLI는 **read-only**다. 설치·수정·질문을 하지 않는다.
- 출력 필드를 문서에 나열하지 않는다 — 나열하면 네 번째 드리프트 소스가 된다.

## 설계 / 접근

| 0단계 항목 | 판정 | 근거 |
|---|---|---|
| package.json 의존성 조회 (러너·TS·coverage) | **CLI** | 판단 없음 · 3중 중복 |
| 컴포넌트 특화 (providers·DOM env·storybook·jest-expo) | **CLI** | 판단 없음 |
| 통합 특화 (server framework·ORM/driver·outbound mock) | **CLI** | 판단 없음 |
| 기존 테스트 2~3개 샘플링 (팀 컨벤션 추출) | **산문 유지** | 코드를 읽고 관례를 귀납하는 판단 |
| 러너 부재 분기 (웹 검색 + `AskUserQuestion` + 설치) | **산문 유지** | 세션 전용 입력 — CLI는 질문할 수 없다 |
| Docker 부재 분기 (`docker info` + 대안 선택) | **산문 유지** | inttest 단독이라 중복이 아니고, 대안 선택은 판단 |

특화 축까지 내리는 이유: 공통 축만 내리면 에이전트가 특화 축 때문에 `package.json`을 **어차피 읽어야 해서**
CLI 호출이 벌어 주는 게 거의 없다. 한 번의 호출로 의존성 조회를 끝내는 것이 이 변경의 값이다.

구성:

- `src/detect-testing.mjs` (신규) — `detectTesting(dir)`. `detect-stack.mjs`와 분리한다.
- `src/commands/stack.mjs` (신규) — `runStack(ctx)`. `resolveStack`(기존) + `detectTesting`를 합쳐 출력.
- 배선 — `src/cli-args.mjs`의 `COMMANDS` + `bin/harness-team.mjs`의 `case 'stack'`.

## Ontology

- **stack profile**: `detect-stack.mjs`의 `buildProfile` 출력. 프로젝트의 **정체성**(id·언어·패키지
  매니저)과 렌더용 명령 문자열. `init`/`migrate`가 AGENTS.md 템플릿 변수로 소비한다. 이 task는 건드리지 않는다.
- **testing profile**: `detect-testing.mjs`의 신규 출력. 프로젝트의 **테스트 설비**(러너·라이브러리·
  프로바이더·서버/ORM·목킹). 에이전트만 소비하며 템플릿에 들어가지 않는다. 두 프로필을 분리한 이유가 이것이다.
- **판단이 없다**: 같은 저장소 상태면 같은 출력. 이 task에서 "CLI로 내릴 수 있다"의 판정 기준이다.
- **세션 전용 입력**: `AskUserQuestion` 응답, 이 세션에 어떤 스킬이 노출됐는가, 웹 검색 결과.
  CLI가 볼 수 없으므로 그것에 의존하는 절차는 산문에 남는다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — 3형제 0단계의 의존성 조회 단계를 `harness-team stack`으로 대체한다.
- [x] **Constraint 명확도** (30%) — read-only · `buildProfile` 불변 · 출력 필드 문서 미나열.
- [x] **Success 기준** (30%) — `npm test` 통과 + 세 문서에서 의존성 조회 산문이 사라짐 + 실제 소비자
      프로젝트에서 감지 결과가 현실과 일치.
- [x] **Context 명확도** (brownfield 한정) — 영향 파일 전부 식별: `src/detect-testing.mjs`(신규),
      `src/commands/stack.mjs`(신규), `src/cli-args.mjs`, `bin/harness-team.mjs`,
      `commands/harness-{unittest,comptest,inttest}.md`, `tests/detect-testing.test.mjs`(신규),
      `tests/cli-args.test.mjs`, `docs/harness-overview.html`(생성물).
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence

```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고

- 기존 감지 모듈: `src/detect-stack.mjs` (`detectStack`·`resolveStack`·`buildProfile`)
- 기존 테스트 스타일(tmpdir fixture): `tests/detect-stack.test.mjs`
- JSON envelope 계약: `src/observation.mjs` (`buildEnvelope`·`emitObservation`)
- 명령 테이블 계약과 pin 테스트: `src/cli-args.mjs`, `tests/cli-args.test.mjs:143,158,195`
- 생성 문서 자동 등재 지점: `scripts/generate-harness-overview.mjs:123`

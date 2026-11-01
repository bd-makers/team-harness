# stack-inprocess-docker — Spec

## 목적 / 요구사항
문제: `harness-team stack`의 `next_actions`는 ORM이나 DB 드라이버가 하나라도 감지되면 "통합 테스트라면 `docker info`로 testcontainers 가용성을 직접 확인하세요"를 낸다(`src/commands/stack.mjs` `nextActions`). 인프로세스 DB인 `better-sqlite3`만 쓰는 프로젝트에도 같은 안내가 나온다.
영향: `/harness-inttest` 0단계 1번이 이 `next_actions`를 읽는다. 0.51.1의 `commands/harness-inttest.md`는 "DB가 인프로세스면 `docker info`를 건너뛴다"로 바뀌었는데(#155), CLI는 여전히 반대로 안내해 에이전트가 받는 두 신호가 어긋난다.
기대 결과: 감지된 DB 드라이버가 전부 인프로세스이면 `docker info` 안내 대신 "인프로세스 DB라 testcontainers·`docker info` 확인이 필요 없다"는 안내를 낸다. 서버형 드라이버가 하나라도 있거나 ORM만 감지돼 DB를 알 수 없으면 기존 안내를 유지한다.
제약: 새 의존성 없음. envelope 형태(`next_actions` 문자열 배열)와 다른 안내 문구는 바꾸지 않는다.

## 범위 (In / Out)
- **In**: `src/commands/stack.mjs`의 `nextActions` 분기, `tests/detect-testing.test.mjs`에 CLI 테스트 추가.
- **Out**: `DB_DRIVERS` 감지 목록 확장(`sql.js`·`pglite` 등 — 감지되지 않는 드라이버라 이번 분기에 영향 없음, 요청 범위 밖), mongoose 같은 ORM 이름으로 서버형을 추론하는 규칙(드라이버 없이 ORM만 있으면 기존 안내 유지로 충분).

## 원천 검토 (R1)

### 원천
- 없음 — 내부 CLI 정합 수정이라 외부 기획·디자인 원천이 없다. 근거는 0.51.1 `commands/harness-inttest.md` 0단계 2번과 eval-defect-triage artifact 후속 항목이다.

### 발견

## 설계 / 접근
`nextActions`에서 `testing.dbDriver`가 비어 있지 않고 전부 인프로세스 집합(`better-sqlite3`)에 속하면 인프로세스 안내를, 아니면(서버형 드라이버 포함, 또는 ORM만) 기존 `docker info` 안내를 push한다.

## Ontology
- **인프로세스 DB 드라이버**: 별도 서버 프로세스 없이 테스트 프로세스 안에서 DB를 여는 드라이버. 현재 감지 목록(`DB_DRIVERS`) 중 `better-sqlite3`만 해당한다.
- **서버형 DB 신호**: `pg`·`mysql2`·`mongodb` 드라이버, 또는 드라이버 없이 감지된 ORM(어떤 DB인지 알 수 없으므로 서버형으로 취급).
- 작은 버그 수정이라 Ambiguity 게이트는 생략했다(CLAUDE.md §1 예외) — 목적·범위·완료 기준은 위와 Done evidence에 있다.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence
- `better-sqlite3`만 있는 프로젝트의 `stack --json` `next_actions`에 `docker info`가 없고 인프로세스 안내가 있다.
- `pg`(서버형) 또는 `better-sqlite3`+`pg` 혼합, ORM만 있는 프로젝트는 기존 `docker info` 안내를 유지한다.
- `npm run test` 통과.

## 참고
- `src/commands/stack.mjs` `nextActions` · `src/detect-testing.mjs` `DB_DRIVERS`
- `commands/harness-inttest.md` 0단계 2번(0.51.1)

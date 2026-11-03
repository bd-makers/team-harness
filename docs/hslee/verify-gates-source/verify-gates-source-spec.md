# verify-gates-source — Spec

## 목적 / 요구사항
- **문제**: 에이전트가 읽는 검증 명령과 커밋 게이트가 돌리는 명령의 도출이 다르다. `/verify`는 AGENTS.md `## 명령`의 typecheck·lint·test 세 줄을
  정본으로 읽는다(`templates/.claude/skills/verify/SKILL.md:14-16`). `## 명령`은 package.json 스크립트에서만 나오고(`src/detect-stack.mjs:103-117`),
  게이트 목록 `.harness/gates.json`은 프리셋 commit 규칙에서 나온다(`src/presets.mjs:200`). Python은 `## 명령` 세 줄이 늘 `(configure)`인데 게이트는
  pytest·ruff를 돌린다. 그래서 `/verify`는 "미설정"으로 건너뛰지만 커밋은 막힌다. heliosent(0.48.0)도 typecheck가 `bun run typecheck` 대 `bunx tsc --noEmit`으로 갈린다
  (task `subsystem-audit` 후보 A, 피드백 F1).
- **영향**: 템플릿 스킬 `/verify`를 받은 소비자.
- **기대 결과**: `/verify`가 커밋 게이트와 같은 목록을 정본으로 본다. `gates.json`이 없을 때만 `## 명령`으로 내려간다.
- **제약**: eager 0 B — AGENTS.md는 바꾸지 않는다. 새 명령 없음. D8 — 고친 설치본은 덮지 않는다.

## 범위 (In / Out)
- **In**(6개, 메인테이너 승인): `templates/.claude/skills/verify/SKILL.md`, `src/commands/migrate.mjs`(직전 판 sha 등록), 새 stock fixture
  `tests/fixtures/stock-templates/2026-09-03-58b22848/.claude/skills/verify/SKILL.md`, `tests/fixtures/stock-templates/README.md`(era 표·개수),
  `tests/migrate-templates.test.mjs`(stock 개수 22 → 23), `CHANGELOG.md`.
- **Out**: AGENTS.md `## 명령` 렌더(eager), `gate` CLI 코드.

## 원천 검토 (R1)
### 원천
- task `subsystem-audit` spec 후보 A, `docs/decisions.md` D8(provenance refresh)·D11.
### 발견 (착수 전 확인 3건)
- **위치**: `/verify`는 **소비자 템플릿 스킬**뿐이다(`templates/.claude/skills/verify/SKILL.md`, `disable-model-invocation: true` — 사람이 부른다).
  플러그인 명령(`commands/`·`skills/`)에는 없다.
- **도달 경로**: 플러그인 갱신만으로는 닿지 않는다. `harness-team migrate`의 템플릿 refresh(`REFRESHABLE_TEMPLATE_FILES`, `src/commands/migrate.mjs:329`)가
  유일한 경로다. 설치본 sha가 stock 목록에 있을 때만 갈아 끼운다.
- **stock sha 등록 필요**: 현재 판(sha `65a3f469…`, 2026-09-03 커밋 `58b2284`에서 도입)이 `KNOWN_STOCK_TEMPLATE_SHA256['.claude/skills/verify/SKILL.md']`에
  없다(`:361-363`, initial 판 하나뿐). 등록하지 않으면 현재 판 설치본이 모두 "looks customized"로 남는다. 선례 task `capsule-cause`와 같이
  fixture 파일 + 테이블 항목 + 드리프트 가드 개수를 함께 바꾼다.
- (open) **D-1 `/verify`의 실행 방식** — gates.json이 있을 때:
  - 안 ① **`harness-team gate commit`을 그대로 실행**한다. 게이트와 실행 방식·workspace 선택·127 처리·환경 원인 단서(task `gate-fail-cause`)가 같다.
    중복 로직이 없다. 대신 첫 실패에서 멈추므로, 남은 항목의 결과는 보고하지 못한다.
  - 안 ② **스킬이 `gates.json`의 `commit`을 읽어 항목마다 실행하고 각각 보고**한다. 지금 `/verify`처럼 전부 돌린다. 대신 workspace 객체 형식의 선택 규칙을 스킬 산문이
    다시 서술하게 된다(2중 정의).
  - 권장 ① — "정본 하나"가 목적이라 실행 의미도 하나여야 한다.
  → 결정(2026-11-04, 메인테이너 "안 ②로"): **안 ②**. ①을 기각한 근거 — workspace 객체 형식에서 깨끗한 트리면 아무것도 돌리지 않는다
    (`src/commands/gate.mjs` `selectByChange()`는 `changedFiles()`가 빈 배열이면 선택이 비어 "바뀐 workspace 없음"으로 끝난다). 첫 실패에서 멈추고, 출력이 훅 문구다.
    ②의 2중 정의 우려는 "선택 규칙을 서술하지 않고 전체 검증이므로 전부 실행"으로 없앤다.
- 검토 완료: 2026-11-04

## 설계 / 접근
안 ② — 스킬이 `.harness/gates.json` `commit`을 읽는다(배열은 그대로, 객체는 모든 workspace 목록을 중복 없이), 저장소 루트에서 명령마다 실행해 각각 ✅/❌, 첫 실패에서 멈추지 않는다. 깨진·형식 틀린 gates.json은 "설정 오류"로 보고하고 폴백하지 않는다(게이트와 같은 원칙). 실패가 있으면 `harness-team stack --json` `installTrace`를 먼저 보라는 한 줄 — 환경 원인 단서(task `gate-fail-cause`)를 스킬 쪽에서 대신한다. 공통: gates.json이 없으면(파일 부재) 지금처럼 `## 명령` 세 줄로 내려가고, `(configure)`는 "미설정"이다.
2차 장치 규칙: 새 장치가 아니라 기존 스킬의 정본을 바꾸는 것이다. `## 명령`을 프리셋으로 렌더하는 안은 eager가 들어 기각(감사 spec 후보 A).

## Ontology
- **검증 정본**: 커밋 게이트가 실제로 돌리는 `.harness/gates.json` `commit`. `## 명령`은 gates.json이 없을 때의 대체 출처.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%)
- [x] **Constraint 명확도** (30%)
- [x] **Success 기준** (30%) — 템플릿 갱신 + 직전 판 stock 등록(드리프트·완전성 가드 통과), `npm test` fail 0
- [x] **Context 명확도** (brownfield 한정)
- [x] **Ambiguity ≤ 0.2** — 1.0

## Done evidence
```json
{ "version": 1, "tests": "required" }
```

## 참고
- 선례: task `capsule-cause` 커밋(스킬 갱신 + stock 등록 + fixture + 개수 가드).
- `tests/migrate-templates.test.mjs:46-60` 드리프트 가드, `:168-169` verify refresh 검사.

# template-refresh-policy — Spec

## 목적 / 요구사항

**문제.** `templates/` 아래 파일을 고쳐도 **이미 설치된 소비자 프로젝트에는 영영 도달하지 않는다.**
`copyStaticAssets()`(`src/harness.mjs:250-265`)가 네 표면을 전부 `skipExisting: true`로 복사하고,
`copyTree`(`src/fsx.mjs:32`)의 판정이 **파일 단위**라 이미 있는 파일은 건너뛴다.

샌드박스 소비자 프로젝트에서 실측한 비대칭(소스 독해가 아니라 실행 결과):

| 시나리오 | 결과 |
|---|---|
| 템플릿 **수정** → 기존 설치 | **도달 안 함** (`init` 재실행: `12 skipped as existing`) |
| 템플릿 **신규 파일** → 기존 설치 | **도달함** |

**영향.** 하네스가 스킬·규칙에 실은 개선이 기존 팀에 배달되지 않는다. 이 조사를 촉발한
`new-feature` Phase 3(Pocock 수직 슬라이스 규율, `186e436`)이 바로 그 상태다.

**기대 결과.** 스킬·규칙의 템플릿 수정이 **사용자 편집을 덮지 않으면서** 기존 설치에 도달한다.

**제약.**
- 사용자가 편집한 파일은 **바이트 그대로 보존**한다 — 조용한 덮어쓰기는 없다.
- 설치돼 있지 않은 파일을 **새로 깔지 않는다** (RN 전용 규칙이 비-RN 프로젝트로 새는 것을 막는다).
- 이미 드리프트가 쌓인 기존 설치를 **소급해서** 도울 수 있어야 한다.

## 설계 / 접근

**핵심 발견: 이 문제의 정책은 이미 이 레포가 정해 놨다.** `migrate.mjs:333-427`의
`refreshClaudeHooks`가 그것이다 — 설치본의 바이트가 **하네스가 실제로 배포한 적 있는 버전**
(sha256 테이블)과 일치할 때만 최신 템플릿으로 갱신하고, 아니면 "커스터마이즈"로 보고 절대 건드리지
않는다. 주석이 스스로를 "the explicit opt-in delivery path"라고 부른다.

따라서 이 task는 **정책 발명이 아니라 적용 범위 확장**이다. 현행 적용 범위는 16개 템플릿 파일 중
**6개(훅)** 뿐이다.

| 표면 | 파일 수 | 현행 | 이 task |
|---|---|---|---|
| `.claude/hooks` | 6 | refresh 있음 | 유지 |
| `.claude/skills` | 3 | **없음** | **추가** |
| `.claude/rules` | 4 | **없음** | **추가** |
| `docs/` seed | 3 | 없음 | **비목표(아래)** |

**기각한 대안**
- **`skipExisting: false`로 전환** — 사용자 편집을 말없이 덮는다. 기각.
- **마커 병합으로 승격**(`AGENTS.md` 방식) — `SKILL.md`는 에이전트가 읽는 산문이라 마커가
  에이전트 가시 텍스트를 오염시킨다. 실비용이 있어 기각.
- **설치 시점 매니페스트**(`.harness/installed.json`에 기록) — 확장성은 좋으나 **이미 드리프트한
  기존 설치에는 baseline이 없어 아무 도움이 안 된다.** 위 제약 3번이 이걸 배제한다. sha 테이블은
  소급 동작이 되기 때문에 그렇게 만들어진 것이다. 기각.

**비목표(명시).** `docs/` seed(`README.md`·`decisions.md`·`.gitkeep`)는 **refresh 대상이 아니다.**
설치 이후 팀이 저작하는 산출물이고(`decisions.md`는 팀 결정 로그), `copyStaticAssets`의 주석
`skip existing to preserve team work`가 이 보존을 의도된 설계로 명시한다. 재론 방지를 위해 기록한다.

**발견성.** refresh가 `migrate` 안에만 있으면 아무도 부르지 않는다 — 이 드리프트가 오래 눈에 띄지
않은 이유다. `doctor`에 stale-template 경고를 추가해 `migrate`를 가리킨다. `doctor`는 이미
drift 문법(`global CLI version drift`)과 stale hook → migrate 유도를 갖고 있어 새 문법이 아니다.

## Ontology

- **stock(재고본)**: 설치본의 바이트가 하네스가 **실제로 배포한 적 있는** 어떤 버전과 일치하는 상태.
  판정은 sha256 테이블 조회. stock이면 사용자가 손대지 않았다는 뜻이므로 갱신해도 잃을 편집이 없다.
- **customized(커스터마이즈)**: stock도 아니고 현재 템플릿도 아닌 상태. **절대 덮지 않는다.**
  경고만 출력하고 수동 검토로 넘긴다.
- **refresh**: 설치**돼 있는** 파일을 최신 템플릿으로 갱신하는 행위. **설치(install)와 구별된다** —
  없는 파일을 새로 만들지 않는다(`installed === null` → skip).
- **sha 테이블 값 = 파일 내용의 sha256**. 항목 주석의 `// 58c4fe2e`는 **git blob sha**(라벨)이지
  값이 아니다. `58c4fe2e`는 commit이 아니라 blob이며, `git cat-file blob <blob> | shasum -a 256`이
  테이블 값과 일치함을 2개 항목으로 확인했다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — 스킬·규칙 템플릿 수정이 사용자 편집 보존한 채 기존 설치에 도달한다.
- [x] **Constraint 명확도** (30%) — 편집 보존 / 미설치는 설치 안 함 / 소급 동작. 위 3개 명시.
- [x] **Success 기준** (30%) — 실측 재현(§목적 표)이 회귀 테스트로 고정되고, `npm test` PASS.
- [x] **Context 명확도** (brownfield) — `migrate.mjs`·`doctor.mjs`·`harness-init.md`·`decisions.md`.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

근거: 기존 `refreshClaudeHooks`가 정책·테스트·픽스처 계약을 모두 정의해 둬서 설계 자유도가 낮다.

## Done evidence
```json
{ "version": 1, "tests": "required" }
```

## 참고

- `src/commands/migrate.mjs:333-427` — `refreshClaudeHooks`(확장 대상 본체)
- `tests/migrate-hooks.test.mjs` — 테이블 드리프트 가드·보존·멱등·미설치 계약
- `tests/fixtures/stock-hooks/` — era 디렉터리 픽스처 구조
- `src/harness.mjs:250-265` — `copyStaticAssets`(문제의 기전)
- `src/fsx.mjs:18-38` — `copyTree`의 파일 단위 `skipExisting`
- `docs/chad/pocock-tdd-slicing/pocock-tdd-slicing-artifact.md` `## Reviews` — P2-3 발견 경위

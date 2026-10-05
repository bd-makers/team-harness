# commit-gate-lint — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: 템플릿 커밋 게이트 `templates/.claude/hooks/pre-commit-check.sh`는 `tsc --noEmit`(tsconfig.json 있을 때)과
  package.json `test`만 돌린다. lint는 사람이 `/verify`(`disable-model-invocation: true`)를 부를 때만 돌아,
  AI가 무시할 수 있는 규범에 머문다.
- **영향**: 하네스를 설치한 JS 소비자 프로젝트(deep-math·heliosent-profile 등)의 Claude Code 커밋.
- **기대 결과**: package.json에 `lint` 스크립트가 있으면 커밋 직전에 결정론적으로 실행한다.
  - 실제 위반(exit ≠ 0, ≠ 127) → `exit 2`로 차단, 기존 두 줄 형식(❌ + `→ 확인 명령`).
  - 실행 불가(exit 127, command not found — 린터 미설치·스크립트만 남은 경우) → ⚠ 경고 두 줄 후 통과.
  - lint 스크립트 없음 → 건너뜀. jq 유무와 무관하게 같은 판정(jq 없으면 node 폴백).
  - 순서: typecheck → lint → test (싼 검사 먼저).
- **의도된 비대칭**: test 게이트는 127이어도 **차단**한다(변경하지 않음). lint만 127을 경고로 강등한다 —
  사용자 결정 C안(2026-10-05). 근거: 착수 전 실측에서 deep-math의 `lint` 스크립트가 eslint 미설치로 exit 127
  (죽은 스크립트)이라, 차단 도입 시 stock 훅을 쓰는 소비자의 모든 커밋이 갑자기 막히는 회귀가 난다.
- **제약**: 특정 린터·규칙 세트를 내장하지 않는다(스택 중립). 훅 timeout(120s)과 `harness:jq-fallback` 공통 블록은
  건드리지 않는다. package.json 없는 프로젝트(ruff의 job-scraper)·AGENTS.md `lint:` 파싱·auto-format·린터 규칙은 범위 밖.

## 설계 / 접근

- `has_test_script`를 `has_script <name>`으로 일반화(jq `.scripts[$s]` / node `scripts[argv]`), test·lint 공용.
- lint 실행은 `"$PM" run lint` — npm·pnpm·yarn·bun 모두 `run <script>`가 package.json 스크립트를 탄다
  (bun은 `bun run lint`가 되어 요구사항과 일치). stderr는 test 게이트처럼 버린다.
- 종료 코드 분기: `0` 통과 · `127` ⚠ 경고 후 통과 · 그 외 ❌ `exit 2`.
- 배달: 훅 바이트가 바뀌므로 직전 판(blob `ed90db5b`)을 `KNOWN_STOCK_HOOK_SHA256`·`tests/fixtures/stock-hooks/pre-lint/`에
  추가한다 — stock 설치본은 migrate refresh로 갱신되고, 커스터마이즈본은 덮지 않는다(기존 계약 유지).

### PM별 127 전파 실측 (2026-10-05, 빈 프로젝트 + `"lint": "nonexistent-linter-xyz ."`)

| PM | 버전 | `<pm> run lint` exit |
|---|---|---|
| npm | 11.9.0 | 127 |
| pnpm | 12.4.1 | 127 |
| yarn classic | 1.22.22 (npx) | 127 |
| yarn berry | 4.5.0 (npx, `yarn install` 후) | 127 (`yarn lint`도 127) |
| bun | 1.3.9 | 127 |

**성립하지 않는 경우(차단으로 남는다)**:
- yarn berry에서 **install하지 않은** 프로젝트는 스크립트 실행 전 lockfile 오류로 **exit 1** → lint 위반과 구분 불가 → 차단.
- PM 바이너리 자체가 없으면(예: pnpm-lock.yaml인데 pnpm 미설치) bash가 127을 돌려 lint는 경고·통과하고, test 게이트가 같은 이유로 차단한다.
- lint 스크립트 체인 안의 다른 명령이 없어서 127이 나도 "실행 불가"로 보고 경고한다(구분 불가, 수용).

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **lint 위반**: `<pm> run lint`가 0도 127도 아닌 코드로 끝난 상태 — 커밋 차단 사유.
- **lint 실행 불가**: `<pm> run lint`가 127(command not found)로 끝난 상태 — 경고 사유, 차단하지 않는다.
- 게이트 통과 근거: Goal·Constraint·Success·Context 모두 명확(사용자 결정 C안 + PM 실측) → Ambiguity ≈ 0.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — package.json `lint`가 있으면 커밋 전에 돌려 위반은 막고 127은 경고한다.
- [x] **Constraint 명확도** (30%) — 스택 중립·timeout/jq 블록 불변·test 게이트 불변·범위 밖 4항목 명시.
- [x] **Success 기준** (30%) — 아래 Success 기준 + `npm run test`·`npm run docs:check` 통과.
- [x] **Context 명확도** (brownfield 한정) — 훅·migrate 테이블·fixture·hooks/migrate 테스트·overview 카드·hooks.mmd.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0

### Success 기준
- jq 있음/없음 각각: lint 위반 → exit 2 + `lint 실패` · lint 통과 → exit 0 · lint 없음 → lint 미실행 · lint 127 → exit 0 + ⚠ 경고.
- test 127은 여전히 exit 2(기존 테스트가 고정).
- 직전 stock 판 설치본이 migrate refresh로 lint 게이트를 받는다.

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- `templates/.claude/hooks/pre-commit-check.sh` — 게이트 본체
- `tests/hooks-jq-fallback.test.mjs` — pre-commit-check jq 매트릭스
- `tests/migrate-hooks.test.mjs`, `src/commands/migrate.mjs` `KNOWN_STOCK_HOOK_SHA256` — 배달 경로
- 소비자 실측(2026-10-05): deep-math `npm run lint` exit 127(`eslint: command not found`, 의존성·설정 없음) /
  heliosent-profile `bun run lint` exit 0

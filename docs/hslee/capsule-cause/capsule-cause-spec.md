# capsule-cause — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: TCC failure capsule(`### F-*`)에는 신호·시도·가설·다음 판별법·source만 있어, 실패가 코드 결함인지
  "환경이 준비 안 됨" 같은 다른 원인인지 기록할 자리가 없다. 실측: 2026-10-11 `heliosent-profile` 워크트리에
  `node_modules`가 없어 커밋 게이트 tsc가 실패했고, 코드 결함과 구분되지 않았다.
- **근거**: `docs/decisions.md` D12 "제공하는 것" 4번(실패 귀인 칸)과 끝의 "정정 — 역할 재정의" ③이 이 칸을 유지했다.
  범주는 강의 02의 실패 귀인 다섯 가지 — 불명확한 작업 의도·부족한 컨텍스트·재현 불가능한 환경·검증 피드백 부재·끊긴 상태 관리.
- **영향**: 새로 만드는 TCC(`task <name>` 생성·`context init`), capsule 작성을 안내하는 스킬(fix-bug·new-feature).
- **기대 결과**: capsule 템플릿에 원인 범주 한 줄이 **권장** 항목으로 생기고, 문서가 범주 값과 한국어 이름의 대응을 알려준다.
- **제약**: 권장일 뿐이다 — `context check`가 요구·실패시키지 않는다(D11: 강제는 PR task 문서뿐). 필드 없는 기존 TCC는 그대로 유효.
  TCC 한도(UTF-8 6 KiB·비공백 100행·미해결 capsule 3개) 계산이 깨지지 않는다. 병행 세션 `env-state-q5`의
  `src/commands/stack.mjs`·`src/detect-stack.mjs`·`src/presets.mjs`·`templates/presets/*.json`은 건드리지 않는다.

## 범위 (In / Out)
*`- **In**: …`에 이번 task가 바꾸는 것(파일·모듈·동작)을, `- **Out**: …`에 하지 않기로 한 것과 그 이유 한 줄을 쓴다 —
요청하지 않은 기능·관련 없는 리팩터링이 섞이지 않게 긋는 경계다.*

- **In**: `src/commands/task.mjs` `taskContextTemplate` — capsule stub에 `Cause` 줄 1개.
- **In**: `tests/fixtures/task-paths-golden/expected.txt` — 템플릿을 담은 3곳 갱신.
- **In**: `tests/context.test.mjs` — 빈 `Cause` stub은 capsule을 채우지 않고, 값이 있으면 채운다는 테스트.
- **In**: `templates/.claude/skills/fix-bug/SKILL.md`·`templates/.claude/skills/new-feature/SKILL.md` — capsule 기록 항목 나열에 원인 범주와
  한국어 대응(의도·컨텍스트·환경·검증·상태, 모르면 `unknown`) 추가.
- **In**: 위 두 스킬의 현재 판을 stock fixture era로 보존 + `src/commands/migrate.mjs` `KNOWN_STOCK_TEMPLATE_SHA256` 항목 2개,
  `tests/migrate-templates.test.mjs` 개수 20→22, `tests/fixtures/stock-templates/README.md` 표. 이게 없으면 기존 stock 설치본이
  migrate refresh 경로에서 "customized"로 오판돼 새 문구를 받지 못한다(D8).
- **In**: `CHANGELOG.md` `## [Unreleased]`.
- **Out**: `context check`의 필드 검사·경고 — D11·D12가 권장으로 정했다.
- **Out**: `AGENTS.md`·`templates/AGENTS.md.hbs` — 처음엔 TCC 절에 3줄을 넣었으나 eager 예산(AGENTS.md+CLAUDE.md 17500 B)을
  133~155 B 넘겨 `tests/agent-files.test.mjs`가 실패했다. 범주 값은 템플릿 라벨이 스스로 보여주고, 뜻은 capsule을 쓰는 스킬이 안내하므로
  상시 로드 예산을 쓰지 않는다.
- **Out**: 기존 TCC 파일 일괄 갱신 — 비-SSOT workpad이고 필드가 없어도 유효하다.
- **Out**: `docs/decisions.md` 본문 수정 — 결정은 이미 적혀 있다.
- **Out**: `env-state-q5` 소유 파일(위 제약).

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- `docs/decisions.md` D12 4번(실패 귀인 칸)·"정정 — 역할 재정의" ③.
- 강의 02(walkinglabs learn-harness-engineering) 실패 귀인 다섯 가지 — D12 인용으로만 참조.

### 발견
- (open) 범주를 모를 때의 값 — D12는 다섯 범주만 든다. → 결정: `unknown`을 허용한다. 귀인이 안 된 실패를 억지로 분류하면
  재평가 신호("귀인 칸 `환경` 반복")가 오염된다.
- (open) 라벨 언어 — D12는 한국어(의도·컨텍스트·환경·검증·상태), 기존 capsule 필드는 영어 라벨. → 결정: 영어 라벨·값을 쓰고
  fix-bug·new-feature 스킬이 한국어 이름과의 대응을 적는다(AGENTS.md는 eager 예산 때문에 제외 — 범위 Out).
- 검토 완료: 2026-11-03

## 설계 / 접근
- 템플릿 줄: `- Cause (intent | context | environment | verification | state | unknown):` — `Compact finding / current hypothesis:` 다음,
  `Next discriminator:` 앞(가설이 원인 범주를 낳는다).
- 값 목록을 **콜론 앞 라벨 안**에 둔다. `capsuleLineHasContent`는 첫 콜론 뒤만 내용으로 보므로 빈 stub은 내용이 아니고,
  템플릿 그대로의 capsule은 종전처럼 미해결로 세지 않는다. 값 목록을 콜론 뒤에 두면 stub이 "채워진 capsule"이 되어
  `unresolved-failure-capsules`가 0→1로 바뀐다 — 기각.
- check 로직은 바꾸지 않는다. 필드 이름을 읽지 않으므로 기존 TCC(필드 없음)는 그대로 유효하다.
- 한도 영향: 새 TCC는 비공백 1행·약 70바이트 늘어난다(템플릿 기준 한도의 극히 일부).
- **소비자 도달 경로**: (1) 템플릿 줄은 CLI 코드라 플러그인 갱신 후 **새로 만드는** TCC에만 들어간다. (2) 스킬 두 개는
  `migrate`의 템플릿 refresh가 설치본 sha가 알려진 stock 판일 때만 갱신한다(손으로 고친 설치본은 "looks customized" 경고).
  관리 절은 바꾸지 않으므로 `init` 재렌더 diff는 없다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **원인 범주(Cause)**: failure capsule이 기록하는 실패 귀인 — `intent`(불명확한 작업 의도)·`context`(부족한 컨텍스트)·
  `environment`(재현 불가능한 환경)·`verification`(검증 피드백 부재)·`state`(끊긴 상태 관리)·`unknown`(아직 모름). 권장 항목이다.
- **빈 stub**: 콜론 뒤가 비어 있는 capsule 줄. 미해결 capsule 판정에서 내용으로 세지 않는다.
- 게이트 통과 근거: 목표·제약·완료 기준·영향 파일이 위에 모두 명시됨(가중합 1.0).

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "optional" ("required"면 소스가 바뀔 때 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- `src/commands/context.mjs` `capsuleLineHasContent`·`countUnresolvedCapsules` — 빈 stub 판정 근거.
- `tests/fixtures/stock-templates/README.md` — 스킬 갱신 시 era 추가 절차.
- 완료 기준: `npm test` fail 0, `npm run docs:check` 최신, codex 리뷰 기록.

# preset-gates — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

**문제** (interview · cycle §4-2·§4-6): 커밋 게이트와 포맷이 언어 지식을 **훅 코드에** 들고 있다.
`pre-commit-check.sh`는 lockfile로 PM을 추론하고 tsc·test를 분기하며(node 전용, `bun.lock` 미인식),
`auto-format.sh`는 `*.ts|*.tsx|*.js|*.jsx|*.json → npx prettier`를 하드코딩했다. 그래서 Python·Go 소비자는
게이트가 없고(job-scraper는 ruff인데 package.json이 없어 통과), lint를 넣으려던 #119는 PM 5종 실측·exit 127
비대칭·yarn berry 예외로 두꺼워져 닫혔다. 이는 D11 "언어별 로직을 코드에 두지 않는다"에 어긋난다.
영향: 하네스를 설치한 모든 소비자 프로젝트(Claude로 커밋하는 팀원), 그리고 언어 추가 비용을 내는 메인테이너.

**기대 결과**: 언어·도구 지식은 **프리셋 데이터**에만 있고, 훅은 팀이 커밋하는 `.harness/gates.json`에 확정된 **명령 목록**만
실행한다. 언어 추가 = 프리셋 JSON 하나, 코드 변경 0.

**범위 결정** (interview 2026-10-05): cycle §6-3을 **둘로 나눈다**. 이 task는 아래 R1–R8.
저장소 모양 판별·모노레포(turbo·nx 위임, 경로별 목록)·RN rules 프리셋은 다음 task로 넘긴다 — 이 task가 그 기준이 된다.

### 요구사항
- **R1 프리셋 = 데이터** (interview · cycle §4-2) — 플러그인이 프리셋 JSON을 배포한다. 각 프리셋은 감지 조건과
  `gates.commit`(명령 목록)·`format`(선택) 기본값을 담는다. 첫 버전 프리셋: `node`(TS 포함), `python`, `generic`(빈 목록).
- **R2 init이 제안, 개발자가 확정** (interview · cycle §4-2) — init이 스택 감지 결과로 프리셋을 고르고 명령을 구체화해
  (감지된 PM·존재하는 스크립트·tsconfig 기준) 보여 주고, 확정된 값을 `.harness/gates.json`의 `commit`·`format`·`fingerprint`에 쓴다(팀 공유 파일 — 리뷰 C1 반영).
  `--yes`면 제안을 그대로 쓴다. **추론은 제안 시점 1회뿐이고, 실행 시점에는 없다.**
- **R3 실행기 CLI** (interview: "실행기 CLI + PreToolUse 유지") — `harness-team gate commit`(가칭)이 `gates.commit`을
  순서대로 실행하고 첫 실패에서 차단(exit 2)한다. 명령 exit 127은 "설정 오류: 명령을 찾을 수 없음"으로 차단한다.
  `gates`가 없으면 통과 + "게이트 미설정" 한 줄 안내.
- **R4 커밋 훅은 래퍼** (cycle §4-2) — `pre-commit-check.sh`는 `git commit` 감지(기존 GIT/END 정규식·jq-fallback 블록 유지)
  후 R3를 호출만 한다. PM 추론·tsc/test 분기를 삭제한다. 호출 위치는 지금처럼 Claude PreToolUse다.
  CLI를 찾지 못하면 "harness-team CLI 없음 — 커밋 게이트를 건너뜀"을 hook `systemMessage`(stdout JSON — exit 0 훅의 stderr는
  보이지 않는다)로 내고 통과한다. CLI가 **있는데** 0·2 외로 끝나면(gate를 모르는 구버전 CLI·크래시) 차단한다 — 리뷰 I1·I2 반영(interview 2026-10-05:
  경고 후 통과 — 조용한 통과는 게이트가 꺼진 걸 아무도 모르고, 차단은 CLI 미설치 팀원의 커밋을 막는다).
- **R5 format 흡수** (cycle §4-6) — `auto-format.sh`의 확장자 분기·prettier 하드코딩을 지우고 `gates.json`의 `format` 항목만 실행한다.
  스키마는 **glob → 명령 목록**이다(interview 2026-10-05). 예: `{"*.{ts,tsx,js,jsx,json}": ["npx prettier --write"]}`.
  편집된 파일이 glob에 맞으면 각 명령 끝에 그 파일 경로를 인수 하나로 붙여 실행한다(치환 토큰 없음, 공백 경로 안전).
  `format`이 없으면 아무것도 하지 않는다(편의 기능, 지금처럼 실패는 무시).
  매칭·실행은 `harness-team gate format <file>`이 한다(plan 2026-10-05: glob 매칭을 bash가 아닌 테스트 가능한 JS에 둔다).
  format은 편의 기능이라 CLI가 없으면 경고 없이 넘어간다(R4의 경고는 커밋 게이트 한정).
- **R6 지문 감지 → 제안** (cycle §4-2b · D8) — init이 확정 시점의 감지 지문(스크립트 이름 목록·tsconfig 유무·lockfile 종류)을
  저장하고, **doctor**가 현재 값과 비교해 달라지면 "lint 스크립트가 추가됐습니다. gates를 갱신하려면 …" 식으로 제안만 한다.
  `gates.json`을 자동으로 고치지 않는다.
- **R7 기존 설치 이행** (interview: "migrate가 프리셋 제안·확인") — migrate의 stock 훅 refresh가 새 래퍼를 배달할 때
  `.harness/gates.json`이 없으면 R2와 같은 제안을 보여 주고 확인받아 기록한다. `--yes`(사람이 제안을 보지 않는 경로)는 프리셋이
  `"confirm": true`로 표시한 항목(예전 훅에 없던 명령: node lint, python ruff·pytest·ruff format)을 빼고 기록해 현재의 typecheck·test
  동작만 유지하며, 뺀 항목은 "추가 제안"으로 출력한다(init `--yes`도 같다 — 리뷰 I4 반영, 2026-10-05 메인테이너 결정).
  커스터마이즈된 훅은 지금처럼 덮지 않는다(D8). 직전 판 sha를 `KNOWN_STOCK_HOOK_SHA256`에 추가하고 fixture를 둔다.
- **R8 node 프리셋 = 현재 동작 + #119** (cycle §4-2) — node 제안은 오늘 훅이 돌리는 것과 같다: tsconfig가 있으면 tsc,
  `test` 스크립트가 있으면 test. 여기에 `lint` 스크립트가 있으면 lint를 더한다(닫은 #119의 동작).
  node의 format 제안은 `prettier`가 의존성에 있을 때만 낸다 — 오늘 훅의 무조건 `npx prettier`는 미설치 프로젝트에서 매 편집마다
  레지스트리 조회를 시도한다(plan 2026-10-05).
- **R9 제안 재적용 명령** (interview 2026-10-05) — `harness-team gate suggest`(가칭)가 현재 감지로 제안을 보여 주고,
  확인하면 `gates.commit`·`format`·`fingerprint`를 함께 기록한다. init(R2)·migrate(R7)·doctor 처방(R6)이 같은 제안 함수를 쓴다.
  세밀한 수정은 `.harness/gates.json` 직접 편집이다. `config set`의 문자열 전용 계약은 바꾸지 않는다.

### 제약
- D8: 커스터마이즈는 덮지 않는다 — 훅·`gates.json` 모두(`gate suggest` 확인 후만 예외). D11: 훅·CLI 코드에 언어 분기 금지(프리셋 매칭 로직은 데이터 해석이지 분기가 아니다).
- 훅 4개 공통 `harness:jq-fallback` 블록은 동일하게 유지(`tests/hooks-jq-fallback.test.mjs`).
- 런타임은 Node·JavaScript(타입 없음). 새 의존성 없음.
- 이 저장소는 자기 훅을 dogfood하지 않는다(D7) — 검증은 테스트·임시 디렉터리·소비자 dry 감지로 한다.
- 소비자 프로젝트에 migrate·init을 실행하지 않는다(메모리 migrate-is-pull). 실측은 읽기 전용 감지만.

### 범위 밖
- 저장소 모양 판별·모노레포·RN rules 프리셋 → 다음 task. git pre-commit/pre-push 연결 → 4번(`pr-check`) task.
- Cargo·Gradle·Swift 프리셋, Cucumber 러너 프리셋(§4-1b) — 프리셋 구조만 열어 두고 이번엔 만들지 않는다.

## 설계 / 접근
1. **데이터**: `templates/presets/<id>.json`. 플러그인 안에 두고 소비자에게 복사하지 않는다 — 소비자에게 남는 것은
   확정된 명령뿐이다(`gates.json`). 프리셋은 "어떤 조건이면 어떤 명령을 제안하는가"만 담는다.
   위치 근거: `package.json` `files`에 `templates`가 있어 배포되고, init은 `templates/` 중 `.claude/hooks`·`rules`·`skills`·`docs`만
   복사하므로(`src/harness.mjs:282-292`) `presets/`는 소비자에게 가지 않는다.
2. **제안 생성**: `detectStack`의 기존 감지(PM·language·scripts)를 입력으로 프리셋을 고르고 명령 문자열을 만든다.
   PM별 실행 형태(npx/pnpm exec/bunx)는 프리셋 데이터의 템플릿 변수로 표현한다 — 코드 분기가 아니다.
3. **실행**: `gate commit`은 `gates.json`만 읽는다. 훅은 `HARNESS_TEAM_BIN` → `harness-team` 순으로 CLI를 찾는다(boundary-checkpoint.sh와 같은 규칙).
   다만 못 찾았을 때는 boundary 훅과 달리 조용히 넘기지 않고 경고 한 줄을 낸다(R4).
4. **이행**: migrate `refreshClaudeHooks`의 stock 판정은 그대로, refresh 직후 `gates` 부재 시 제안 단계 추가.
5. **2차 장치 규칙 (D11)**: 지문(R6)은 확정된 gates를 지키는 새 장치다. 원래 장치를 줄이는 안 —
   "지문 없이 doctor가 매번 현재 감지로 제안을 다시 만들어 gates.json과 비교" — 을 검토했고 기각했다:
   개발자가 일부러 뺀 명령(예: 느린 test)을 doctor가 영원히 다시 제안한다. 지문은 "확정 이후 원천이 바뀌었을 때"만 알린다.
6. 기각: 실행 시점 PM·스크립트 추론(#119 방식, 두께의 원인) · 자동 갱신(D8 위반) · 지금 git pre-commit 이전(husky·core.hooksPath
   충돌 처리를 4번 pre-push와 한 번에 설계) · gates 없을 때 레거시 추론 폴백(D11 위반).

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **프리셋(preset)**: 플러그인이 배포하는 JSON 데이터. 감지 조건 → 제안할 `gates.commit`·`format`. 소비자에게 복사되지 않는다.
- **제안(proposal)**: 프리셋 + 현재 감지 결과로 만든 구체 명령 목록. init·migrate·doctor가 보여 주며, 확정 전엔 gates.json에 없다.
- **게이트(`gates.json`의 commit)**: 팀이 커밋하는 `.harness/gates.json`에 확정된 커밋 전 명령 목록. 사용자별로 gitignore되는
  `.harness/config.json`(user 등 개인 설정)과 분리한다 — 개인 파일에 두면 확정한 한 사람 외의 팀원은 게이트가 꺼진다(리뷰 C1). 하네스가 "제공"하는 것이지 강제가 아니다(D11).
- **format 항목**: `gates.json`에 확정된 파일 편집 후 포맷 명령. 선택이며 실패해도 막지 않는다.
- **지문(fingerprint)**: 제안을 확정한 시점의 `{preset, pm, signals}` — signals는 프리셋 조건 중 **참이 된 것들**의 정렬 목록.
  제안을 바꿀 수 있는 변화(예: `lint` 스크립트 추가·lockfile 교체)만 잡고 무관한 변화(예: `build` 추가)는 무시한다. 명령이 아니다.
- **미설정 vs 설정 오류**: `gates.json` 파일이 없을 때만 미설정(통과 + 화면에 보이는 hook `systemMessage`). 파일이 있는데 깨졌거나
  `commit`이 비어 있지 않은 문자열 배열이 아니면 설정 오류(차단), 확정된 명령이 exit 127이어도 설정 오류(차단) — 리뷰 I1·I3 반영.
- **실행기(gate runner)**: `gates.json`을 읽어 목록을 실행하는 CLI 하위 명령. 훅은 이것을 부르는 래퍼다.
- **Ambiguity 게이트 통과 (2026-10-05, `/harness-interview`)**: 선행 채점 5차원 pass(문장 인용 근거), open 4건 중 3건은 인터뷰로·1건은 코드 근거로 닫고 나머지 2건은 대상 task로 이월.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*
*(writer 자기 평가 — 게이트 판정은 `/harness-interview` 몫)*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — 근거: "언어 지식은 프리셋 데이터에만, 훅은 gates.json 명령 목록만 실행", 문제·영향 명시.
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — 근거: D7·D8·D11·jq 블록·범위 분할·범위 밖 목록. 세부 계약 open 4건은 인터뷰로 닫음.
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — 근거: 아래 "완료 기준" 7항.
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — 근거: 참고 절 "영향 파일".
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 — 근거: validator 채점 5차원 pass → 가중합 1.0 (Ontology 절 통과 기록).

### 완료 기준
1. 훅 2개에 PM·언어 분기가 없다: `pre-commit-check.sh`·`auto-format.sh`에 `pnpm|yarn|bunx|npx|prettier|tsc` 문자열 0건.
2. `gate commit`: 통과 / 첫 실패 차단(exit 2) / exit 127 설정 오류 차단 / gates 미설정 통과+안내 — 각각 테스트.
   래퍼 훅: CLI 부재 시 경고 한 줄 + exit 0, format은 glob 일치 파일에만 경로 인수를 붙여 실행 — 각각 테스트.
3. init: node(TS·lint 유무)·python·generic 감지에서 제안이 기대값과 같고 `gates.json`에 `commit`·`format`·`fingerprint`가 기록된다(`--yes`면 confirm 항목 제외).
4. migrate: stock 구판 훅 → 새 래퍼로 refresh + `--yes`에서 gates 기록, 커스터마이즈 훅은 무변경 — 테스트.
5. doctor: 지문과 현재가 다르면 `gate suggest` 처방 출력, 같으면 조용 — 테스트. `gate suggest` 확인 시 세 키가 함께 기록 — 테스트.
6. `npm run test`·`npm run docs:check` PASS, 소비자 3곳(deep-math·heliosent-profile·job-scraper)에 읽기 전용 제안 생성 결과를 artifact에 기록.

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

- 소스: `docs/harness-cycle.md` §4-2·§4-2b·§4-6·§6, `docs/decisions.md` D8·D11, 닫은 PR #119(lint 게이트), 인계 `.claude/handoffs/2026-10-05-2022-preset-gates.md`.
- 영향 파일: `templates/.claude/hooks/pre-commit-check.sh`·`auto-format.sh` · `src/detect-stack.mjs` · `src/harness.mjs`·`src/commands/init.mjs`(제안·기록)
  · 신규 `src/commands/gate.mjs` + `src/cli-args.mjs` 등록 · `src/commands/migrate.mjs`(`KNOWN_STOCK_HOOK_SHA256`·refresh 후 제안) + `tests/fixtures/stock-hooks/`
  · `src/commands/doctor.mjs`(지문 비교) · `src/presets.mjs`(`readGates`·`applyProposal`) · `templates/.claude/settings.json`(훅 배선 — 변경 없을 가능성)
  · 테스트: `hooks-jq-fallback`·`migrate-hooks`·`detect-stack`·`doctor`·`harness-settings` + 신규 gate 테스트.
- 닫힌 질문 (2026-10-05): CLI 부재 → 경고 후 통과(R4) · format 스키마 → glob → 명령 목록(R5) · 배열 편집 → `gate suggest`(R9) · 프리셋 위치 → `templates/presets/`(설계 1, 코드 근거).
- (open → 다음 task `preset-repo-shape`, 가칭) 저장소 모양 판별·모노레포·RN rules 프리셋.
- (open → 4번 `pr-check` task) git pre-commit 훅 연결 여부(pre-push 설치 경로와 함께).

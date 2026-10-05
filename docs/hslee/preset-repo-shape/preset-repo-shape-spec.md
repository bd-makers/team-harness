# preset-repo-shape — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

**문제** (cycle §4-2b · preset-gates 이월): `src/detect-stack.mjs`는 루트 `package.json` 하나만 보고 스택 ID 하나를 고른다.
workspace·turbo·nx를 모른다. 그래서 모노레포에서는 ① 커밋 게이트 제안이 루트 스크립트만 보고 만들어져 앱·패키지의 lint·test가
빠지거나(루트에 스크립트가 없으면 게이트가 빈다), 반대로 전부를 매 커밋 돌린다. ② RN rules 4종은 `copyStaticAssets`가
유효 stack으로 **고정 배포**한다(`src/harness.mjs:265-290`). 루트가 RN이 아닌 모노레포의 RN 앱은 rules를 못 받고, 받더라도
`paths:`가 `app/**`·`src/**`라 같은 저장소의 웹 앱에 섞인다. 이 고정 배포는 D11("언어·도구 지식은 프리셋 데이터로")에도 어긋난다.
영향: workspace를 쓰는 소비자 프로젝트(이 머신에는 아직 없음 — 픽스처로 실측), RN 앱을 가진 모노레포 팀.

**기대 결과**: init이 저장소 **모양**을 판별해 보여 주고 확인받는다. 커밋 게이트는 turbo·nx가 있으면 그 도구에 위임하고,
없으면 workspace별 목록을 바뀐 경로 기준으로 실행한다. RN rules는 RN 앱이 감지될 때 그 앱 경로로 스코프한 **rules 프리셋**으로
제안된다. 단일 앱 저장소의 결과(제안·`gates.json`·rules 파일)는 지금과 바이트 단위로 같다.

**범위 결정** (handoff 2026-10-05 · cycle §6-3): `preset-gates`(PR #123)가 기준이다. 그 task의 결정(gates.json 팀 파일, 조건 4종 any-of,
`confirm` 항목, 지문 `{preset, pm, signals}`, 감지 → 제안 → 확인)을 그대로 이어받는다.

### 요구사항
- **R1 모양 판별** (cycle §4-2b) — init이 저장소 모양을 셋 중 하나로 판별한다: **단일 앱**(workspace 없음) /
  **앱 + 내부 패키지**(workspace 있음, 앱 ≤ 1) / **모노레포**(workspace 있음, 앱 ≥ 2).
  workspace 원천: 루트 `package.json`의 `workspaces`(배열 또는 `{packages}`)·`pnpm-workspace.yaml`의 `packages`. 각 패턴을 펼쳐
  `package.json`이 있는 디렉터리만 workspace로 센다. turbo·nx는 workspace 원천이 아니라 위임 신호다(R3).
- **R2 앱 구분은 데이터** (cycle §4-2b · D11) — 앱 신호(dev·start 스크립트, next·expo·react-native 같은 프레임워크 의존성)는 프리셋 JSON의
  조건으로 둔다. 앱 조건이 거짓이면 패키지다 — 그래서 패키지 신호(`main`·`exports`)는 판정에 쓰이지 않아 데이터로 두지 않는다(plan Ontology 로그 2026-10-06).
  코드에는 조건 해석만 있다(preset-gates `holds`와 같은 방식).
- **R3 판별 결과 확인** (cycle §4-2b · gate interview 2026-10-06 G1) — **workspace가 감지됐을 때만** init이 모양과 workspace 목록(앱/패키지 표시)을
  보여 주고 확인받는다. workspace가 없으면 묻지 않는다(확인할 목록이 없다 — 단일 앱 init 출력 바이트 동일 유지). 거절하면 **단일 앱**으로
  진행한다(오늘 동작). `--yes`면 판별을 그대로 받는다. Node 밖(Cargo·Gradle·Swift)은 판별하지 않고 단일로 둔다 — 경로별 게이트가
  필요하면 `gates.json` 객체 형식을 직접 편집한다(이것이 cycle의 "수동 지정").
- **R4 게이트 생성 규칙은 둘** (interview 2026-10-06 Q3) — **단일 앱**: 오늘과 같은 배열 제안. **workspace 있음**(앱 + 내부 패키지와
  모노레포 공통): turbo·nx가 있으면 그 도구의 영향 범위 명령 하나를 담은 배열(R5), 없으면 workspace별 목록 객체(R6).
  모양 구분은 표시·rules 스코프·이후 위키 area에만 쓴다.
- **R5 turbo·nx 위임** (cycle §4-2b) — `turbo.json`이 있으면 turbo, `nx.json`이 있으면 nx의 "HEAD 대비 바뀐 프로젝트만" 실행 명령을
  제안한다(예: `turbo run lint typecheck test --filter=...[HEAD]`). 어떤 태스크 이름을 넣을지는 그 도구 설정에 정의된 것만이다.
  명령 형태는 프리셋 데이터다. 영향 범위 계산을 하네스가 구현하지 않는다.
- **R6 경로별 목록** (interview 2026-10-06 Q2) — `gates.json`의 `commit`은 **배열 또는 객체**다. 배열은 지금처럼 항상 실행(호환).
  객체는 `{"<디렉터리 glob>": [명령…]}`이며, 바뀐 파일이 그 디렉터리 아래에 있는 키의 목록만 실행한다. 특수 키 `"."`는 **다른 어느 키에도
  걸리지 않은 변경이 하나라도 있을 때** 실행한다(루트 lockfile·`tsconfig.base.json` 등). init은 **루트 `package.json`이 앱 조건을 만족할 때만** `"."`에
  루트 앱 목록을 제안한다(gate interview G3 — 루트 앱 파일은 정의상 다른 키에 안 걸리는 변경이다). 그 밖에는 `"."`를 제안하지 않는다 — 팀이 필요하면 추가한다.
  제안되는 명령은 workspace 안에서 도는 형태다(예: `cd apps/mobile && npm run lint`) — PM별 workspace 플래그를 쓰지 않는다.
- **R7 변경 기준 = HEAD 대비** (interview 2026-10-06 Q1) — "바뀐 파일"은 HEAD 대비 스테이징 + 작업 트리 변경 + untracked다.
  PreToolUse 시점에 `git add && git commit` 체인이 아직 스테이징 전이어도 빈 집합이 되지 않게 하기 위해서다. 커밋에 안 들어가는 변경까지
  검사해 더 많이 도는 쪽으로 틀린다. HEAD가 없으면(첫 커밋) 모든 키를 실행한다. turbo·nx 위임 명령도 같은 기준을 쓴다(R5).
- **R8 지문 확장** (cycle §4-2b · D8 · gate interview G2) — workspace가 **감지됐을 때만** 지문에 **확정 shape**(거절했으면 `single`)를 남기고,
  확정 shape가 workspace 모양이면 `workspaces`(정렬된 디렉터리 집합)와 workspace 접두 signals를 더한다. doctor는 **확정 shape 기준**으로 비교한다:
  확정이 `single`이면 workspace 변화는 drift가 아니다. workspace 디렉터리 집합이 바뀌면 drift(`gate suggest` 처방), 앱 수만 바뀌어 모양 이름이
  달라지는 것(`app-packages`↔`monorepo`)은 drift가 아니다. **workspace가 없는 단일 앱의 지문은 형태가 그대로다** — 기존 `gates.json`에 새 drift가 뜨지 않는다.
- **R9 RN rules 프리셋** (cycle §4-2·§4-2b · interview 2026-10-06 Q4) — RN rules 4종을 고정 배포에서 **rules 프리셋**으로 옮긴다.
  대상은 **앱인 workspace(루트 앱 포함)** 중 RN 조건(데이터: `expo`·`react-native` 의존성)이 참인 것만이다(gate interview G4 — 4종은 앱 구조를 전제한다).
  init이 그런 앱을 찾으면 앱마다 4종을 제안하고, `paths:` 각 항목 앞에 그 앱 경로를 붙인다
  (`apps/mobile/app/**/*.tsx`). 단일 RN 앱(과 루트 RN 앱)은 접두가 비어 **오늘과 같은 파일**이 되고, 단일 RN 앱은 오늘처럼 **묻지 않고** 설치한다(G1). workspace가 있으면 R3 확인과 함께
  제안한다. `--yes`면 설치한다(rules는 커밋을 막지 않으므로
  게이트의 `confirm` 정책을 적용하지 않는다). 이미 있는 파일은 덮지 않는다(D8). 같은 이름 4종을 여러 RN 앱에 둘 때의 파일 이름 규칙은
  plan에서 정한다(→ 참고 open).
- **R10 기존 설치본** (interview 2026-10-06 Q4 · D8 · migrate-is-pull) — 이미 설치된 rules 4종은 그대로 둔다. migrate는 rules 프리셋을
  새로 제안하지 않는다. 원래 경로(`.claude/rules/<4종>.md`) 사본의 stock refresh·doctor stale 검사는 그대로 유지한다(원천 파일을 옮기지 않는다 — 설계 4).
- **R11 고정 게이트 제거** (cycle §4-2) — `copyStaticAssets`의 RN rules 게이트(`RN_ONLY_RULE_FILES`·`excludesRnRules`)를 지운다.
  단일 앱의 RN rules 판정은 오늘과 같은 **유효 stack id**(명시 `--stack` > 감지)다 — `--stack react-native|expo`는 켜고, Expo 프로젝트에 `--stack node`는
  끈다(G1 바이트 동일의 귀결, `tests/stack-conditional-rules.test.mjs:41`). workspace가 있을 때는 workspace별 RN 조건이 판정한다.

### 제약
- D8: 커스터마이즈는 덮지 않는다 — `gates.json`·rules 모두. D11: 훅·CLI에 언어 분기 금지 — 프레임워크·도구 이름은 프리셋 JSON에만.
- workspace가 없는 단일 앱 저장소의 init·migrate·`gate suggest`·doctor **출력과 기록**은 바이트 단위로 바뀌지 않는다(회귀 기준 — 새 프롬프트 없음, G1).
  여기에는 init의 `✓ Copied N asset(s)` 집계(`src/commands/init.mjs:91`)와 비-RN 단일 앱에서도 빈 `.claude/rules` 디렉터리가 생기는 것까지 포함한다 —
  rules 프리셋 설치 결과는 그 집계에 들어간다.
  예외: 내부 직접 호출(`ctx.stackId` 없는 `copyStaticAssets`)이 RN rules를 "전부 복사"하던 동작은 R11로 사라진다 — 사용자 경로가 아니다.
- 새 의존성 없음 — `pnpm-workspace.yaml`은 `packages:` 목록만 읽는 최소 파서로 다룬다. 런타임 Node·JavaScript.
- 훅 4개 공통 `harness:jq-fallback` 블록 동일 유지. 템플릿 훅을 바꾸면 sha 완결성 테스트 때문에 한 커밋에 모은다(preset-gates Learnings).
- 이 저장소는 자기 훅을 dogfood하지 않는다(D7). 검증은 테스트·임시 디렉터리 픽스처(npm workspaces·pnpm workspace·turbo·nx)로 한다.
- 소비자 프로젝트에 migrate·init을 실행하지 않는다(migrate-is-pull).

### 범위 밖
- Node 밖 멀티 프로젝트 판별(Cargo workspace·Gradle·Swift 멀티 패키지) — 첫 버전은 단일 + 수동 편집.
- git pre-commit/pre-push 연결 → 4번 `pr-check` task. 위키 area(§4-4) → 7번. migrate의 rules 프리셋 제안(R10).
- `settings-permissions.mjs`의 RN 전용 permissions(`RN_STACK_IDS`)도 코드 속 스택 지식이지만 이번에 옮기지 않는다(→ 참고 open).

## 설계 / 접근
1. **판별**: `src/repo-shape.mjs`(가칭)가 workspace 원천을 읽어 디렉터리 목록을 만들고, 각 workspace의 `package.json`에 프리셋의
   앱·패키지 조건을 평가한다. 결과 `{shape, workspaces:[{dir, kind}], tool: 'turbo'|'nx'|null}`. `detectStack`은 바꾸지 않는다 — 루트 스택 ID는
   여전히 프리셋 선택 입력이다.
2. **제안**: `buildProposal`이 shape를 받아 단일이면 지금 그대로, workspace가 있으면 tool 유무로 R5 배열 또는 R6 객체를 만든다. R6은 workspace마다
   기존 조건 평가(`holds`)를 그 디렉터리 기준으로 돌리고 명령 앞에 `cd <dir> && `를 붙인다. init·migrate·`gate suggest`·doctor가 같은 함수를 쓴다.
3. **실행**: `gate commit`이 `commit` 형태로 분기한다(배열 = 지금, 객체 = 바뀐 파일 계산 후 매칭). 바뀐 파일은 `git diff --name-only HEAD` +
   `git ls-files --others --exclude-standard`. 형태 검증은 "배열(비어 있지 않은 문자열) 또는 객체(값이 그런 배열)"로 넓히고, 그 밖은 설정 오류(차단) 그대로.
4. **rules 프리셋**: RN 4종 파일은 `templates/.claude/rules/`에 **그대로 둔다**. 프리셋 JSON(감지 조건 + 그 파일 목록)이 그것들을 가리키고,
   `copyStaticAssets`의 rules 일괄 복사 단계는 지운다(그 디렉터리에는 RN 4종뿐이다). 설치 시 frontmatter `paths:` 항목에만 앱 경로 접두를 붙인다.
   원천 경로가 그대로라 migrate refresh·doctor stale·완전성 테스트(`templates/<rel>` git 이력)·overview 분류는 바뀌지 않는다.
   기각: 프리셋 디렉터리로 이동 — 완전성 테스트의 이력 단절, 빈 디렉터리 ENOENT, 원천 매핑 추가가 생기고 얻는 것이 위치 미관뿐이다(검증자 Context 지적, 2026-10-06).
5. **2차 장치 규칙 (D11)**: 새 장치는 모양 판별·객체 스키마·rules 프리셋이다.
   - rules 프리셋은 원래 장치(고정 게이트)를 **지우고** 대체한다 — 줄이는 방향이라 규칙을 충족한다.
   - 객체 스키마 대신 "workspace가 있으면 turbo·nx를 요구하고 없으면 단일처럼 루트 배열"로 줄이는 안을 검토했고 기각했다: 도구 없는 workspace 저장소는
     루트 스크립트가 비는 경우가 흔해 게이트가 빈다(문제 ①). cycle §4-2b도 두 갈래를 정했다.
   - 모양을 셋으로 나눠 각자 규칙을 두는 안은 기각(interview Q3) — 게이트 규칙은 둘이고, 셋째 구분은 표시용이다.
6. 기각: 스테이징만 기준(interview Q1 — 체인 커밋에서 빈 집합) · 안 걸린 변경에 전부 실행(Q2 — 루트 README 한 줄에도 전 workspace) ·
   `--yes`에서 RN rules 보류(Q4 — RN 단일 앱의 `--yes` 설치가 오늘보다 줄어드는 동작 변화) · migrate의 rules 제안(Q4 — pull 원칙, 범위 확대) ·
   PM별 workspace 플래그(`-w`·`--filter`·`yarn workspace`) — PM마다 문법이 달라 데이터가 늘고 yarn은 디렉터리가 아니라 이름을 요구한다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **저장소 모양(shape)**: `single` · `app-packages`(앱 0~1) · `monorepo`(앱 ≥ 2). 판별은 휴리스틱이라 workspace가 있을 때 사람 확인을 거친다.
  **감지 shape**(지금 디스크)와 **확정 shape**(확인을 거쳐 `gates.json` 지문에 남은 값)는 다르다 — doctor는 확정 shape로 비교한다. 게이트 생성은 single / workspace 있음 두 갈래만 다르다.
- **workspace**: workspace 원천 패턴에 맞고 `package.json`이 있는 디렉터리. `kind`는 앱 조건이 참이면 앱(패키지 조건과 둘 다 참이어도 앱), 아니면 패키지.
  **workspace 원천(`workspaces`·`pnpm-workspace.yaml`)이 감지된 저장소에서만**, 루트 `package.json`이 앱 조건을 만족하면 루트도 앱 workspace `"."`로 센다(G3) — 모양의 앱 수와 R8 `workspaces` 집합에 들어간다(루트 앱 + `apps/web` = `monorepo`).
- **앱(app)**: 프리셋의 앱 조건이 참인 workspace. 모양의 앱 수와 RN rules 대상 판정에 쓴다.
- **위임 도구(tool)**: turbo·nx. 영향 범위 계산을 맡기는 대상. 있으면 게이트는 그 도구 명령 하나다.
- **경로별 목록**: `commit` 객체 형식. 키 = 디렉터리 glob(그 아래 변경이면 실행), `"."` = 어느 키에도 안 걸린 변경이 있으면 실행.
- **바뀐 파일**: HEAD 대비 스테이징·작업 트리·untracked의 합집합. HEAD가 없으면 "전부".
- **rules 프리셋**: 감지 조건 + rules 파일 묶음. 설치할 때 `paths:`에 앱 경로 접두를 붙인다. 프리셋 자체는 소비자에게 복사되지 않고 설치된 rules만 남는다.
- **Ambiguity 게이트 통과 (2026-10-06, `/harness-interview`)**: 별도 컨텍스트 read-only 검증자의 선행 채점 3회전 끝에 5차원 pass(문장 인용 근거).
  사용자 결정 G1–G4(단일 앱 무프롬프트·확정 shape 기준 drift·루트 앱 `"."`·RN rules는 앱 workspace만)로 닫고, 나머지 7건은 plan·후속 task로 이월.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*
*(writer 자기 평가 — 게이트 판정은 `/harness-interview` 몫)*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — 근거: 문제 ①②와 영향, "모양 판별 → 위임/경로별 게이트 → RN rules 스코프 프리셋, 단일 앱은 바이트 동일".
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — 근거: D7·D8·D11, 단일 앱 출력·기록 바이트 동일(새 프롬프트 없음, G1), 무의존성, 범위 밖 4항.
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — 근거: 아래 완료 기준 7항(turbo·nx 실제 실행은 보장 범위 밖으로 명시).
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — 근거: 참고 절 영향 파일(migrate 고정 refresh 목록·doctor stale 검사 포함).
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 — 근거: validator 채점 5차원 pass → 가중합 1.0 (Ontology 절 통과 기록).

### 완료 기준
1. 판별: 픽스처 5종(단일 · npm `workspaces` 앱1+패키지 · pnpm workspace 앱2 · turbo · nx)에서 shape·workspace 목록·kind·tool이 기대값과 같다.
2. 제안: 단일 앱은 기존 프리셋 테스트가 변경 없이 통과(바이트 동일). turbo·nx → 위임 명령 배열, 도구 없음 → workspace별 `cd <dir> && …` 객체.
3. `gate commit` 객체 형식: 해당 workspace만 실행 / `"."` 키는 안 걸린 변경에만 / untracked 포함 / HEAD 없음 = 전부 / 잘못된 객체 = 설정 오류 차단 — 각각 테스트.
   배열 형식 기존 테스트는 그대로 통과.
4. init 확인: workspace 있음 → 판별 결과 출력 + 거절 시 단일로 진행(지문 `shape: single`) + `--yes`면 판별 채택 / workspace 없음 → 프롬프트 없음 — 테스트.
   단일 앱 회귀: 기존 init·migrate·doctor 출력 테스트가 변경 없이 통과.
5. RN rules: 단일 RN 앱 → 프롬프트 없이 4종이 오늘 템플릿과 바이트 동일 / 루트 RN 앱 + `packages/*` → 접두 없는 4종 / RN 의존성만 있는 패키지 → 없음 / RN 앱 `apps/mobile` + 웹 앱 → `apps/mobile/` 접두 rules만, 웹에는 없음 / 비-RN → 없음 /
   Expo 단일 앱 + `--stack node` → 없음 / 기존 파일 무변경 — 테스트. migrate stock refresh·doctor stale·완전성 테스트는 **변경 없이** 통과.
6. doctor: workspace 디렉터리 추가 시 drift 처방 / 앱 수만 변화 → 조용 / 확정 `single` + workspace 변화 → 조용 / 기존 단일 앱 `gates.json` → 새 경고 없음 — 테스트.
   turbo·nx: 제안 문자열은 테스트로, "HEAD 대비 미커밋·untracked 포함" 의미는 공식 문서 인용으로 artifact에 기록한다. **실제 도구 실행은 이 기준이 보장하지 않는다**(무의존성 제약).
7. `npm run test`·`npm run docs:check` PASS.

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

- 소스: `docs/harness-cycle.md` §4-2·§4-2b·§6-3, `docs/hslee/preset-gates/preset-gates-spec.md`(이월 항목·Ontology), 인계 `.claude/handoffs/2026-10-05-2233-preset-repo-shape.md`,
  interview 2026-10-06 (Q1 변경 기준 · Q2 `"."` 키 · Q3 게이트 규칙 둘 · Q4 RN rules `--yes` 설치·기존본 무변경).
- 영향 파일: `src/presets.mjs`(`buildProposal`·지문) · `src/commands/gate.mjs`(형태 검증·객체 실행) · 신규 `src/repo-shape.mjs`(가칭) · `templates/presets/node.json`(앱·패키지·도구 조건)
  · `src/harness.mjs:265-288`(RN 게이트 제거), `:7`(`RN_STACK_IDS` import가 dead), `:211` 주석 · `src/commands/init.mjs:27-28` 주석(게이트 전제)
  · `src/harness.mjs` `copyStaticAssets`의 rules 일괄 복사 단계 제거(4종 파일은 이동하지 않는다 — 설계 4)
  · `src/commands/init.mjs`(판별 확인·rules 제안·`Copied N` 집계 :91) · `src/commands/migrate.mjs` `collectStale`(:387) — 원천 경로가 그대로라 변경 없음(확인 대상)
  · `src/commands/doctor.mjs`(stale 템플릿, `checkRuleProvenance`의 `isKnownStockTemplate` :991-993, 지문 drift) · `src/settings-permissions.mjs`(RN_STACK_IDS 공유 — 주석만)
  · `mirrorCursorRules`(`copyStaticAssets` 끝에서 실행) — rules 프리셋 설치가 그 뒤면 Cursor 미러에서 빠진다. 접두 `paths:`는 `.mdc` globs로 전파된다
  · `scripts/generate-harness-overview.mjs:128`(경로 분류 — `docs:check` 영향)
  · 테스트: `stack-conditional-rules`(재작성) · `settings-permissions` · `migrate-templates`(:249-270 완전성 테스트가 `templates/<rel>`의 git 이력을 직접 읽는다 — 이동 시 이력 단절)
    · `cursor-rules-mirror` · `doctor` · gate·presets 테스트 + 신규 repo-shape 테스트.
- (open → plan) turbo·nx 명령 형태를 공식 문서로 확인: turbo `--filter=...[HEAD]`가 미커밋·untracked를 포함하는지, nx는 `affected --uncommitted --untracked`인지 `--base=HEAD`인지,
  그리고 각 도구 설정에 정의된 태스크만 고르는 조건을 데이터로 어떻게 표현할지.
- (open → plan) 여러 RN 앱에 rules 4종을 둘 때 파일 이름(예: `mobile-navigation.md`) 규칙과, 그 이름의 사본이 migrate refresh 대상에서 빠지는 것의 확인.
- (open → plan) 디렉터리 glob 매칭 방식(`node:path` `matchesGlob`을 변경 파일의 상위 디렉터리마다 적용할지)과 키가 겹칠 때(`packages/*`·`packages/ui`) 실행 순서·중복 처리.
- (open → plan) workspace별 프리셋 선택(각 디렉터리의 `detectStack` 결과로 고를지), signals 접두 형식, 모노레포에서 `--stack` 강제의 의미(루트에만 적용 예상).
- (open → plan) rules 프리셋 설치를 `mirrorCursorRules`보다 먼저 두는 순서(그렇지 않으면 Cursor 미러에서 빠진다).
- (open → 후속 task) `settings-permissions.mjs`의 RN 전용 permissions도 프리셋 데이터로 옮길지.
- (open → 4번 `pr-check` task) git pre-commit 훅 연결.

# review-model — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: `harness-team review`는 엔진(codex·claude·custom)만 고를 수 있고 모델은 고를 수 없다. 실행 인자
  (`review.mjs:382–383`)에 모델 인자가 없어 엔진 CLI의 기본 모델로만 돈다. 팀이 "이 task는 이 엔진·모델로 리뷰한다"를
  정해 둘 자리도 없다 — 엔진을 생략하면 언제나 probe 체인(codex → claude)이다. (kc-platform 회고 A6, 설계 task
  `team-harness-improvements` R1 결정 A6-1)
- **영향**: 하네스 소비자 프로젝트의 작성자·리뷰 실행자, `review`·`task` CLI, `meta.reviews[]`·artifact `## Reviews` 기록,
  엔진을 생략하고 review를 부르는 loop QA 6·7, 명령 문서 `harness-{review,loop,task}`, README.
- **기대 결과**: ① `review <engine> --model <id>`로 모델을 고른다. ② `.harness/reviewers.json`의 이름 붙은 프로필
  (`{engine, model}`)과 `default`로 팀 기본 리뷰어를 정한다. ③ task 생성 시 `--reviewer <profile>`로 그 task의 리뷰어를
  spec에 남긴다. ④ 어떤 모델로 돌았는지가 meta·artifact에 남는다.
- **제약**: D2(기본 probe 체인 codex → claude 불변)·D4·D5·D11. 모델 미지정 실행은 지금과 **같은 argv**.
  marker(`<!-- harness:review … -->`)·kind·verify 판정은 바꾸지 않는다. 기존 기록은 소급하지 않는다.
  CLI가 사람이 쓴 spec을 고치지 않는다(생성 때만 쓴다). push·PR·릴리스는 범위 밖.

## 범위 (In / Out)
- **In**: `src/cli-args.mjs`(`--model`·`--reviewer` 등록, help), `src/commands/review.mjs`(검증·argv·프로필 해석·기록),
  `src/commands/task.mjs`(Done evidence `reviewer` 키 파서, `task --reviewer` 생성 시 블록), `src/reviewers-config.mjs`(신규 — 스키마 공용),
  테스트(`tests/review-model.test.mjs` 신규, `tests/cli-args.test.mjs`), 문서(`commands/harness-review.md`·`harness-loop.md`·
  `harness-task.md`, README, CHANGELOG `[Unreleased]`), 생성물(`docs/harness-overview.html`이 바뀌면 재생성).
- **Out**: doctor의 `reviewers.json` 스키마 경고(설계가 "선택"으로 둔 것 — 아래 결정), migrate(옵트인 파일이라 불필요),
  기존 task spec에 reviewer를 쓰는 CLI 경로(손 편집 안내만), `custom` 엔진의 모델 인자(템플릿에 실을 자리가 없다),
  과거 릴리스 노트 HTML(`docs/what-changes-*.html`) — 그 시점 사실이라 고치지 않는다.

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- 설계 task `docs/chad/team-harness-improvements/team-harness-improvements-spec.md` "### A6" 절과 R1 결정 A6-1(PR #184, `5993b27`) —
  아래 `## 설계 / 접근`에 그대로 옮겨 썼다(보조 참조).
- 코드: `src/commands/review.mjs`(`ENGINES`·`resolveEngine`·`runEngine`·`renderReviewBlock`·entry 조립), `src/cli-args.mjs`,
  `src/commands/task.mjs`(`parseDoneEvidenceDeclaration`·`taskSpecTemplate`·`runTask`), 소비처 `scenario.mjs`·`migrate.mjs`·done 가드.
- 로컬 CLI(설계 task 실측): codex-cli 0.169.0 `exec --help`(`-m, --model <MODEL>`), Claude Code 2.1.327 `--help`(`--model <model>`).

### 발견
- **`--model` 단독(위치 인자 엔진 없음)** — 설계 우선순위 ①은 "위치 인자 엔진(+ `--model`)"이라 엔진 없는 `--model`을 정하지 않았다.
  모델 id는 벤더별이다 — probe·프로필로 고른 엔진에 붙이면 claude 모델이 codex로 갈 수 있다.
  → 결정(구현 판단, 2026-11-18): 위치 인자 엔진(`codex`|`claude`) 없이 `--model`을 주면 실행 전에 거부한다.
- **깨진 `reviewers.json`·Done evidence** — 엔진 생략 경로가 이제 두 파일을 읽는다. 예전에는 둘 다 안 읽고 probe했다.
  조용히 probe로 내려가면 "명시 선택을 조용히 폴백하지 않는다"가 깨진다.
  → 결정(구현 판단): 엔진 생략 경로에서만 error 패킷으로 멈춘다. retry에 "엔진을 위치 인자로 명시하면 프로필을 보지 않는다"를 적어
  막히는 사람이 없게 한다. 위치 인자 엔진이 있으면 프로필을 읽지도 검사하지도 않는다(`custom`의 `custom.command` 검사는 종전대로).
- **Done evidence 소비처** — `reviewer`만 있는 블록은 status가 `not-configured`에서 `configured`로 바뀐다. 소비처(done 가드·
  `scenario check`·`migrate --adopt-reviews`)는 `invalid`·`scenarios`·`tests`·`review`·`verify`만 읽는다 — 요건·출력 문구 무변화를 테스트로 고정한다.
- 검토 완료: 2026-11-18 — 위 두 판단을 아래 설계 "구현 결정"에 반영, 남은 `(unresolved)`·`(open)` 없음

## 설계 / 접근

### A6 — review 엔진과 모델 분리 (설계 task에서 옮김)
- **CLI**: `harness-team review [codex|claude|custom] [--model <id>] …`. `--model`은 `src/cli-args.mjs` `VALUE_FLAGS`와 review
  flags에 추가. `custom`과 함께 쓰면 거부(셸 템플릿에 실을 자리가 없다). 검증: 빈 값·공백·선행 `-` 거부(argv 주입 방지).
  실행: codex `['exec', '--sandbox', 'read-only', '-m', model, prompt]`, claude `['-p', '--permission-mode', 'plan', '--model', model, prompt]`.
- **프로필**: `.harness/reviewers.json`에 `profiles`·`default`를 더한다. 기존 `custom` 키와 공존:
  `{ "custom": { "command": "…" }, "profiles": { "<name>": { "engine": "codex", "model": "<id>" } }, "default": "<name>" }`.
  `engine`은 `ENGINES` 중 하나, `custom` 프로필은 `model`을 갖지 않는다. 깨진 스키마는 실행 전에 error 패킷.
- **우선순위**: ① 위치 인자 엔진(+ `--model`) — 완전 명시, 프로필 무시 ② task가 고른 프로필 ③ `reviewers.json` `default`
  ④ probe 체인 codex → claude(D2 불변). ②·③의 엔진이 PATH에 없으면 **error**다 — 명시 선택을 조용히 폴백하지 않는다(위치 인자와 같은 규칙).
- **기록**: `meta.reviews[]` 새 항목에 `model: <id>|null`(`null` = 엔진 기본 모델, 키 없음 = 이전 기록 — base·mergeBase의 "null이지
  생략이 아니다" 선례). artifact `- engine:` 줄에 `· model: <id>`. `<!-- harness:review … -->` 마커와
  kind는 바꾸지 않는다 — `REVIEW_MARKER_RE`·verify 판정 무변경. 기존 기록은 소급하지 않는다.
- **task별 선택(결정 A6-1)**: `task <name> --reviewer <profile>` — `created:`일 때만 spec에 기록하고, 기존 task에는 거부하며 spec 손 편집을 안내한다
  (CLI가 사람이 쓴 spec을 고치지 않는다). 저장 위치는 Done evidence `"reviewer": "<profile>"` — 파서에 키 하나. 생성 시 주석 예시를 벗기지 않고 새 블록
  `{ "version": 1, "reviewer": "<p>" }`을 쓴다. 비용: 옛 CLI의 `done`이 `알 수 없는 키`로 막힌다 → CHANGELOG 첫 줄에 "팀 전원 ≥ 이 버전" 명시
  (`scenarios` 키 도입과 같은 선례). 기각한 대안: spec 별도 `## Reviewer` 절(새 파서·템플릿 절), meta.json(팀 가시성 낮음).
- **같은 프로필을 쓰는 곳**: loop QA 6(`--framing scenario`)·7(R3)은 엔진을 생략하고 부르므로 ②→④ 규칙을 그대로 탄다 — 코드 분기 없음.
  `commands/harness-loop.md` "`<engine>`을 생략하면 폴백 체인" 문장만 "프로필 → 폴백 체인"으로.
- **문서 정본**: `commands/harness-review.md` 1단계(엔진 결정·우선순위)·runner 표(모델 인자)·custom 절(스키마)·5단계(meta 필드).
  `commands/harness-task.md`(`--reviewer`). README 명령 레퍼런스.
- **테스트**: `tests/review-command.test.mjs`(우선순위·거부·argv·meta `model`), `tests/cli-args.test.mjs`(플래그 등록), runner 표 ↔
  `review.mjs` pin(신규 — 지금은 없다), Done evidence 파서(`tests/done-guard.test.mjs`).
- **호환**: `reviews` 키 없는 구 meta는 종전대로 artifact 마커만. 모델 미지정 실행은 지금과 같은 argv.

### 구현 결정 (설계가 정하지 않아 구현에서 정함 — 각각 테스트가 있다)
- **argv 빌더 분리**: `engineArgv(engine, { prompt, model })`를 export하고 `runEngine`이 그것을 쓴다. `model: null`이면 argv가 오늘과
  바이트 단위로 같다(호환 테스트). runner 표 pin과 "프로필 모델이 실행까지 도착" 테스트가 이 함수를 쓴다. `runEngine`은 `model`을 받는다.
- **`resolveEngine` 반환 모양 불변**: 우선순위는 새 래퍼 `resolveReviewer`가 맡고, 엔진·custom 검사는 `resolveEngine`을 그대로 부른다.
- **`--model` 단독 거부**: 위치 인자 엔진 없이 `--model`은 실행 전 error(R1 발견).
- **모델 검증 하나**: `--model`과 프로필 `model`이 같은 검증을 쓴다 — 문자열·비어 있지 않음·공백/제어문자 없음·선행 `-` 아님.
- **프로필 스키마**: `profiles`는 object, 각 프로필은 object이고 키는 `engine`·`model`만(오타 `modle`을 잡는다). `default`는 문자열이고
  `profiles`에 있는 이름. 최상위의 다른 키는 검사하지 않는다(기존·미래 키 호환). 검사는 엔진 생략 경로에서만 한다.
- **Done evidence `reviewer`**: 비어 있지 않은 문자열만 받는다(`"reviewer": 5`는 invalid). 파서는 프로필 존재를 보지 않는다 —
  done 가드가 `reviewers.json`에 묶이지 않게. 존재는 `review` 실행 때(②) 판정한다.
- **`task --reviewer`**: 기존 task(활성화·reopen)에는 어떤 쓰기(`writeActive`·handoff·area 채택 meta)보다 먼저 거부한다. 새 task는
  `mkdir` 전에 `reviewers.json`에 그 프로필이 있는지(스키마 포함) 확인한다. 블록은 heading 바로 아래, 주석 예시 앞에 둔다(파서 regex 위치).
  `--reviewer` 없는 기본 템플릿 출력은 바이트 단위로 그대로다.
- **artifact 표기**: 새 항목은 `· model: <id>`, `null`이면 `· model: default`. 키가 없는 호출(구 경로)은 표기하지 않는다.
- **프로필 이름 출력**: 사람 출력·JSON envelope `extra.profile`에 고른 프로필 이름을 보인다. meta 항목에는 넣지 않는다(설계가 정한 필드만).
- **doctor**: 스키마 경고를 추가하지 않는다 — `review`가 실행 전에 같은 검사를 error로 낸다. 필요해지면 별도 task.
- **테스트 위치**: 설계가 나눈 review·runner pin·Done evidence·`task --reviewer` 테스트를 `tests/review-model.test.mjs` 한 파일에 둔다
  (병렬 task와 기존 테스트 파일 충돌을 줄인다). 플래그 등록만 `tests/cli-args.test.mjs`.
- **소비자 문서**: "엔진 미지정 → probe 체인"을 적은 현행 문서(`skills/harness-review/SKILL.md`, `docs/harness-{rubric-guide,onboarding-checklist,
  operations-playground}.html`)도 같은 사실이라 한 줄씩 고친다. 릴리스 노트(`docs/what-changes-*.html`)는 그 시점 사실이라 두지 않는다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **리뷰 프로필(reviewer profile)**: `.harness/reviewers.json` `profiles`의 이름 붙은 `{engine, model?}`. kind에는 들어가지 않는다 — kind는 엔진과 프레이밍만.
- **기본 프로필(default)**: `reviewers.json` `default`가 가리키는 프로필 — 엔진을 생략하고 task가 프로필을 고르지 않았을 때 쓴다.
- **task 리뷰어**: spec Done evidence의 `"reviewer": "<profile>"` — `task --reviewer`가 생성 때만 쓰고, 이후는 사람이 편집한다.
- **모델 `null`**: 엔진 기본 모델로 돌았다는 기록. 키 없음(이전 기록)과 구분한다.
- 게이트 근거(2026-11-18): 설계 task에서 A6·A6-1 승인, 구현 판단 6건을 위 "구현 결정"에 명시하고 각각 테스트로 고정한다. 영향 파일 식별 완료.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — review에 모델 선택과 팀·task 프로필을 더하고 실행 모델을 기록한다
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — D2 체인 불변, 무모델 argv 불변, marker·kind 불변, 생성 때만 spec 쓰기
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — `npm test`·`docs:check` 통과, 아래 Done evidence(tests required), doctor 확인
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — 범위 In 목록
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 — 1.0(2026-11-18)

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "optional" ("required"면 소스가 바뀔 때 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
```json
{ "version": 1, "tests": "required" }
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 설계 원본(보조 참조): `docs/chad/team-harness-improvements/team-harness-improvements-spec.md` "### A6", R1 결정 A6-1.
- 병렬 task(D5, 파일 무중첩 전제): A1 `diagram-views`·A4 `spec-ask-markers`. A1도 `src/cli-args.mjs` `VALUE_FLAGS`·CHANGELOG를 고치므로
  그 줄은 최소 삽입으로 둔다(머지 순서대로 rebase).
- 다이어그램 옵트인: 2026-11-18 생성 시 질문 — 건너뜀(plan에 단계 없음).

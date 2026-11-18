# task-brief — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.
다른 역할에 물어야 하면 `- (ask:<역할>) …` → `(asked:<역할> <날짜> <링크>)` → `(answered <링크>)`로 상태를 적고, 반영하면 지운다.*

- **문제**: 구현 전 사람 검토(A5 게이트 — 구현에 들어가기 전에 사용자가 spec을 한 번 검토)를 하려면 spec 전문을 읽어야 한다. spec은 템플릿 안내·주석·
  자가진단이 섞인 긴 마크다운이라 "빠르고 확실한" 검토가 어렵고, 에이전트가 요약 슬라이드를 쓰면 spec에 없는 사실이 섞일 수 있다
  (kc-platform 회고 A3, 설계 task `team-harness-improvements`).
- **영향**: 새 CLI `brief`와 그 표면(`bin/harness-team.mjs` router, `src/cli-args.mjs`), `clean` CLI, 문서(`commands/harness-task.md`,
  `templates/docs/README.md`, README 명령어, `skills/harness-team/SKILL.md`). 하네스를 쓰는 모든 소비자 프로젝트의 task 작성자(구현 전 자기 검토).
- **기대 결과**: `harness-team brief [--stage spec]`이 활성 task spec의 절(목적·범위·설계·Ontology·R1 발견)과 열린 항목, 선언돼 있으면
  Done evidence `scenarios`를 **그대로** 슬라이드로 렌더해 `<name>-brief.html`을 쓴다. 렌더 결과의 텍스트는 모두 spec 원문의 부분 문자열이다
  (새 사실 0 — 결정 A3-1). 슬라이드마다 출처 절 이름이 보인다.
- **제약**: 결정론 — 같은 spec이면 같은 바이트(시각·난수 없음). CSS scroll-snap·script 0·외부 자산 0·system font stack.
  probe → degrade 계약은 적용하지 않는다(A3-1 — probe할 외부 도구가 없다). 슬래시 명령을 새로 만들지 않는다(manifest-sync 표면을 늘리지 않음).
  doctor·`AGENTS.md`·`templates/AGENTS.md.hbs`·`src/commands/task.mjs`는 바꾸지 않는다. A5(`human-review-gate`)를 기다리지 않는다(사용자가 병렬 시작을 택함).
  push·PR·릴리스는 범위 밖.

## 범위 (In / Out)
*`- **In**: …`에 이번 task가 바꾸는 것(파일·모듈·동작)을, `- **Out**: …`에 하지 않기로 한 것과 그 이유 한 줄을 쓴다 —
요청하지 않은 기능·관련 없는 리팩터링이 섞이지 않게 긋는 경계다.*

- **In**: `src/commands/brief.mjs`(신규 — 절 선택·마크다운 부분집합 렌더러·쓰기), `bin/harness-team.mjs` router, `src/cli-args.mjs`
  (COMMANDS `brief`·`VALUE_FLAGS` `stage`·`FLAG_CHOICES.stage`·`--json` 목록), `src/commands/clean.mjs` `TASK_FILE` kind `brief`,
  `src/task-paths.mjs` kind 주석, 테스트(`tests/brief-command.test.mjs` 신규·`tests/cli-args.test.mjs`·`tests/clean.test.mjs`),
  문서(`commands/harness-task.md` 게이트와 독립된 짧은 절, `templates/docs/README.md` 트리·규약, README 명령어 블록, `skills/harness-team/SKILL.md`),
  CHANGELOG `[Unreleased]`.
- **Out**: `--stage ship`(plan 단계·artifact 결과) — 설계가 후순위로 두고 첫 PR에서 빼도 된다고 했다(아래 R1). A5 범위 — 게이트 단계 삽입
  (`taskPlanTemplate`), `commands/harness-loop.md` 진입, `docs/harness-cycle.md` §2, harness-task 게이트 절과 `brief` 연결, artifact 승인 줄 —
  A5 머지 뒤 rebase 때 맞춘다. 링크·이미지·기울임·인용 렌더(부분집합 밖 — 글자 그대로 둔다). doctor(설계 A1-2와 같은 이유 — 기존 계약 유지).
  `AGENTS.md`·`templates/AGENTS.md.hbs`(eager 예산). `pr-check` — 브리프는 PR 산출물이 아니다(작성자 본인 검토용, 설계 R1).

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`(다른 역할에 물을 것이면 `(ask:<역할>)`)으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- 설계 정본: `docs/chad/team-harness-improvements/team-harness-improvements-spec.md` "A5 + A3" 절(슬라이드·명령 표면·형제 경로·문서 정본·테스트·호환)과
  R1 결정 A3-1(결정론 CLI `harness-team brief`, spec 절만 렌더해 새 사실이 생기지 않음, probe·degrade 미적용), 열람 경로(로컬 브라우저·Obsidian,
  미검증: Obsidian에서 CSS scroll-snap 슬라이드 동작) — PR #184.
- 상위 세션 지시(2026-11-18): A3 구현 범위·완료 기준, A5와 병렬(사용자 결정), harness-task 문서는 게이트와 독립된 짧은 절.
- A4 결과(PR #185): 외부 질의 마커 세 상태와 표기/언급 구분 — `commands/harness-interview.md` 열린 질문 검사·R1 검사.
- A2 인계 노트(`a2-diagram-svg.md`): `clean.mjs` `TASK_FILE` 같은 줄이 충돌 지점.
- 외부: Obsidian 도움말 원본 `obsidianmd/obsidian-help` `en/Files and folders/Accepted file formats.md`(`gh api`로 읽음).
- 로컬: 이 저장소를 담은 볼트의 `.obsidian/community-plugins.json`(설치된 커뮤니티 플러그인 21개).

### 발견
- **Obsidian 열람(설계의 미검증 항목)** — 실측할 수 있는지 먼저 확인했다. Obsidian 공식 지원 형식에 `.html`이 없다(Markdown·Bases·Canvas·
  Images·Audio·Video·PDF — 다른 형식은 커뮤니티 플러그인). 이 볼트의 커뮤니티 플러그인 21개에 HTML 뷰어는 없다. 즉 scroll-snap 이전에
  Obsidian은 `<name>-brief.html`을 네이티브로 열지 않는다. 플러그인 열람을 실측하려면 플러그인 설치(사용자 볼트 변경)와 GUI 조작이 필요하다.
  → 결정(2026-11-18): 열람 정본은 **로컬 브라우저**다. Obsidian은 네이티브 미지원(문서 근거), HTML 플러그인 열람은 미검증으로 남긴다(`## 참고`).
  결정 A3-1(결정론 HTML)은 그대로 두고 열람 경로만 좁힌다. 로컬 브라우저의 scroll-snap은 구현 뒤 내장 브라우저로 실측한다.
- **"새 사실 0"의 판정 방식** — 설계는 "렌더 결과의 텍스트가 모두 spec 원문의 부분 문자열"이다. 슬라이드 번호·"출처:" 라벨·생성 시각 같은
  장식 글자도 spec에 없는 텍스트라 이 판정을 깬다.
  → 결정(2026-11-18): 장식 글자를 두지 않는다. 출처 절 이름은 spec 제목 글자 그대로(예: `설계 / 접근`)가 슬라이드 제목·출처 표지를 겸하고,
  `<title>`은 H1이다. 생성 시각을 넣지 않아 같은 spec이면 같은 바이트다. 판정은 텍스트 노드마다 엔티티를 풀고 공백 연속을 한 칸으로 접은 뒤
  (spec 쪽도 같이 접어) 부분 문자열인지 본다 — HTML은 공백을 접어 그리므로 줄 이음은 사실이 아니다. scenarios 값은 JSON을 푼 문자열이라
  escape(`\"`·`\u…`)가 든 값은 원문의 부분 문자열이 아니다 — 이 저장소 spec 187개에 렌더해 보니 실패는 `cmd`의 `\"` 8건뿐이었다.
  JSON escape를 푸는 것은 엔티티를 푸는 것과 같은 표현 변환이라, 판정은 spec 원문과 그 spec의 Done evidence가 선언한 scenarios 값(푼 문자열)을 원문으로 센다.
- **spec 안에 있지만 이 task의 사실이 아닌 글자** — 템플릿 안내 문단(제목 아래 기울임 문단)과 HTML 주석(Done evidence의 주석 처리된 예시
  `"review": "required"`)은 부분 문자열 검사를 통과하지만, 슬라이드에 나오면 선언되지 않은 요건이 선언된 것처럼 보인다.
  → 결정(2026-11-18): 코드 펜스 밖 HTML 주석과 안내 문단(단일 `*`로 시작하고 끝나는 문단 — `**` 굵게는 아니다)을 렌더 전에 걷어 낸다.
  scenarios는 `parseDoneEvidenceDeclaration`이 `configured`로 돌려준 것만 렌더한다(done 가드와 같은 판정 — invalid면 CLI 출력에만 알린다).
- **열린 항목의 문법** — 설계는 "`(open)`/`(unresolved)` 항목"이다. A4가 외부 질의 마커 세 상태를 더했고 셋 다 게이트를 통과하지 못한다.
  이월 `(open → <대상>)`은 게이트를 통과하지만 답은 아직 없다.
  → 결정(2026-11-18, MAINTAINING "문법·형제 경로 전체"): 목록 항목에 맨 글자로 붙은 `(open…)`(이월 포함)·`(unresolved)`·`(<출처>, unresolved)`·
  `(ask:…)`·`(asked:…)`·`(answered …)`를 spec 어디서든 모아 한 슬라이드에 둔다. 백틱 안은 언급이라 세지 않는다(harness-interview 표기/언급 구분).
  `(open` 뒤는 `)` 또는 `→`만 태그다 — `(open 아님, …)` 같은 산문은 세지 않는다.
  이월을 넣는 이유: 검토자는 "답 없이 넘긴 것"을 보고 승인해야 한다. 묶음마다 그 항목이 있던 절 제목을 출처 표지로 단다. 열린 항목이 없으면 슬라이드도 없다.
- **`--stage ship`** — 설계는 "후순위, 첫 PR에서 빼도 됨"이다.
  → 결정(2026-11-18): 뺀다. `--stage`는 `spec`만 받는다 — 값 계약은 `FLAG_CHOICES`(MAINTAINING 규칙표)에 두고, 하는 일 없는 값을 광고하지 않는다.
  `ship`을 더하는 것은 하위 호환 변경이다(플래그 없음 = `spec`).
- **A5와의 순서** — 설계 PR 분할은 "②는 ① 뒤"인데 사용자가 병렬 시작을 택했다. `brief`는 게이트 단계에 기대지 않는다(spec만 읽는다).
  → 결정(2026-11-18): `commands/harness-task.md`에는 게이트와 독립된 짧은 절만 둔다. A5 머지 뒤 rebase 때 게이트 절이 이 절을 부르게 맞춘다.
  `src/commands/task.mjs`는 고치지 않는다(A5가 `taskPlanTemplate`을 고친다 — 충돌 최소화, `readActive`·`parseDoneEvidenceDeclaration`은 import만).
- **없는 절** — 이전 spec에는 R1 절 같은 절이 없을 수 있다.
  → 결정(2026-11-18): 없거나 비어 있는 절은 슬라이드를 만들지 않고 CLI 출력(파일 밖)에만 알린다 — 자리표시 슬라이드는 새 텍스트라 만들지 않는다.
  렌더할 절이 하나도 없으면 exit 1이고 아무것도 쓰지 않는다.
- 검토 완료: 2026-11-18 — 위 결정 반영 후 재대조, 남은 `(unresolved)`·`(open)` 없음

## 설계 / 접근
설계 task의 "A5 + A3" 절 중 슬라이드(A3) 항목을 옮겨 쓰고 위 R1 결정을 반영했다.

- **CLI(결정 A3-1)**: `harness-team brief [--stage spec]` — 활성 task(`.harness/active.json`)의 `<name>-spec.md`를 읽어 같은 폴더에
  `<name>-brief.html`을 쓴다. 매번 덮어쓴다(생성물). LLM이 쓰지 않으므로 "새 사실 0"이 구조로 보장되고, probe할 외부 도구가 없어 probe → degrade
  계약은 적용하지 않는다. 위치 인자는 받지 않는다. `--json`은 `command: 'brief'` envelope(`artifacts`, `slides`·`sections`·`missing`).
  오류(활성 task 없음·spec 없음·렌더할 절 없음)는 exit 1, error 패킷, 아무것도 쓰지 않음.
- **절 선택(spec 문서 순서)**: `## 목적…`·`## 범위…`·`## 원천 검토…`의 `### 발견`만·`## 설계…`·`## Ontology` — 제목 머리 글자로 찾는다.
  `###` 하위 절이 있으면 하위 절마다 한 슬라이드(위 절 제목을 출처 표지로), 하위 절 앞 본문도 한 슬라이드. 그 뒤 열린 항목 슬라이드(있을 때만),
  Done evidence `scenarios`(선언됐을 때만 — 시나리오마다 `id`·`given`·`when`·`then`·`test`·`cmd` 표). 맨 앞은 H1 표지(H1이 있을 때).
- **렌더러(작은 마크다운 부분집합)**: 문단, 목록(`-`·`*`·`+`·`1.` — 들여쓰기 중첩, 이어지는 줄), 굵게 `**`, 인라인 코드, 표(`|` 헤더 + 구분 줄),
  코드 펜스, 슬라이드 안 `####` 이하 제목. 링크·이미지·기울임·인용은 글자 그대로. spec 글자는 모두 HTML escape(`&`·`<`·`>`·`"`) —
  spec의 `<script>`는 글자다.
- **산출물**: `<!doctype html>` 한 파일. 인라인 `<style>` 하나(고정 문자열 — spec과 무관), script 0, `src`·`href`·`url(`·`@import` 0,
  system font stack, `html { scroll-snap-type: y mandatory }`·`.slide { scroll-snap-align: start; min-height: 100vh }`, 다크 모드, 인쇄(`break-after: page`).
- **명령 표면**: CLI 서브커맨드 `brief`(`bin/harness-team.mjs` router·`taskCmds`, `cli-args.mjs` COMMANDS·`VALUE_FLAGS`·`FLAG_CHOICES.stage`).
  슬래시 명령은 새로 만들지 않는다 — `commands/harness-task.md`의 절이 `harness-team brief`를 부른다.
- **형제 경로**: `clean.mjs` `TASK_FILE` kind에 `brief`(확장자 그룹은 이미 `html`), `task-paths.mjs` kind 주석, `templates/docs/README.md` 트리
  (생성물·비-SSOT — docs seed는 migrate refresh 대상이 아니라 sha 등록 없음, A1·A2 선례).
- **문서 정본**: `commands/harness-task.md` "검토용 슬라이드" 절(게이트와 독립 — A5 머지 뒤 게이트 절과 연결). README 명령어 블록,
  Codex `skills/harness-team/SKILL.md` 한 줄.
- **테스트**: `tests/brief-command.test.mjs` — 새 사실 0(텍스트 노드 ⊂ spec — 표본과 이 저장소의 모든 task spec, 음성 대조: 남의 문자열 하나를 넣으면 판정이 실패),
  외부 참조 0(태그·속성·style만 본다 — 본문 텍스트의 URL 언급은 허용), escape(`<script>`·링크 문법), 주석·안내 문단 제외, 열린 항목(맨 글자/백틱,
  마커 종류), scenarios(configured만), 결정론(두 번 실행 바이트 동일), 없는 절 생략·전부 없으면 exit 1·쓰지 않음, 활성 task 없음.
  `tests/cli-args.test.mjs`(`--stage` 값·`--json` 목록), `tests/clean.test.mjs`(brief 보호).
- **호환**: 새 명령·새 파일만 — 기존 task·명령 동작 불변. `brief`가 task 예약어가 된다(`tests/task-reserved-names.test.mjs`가 COMMANDS를 돈다) —
  이 저장소에 `docs/*/brief` task는 없다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **브리프(brief)**: spec의 정해진 절만 그대로 옮긴 검토용 슬라이드 HTML `<name>-brief.html`. 생성물·비-SSOT — 사실의 정본은 spec이고, spec이 바뀌면 다시 만든다.
- **새 사실 0**: 브리프의 모든 텍스트 노드가 (엔티티를 풀고 공백을 접은 뒤) spec 원문의 부분 문자열인 상태. 장식 글자를 두지 않아서 성립한다.
- **열린 항목**: 목록 항목에 맨 글자로 붙은 열린 질문·충돌 표기 — `(open…)`(이월 포함)·`(unresolved)`·외부 질의 마커 세 상태.
- **출처 표지**: 슬라이드가 옮긴 spec 절의 제목 글자 그대로.
- 게이트 근거(2026-11-18): 설계 결정 A3-1 확정(PR #184), 판정 방식·제외 글자·열린 항목 문법·`--stage ship` 제외·A5 순서·없는 절을 R1 결정으로 닫음,
  Obsidian 열람은 네이티브 미지원·플러그인 미검증으로 명시. 목표·제약·완료 기준·영향 파일이 모두 식별됨.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — `harness-team brief`가 spec 절만 그대로 렌더한 검토용 슬라이드 `<name>-brief.html`을 쓴다
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — 결정론·script 0·외부 자산 0·새 사실 0, 슬래시 명령 없음, task.mjs·doctor·AGENTS 불변
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — `npm test`·`npm run docs:check` 통과, doctor 확인, `pr-check --base origin/main` 통과, 아래 Done evidence
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — 범위 In 절의 파일 목록(`git grep`으로 CLI 목록 표면 확인)
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

- 설계 정본(보조 참조): `docs/chad/team-harness-improvements/team-harness-improvements-spec.md` "A5 + A3" 절.
- 미검증: Obsidian HTML 커뮤니티 플러그인에서의 브리프 열람·scroll-snap 동작. 확인 방법: 볼트에 HTML 뷰어 플러그인을 설치하고 `<name>-brief.html`을 연다.
- A5와 겹치는 파일(rebase 지점): `src/cli-args.mjs`(COMMANDS·플래그), `src/commands/clean.mjs`(`TASK_FILE` 한 줄), `commands/harness-task.md`, CHANGELOG `[Unreleased]`.
- 다이어그램 옵트인: 2026-11-18 생성 시 질문 — 묻지 않고 건너뜀(상위 세션이 시작한 무인 세션, 옵트아웃 기본값 — plan에 단계 없음).

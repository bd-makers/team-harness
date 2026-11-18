# team-harness-improvements — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: kc-platform 회고(하네스 0.55.0, UC-A02, GitLab MR !93)에서 모든 프로젝트에 공통인 개선점 6개(A1–A6)가 나왔다.
  다이어그램은 뷰 하나·HTML 하나뿐이라 GitLab MR에서 보이지 않고, 리뷰 엔진은 모델을 고를 수 없고, S2 Plan 게이트
  "개발자 확인"과 spec의 외부 질의는 기계로 남는 상태가 없다.
- **영향**: 하네스를 쓰는 모든 소비자 프로젝트의 팀원(작성자·비담당 리뷰어)과 `review`·`diagram`·`pr-check`·`task`·`clean` CLI,
  명령 문서 `harness-{task,diagram,ship,review,loop,spec,interview}`.
- **기대 결과(이 task)**: 이슈별 설계안 — 바꿀 파일·함수, CLI 표면, 문서 정본, pin 테스트, migrate·doctor 영향, 하위 호환,
  결정이 필요한 선택지와 권장안 — 을 사용자에게 승인받는다. **이 task는 설계만 한다. 코드는 바꾸지 않는다.**
- **제약**: D2(리뷰어=Codex)·D4(같은 워킹트리 단일 쓰기)·D5(이슈마다 격리 worktree·PR)·D6·D11(강제는 PR의 task 문서뿐,
  새 필수 요건은 메인테이너가 정한다, 2차 장치 규칙·신규 기능 판정 질문). 새 동작은 옵트인 또는 선언형. 기존 task 산출물 형식 보존.
  kc 고유 규약(Jira·FSD·Gherkin 태그·kc 리뷰어 기본값), push·PR·릴리스, 외부 서비스 쓰기는 범위 밖.

## 범위 (In / Out)
- **In**: A1–A6 설계안, 브리프 사실 재확인(현재 main), 결정 목록. 승인 뒤 이슈별 task·worktree 분할 계획.
- **Out**: 구현·테스트 변경(2단계, 승인 뒤 이슈별 task에서), 릴리스, kc 고유 규약, 외부 게시.

## 원천 검토 (R1)
*원천 문서 사이의 충돌·누락·모순을 Plan 전에 검토한다.*

### 원천
- 브리프: 사용자가 붙여 넣은 "team-harness 개선 — kc-platform 실사용 회고 반영 (A1–A6)" (2026-11-18)
- 저장소: `AGENTS.md`·`CLAUDE.md`·`MAINTAINING.md`(반복 실수 규칙표), `docs/decisions.md`(D2·D4·D5·D6·D7·D11),
  `docs/harness-cycle.md`(§2·§4-3·§4-6), `commands/harness-{task,diagram,ship,review,loop,spec,interview}.md`
- 코드: main `a39859a`(0.56.0) — `src/commands/{review,diagram,pr-check,task,clean}.mjs`, `src/cli-args.mjs`, `src/task-paths.mjs`
- 로컬 CLI: codex-cli 0.169.0 `exec --help`(`-m, --model <MODEL>`), Claude Code 2.1.327 `--help`(`--model <model>`)

### 발견
**사실 대조 (브리프 0.55.0 ↔ main 0.56.0)**
- 버전: 브리프 0.55.0, 현재 0.56.0(`clean` 명령 추가 — `b7475e7`).
- 일치: `diagram.mjs:138,144`·`pr-check.mjs:72`의 `'diagram.html'` 하드코딩, `review.mjs:28` `ENGINES`,
  `review.mjs:382–383` 실행 인자(모델 인자 없음), harness-diagram 3단계 "드러낼 것 한 가지", 산출물 제약.
- 행 번호 차이: `VERIFY_KIND_SUFFIXES`는 `task.mjs:804–805`(브리프 793–794). `meta.reviews[]` 항목 조립은 `review.mjs:595`,
  push는 `:607`(브리프 596).
- 브리프에 없던 형제 경로: `src/commands/clean.mjs:113` `TASK_FILE` 정규식이 `-diagram.(html)`만 안다(0.56.0 신규).
  `skills/harness-diagram/SKILL.md:22`("one file"), `templates/docs/README.md:18,61`, `templates/AGENTS.md.hbs:108`.
- 브리프에 없던 기존 표면: `.harness/reviewers.json`은 이미 있다 — `custom.command` 스키마(`review.mjs:193–215`,
  `commands/harness-review.md` custom 절). A6 프로필은 이 파일과 공존해야 한다.

**충돌·누락**
- **A5 nudge 모순** — 브리프는 "기본 nudge"인데 `task`가 plan에 `- [ ] [사람] …`을 넣으면 `done` 가드가
  미완 체크박스로 막는다(= hard block). 출처: 브리프 A5 ↔ `commands/harness-task.md`(다이어그램 4번 "`- [ ]`로 열어 두면 done 가드가
  막는다"), D11·MAINTAINING "새 필수 요건은 메인테이너가 정한다. 기본값은 권장이다". "설정 기본값"은 팀 공유 위치가 없다
  (`.harness/config.json`은 사용자별·gitignore — 브리프 A6 스스로 배제). `<검토자>`는 생성 시점에 출처가 없다.
  → 결정(2026-11-18, 사용자 = 메인테이너): 취지는 "구현에 들어가기 전에 사용자가 spec을 한 번 검토"다. 구현 전 사람 검토를 **기본**으로 한다 —
  메인테이너가 정한 기본값이라 D11·MAINTAINING을 충족한다. 검토자는 그 task의 개발자 본인(task user)이라 출처 문제가 없다.
  `done` 차단은 검토를 끝내 하지 않았을 때만 걸리는 늦은 안전망이라 의도와 맞는다. 설정 기본값은 두지 않는다(생성 시 빼기만 가능).
  거킨·usecase-feature-id는 프로젝트 스펙이라 범위 밖. loop에도 같게 적용한다(결정 A5-2, 2026-11-18).
- **A6 저장 위치 호환** — `parseDoneEvidenceDeclaration`(`task.mjs:630`)은 모르는 키를 `invalid`로 거부한다.
  `"reviewer"` 키를 쓴 spec은 팀원의 옛 전역 CLI에서 `done`이 막힌다. 템플릿의 Done evidence 블록은 주석 처리돼 있고 예시는
  `"review": "required"`라, 주석을 벗기면 의도하지 않은 required가 켜진다. "누가 리뷰하나"는 증거 요건이 아니다(범주 혼합).
  기존 task에 `task --reviewer`는 사람이 쓴 spec(SSOT)을 CLI가 고치는 첫 사례가 된다.
  → 결정(2026-11-18 사용자 승인, A6-1): Done evidence `"reviewer"` 키. `task --reviewer`는 `created:`일 때만 새 블록을 쓰고 기존 task에는 거부한다. CHANGELOG 첫 줄에 팀 전원 최소 버전을 적는다.
- **A1 doctor** — 브리프는 "doctor가 새 경로를 인식"인데 doctor에는 다이어그램 검사가 없고,
  `commands/harness-task.md` 옵트인 2번은 "doctor 체크를 만들지 않는다"고 못 박는다.
  → 결정(2026-11-18 사용자 승인, A1-2): doctor는 바꾸지 않는다 — 기존 계약 유지. 새 경로 인식은 pr-check·clean만.
- **task 구조** — 브리프 1단계는 "이슈 묶음을 task로", 2단계는 "이슈 하나 = PR 하나". `pr-check`(D11 유일 강제)는
  PR마다 그 브랜치의 task 문서를 요구하고, 한 task의 plan·artifact를 6개 브랜치가 고치면 충돌하며 PR→머지→`done` 순서가 모호해진다.
  → 결정(2026-11-18 사용자 승인): 이 task는 설계 전용으로 문서만 담은 PR로 머지한다. 2단계는 이슈마다 격리 worktree·새 task·PR 하나이고, 해당 설계 절을 그 spec에 직접 옮겨 쓴다.
- **A4 문법 충돌** — `(open → ask:<역할>)`은 기존 이월 문법 `(open → <대상>)`과 겹친다. interview 열린 질문 검사는
  대상이 적힌 `(open → …)`을 통과시키므로 답이 없는 질문이 게이트를 통과한다. R1 절은 이월 자체를 금지한다
  (`commands/harness-interview.md:44–51`). handler 발견 방식(rule·skill)은 정의돼 있지 않다. `(open)`은 산문 규약뿐이고 src 파서는 없다.
  → 결정(2026-11-18 사용자 승인, A4-1·A4-2): 이월과 섞이지 않는 별도 태그 `ask:` → `asked:` → `answered` → 반영 후 삭제. 세 상태 모두 열린 질문 검사·R1을 통과하지 못한다. handler 발견 장치는 두지 않고 목록 출력과 실행 제안만 한다.
- **A2 생산 주체** — 하네스는 그리지 않는다(harness-diagram "손으로 대신 그리지 않는다"). HTML 안 `<svg>`를 떼어 내면
  문서 `<style>`·CSS 변수·폰트를 잃는다. "GitLab self-managed가 SVG를 이미지로 렌더한다"는 브리프의 진술이고 여기서 검증하지 못했다.
  → 결정(2026-11-18 사용자 승인, A2-1): 새 뷰의 산출물은 단독 SVG 하나다. 상류 스킬에 SVG를 직접 내게 하고 CLI는 자립성만 검사한다. CLI 추출은 기각. GitLab·Obsidian 렌더는 구현 task 첫 단계에서 실측한다.
- **A2·A3와 2차 장치 규칙(D11)** — A2는 다이어그램을 PR에 "보여 주기" 위한 새 장치다. 규칙상 원래 장치를 줄이는 안
  (뷰 산출물을 SVG 하나로)을 먼저 검토하고 기각 사유를 spec에 남겨야 한다. A3 `<name>-brief.html`도 HTML이라 A2가 풀려는 문제
  (GitLab이 `.html`을 소스로 보여 줌)를 그대로 가진다.
  → 결정(2026-11-18 사용자 승인): A2는 원래 장치를 줄이는 쪽(HTML+SVG 이중화 대신 SVG 하나)을 택해 2차 장치 규칙을 충족한다. A3 슬라이드는 작성자 본인의 구현 전 검토용이라 MR 렌더를 요구하지 않는다.
- **A3 계약 자기모순** — "새 사실을 만들지 않는다"는 결정론 렌더러여야 보장되는데, "probe → degrade → record"는
  외부 도구가 있을 때만 의미가 있다. 슬라이드 동반 플러그인은 없고 개인 도구 의존은 D11 비범위다.
  → 결정 방향(2026-11-18 사용자): 브리프 슬라이드는 A5 검토 게이트의 **검토용 중간 산출물**이다("빠르게 확실히 검증 가능").
  보류하지 않고 A5와 한 기능으로 묶는다. 생성 방식은 결정 A3-1(결정론 CLI 권장).
  → 결정(2026-11-18 사용자 승인, A3-1): 결정론 CLI `harness-team brief`. spec 절만 렌더하므로 새 사실이 생기지 않고 probe·degrade는 적용하지 않는다.
- 열람 경로: 검토자가 작성자 본인이므로 로컬 브라우저·Obsidian이다MR 렌더는 요구하지 않는다.
  (미검증: Obsidian에서 CSS scroll-snap 슬라이드가 동작하는지 — 구현 task 첫 단계에서 실측)

- 검토 완료: 2026-11-18 — 결정 반영 후 재대조, 남은 `(unresolved)`·`(open)` 없음

## 설계 / 접근

### 공통
- **판정 질문(D11)** — A1·A2: S2 plan 다이어그램·S7 PR 다이어그램. A4: S1·R1. A5+A3: S2 게이트(구현 전 검토)와 그 검토 산출물. A6: R2 루브릭·S6 R3.
  언어·도구 지식은 없다(프리셋 불필요). 2차 장치에 해당하는 것은 A2·A3 — 위 발견 참조.
- **task 구조(권장)**: 이 task는 설계 전용(문서만)이다. 승인 뒤 이슈마다 격리 worktree에서 새 task(`review-model`·`diagram-views`·
  `diagram-svg`·`human-review-gate`·`task-brief`·`spec-ask-markers`)를 만들고, 해당 절을 그 spec에 **직접** 옮겨 쓴다(포인터 껍데기 금지).
  이 task는 문서만 담은 PR로 먼저 머지해 보조 참조가 된다.
- **생성 시 질문 통합**: 다이어그램(옵트인)과 구현 전 검토 게이트(기본 포함 — 뺄 수 있음)를 따로 묻지 않고 `AskUserQuestion` 한 번
  (multiSelect)으로 묻는다. 슬라이드는 게이트의 검토 산출물이라 따로 묻지 않는다 — 정본은 `commands/harness-task.md` 옵트인 절.

### A6 — review 엔진과 모델 분리 (1순위)
- **CLI**: `harness-team review [codex|claude|custom] [--model <id>] …`. `--model`은 `src/cli-args.mjs:18` `VALUE_FLAGS`와 `:91–93` review
  flags에 추가. `custom`과 함께 쓰면 거부(셸 템플릿에 실을 자리가 없다). 검증: 빈 값·공백·선행 `-` 거부(argv 주입 방지).
  실행: `review.mjs:382` `['exec', '--sandbox', 'read-only', '-m', model, prompt]`, `:383` `['-p', '--permission-mode', 'plan', '--model', model, prompt]`.
- **프로필**: `.harness/reviewers.json`에 `profiles`·`default`를 더한다. 기존 `custom` 키와 공존:
  `{ "custom": { "command": "…" }, "profiles": { "<name>": { "engine": "codex", "model": "<id>" } }, "default": "<name>" }`.
  `engine`은 `ENGINES` 중 하나, `custom` 프로필은 `model`을 갖지 않는다. 깨진 스키마는 실행 전에 error 패킷.
- **우선순위**: ① 위치 인자 엔진(+ `--model`) — 완전 명시, 프로필 무시 ② task가 고른 프로필 ③ `reviewers.json` `default`
  ④ probe 체인 codex → claude(D2 불변). ②·③의 엔진이 PATH에 없으면 **error**다 — 명시 선택을 조용히 폴백하지 않는다(위치 인자와 같은 규칙).
- **기록**: `meta.reviews[]` 새 항목에 `model: <id>|null`(`null` = 엔진 기본 모델, 키 없음 = 이전 기록 — base·mergeBase의 "null이지
  생략이 아니다" 선례). artifact `- engine:` 줄(`review.mjs:127`)에 `· model: <id>`. `<!-- harness:review … -->` 마커(`:117`)와
  kind는 바꾸지 않는다 — `REVIEW_MARKER_RE`(`task.mjs:799`)·verify 판정 무변경. 기존 기록은 소급하지 않는다.
- **task별 선택**: `task <name> --reviewer <profile>` — `created:`일 때만 spec에 기록하고, 기존 task에는 거부하며 spec 손 편집을 안내한다
  (CLI가 사람이 쓴 spec을 고치지 않는다). 저장 위치는 결정 A6-1:
  (권장 가) 브리프대로 Done evidence `"reviewer": "<profile>"` — 파서(`task.mjs:600–650`)에 키 하나. 생성 시 주석 예시를 벗기지 않고 새 블록
  `{ "version": 1, "reviewer": "<p>" }`을 쓴다. 비용: 옛 CLI의 `done`이 `알 수 없는 키`로 막힌다 → CHANGELOG 첫 줄에 "팀 전원 ≥ 이 버전" 명시
  (`scenarios` 키 도입과 같은 선례). (나) spec에 별도 `## Reviewer` 한 줄 — 옛 CLI가 무시해 호환이 깨지지 않고 "증거 요건"과 범주가
  섞이지 않지만 새 파서·템플릿 절이 생긴다. (다) meta.json — 호환은 안전하나 기계 상태라 팀 가시성이 낮고 브리프 의도와 다르다.
- **같은 프로필을 쓰는 곳**: loop QA 6(`--framing scenario`)·7(R3)은 엔진을 생략하고 부르므로 ②→④ 규칙을 그대로 탄다 — 코드 분기 없음.
  `commands/harness-loop.md` "`<engine>`을 생략하면 폴백 체인" 문장만 "프로필 → 폴백 체인"으로.
- **문서 정본**: `commands/harness-review.md` 1단계(엔진 결정·우선순위)·runner 표(모델 인자)·custom 절(스키마)·5단계(meta 필드).
  `commands/harness-task.md`(`--reviewer`). README 명령 레퍼런스.
- **테스트**: `tests/review-command.test.mjs`(우선순위·거부·argv·meta `model`), `tests/cli-args.test.mjs`(플래그 등록), runner 표 ↔
  `review.mjs` pin, Done evidence 파서(A6-1이 spec 저장이면 `tests/done-guard.test.mjs`).
- **migrate·doctor**: migrate 없음(옵트인 파일). doctor는 `reviewers.json` 스키마 오류 경고를 선택 추가(결정 아님 — 구현 시 판단).
- **호환**: `reviews` 키 없는 구 meta는 종전대로 artifact 마커만(`review.mjs:605`). 모델 미지정 실행은 지금과 같은 argv.

### A1 — 다이어그램 뷰 여러 개 (2순위)
- **파일(권장 A1-1 분리)**: `<name>-diagram-<view>.html`, 뷰 열거 `sequence`·`module`(`diagram.mjs`의 `VIEWS`, `FLAG_CHOICES.view`).
  기존 `<name>-diagram.html`은 이름 없는 레거시 뷰로 계속 유효. 근거: A2가 뷰마다 SVG를 두므로 이름이 맞고, GitLab은 HTML 섹션을
  어차피 렌더하지 않으며, `record`·`pr-check`가 HTML 파싱 없이 파일 존재로 판정하고, 한 뷰 갱신이 다른 뷰를 건드리지 않는다.
- **plan 단계**: 뷰마다 단계 `- [ ] spec/plan 다이어그램(sequence) 작성 → …-diagram-sequence.html`. `closeDiagramStep`
  (`diagram.mjs:54`)은 `--view`와 맞는 단계만 닫는다(`OPEN_STEP_RE` `:25` 확장). `--view` 없는 `record`는 레거시 단계·경로 그대로.
- **CLI**: `diagram record [--view <v>] [--skipped] [note]` — `VALUE_FLAGS`·`cli-args.mjs:67`. 산출물 검사 `diagram.mjs:138,144`를 뷰 경로로.
  생략 줄은 `DIAGRAM_SKIPPED_PREFIX`(`:44`)를 유지하고 사유 앞에 `[<view>]`를 붙인다(pr-check 판정 호환).
- **pr-check**: `pr-check.mjs:72–76` — 레거시·뷰 HTML·뷰 SVG 중 하나라도 있으면 권장 안내를 내지 않는다(`git ls-tree`로 task 폴더 나열).
- **doctor**: 바꾸지 않는다(결정 A1-2 — 기존 계약 유지 권장).
- **형제 경로**: `clean.mjs:113` `TASK_FILE`에 `diagram(?:-[a-z]+)?`·`svg`(+ A3 채택 시 `brief`). `task-paths.mjs:21` kind 주석.
- **문서 정본**: `commands/harness-task.md` 옵트인 절(단계 형식·경로) — 정본. `commands/harness-diagram.md` 3단계(뷰마다 "드러낼 것 한 가지"),
  6단계(출력 파일), 7단계(`--view`). `commands/harness-ship.md` 6단계 산출물 서술. `skills/harness-diagram/SKILL.md:22`.
  `templates/docs/README.md:18,61`. `templates/AGENTS.md.hbs:108`·이 저장소 `AGENTS.md`는 레거시 경로가 여전히 참이라 **바꾸지 않는다**
  (eager 예산·migrate-templates 이전 sha 등록 회피).
- **테스트**: `tests/diagram-command.test.mjs`, `tests/pr-check.test.mjs`, `tests/clean.test.mjs`, `tests/cli-args.test.mjs`.
  `templates/docs/README.md`를 고치면 `tests/migrate-templates.test.mjs` 이전 판 sha 등록(MAINTAINING 규칙표).
- **호환**: 기존 task·레거시 단계·레거시 파일 동작 불변.

### A2 — PR용 단독 SVG (3순위, A1 위에)
- **결정 A2-1(2차 장치 규칙)**: (권장) 새 뷰의 산출물을 `<name>-diagram-<view>.svg` **하나**로 — Obsidian·GitLab·GitHub가 모두 SVG를 이미지로
  보이면 HTML·SVG 이중화와 드리프트가 사라진다. 대안: 브리프대로 HTML + SVG 둘 — 그때 상류 스킬에 두 파일을 요구하고 CLI는 검증만.
  CLI 추출(HTML에서 `<svg>` 떼기)은 기각 — 문서 스타일·CSS 변수·폰트를 잃어 인라인화가 필요해진다.
- **검증(어느 안이든)**: `diagram record --view <v>`가 SVG 자립성을 결정론으로 검사 — `<script`·`<foreignObject`·외부 `href`/`xlink:href`
  (http/https/`//`)·`@import`·`url(http` 없음, 루트 `xmlns`. 위반이면 exit 1, 아무것도 쓰지 않음.
- **안내**: `pr-check` notes에 `· PR 본문에 링크: <path>.svg`(막지 않음). `commands/harness-ship.md` 6단계에 "PR 본문에 SVG 링크".
  `commands/harness-diagram.md` 6단계 제약에 system font stack·외부 자산 0.
- **미검증**: GitLab self-managed SVG 렌더(브리프 진술), Obsidian의 `.svg` 단독 열람. 구현 task의 첫 단계에서 실측한다.

### A5 + A3 — 구현 전 사람 검토 게이트와 검토용 슬라이드 (4·5순위, 한 기능 · PR 둘)
**취지(2026-11-18 사용자)**: 구현에 들어가기 전에 사용자가 spec을 한 번 검토하는 절차를 기본으로 한다. 그 검토를 빠르고 확실하게 하도록
spec에서만 뽑은 HTML 슬라이드를 중간 산출물로 준다. 거킨·usecase-feature-id는 프로젝트 스펙이라 범위 밖.

- **게이트 단계(A5)**: 신규 task 생성(`created:`)이면 `harness-team task`가 `## 단계` **맨 위**에
  `- [ ] [사람] spec 검토 승인 — <user>`를 기본으로 넣는다(`task.mjs:493` 생성 경로 — `taskPlanTemplate` `:176`). 생성 시 통합 질문에서 빼면
  `task <name> --no-review-gate`로 넣지 않는다. 기존 task·`activated:`·`reopened:`에는 손대지 않는다(소급 없음).
  새 meta 필드·새 Done evidence 키 없음 — "plan.md가 곧 상태".
- **누가 켜나**: 에이전트는 사용자가 대화에서 **명시적으로 승인한 뒤에만** `[x]`로 바꾸고 artifact `## 결과`에 `- 검토 승인: <날짜> · 슬라이드 <경로|없음>`을
  남긴다. 승인 전에는 task 문서 밖 파일을 고치지 않는다(규범 — `commands/harness-task.md`).
- **강도**: 프롬프트 수준(SessionStart의 "plan 첫 미완 단계" 주입이 이 단계를 가리킴 + loop 진입 + 위 규범). 끝내 검토하지 않으면 기존 `done` 가드가
  미완 체크박스로 막는다(늦은 안전망). 커밋·쓰기 차단은 두지 않는다 — D11이 "task 시작 강제(쓰기 차단·pre-commit)"를 경계 모호로 기각.
- **결정 A5-2(loop 적용) — 확정(2026-11-18 사용자): 게이트·슬라이드 모두 loop에도 같다.** loop는 사람 없이 구현이 이어지는 경로라 사전 검토가 가장 필요한 곳이고,
  `docs/harness-cycle.md` §4-3도 "spec·plan은 개발자가 확정한 뒤 loop"를 전제한다. loop 진입 1번에 "`[사람]` 단계가 미완이면 멈춤"을 더하고,
  Dev는 `[사람]` 단계를 구현하지 않는다. 대안: 비-loop만(초안 문구) — 그러면 loop 진입 질문이 승인을 대신하는데, 그 질문은 "어떻게 진행할까"이지
  "spec이 맞는가"가 아니라서 검토를 대신하지 못한다.
- **슬라이드(A3)** — 결정 A3-1 **권장: 결정론 CLI** `harness-team brief [--stage spec|ship]`. spec 절(목적·범위·설계·Ontology·R1 발견·
  `(open)`/`(unresolved)` 항목, 선언돼 있으면 Done evidence `scenarios`)을 그대로 슬라이드로 렌더해 `<name>-brief.html`을 쓴다.
  CSS scroll-snap·script 0·외부 자산 0·system font stack. 슬라이드마다 출처 절 이름을 단다. LLM이 쓰지 않으므로 "새 사실 0"이 구조로 보장되고,
  probe할 외부 도구가 없어 probe → degrade 계약은 적용하지 않는다(브리프의 자기모순 해소). 비용: 작은 마크다운 부분집합 렌더러(목록·굵게·코드·표).
  `--stage ship`은 plan 단계·artifact 결과를 더한다(후순위, 첫 PR에서 빼도 됨). 대안: 에이전트 작성 + `brief record` 검사 — 새 사실 0을 보장하지 못한다.
- **명령 표면**: CLI 서브커맨드 `brief`(`bin/harness-team.mjs` router, `cli-args.mjs` COMMANDS·`FLAG_CHOICES.stage`). 슬래시 명령은 새로 만들지 않고
  `commands/harness-task.md` 게이트 절이 `harness-team brief`를 부른다 — manifest-sync 표면(명령 문서·스킬·plugin.json)을 늘리지 않는다.
- **형제 경로**: `clean.mjs:113` `TASK_FILE`에 `brief`, `task-paths.mjs:21` kind 주석, `templates/docs/README.md` 트리(생성물·비-SSOT).
- **문서 정본**: `commands/harness-task.md`(게이트 단계·승인 규칙·`brief` 호출·통합 생성 질문), `commands/harness-loop.md` 진입,
  `docs/harness-cycle.md` §2 S2 "현재" 열(△ → ✓).
- **테스트**: `tests/task-templates.test.mjs`(삽입 형식·`--no-review-gate`), 새 `tests/brief-command.test.mjs`(script·외부 참조 0, spec 밖 문자열 0 —
  렌더 결과의 텍스트가 모두 spec 원문의 부분 문자열인지), `tests/loop-command.test.mjs`, `tests/cli-args.test.mjs`, `tests/clean.test.mjs`.
- **호환**: 기존 task 불변. 새 task의 plan 템플릿 첫 단계가 바뀌므로 pr-check의 "템플릿 그대로" 판정(`pr-check.mjs` `doc.template`)과 같은
  템플릿 함수를 쓰는지 확인한다.
- **PR 분할**: ① `human-review-gate`(단계 삽입·loop·규범) ② `task-brief`(`brief` CLI). ②는 ① 뒤.

### A4 — spec `(open)` 외부 질의 상태 계약 (6순위, 문서만)
- **결정 A4-1(문법)**: (권장) 이월과 섞이지 않는 별도 태그 — `- (ask:<역할>) <질문>` → `- (asked:<역할> <YYYY-MM-DD> <링크>) …` →
  `- (answered <링크>) …` → spec 반영 후 마커 삭제(기존 "반영되면 지운다" 유지). 대안: 브리프의 `(open → ask:<역할>)` 유지 + interview 문서에
  "`ask:` 대상은 이월 대상이 아니다" 예외 명시.
- **결정 A4-2(게이트)**: (권장) `ask`·`asked`·`answered`는 열린 질문 검사를 통과하지 못한다(답 없는 질문은 요구가 아니다). R1 절에서도 같다.
- **handler(권장: 발견 장치 없음)**: harness-spec 6단계·harness-interview가 끝에 역할별 `ask` 목록을 내고, 프로젝트가 정한 rule·skill이
  있으면 그 실행을 **제안만** 한다. 하네스는 게시하지 않고, 상태 전이(`asked`·`answered`)는 사람이 적는다. 새 설정 키 없음.
- **문서 정본**: `commands/harness-spec.md` 6단계, `commands/harness-interview.md` 열린 질문 검사·R1. spec 템플릿 문구(`task.mjs:118,128`).
  src 파서 없음 — pin 테스트만(`tests/task-templates.test.mjs` 템플릿 문구).

### 2단계 순서·격리
- A6 → A1 → A2 → A5 → A3(보류 시 제외) → A4. A4는 문서만이라 어느 시점에 끼워도 된다.
- 병렬 가능(D5, 파일 무중첩): A6 ∥ A1 ∥ A4. 순차: A2는 A1 뒤. A5는 A6와 `task.mjs`·`cli-args.mjs`를 같이 고쳐 A6 뒤.
  모든 PR이 `CHANGELOG.md`를 고치므로 그 절은 머지 순서대로 rebase.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **뷰(view)**: 한 task 다이어그램이 드러내는 관점 하나 — `sequence`(시간 순 상호작용), `module`(구성요소·의존 관계). 파일 하나 = 뷰 하나.
- **리뷰 프로필(reviewer profile)**: `.harness/reviewers.json`의 이름 붙은 `{engine, model}`. kind에는 들어가지 않는다 — kind는 엔진과 프레이밍만.
- **사람 검토 단계**: plan `## 단계`의 `[사람]` 체크박스. 사람이 켜는 S2 게이트(구현 전 spec 검토)의 기록이며, 신규 task에 기본으로 들어간다(생성 시 뺄 수 있음).
- **외부 질의(ask)**: spec 안에서 답을 외부 역할(PM·디자이너 등)에게 받아야 하는 열린 질문. 하네스는 목록만 내고 게시하지 않는다.
- 게이트 근거(2026-11-18): 설계 결정 전부 확정 — A5 기본값·A5-2(사용자 결정), A1-1·A1-2·A2-1·A3-1·A4-1·A4-2·A6-1·task 구조(권장안 승인). R1 검토 완료. 이 task의 목표는 승인된 설계이고, 구현 진입 게이트는 이슈별 task spec이 각자 다시 통과한다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — A1–A6 설계를 승인받아 이슈별 task로 넘긴다
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — 결정 전부 `→ 결정:`으로 닫힘 + 문서만 담은 PR이 `pr-check` 통과. 이슈별 Done evidence는 각 task spec
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 — 1.0(2026-11-18)

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "optional" ("required"면 소스가 바뀔 때 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
<!--
```json
{ "version": 1, "review": "required", "tests": "required" }
```
-->

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 결정 기록: R1 `### 발견`의 `→ 결정:` 줄(2026-11-18). 설계 절의 "권장"은 모두 채택됐다.
- 다이어그램 옵트인: 2026-11-18 생성 시 질문 — 건너뜀(plan에 단계 없음).

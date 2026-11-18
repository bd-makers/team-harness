# diagram-svg — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.
다른 역할에 물어야 하면 `- (ask:<역할>) …` → `(asked:<역할> <날짜> <링크>)` → `(answered <링크>)`로 상태를 적고, 반영하면 지운다.*

- **문제**: task 다이어그램은 HTML이다(`<name>-diagram.html`, A1의 뷰 파일 `<name>-diagram-<view>.html`). GitLab·GitHub는
  저장소의 `.html`을 소스 텍스트로 보여 주므로 PR/MR 리뷰어가 다이어그램을 볼 수 없고, Obsidian 공식 지원 형식에도 `.html`은 없다
  (kc-platform 회고 A2, 설계 task `team-harness-improvements`).
- **영향**: `diagram record --view`·`pr-check`·`clean` CLI, 다이어그램 옵트인 문서(`commands/harness-{task,diagram,ship}.md`,
  `skills/harness-diagram/SKILL.md`, `templates/docs/README.md`). 하네스를 쓰는 모든 소비자 프로젝트의 PR 작성자·리뷰어.
- **기대 결과**: 뷰 산출물은 단독 SVG `<name>-diagram-<view>.svg` 하나다(결정 A2-1). `diagram record --view <v>`가 그 SVG의
  자립성을 결정론으로 검사하고(위반이면 exit 1, 아무것도 쓰지 않음), `pr-check`가 뷰 SVG를 다이어그램으로 인정하며 PR 본문에 걸
  경로를 안내한다(막지 않음).
- **제약**: 레거시 `<name>-diagram.html`·레거시 단계·`--view` 없는 `record`의 동작은 바뀌지 않는다(자립성 검사도 없음). 새 동작은
  옵트인(뷰 단계)이다. 하네스는 그리지 않는다 — SVG는 상류 스킬이 직접 내고 CLI는 검사만 한다(A2-1, CLI 추출 기각).
  doctor·`AGENTS.md`·`templates/AGENTS.md.hbs`는 바꾸지 않는다. push·PR·릴리스는 범위 밖.

## 범위 (In / Out)
*`- **In**: …`에 이번 task가 바꾸는 것(파일·모듈·동작)을, `- **Out**: …`에 하지 않기로 한 것과 그 이유 한 줄을 쓴다 —
요청하지 않은 기능·관련 없는 리팩터링이 섞이지 않게 긋는 경계다.*

- **In**: 뷰 kind `diagram-<view>.svg`(`src/task-paths.mjs` `diagramKind`), SVG 자립성 검사(`src/commands/diagram.mjs`),
  `pr-check` 뷰 SVG 인정·링크 안내(`src/commands/pr-check.mjs`), `clean` `TASK_FILE` 확장자(`src/commands/clean.mjs`), 테스트,
  문서 5곳(harness-task 옵트인 절 정본·harness-diagram 6·7·harness-ship 6·SKILL·templates/docs/README), CHANGELOG `[Unreleased]`.
- **Out**: 레거시 HTML의 자립성 검사(호환 — 레거시는 그대로). HTML→SVG 추출(A2-1 기각). doctor(A1-2와 같은 이유 — 기존 계약 유지).
  `AGENTS.md`·`templates/AGENTS.md.hbs`(레거시 경로가 여전히 참). A1 리뷰가 남긴 후보(오류 안내 `--target` 전파, `## 단계` fence 인식,
  산출물 디렉터리 통과, `TASK_FILE` kind별 확장자) — 상위 지시로 A2 범위가 아니다. 과거 task 문서(`docs/chad/diagram-views` 등)는 이력이라 고치지 않는다.

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`(다른 역할에 물을 것이면 `(ask:<역할>)`)으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- 설계 정본: `docs/chad/team-harness-improvements/team-harness-improvements-spec.md` "A2 — PR용 단독 SVG" 절과 R1 결정 A2-1
  (새 뷰의 산출물은 단독 SVG 하나, 상류 스킬이 SVG를 직접 내고 CLI는 자립성만 검사, CLI 추출 기각) — PR #184.
- A1 결과물: `docs/chad/diagram-views/diagram-views-spec.md`(뷰 `sequence`·`module`, `DIAGRAM_VIEWS`·`diagramKind`·`record --view`) — PR #188(`74aa5bb`).
- 상위 세션 지시(2026-11-18): A2 구현 범위·완료 기준·범위 밖 후보. A1 인계 노트(`a1-diagram-views.md`): `anyDiagramAt`·`TASK_FILE`·`diagramKind`가 이어받을 지점.
- 외부: Obsidian 도움말 원본 `obsidianmd/obsidian-help` `en/Files and folders/Accepted file formats.md`(`gh api`로 읽음 — help.obsidian.md는
  사내 웹 필터가 403). GitLab 이슈 [15284](https://gitlab.com/gitlab-org/gitlab/-/issues/15284)(MR diff가 SVG를 텍스트로 보임)·
  [24632](https://gitlab.com/gitlab-org/gitlab/-/issues/24632)(SVG blob sanitize) — 웹 검색 결과로만 봤다.

### 발견
- **렌더 실측(설계의 미검증 항목)** — 구현 첫 단계에서 실측할 수 있는지 확인했다.
  - Obsidian: 앱은 이 머신에 있다(`/Applications/Obsidian.app`). 실측은 GUI 조작(computer-use 앱 권한 승인)이 필요해 이 무인 세션에서 하지 않았다.
    문서 근거: Obsidian 공식 지원 형식의 Images에 `.svg`가 있다(`.html`은 목록에 없다).
  - GitLab self-managed: 이 저장소의 원격은 GitHub이고 사내 GitLab에 쓰기(push·업로드)는 권한·지시 밖이라 실측하지 못했다.
    참고: GitLab 이슈 15284는 MR diff가 SVG를 이미지가 아니라 텍스트로 보인다고 보고한다(현재 상태는 확인하지 않음) — diff 뷰에 기대지
    않고 PR/MR 본문에 링크를 거는 설계 안내의 근거다.
  → 결정(2026-11-18): 두 렌더 모두 **미검증**으로 남긴다(`## 참고`). 설계 A2-1은 승인된 결정이라 실측 없이 진행하고, 사용자가 Obsidian·사내 GitLab에서
  확인할 후속으로 넘긴다.
- **뷰 HTML을 SVG로 바꿀지, 둘 다 받을지** — A1은 뷰 산출물을 `<name>-diagram-<view>.html`로 머지했다. A2-1은 "HTML+SVG 이중화 대신 SVG 하나"다.
  사실: A1(`74aa5bb`)은 `v0.56.0` 태그에 없고(`git merge-base --is-ancestor 74aa5bb v0.56.0` 실패) CHANGELOG `[Unreleased]`에만 있다. 저장소에 추적되는
  `*-diagram-{sequence,module}.html`이 없다(`git ls-files`). 둘 다 받으면 한 뷰에 두 형식이 생겨 `record`가 어느 쪽을 검사할지·둘이 갈릴 때 무엇이 정본인지가
  새로 생긴다 — A2-1이 없애려던 드리프트다.
  → 결정(2026-11-18): **뷰 산출물은 `.svg`로 교체한다. 뷰 HTML은 받지 않는다.** 레거시 `<name>-diagram.html`은 HTML 그대로 유효하다.
  남는 위험: 하네스 마켓플레이스 항목에 sha 핀이 없어 #188 뒤 main을 설치한 사람이 뷰 HTML을 만들었을 수 있다 — 그 경우 `pr-check`는 막지 않고 권장 안내만
  내며 `record --view`는 `.svg`가 없다고 exit 1로 알린다. A1 CHANGELOG 항목은 같은 릴리스로 나가므로 `.svg`로 고쳐 쓴다(모순되는 두 줄을 남기지 않는다).
- **자립성 검사의 범위** — 설계 목록은 `<script`·`<foreignObject`·외부 `href`/`xlink:href`(http/https/`//`)·`@import`·`url(http`·루트 `xmlns`다.
  같은 문법의 형제가 빠져 있다: 상대 경로·`file:`·`javascript:` href, `url(//…)`·`url(font.woff)`, 이벤트 핸들러 속성(`onload=` — 스크립트), HTML 문서를 `.svg`로
  이름만 바꾼 경우. SVG를 `<img>`로 보이는 뷰어(Markdown 이미지·Obsidian)는 외부 자원을 불러오지 않으므로 http만 막으면 나머지는 조용히 깨진다.
  → 결정(2026-11-18, MAINTAINING "문법·형제 경로 전체"): 거부 목록이 아니라 허용 목록으로 검사한다 — `href`·`url()` 값은 `#…`(문서 안)·`data:`·빈 값만 허용.
  `<script`·`<foreignObject`(접두사 포함, 대소문자 무시)·태그 안 `on<이름>=` 속성·`@import`는 언제나 위반. 루트는 XML 선언·주석·DOCTYPE 뒤 첫 요소가
  `<svg`이고 그 시작 태그에 `xmlns="http://www.w3.org/2000/svg"`. `xmlns`·DOCTYPE의 URI는 참조가 아니라 식별자라 검사하지 않는다. 주석 안도 검사한다
  (보수적 — 오탐 비용은 주석 한 줄 수정, 미탐 비용은 PR에서 조용히 깨진 그림).
- **PR 본문 링크의 형태** — 설계는 `pr-check` notes `· PR 본문에 링크: <path>.svg`다. GitHub PR 본문의 저장소 상대 경로는 저장소 파일의 Markdown처럼 풀리지
  않는 것으로 알고 있으나 여기서 확인하지 않았다. GitLab MR 설명의 상대 경로 해석도 확인하지 않았다.
  → 결정(2026-11-18): `pr-check`는 저장소 상대 경로만 낸다(forge를 모른다 — 출력이 결정론). ship 문서가 "PR head의 파일 URL(blob)로 건다"를 안내하고
  상대 경로 해석은 미검증으로 남긴다.
- **상류 스킬의 형식** — 동반 플러그인 diagram-design(핀 `0ab077f`)은 inline SVG HTML을 내고 예시 자산이 문서 `<style>`의 CSS 변수(`var(--…)`)를 쓴다.
  거기서 `<svg>`만 떼면 자립성 검사는 통과해도 스타일 없이 그려진다(A2-1이 CLI 추출을 기각한 이유와 같다).
  → 결정(2026-11-18): harness-diagram 6단계가 뷰마다 상류 스킬에 **단독 `.svg`를 직접** 요구한다 — 스타일은 `<svg>` 안 `<style>`, system font stack,
  외부 자산 0. 상류가 단독 SVG를 내지 못하면 degrade(`--skipped`)다. HTML에서 `<svg>`를 손으로 떼지 않는다.
- **doctor** — 설계 A1-2와 같다: 바꾸지 않는다.
- 검토 완료: 2026-11-18 — 위 결정 반영 후 재대조, 남은 `(unresolved)`·`(open)` 없음

## 설계 / 접근
설계 task의 A2 절을 옮겨 쓰고 위 R1 결정(뷰 HTML 교체, 허용 목록 검사, 링크 형태, 상류 형식)을 반영해 고쳤다.

- **파일(결정 A2-1)**: 뷰 산출물은 `<name>-diagram-<view>.svg` **하나** — Obsidian·GitLab·GitHub가 SVG를 이미지로 보이면 HTML·SVG 이중화와 드리프트가
  사라진다. `diagramKind(view)`가 `diagram-<view>.svg`(뷰 없으면 레거시 `diagram.html`). 대안(브리프대로 HTML + SVG 둘)은 기각 — 위 R1.
  CLI 추출(HTML에서 `<svg>` 떼기)은 기각 — 문서 스타일·CSS 변수·폰트를 잃어 인라인화가 필요해진다.
- **plan 단계**: `- [ ] spec/plan 다이어그램(<view>) 작성 → docs/<user>/<name>/<name>-diagram-<view>.svg`. 단계 문구·닫기 규칙은 A1 그대로다.
- **검증**: `diagram record --view <v>`(생성 기록 — 첫 기록·갱신 모두)가 파일 존재 뒤, 쓰기 전에 SVG 자립성을 검사한다
  (`svgSelfContainmentViolations(text) → string[]`, 순수 함수). 위반이면 exit 1, 위반 목록을 error 패킷에 담고 artifact·plan 어느 것도 쓰지 않는다.
  `--skipped`와 레거시(`--view` 없음)는 검사하지 않는다. 규칙은 R1 "자립성 검사의 범위" 결정.
- **안내**: `pr-check` — 레거시 HTML이나 뷰 SVG 중 하나라도 rev에 있으면 권장 안내를 내지 않는다. 있는 뷰 SVG마다 notes에
  `PR 본문에 링크: <path>.svg`(막지 않음). `commands/harness-ship.md` 6단계에 "PR 본문에 뷰 SVG 링크(PR head의 파일 URL)".
  `commands/harness-diagram.md` 6단계 제약에 단독 SVG·system font stack·외부 자산 0·`<script>`·`<foreignObject>` 금지, 7단계에 `record --view`의 자립성 검사.
- **형제 경로**: `clean.mjs` `TASK_FILE` 확장자에 `svg`. `task-paths.mjs` kind 주석, `cli-args.mjs` `DIAGRAM_VIEWS` 주석.
- **문서 정본**: `commands/harness-task.md` 옵트인 절(뷰 단계 경로·산출물 형식) — 정본. harness-diagram 6·7, harness-ship 6, `skills/harness-diagram/SKILL.md`,
  `templates/docs/README.md`(docs seed는 migrate refresh 대상이 아니라 sha 등록 없음 — A1 R1).
- **테스트**: `tests/diagram-command.test.mjs`(규칙마다 위반 표본 → exit 1·plan/artifact 바이트 동일, 비슷하지만 허용되는 표본은 통과),
  `tests/pr-check.test.mjs`(뷰 SVG 인정·링크 note·뷰 HTML 불인정), `tests/clean.test.mjs`(svg 보호), `tests/agent-files.test.mjs`(문서 핀).
- **호환**: 기존 task·레거시 단계·레거시 파일 동작 불변. 뷰 HTML은 미릴리스라 교체(R1). CHANGELOG A1 항목을 `.svg`로 고쳐 쓴다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **뷰 SVG**: 뷰 하나의 산출물 `<name>-diagram-<view>.svg`. 단독 SVG 문서이며 뷰어가 `<img>`로 보여도 그대로 그려진다(자립).
- **자립성(self-contained)**: SVG가 자기 밖 아무것도 부르지 않는 상태 — 스크립트·HTML 섞기(`foreignObject`)·외부 참조(`href`·`url()`·`@import`) 0,
  루트가 SVG 네임스페이스의 `<svg>`. `diagram record --view`가 결정론으로 판정한다.
- **레거시 뷰**: A1과 같다 — `<name>-diagram.html`(HTML 그대로, 자립성 검사 없음).
- 게이트 근거(2026-11-18): 설계 결정 A2-1 확정(PR #184), 뷰 HTML 교체·검사 범위·링크 형태·상류 형식을 R1 결정으로 닫음, 렌더 실측은 미검증으로 명시.
  목표·제약·완료 기준·영향 파일이 모두 식별됨.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — 뷰 산출물을 단독 SVG로 바꾸고 `record --view`가 자립성을 검사하며 `pr-check`가 PR 링크를 안내한다
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — 레거시 불변·옵트인·CLI는 검사만(추출 기각)·doctor/AGENTS 불변
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — `npm test`·`npm run docs:check` 통과, doctor 확인, `pr-check --base origin/main` 통과, 아래 Done evidence
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — 범위 In 절의 파일 목록(`git grep` 전수)
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

- 설계 정본(보조 참조): `docs/chad/team-harness-improvements/team-harness-improvements-spec.md` A2 절.
- 미검증: Obsidian의 `.svg` 단독 열람(문서 근거만), GitLab self-managed의 SVG 렌더(blob·MR 설명), GitHub PR 본문·GitLab MR 설명의 저장소 상대 경로 해석.
  확인 방법: 이 저장소 볼트에서 뷰 SVG를 Obsidian으로 열기, 사내 GitLab MR에 뷰 SVG를 커밋하고 blob·MR 설명 링크를 보기.
- 다이어그램 옵트인: 2026-11-18 생성 시 질문 — 묻지 않고 건너뜀(상위 세션이 시작한 무인 세션, 옵트아웃 기본값 — plan에 단계 없음).

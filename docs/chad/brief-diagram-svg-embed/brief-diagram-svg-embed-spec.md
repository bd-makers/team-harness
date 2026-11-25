# brief-diagram-svg-embed — Spec

## 목적 / 요구사항
- **문제**: `harness-team brief`는 spec 절만 슬라이드로 옮긴다. 활성 task에 diagram 뷰(`<name>-diagram-<view>.svg`, `DIAGRAM_VIEWS = ['sequence','module']`)가 있어도 brief에 실리지 않아, 구현 전 검토자가 슬라이드와 SVG를 따로 연다.
- **영향**: 구현 전 사람 검토 게이트(`commands/harness-task.md`)의 검토자. 다운스트림 kc-task-brief 래퍼는 `renderBrief(spec)`를 직접 import하고 module 뷰를 이미 `<img>`로 넣는다 — 인자 하나 호출의 출력이 바뀌면 그림이 중복된다.
- **기대 결과**: `harness-team brief`가 존재하는 뷰 SVG를 `DIAGRAM_VIEWS` 순서(sequence → module)로 그림 슬라이드로 싣는다.
- **제약**:
  - 계약 유지 — 새 사실 0(텍스트 노드는 모두 spec 원문의 부분 문자열), script 0, 외부 자산 0, 같은 입력이면 같은 바이트.
  - `renderBrief(spec)` 인자 하나 호출은 0.58.4와 같은 바이트다. 뷰는 선택 두 번째 인자 `{ diagrams: [{ view, rel, svg }] }`로만 받는다.
  - `renderBrief`는 순수 함수로 남는다. 파일 읽기·자립성 판정은 `runBrief`가 한다.
  - 레거시 `<name>-diagram.html`은 싣지 않는다(script가 있을 수 있는 HTML).
  - 뷰 파일이 없거나 자립성 위반이면 실패로 끝내지 않는다 — 콘솔 한 줄과 JSON `diagrams`로 보고한다.
  - spec 절·열린 항목·scenarios가 모두 없으면 뷰가 있어도 "렌더할 절이 없음" 오류다 — 슬라이드의 사실은 spec에서 온다.

## 범위 (In / Out)
- **In**: `src/commands/brief.mjs`(`runBrief` 뷰 읽기·판정·보고, `renderBrief` 선택 두 번째 인자·그림 슬라이드), `src/cli-args.mjs` brief summary, `commands/harness-task.md`·`commands/harness-diagram.md` 한 줄씩, `tests/brief-command.test.mjs`, `CHANGELOG.md` `[Unreleased]`.
- **Out**: state·class 뷰 추가, mermaid 펜스 info string 보존, kc-task-brief 래퍼 정리 — 사용자 지시로 범위 밖. 버전 범프·what-changes 문서 — 이 저장소는 별도 `chore(release)` 커밋에서 범프한다(MAINTAINING.md 릴리스 절).
- **Out**: `splitDocument`·`stripComments`·`parseBlocks`·`renderInline`·`svgSelfContainmentViolations`의 시그니처·동작, `--stage`·`--json` 동작, 오류 패킷, `clean` 보호.

## 원천 검토 (R1)
### 원천
- 사용자가 준 task 명세(2026-11-25 대화, "brief에 diagram 뷰 SVG 삽입 (0.58.4 기준)")
- `src/commands/brief.mjs`, `src/commands/diagram.mjs` `svgSelfContainmentViolations`, `tests/brief-command.test.mjs`, MAINTAINING.md 릴리스 절

### 발견
- (unresolved) 명세는 `package.json` minor 범프를 요구하지만, 저장소 관례는 기능 PR이 `[Unreleased]`에만 적고 범프는 별도 release 커밋에서 4개 매니페스트·what-changes 문서와 함께 한다(`what-changes-latest-version.test.mjs`가 3방향 일치를 강제) → 결정: CHANGELOG `[Unreleased]`에 minor 기능으로 적고 범프는 release 단계로 넘긴다.
- (unresolved) 기존 테스트 `externalViolations`는 태그·속성 허용 목록이라 `<figure>`·`<img>`·`src`·`alt`를 거부한다 → 결정: `figure`·`img`·`alt`를 허용하고 `src`는 값이 `data:image/svg+xml;base64,<base64>`일 때만 허용한다. 기존 음성 대조(`<img src="x.png">`)는 계속 실패해야 한다.
- (unresolved) 그림용 CSS를 `STYLE`에 넣으면 인자 하나 호출의 바이트가 바뀐다 → 결정: 그림 CSS는 뷰가 하나 이상 실릴 때만 `<style>` 끝에 덧붙인다.
- (unresolved) `## 설계` 절은 하위 절마다 슬라이드를 낸다 → 결정: "설계 슬라이드 바로 뒤"는 설계 절이 낸 **마지막** 슬라이드 뒤다. 설계 절이 없으면 마지막 spec 절 슬라이드 뒤(열린 항목·scenarios 앞), spec 절 슬라이드가 없으면 맨 앞(표지 뒤)이다.
- 검토 완료: 2026-11-25

## 설계 / 접근
- `runBrief`: `DIAGRAM_VIEWS`마다 `taskFilePath(..., 'diagram-<view>.svg')`를 읽는다. 없으면 `missing`, `svgSelfContainmentViolations`가 비어 있지 않으면 `rejected`(+violations), 통과하면 `embedded`로 `renderBrief`에 넘긴다.
- `renderBrief(spec, { diagrams } = {})`: 뷰마다 `<section class="slide"><figure><img src="data:image/svg+xml;base64,…" alt="<rel>"></figure></section>`.
  - `<img>` data URI라 SVG의 `<style>`·id·텍스트가 문서로 새지 않는다(텍스트 노드 0 — 새 사실 판정 대상 밖).
  - 보이는 텍스트 노드(figcaption·제목)는 넣지 않는다. 경로(뷰 이름 포함)는 `alt`에만 둔다.
  - 결과에 `slides`(뷰 포함)·`titles`(`diagram:<view>`)·`diagrams`(실린 뷰 수)를 반영한다. "렌더할 절이 없음" 판정은 뷰를 뺀 수로 한다.
- 보고: 콘솔 `  뷰 SVG: sequence 실림 · module 없음` 한 줄(거부면 첫 위반 사유), JSON `diagrams: [{ view, path, status, violations }]`. 뷰가 없을 때 summary 문구는 0.58.4와 같다.

## Ontology
- **뷰 SVG**: `docs/<user>/<name>/<name>-diagram-<view>.svg` 단독 SVG — `view`는 `DIAGRAM_VIEWS` 중 하나.
- **그림 슬라이드**: 뷰 SVG 하나를 data URI `<img>`로 싣는 슬라이드. 텍스트 노드가 없다.
- **embedded / missing / rejected**: 뷰별 보고 상태 — 실림 / 파일 없음 / 자립성 위반으로 뺌.
- 게이트 근거: 사용자 명세가 대상 파일·보존 계약·수용 기준을 모두 정했다.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence
```json
{ "version": 1, "tests": "required" }
```

## 참고
- 0.58.4 기준선: `renderBrief(SPEC)` sha256 `4e4a0e4baa1bc91433f4f43aa27cf15e59669d1f128062a497187762a1dc393b`(tests/brief-command.test.mjs `SPEC`)
- 이 저장소에는 실제 뷰 SVG 파일이 없다 — 테스트는 합성 SVG로 한다.

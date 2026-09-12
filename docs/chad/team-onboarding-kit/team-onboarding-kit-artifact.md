# team-onboarding-kit — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`docs/` 산출물 5개 (신규 4 · 수정 1). 코드·`templates/`·훅 무변경.

| 파일 | 내용 |
|---|---|
| `index.html` (수정) | 역할별 진입로 6카드 — 5분 / 새 팀원 / 리뷰어 / 크루 운용 / 팀 소개 / 메인테이너 |
| `harness-operations-playground.html` | 운용 시나리오 구성기 — 상황·규모·게이트·리뷰·격리를 고르면 실행 순서 · 자동 훅 · 건드리는 파일 · `done` 가드 판정 · 붙여넣을 프롬프트가 바뀐다 |
| `harness-onboarding-checklist.html` | 24항목 5페이즈 — 진행률 localStorage · 게이트 경고 · 막힘 리포트 복사 |
| `harness-kickoff-deck.html` | 16장 자립형 덱 — ← → 이동 · O 개요 · S 발표자 노트 · F 전체화면 · 인쇄 시 장당 1페이지 |
| `harness-cheatsheet.html` | A4 1장 인쇄용 — 명령 8 · 4파일 · 세 게이트 · Done evidence · 하지 말 것 7 · 막혔을 때 · 자동 훅 · 채널 3 · D2~D6 |

## 검증 증거

실행 명령과 출력 (2026-09-13, base `origin/main`, tip `b8316cd`):

```text
$ npm run docs:check
harness overview 생성 상태가 최신입니다.            # exit 0

$ node /tmp/domstub2.mjs    # 운용 구성기 인터랙션 26건
전체 통과
$ node /tmp/obstub.mjs      # 온보딩 체크리스트 14건
전체 통과
$ node /tmp/dkstub.mjs      # 킥오프 덱 25건
전체 통과

$ python3 - (index.html 링크·앵커 해석 + route 카드 수)
route cards: 6  hrefs: 121  broken: 0

$ aside repl — 치트시트 p.pdf({preferCSSPageSize:true, printBackground:true})
cheatsheet.pdf pages: 1 | bytes: 515674

$ aside repl — 덱 16장 슬라이드별 scrollHeight - 720
DECK {"slides":16,"maxOver":0,"overflowing":0}
```

색상은 확장이 로드되지 않는 `--headless=new --disable-extensions`로 별도 확인했다 —
치트시트 배경 픽셀 `(17,20,27)`(= 의도한 `#12151c`), 시트는 흰 종이·검정 잉크.

## Reviews

### 2026-09-12T18:39:56.376Z — codex-shipcheck (harness-team review)

- engine: codex · scope: diff · tip: b8316cd3c81ea60957e08dd865d7e9c03debd228 · exit 0 · 2802 B

```text
전하, **PR 전 문서 정합성 보완이 필요합니다.** 로컬 `origin/main` 대비 diff를 직접 확인했으며, 파일은 수정하지 않았습니다. 변경은 `docs/` 12개 파일이고, 커밋 `b8316cd`와 미커밋 handoff 2개가 확인됩니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| S1 | spec 요구사항과 구현 대응 | BLOCKER | **fail** | [spec:30](docs/chad/team-onboarding-kit/team-onboarding-kit-spec.md#L30)은 **“역할별 진입로 7카드”**를 요구합니다. 실제 `index.html` diff에는 `class="route quick"` 1개와 `class="route"` 5개, **총 6개**만 있습니다(109·118·130·142·154·164행). 의도적 미구현 기록도 없습니다. |
| S2 | 완료 체크의 변경·커밋 실재 | MAJOR | **na** | 산출물 5개의 변경과 `b8316cd`는 확인됩니다. 덱 diff에도 **“가급적”**, **“하지 말 것 7가지”**가 있습니다. 그러나 plan:17의 **“A4 1페이지 … 오버플로 0 … DOM 스텁 인터랙션 테스트 3종 통과”**에 대응하는 실행 기록이 없어, 완료 체크 **전체**를 입증할 수 없습니다. |
| S3 | 스코프 밖 변경 없음 | MAJOR | **pass** | spec:21의 **“`docs/` 안에서만 끝낸다”**, plan:6의 **“코드·템플릿·훅은 건드리지 않는다”**와 일치합니다. diff는 HTML 산출물 5개와 해당 task 기록·상태·handoff 7개뿐입니다. handoff에도 **“post-commit hook이 자동 갱신합니다”**라고 용도가 기록돼 있습니다. |
| S4 | 실행 리뷰의 마커 기록 | MAJOR | **na** | artifact:23은 **“없음 — … `review: optional`”**, meta diff는 **`"reviews": []`**입니다. 이전에 완료된 리뷰의 실행 증거가 없어 누락 여부를 확정할 수 없습니다. `optional` 선언만으로 모든 실행 리뷰가 기록됐다고 판정하지 않았습니다. |
| S5 | 검증 보고의 명령·출력 증거 | BLOCKER | **fail** | artifact:17–19는 **“1페이지 … 오버플로 0 … 전부 통과, `npm run docs:check` green”**이라는 산문 선언입니다. 실제 출력 인용이나 실행 로그 참조가 없습니다. `printToPDF`라는 API 이름과 통과 건수만으로는 요구된 증거 형식을 충족하지 못합니다. |

이번 재확인에서는 `npm run docs:check`가 exit 0으로 **“harness overview 생성 상태가 최신입니다.”**를 출력했습니다. 읽기 전용 파서도 `route cards: 6`, `hrefs: 121`, `errors: []`, 체크리스트 24항목·5페이즈, 덱 16장을 확인했습니다. 이는 과거 PDF·레이아웃·인터랙션 검증의 실행 증거를 대신하지 않습니다.

**Verdict: FAIL — S1(7카드 요구와 실제 6카드 불일치), S5(검증 보고에 실제 명령·출력 증거 부재).**
```

<!-- harness:review kind=codex-shipcheck scope=diff tip=b8316cd3c81ea60957e08dd865d7e9c03debd228 at=2026-09-12T18:39:56.376Z -->

**판별 · 조치 (2026-09-13)** — BLOCKER 2건 모두 **진짜 결함**. 오탐 0건.

- **S1 fail — 진짜.** spec·artifact가 "역할별 진입로 **7**카드"라고 적었으나 실제는 **6개**다
  (quick · 새 팀원 · 리뷰어 · 크루 운용 · 팀 소개 · 메인테이너). 원인은 구현이 아니라 **검증 스크립트**였다 —
  카드를 `<div class="route` 로 셌는데 이 접두사가 컨테이너 `<div class="routes">`까지 매치해
  6을 7로 셌고, 그 틀린 수치가 보고 → spec → 커밋 메시지로 전파됐다.
  **조치:** 정규식을 `<div class="route(?:\s+[a-z]+)?"` 로 고쳐 재측정(`route cards: 6`), spec·plan·artifact의
  수치를 6으로 정정. 커밋 `b8316cd`의 메시지에 남은 "7카드"는 이미 기록된 이력이라 amend하지 않는다
  (amend하면 위 리뷰 마커의 `tip=` 이 가리키는 sha가 사라진다) — 이 항목이 정오표다.
- **S5 fail — 진짜.** artifact의 검증 기술이 "1페이지 · 오버플로 0 · 전부 통과"라는 산문 선언이었고
  실제 명령·출력 인용이 없었다. **조치:** `## 검증 증거` 절을 신설해 6개 명령의 실제 출력을 그대로 붙였다.
- **S2 · S4 na — 수용.** 둘 다 "증거가 없어 판정 불가"이지 결함 주장이 아니다. S5 조치로 S2의 근거가
  생겼고, S4는 이 리뷰가 첫 기록이라 누락될 이전 리뷰가 없다.
- **S3 pass.** 스코프 밖 변경 없음 — diff는 `docs/` 안에서만 끝난다.

**남은 리스크.** 위 증거 중 DOM 스텁 3종(`/tmp/domstub2.mjs` · `obstub.mjs` · `dkstub.mjs`)은
**세션 로컬이라 저장소에서 재현되지 않는다.** spec의 "코드·`templates/` 무변경" 제약 때문에
`tests/`에 넣지 않았다. 이 산출물들을 앞으로도 고칠 거라면 스텁을 `tests/`로 승격하는 후속 task가 필요하다.

## Learnings

- **치환 앵커에는 `count == 1`을 assert한다.** `index.html`에 Guides 항목을 넣으려고
  `<li><a href="harness-operations-playground.html">`를 앵커로 잡았는데, 같은 문자열이 위쪽
  route 카드 안에 **먼저** 있어서 거기에 삽입됐다. route 카드는 `<a>` 안에 래퍼 `<span>` 하나를 두는
  2열 그리드라, `.name`/`.desc`가 형제인 Guides용 마크업이 들어가자 3번째 그리드 아이템이
  1.15rem 열로 밀려 **한 글자씩 세로로** 흘렀다. 사용자가 스크린샷으로 잡아 줬다.
  이후 모든 치환을 `assert s.count(a)==1`로 감싸니 다음 시도에서 곧바로 예외가 나 파일이 미변경으로 남았다.
  — **Why:** 유일하지 않은 앵커는 조용히 엉뚱한 곳을 고친다. 실패해야 할 때 실패하게 만든다.
  — **How to apply:** 파일 일부를 문자열로 치환할 때 앵커의 출현 횟수를 먼저 검사하고, 1이 아니면 중단한다.

- **인쇄물은 브라우저에서 실제로 렌더해 확인한다 — 화면 높이 측정으로는 못 잡는다.**
  치트시트가 화면에서는 `scrollHeight == 297mm`로 A4에 정확히 맞았지만, `printToPDF`는 **2페이지**를 냈다.
  원인은 `@page{margin:0}` + `.sheet{min-height:297mm}`의 이중 계상이었다.
  `@page{margin:10mm}`로 여백을 맡기고 인쇄 시에는 sheet를 자연 높이로 흐르게 고쳐 1페이지가 됐다.
  — **Why:** 화면 레이아웃과 페이지 박스는 다른 계산이다. "A4 크기로 만들었다"는 인쇄된다는 뜻이 아니다.
  — **How to apply:** 인쇄용 문서는 `printToPDF`의 **페이지 수**를 검증 항목에 넣는다.

- **접두사가 겹치는 클래스명을 정규식으로 세지 않는다.** `index.html`의 진입로 카드를
  `<div class="route` 로 카운트했더니 컨테이너 `<div class="routes">`까지 잡혀 6개를 **7개로** 셌다.
  그 수치가 사용자 보고 → spec → 커밋 메시지까지 전파됐고, codex-shipcheck의 S1이 잡아 냈다.
  — **Why:** 자기 검증 스크립트의 버그는 통과로 나타나기 때문에 스스로는 못 잡는다. 별도 컨텍스트의
  검증자(D6)가 필요한 이유가 이것이다 — 결정론 가드도 내가 짠 계산이 틀리면 같이 틀린다.
  — **How to apply:** 클래스명을 세는 정규식에는 경계를 넣는다(`"route(?:\s+[a-z]+)?"`). 그리고
  카운트가 근거가 되는 수치라면 눈으로 한 번 세어 대조한다.

- **브라우저 확장이 검증을 오염시킨다.** 색상 확인용으로 띄운 브라우저에 Dark Reader류가 붙어 있어
  `color-scheme: light`와 `#fff` 배경이 `rgb(24,26,27)`로 반전돼 보였다. 페이지 버그로 오인할 뻔했다.
  `--headless=new --disable-extensions`로 다시 렌더해 실제 색을 확인했다.
  — **Why:** 사용자 프로필을 쓰는 브라우저는 중립 환경이 아니다.
  — **How to apply:** 시각 산출물 검증은 확장이 로드되지 않는 headless로 한다. 레이아웃 측정은 확장과 무관하므로 어느 쪽이든 된다.

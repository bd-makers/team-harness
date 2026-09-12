# team-onboarding-kit — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`docs/` 산출물 5개 (신규 4 · 수정 1). 코드·`templates/`·훅 무변경.

| 파일 | 내용 |
|---|---|
| `index.html` (수정) | 역할별 진입로 7카드 — 5분 / 새 팀원 / 리뷰어 / 크루 운용 / 팀 소개 / 메인테이너 |
| `harness-operations-playground.html` | 운용 시나리오 구성기 — 상황·규모·게이트·리뷰·격리를 고르면 실행 순서 · 자동 훅 · 건드리는 파일 · `done` 가드 판정 · 붙여넣을 프롬프트가 바뀐다 |
| `harness-onboarding-checklist.html` | 24항목 5페이즈 — 진행률 localStorage · 게이트 경고 · 막힘 리포트 복사 |
| `harness-kickoff-deck.html` | 16장 자립형 덱 — ← → 이동 · O 개요 · S 발표자 노트 · F 전체화면 · 인쇄 시 장당 1페이지 |
| `harness-cheatsheet.html` | A4 1장 인쇄용 — 명령 8 · 4파일 · 세 게이트 · Done evidence · 하지 말 것 7 · 막혔을 때 · 자동 훅 · 채널 3 · D2~D6 |

검증: `index.html` 링크 121개 전부 파일·앵커 해석(깨진 것 0), 치트시트 A4 **1페이지**(headless Chrome
`printToPDF`), 덱 16장 **오버플로 0**, DOM 스텁 인터랙션 테스트 3종(구성기 26건 · 체크리스트 14건 ·
덱 25건) 전부 통과, `npm run docs:check` green.

## Reviews

*(없음 — `Done evidence`에서 `review: optional`로 선언. docs-only 변경이고 내용 검증은 저장소 문서 대조와 브라우저 실측으로 수행)*

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

- **브라우저 확장이 검증을 오염시킨다.** 색상 확인용으로 띄운 브라우저에 Dark Reader류가 붙어 있어
  `color-scheme: light`와 `#fff` 배경이 `rgb(24,26,27)`로 반전돼 보였다. 페이지 버그로 오인할 뻔했다.
  `--headless=new --disable-extensions`로 다시 렌더해 실제 색을 확인했다.
  — **Why:** 사용자 프로필을 쓰는 브라우저는 중립 환경이 아니다.
  — **How to apply:** 시각 산출물 검증은 확장이 로드되지 않는 headless로 한다. 레이아웃 측정은 확장과 무관하므로 어느 쪽이든 된다.

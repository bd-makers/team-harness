# team-onboarding-kit — Spec

## 목적 / 요구사항

**문제.** `docs/`에는 설명 문서가 6종 약 590 KB 있지만(overview 188 KB · simulation 147 KB ·
task-guide 73 KB · fleet 58 KB · schematics 59 KB · rubric 44 KB), 팀에 하네스를 넘길 때 쓸 물건이 없다.
`index.html`은 파일을 나열만 해서 새 팀원이 188 KB짜리 overview부터 열 위험이 있고, 발표 자산은 0개다.
부족한 것은 **설명이 아니라 진입로와 실행물**이다.

**영향받는 사람.** ① 하네스가 적용된 저장소를 clone한 새 팀원 ② 팀에 하네스를 소개하는 사람
③ 규약을 매일 적용하는 기존 팀원.

**기대 결과.**
- 새 팀원이 무엇부터 읽을지 `index.html` 첫 화면에서 자기 역할로 고를 수 있다.
- 새 팀원이 읽기가 아니라 **task 하나를 실제로 열고 닫아 본 상태**로 온보딩을 끝낸다.
- 20분 발표로 팀에 소개할 수 있고, 발표 후 책상에 붙일 한 장이 남는다.

**제약.**
- 산출물은 **자립형 HTML** — CDN·외부 의존 없음, inline SVG. Obsidian이 script를 제거하므로
  다이어그램은 inline SVG로 쓴다.
- 기존 문서를 다시 쓰지 않는다. 링크와 요약으로 재사용한다.
- 코드는 건드리지 않는다. `docs/` 안에서만 끝낸다.
- 치트시트는 A4 **한 장**을 넘지 않는다.

## 설계 / 접근

네 산출물을 "읽는 것 → 하는 것" 순으로 배치한다.

| 산출물 | 성격 | 대체하는 것 |
|---|---|---|
| `index.html` 역할별 진입로 7카드 | 라우팅 | 파일 나열 |
| `harness-operations-playground.html` | 구성기 | 매번 절차를 기억해 내는 것 |
| `harness-onboarding-checklist.html` | 실행 목록 24항목 | "task-guide 읽으세요" |
| `harness-kickoff-deck.html` | 발표 16장 | 구두 설명 |
| `harness-cheatsheet.html` | 인쇄 1장 | 명령 25종 기억 |

내용의 **정본은 기존 문서**(`AGENTS.md` · `CLAUDE.md` · `README.md` · `docs/decisions.md` ·
task-guide · rubric-guide)이고, 이 네 산출물은 그것을 재배치·압축한 파생물이다.
규약이 바뀌면 정본을 고치고 이 파생물을 따라 고친다 — 반대 방향은 없다.

## Ontology

- **진입로(route)**: 역할 하나가 무엇을 어떤 순서로 읽을지 정한 링크 묶음. 문서 목록과 달리 **순서와 소요 시간**을 가진다.
- **실행물**: 읽고 끝나지 않고 사용자가 상태를 남기는 산출물(체크 진행률·복사한 프롬프트·인쇄물).
- **파생물**: 규약의 정본이 아니라 정본을 재배치한 문서. 충돌하면 정본이 이긴다.
- **전달(delivery)**: 저장소에 커밋되어 팀원이 clone만으로 받는 상태. 로컬 파일은 전달이 아니다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — "팀이 하네스를 받아 쓰기 시작하는 데 필요한 진입로·실행물 4종을 `docs/`에 만든다"
- [x] **Constraint 명확도** (30%) — 자립형 HTML · CDN 금지 · 기존 문서 재작성 금지 · 코드 무변경 · 치트시트 A4 1장
- [x] **Success 기준** (30%) — 아래 Done evidence + 검증 항목(링크 해석 · A4 1페이지 · 슬라이드 오버플로 0 · 인터랙션 테스트)
- [x] **Context 명확도** (brownfield) — `docs/index.html` 1개만 수정, 나머지는 신규 4개. 코드·템플릿·훅 무변경
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0

근거는 Ontology 절에 정의한 네 개념으로 충분히 좁혀졌다 — 특히 "파생물"의 정의가
"규약이 바뀌면 어느 쪽을 고치나"라는 유지보수 질문을 미리 닫는다.

## Done evidence

```json
{ "version": 1, "tests": "skip", "review": "optional", "verify": "optional" }
```

`tests: skip` — `docs/` 밖을 건드리지 않으므로 소스 변경이 없다.
`review`·`verify`는 `optional`로 둔다. 내용 검증은 저장소 문서 대조와 브라우저 실측으로
이미 수행했고(아래 참고), 문구 확정은 사용자 승인으로 닫혔다.

## 참고

- 정본 — `AGENTS.md`(작업 프로토콜 · 역할 · D2~D7) · `CLAUDE.md`(§5-A 복잡도 게이트 · 페르소나 순서) ·
  `README.md`(설치 3채널 · Done evidence · Boundary contracts) · `docs/decisions.md`
- 재사용한 기존 문서 — `docs/harness-task-guide.html`(§0 3채널 · §1 하루의 루프 · §3 spec · §9 함정) ·
  `docs/harness-rubric-guide.html`(§1 · §4 프레이밍 5+1 · §7 마커 계약) ·
  `docs/harness-fleet-guide.html`(§1 부트스트랩 · §3 소유 경계 · §6 충돌 지도 · §7 안전)
- 브라우저 실측 — headless Chrome(확장 미로드)으로 치트시트 색상·A4 1페이지, 덱 16장 오버플로 0 확인
- (open) 덱 15장의 7개 중 2개(선체크 금지 · 리뷰 기록)가 14장과 긍정형/부정형으로 겹친다.
  반복이 기억에 남는다고 보아 그대로 두었다 — 발표 후 피드백으로 재조정 가능

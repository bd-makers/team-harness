# docs-refresh-0210 — Spec

## 목적 / 요구사항

소비자용 문서가 **틀린 말을 하지 않게** 0.21.0 기준으로 정합화한다. 두 갈래 요구가 있었다.

1. **사전 준비에 "미리 설치해야 하는, 벤더링되지 않은 스킬" 목록이 없다** — `docs/prerequisites.md`는
   외부 **CLI 도구** 5종(jq·gh·codex·gemini·opencode)만 능력 매트릭스로 다루고, *스킬/플러그인*
   차원에서 무엇이 번들이고 무엇이 아닌지는 §5 끝의 한 문단으로만 존재했다. 독자가 "따로 설치할
   스킬이 있나?"에 답을 얻을 수 없다.
2. **워크플로우 시뮬레이션에 새 스킬이 누락돼 있다** — `docs/harness-workflow-simulation.html`이
   v0.18.1에 멈춰 있어 24개 슬래시 커맨드 중 15개가 문서에 이름조차 없다. 전체 스킬을 **옵트인
   여부와 함께** 한눈에 보여 주는 표가 필요하다.

작업 중 확장된 범위(사용자 지시 2회):

3. **`harness-overview`가 0.18.1을 최신으로 표시** — 생성 문서지만 hero 배지·배너 산문·footer는
   템플릿 하드코딩이라 `docs:check`가 green이어도 낡는다. 게다가 0.19.0에서 이미 출시된 내용을
   "⚠️ 다음 릴리스 예고"로 **미래형 예고**하고 있었다.
4. **fleet guide·task guide도 같은 0.18.1 세대** — 0.19.0 이후 인도된 것(Node 24 · 판정 창
   `firstActivatedAt` · D6 검증자 · `verify` 증거 키)이 문서 어디에도 없고, 특히 done 종결
   가드를 세 문서가 입을 모아 "6종"이라 말하고 있었다(실제 7종).

## 설계 / 접근

**원칙: 버전 라벨만 올리지 않는다.** 낡은 것은 숫자가 아니라 **서술**이다. 0.19.0~0.21.0이
실제로 바꾼 사실을 소스(`src/commands/task.mjs`·`CHANGELOG.md`·`commands/*.md`)에서 확인해
문장을 고친다 — `docs-refresh-0181`이 세운 선례를 그대로 따른다.

| 파일 | 전 | 후 | 성격 |
|---|---|---|---|
| `docs/prerequisites.md` | §5 한 문단 | 벤더링 인벤토리 절 신설 | 직접 편집 |
| `docs/harness-workflow-simulation.html` | 0.18.1 | 0.21.0 + 스킬 로스터 | 직접 편집 |
| `docs/harness-overview.template.html` | 0.18.1 | 0.21.0 | 직접 편집 (생성 소스) |
| `docs/harness-overview.html` | 0.18.1 | 0.21.0 | `docs:generate` 재생성 |
| `docs/harness-task-guide.html` | 0.18.1 | 0.21.0 | 직접 편집 |
| `docs/harness-fleet-guide.html` | 0.18.1 | 0.21.0 | 직접 편집 |
| 스냅샷 2종 | — | 신규 | overview · simulation |

**스냅샷 관례의 비대칭을 유지한다** — overview·simulation은 버전 스냅샷을 남기고 index에
등재하지만, fleet·task guide는 스냅샷 계열이 없다(0.19.0도 제자리 갱신). 없던 관례를 이번에
새로 만들지 않는다.

**미래 릴리스 번호를 새로 박지 않는다** — 0.17.0이 "0.19.0에서 제거"라고 적어 세 릴리스 내내
틀렸던 전례가 있다. 상태(“제거됐다”)만 쓰고 시점은 CHANGELOG가 말하게 둔다.

## Ontology

- **벤더링되지 않은 스킬**: 하네스가 참조하지만 플러그인에 번들하지 않아, 그 기능을 쓰려면
  사용자가 **따로 설치해야** 하는 스킬/플러그인. 조사 결과 현재 `diagram-design` **하나뿐**이며
  `/harness-*` 커맨드 24종과 짝 스킬, Codex 전용 스킬 2종(`harness-team`·`harness-codex-sim`)은
  전부 번들이다. "설치할 게 없다"는 사실 자체가 문서에 필요한 정보다.
- **옵트인(계약)**: 결정론적 계약으로 정식 선언된 것만 가리킨다 — ① 다이어그램 단계(plan.md에
  그 단계가 있는지가 곧 상태) ② spec `## Done evidence`의 `review`·`verify` 키 ③ spec
  `## Boundary contracts` 선언. "작은 버그엔 생략 가능" 같은 **규범**과 구분해 표기한다.
  이 구분이 스킬 로스터 배지 설계의 근거다.
- **종결 가드 7종**: 0.18.1의 6종에 0.20.0의 `verify`(검증 프레이밍 kind 마커) 가드가 더해진
  현재 값. 검증 마커는 `review` 증거를 겸하지만 역은 성립하지 않는다.
- **판정 창**: done 가드가 증거를 찾는 시간 구간. 시작점은 `<name>-meta.json`의
  `firstActivatedAt`(0.19.0) — `active.json`의 `switchedAt`이 아니다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — "소비자 문서가 0.21.0 사실과 어긋나지 않게 하고, 벤더링 인벤토리와
  전체 스킬 옵트인 표를 추가한다". 사용자 요구 2건 + 확장 2건이 위 표의 파일 목록으로 확정됨.
- [x] **Constraint 명확도** (30%) — 스냅샷 비대칭 유지 · 미래 버전 번호 금지 ·
  `prerequisites:external-tools` 마커 블록 불가침(`tests/prerequisites-doc.test.mjs` 양방향) ·
  다이어그램 옵트인 계약을 3번째 지시 표면에 복제 금지(`tests/agent-files.test.mjs`).
- [x] **Success 기준** (30%) — `npm test` 전건 통과 · `npm run docs:check` green ·
  두 가이드 HTML 태그 균형 검사 0건 · 렌더 확인. 문서에 남은 옛 버전 표기는 전부 "기능이 도입된
  릴리스"를 가리키는 역사적 귀속뿐임을 grep으로 확인.
- [x] **Context 명확도** (brownfield) — 영향 파일 8개(문서 6 + 스냅샷 2)와 CI 결합 지점을
  서브에이전트 조사로 사전 확정. simulation·두 가이드는 생성기·테스트가 **없고**, overview는
  생성기 + 테스트 2종이 있으며, prerequisites는 doctor와 양방향 대조된다.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0

## Done evidence

```json
{ "version": 1, "review": "required", "tests": "skip" }
```

`tests: skip` — 문서 전용 task다. 소스 변경이 없으므로 테스트 가드가 애초에 발동하지 않지만,
무시가 아니라 **선언**으로 남긴다. `review: required` — 이 저장소의 문서 갱신 선례
(`docs-refresh-0181`)가 외부 리뷰를 돌렸고, 문서는 틀린 사실이 조용히 통과하기 가장 쉬운 산출물이다.

## 참고
- 선례: `docs/chad/docs-refresh-0181/` — 같은 성격(소비자 HTML 문서 버전 정합화)의 직전 task
- 옵트인 계약 정본: `commands/harness-task.md` · 실행 어댑터: `commands/harness-diagram.md`
- 가드 구현: `src/commands/task.mjs`(`VERIFY_KIND_SUFFIXES`·`collectDoneIssues`)

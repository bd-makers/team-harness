# diagram-optin — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

spec/plan 단계 다이어그램 옵트인을 **문서 전용 변경**으로 추가했다. `src/` 무변경.

PR: [#26](https://github.com/bd-makers/team-harness/pull/26) (main 대상, **머지하지 않음** — 리뷰 대기).
브랜치: `ao/harness-aijient-team-plugin-3/diagram-optin`

| 파일 | 변경 |
|---|---|
| `AGENTS.md` + `templates/AGENTS.md.hbs` | protocol 절: `<name>-diagram.html`을 SSOT 제외 생성물로 선언(+inline SVG 근거), task 워크플로우에 옵트인 불릿 — **도구 중립** |
| `CLAUDE.md` + `templates/CLAUDE.md.hbs` | workflow 절 `### 1-B. 다이어그램 옵트인` — Claude 전용 호출 + probe → degrade → record |
| `commands/harness-task.md` | body에 6단계 절차 (frontmatter 불변 — 생성 overview 입력) |
| `templates/docs/README.md` | docs 트리에 `<name>-diagram.html` 등재 + 규약 불릿 |
| `tests/agent-files.test.mjs` | 회귀 가드 3개 (신규 파일 없음 — source-tree 표가 생성물이라) |
| `CHANGELOG.md` | `[Unreleased]` 끝에 `### Added` (버전 범프 없음) |

### 설계 계약 (요약)

- **옵트인 상태 = plan.md 체크박스의 존재/부재.** `.harness/config.json` 키·doctor 체크·상태 파일을
  만들지 않았다. plan.md는 이미 SSOT이고 세션 시작 프로토콜 2번이 반드시 읽는 파일이다.
- **질문은 CLI가 아니라 command doc이 소유.** `harness-team task`는 Node CLI라 AskUserQuestion을
  할 수 없다. Codex 표면(`skills/harness-task/SKILL.md`)도 같은 문서를 SSOT로 읽으므로 두
  에이전트 경로가 한 문서로 커버된다 → CLI 변경이 불필요했다.
- **질문 시점: `created:`일 때 1회.** `activated:`(재활성화)에는 묻지 않는다.
- **하드 의존 금지.** 다이어그램 스킬은 별도 마켓플레이스의 Claude 전용·머신별 설치 도구다.
  없으면 실패 대신 건너뛰고 artifact에 "미실행" 한 줄 — `harness-codex-review` Preflight(1)·기록(5)과
  같은 계약.
- **inline SVG인 이유.** `docs/`는 Obsidian 볼트 안이고 Obsidian은 script를 제거하므로 mermaid JS는
  렌더되지 않는다. 이 근거를 AGENTS.md·commands·docs README 세 곳에 남겨 mermaid 회귀를 막는다.

### 이 task 자체의 옵트인 선택

**옵트아웃을 선택했다** — 문서 전용 변경이고 구조 다이어그램이 설명을 더하지 않는다.
`diagram-optin-plan.md`에 다이어그램 단계가 없다는 사실이 곧 그 상태이며, 별도 기록 파일은 없다.
(계약 dogfooding: "아니오"의 상태가 정말로 plan.md만으로 표현되는지 직접 확인.)

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-08-20 — advisor (구현 전 설계 검토)

브리프 해석과 착수 계획을 검토받아 세 가지를 반영했다.

1. **CLI nudge 추가안 기각.** `printTaskNextActions`에 안내 한 줄을 넣을지 고민했으나,
   `skills/harness-task/SKILL.md`가 이미 `commands/harness-task.md`를 SSOT로 읽으므로 Claude·Codex
   두 경로가 문서 하나로 커버된다. 남는 경로는 사람이 직접 bash를 치는 경우뿐인데 사람에게는
   AskUserQuestion 지시가 필요 없다. 넣었다면 동기화 대상 표면만 셋으로 늘고 기능 이득은 0이었다.
   → `src/` 무변경으로 확정.
2. **생성물 트랩 회피.** `docs/harness-overview.html`은 커밋되는 생성물이고
   `tests/harness-overview-generation.test.mjs`가 byte 동일성을 검사한다. 생성기 입력이
   `commands/` frontmatter와 `tests`·`commands` 등의 소스 트리 순회이므로 (a) command frontmatter를
   건드리지 않고 body만 수정, (b) **새 테스트 파일을 만들지 않고** 기존 `tests/agent-files.test.mjs`에
   가드를 추가했다. `npm run docs:check` 통과로 확인.
3. **README 3번째 반복 확인.** `documentation-inventory-pointers.test.mjs:27`이 README 문장을
   축자 고정하고 있어 실제로 확인한 결과 README는 이미 AGENTS.md와 `templates/docs/README.md`로
   위임(L145, L359)한다 → **README 편집 불필요**. 고정 문장을 건드릴 위험도 회피했다.

### 2026-08-20 — Codex read-only 외부 리뷰 (`codex exec --sandbox read-only`, codex-cli 0.147.0)

브랜치 diff(`origin/main...HEAD`) 대상. **Verdict: Changes requested (P2 3건)** → 4건 모두 검증 후 조치했다.

| # | 발견 | 판별 | 조치 |
|---|---|---|---|
| P2-1 | 도구 부재로 건너뛰면 plan의 열린 체크박스를 닫을 방법이 없어, `done` 가드가 완료를 영구 차단하거나 단계 삭제로 옵트인 상태가 유실된다 | **진짜 결함** — `src/commands/task.mjs:300` `planHasOpenBoxes`가 줄 시작 `- [ ]`를 미완으로 판정하는 것을 직접 확인 | 세 표면 모두에 **종결 규칙** 추가: 단계를 지우지 말고 `- [x] … — 미실행(도구 없음)`으로 닫는다 (지우면 옵트인 사실 소실, 열어 두면 done 차단 — 두 실패 모드를 근거로 명시) |
| P2-2 | `CLAUDE.md` §1-B의 "작은 버그·문서 수정에는 생략"이 "모든 신규 task에서 1회 질문"이라는 AGENTS·command 계약과 충돌하고, **질문 누락을 옵트아웃으로 위장**한다 | **진짜 결함** — 1-A/5-A의 관용구를 그대로 복사한 실수. 세 표면 중 하나만 예외를 두고 있었다 | 예외 절 제거. "재활성화 시에는 묻지 않는다"로 통일하고, 예외를 두지 않는 이유(묻지 않으면 "묻고 아니오"와 상태가 구별되지 않음)를 함께 적었다 |
| P2-3 | "'예'의 상태 = 산출물 존재"라는 서술이 plan.md 단일 상태 계약과 모순되며, 도구 부재로 HTML이 없는 opted-in task를 오분류한다 | **진짜 결함(서술 정밀도)** — 출하되는 계약 문서(AGENTS/CLAUDE/command)는 일관되게 plan.md를 상태로 규정하지만, 근거 산문(spec·CHANGELOG)만 이 표현을 썼다 | spec·CHANGELOG를 "두 상태 모두 plan.md가 표현한다"로 정정하고, **실행 여부는 별개 축**임을 명시 |
| P3 | 새 테스트가 문구 존재만 검사해 위 모순이 모두 있어도 통과한다 | **타당** | 실제 `commands/harness-task.md`를 읽어 created/activated 분기와 종결 규칙을 검증하는 테스트, 세 표면이 같은 종결 규칙을 말하는지 검증하는 테스트 2개 추가 (295 tests) |

오탐은 없었다. Codex가 확인한 통과 항목: 변경된 AGENTS 영역에 Claude 전용 도구명 누출 없음,
루트/템플릿 관리 절 정확히 일치, 별도 config·doctor·상태 파일 없음.
(Codex는 read-only 샌드박스의 `mkdtemp` 제한으로 전체 테스트를 완주하지 못했다 — 전체 통과는
이 세션에서 별도로 확인했다.)

**Gemini 리뷰는 미실행이다** — `command -v gemini` 결과 이 머신에 CLI가 설치돼 있지 않다.
기록 없는 리뷰는 "안 한 것"이므로 미실행 사실을 명기한다.

### 리뷰 기준 자가점검 (AGENTS.md 코드 리뷰 기준)

- **정확성**: 옵트인/옵트아웃/재활성화 3분기가 문서와 실제 CLI 출력(`created:`/`activated:`)에
  대응함을 샌드박스에서 실제 출력으로 확인.
- **엣지 케이스**: 도구 부재 경로가 실패가 아닌 skip+record로 규정됨. 재활성화 시 재질문 금지 명문화.
- **회귀**: 전체 293 tests 통과. 루트↔템플릿 쌍 드리프트 가드(`agent-files`)와 SSOT 일관성
  가드(`ssot-consistency`) 모두 통과.
- **보안**: 해당 없음(문서 변경, 실행 코드·입력 처리 없음).
- **단순성**: 새 저장소·새 CLI 플래그·새 테스트 파일 없음. 상태는 기존 SSOT(plan.md)가 진다.
- **테스트**: 가드 3개가 (1) core의 Claude 전용 스킬 이름 유출, (2) plan.md 상태 규칙 소실,
  (3) probe/record 계약 소실을 각각 차단한다.

## Verification

실제 출력으로 확인한 것:

- `npm run test` — **tests 295 / pass 295 / fail 0** (+ perf 1 pass). 리뷰 조치 후 재실행 기준.
- `npm run docs:check` — `harness overview 생성 상태가 최신입니다.` (exit 0)
- 샌드박스 전파 검증 (`tests/e2e/sandbox.mjs`의 `appliedSandbox`로 tmpdir에 실제 apply) — **13/13 PASS**:
  scaffold된 `AGENTS.md`/`CLAUDE.md`/`docs/README.md`에 새 규칙이 전파됨, core에 `diagram-design`
  문자열 부재, 신규 task의 plan.md에 다이어그램 단계 없음(옵트아웃 상태), 재활성화 시 `activated:` 출력.
- 라이브 저장소 대상 CLI 실행은 이 task 자체의 `task diagram-optin` 생성뿐이며, 검증 실행은
  전부 tmpdir 샌드박스에서 수행했다. `release`·`summary --write`·`--help`는 실행하지 않았다.

## Learnings

- **문서 규칙은 항상 쌍이다.** 루트 파일과 `templates/*.hbs`를 같은 텍스트로 고쳐야 하며,
  `tests/agent-files.test.mjs`가 마커 절을 **문자열 동일성**으로 비교한다. 두 파일에 같은 블록을
  각각 타이핑하지 말고 한 번 정의해 프로그램으로 삽입하는 편이 안전하다(이번엔 python 스크립트로
  같은 상수를 두 파일에 넣었다).
- **문서에 넣는 "복사해 쓸 문자열"은 줄바꿈으로 쪼개지 않는다.** `"다이어그램 미실행 — 도구 없음"`이
  줄바꿈에 걸려 테스트 regex가 실패했다. 리터럴로 소비될 문구는 한 줄에 유지한다.
- **멀티에이전트 SSOT에는 도구 이름을 넣지 않는다.** `AGENTS.md`는 Codex·Cursor·OpenCode도 읽으므로
  Claude 전용 스킬 이름이 들어가면 역할표 5개 중 3개에게 실행 불가능한 규칙이 된다. 이 규칙은
  주석이 아니라 `assert.doesNotMatch(out, /diagram-design/)` 같은 **음성 단언**으로 못 박아야
  나중에 회귀하지 않는다.
- **커밋되는 생성물이 있는 저장소에서는 "파일 추가"가 조용한 지뢰다.** `tests/`에 새 파일을 만들면
  source-tree 표가 바뀌어 byte 동일성 테스트가 깨진다. 가드는 기존 테스트 파일에 얹는 편이 안전하다.
- **문서로 새 체크박스를 만들면 그 체크박스를 닫는 방법까지 같이 규정해야 한다.** 옵트인 단계를
  추가하는 규칙만 쓰고 "도구가 없어 건너뛴 경우"의 종결 규칙을 빠뜨려, `done` 가드가 영구 차단되는
  경로를 만들었다(Codex P2-1). 워크플로우 문서를 쓸 때는 **해피 패스가 아니라 degrade 패스가
  기존 게이트와 어떻게 만나는지**를 먼저 확인한다.
- **관용구를 복사할 때 그 예외 조항이 새 맥락에서도 옳은지 다시 판단한다.** 1-A/5-A의 "작은 수정에는
  생략"을 1-B에 그대로 복사했더니, 세 표면 중 하나만 예외를 두어 "묻지 않음"과 "묻고 아니오"가
  구별 불가능해졌다(Codex P2-2). 상태를 만드는 규칙에는 조용한 예외를 두지 않는다.
- **작성자가 못 보는 것을 분리된 리뷰어가 본다.** 세 P2 모두 내가 쓴 문서 안에 있었고 전체 테스트는
  통과하고 있었다. 테스트 통과는 "내 테스트가 검사하는 것"의 통과일 뿐이다.

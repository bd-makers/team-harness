# wiki-compile — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

**문제** (interview — 원천 `docs/harness-cycle.md` §4-4): 지식이 task 단위로만 쌓인다. 이 저장소만 해도 task 폴더가
100개가 넘고, "이 기능(모듈)은 지금 어떻게 생겼고 왜 그런가"에 답하려면 관련 task의 spec·plan·artifact를 모두 찾아 읽어야 한다.
영향받는 사람은 팀원(원래 니즈 1: 누가 무엇을 바꿨나)과 그 지식을 조회하는 LLM·RAG다.

**기대 결과** (interview): 머지된 task의 결정·바뀐 모듈·학습을 **기능·모듈 단위 위키 항목**으로 컴파일하는 선택형 단계를 제공한다(D11 "제공").
위키 항목은 PR 번호·커밋·작성자를 출처로 남긴다.

**요구**
- R-1 (interview, §4-4) 위키는 저장소 최상위 `wiki/`에 둔다 — `docs/`와 섞지 않는다.
- R-2 (interview, §4-4) 항목의 출처는 task 경로가 아니라 **PR 번호와 커밋**이다. 작성자도 남긴다.
- R-3 (interview, §4-4·D5) 컴파일은 기본 브랜치에서 실행한다(`summary --write`와 같은 자리).
- R-4 (interview, §4-4·D11) 위키 분류 체계를 코드에 박지 않는다. 프로젝트의 `wiki/90_system/` 작성 규칙을 따르고,
  분류하지 못한 것은 `wiki/99_inbox/`로 보낸다. kc-platform 폴더 구조는 예시일 뿐이다.
- R-5 (interview, §6 C1) **추가만 한다.** task 폴더 삭제, summary·`done`·handoff 입력 이전은 C2 범위다 —
  기존 명령의 동작·출력 바이트는 하나도 바뀌지 않는다.
- R-6 (interview) 같은 task·PR을 다시 컴파일해도 위키에 중복 항목이 생기지 않는다(멱등).
- R-7 (interview, D11 2차 장치 규칙) 새 장치를 넣기 전에 기존 장치를 빼거나 줄이는 안을 검토하고 기각 사유를 아래 설계 절에 남긴다.

**제약**
- 런타임 의존성 0 유지, `gh`·네트워크 의존 없음(PR 번호는 git 이력에서 얻는다). Node ≥ 24.
- 버전 범프·매니페스트 버전 수정은 범위 밖(릴리스 몫). 명령 목록 등록(`.claude-plugin/plugin.json` `commands`)은 #134 선례대로 범위 안.
- C2(호환성 파괴)는 범위 밖.

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- (cycle) docs/harness-cycle.md §4-4 · §5 · §6
- (decision) docs/decisions.md D5 · D11
- (brief) 오케스트레이터 브리프 c1-wiki-compile-brief.md — 사람이 준 원 브리프(열린 질문 6개 포함)

### 발견
- F1 (unresolved) 위키 파일 모양 충돌 — §4-4 본문·§4-2b는 `wiki/<area>.md`(area = workspace 이름, 평면 파일)라 하고,
  §4-4 메인테이너 입력(2026-10-06)은 번호 폴더(`10_ssot/`…`99_inbox/`) + `90_system/` 규칙을 따른다고 한다. 규칙이 없을 때 어느 쪽인가.
- F2 (open) "작성자"의 정의 — §4-4는 "작성자·PR 기록"이라고만 한다. task meta의 `user`(하네스 멤버)인지, 머지 커밋 작성자(머지한 사람)인지, PR 작성자인지 어느 원천도 정하지 않는다.
- 참고(충돌 아님): §4-4의 "task 폴더는 삭제한다"와 §6 C1 "추가만"은 C1 → C2 순서로 나눠져 양립한다.


## 설계 / 접근
*초안 — 아래 `(open)` 질문의 답으로 확정한다. 권장안은 `questions-2.md`에 근거와 함께 있다.*

**형태 (권장안, open Q1)**: §4-3과 같은 "스킬 + 얇은 CLI".
- 스킬 `/harness-wiki` (`commands/harness-wiki.md` + Codex 래퍼 `skills/harness-wiki/SKILL.md`): LLM이 task 문서를 읽고
  `wiki/90_system/` 규칙에 따라 어느 항목에 무엇을 넣을지 판단해 쓴다.
- CLI `harness-team wiki sources <user>/<task>` (읽기 전용, 결정론): 컴파일 입력을 JSON으로 낸다 —
  task 문서 경로, meta(`user`·`status`·`closedAt`), 출처(PR 번호·머지 커밋·작성자), 이미 컴파일된 위키 위치(마커 검색),
  `wiki/90_system/` 규칙 파일 목록. 파일을 쓰지 않는다.
- 출처 추론: 기본 브랜치 first-parent 이력에서 task 디렉터리를 처음 들여온 커밋을 찾고, 제목·본문에서
  `(#N)`(GitHub) 또는 `!N`(GitLab)을 읽는다. 찾지 못하면 `pr: null` — 스킬이 `--pr <N>` 재실행을 안내한다.

**멱등 (권장안, open Q4)**: 위키 항목 안 각 컴파일 단락 앞에 기계 판독 마커를 둔다 —
`<!-- harness:wiki pr=<N> commit=<sha7> task=<user>/<task> author=<user> at=<YYYY-MM-DD> -->`
(`harness:rule`·`harness:review`와 같은 key=value 주석 문법). `wiki sources`가 `wiki/**/*.md`에서 같은 `task=`(또는 `pr=`)
마커를 찾으면 `compiled`로 보고하고, 스킬은 기본적으로 멈춘다. 재컴파일은 명시 요청일 때 그 단락만 교체한다.

**실행 시점 (권장안, open Q2)**: 머지 후 종결 절차 안 — 기본 브랜치에서 `done` 다음, `summary --write`와 같은 종결 커밋.
선택형(D11 "제공")이라 종결 절차에 "선택" 한 줄만 더하고 `done`·`summary`는 바꾸지 않는다.

**설정 자리 (권장안, open Q3)**: `wiki/90_system/` 안의 규칙 문서(커밋되는 프로젝트 데이터). `.harness/config.json`은
사용자별 gitignore라 팀원마다 분류가 갈린다(`gates.json` 정정과 같은 이유) — 쓰지 않는다. 규칙 문서가 없으면 전부 `wiki/99_inbox/`로 보내고
규칙 작성 안내를 출력한다. 위키 루트 경로는 `wiki/` 고정(R-1).

**2차 장치 검토 (R-7)** — 새 장치를 넣기 전에 검토한 "빼거나 줄이는" 안:
- (a) **`harness-team rules promote`를 넓혀 위키로도 승격** — 기각(초안): promote는 사용자가 고른 Learnings 한 항목을
  `.claude/rules`로 복사하는 결정론 동작이고 위키 컴파일은 LLM 판단(분류·병합)이다. 한 명령에 두 성격을 섞으면 promote의 계약이 흐려진다.
  유래 마커 문법은 재사용한다.
- (b) **`summary --write`가 위키도 렌더** — 기각(초안): summary는 결정론적 원장 렌더이고 바이트 대조(`--check`)를 보장한다.
  LLM 산출물을 섞으면 `--check`가 성립하지 않는다. 또 R-5(기존 출력 바이트 불변)를 깬다.
- (c) **CLI 없이 스킬만** — 보류(open Q1): 가장 적게 만든다. 다만 출처 추론·마커 검색이 프롬프트 안 git 명령이 되어
  테스트할 수 없고, C2가 같은 출처 정보를 다시 필요로 한다.
- (d) **`retro`/artifact Learnings를 줄이고 위키에 바로 쓰기** — 기각(초안): artifact는 PR 필수 4문서(D11 강제)의 하나라 줄일 수 없다.

**dogfood (권장안, open Q5)**: 이 저장소에 `wiki/90_system/<규칙>.md`(최소 규칙) + `wiki/index.md`를 두고
`default-loop-skill`(#134)과 `r2-scenario-evidence`(#133)를 컴파일해 증거로 삼는다.

**R1 `10_ssot/` 겹침 (권장안, open Q6)**: 이월. C1의 입력은 머지된 task 문서뿐이고, 원천 문서(kc_vault 등) 컴파일은 C1 밖이다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **위키 항목(wiki entry)**: `wiki/` 아래 기능·모듈 단위 마크다운 파일. 여러 task의 컴파일 단락이 쌓인다. 파일 위치는 프로젝트 규칙이 정한다.
- **컴파일 단락**: 한 task(=한 PR)에서 온 내용 묶음. 앞에 `harness:wiki` 마커가 붙는다. 멱등의 단위다.
- **출처(provenance)**: PR 번호 · 머지(또는 squash) 커밋 · 작성자(task meta의 `user`). task 경로는 출처가 아니다(C2에서 사라진다).
- **작성 규칙**: `wiki/90_system/` 아래 프로젝트 문서. 분류 체계·항목 템플릿·AI 편집 지침. 하네스 코드에는 없다.
- **inbox**: `wiki/99_inbox/` — 규칙으로 분류하지 못한 단락의 자리.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — 근거: 문제(task 단위로만 쌓임) + 기대 결과(PR 출처를 가진 기능·모듈 위키 항목 컴파일)가 한 문장씩 있다.
- [ ] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — 범위(R-5)·의존성 제약은 있으나 형태·설정 자리(Q1·Q3)가 미정.
- [ ] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — dogfood 대상(Q5)과 시나리오가 미확정.
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — 근거: `bin/harness-team.mjs` 디스패치, `src/commands/summary.mjs`(meta 읽기), `src/commands/rules.mjs`(마커 문법), `.claude-plugin/plugin.json`, `commands/harness-task.md` 종결 절.
- [ ] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
*scenarios는 인터뷰 답(형태 Q1) 확정 후 선언한다 — R2 dogfood. 초안 후보: 출처 추론(PR·커밋·작성자) · 마커 기반 compiled 보고 ·
규칙 없음 → inbox 안내 · 기존 명령 출력 불변 · 명령 문서 계약(멱등·기본 브랜치·추가만).*
<!--
```json
{ "version": 1, "review": "required", "tests": "skip" }
```
-->

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 인터뷰 질문 묶음: `docs/chad/wiki-compile/questions-2.md`
- 선례: `commands/harness-loop.md` + `skills/harness-loop/SKILL.md` + `tests/loop-command.test.mjs`(#134, 스킬 + 기존 CLI)
- 마커 문법 선례: `src/commands/rules.mjs` `ruleMarker`
- (open) Q1 형태 — 스킬 + `wiki sources` CLI인가, 스킬 단독인가
- (open) Q2 실행 시점 — 종결 절차의 어디인가, 종결 커밋에 같이 담는가
- (open) Q3 설정 자리와 규칙 없을 때의 기본값
- (open) Q4 멱등 마커 형식과 재컴파일 동작
- (open) Q5 dogfood 대상과 이 저장소에 `wiki/`를 커밋할지
- (open) Q6 R1 `10_ssot/` 겹침 — 이번에 다룰지 이월할지

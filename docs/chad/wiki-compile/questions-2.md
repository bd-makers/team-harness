# wiki-compile — 질문 2 (R1 발견 · 인터뷰 · 복잡도 게이트)

spec 초안: `docs/chad/wiki-compile/wiki-compile-spec.md` (원천 = harness-cycle §4-4·§5·§6, D5·D11, 브리프).
선행 채점: Goal pass · Context pass · **Constraint fail**(형태·설정 자리 미정) · **Success fail**(dogfood·시나리오 미정) · **Ontology fail**(작성자 미정의).
아래 9문항에 답하면 spec에 반영하고 채점 → plan으로 간다. 권장안 그대로면 `전부 권장` 한 줄로 충분하다.

---

## R1 원천 검토 발견

### 1. (F1, 충돌) 위키 파일 모양 — 규칙 문서가 없을 때 어디에 쓰나?
§4-4 본문·§4-2b는 `wiki/<area>.md`(평면, area = workspace 이름), 메인테이너 입력은 번호 폴더 + `wiki/90_system/` 규칙.
- **권장: 규칙이 정한다. 규칙 문서가 없으면 모두 `wiki/99_inbox/`로 보내고 규칙 작성을 안내한다.** 평면 `wiki/<area>.md`를 기본값으로 박으면 그것이 곧 코드에 박힌 분류 체계라 D11·R-4에 어긋난다. `<area>.md`는 규칙 문서가 고를 수 있는 한 가지 모양으로 남긴다.
- 대안: 규칙 없으면 `wiki/<area>.md`(area 없으면 `wiki/general.md`).

### 2. (F2, 누락) "작성자"는 누구인가?
- **권장: task meta의 `user`(하네스 멤버 이름).** summary 원장과 같은 신원이라 "팀원이 무엇을 바꿨나"(니즈 1)와 바로 이어진다. 머지 커밋 작성자는 머지한 사람이라 작성자가 아닐 수 있고, PR 작성자는 `gh`·네트워크가 필요하다.
- 대안: `user` + 머지 커밋 author 둘 다 기록.

## 인터뷰 (브리프 열린 질문 1–6)

### 3. (Q1 형태) 스킬과 CLI를 어떻게 나누나?
- **권장: 스킬 `/harness-wiki`(LLM: 분류·병합·작성) + 읽기 전용 CLI `harness-team wiki sources <user>/<task>` 하나(결정론: task 문서 경로·meta·출처(PR·커밋·작성자)·이미 컴파일된 위치·규칙 파일 목록을 JSON으로).** 출처 추론과 중복 검사를 테스트 가능한 코드로 두어 R2 시나리오가 실제 테스트에 묶이고, C2가 같은 출처 정보를 재사용한다. 쓰기는 하지 않는다.
- 대안 A: 스킬 단독(§4-3처럼 기존 CLI만) — 가장 작지만 git 이력 해석·마커 검색이 프롬프트 안에 있어 테스트 불가.
- 대안 B: CLI가 위키 파일까지 쓴다 — LLM 판단과 결정론 쓰기가 섞여 기각 권장.
- 검증 메모: 이 저장소에서 `git log --first-parent --reverse origin/main -- docs/chad/<task>` 첫 줄이 #134·#133·#129 머지 커밋을 정확히 준다.

### 4. (Q2 실행 시점) 머지 → done → summary 중 어디서 도나?
- **권장: 머지 후 종결 절차에서 `done` 다음, `summary --write`와 같은 종결 커밋에 담는다(선택 단계).** `done`이 끝나야 meta가 `status: done`이라 "머지된 task"가 확정되고, 기본 브랜치(D5)·같은 커밋이라 커밋이 하나 늘지 않는다. `commands/harness-task.md` 종결 절에 "선택" 한 줄만 더하고 `done`·`summary` 코드는 바꾸지 않는다.
- 대안: 종결과 분리된 별도 커밋/별도 시점(여러 task를 모아 배치 컴파일).

### 5. (Q3 설정 자리) 규칙은 어디에 두나?
- **권장: `wiki/90_system/` 아래 프로젝트 문서만. `.harness/config.json` 키는 만들지 않는다.** config.json은 사용자별 gitignore라 팀원마다 분류가 갈린다(`gates.json` 정정과 같은 이유). 위키 루트는 `wiki/` 고정. 규칙 없을 때 기본값은 1번 답.

### 6. (Q4 멱등) 다시 컴파일하면?
- **권장: 컴파일 단락마다 `<!-- harness:wiki pr=<N> commit=<sha7> task=<user>/<task> author=<user> at=<YYYY-MM-DD> -->` 마커. `wiki sources`가 같은 `task=` 마커를 찾으면 `compiled`로 보고하고 스킬은 멈춘다. 사용자가 재컴파일을 명시하면 그 마커의 단락만 교체한다.** `harness:rule`·`harness:review`와 같은 문법이라 새 형식을 배우지 않는다. 키를 `task=`로 두는 이유: PR 하나에 task 하나가 관례지만 PR 번호를 못 찾는 경우(`pr=null`)에도 중복을 막는다.

### 7. (Q5 dogfood) 무엇을 증거로 삼나?
- **권장: 이 저장소에 `wiki/index.md` + `wiki/90_system/<규칙>.md`(최소 규칙) 를 커밋하고 `default-loop-skill`(#134)·`r2-scenario-evidence`(#133)를 컴파일. 같은 명령을 두 번 돌려 두 번째가 `compiled`로 멈추는 것까지 증거로 남긴다.** 두 task는 서로 관련(QA가 R2를 씀)이라 "기능 단위로 모인다"를 보여 준다.
- 주의: 이 저장소는 D7(자기 하네스 비-dogfood 관행) 대상이지만 task 문서는 이미 쓰고 있어 `wiki/`도 같은 선에 둔다. `wiki/`를 이 저장소에 영구로 두기 싫다면 대안: 테스트 픽스처 저장소에서만 dogfood.

### 8. (Q6 R1 `10_ssot/` 겹침) 이번에 다루나?
- **권장: 이월(`(open → C2 이후 별도 task)`).** C1 입력은 머지된 task 문서뿐이다. 원천 문서(kc_vault 등)를 위키로 옮기는 일은 입력·실행 시점이 달라 범위를 두 배로 만든다.

## 복잡도 게이트 (영향 파일 ≥ 5) — escalation 패킷

### 9. 아래 범위로 진행해도 되나?
예상 영향 파일(권장안 기준, 추가 위주): `src/commands/wiki.mjs`(신규) · `bin/harness-team.mjs`(디스패치 1줄) · `commands/harness-wiki.md`(신규) · `skills/harness-wiki/SKILL.md`(신규) · `.claude-plugin/plugin.json`(commands 1줄, 버전 아님) · `tests/wiki.test.mjs`·`tests/wiki-command.test.mjs`(신규) · `commands/harness-task.md`(종결 절 선택 1줄) · `CHANGELOG.md`([Unreleased]) · `README.md`·`docs/harness-overview.html`(docs:check 대상이면) · `wiki/`(dogfood).
- **결정 요청**: 위 범위(스킬 + 읽기 전용 CLI 1개 + dogfood `wiki/`)로 진행 승인.
- **권장안**: 승인. 기존 명령의 코드 경로는 디스패치 1줄 외에 바뀌지 않는다(R-5). 모델 전환 불필요 — 설계 결정은 위 1–8번 답으로 끝난다.
- **시도한 대안**: 2차 장치 검토 — `rules promote` 확장(결정론 복사와 LLM 판단이 섞임), `summary --write` 확장(`--check` 바이트 대조가 깨짐), artifact 축소(D11 강제 4문서) 모두 기각. 스킬 단독은 3번 대안 A.
- **기다림의 비용**: plan·구현 전부 막힌다. spec 초안·질문 파일은 미커밋으로 워크트리에 있다.
- **안전 기본값**: 답이 없으면 아무것도 구현하지 않고 멈춘다.

---
답 형식 예: `1 권장, 2 대안, 3 권장, … 9 승인` 또는 `전부 권장`.

# remove-personal-tool-refs — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: 메인테이너가 개인적으로 쓰는 도구(AO, Orca·firstmate)의 규칙·가이드와 개인 환경 흔적(Obsidian 볼트 frontmatter,
  개인 스킬 이름, D7 이후 남은 OpenCode 항목)이 팀 하네스 저장소에 들어 있다. 소비자 프로젝트로 설치되지는 않지만,
  플러그인 캐시로 팀원에게 복사되고 README·docs 색인에서 팀 문서처럼 보인다.
- **영향**: 플러그인을 설치한 팀원(캐시·문서), 소비자 프로젝트(`templates/docs/README.md` frontmatter, init이 쓰는 gitignore 항목).
- **기대 결과**: 살아 있는 표면에서 위 흔적이 사라진다. 이력(CHANGELOG, what-changes 스냅샷, 기존 task 문서)은 그대로 둔다.
- **제약**: AO 규칙 파일은 지우지 않고 `~/.ao/ao-worker-rules.md`로 옮긴다(메인테이너 개인 설정이 계속 쓸 수 있도록).
  명령 파일 frontmatter의 Claude Code 키(`description`·`phase`·`argument-hint`)는 보존한다.

## 설계 / 접근
2026-10-05 메인테이너 결정 6건을 그대로 적용한다.
1. `docs/ao-worker-rules.md` → `~/.ao/ao-worker-rules.md`로 복사 후 저장소에서 제거. 참조(`docs/index.html` 2곳, `docs/prerequisites.md`) 정리.
2. `docs/harness-fleet-guide.html`(Orca·firstmate 크루 가이드) 제거. 참조(README 문서 표, `docs/index.html` 크루 운용 경로·Guides, `docs/harness-task-guide.html`) 정리.
3. Obsidian frontmatter 키 `tags`·`created`·`modified` 제거(33파일). 블록이 비면 블록째 제거.
4. `src/harness.mjs` `AI_GITIGNORE_ENTRIES`의 `oh-my-openagent.json` 제거(D7 잔재).
5. `commands/harness-ship.md` 보고 예시의 `codex-shipcheck` 줄 제거.
6. `docs/followups.md`의 개인 스킬(`delegation-router`) 경로 문단 제거.
- superpowers는 "설치돼 있으면 쓴다"는 현재 문구를 유지한다(결정 2).

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **개인 도구 흔적**: 메인테이너 한 사람의 도구·환경에만 의미가 있는 규칙·가이드·메타데이터. 팀 하네스의 사이클(S0–S8)이나 가로축 어디에도 봉사하지 않는다.
- **이력 표면**: CHANGELOG·what-changes 버전 스냅샷·기존 task 문서. 당시 사실의 기록이라 고치지 않는다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

근거: 대상 6건과 파일이 메인테이너 결정으로 확정됐고, 성공 기준은 아래 grep 0건 + `npm test`·`docs:check` 통과다.

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
```json
{ "version": 1, "review": "optional", "tests": "skip" }
```
`tests: skip` 사유: 소스 변경은 gitignore 상수에서 죽은 항목 하나를 지운 것뿐이고, 기존 테스트가 그 항목을 참조하지 않는다. 회귀는 전체 `npm test`로 확인한다.

성공 기준(재현 명령):
- `git grep -n -i "ao-worker\|fleet-guide\|oh-my-openagent\|codex-shipcheck\|delegation-router" -- . ':!docs/*/*/*' ':!CHANGELOG.md' ':!docs/what-changes-*'` → 0건
- `git grep -l -E '^  - obsidian$'` → 0건
- `npm run test`, `npm run docs:check` 통과

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 배경: `docs/harness-cycle-draft.md`(미커밋 초안) D11 후보 "개인 도구·서드파티 오케스트레이터 의존 금지".
- 남긴 것: `docs/loop-graph-workflow-qna-0.13.html:271`의 firstmate 언급(버전 고정 스냅샷, 이력).
- (open) Obsidian의 frontmatter 자동 갱신 플러그인이 이 폴더에서 켜져 있으면 `modified:`가 다시 생길 수 있다 — 볼트 설정에서 이 폴더 제외 필요.

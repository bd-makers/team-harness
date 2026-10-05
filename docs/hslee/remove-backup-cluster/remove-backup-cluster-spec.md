# remove-backup-cluster — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: D11(`docs/decisions.md`) 기준으로 사이클 어느 단계에도 봉사하지 않는 장치가 남아 있다 — 저장소 밖 백업 클론
  (`../harness-backup/<project>/`, `backup.json`, `clone.sh`·`symlink.sh`·`delete.sh`, backup·clone·symlink·delete·upgrade 명령)과
  그 짝인 init의 "AI 설정 파일 gitignore" 옵션. 후자는 팀이 같은 `AGENTS.md`를 git으로 공유한다는 정체성과 정면으로 어긋난다.
  또 이 저장소에서만 동작하는 sim·codex-sim·release가 소비자 메뉴에 배포된다.
- **영향**: 소비자 init 흐름(백업 위치 질문·gitignore 질문), doctor(`backup.json` 필수 검사), 소비자 슬래시 메뉴·Codex 스킬.
- **기대 결과**: 위 장치 제거. 새 설치가 doctor에서 실패·경고하지 않는다. 기존 백업 폴더·`backup.json`은 건드리지 않는다.
- **제약**: migrate의 관리 절 백업(`.harness/backup/managed-sections-*`)은 다른 기능이라 유지. 이력 문서는 고치지 않는다.


## 설계 / 접근
2026-10-05 메인테이너 결정(cycle §4-6, 이 대화). 구현은 서브에이전트(sonnet)에 위임하고 메인 세션이 검증했다.
- 제거: `src/commands/{backup,clone,symlink,delete,upgrade}.mjs`, `src/backup-dir.mjs`, `templates/{clone,delete,symlink}.sh`,
  명령·스킬 4종, init의 백업·gitignore 질문과 플래그(`--no-backup`·`--backup-dir`·`--backup-parent`·`--gitignore-ai`),
  migrate의 `migrateBackupScripts`·`refreshProjectScripts`, doctor의 `backup.json` 필수·백업 스크립트·백업 클론 검사, `cloudSyncPathWarning`.
- 이동: `commands/harness-{sim,release}.md` → `.claude/commands/`, `skills/harness-{sim,codex-sim,release}/` → `scripts/maintainer-skills/`.
- 문서: README·MAINTAINING·prerequisites·index·overview(생성물 재생성)·workflow-simulation(현행본).


## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **백업 클론**: 저장소 밖 형제 폴더에 AI 설정을 복사·링크하던 장치. AI 설정을 git에 넣지 않는 프로젝트를 위한 것이었다.
- **관리 절 백업**: migrate가 관리 절 원본을 `.harness/backup/`에 남기는 것 — 이름만 비슷한 별개 기능, 유지.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```
성공 기준: `npm run test` fail 0, `npm run docs:check` 통과, 제거 식별자 grep이 이력·거부 테스트 외 0건, 임시 저장소 init이 백업 질문 없이 끝나고 doctor에 백업 관련 경고·실패 없음.

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

-

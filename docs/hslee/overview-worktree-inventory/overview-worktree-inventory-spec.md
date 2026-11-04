# overview-worktree-inventory — Spec

## 목적 / 요구사항
- **문제**: `docs/harness-overview.html`의 파일 인벤토리는 `git ls-files`(index) 기준이다(`scripts/generate-harness-overview.mjs:98-107`).
  새 파일을 만들고 `git add` 전에 `docs:generate`를 돌리면 인벤토리에서 빠진다. 그 HTML을 커밋하면 CI의 깨끗한 체크아웃에서는 파일이 있으므로
  `docs:check`가 깨진다. 삭제는 반대로, index에 남은 동안 인벤토리에 계속 나온다. "`docs:generate` 전에 `git add`" 학습이 artifact에 9회 반복됐다
  (`diagram-companion-pin`, `prerequisites-doc`, `ship-command`, `audit-cleanup` 등). 이와 별개로 `MAINTAINING.md:52`의 eager 수치는 실측과 다르다.
  문서에는 프로젝트 소계 16,425 B, 여유 1,075 B로 적혀 있다. 2026-11-04 실측은 17,256 B, 여유 244 B다
  (task `subsystem-audit` 후보 D, 피드백 F5 + 지시 I7).
- **영향**: 이 저장소의 메인테이너와 에이전트. 소비자에게는 배포되지 않는다(`scripts/`는 저장소 전용).
- **기대 결과**: ① `git add` 순서와 관계없이, 생성 결과가 커밋될 트리와 같다. ② MAINTAINING에 낡을 실측 수치가 없고, 측정 명령만 남는다.
- **제약**: 새 명령·플래그 없음(2차 장치 규칙). CI 의미는 바꾸지 않는다. eager 0 B.

## 범위 (In / Out)
- **In**: `scripts/generate-harness-overview.mjs`(인벤토리 출처), `tests/harness-overview-generation.test.mjs`(계약 테스트 분할·이동),
  `MAINTAINING.md:39`(생성 순서 안내), `MAINTAINING.md:52`(eager 수치), `CHANGELOG.md`, `docs/harness-overview.html`(재생성 — 이번 변경으로 내용이 바뀌는 경우만).
- **Out**: 과거 artifact의 학습 문장과 `CHANGELOG.md` 과거 항목(이력이다). `docs-version-drift` 검사. 규칙 승격(`/harness-promote`) — 원인을 없애므로 승격하지 않는다.

## 원천 검토 (R1)
### 원천
- task `subsystem-audit` spec 후보 D. PR #10(`2dc50cf`)의 리뷰 커밋 "Filter overview inventory to tracked sources".
### 발견
- **이전 결정을 뒤집는다**: tracked-only는 PR #10 리뷰에서 의도적으로 좁힌 결과다. 테스트 `ignored and untracked source-root files do not change the generated overview`가
  그것을 고정한다. 리뷰가 막으려던 것은 `.DS_Store` 같은 로컬 잡파일이 생성물에 섞이는 일이다. 이 우려는 ignored 파일 쪽이고, `--exclude-standard`가 그대로 막는다.
  untracked 쪽만 의미가 바뀐다.
- **감수하는 반대 실패**: `src/`·`tests/` 아래 커밋하지 않을 WIP 파일이 있으면 그 파일이 HTML에 들어간다. 그 파일 없이 HTML만 커밋하면 CI가 깨진다.
  감수 근거: 이 저장소의 커밋 관례가 `git add -A`이고, 9회 반복된 쪽은 그 반대 방향이었다.
- **삭제됐지만 index에 남은 파일** → 제외한다(`git add -A`는 삭제를 스테이징한다).
- **CI 의미 불변**: 깨끗한 체크아웃에서는 index와 작업 트리가 같다. 결과가 바뀌는 것은 로컬뿐이다. 이 저장소에는 `.harness/gates.json`이 없어 게이트는 CI `docs:check`다.
- **D② 숫자 처리**: 실측 리터럴(소계·파일별·남는 몫·여유·실측 날짜)을 지운다. 상수는 이름과 정의 위치만 남긴다. 값도 같이 낡기 때문이다.
  날짜가 붙은 과거 사건(2026-09-26 여유 5 B, 0.41.0의 170 B)은 이력이라 남긴다.
- 검토 완료: 2026-11-04

## 설계 / 접근
인벤토리 = **`git add -A`가 스테이징할 트리**. `git ls-files -z --cached --others --exclude-standard -- <entries>`의 결과에서, `lstat`으로 없는 경로와 디렉터리를 거른다.
`--deleted`를 쓰지 않는 이유: 파일이 같은 이름의 디렉터리로 바뀐 경우를 놓친다(codex 리뷰 P2, 재현 확인). 같은 필터가 내장 저장소의 `src/vendor/` 행도 없앤다.
JS `Set`으로 중복을 없앤다(충돌 중인 경로는 `--cached`에 여러 번 나온다). 함수 이름은 `listTrackedSourceFiles` → `listSourceFiles`로 바꾼다.
테스트는 저장소 루트에 fixture를 만들지 않는다. 임시 `git init` 저장소에서 `buildFileRows(fixture, [])`로 네 경우를 본다.
ignored → 없음, untracked → 있음, 지웠지만 index에 남은 파일 → 없음, 디렉터리로 바뀐 파일 → 안의 파일만 있음. `git add -A` 뒤에 같은 결과인지 다시 비교한다.
**지원 범위 밖**: sparse 체크아웃(cone 밖 tracked 파일이 표에서 빠진다)과 gitlink(표에 나오지 않는다). 이 저장소는 sparse를 쓰지 않고 gitlink가 0개다.

## Ontology
- **소스 인벤토리**: overview의 파일 표. 정의는 "`sourceTreeEntries` 아래에서 `git add -A`가 스테이징할 파일 집합"이다. 깨끗한 체크아웃에서는 `git ls-files`와 같다.
- 게이트 통과 근거: 목표·제약·성공 기준·영향 파일이 위에 모두 확정돼 있다.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%)
- [x] **Constraint 명확도** (30%)
- [x] **Success 기준** (30%) — 세 경우 테스트 통과, `git add` 전에 돌린 `docs:generate` 결과가 `git add -A` 뒤의 `docs:check`와 일치, `npm test` fail 0
- [x] **Context 명확도** (brownfield 한정)
- [x] **Ambiguity ≤ 0.2** — 1.0

## Done evidence
```json
{ "version": 1, "tests": "required" }
```

## 참고
- `tests/user-handoff-untracked.test.mjs` — 임시 git 저장소 helper 선례.
- `src/commands/doctor.mjs:650` `EAGER_TIER_MAX_BYTES`, `tests/agent-files.test.mjs:448` `PROJECT_EAGER_MAX_BYTES`.

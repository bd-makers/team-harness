# task-clean — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: task를 시작한 뒤 방향이 틀렸거나 결과가 마음에 들지 않아 버리고 싶을 때, "task 시작 전 상태"로 한 번에
  돌아가는 경로가 없다. 지금은 손으로 `git reset`·`git clean`·task 폴더 삭제·`active.json` 정리를 따로 해야 하고,
  미커밋 작업은 되살릴 길 없이 사라진다. 상태는 `open`/`done`뿐이라 `done --force`(원장 오염)나 방치(재개 후보로 영구 노출)
  밖에 선택지가 없다.
- **영향**: task를 브랜치·worktree에서 진행하는 모든 harness 사용자(Claude·Codex 세션 포함).
- **기대 결과**: `harness-team clean [<name>]`이 기본은 dry-run으로 지울 커밋·미커밋 변경 목록을 보여 주고, `--yes`면
  (1) 현재 상태 전체를 백업 ref에 스냅샷으로 남긴 뒤 (2) 코드·문서를 task 시작점으로 되돌리고 (3) 활성 task 포인터를 비운다.
  별도 상태(`dropped` 등)는 남기지 않는다.
- **제약**: 원격(push된 브랜치·열린 MR)에는 쓰지 않는다 — 안내만 한다. 기본 브랜치에서는 실행하지 않는다.
  gitignore 파일(`node_modules/`·`.harness/config.json` 등)은 건드리지 않는다.

## 범위 (In / Out)
- **In**: `task` 생성 시 meta에 `baseSha` 기록(생성 1회) · 새 하위명령 `clean`(`src/commands/clean.mjs`, `cli-args` 등록,
  router) · 백업 ref `refs/harness/trash/…` · 명령 문서(`commands/harness-task.md`)·README·CHANGELOG · 테스트.
- **Out**: 원격 브랜치 삭제·force-push·MR close(외부 쓰기 — 안내만) · `dropped` 상태와 원장 기록(사용자가 "기록 없이 지우기"를
  선택) · 백업 ref 자동 만료/정리(손으로 `git update-ref -d`) · `--json` envelope(필요해지면 후속) · `done`된 task의 되돌리기.

## 원천 검토 (R1)

### 원천
- 없음 — 외부 원천 문서 없음. 사용자 대화(2026-11-17)와 advisor 검토가 요구의 출처다.

### 발견
- 검토 완료: 2026-11-17

## 설계 / 접근

### 시작점(anchor) 판정 — 우선순위
1. `--base <ref>` → `merge-base(<ref>, HEAD)` (사람이 준 기준이 이긴다. `review`·`scope`의 `resolveScope`를 그대로 쓴다)
2. `meta.baseSha` → task 생성 시점 HEAD. HEAD의 조상이 아니면(rebase 등) 거부하고 `--base`를 안내한다.
3. 둘 다 없으면(구 task) `resolveScope({ scope: 'worktree' })`의 `mergeBase`(기본 브랜치와의 merge-base). 못 구하면 거부.

`baseSha`는 `created:` 경로에서만 쓴다. 재활성화·reopen은 meta를 펼쳐 쓰므로 건드리지 않는다. git이 아니거나 unborn HEAD면
키를 쓰지 않는다(키 부재 = 폴백).

### 거부(exit 1, 아무것도 쓰지 않음)
- git 저장소가 아님 · 대상 task 없음(인자도 활성도 없음) · task 폴더 없음
- `meta.status === 'done'` — 범위는 "done 이전"이다.
- `meta.reopenedAt`이 있고 `--base`가 없음 — 재개된 task의 `baseSha`는 이미 머지된 작업보다 앞이라 시작점이 모호하다.
- 현재 브랜치가 기본 브랜치 후보(`defaultBranchCandidates`)이거나 detached HEAD
- anchor 이후 변경(커밋 범위 + 미커밋 + untracked)이 **다른 task 폴더**를 건드림 — 남의 작업까지 지우지 않는다.

### 실행 (`--yes`)
1. **백업**(stash 모양): 실제 인덱스를 `write-tree` → 인덱스 커밋 I. 실제 인덱스를 임시 `GIT_INDEX_FILE`로 복사 → `add -A`
   (untracked 포함, ignored 제외) → anchor 가 추적하는데 지금 인덱스에 없는 경로의 파일(reset 이 덮어쓸 ignored 포함)을 `add -f` →
   `write-tree` → `commit-tree -p HEAD -p I` → `update-ref refs/harness/trash/<user>/<task>/<YYYYMMDDTHHMMSSmmmZ>`.
   `git stash create`는 untracked를 빠뜨리므로 쓰지 않는다. ref 이름에 `:`를 넣지 않는다.
2. **되돌리기**: `git reset --hard <anchor>` → **백업 시점의 untracked(`??`) 목록만** 지운다(anchor 가 추적하는 경로 제외)·빈 디렉터리 정리.
   `git clean`은 쓰지 않는다 — reset 이 `.gitignore`를 되돌리면 ignored 였던 파일이 clean 대상이 되기 때문이다(codex P1).
3. **harness 상태**: `active.json`이 이 task를 가리킬 때만 `null`로 비우고 user handoff를 "활성 없음" 형태로 쓴다.
4. **안내**: 복구 명령(`git reset --hard <ref>^` + `git restore --source <ref> --worktree -- :/`), 백업 목록
   (`git for-each-ref refs/harness/trash`), upstream이 있으면 원격 정리 명령(force-push 또는 브랜치 삭제·MR close)을 출력만.

### 에이전트 규칙
에이전트는 dry-run 출력을 사용자에게 보여 주고, **그 목록에 대한 명시적 승인** 뒤에만 `--yes`를 붙인다. 일반적인 "진행해"는
`reset --hard` 승인이 아니다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **clean**: task 하나의 작업(커밋·미커밋·task 문서)을 그 task의 시작점으로 되돌리는 로컬 전용 조작. 상태를 남기지 않는다.
- **anchor(시작점)**: clean이 되돌아갈 커밋. `--base` → `meta.baseSha` → 기본 브랜치 merge-base 순으로 정한다.
- **baseSha**: task 생성(`created:`) 시점의 HEAD. meta에 1회 기록하고 바꾸지 않는다.
- **백업 ref**: clean 직전 작업 트리 전체(ignored 제외)를 담은 커밋을 가리키는 `refs/harness/trash/<user>/<task>/<ts>`.
- 게이트 근거: 목표·제약·성공 기준·영향 파일이 모두 위에 명시됨(Ambiguity ≈ 0.1).

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "optional" ("required"면 소스가 바뀔 때 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence

```json
{ "version": 1, "review": "required", "tests": "required" }
```

성공 기준(전부 `tests/clean.test.mjs`, 임시 git 저장소에서만 실행 — 이 워크트리에서 `--yes`를 돌리지 않는다):
- dry-run은 아무것도 쓰지 않는다(HEAD·작업 트리·ref·active 불변).
- `--yes` 뒤 HEAD = anchor, task 폴더·untracked 파일 제거, 백업 ref 존재, 백업 트리에 미커밋·untracked 내용 포함.
- ignored 파일은 살아남는다.
- 기본 브랜치·detached·done·reopened(무 `--base`)·다른 task 폴더 접촉·비 git에서 거부.
- `baseSha` 없는 task는 merge-base로 폴백, `baseSha`가 조상이 아니면 거부.
- `task <name>` 생성 시 meta에 `baseSha`가 기록되고, 재활성화는 바꾸지 않는다. `task clean`은 예약 이름으로 거부된다.

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- `src/commands/review.mjs` `resolveScope` — merge-base 판정 정본(복제하지 않는다)
- `src/commands/summary.mjs` `defaultBranchCandidates`·`taskMetaTemplate`
- `src/commands/task.mjs` `runDone` — active·user handoff 정리 선례
- `tests/task-name-reuse.test.mjs` — 폴더 없는 open task는 원장에서 빠지고 이름 재사용 가능(clean 후 상태)

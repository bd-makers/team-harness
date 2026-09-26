# done-guard-subdir-paths — Spec

## 목적 / 요구사항
- **문제**: git이 내는 경로(`status --porcelain -z`·`diff-tree --name-only`)는 **저장소 루트 기준**인데, 비교 대상
  (`handoffRelPaths`·활성 plan 경로)은 **targetDir 기준**이다. 하네스를 저장소 하위 디렉터리(모노레포 패키지 등)에
  설치하면 두 경로가 영영 일치하지 않는다. #108 codex 리뷰 P2로 드러났고 0.44.0 노트에 한계로 적었다.
- **영향**(모두 `src/commands/task.mjs`):
  1. `done` 가드 — 훅이 쓴 handoff 2파일을 제외하지 못해 handoff만 dirty여도 "커밋되지 않은 변경"으로 막힌다.
  2. `done` 가드 — 체크박스만 켠 plan.md 면제(#108)가 작동하지 않는다.
  3. post-commit `commitTouchesOnlyHandoff` — handoff만 담은 sweep 커밋을 알아보지 못해 매번 기록한다(churn 루프).
  세 곳 모두 막는/기록하는 쪽(fail-closed)으로 틀려 데이터 손실은 없다.
- **기대 결과**: 하위 디렉터리 설치본에서도 루트 설치본과 같은 판정.
- **제약**: 루트 설치본 동작 불변. 가드가 보는 dirty 범위를 targetDir 아래로 **좁히지 않는다** — 설치 디렉터리 밖의
  미커밋 변경도 종전대로 막는다. 경로를 좁히는 대신 비교 집합을 루트 기준으로 올린다.

## 설계 / 접근
- `git rev-parse --show-prefix`(targetDir의 저장소 루트 기준 접두, 루트면 빈 문자열)를 읽는 헬퍼 하나를 두고,
  세 비교 지점에서 targetDir 기준 경로 앞에 붙인다. 실패하면 빈 접두(= 종전 동작)로 degrade.
- `git show HEAD:./<plan>`·`git diff -- ./<plan>`은 cwd(`-C targetDir`) 기준이라 이미 옳다 — 그대로 둔다.
- `classifyChangedPaths`(테스트 작성 체크)는 확장자·패턴 판정이라 접두와 무관 — 범위 밖.
- 문서: `commands/harness-task.md` "머지 후 종결"의 한계 문장 제거, CHANGELOG `[Unreleased]` Fixed.
- 기각: `git status -- .`로 targetDir 아래만 보기(설치 밖 변경을 놓침 — 가드 약화) ·
  `--show-toplevel`과 `path.relative`로 계산(symlink·realpath 차이로 macOS `/private/var` 불일치 위험, show-prefix는 git이 직접 계산).

## Ontology
- **targetDir**: 하네스가 설치된 디렉터리(`.harness/`가 있는 곳). 저장소 루트이거나 그 하위 디렉터리.
- **루트 기준 경로**: git이 porcelain·diff-tree로 내는 저장소 루트 상대 경로. targetDir 기준 경로 = prefix + 그것.
- 게이트 통과 근거: 결함 위치 3곳과 재현 조건(하위 디렉터리 설치)이 테스트로 표현되고, 수정이 한 헬퍼로 모인다.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 하위 디렉터리 설치본에서 handoff 제외·plan 면제·sweep 판정이 루트 설치본과 같다
- [x] **Constraint 명확도** (30%) — 루트 동작 불변, dirty 범위를 좁히지 않음, 실패 시 종전 동작
- [x] **Success 기준** (30%) — 하위 디렉터리 fixture 테스트(통과 2·차단 1·훅 sweep 1)가 수정 전 red → 후 green, `npm test` fail 0
- [x] **Context 명확도** (brownfield 한정) — `src/commands/task.mjs` 가드 git 블록·`commitTouchesOnlyHandoff`, `tests/done-guard.test.mjs`, `tests/handoff-hook-churn.test.mjs`, `commands/harness-task.md`
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
```json
{ "version": 1, "review": "required" }
```

## 참고
- 출처: `docs/hslee/done-ritual-fold/done-ritual-fold-artifact.md` Reviews — codex P2 "porcelain 경로는 저장소 루트 기준인데 planRel은 targetDir 기준".
- 0.44.0 CHANGELOG·what-changes의 "한계" 문단(발행 스냅샷은 고치지 않는다).

# handoff-amend-dedup — Spec

## 목적 / 요구사항

**오늘 무엇이 안 되는가.** `git commit --amend`는 post-commit 훅을 **다시** 돌린다. 훅은 append만 하므로
같은 논리 커밋에 항목이 둘 남고, 첫 항목이 가리키는 sha는 amend로 **사라진 커밋**이다.
2026-09-11 0.38.0 릴리스에서 실제로 났다(`f528422` 항목 → amend 후 `c1d1382`, 나란히 남아 손으로 지웠다).

**기대 결과.** amend면 마지막 항목을 **교체**한다. 그 외(일반 커밋·병합·rebase·checkout)는 종전대로 append.

**제약.**
- 판별은 **정확해야 한다.** "마지막 항목의 sha가 HEAD의 조상이 아니다"만으로는 브랜치 전환과 구분되지 않아
  **진짜 항목을 지운다** — 0.38.1에서 이 휴리스틱을 명시적으로 기각했다.
- 교체는 **amend가 실제로 밀어낸 항목**에만 한다. 훅이 직전 커밋에 기록을 남기지 않았을 수도 있다
  (그 커밋이 sweep이라 건너뛴 경우) — 그때 마지막 항목은 **더 이전의 진짜 커밋**이므로 지우면 안 된다.
- 판정 불가(git 없음·reflog 없음·파싱 실패)면 **append** — 잃는 쪽이 아니라 남기는 쪽으로 틀린다.

## 설계 / 접근

두 조건이 **모두** 참일 때만 마지막 항목을 잘라내고 새 항목을 쓴다.

1. **amend였다** — `git reflog -1 --format=%gs HEAD`가 `commit (amend)`로 시작한다.
   (2026-09-12 실측: 일반 `commit: …` / 최초 `commit (initial): …` / 병합 `merge <b>: …` /
   `checkout: …` / `rebase (finish): …` 와 모두 구분된다. 병합의 amend도 `commit (amend): …`로 나온다.)
2. **그 항목이 amend가 밀어낸 바로 그 커밋을 가리킨다** — 항목 헤딩 `## <ISO> — <sha> <msg>`의 sha가
   `git rev-parse HEAD@{1}`(amend 직전 HEAD)과 **같다**. 접두 대조다 — 항목에는 short sha가 들어간다.

조건 1만 참이면(훅이 직전 커밋을 건너뛰어 마지막 항목이 더 이전 커밋일 때) append한다.

**"HEAD의 조상이 아니다"로는 안 된다(2026-09-12 codex P1).** 브랜치 전환·rebase 뒤 amend하면 다른 브랜치에
**살아 있는** 커밋의 항목도 조상이 아니어서 지워진다. 동일성 대조는 그 경로를 원천적으로 닫고, 변경 없는
`--amend --no-edit`가 같은 OID를 만드는 경우(조상 판정이면 교체를 건너뛰어 중복이 남는다)도 함께 해결한다.

## Ontology

- **amend 교체**: post-commit 훅이 amend 직후 마지막 항목을 새 항목으로 바꾸는 동작. append의 예외다.
- **고아 항목**: 이력에 없는 sha를 가리키는 handoff 항목. amend가 남기던 것이 정확히 이것이다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — "amend면 마지막 항목을 교체한다" 한 문장.
- [x] **Constraint 명확도** (30%) — 두 조건 AND · 판정 불가는 append · 브랜치 전환 휴리스틱 금지.
- [x] **Success 기준** (30%) — 테스트 5종(amend 교체 / 일반 append / 병합 append / skip된 직전 커밋 보존 / reflog 없음).
- [x] **Context 명확도** (brownfield) — `src/commands/task.mjs`의 `runHandoffAuto`, `tests/handoff-hook-churn.test.mjs`.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고
- 근거·기각 이력: `docs/followups.md` 9번(이 task로 올리며 삭제), `handoff-hook-churn-spec.md`의 "범위 밖".
- 크기: ① 표면의 수정 → **patch(0.38.2)**. what-changes 문서는 patch에도 필수(3방향 pin).

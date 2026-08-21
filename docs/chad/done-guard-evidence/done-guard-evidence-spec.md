# done-guard-evidence — Spec

## 목적 / 요구사항

`harness-team done`의 종결 가드에 **증거 기반 체크 2종**을 추가한다.

1. **테스트 작성 체크 (기본 ON)** — task 활성화 이후 소스 파일이 바뀌었는데
   테스트 파일이 하나도 바뀌지 않았으면 차단한다.
2. **리뷰 체크 (기본 OFF, spec 선언 시 ON)** — spec이 `review: required`를 선언한
   task는 artifact에 이 task 기간 중 생성된 리뷰 마커가 있어야 통과한다.

`/harness-review`·`/harness-adversarial-review`는 기록 단계에서
기계 판독 가능한 마커를 함께 남기도록 계약을 확장한다.

### 하지 않는 것 (결정)

- **`done`에서 테스트를 재실행하지 않는다.** 느리고, 비-JS·비-코드 task에서 오차단하며,
  이미 `pre-commit-check.sh`(커밋 직전 typecheck+test)와 "커밋 0개" 가드가 대부분 덮는다.
  단, 그 훅의 커버리지는 *Claude Code 세션 + JS 프로젝트 + `scripts.test` 존재 + 하네스가
  적용된 consumer 프로젝트*로 한정된다는 사실을 인지한 채로 내린 결정이다.
  (이 플러그인 소스 repo의 `.claude/settings.json`에는 hooks 섹션이 없다 — 훅은 `templates/`에만 있다.)
- **리뷰 stale 판정을 넣지 않는다.** 아래 Ontology의 "stale 리뷰" 항목 참고.
- **기존 "커밋 0개" 가드의 시간창 약점을 이번에 고치지 않는다.** 별도 task로 분리한다.

## 설계 / 접근

### 선언 포맷 — `boundary check`의 `not-configured` 전례를 따른다

spec.md에 아래 섹션이 있으면 그 값을, 없으면 기본값을 쓴다 (4칸 들여쓰기로 표기):

    ## Done evidence

    ```json
    { "version": 1, "review": "required", "tests": "skip" }
    ```

| 키 | 값 | 기본값 | 근거 |
|---|---|---|---|
| `tests` | `required` \| `skip` | `required` | git만으로 결정론적 판정 가능하고, 소스 변경이 있을 때만 발동해 오탐이 좁다 |
| `review` | `required` \| `optional` | `optional` | 마커 신뢰 기반이라 검증이 부분적. 모든 task에 걸면 `--force` 훈련이 된다 |

비대칭이 의도적이다: **검증 가능성이 높은 체크만 기본 ON**으로 둔다.

선언이 깨져 있으면(JSON 파싱 실패·알 수 없는 값) 차단 사유로 보고한다 —
조용히 기본값으로 되돌아가면 선언이 무력화된다.

### 체크 A — 테스트 작성

- 대상 파일 = `git log --since=<switchedAt> --name-only --pretty=format:` 의 파일 합집합
- 소스 = 코드 확장자 화이트리스트 (`.js .mjs .cjs .ts .tsx .jsx .py .go .rb .java .kt
  .swift .c .h .cpp .cc .cs .rs .sh .php .scala .m .mm .dart`)
- 테스트 = 경로/파일명 패턴 (`tests/` `test/` `__tests__/` `spec/` 디렉터리,
  `*.test.*` `*.spec.*` `*_test.*` `*Test.*` `*Tests.*` 파일)
- 판정: 소스 변경 있음 && 테스트 변경 없음 → 차단
- 문서·설정만 바뀐 task는 소스 변경이 0이라 애초에 발동하지 않는다

### 체크 B — 리뷰 마커

리뷰 명령이 artifact에 남기는 마커:

```
<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->
```

`done`은 artifact **파일 전체**를 스캔해(섹션 파싱은 취약하다) 마커를 찾고,
`at >= switchedAt` 인 마커가 하나라도 있으면 통과시킨다.

### 검증 강도에 대한 정직한 선언

이 가드는 **악의적 에이전트를 막지 못한다** — 마커는 손으로 쓸 수 있다.
막는 대상은 **망각**이며, 기존 4개 가드(미완 체크박스·템플릿 그대로인 artifact·
미커밋 변경·커밋 0개)와 정확히 같은 등급이다.

## Ontology

- **종결 가드(done guard)**: `runDone`이 `collectDoneIssues`로 수집하는 차단 사유 목록.
  하나라도 있으면 exitCode=1로 멈추고, `--force`면 경고만 남기고 진행한다.
- **증거(evidence)**: 에이전트의 주장이 아니라 **git 이력 또는 파일에 남은 마커**로
  확인 가능한 흔적. 이 task가 추가하는 두 체크는 모두 증거 기반이다.
- **`not-configured`**: 선언이 없어 검사할 대상이 없는 상태. 실패가 아니라 통과다.
  `boundary check`가 쓰는 것과 같은 의미 ([src/commands/boundary.mjs:186]).
- **stale 리뷰**: 리뷰 이후 새 소스 변경이 들어온 상태. **이번 범위에서 판정하지 않는다.**
  `/harness-review`는 tree가 dirty하면 working tree를 리뷰하므로 정상 흐름이
  "리뷰 → 커밋"이다. 즉 리뷰 시점 tip과 done 시점 HEAD가 다른 것이 **정상**이며,
  단순한 `HEAD == tip` 비교는 거의 모든 정상 task에서 오탐을 낸다. 오탐 0을 우선한다.
- **`--force` 훈련**: 안 맞는 task에서 가드가 반복해서 울리면 에이전트가 반사적으로
  `--force`를 붙이게 되고, 기존 가드까지 함께 무력화되는 현상. 이 설계의 최대 리스크.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — "done 가드에 테스트 작성 체크(기본 ON)와 리뷰 마커 체크(spec opt-in)를 추가한다"로 한 문장 구체화됨
- [x] **Constraint 명확도** (30%) — 테스트 재실행 금지, stale 판정 금지, 커밋 가드 수정 금지로 범위 확정
- [x] **Success 기준** (30%) — 두 체크가 `tests/done-guard.test.mjs`에 기존 11개와 같은 수준으로 커버되고, 기존 테스트가 모두 통과
- [x] **Context 명확도** (brownfield) — `src/commands/task.mjs`(collectDoneIssues), `src/commands/boundary.mjs`(선언 전례), `commands/harness-review.md`·`commands/harness-adversarial-review.md`(마커 기록), `tests/done-guard.test.mjs`
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0

**게이트 통과 근거**: 4개 항목 모두 체크. 설계 대안(무조건 게이트 vs spec 선언, stale 판정 포함 vs 제외)을
사용자와 사전 합의한 상태에서 진입한다.

## 참고
- [src/commands/task.mjs:356](../../../src/commands/task.mjs) — `collectDoneIssues`
- [src/commands/boundary.mjs:20](../../../src/commands/boundary.mjs) — `not-configured` 전례
- [commands/harness-review.md](../../../commands/harness-review.md) — 5단계 기록 계약 (0.17 엔진 중립 재편으로 harness-codex-review에서 이관)

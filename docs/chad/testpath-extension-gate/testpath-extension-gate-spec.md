# testpath-extension-gate — Spec

## 목적 / 요구사항

`done`의 **테스트 증거 가드**("소스는 바뀌었는데 테스트 파일 변경이 없음")가 이 리포에서
사실상 죽어 있다. `isTestPath()`가 **문서 파일을 테스트 파일로 오분류**하기 때문이다.

두 개의 독립된 구멍이 있다.

1. **basename 규칙** — `/(^|[._-])(test|spec)s?\.[^.]+$/i` 에 `<name>-spec.md`의 `-spec.md`가
   걸린다. 모든 task는 자기 spec을 커밋하므로 **소스만 바꾸고 테스트를 한 줄도 안 써도
   가드가 통과한다.** (done-guard-window artifact "발견 — 범위 밖 1")
2. **디렉터리 규칙** — `/(^|\/)(tests?|__tests__|specs?)(\/|$)/i` 에 `docs/superpowers/specs/*.md`가
   걸린다. 실제로 이 리포에 2개 존재한다. 1을 고쳐도 이 경로는 남는다.

요구사항:

- **R1** 문서·설정 파일은 이름이 `-spec`/`.test`이든 `tests/`·`specs/` 아래이든 테스트 증거가 아니다.
- **R2** 소스 변경 + 자기 `<name>-spec.md` 커밋만 있는 task는 **여전히 차단**된다 (가드가 살아난다).
- **R3** 기존 언어별 테스트 관례 판정은 하나도 바뀌지 않는다
  (`tests/app.test.mjs` · `foo.test.ts` · `pkg/foo_test.go` · `Sources/FooTests.swift` 등).

## 설계 / 접근

두 판정 규칙은 **신호의 세기가 다르다.** 같은 확장자 조건을 걸면 한쪽이 반드시 틀린다.

| 규칙 | 신호 | 확장자 조건 |
|---|---|---|
| 디렉터리 (`tests/`·`specs/` 아래) | **강함** — 경로가 스스로 "테스트"라고 말한다 | **산문 문서만 제외** (`md`/`mdx`/`txt`/`rst`/`adoc`) |
| basename (`*-spec.*`·`*.test.*`) | **약함** — 이름의 우연한 일치 | **코드 확장자 화이트리스트**(`SOURCE_EXTENSIONS`)만 인정 |

- 구멍 1(`<name>-spec.md`)은 basename 규칙의 화이트리스트가 닫는다.
- 구멍 2(`docs/**/specs/*.md`)는 디렉터리 규칙의 산문 제외가 닫는다.
- 디렉터리 규칙에 설정·데이터 확장자(`json`/`yml`)는 **일부러 넣지 않는다** —
  `tests/fixtures/case.json`은 진짜 테스트 데이터일 수 있다.
- `SOURCE_EXTENSIONS`에 `mts`·`cts`를 추가했다. TypeScript ESM/CJS 모듈은 소스이자
  테스트 파일로 실제로 쓰인다(`src/app.test.mts`).

### 기각한 대안

| 안 | 기각 사유 |
|---|---|
| **두 규칙에 같은 코드 확장자 화이트리스트** (초안) | codex 리뷰 P2에서 반증됐다. `tests/foo.test.mts`·`tests/run-e2e`(무확장자)·`tests/e2e/*.feature`가 증거에서 빠져, `src/app.ts`와 함께 바뀌면 **정직한 작업이 차단**된다. 실측 확인: `src/app.ts` + `tests/foo.test.mts` → `{source:true, test:false}`. "화이트리스트 밖 언어는 소스도 화이트리스트 밖이라 대칭"이라던 초안의 가정은 `ts`↔`mts` 같은 **확장자 쌍**에서 무너진다. |
| basename 규칙에도 산문 블랙리스트 | `.github/workflows/test.yml`이 테스트로 세어진다. 약한 신호에는 닫힌 쪽(화이트리스트)이 맞다. |
| basename 규칙에서 `-spec.md`만 예외 처리 | 구멍 2가 남는다. 증상 하나만 가린다. |
| `docs/` 경로 전체 제외 | 프로젝트마다 문서 루트 이름이 다르다. 경로 관례가 아니라 **파일 종류**가 기준이어야 한다. |

### 받아들인 한계

- `tests/` **밖**에서 화이트리스트에 없는 확장자로 쓴 테스트(`foo_spec.exs`)는 증거로 세지 않는다.
  확장자 추가는 `SOURCE_EXTENSIONS` 한 곳만 고치면 된다.
- `tests/` **안**의 새 산문 포맷(`.typ` 등)은 산문 목록에 없어 테스트로 세어진다.
  범위가 "tests/ 아래 문서만 바꾸고 소스도 바꾼 task"로 좁고, 실패 방향이 **차단이 아니라 통과**라
  `--force` 상습화를 유발하지 않는다. 두 목록 중 어느 쪽으로 틀릴지를 고른 결과다.

### 실패 방향의 비대칭 (이 설계의 기준)

가드가 틀리는 두 방향은 값이 다르다.

- **통과시켜야 할 것을 막으면** 워커가 `--force`를 습관화하고 가드는 이름만 남는다 —
  done-guard-window가 없애려 한 바로 그 결말이다.
- **막아야 할 것을 통과시키면** 그 task 하나가 테스트 없이 닫힌다.

전자가 더 비싸다. 그래서 강한 신호(디렉터리)에서는 **열린 쪽**으로, 약한 신호(이름)에서는
**닫힌 쪽**으로 실패하게 설계했다.

## Ontology

- **테스트 파일**: 테스트를 정의하는 **코드**. 산문 문서는 이름이 `-spec`이든 위치가 `specs/`이든
  테스트가 아니다. 판정은 **신호의 세기에 따라 다른 확장자 조건**을 쓴다 —
  디렉터리(강한 신호)에서는 산문만 제외하고, 이름 관례(약한 신호)에서는 코드 확장자만 인정한다.
- **테스트 증거 가드**: 판정 창 안에서 `source=true && test=false`면 `done`을 차단한다.
  막는 대상은 **망각**이지 고의가 아니다(`--force`가 문서화된 우회로로 존재한다).
- **판정 창(evidence window)**: `<name>-meta.json`의 `firstActivatedAt` 기준. done-guard-window(PR #47)에서
  확정됐다. 이 필드가 없는 구 task는 시각 기반 가드를 통째로 건너뛰므로, **가드 수준 회귀 테스트는
  반드시 이 필드를 가진 fixture를 써야 한다** — 없으면 수정 전후 모두 공허하게 통과한다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — "테스트 판정을 코드 확장자로 게이트해 문서 파일 오분류를 없앤다" 한 문장.
- [x] **Constraint 명확도** (30%) — 기존 판정 8건 불변 · 순수 함수 1개 + 그 호출부만 · 새 상태 없음.
- [x] **Success 기준** (30%) — R2 가드 수준 테스트가 수정 **전에 실패**하고 후에 통과. 전체 스위트 0 fail.
- [x] **Context 명확도** (brownfield) — `src/commands/task.mjs` `isTestPath()`/`SOURCE_EXTENSIONS`,
      `tests/done-guard.test.mjs`. 그 외 영향 없음.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

## Done evidence

```json
{ "version": 1, "review": "required", "tests": "required" }
```

테스트 가드를 되살리는 task는 스스로 그 가드를 받는다. `tests`는 기본값과 같지만 명시한다 —
이 task에서 "선언하지 않아 기본값에 기댔다"와 "의도적으로 요구했다"는 다른 진술이다.

## 참고
- `docs/chad/done-guard-window/done-guard-window-artifact.md` — "발견 — 범위 밖 1" (이 task의 출처)
- PR #47 — 판정 창을 `meta.firstActivatedAt`으로 교체

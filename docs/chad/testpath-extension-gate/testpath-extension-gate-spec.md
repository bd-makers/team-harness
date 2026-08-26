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

`isTestPath()` **맨 앞**에 **코드 확장자 게이트**를 둔다.

```
확장자가 코드가 아니면 → 이름·디렉터리를 보지 않고 false
```

- **순서가 계약이다.** 게이트가 디렉터리 규칙보다 **앞**에 있어야 구멍 2가 함께 닫힌다.
  뒤로 밀리면 `docs/**/specs/*.md`가 조용히 되살아난다 → 이 순서를 테스트로 고정한다.
- **목록은 기존 `SOURCE_EXTENSIONS`를 재사용한다.** 가드가 발동하는 조건 자체가
  "화이트리스트에 있는 소스 확장자가 바뀌었을 때"이므로, 판정의 양쪽이 같은 목록을 쓰면
  `source=true` 인데 `test=false`가 되는 **비대칭 오탐이 구조적으로 생기지 않는다.**
- **실측으로 확인한 위험**: 이 리포 `tests/` 아래 비코드 파일은
  `tests/fixtures/stock-hooks/README.md` 하나뿐 — 화이트리스트가 실제 테스트 정의를 떨어뜨리지 않는다.

### 기각한 대안

| 안 | 기각 사유 |
|---|---|
| 문서 확장자 블랙리스트(`md`/`txt`/`json`…) | 목록이 두 벌이 되고, 새 문서 포맷이 등장할 때마다 구멍이 새로 생긴다. 화이트리스트는 모르는 확장자에 대해 **닫힌 쪽**으로 실패한다. |
| basename 규칙에서 `-spec.md`만 예외 처리 | 구멍 2(디렉터리 규칙)가 남는다. 증상 하나만 가린다. |
| `docs/` 경로 전체 제외 | 프로젝트마다 문서 루트 이름이 다르다. 경로 관례가 아니라 **파일 종류**가 판정 기준이어야 한다. |

### 받아들인 한계

테스트를 **화이트리스트에 없는 확장자**로 쓰는 프로젝트(예: `.feature`, `.exs`)에서 그 파일이
`tests/` 밖에 홀로 있으면 테스트로 세지 않는다. 다만 그런 프로젝트는 소스 확장자도 대개
화이트리스트 밖이라 가드 자체가 발동하지 않는다. 확장자 추가는 `SOURCE_EXTENSIONS` 한 곳만 고치면 된다.

## Ontology

- **테스트 파일**: 테스트를 정의하는 **코드**. 판정 기준은 확장자다 — 문서(`md`)·설정(`json`/`yml`)은
  이름이 `-spec`이든 위치가 `specs/`이든 테스트가 아니다.
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

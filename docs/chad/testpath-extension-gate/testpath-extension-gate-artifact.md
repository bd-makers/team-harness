# testpath-extension-gate — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`done`의 테스트 증거 가드를 **실제로 동작하게** 만들었다. 이전에는 `isTestPath()`가 문서를
테스트 파일로 오분류해, 소스만 바꾸고 테스트를 한 줄도 안 써도 가드가 통과했다.

- **구멍 1 (basename)** — `<name>-spec.md`의 `-spec.md`가 이름 규칙에 걸렸다.
  모든 task가 자기 spec을 커밋하므로 **이 리포의 모든 task에서 항상** 발동했다.
- **구멍 2 (디렉터리)** — `docs/superpowers/specs/*.md`가 디렉터리 규칙에 걸렸다(실제 2개 존재).

두 규칙에 **신호의 세기에 맞는 서로 다른 확장자 조건**을 걸어 닫았다.
디렉터리 규칙(강한 신호)은 산문 문서·dotfile만 제외하고, basename 규칙(약한 신호)은
코드 확장자 화이트리스트만 인정한다. 근거·기각한 대안은 spec `## 설계 / 접근`이 정본이다.

- 변경: `src/commands/task.mjs` (`SOURCE_EXTENSIONS`에 `mts`·`cts` 추가, `PROSE_EXTENSIONS`·
  `fileExtension()`·`isDotfile()` 신설, `isTestPath()` 재구성), `tests/done-guard.test.mjs`, `CHANGELOG.md`
- **차분 증명**: 재현 테스트 3건을 구현 **전에** 작성해 실패를 확인했다
  (spec.md 오탐 · `specs/` 문서 오탐 · 순수 함수 분류). 가드 수준 fixture는 반드시
  `firstActivatedAt`을 갖게 했다 — 없으면 창이 없어 가드가 통째로 skip되어 **수정 전후 모두
  공허하게 통과**한다.
- **검증**: 428 tests / 0 fail (node 24). 기존 판정 8건의 assertion은 손대지 않았다.

### 후속 영향 (의도된 것)

이 수정으로 가드가 **처음으로 실제 발동**한다. 소스를 바꾸고 테스트를 쓰지 않은 진행 중 task는
이제 `done`에서 막힌다. 불필요한 경우 spec에 `"tests": "skip"`을 선언하는 것이 정답이고,
`--force`를 습관화하는 것은 done-guard-window가 없애려 한 결말 그 자체다.

## Reviews

### 2026-08-26 — codex read-only 리뷰 1차 (`/harness-review codex`)

- **엔진:** codex (`codex exec --sandbox read-only`) · 폴백 없음(1순위 가용, gemini 미설치)
- **Scope:** `origin/main...HEAD` diff (tip `c82515f`). working tree의 dirty 2건은 post-commit hook이
  매 커밋 다시 쓰는 handoff 파일이라 제외했다.
- **focus:** 게이트가 진짜 테스트를 떨어뜨리는가 · 순서 계약이 테스트로 고정됐는가 ·
  C-quote/Windows 경로 회귀 · 가드가 과해져 `--force`를 유도하는가

**P2 — 진짜 결함 · 설계를 바꿔 수정.** 두 규칙에 같은 코드 확장자 화이트리스트를 걸었더니
`tests/foo.test.mts`·`tests/run-e2e`(무확장자)·`tests/e2e/*.feature`가 증거에서 빠졌다.
`src/app.ts`와 함께 바뀌면 **테스트를 썼는데도 차단**된다. 실측 재현: `{source:true, test:false}`.
초안 spec의 "화이트리스트 밖 언어는 소스도 밖이라 비대칭 오탐이 구조적으로 불가능" 이라는
주장은 `ts`↔`mts` 같은 **확장자 쌍**에서 무너진다 — 반증된 가정이었다.
→ 디렉터리 규칙을 산문 제외로 바꾸고 `mts`·`cts`를 소스 목록에 추가. 회귀 그물 2건 추가.

<!-- harness:review kind=codex scope=diff tip=c82515f8509996439b1f2a326b87bca1be70ccfc at=2026-08-26T02:50:34Z -->

### 2026-08-26 — codex read-only 리뷰 2차 (수정 후 재검토)

- **Scope:** `origin/main...HEAD` diff (tip `fdb0a9c`) · 1차 P2 조치 결과를 명시하고 재반박을 요청

**P2 — 진짜 결함 · 수정함.** 디렉터리 규칙의 산문 제외를 빠져나가는 경로 3종:
`tests/.gitignore`(dotfile) · `tests/README.md.`(끝의 점 때문에 "확장자 없음"으로 보임) ·
`docs/specs/design.typ`(목록에 없는 산문 포맷). 셋 다 실측 재현했고 닫았다 —
dotfile 제외, `fileExtension()`의 끝점 정규화, 산문 목록에 `org`·`tex`·`typ`·`asciidoc`·`textile` 추가.

**P3 — 타당 · 수정함.** 테스트가 `.md`·`.mts`만 덮어 "markdown만 제외하는" 순진한 리팩터가
통과할 수 있었다. `rst`·`org`·`typ`·대문자 확장자·끝점·dotfile·`cts` assertion을 추가했다.

**추가 조정 (리뷰 후 자체 점검).** 2차 P2가 산문 목록을 넓히는 방향으로 밀었는데, 그 방향은
"막아야 할 것을 통과"가 아니라 **"통과시켜야 할 것을 차단"** 으로 넘어갈 수 있다. 목록을 다시 보고
`txt`를 뺐다 — `tests/fixtures/expected.txt`는 golden 파일이라 fixture만 고친 정직한 작업이
차단된다. 기준을 "**문서로만** 쓰이는 포맷인가"로 명문화했고(`json`·`yml`·`txt` 제외),
`md`만 의도적 예외로 남겼다 — 실제로 막아야 하는 구멍 2가 md이기 때문이다.
`tests/fixtures/expected.txt` → `test:true`를 테스트로 고정했다.

**남는 한계 (기록된 선택).** 산문 판정은 목록 기반이라 **알려지지 않은 새 문서 포맷**에는 열려 있다.
이 방향의 실패는 "막아야 할 것을 통과"이고, 반대 방향(정직한 작업 차단)은 `--force` 상습화를
낳아 가드 자체를 죽인다. 강한 신호에서는 열린 쪽, 약한 신호에서는 닫힌 쪽으로 실패하도록
의도적으로 비대칭하게 설계했다 — spec `### 실패 방향의 비대칭`.

<!-- harness:review kind=codex scope=diff tip=fdb0a9cd6a1168f20b8605cb39e6aa870dddb205 at=2026-08-26T03:05:40Z -->

### 2026-08-26 — AO 내장 리뷰어 (PR #49, review 5026426845)

- **Scope:** `origin/main...1bf6413` 정적 diff (테스트·빌드 미실행)
- **P2 "숨김 파일을 소스 분류에서 제외하라" — 오탐 · 코드 변경 없음.**
  전제가 사실이 아니다. 구 로직의 `dot > slash + 1`은 basename의 **마지막** 점을 봤으므로
  `.eslintrc.js`는 `dot=9 > slash+1=0` 으로 **예전에도 `source:true`** 였다. 이 조건이 걸러낸 것은
  점이 하나뿐인 `.env`·`.eslintrc`(= 확장자 없음)뿐이고, 새 `fileExtension()`도 이들을 null로 낸다.
  구 모듈(`git show origin/main:src/commands/task.mjs`)과 새 모듈을 30개 경로에 대해 **차분 실행**해
  확인했다 — 차이는 7건이고 전부 의도된 것이다(구멍 1·2, `test.yml`, `tests/.gitignore`, 끝점 정규화,
  `mts`·`cts` 추가). 숨김 파일 소스 판정의 차이는 **0건**.
- **조치:** 코드는 그대로 두고, dotfile 소스 판정을 못 박는 회귀 테스트를 추가했다.
  동작이 비직관적이라 리뷰에서 두 번 오인될 수 있는 지점이다.
- **별개로 관찰한 기존 동작(이 PR의 회귀 아님):** `.eslintrc.js`만 바꾼 task는 `source:true`가 되어
  테스트를 요구받는다. 가드가 이제 실제로 발동하므로 **이 기존 동작에 처음 이빨이 생긴다.**
  config-as-code를 소스에서 뺄지는 판정 의미를 바꾸는 별도 결정이라 이 task에서 하지 않았다.

<!-- harness:review kind=ao-reviewer scope=diff tip=1bf64134a57a1fa6f8fb1db228d0701861b3dca4 at=2026-08-26T03:30:00Z -->

## Learnings

- **"구조적으로 불가능"은 증명이 필요한 주장이다.** 초안 spec은 소스·테스트가 같은 확장자
  목록을 공유하므로 비대칭 오탐이 생길 수 없다고 단정했다. `ts`/`mts`처럼 **같은 언어의
  다른 확장자**가 한쪽에만 있으면 바로 무너진다. 단정하기 전에 반례 후보(확장자 쌍, 무확장자,
  대소문자, 끝점)를 손으로 한 번 돌려봐야 했다 — 리뷰가 아니라 내가 먼저 잡았어야 할 것이다.
- **가드 설계는 "틀리는 방향"을 먼저 정해야 한다.** 두 방향의 오류는 값이 다르다.
  정직한 작업을 막으면 워커가 `--force`를 습관화해 가드가 이름만 남고(= done-guard-window가
  없애려던 결말), 반대는 task 하나가 테스트 없이 닫힌다. 이 비대칭을 spec에 먼저 적었더라면
  초안에서 단일 화이트리스트를 고르지 않았을 것이다.
- **가드 수준 회귀 테스트는 창(window) fixture부터 확인한다.** `firstActivatedAt`이 없는 fixture는
  시각 기반 가드를 통째로 건너뛰므로 **수정 전후 모두 통과**한다. 실패하는 테스트를 못 만들면
  버그가 아니라 fixture를 먼저 의심할 것.

# wiki-commit-provenance — Spec

> 출처 표기: `(brief)` = 2026-10-09 사람 지시(오케스트레이터 경유), `(repro)` = heliosent-profile 읽기 전용 재현, `(code)` = 코드 확인 결과,
> `(c1)` = `docs/chad/wiki-compile/wiki-compile-spec.md`, `(c2a)` = `docs/chad/task-folder-removal/task-folder-removal-spec.md`.

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

**문제** (brief, repro): `harness-team wiki sources`는 들여온 커밋 메시지에서 PR 번호를 못 찾으면 `no-pr` 막힘을 내고 `marker: null`을 준다.
PR 없이 기본 브랜치에 직접 커밋하는 저장소(소비자 heliosent-profile, 0.48.0, 혼자 쓰는 저장소)에서는 PR 번호가 **존재하지 않으므로** 막힘을 풀 방법이 없다 —
`--pr <N>`에 넣을 번호가 없다. 재현(2026-10-09, `--target ~/projects/heliosent/heliosent-profile`, 쓰기 없음):

```
provenance: PR (없음) · commit 714c448 · author hslee
marker: (막힘 — 아래 해소 후 다시 실행)
✗ no-pr: PR 번호를 커밋 메시지에서 찾지 못함 — 번호를 확인해 `--pr <N>`으로 다시 실행
```

**영향**: 그런 저장소는 C1 위키 컴파일(`/harness-wiki`)을 영영 못 돈다. 그리고 C2b 삭제 게이트(`wiki sources`의 `compiled`가 있는 task만 지운다, c2a F2)도
그 저장소에서는 영원히 닫힌다 — 컴파일된 task가 하나도 생기지 않기 때문이다.

**기대 결과** (brief): PR 번호를 찾지 못하면 막지 않고 **커밋 sha를 출처로** 마커를 만든다. PR 번호가 있는 기존 경로의 출처·마커는 바이트 단위로 같다.
(2026-10-09 사람 승인 1차 리뷰 반영) 커밋 출처의 커밋은 task 폴더를 **마지막으로 건드린 커밋(종결 커밋)**이다 — heliosent 재현에서 `714c448`(spec 초안)이 아니라 `7713257`(종결)이 나와야 한다.

**요구**
- R-1 (brief) 커밋 메시지에서 PR 번호를 못 찾고 `--pr`도 없으면 `no-pr` 막힘을 내지 않는다. 다른 막힘(`not-done`·`no-commit`·`shallow-history`)이 없으면
  `marker`는 **커밋 출처 마커**다 — `pr=` 키가 없는 `harness:wiki` 마커(설계 절 "마커 형식").
- R-2 (brief) PR 번호가 있는 경로(커밋 메시지 추론 또는 `--pr`)의 `marker`·`provenance`·JSON envelope·텍스트 출력은 지금과 바이트 단위로 같다.
- R-3 (code) 우선순위: `--pr <N>` > 커밋 메시지 추론 > 커밋 출처. `--pr`는 지금처럼 번호만 바꾸고 커밋은 그대로 추론한다.
- R-4 (code, c1 Q4) 멱등 키는 `task=` 그대로다. PR 번호가 나중에 생겨 `--pr <N>`으로 다시 컴파일해도 같은 task 단락으로 잡혀 교체된다 — 키 충돌이 없다.
- R-5 (brief) 커밋 출처일 때는 사람이 알 수 있게 **소리 내어** 알린다: 텍스트 출력에 안내 한 줄, JSON `summary`에 그 사실, `/harness-wiki` 보고에 "PR 없음 — 커밋 출처".
  막힘은 아니다 — 스킬은 멈추지 않는다.
- R-6 (c1 R-2) PR 번호를 추측해 채우지 않는다. 커밋 출처 마커는 "PR 없음"을 기록할 뿐 번호를 만들지 않는다.

**제약**
- 런타임 의존성 0, `gh`·네트워크 의존 없음(c1 제약 그대로). Node ≥ 24.
- `wiki sources`는 계속 읽기 전용이다.
- `findCompiled`·`wikiMarkersIn`·`parseMarkerAttrs`(=C2b 게이트의 입력)는 바꾸지 않는다.
- 기존 테스트 중 **의도적으로 바꾸는 단언은 둘뿐**이다: `tests/wiki.test.mjs` "no PR number blocks until --pr is given"(막힘 → 커밋 출처로 뒤집힘)과
  `tests/wiki-command.test.mjs`의 `/harness-wiki` 3번 절차·"컴파일 단락의 내용" 끝 문장 전문 대조(문서 문구가 바뀜). 나머지 테스트는 고치지 않고 통과한다.
- heliosent 저장소는 읽기 전용 재현에만 쓴다(brief). 버전 범프·매니페스트는 범위 밖, CHANGELOG는 `## [Unreleased]` 항목만.

**위험**
- PR로 들여왔지만 rebase·fast-forward 병합이라 번호가 커밋에 안 남은 저장소에서, 예전에는 `no-pr` 막힘이 사람에게 번호를 물었다. 이제는 커밋 출처 마커가 조용히 나간다 —
  출처가 **더 얇아질** 뿐 틀리지는 않는다(커밋 sha는 실제 커밋이다). 완화: R-5의 안내 + R-4 덕분에 `--pr <N>` 재컴파일이 같은 단락을 교체한다.

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- (brief) 2026-10-09 사람 지시 + heliosent-profile 실측 출력
- (c1) wiki-compile spec — R-2(출처 = PR·커밋·작성자), Q4 멱등 키 `task=`, `no-pr` 막힘 정의, 위험 절
- (c2a) task-folder-removal spec — F2(C2b 삭제 게이트 = `compiled`), 제약 "`wiki sources` 바꾸지 않는다"
- (cycle) `docs/harness-cycle.md` §4-4 "위키 항목은 … PR 번호·커밋을 출처로 가리킨다"
- (wiki) `wiki/90_system/compile-rules.md` 단락 형식(제목 `(#<N>)`)

### 발견
- F1 c1의 `no-pr` 막힘 정의 대 brief "PR이 없으면 커밋 sha 출처" — 충돌.
  → 결정(2026-10-09, brief): 이 task가 c1의 `no-pr` 정의를 대체한다(R-1). c1 spec은 종결된 task라 고치지 않고, 이 spec이 그 갱신 기록이다.
- F2 c2a 제약 "`wiki sources`는 바꾸지 않는다" — c2a 범위 안의 제약이었다(그 task가 손대지 않는다는 뜻). C2b 게이트가 읽는 것은 `compiled`이고 그 계산은 바뀌지 않는다(제약 절).
  → 결정: 충돌 아님. C2b 게이트는 이 변경으로 PR 없는 저장소에서도 **열릴 수 있게** 된다 — brief가 노린 효과다.
- F3 cycle §4-4 "PR 번호·커밋을 출처로" — PR 없는 저장소에는 커밋만 있다.
  → 결정: §4-4 문장에 "PR이 없으면 커밋만" 괄호 한 마디를 더한다(README 같은 문장도).
- F4 이 저장소의 `compile-rules.md` 제목 형식 `(#<N>)` — 이 저장소는 늘 PR로 머지하므로 해당 없음. 프로젝트 데이터라 하네스가 고치지 않는다.
  → 결정: 고치지 않는다. 대신 `/harness-wiki` "컴파일 단락의 내용"에 "PR이 없으면 PR 번호를 쓰지 않는다"를 둔다(규칙 파일이 `(#<N>)`을 요구해도 지어내지 않게).
- 재대조(결정 반영 후): 새 충돌 없음.
- 검토 완료: 2026-10-09

## 설계 / 접근

**영향 표** (code, origin/main `c9ee56d`)

| 위치 | 지금 | 바뀜 |
|---|---|---|
| `src/commands/wiki.mjs` `wikiMarker` | 키 5개 고정 | `pr`이 `null`이면 `pr=` 키를 뺀다. 그 밖은 바이트 동일 |
| `wiki.mjs` `wikiSources` blockers | `prNumber === null` → `no-pr` | 그 줄 삭제 |
| `wiki.mjs` `BLOCKER_TEXT['no-pr']` | 막힘 안내 | 삭제. 텍스트 출력에 `note:` 한 줄(커밋 출처일 때만) |
| `wiki.mjs` `runWiki` JSON summary | `컴파일 가능` | 커밋 출처일 때만 `컴파일 가능 (PR 없음 — 커밋 출처)`. status는 `success` 그대로 |
| `commands/harness-wiki.md` 3번 절차·단락 내용 | `no-pr` 해소 안내 | 커밋 출처 안내·보고 의무·PR 번호 미기재 |
| `skills/harness-wiki/SKILL.md` | "Never guess a PR number" | 커밋 출처 한 줄 추가(기존 문장 유지) |
| `docs/harness-cycle.md` §4-4 · `README.md` | "PR 번호·커밋" | "(PR이 없으면 커밋만)" |
| `findCompiled`·`wikiMarkersIn`·`parseMarkerAttrs` | — | 바뀌지 않음(C2b 게이트 입력) |

**마커 형식** (권장안 채택): 커밋 출처 마커는 `pr=` 키를 **뺀다** — `<!-- harness:wiki task=<user>/<task> commit=<sha7> author=<user> at=<YYYY-MM-DD> -->`.
- 기각 `pr=none`/`pr=-`: 값이 숫자라고 기대하는 독자(사람·정규식)에게 가짜 값을 준다. "없음"은 키가 없는 것으로 표현하는 쪽이 `parseMarkerAttrs`(k=v, 순서 무관)와 맞다.
- 키 순서는 그대로 `wikiMarker`가 정본이다 — 스킬은 문자열을 손으로 조립하지 않는다(c1).

**우선순위** (R-3): `const prNumber = pr ?? (intro ? prFromCommit(...) : null)` 줄은 그대로다. 바뀌는 것은 마지막 `null`의 의미뿐 — 막힘이 아니라 커밋 출처.

**커밋 출처의 커밋 선택** (2026-10-09 사람 승인): PR 번호가 정해지면(`--pr` 또는 추론) `commit=`은 종전처럼 **들여온 커밋**(머지·squash)이다 — PR 추론에 쓰는 커밋 선택도 그대로다.
PR 번호가 없으면 `commit=`은 HEAD first-parent 이력에서 task 폴더를 **마지막으로 건드린 커밋**(`lastTouchingCommit`, `git log -1 --first-parent HEAD -- <dir>`)이다.
직접 커밋 저장소의 들여온 커밋은 spec 초안 커밋이라 변경을 대표하지 못하고, 종결 커밋(`done`)은 작업 전체 뒤에 온다. 컴파일은 종결 다음·C2b 삭제 전에 돌므로 이 값은 종결 커밋이다.
읽지 못하면 null → `no-commit` 막힘(들여온 커밋으로 조용히 되돌리지 않는다).

**PR 번호가 나중에 생긴 경우** (R-4): `findCompiled`는 `attrs.task === label`만 본다 — `pr=`는 키가 아니다. 커밋 출처로 컴파일한 뒤 같은 task를 `--pr <N>`으로
재컴파일하면 `compiled`가 그 파일을 가리키고, 스킬은 재컴파일 명시 요청일 때 그 단락만 교체한다(c1 R-6 절차 그대로). 새 코드 없음.

**compiled 판정·C2b 게이트·c2a 정합**: `compiled`는 마커 존재만 본다 — 커밋 출처 마커도 컴파일 흔적이다. 따라서 PR 없는 저장소의 task도 C2b 삭제 대상이 될 수 있다.
C2b 이후 원문은 git 이력에 남는다(c2a Q8-A) — 커밋 sha 출처가 그 이력을 가리키므로 출처로서 충분하다.

**기각한 대안 (2차 장치 검토)**
- (a) **명시 플래그 `--no-pr`** — 기각: CLI는 "PR이 없는 저장소"와 "PR이 있었지만 번호가 빠진 병합"을 가르지 못한다는 점은 같다. 플래그는 혼자 쓰는 저장소에서
  매번 붙여야 하는 의식이 되고, 설정 키는 c1 Q3(사용자별 gitignore라 팀원마다 갈림)로 이미 기각됐다. 커밋 출처는 번호를 지어내지 않고(R-6),
  틀린 출처가 아니라 얇은 출처이며, `--pr` 재컴파일로 싸게 회복된다(R-4). 소리 내어 알리는 것(R-5)으로 충분하다.
- (b) **로컬에서 PR 없음 판정**(원격 없음·머지 커밋 없음 등) — 기각: heliosent는 원격이 있고, rebase 병합 PR도 머지 커밋이 없다. 판정 근거가 없다.
- (c) **`gh`로 PR 조회** — 기각: c1 제약(`gh`·네트워크 의존 없음).

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **커밋 출처(commit provenance)**: PR 번호 없이 종결 커밋(task 폴더를 마지막으로 건드린 first-parent 커밋) sha·작성자만으로 남긴 출처. 마커에 `pr=` 키가 없다. JSON `provenance.pr`가 `null`이다.
- **PR 출처**: 지금의 출처 — PR 번호·들여온 커밋·작성자. 마커 바이트 불변.
- **들여온 커밋(introducing commit)**: 정의 불변 — HEAD의 first-parent 이력에서 task 디렉터리를 처음 들인 커밋. PR 번호 추론과 PR 출처의 `commit=`에만 쓴다.
- **종결 커밋(closing commit)**: HEAD의 first-parent 이력에서 task 디렉터리를 마지막으로 건드린 커밋. 커밋 출처의 `commit=`이다.
- **`no-pr`**: 더는 막힘이 아니다. 막힘 목록은 `not-done`·`no-commit`·`shallow-history` 셋이다.
- **게이트 통과 (2026-10-09)**: Goal pass(문제 + 기대 결과 한 문장씩), Constraint pass(제약 절 — 바꾸는 단언 둘 명시, 읽기 전용, 게이트 입력 불변),
  Success pass(Done evidence S1–S5, 테스트 이름·명령에 묶임), Context pass(영향 표 file 단위, origin/main `c9ee56d`), Ontology pass(위 정의 4개). R1 검토 완료.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — 근거: "PR 번호를 못 찾으면 막지 않고 커밋 sha 출처로 마커를 만든다, PR 경로는 바이트 불변".
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — 근거: 제약 절(의존성 0·읽기 전용·게이트 입력 불변·바꾸는 기존 단언 둘·heliosent 읽기 전용).
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — 근거: Done evidence S1–S5 + 나머지 기존 테스트 무수정 통과.
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — 근거: 설계 절 영향 표.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 — 근거: 전 항목 pass(가중합 1.0).

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
```json
{
  "version": 1,
  "review": "required",
  "scenarios": [
    {
      "id": "S1",
      "given": "done task chad/x 를 PR 번호 없는 커밋 메시지('Merge branch feature')로 main 에 들인 뒤, main 에서 task 폴더를 건드리는 종결 커밋을 하나 더 쌓았다",
      "when": "wiki sources chad/x --json 과 텍스트 출력을 실행한다",
      "then": "blockers 가 비어 있고 status 가 success, provenance.pr 이 null·commit 이 들여온 커밋이 아닌 그 뒤 종결 커밋(task 폴더를 마지막으로 건드린 커밋) sha7 이며, marker 가 정확히 '<!-- harness:wiki task=chad/x commit=<sha7> author=chad at=<날짜> -->'(pr= 키 없음)이고, JSON summary 와 텍스트 출력이 커밋 출처임을 알린다",
      "test": "wiki sources: without a PR number the marker cites the closing commit",
      "cmd": "node --test --test-name-pattern=\"wiki sources: without a PR number the marker cites the closing commit\" tests/wiki.test.mjs"
    },
    {
      "id": "S2",
      "given": "S1 과 같은 저장소(종결 커밋 있음), 그리고 커밋 메시지에 (#12) 가 있는 저장소(종결 커밋 있음)",
      "when": "앞 저장소는 --pr 9 를 붙여, 뒤 저장소는 그대로 실행한다",
      "then": "앞은 marker 가 'pr=9 commit=<들여온 커밋 sha7>' 형식(종전 바이트), 뒤는 provenance 가 pr 12·들여온 커밋 sha7 — 종결 커밋이 뒤에 있어도 PR 출처의 커밋은 들여온 커밋이다. 앞 저장소의 --pr 없는 첫 실행은 blockers 없음·종결 커밋 출처 marker. --pr abc 는 exit 2",
      "test": "wiki sources: --pr overrides the commit-only provenance",
      "cmd": "node --test --test-name-pattern=\"wiki sources: --pr overrides the commit-only provenance\" tests/wiki.test.mjs"
    },
    {
      "id": "S3",
      "given": "wiki/ 아래 파일에 chad/x 의 커밋 출처 마커(pr= 키 없음)가 있다",
      "when": "같은 task 를 --pr 9 로 wiki sources 한다",
      "then": "compiled 가 그 파일을 가리킨다 — 멱등 키가 task= 라 PR 번호가 나중에 생겨도 같은 단락으로 잡힌다",
      "test": "wiki sources: a commit-only marker still counts as compiled when a PR number arrives later",
      "cmd": "node --test --test-name-pattern=\"wiki sources: a commit-only marker still counts as compiled\" tests/wiki.test.mjs"
    },
    {
      "id": "S4",
      "given": "PR 번호가 커밋 메시지에 있는 세 가지 병합(머지 제목 (#12)·GitHub 기본 머지·squash) — 기존 테스트",
      "when": "wiki sources chad/x --json 을 실행한다",
      "then": "marker 가 종전과 바이트 단위로 같다('task=chad/x pr=12 commit=<sha7> author=kim at=<날짜>')",
      "test": "wiki sources: infers PR, merge commit and author from first-parent history",
      "cmd": "node --test --test-name-pattern=\"wiki sources: infers PR, merge commit and author\" tests/wiki.test.mjs"
    },
    {
      "id": "S5",
      "given": "/harness-wiki 명령 문서",
      "when": "절차 3번과 '컴파일 단락의 내용'을 전문 대조한다",
      "then": "3번은 no-pr 를 막힘으로 나열하지 않고, PR 번호가 없으면 커밋 출처 마커가 나오며 보고에 그 사실을 밝히고, 번호가 빠진 PR 병합이면 --pr <N> 으로 다시 실행하라고 하며, PR 번호를 추측하지 않는다. 단락 내용은 PR 이 없으면 PR 번호를 쓰지 않는다고 한다",
      "test": "wiki command: the compile contract stops on blockers and compiled, and never pushes",
      "cmd": "node --test --test-name-pattern=\"wiki command: the compile contract stops on blockers\" tests/wiki-command.test.mjs"
    }
  ]
}
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 코드: `src/commands/wiki.mjs`(`wikiMarker` · `wikiSources` · `BLOCKER_TEXT` · `runWiki`) · `tests/wiki.test.mjs` · `tests/wiki-command.test.mjs` · `commands/harness-wiki.md` · `skills/harness-wiki/SKILL.md`
- 수동 재현(읽기 전용, artifact에 기록): `node bin/harness-team.mjs wiki sources hslee/hslee-profile --target ~/projects/heliosent/heliosent-profile` 뒤 그 저장소 `git status --porcelain`이 비어 있어야 한다.
- (해소 2026-10-09, 사람 승인) 직접 커밋 저장소의 들여온 커밋이 spec 초안 커밋(heliosent `714c448`)이라 변경을 대표하지 못하던 문제 — 커밋 출처는 종결 커밋(`7713257`)을 쓴다(설계 절 "커밋 출처의 커밋 선택").
- (open → 후속) 직접 커밋 저장소에서 커밋 제목 끝 `(#N)`이 이슈 참조인 관례면 `prFromCommit`이 그것을 PR 번호로 읽는다 — 기존 동작이며 이 task 범위 밖.
- (해소 2026-10-09, 사람 승인) 종결된 `wiki-compile` spec의 Done evidence S3(`--test-name-pattern="wiki sources: no PR number"`)가 0개 테스트를 고르던 문제 —
  그 spec의 S3 Then·test·cmd를 현재 동작과 `--pr overrides the commit-only provenance`로 정정하고 정정 사유를 그 spec 참고 절에 한 줄 남겼다.

# followups-22-23 — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

**22 — `diff-failed` cause 가 git 의 실패 사유 대신 명령줄을 싣는다(경미).**
- 문제: `resolveScope`(`src/commands/review.mjs`)가 cause 를 `err.message` 첫 줄로 만든다. execFile 오류의 첫 줄은
  `Command failed: git -C <절대경로> diff --stat <base>...HEAD` 라 git 의 사유(`fatal: <base>...HEAD: no merge base`)는 잘리고 절대경로가 envelope 에 실린다.
- 영향: `review`·`scope`·`pr-check` 세 명령 — 셋 모두 `resolveScope` 의 같은 cause 를 쓴다(판정 지점은 하나).
- 기대: cause = `diff 계산 실패: ` + `err.stderr` 의 마지막 비어 있지 않은 줄(없으면 종전 `err.message` 첫 줄) — 단 `fatal:`·`error:` 줄이 있으면 그중 마지막을 우선한다(설계 참고).
- 제약: 접두 `diff 계산 실패:` 유지. errorKind·retry·alternatives·exit code·envelope 형태 불변.

**23 — pre-push 가 기본 브랜치와 무관한 히스토리의 브랜치를 push 하면 스택 트레이스로 죽는다.**
- 문제: base 판정은 HEAD 로 하므로 HEAD 가 관련 브랜치면 통과하고, push 되는 orphan sha(gh-pages 등)마다 `collectPrCheck` 의
  `git diff --name-only <base>...<sha>` 가 throw 해 `bin/harness-team.mjs` 최상위 catch 가 스택을 찍고 exit 1 한다(패킷·envelope 없음).
- 영향: init·sync 가 설치한 pre-push 훅을 쓰는 저장소에서 gh-pages 같은 브랜치를 push 하는 사람.
- 기대(방향 A — 사람 결정 2026-10-11): 기본 브랜치와 공통 조상이 없는 브랜치의 push 는 검사 대상에서 뺀다 — 기본 브랜치 push 건너뛰기와 같은 방식.
- 제약: push 되는 sha 와 base 사이에 merge-base 가 **없음을 확인했을 때만** 건너뛴다. 그 밖의 실패는 삼키지 않는다. 수동 `pr-check` 는 영향 없음.

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- `docs/followups.md` 22·23번(main a89d1c4) — 소스 위치·재현·방향 후보·테스트 자리
- 오케스트레이터 브리프(2026-10-11) — 23번 방향 A 결정, 22번 방향(stderr 마지막 줄)

### 발견
- followups 23 의 후보 A·B 중 어느 것인가 (open) → 결정: A(사람, 2026-10-11). B 는 그 브랜치를 `--no-verify` 로만 push 하게 남긴다.
- 22·23 이 겹치는가 → 결정: A 를 고르면 겹치지 않는다(followups 23 본문 — B 만 같은 cause 문제를 가진다).
- 검토 완료: 2026-10-11

## 설계 / 접근

**22** — `review.mjs` 에 `gitFailureReason(err)` 를 두고 `resolveScope` 의 diff-failed 한 자리에서만 쓴다. `err.stderr`(promisify(execFile) 오류의 속성)를
줄로 나눠 trim 후 `fatal:`·`error:` 로 시작하는 마지막 줄, 없으면 비어 있지 않은 마지막 줄, 그것도 없으면 `err.message.split('\n')[0]`.
`fatal:`/`error:` 우선은 브리프의 "마지막 비어 있지 않은 줄"에서 다듬은 편차다: 커밋 없는 HEAD(#144 가 확인한 diff-failed 의 다른 트리거)에서 git 은
`fatal: ambiguous argument 'main...HEAD': …` 뒤에 사용법 안내 두 줄을 붙여, 마지막 줄은 `'git <command> [<revision>...] -- [<file>...]'` 다(실측).
접두가 번역되지 않도록 이 diff 호출과 23 의 merge-base 호출에만 `LC_ALL=C` 를 준다(AO 리뷰 선택 제안 1) — 공용 git 헬퍼의 다른 호출은
사용자 로케일 그대로라 출력을 파싱하는 명령에 영향이 없다. 헬퍼에는 호출 단위 `env` 인자만 더했다. 세 명령이 같은 반환값을 쓰므로 한 자리 수정으로 셋에 반영된다.
예: `diff 계산 실패: Command failed: git -C /…/repro diff --stat gh-pages...HEAD` → `diff 계산 실패: fatal: gh-pages...HEAD: no merge base`.

**23** — `pr-check.mjs` 의 pre-push 루프에서 기본 브랜치 push 건너뛰기 바로 다음에 `sharesHistory(targetDir, base, sha)` 로 판정한다.
- `git merge-base <base> <sha>`: exit 0 → 관련(검사), **exit 1 → 공통 조상 없음(건너뛰기)**, 그 밖(exit 128 등) → rethrow(종전대로 실패).
  기존 `mergeBaseOf` 는 모든 실패를 null 로 삼키므로 쓰지 않는다 — 쓰면 잘못된 객체도 조용히 통과한다.
- 출력은 기본 브랜치 skip 과 같다: `runs` 에 넣지 않을 뿐이라 텍스트는 아무것도 찍지 않고(전부 건너뛰면 무출력·exit 0),
  `--json` 은 success envelope 에서 그 ref 가 `checks` 에 없다. 새 출력은 없다.
- 근거(게이트를 좁히는 결정): 공통 조상이 없으면 그 기본 브랜치로 PR 을 열 수 없다(GitHub 이 비교를 거부한다). D11 은 "PR 에 그 task 의 문서를 담는다"
  이므로 PR 이 될 수 없는 push 는 D11 의 대상이 아니다 — 기본 브랜치·태그·삭제 push 를 건너뛰는 것과 같은 논리다.
- 경계(의도적 비대칭): base 판정은 여전히 HEAD 로 한다. gh-pages 를 **체크아웃한 채** push 하면 base 판정 단계에서 #144 의 pre-push
  `diff-failed` 패킷("기본 브랜치와 공통 조상이 있는 브랜치를 체크아웃한 뒤 다시 push")이 먼저 난다. 이 task 는 "HEAD 는 관련, push 되는
  ref 가 무관" 경우만 덮는다 — 버그가 아니라 범위다.
- 수동 `pr-check`(push 없이)는 rev 가 HEAD 이고 base 판정에서 걸러지므로 이 분기에 닿지 않는다(무변경).
- 남는 실패 경로: merge-base 가 exit 1 이 아닌 사유로 실패하면(로컬에 없는 sha 등 — git 은 pre-push 에 로컬 sha 만 주므로 실사용에서는 닿지 않는다)
  종전처럼 최상위 catch 의 스택 트레이스로 exit 1 한다. 브리프대로 고치지 않고 보고한다.

**문서** — README `pr-check` 절의 pre-push 건너뛰기 목록에 추가. `docs/decisions.md` D11 은 건너뛰기를 열거하지 않으므로(기본 브랜치·태그·삭제도 없다) 고치지 않는다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **diff-failed cause**: `resolveScope` 가 `<base>...HEAD` diff 에 실패했을 때의 오류 문장. `diff 계산 실패: <git stderr 의 사유 줄 — 마지막 fatal:/error: 줄, 없으면 마지막 비어 있지 않은 줄>`.
- **pre-push 검사 대상**: push 되는 ref 중 삭제·비브랜치·기본 브랜치·**기본 브랜치와 공통 조상이 없는 브랜치**를 뺀 것(이 task 에서 마지막 항목 추가).
- **공통 조상 없음**: `git merge-base <base> <sha>` 가 exit 1 로 끝남 — 그 밖의 실패는 이 판정이 아니다.
- 게이트 통과 근거: 두 결함 모두 정본(followups)에 소스 위치·재현이 있고, 방향은 브리프가 정했으며, 성공 기준은 아래 테스트 2건·`npm test`·`docs:check` 다.

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
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
<!--
```json
{ "version": 1, "review": "required", "tests": "skip" }
```
-->

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 테스트: `tests/review-command.test.mjs` "scope error cause: a diff failure carries git's reason, not the command line or the absolute path"
- 테스트: `tests/pr-check.test.mjs` "pr-check --pre-push: 기본 브랜치와 무관한 히스토리의 브랜치는 건너뛰고, 관련 브랜치는 그대로 검사한다"
- 코드: `src/commands/review.mjs` `gitFailureReason`·`resolveScope`, `src/commands/pr-check.mjs` `sharesHistory`·`runPrCheck`

# pre-push-hook-doctor — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

**문제** (interview — `docs/followups.md` 11번): init·sync가 pre-push 훅에 넣는 pr-check 블록(D11의 유일한 강제 장치)이
훅 관리자(husky·lefthook 등)의 재생성으로 지워지면, 그 뒤로 push에서 pr-check가 돌지 않는데 **아무도 모른다**.
doctor는 PATH CLI가 `pr-check`를 지원하는지(`checkHookCli`)만 보고 훅 파일 자체는 보지 않는다.

**영향**: 하네스를 설치한 소비자 저장소의 팀원 전원 — PR 필수 문서 검사가 조용히 꺼진다. plugin-dev 저장소(이 저장소)는 해당 없음.

**요구사항**
- R1 (interview): doctor가 git이 실제로 읽는 pre-push 훅 파일(`resolveHooksDir` + `pre-push`)에 **주석이 아닌 줄**로
  `PRE_PUSH_MARKER`(`harness-team pr-check`)가 있는지 검사한다. "실행 줄" 판정은 설치기(`installGitHook`)와 같은 규칙을 공유한다.
- R2 (interview, 2026-10-06 사용자 결정 "검사+분기 처방"): 결과별 처방을 나눈다.
  - 마커 있음 → `pass`.
  - 기본 hooks 디렉터리(`core.hooksPath` 미설정)에서 파일 없음·마커 없음 → `warning` + 처방 `harness-team sync`.
    처방 문구에 "훅 관리자가 이 파일을 다시 쓴다면 그 설정의 pre-push에 맨 위에 하네스 pre-push 블록(`PRE_PUSH_BLOCK`)을 넣으라"를 함께 싣는다.
  - 기본 디렉터리의 기존 훅이 셸 스크립트가 아님(설치기가 건너뛰는 경우, `SH_SHEBANG` 불일치) → `warning` + 처방
    "그 훅에서 `harness-team pr-check --pre-push`를 직접 부르라" — `sync`는 다시 건너뛰므로 처방하지 않는다.
  - `core.hooksPath` 설정됨(훅 관리자)이고 마커 없음 → **warning으로 세지 않는** 안내 한 줄: 관리자 설정의 pre-push에
    하네스 pre-push 블록(`PRE_PUSH_BLOCK`)을 맨 위에 넣었는지 확인하라. 관리자 설정 파일은 하네스가 판정하지 않는다
    (husky v9는 `.husky/_/pre-push`가 `.husky/pre-push`를 부르므로, 거기에 넣은 사용자를 오경보하지 않기 위해).
  - git 저장소가 아님 → 검사 생략.
- R3 (interview): 소비자 전용 — plugin-dev 저장소에서는 `skip`(기존 `checkHookCli` 패턴, `isPluginDevRepo`).
- R4 (interview): README pr-check 절에 훅 관리자 사용자용 한 단락 — 관리자 설정에 하네스 pre-push 블록(`PRE_PUSH_BLOCK`, README와 테스트로 원문 고정)을 맨 위에 직접 넣는 법과,
  넣지 않으면 install 때 블록이 지워진다는 사실.
- R5 (interview): 완료 시 `docs/followups.md`에서 11번을 지운다.

**완료 기준** (interview, 2026-10-06 사용자 결정 "단위 테스트 + husky 실측"):
- S1: R2의 다섯 갈래(마커 있음 · 기본 dir 없음/마커 없음 · 비-셸 훅 · core.hooksPath 마커 없음 · git 아님)와 plugin-dev skip을
  임시 git 저장소 테스트로 각각 하나씩 검증하고 `npm run test`·`npm run docs:check`가 PASS.
- S2: 임시 저장소에서 husky 설치 → `harness-team init`(또는 sync) → doctor pass → `npm install`(prepare) → doctor 결과를 artifact에 기록한다.
  블록이 실제로 지워지는지(문제 전제)와 그때 doctor가 R2대로 안내하는지를 함께 본다. 전제가 틀리면(지워지지 않으면) 멈추고 보고한다.

**제약**: doctor 검사는 `fail`을 만들지 않는다(다른 훅 검사와 같이 advisory). 훅 관리자별 설정 파일 파싱 같은 도구별 지식은
코드에 넣지 않는다(`docs/harness-cycle.md` §5 신규 기능 판정 질문 2). 설치기 동작(맨 위 삽입·stdin 버퍼링·비-셸 건너뜀·fail-open)은
#125 결정이라 바꾸지 않는다.

## 설계 / 접근

- `src/git-hooks.mjs`: 설치기의 "주석 아닌 줄에 marker" 판정을 작은 함수로 꺼내(`hasLiveMarker` 가칭) 설치기와 doctor가 같이 쓴다.
  `SH_SHEBANG`·`hasCustomHooksPath`도 doctor가 쓸 수 있게 export한다. 새 함수 `checkPrePushHook(targetDir)`(가칭)는
  `{ status, detail }`을 돌려주는 순수 판정에 가깝게 두고, 출력은 `runDoctor`가 한다.
- `src/commands/doctor.mjs`: `checkHookCli` 블록 옆에 pluginDev 분기와 함께 한 줄 `add(...)`. JSON 모드에서도 같은 라벨·상태.
- 테스트: `tests/doctor.test.mjs`(또는 `tests/git-hooks.test.mjs`)에 임시 git 저장소로 R2의 다섯 갈래를 하나씩.
- README 한 단락(R4), followups 11번 삭제(R5), `npm run docs:check`.

### 2차 장치 규칙 검토 (`docs/harness-cycle.md` §5)
doctor 검사는 다른 장치(pre-push 훅)를 **지키기 위한** 새 장치이므로, 원래 장치를 빼거나 줄이는 안을 먼저 검토했다.
- **기각 — README 안내만**: 새 장치는 없지만 문제의 핵심("사라져도 아무도 모른다")이 그대로 남는다. 안내는 처음 설치할 때만 읽히고,
  블록을 지우는 사건(npm install의 prepare)은 그 뒤에 반복해서 일어난다.
- **기각 — pre-push 훅을 빼고 ship·CI만**: D11 강제 범위(2026-10-05 확정)가 호출처를 셋(ship·pre-push·CI)으로 정했고, CI는 팀 선택이라
  pre-push가 빠지면 대부분의 소비자에게 강제가 남지 않는다. 결정 재론이라 이 task 범위 밖.
- **기각 — 검사만, 처방은 항상 sync**: 훅 관리자 환경에서 sync → 재생성으로 삭제 → 다시 경고가 되풀이된다.
- **채택 — 검사 + 분기 처방**: 기본 디렉터리에서는 sync가 실제로 고치고, 관리자 환경에서는 관리자 설정으로 돌려보낸다.
  추가 코드는 판정 함수 하나와 doctor 한 줄이다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **pre-push 블록**: `src/git-hooks.mjs` `PRE_PUSH_BLOCK` — 기존 훅 맨 위에 삽입되는, `harness-team pr-check --pre-push`를 부르는 셸 조각.
- **관리자 처방 블록**: 훅 관리자 설정에 넣으라고 처방하는 것은 새 줄이 아니라 설치기 블록 `PRE_PUSH_BLOCK` 그대로다(export, README 원문은 테스트로 고정).
  맨 명령 한 줄은 CLI 부재·구버전 팀원의 push를 막고(husky `sh -e`) stdin을 소비해 뒤 명령이 EOF를 받는다(2026-10-06 실측·codex P2).
  블록은 가드·stdin 버퍼링·복원을 이미 갖췄고, 그 맨 위 배치가 #125 결정이다.
- **실행 줄(live marker)**: `#`로 시작하지 않는 줄 중 `PRE_PUSH_MARKER`를 포함한 줄. 주석에만 있으면 설치되지 않은 것이다(codex P2, 2026-09-03).
- **기본 hooks 디렉터리**: `core.hooksPath`가 없을 때 git이 읽는 `.git/hooks`(워크트리면 공용 `.git`). 하네스가 쓰고 고칠 수 있는 곳.
- **훅 관리자 디렉터리**: `core.hooksPath`가 가리키는 곳. 그 도구 소유라 하네스는 판정하지 않고 안내만 한다.
- **기본 디렉터리를 다시 쓰는 관리자**(lefthook·pre-commit 등, `core.hooksPath` 없음): 별도 개념으로 구분하지 않고 "기본 hooks 디렉터리"로 다룬다
  (2026-10-06 사용자 결정). warning 처방 문구의 관리자 안내로 충분하며, 그 환경의 반복 경고는 감수한다.
- 게이트 통과 근거 (2026-10-06 `/harness-interview`): Goal·Constraint·Context는 초안 문장으로, Success는 S1·S2, Ontology는 관리자 구분 결정으로 pass — (open) 2건 해소, 2건은 followups 12·13번으로 이월.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — "pre-push 블록이 없으면 doctor가 알리고 상황에 맞는 처방을 낸다"(R1·R2).
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — advisory·도구별 지식 금지·설치기 불변·소비자 전용(제약 절, R3).
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — 완료 기준 S1(다섯 갈래 + plugin-dev skip 테스트)·S2(husky 실측, artifact 기록).
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — `src/git-hooks.mjs`·`src/commands/doctor.mjs`·`tests/doctor.test.mjs`·README·followups.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 — 1.0 (2026-10-06 `/harness-interview` 채점표 전 항목 pass)

## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 출처: `docs/followups.md` 11번 · 인계 `.claude/handoffs/2026-10-06-0138-pre-push-hook-doctor.md` · task `pr-check`(PR #125) artifact ## Reviews.
- 코드: `src/git-hooks.mjs` `installGitHook`·`PRE_PUSH_MARKER`·`SH_SHEBANG`·`resolveHooksDir`·`hasCustomHooksPath` · `src/commands/doctor.mjs` `checkHookCli`(:92)·`isPluginDevRepo`(:817)·hook CLI 출력부(:1007).
- 규칙: `docs/harness-cycle.md` §5 2차 장치 규칙·신규 기능 판정 질문.
- 다이어그램: 만들지 않음(2026-10-06 사용자 선택).
- 해소: husky 전제(`npm install` 때 `.husky/_/pre-push` 재작성)는 추론이었다 → 완료 기준 S2로 실측한다.
- 해소: lefthook류(기본 디렉터리 재작성)는 구분하지 않고 문구로 대응한다 → Ontology "기본 디렉터리를 다시 쓰는 관리자".
- (open → followups 12번) 이 검사는 pre-push를 아직 못 받은 기존 설치본(12번)도 "파일 없음/마커 없음 → sync"로 잡는다. 12번을 줄이거나 닫을 수 있는지는 12번에서 본다.
- (open → followups 13번) post-commit 훅도 같은 방식으로 지워질 수 있으나 doctor가 보지 않는다 — 이 task는 pre-push만.

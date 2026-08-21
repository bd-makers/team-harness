# prerequisites-doc — Spec

## 목적 / 요구사항

하네스를 쓰기 전에 무엇이 필요한지를 문서화한다. 현재 README에는 `## 설치`(방법 A/B/C)와
`## 빠른 시작`만 있고 **사전 준비 절이 없다** — 무엇이 없으면 무엇이 안 되는지 알 방법이 없다.

핵심은 형태다. 조사 결과 하네스의 **하드 요구사항은 Node ≥18 하나뿐이고**
(`package.json`: `engines.node >= 18`, 런타임 `dependencies` 0개), 나머지는 전부
"있으면 켜지고 없으면 degrade"다. 따라서 **평평한 설치 목록이 아니라 능력 매트릭스**로 쓴다.

반드시 담을 사실 2가지:

1. **jq는 optional이 아니다.** 없으면 훅이 **저정밀 모드**로 판정한다 — 차단은 유지되지만
   정확도가 떨어지고, `doctor`가 다른 넷과 달리 `warning`으로 알린다(경위는 아래 Ontology).
2. **호환성 주의.** 팀원이 개별적으로 설치할 수 있는 `mattpocock-skills`의 `writing-for-agents`를
   이 저장소의 `AGENTS.md`/`CLAUDE.md`에 쓰면 CI가 깨진다 — 그 두 파일은 `templates/*.hbs`에서
   생성되고 루트↔템플릿을 쌍으로 고쳐야 `tests/e2e/ssot-consistency.test.mjs`·
   `tests/agent-files.test.mjs`가 통과한다.

배치(확정):
- `README.md` `## 설치` **앞**에 요약표 한 절 — 짧게. 상세 문서로 링크.
- `docs/prerequisites.md` 신규 — 능력 매트릭스 상세, 에이전트별 연동, 확인 방법, 호환성 주의.

범위 밖(명시): **훅 코드는 건드리지 않는다.** jq fail-closed 수정은 별도 워커(W8) 담당이며
이 task는 사실을 문서에 명시만 한다. `templates/`에도 넣지 않는다 — prerequisites는 하네스
자체에 대한 것이지 소비자 프로젝트에 배달할 내용이 아니다.

## 설계 / 접근

### 드리프트 방지가 설계의 중심

`harness-team doctor`가 이미 런타임 체커다. 문서가 `EXTERNAL_TOOLS`와 어긋나는 순간 문서는
거짓말이 된다. 그래서 표를 **파싱 가능하게** 설계하고 테스트로 양방향 고정한다:

- 표 첫 열은 백틱으로 감싼 **명령 이름**(`` `jq` ``)이라 regex로 뽑을 수 있다.
- `src/commands/doctor.mjs`의 `EXTERNAL_TOOLS`를 **export** 하고(훅 코드 아님, src 변경 허용),
  신규 `tests/prerequisites-doc.test.mjs`가 두 방향을 모두 검사한다:
  1. `EXTERNAL_TOOLS`의 모든 `cmd`가 문서 표에 행으로 있다 — 새 도구를 doctor에만 추가하는 드리프트 차단
  2. 문서 표의 모든 도구 행이 `EXTERNAL_TOOLS`에 있다 — doctor가 검사하지 않는 도구를 문서가
     "확인된다"고 말하는 역방향 드리프트 차단

방향 1만으로는 영원히 통과한다. 방향 2가 실제로 잡는 쪽이다.

테스트는 `tests/documentation-inventory-pointers.test.mjs`에 끼우지 않고 **새 파일**로 둔다 —
그 파일은 README↔overview 포인터에 대한 단일 `test()` 블록이고, 병렬 워커 W4가 만질 수 있다.

### 병렬 워커 충돌 최소화

`...-plugin-5`(W4)가 지금 `README.md`·`MAINTAINING.md`를 편집 중이다(diagram-design 마켓플레이스
핀 + `/harness-diagram` 어댑터). README 변경은 **세 지점으로 최소화**하고 명령어 레퍼런스 절은
건드리지 않는다: (a) `## 설치` 앞 새 절, (b) 목차 한 줄, (c) 새 절과 모순되는 기존
`### 요구사항`(L727 "Node.js 18+. 외부 의존성 없음")을 새 문서 포인터 한 줄로 축약.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **하드 요구사항**: 없으면 하네스 CLI 자체가 실행되지 않는 것. **Node ≥18 하나뿐이다.**
  런타임 npm 의존성은 0개(`package.json`에 `dependencies` 없음).
- **degrade 대상**: 없어도 CLI는 돌지만 특정 기능이 조용히 no-op이 되는 것. `git`이 여기다 —
  검증: `src/member.mjs`의 `detectMember`는 `git config user.name` 실패 시 `$USER` → `'unknown'`으로
  폴백하고, `src/commands/task.mjs:451`의 `handoff`는 git 실패를 catch해 빈 `commitMsg`로 계속하며,
  `src/git-hooks.mjs:13`의 `installPostCommitHook`은 `.git/hooks`가 없으면 조용히 return한다.
  즉 git은 "아무것도 안 됨"이 아니라 "post-commit handoff·summary 브랜치 감지·task 전환 diff가
  전부 no-op"이다.
- **fail-open** *(이 task 착수 시점의 상태 — PR #29로 해소됨)*: 보안 훅이 판단 불능 상태에서
  "허용"(exit 0)으로 떨어지는 것. jq 부재 시 `jq -r`이 `command not found`로 죽고
  `TOOL_NAME`/`FILE_PATH`가 빈 문자열이 되어 조기 `exit 0` 분기로 빠졌다.
  **착수 시 실측(jq만 제거한 PATH):**
  | 훅 | jq 없을 때 | 결과 |
  |---|---|---|
  | `block-dangerous-git.sh` | exit 0 | `git push --force` 통과 |
  | `protect-files.sh` | exit 0 | `.env` 편집 통과 |
  | `pre-commit-check.sh` | exit 0 | commit 전 게이트 무시 |
  | `auto-format.sh` | exit 0 | 무해 |
  브리프는 `block-dangerous-git.sh` 하나로 봤으나 실측 범위는 셋(+무해 1)이었다. 이 정정이
  오케스트레이터를 거쳐 **PR #29의 remit(훅 4개)** 이 됐다.
- **저정밀 모드** *(#29 이후 — 문서가 기술하는 현재 상태)*: jq가 없을 때 `"key": "value"`
  문자열만 grep으로 잘라내 **같은 검사에** 넘기는 폴백. 값을 못 뽑으면 통과시키지 않고 payload
  전체를 검사한다 — **차단은 유지되고 정밀도만 떨어진다.** 잔여 한계는 JSON 이스케이프 미디코드,
  같은 키의 첫 매치만 읽음, payload 전체 검사 시 범위 확대. 오케스트레이터가 **#29 선머지**로
  순서를 확정해, 이 문서의 jq 서술은 처음부터 이 상태로 쓴다.
- **doctor `optional`**: `EXTERNAL_TOOLS` 5개(gh·codex·gemini·opencode·jq)를 `checkCommand`로
  검사해 없으면 보고하는 것. **어느 것도 exit code에 반영되지 않는다** — 즉 "doctor가 통과했다"가
  "전부 갖춰졌다"를 뜻하지 않는다. #29 이후 gh·codex·gemini·opencode는 `optional`,
  **jq만 `warning`** 이다(없으면 기능이 꺼지는 게 아니라 판정 정밀도가 떨어지므로).
- **능력 매트릭스**: "이 도구를 설치하면 이 기능이 켜진다"의 표. 설치 목록과 달리 **없을 때의
  결과**를 열로 갖는다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
      → "하네스의 사전 준비를 설치 목록이 아닌 능력 매트릭스로 문서화하고, doctor의
      `EXTERNAL_TOOLS`와 양방향 테스트로 고정한다."
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
      → 훅 코드 변경 금지, `templates/` 금지, 버전 범프 금지, README는 3지점 최소 변경,
      CHANGELOG는 기존 Added/Changed/Fixed 절에 이어붙이기, `harness-team` 서브커맨드에
      `--help` 금지, release/main push/merge 금지.
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
      → `npm run test`·`npm run docs:check` 실제 출력 green, 신규 드리프트 테스트가 양방향
      검사, main 대상 PR open(머지 안 함).
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
      → `README.md`(3지점), `docs/prerequisites.md`(신규), `src/commands/doctor.mjs`(export 1줄),
      `tests/prerequisites-doc.test.mjs`(신규), `CHANGELOG.md`, `docs/harness-overview.html`(재생성).
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 → 1.0

**게이트 통과 근거:** 4개 항목 모두 체크. 브리프가 목표·배치·제약을 확정해 줬고, 사실관계는
`doctor.mjs`·훅 스크립트·`src/` 소스를 직접 읽고 jq 부재 PATH로 실측해 확인했다.

## 참고
- 브리프: W7-brief.md (오케스트레이터 scratchpad)
- `src/commands/doctor.mjs` `EXTERNAL_TOOLS` (L13–19)
- `templates/.claude/hooks/{block-dangerous-git,protect-files,pre-commit-check,auto-format}.sh`
- `scripts/generate-harness-overview.mjs` `sourceTreeEntries` — `tests`가 포함되므로 신규
  테스트 파일 추가 시 `npm run docs:generate` 재실행 필요

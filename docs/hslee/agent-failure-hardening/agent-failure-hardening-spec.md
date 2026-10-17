# agent-failure-hardening — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

글 "15 Ways AI Coding Agents Fail in Real Repos"(Adrian Studio, 2026-10-16)를 v0.50.0과 대조한 결과
(원 세션 `local_21a188c8`, 2026-10-17) 확인된 빈틈 5개를 메운다. 영향: 하네스를 설치한 모든 소비자 프로젝트의
done 가드·리뷰 루브릭·루프·Claude Code 훅·AGENTS.md 계약.

- **R1 done 가드의 테스트 삭제 오인 (최우선).** `collectDoneIssues`의 tests 검사는 `git log --name-only`로 경로만
  읽어 **삭제된** 테스트 파일도 테스트 변경으로 센다. 소스 변경 + 실패 테스트 삭제만으로 `tests: required`가 통과한다.
  기대: 삭제는 증거에서 빠지고, 판정 창 이전부터 있던 테스트 파일이 창 끝에 삭제 상태면 done이 **차단**된다.
- **R2 testcritic 루브릭.** unit·component·integration 3종에 "기존 테스트 삭제·skip·assert 약화 없음" BLOCKER 행을
  추가하고 커맨드 문서 미러(pin 테스트 대상)를 맞춘다.
- **R3 harness-loop 멈춤.** 테스트 삭제·skip·assert 약화로 실패 집합이 줄면 진전이 아니라 멈춤 사유다.
  횟수 상한은 넣지 않는다(기존 "진전 없음" 설계 유지).
- **R4 Bash 우회 가드.** `protect-files.sh`는 Edit|Write만 보고, `Bash(rm -rf *)` deny는 명령 문자열 매칭이라
  `rm -fr`·`rm -r -f`·`/bin/rm`·`find -delete`를 못 막으며, `curl … | sh` 가드가 없다. 필요한 만큼만 Bash PreToolUse
  훅으로 막는다.
- **R5 계약 문구.** AGENTS.md 템플릿 principles에 (a) 완료 보고 4요소, (b) 차단된 행위는 다른 도구로 재시도하지 말고
  보고를 추가하고, spec 템플릿에 `## 범위 (In / Out)` 절을 추가한다.

제약: 최소 변경·관련 없는 리팩터링 금지. 커밋·push·release는 사용자 승인 후. release는 `--dry-run`만.

## 범위 (In / Out)
- **In**: `src/commands/task.mjs`(done 가드·spec 템플릿) · `tests/done-guard.test.mjs` · `src/commands/review-prompts.mjs` ·
  `commands/harness-{unittest,comptest,inttest}.md` · `commands/harness-loop.md` · `tests/loop-command.test.mjs` ·
  `templates/.claude/hooks/block-dangerous-bash.sh`(신규) · `templates/.claude/settings.json` · `src/commands/{doctor,migrate}.mjs`
  (훅 목록) · `tests/hooks-jq-fallback.test.mjs` · `tests/e2e/init-smoke.test.mjs` · `templates/AGENTS.md.hbs` · `AGENTS.md` ·
  `CHANGELOG.md` · 생성물 `docs/harness-overview.html` · 이 task 문서.
  구현 중 추가(2026-10-17): `commands/harness-spec.md`(골격 절 목록) · `docs/harness-overview.template.html`(훅 카드·배선 표) ·
  `tests/fixtures/task-paths-golden/expected.txt`(spec 템플릿 golden) · `tests/{review-command,agent-files,task-templates,migrate-hooks}.test.mjs`
  (새 행·원칙·절 고정, 완전성 가드의 HEAD 없는 새 훅 처리).
- **Out**:
  - 재시도 횟수 상한 — 의도적 기각(`harness-loop.md` "진전 없음": 상한은 진전 중인 루프를 끊는다).
  - 리뷰어가 In 밖 파일 변경을 자동 표시하는 기능(원 세션 제안) — 이번엔 절만 추가한다.
  - 전역 `~/.claude/settings.json` 보강(원 세션 권고) — 이 저장소 밖.
  - Codex `.codex/hooks.json` Bash 가드 — Codex 훅은 SessionStart만 배선돼 있다.
  - 공유 jq-fallback 블록 주석의 "훅 4개" 문구 — 고치면 배포된 훅 4개 바이트가 바뀌어 stock sha·fixture 4벌이 따라온다.
  - `protect-files.sh`를 Bash matcher에 거는 것 — `node_modules/`·`.git/` 패턴이 평범한 npm·git 명령을 막는다.
  - sandbox 설정 — OS 수준 경계라 템플릿 정책 변경이다.
  - `267520f`(release cacheFilter의 `.claude/worktrees` 제외) — `docs/refresh-v0.50`에만 있고 main에 없다.

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- 원 세션 결론(`local_21a188c8` transcript), 이 세션 브리프, 공유 노트 폴더 2곳(비어 있음).
- Claude Code 공식 문서 Configure permissions(code.claude.com/docs/en/permissions, 2026-10-17 조회).

### 발견
- 원 세션은 "Read deny가 Bash `cat`에 적용되는지 미확인"이었다 → 결정: 문서 Warning 절이 Read·Edit deny가
  `cat`·`head`·`tail`·`sed`·`tee`와 리다이렉트 대상(`< file`·`> file`)에 적용된다고 명시한다 — `cat .env`는 이미 막힌다.
  같은 절이 "이름을 대지 않는 읽기·임의 서브프로세스(Python·Node 스크립트)에는 적용되지 않는다, OS 수준은 sandbox"라 한다.
- `cp .env x`는 문서의 인식 명령 목록("such as")에 없다 (open → 결정: 훅이 복사 계열을 막는다, 문서 확인 불가로 보수적 선택).
- 문서 "What a Bash rule doesn't match": `Bash(rm *)`는 `/bin/rm`·`bash -c 'rm …'`을 못 막는다. 플래그 순서가 다른
  `rm -fr`은 와일드카드 규칙상 `Bash(rm -rf *)`와 매치되지 않는다. → 결정: 훅은 문자열 휴리스틱이며 경계가 아니라는
  한계를 주석에 적는다(문서도 PreToolUse 훅·sandbox를 권한다).
- 검토 완료: 2026-10-17

## 설계 / 접근
1. **done 가드** — 호출부를 `git log --since=<창> --reverse --name-status -M --pretty=format:`로 바꾸고, 출력을 경로별로
   접는 `foldNameStatus(stdout)`를 추가한다. 반환 `{ live: string[], deletedTests: string[] }`:
   - 창 안 마지막 상태가 삭제가 아닌 경로 → `live` → 기존 `classifyChangedPaths(live)`(시그니처 불변).
   - 마지막 상태 `D` + 창 안 첫 상태가 `A`가 아님(= 창 이전부터 있던 파일) + 테스트 경로 → `deletedTests`.
   - `R`(이름 변경)은 옛 경로를 삭제로 세지 않고 새 경로를 live로 둔다. `-M`을 명시해 사용자 `diff.renames` 설정과 무관하게 한다.
   - `deletedTests`가 있으면 issue를 추가한다(차단). 의도한 삭제는 `done --force`(meta `forcedIssues` 감사 흔적)로 닫는다.
   - 검사는 지금처럼 `tests: required`일 때만 돈다.
2. **루브릭** — `T7`·`C7`·`I7 [BLOCKER]`로 **덧붙인다**(번호를 밀지 않는다). 구현 중 정정(2026-10-17): 처음엔 4행에 넣고
   MAJOR를 5–7로 밀 계획이었으나, `docs/harness-rubric-guide.html`이 T·C·I 1–6행을 표로 싣고 미병합 `docs/refresh-v0.50`도
   그 표를 고쳐 두었다 — 번호를 밀면 그 가이드가 틀려진다. 덧붙이면 1–6행은 그대로 맞고 7행만 빠진다(후속). 문구:
   "기존 테스트 삭제·skip·assert 약화 없음 — 기존 테스트의 삭제, `.skip`/`xit`/`xdescribe`/`@Disabled`/`@Ignore` 등
   비활성화, 기대값 완화·assert 제거가 diff에 없다(의도한 삭제는 spec 근거를 인용해야 pass)". 문서 미러 3종을 같은 바이트로.
3. **loop** — "진전 없음" 항목에 한 문장: 실패 집합이 줄었어도 Dev 턴이 기존 테스트를 삭제·skip·assert 약화해 줄였으면
   진전이 아니다 — 멈추고 그 diff를 보고한다. 판정 근거는 그 Dev 턴의 `git diff HEAD`의 삭제된 테스트 파일·추가된
   skip 표지·제거된 assert 줄(`--name-status`는 줄을 보지 못한다 — codex 리뷰로 정정). 멈춤 조건 4개 불변, pin 문자열 갱신.
4. **Bash 가드** — 신규 `templates/.claude/hooks/block-dangerous-bash.sh`(jq-fallback 블록 바이트 동일 복사, exit 2).
   차단: (a) 명령 위치의 `rm`(경로형 `/bin/rm` 포함)이 재귀(`-r`·`-R`·`--recursive`)와 강제(`-f`·`--force`)를 함께 받음 —
   묶음·분리·순서 무관, (b) `find … -delete`·`find … -exec(dir) rm`, (c) `curl|wget … | (sudo) sh/bash/zsh/dash/ksh`와
   `sh -c "$(curl …)"`·`bash <(curl …)`, (d) `cp|mv|ln|rsync|scp|install`의 피연산자가 `.env`·`.env.*`.
   허용 매트릭스: `git rm -r --cached`·`rm file`·`rm -r dir`(강제 없음)·`npm run clean`·`curl … -o file`·`cat .env.example`(deny 몫).
   settings에는 **새 PreToolUse group**(`matcher: "Bash"`)으로 건다 — 기존 Bash group을 고치면 `mergeClaudeSettings`의
   group 단위 합집합 때문에 기존 설치에서 두 훅이 두 번 돈다. doctor `CHECKS`·`JQ_HOOK_FILES`, migrate `CLAUDE_HOOK_FILES`에
   등록한다(신규 파일이라 stock sha 이력은 없다). 기존 설치는 `init`이 새 파일 복사 + settings group 병합으로 받는다.
5. **계약 문구** — principles에 2줄(완료 보고 4요소 / 차단된 행위 재시도 금지·보고). 저장소 자신의 `AGENTS.md`도 같은 줄.
   spec 템플릿은 `## 목적 / 요구사항` 다음에 `## 범위 (In / Out)` 절. 관리 절이라 소비자는 `migrate`가 아니라 `init --yes`로 받는다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **테스트 삭제(done 가드)**: 판정 창 안 첫 상태가 `A`가 아닌(= 창 이전부터 있던) 테스트 경로가 창 안 마지막 상태 `D`인 것.
  이름 변경(`R`)은 삭제가 아니다. 창 안에서 만들고 지운 파일은 삭제가 아니다.
- **테스트 증거**: 창 안 마지막 상태가 삭제가 아닌 테스트 경로(분류는 기존 `classifyChangedPaths`).
- **테스트 후퇴(루브릭·loop)**: 기존 테스트의 삭제·비활성화(skip 표지)·assert 약화. 루브릭은 판단으로, loop는 diff 표지로 본다.
- 게이트 근거: 브리프가 다섯 요구·완료 기준·제약을 명시했고 영향 파일을 위 In 목록으로 식별했다.

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
```json
{ "version": 1, "review": "required" }
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 완료 기준: `npm test` 전체 통과 · R1 시나리오 테스트가 수정 전 실패·수정 후 통과(artifact에 출력 기록) ·
  CHANGELOG `[Unreleased]` 항목 · `node bin/harness-team.mjs release patch --dry-run` 결과 보고(본 실행 없음).
- 코드 위치: `src/commands/task.mjs` `classifyChangedPaths`·`collectDoneIssues` tests 블록 · `src/commands/review-prompts.mjs`
  `FRAMING_TEMPLATES` testcritic 3종 · `tests/loop-command.test.mjs` 멈춤 조건 pin · `tests/hooks-jq-fallback.test.mjs` 블록 동일성.

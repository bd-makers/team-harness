# 후속 후보 — 새 세션 검토용

> 이 파일은 **task가 아니다.** 결정·착수 전의 후보 목록이며, 항목을 task로 올리면 여기서 지운다.
> 각 항목은 새 세션이 이 파일만 읽고 spec을 쓸 수 있도록 맥락·정본 위치·선행 조건을 담는다.
> 출처: 2026-09-10 세션 — 4요소(agent loop / tool interface / context management / control mechanisms)
> 관점 분석 → `done-force-audit-trail`(0.34.0, main에서 별도 구현) → `review-evidence-cli-owned`(0.37.0).

## 우선순위

**3 → 8.** 3은 `migrate`·`session-context` 영역이라 5번 구현 위에 붙이기 좋고, 8은 P3 세 건을 다음 minor에 묶는다.
2는 결정이 먼저. 4·6·7은 급하지 않다.
(1번·5번은 2026-09-11 task `review-codex-live-check`·`done-on-main-nudge`로 올려 여기서 지웠다 — 번호는 참조 안정을 위해 유지.)

---

## 2. Codex 훅 확장 — 결정 항목 (task 아님)

- **무엇**: `templates/.codex/hooks.json`은 SessionStart 1종뿐. Claude는 PreToolUse/PostToolUse/
  PostToolUseFailure/PermissionDenied/SessionStart 5종 + 스크립트 6종. 4요소 관점에서 4번(control)이
  Codex에는 없다.
- **왜 결정이 먼저인가**: `README.md:111` — *"에이전트별 강제력은 의도적으로 대칭이 아닙니다."*
  뒤집지 않으면 task가 없다.
- **플랫폼 한계가 아니다**: `docs/chad/codex-hooks-template/codex-hooks-template-spec.md:53`이 Codex 바이너리
  문자열에서 확인한 이벤트: `pre_tool_use`, `post_tool_use`, `permission_request` 등. 그리고
  `templates/.claude/hooks/observe-tools.mjs`의 `toolCategory()`는 이미 Codex 도구명(`exec_command`·
  `apply_patch`·`spawn_agent`)을 매핑한다 — 배선만 안 된 상태.
- **선행 검증**: 같은 spec `:49-51` — Codex SessionStart 훅이 실제로 **실행**되어 주입되는지 미검증
  (샌드박스가 `codex exec --dangerously-bypass-hook-trust`를 막음). `pre_tool_use`를 배선하기 전에
  SessionStart부터 실측해야 한다. 코드 변경 없는 작은 검증 task로 분리 가능 — 로컬 Codex 필요.

## 3. 구 task → CLI 소유 마이그레이션 — 0.37.0 후속

- **무엇**: 0.37.0은 `reviews` 키가 없는 구 task를 종전 판정(artifact 마커)으로 두고, CLI도 키를 만들지 않는다
  (키 생성을 부수효과로 두면 첫 `review` 호출 순간 기존 손 마커가 verify 증거에서 빠진다 — adversarial 리뷰 P1).
  옮기는 **명시적** 경로가 없다.
- **어떻게**: `harness-team migrate`에 옵트인 단계 — 활성/열린 task의 meta에 `reviews: []`를 넣되, 넣기 전에
  "이 task의 기존 verify 마커 N개가 증거에서 빠집니다"를 보여주고 확인. 또는 `harness-team review --adopt`.
- **주의**: 손으로 `"reviews": []`를 넣으면 안 된다는 것이 현재 문서 계약(`what-changes-0.37.0.html` 소비자 절).
- **정본**: `src/commands/task.mjs` `collectDoneIssues` cliOwned 분기, `commands/harness-review.md` 5단계 "구 task 호환".

## 4. 프레이밍 프롬프트 src 이관 — 0.37.0 후속

- **무엇**: 검증 프레이밍 5종(adversarial·testcritic·shipcheck·contrarian·simplifier)의 프롬프트는 각 커맨드
  문서가 정본이고, 에이전트가 파일에 써서 `--prompt-file`로 넘긴다. src에 두면 `harness-team review codex
  --framing adversarial`만으로 실행된다.
- **비용**: 공용 프롬프트처럼 문서 ↔ src pin 테스트 5개가 더 생긴다(`tests/review-command.test.mjs`의
  `REVIEW_PROMPT_TEMPLATE` pin 참조). 문서가 정본이라는 현 구조를 유지할지, src가 정본이 되고 문서가
  포인터가 될지 결정 필요.

## 6. `tests/sim/agentloop.mjs` 헤더 주석 정정 — 한 줄

- **무엇**: 헤더가 *"a nested `claude -p` spawned from inside a Claude session is NOT logged in (credential
  isolation — verified empirically)"* 라고 한다. `commands/harness-review.md` claude 엔진 절은 *"부모 세션의
  인증을 상속한다 (2026-08-21 실측 검증)"*이고, 2026-09-10 원격 컨테이너 실측도 상속 동작(0.37.0의 dogfood
  리뷰가 그 경로로 돌았다). 두 실측이 문서 쪽을 지지한다.
- **주의**: sim이 OAuth 토큰 파일(`~/.claude-sim-oauth-token`)을 쓰는 이유가 그 주석이므로, 주석만 고칠지
  토큰 경로 자체를 제거할지는 실측 후 결정. 환경(로컬 vs 원격 컨테이너)에 따라 다를 수 있음 — **미검증**.

## 7. `delegation-router` 스킬 가격 표의 `$1`·`$2`… 치환 깨짐 — 레포 밖

- **무엇**: `~/.claude/skills/.../delegation-router/references/context-and-model.md`의 모델 티어 표에서
  `$1`·`$2`·`$5`·`$10`·`$25`·`$50`이 슬래시 커맨드 인자 치환(`$1` = 첫 인자)에 잡혀 셀이 인자 문자열로
  바뀐다(2026-09-10 실측: haiku 행 입력 가격이 "작동한건가?"로 렌더).
- **어떻게**: `USD 1` 또는 `1 $/MTok`처럼 `$숫자` 패턴을 피한다. 이 저장소가 아니라 스킬 저장소의 변경.

## 8. `harness-team review` 기록 품질 3건 — 0.37.0 codex 실측 리뷰 발견 (P3)

- **출처**: 2026-09-11 task `review-codex-live-check`의 codex 리뷰(대상 `v0.36.0...HEAD`). 판별 근거는 그 artifact
  `## Reviews` 아래 표. 세 건 모두 `done` 가드 판정에는 영향 없어 patch 사유는 아니다 — 다음 minor에 묶는다.
- **(1) 블록 위치**: `src/commands/review.mjs` `appendFile`이 EOF에 붙여 기본 템플릿에서 `## Reviews`가 아니라
  `## Learnings` 아래에 남는다(실측 artifact가 증거). `## Learnings` 헤딩이 있으면 그 앞에 삽입, 없으면 append.
  `runRetro`(`task.mjs`)는 `## Learnings (<date>)` 절을 EOF append하므로 순서 규칙을 같이 정한다.
- **(2) 빈 출력 기록**: exit 0이면 stdout 0 B여도 `meta.reviews[]`에 기록된다. 아무것도 출력하지 않는 잘못
  설정된 custom reviewer가 `verify: required`를 통과시킬 수 있다 — 공백뿐인 stdout은 error 패킷으로 거부.
- **(3) custom 상대경로 preflight**: `which()`가 `./tool` 같은 경로를 process cwd 기준 `access`로 검사하지만 실행은
  `targetDir`에서 한다. `--target` + 상대경로 조합에서 실행 가능한 reviewer가 오거부된다 — `targetDir` 기준으로 resolve.
- **정본**: `src/commands/review.mjs` (`which`·`runReview` 기록부), `tests/review-command.test.mjs`.

---

## 이 목록에 없는 것 (의도적으로)

- **context check를 done 게이트로**: 4요소 분석에서 한때 "약점"으로 꼽았다가 철회. TCC는 AGENTS.md가
  **비-SSOT cache/workpad**로 정의하므로 cache 유효성으로 종결을 막으면 정의와 충돌한다. 다시 올리지 말 것.
- **리뷰 마커 HMAC 서명**: `review-evidence-cli-owned` spec `### 왜 서명이 아니라 meta인가`에서 기각.
  머신별 키는 두 머신 작업을 깨고, 공유 키는 얻는 게 없으며, 위조는 가드의 위협 모델 밖.

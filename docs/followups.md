# 후속 후보 — 새 세션 검토용

> 이 파일은 **task가 아니다.** 결정·착수 전의 후보 목록이며, 항목을 task로 올리면 여기서 지운다.
> 각 항목은 새 세션이 이 파일만 읽고 spec을 쓸 수 있도록 맥락·정본 위치·선행 조건을 담는다.
> 출처: 2026-09-10 세션 — 4요소(agent loop / tool interface / context management / control mechanisms)
> 관점 분석 → `done-force-audit-trail`(0.34.0, main에서 별도 구현) → `review-evidence-cli-owned`(0.37.0).

## 우선순위

**남은 것: 19번.** 13–16번은 2026-10-06에 닫았다(아래 괄호 기록). 새 후보가 생기면 이 절에 번호를 이어 붙인다(20번부터).

19. **`review` 의 scope 오류 `retry:` 문구가 이미 준 `--scope worktree` 를 다시 권한다(경미).** `harness-team review <engine> --scope worktree --base <없는 ref>`
    는 exit 1 로 멈추는데(엔진 미실행·파일 무변경, 정상), 오류 envelope 의 `retry:` 가 "`--scope worktree` 를 명시하거나 존재하는 `--base <ref>` 를 주고 다시 실행"이다.
    worktree 를 이미 명시한 호출이라 앞 절반은 상황과 어긋나고, 따라 해도 같은 오류가 난다. 실측 출처: 2026-10-11 mergeBase 실사용 검증의 대조군
    (task `review-scope-committed` artifact `### 실사용 검증` 절).
    소스: 문구는 `src/commands/review.mjs:506` 한 줄이고, `resolveScope` 가 `{ error }` 를 돌려준 모든 경우에 `:503`(`if (scoped.error)`)에서 나온다.
    base 와 관련된 `{ error }` 는 세 경로에서 온다(그 밖에 diff scope 의 `:272` git 저장소 아님·`:288` diff 계산 실패도 같은 문구를 받는다) — (1) diff scope(명시 또는 clean 트리 추론)에서 기본 base 를 판정 못함(`:284`, 원인 문자열은 `resolveBase` `:340`·`:347`)
    → 이때는 "`--scope worktree`" 가 맞는 안내다(worktree 는 base 를 못 찾으면 degrade 한다). (2) diff scope + 없는 `--base` → 틀린 안내(worktree 로 가도 `:277` 에서 같은 오류).
    (3) worktree(명시 또는 dirty 트리 추론) + 없는 `--base` → 관측된 경우, 틀린 안내. worktree 경로는 `--base` 를 준 경우에만 error 다(`:277`, 없으면 degrade).
    고칠 방향 후보: (A) 명시 `--scope` 여부(`flags.scope === 'worktree'`)로 retry 문구를 분기한다 — 관측 경우는 고치지만 dirty 트리 추론(3)·(2)는 남는다.
    (B) `--base` 를 줬고 원인이 base ref 미존재(`:277`·`:284` 경로)일 때만 "존재하는 `--base <ref>`" 로 안내하고 `--scope worktree` 를 권하지 않는다 — (2)(3)을 함께 덮는다.
    `flags.base !== undefined` 만으로 분기하면 안 된다: `:272`(git 저장소 아님)는 `--base` 를 줘도 맞는 재시도가 `--scope worktree` 이고(worktree 는 `:273` 에서
    base 검사 전에 degrade 한다), `:288`(diff 계산 실패)는 base 가 이미 존재해 "존재하는 `--base`" 안내가 맞지 않는다. 그래서 (B) 는 원인 종류로 retry 를 고르는
    분기가 필요하다(예: `resolveScope` 가 error 와 함께 원인 종류를 돌려준다). 선행 조건: 이 문구를 고정하는 테스트가 없다(`tests/` 에 "명시하거나" 0건) — spec 세션이 회귀 테스트를 추가한다.
    같은 계열: standalone `scope` 명령의 retry(`src/commands/scope.mjs:45`)도 `--scope worktree` 를 권한다 — 같은 어긋남이 있는지는 spec 세션이 확인한다(미검증).

(17번은 2026-10-11 task `review-scope-committed`로 올려 여기서 지웠다 — worktree scope 의 의미를 merge-base 이후 커밋 + 미커밋으로 넓힌다.)
(18번 — 리뷰 기록(artifact·meta)이 커밋 없는 다음 리뷰의 scope를 worktree로 바꾸던 것 — 은 2026-10-10 사람 결정으로 task `review-scope-handoff`에
포함해 여기서 지웠다. scope 판정이 `review`가 쓰는 활성 task의 `<name>-artifact.md`·`<name>-meta.json`도 dirty에서 뺀다 — 트레이드오프는 그 task spec.)

(10번은 2026-09-28 task `simulation-doc-refresh`로 처리했다 — 시뮬레이션 문서 본문을 현행화하고
`docs:check` 현행 문서로 등록했다. 대조표는 그 task의 artifact에 있다.)
(4번은 2026-09-12에 **B(src 상수 + 문서 블록 + pin)로 결정**해 task `framing-prompts-in-src`로 올려 여기서 지웠다.
testcritic은 `--rubric` 선택자로 3 루브릭 모두 src에 둔다.)
(6번은 2026-09-12에 처리했다. 다만 **전제가 반쯤 뒤집혔다** — 실측 결과 이 머신(데스크톱 앱 세션)에서는
중첩 `claude -p`가 상속하지 **않는다**(exit 1, `OAuth session expired and could not be refreshed`).
즉 sim 헤더의 결론은 맞았고 **사유와 무조건성**이 틀렸으며, 오히려 `commands/harness-review.md`의
"부모 세션의 인증을 상속한다"가 무조건 주장이라 틀렸다. 세 표면 모두 환경 의존으로 고쳤고
토큰 경로는 **유지**했다 — 상속되지 않는 환경의 유일한 길이다.)
(2번은 2026-09-12에 **C(비대칭 유지)로 결정**해 `docs/decisions.md` **D9**로 옮겼다. 선행 검증·수리는
task `codex-project-hooks-probe`·`codex-hook-injection-fix`(0.38.3)로 끝냈다.)
(1·5번은 2026-09-11 task `review-codex-live-check`·`done-on-main-nudge`로, 3·8번은 같은 날 task
`review-adopt-record-quality`로, 9번은 2026-09-12 task `handoff-amend-dedup`으로 올려 여기서 지웠다.
2번은 결정이 끝나 D9로 옮겼다 — 번호는 참조 안정을 위해 유지.)
(11번은 2026-10-06 task `pre-push-hook-doctor`로 올려 여기서 지웠다 — doctor `pre-push hook (pr-check)` 검사와 훅 관리자용 가드 줄.
그 검사는 pre-push가 없는 기존 설치본도 "sync" 처방으로 잡으므로 12번을 줄일 수 있다.)
(12번은 2026-10-06 task `prepush-existing-installs`로 닫았다 — 코드 없이 CHANGELOG·README가 기존 설치본에 `harness-team sync` 1회를 안내한다.
migrate에 pre-push 설치를 넣는 안은 2차 장치 규칙으로 기각(doctor가 이미 sync를 처방) — 근거는 그 task spec.)
(13번은 2026-10-06 task `post-commit-prepend`로 올려 여기서 지웠다 — post-commit도 맨 위 삽입 + 비-셸 skip, append 분기 삭제.
doctor post-commit 검사는 2차 장치 규칙으로 두지 않음(handoff 미갱신은 pr-check가 잡는다) — 근거는 그 task spec.)
(14·15·16번은 2026-10-06 task `followups-14-16-close`로 **코드 없이** 닫았다 — 실측 근거는 그 task spec.
14번: fork 두 배치를 실측했다. origin=낡은 fork면 이미 머지된 upstream task까지 검사돼 안내 줄이 늘 뿐 통과하고, origin=원본이면 base가 정확하다.
제안(훅이 `$1` 원격 HEAD를 base로)은 후자를 낡은 fork main으로 바꿔 더 나빠지므로 기각했다. fork를 쓰는 팀도 없다(메인테이너 확인).
15·16번: 이 저장소 task 143개 전수에서 노출 0건이다. 아래 "이 목록에 없는 것"에 재론 조건을 붙여 옮겼다.
같은 전수 검사에서 빈 문서(0바이트)가 pr-check·done을 통과하는 결함이 나와 task `empty-doc-guard`로 따로 올렸다.)

---

---

## 이 목록에 없는 것 (의도적으로)

- **context check를 done 게이트로**: 4요소 분석에서 한때 "약점"으로 꼽았다가 철회. TCC는 AGENTS.md가
  **비-SSOT cache/workpad**로 정의하므로 cache 유효성으로 종결을 막으면 정의와 충돌한다. 다시 올리지 말 것.
- **리뷰 마커 HMAC 서명**: `review-evidence-cli-owned` spec `### 왜 서명이 아니라 meta인가`에서 기각.
  머신별 키는 두 머신 작업을 깨고, 공유 키는 얻는 게 없으며, 위조는 가드의 위협 모델 밖.
- **구버전 템플릿 그대로인 문서 판정**(옛 15번): 과거 템플릿 sha 목록은 두께다(D11 2차 장치 규칙). 2026-10-06 전수 검사 노출 0건.
  재론 조건: 구버전 CLI가 만든 빈 문서가 실제 PR을 통과한 사례.
- **PR이 부수적으로 건드린 옛 task 검사 완화**(옛 16번): 2026-10-06 전수 검사에서 막힐 옛 task 0건. 재론 조건: 옛 task 때문에
  PR이 실제로 막힌 사례 — 그때 `meta.json` status=done task를 안내로 낮추는 안을 검토한다.

# 후속 후보 — 새 세션 검토용

> 이 파일은 **task가 아니다.** 결정·착수 전의 후보 목록이며, 항목을 task로 올리면 여기서 지운다.
> 각 항목은 새 세션이 이 파일만 읽고 spec을 쓸 수 있도록 맥락·정본 위치·선행 조건을 담는다.
> 출처: 2026-09-10 세션 — 4요소(agent loop / tool interface / context management / control mechanisms)
> 관점 분석 → `done-force-audit-trail`(0.34.0, main에서 별도 구현) → `review-evidence-cli-owned`(0.37.0).

## 우선순위

**남은 것: 22번** (출처: task `review-retry-hint`, PR #143 — 2026-10-11 AO 리뷰와 실측에서 남은 것, 경미). 13–16번은 2026-10-06에, 20·21번은 2026-10-11에 닫았다(아래 괄호 기록). 새 후보가 생기면 이 절에 번호를 이어 붙인다(23번부터).

22. **`diff-failed` 의 cause 가 git 의 실패 사유 대신 명령줄을 싣는다(경미).** `src/commands/review.mjs:288` 은 cause 를 `err.message` 첫 줄로 만드는데,
    execFile 오류의 첫 줄은 `Command failed: git -C <절대경로> diff --stat <base>...HEAD` 다 — git 의 stderr(`fatal: <base>...HEAD: no merge base`)는 둘째 줄 이후라 잘린다.
    그래서 사람은 왜 실패했는지 모르고, 대신 targetDir 절대경로가 envelope 에 실린다. `review`·`scope`·`pr-check` 세 명령이 같은 cause 를 쓴다.
    실측 출처: 2026-10-11 21번 실측(`pr-check --base <관계없는 ref>`). #143 은 원인 문자열을 고정 범위로 두어 손대지 않았다.
    고칠 방향 후보: `err.stderr` 의 마지막 비어 있지 않은 줄(없으면 종전 첫 줄)을 쓴다 — `git` 헬퍼(`review.mjs:232`, promisify(execFile))의 오류는 `stderr` 속성을 갖는다.
    cause 문자열을 단언하는 테스트(`/diff 계산 실패/` 정규식 — #143 의 diff-failed 테스트 2건)는 접두만 보므로 깨지지 않는다.

(20·21번은 2026-10-11 task `scope-error-hints`로 올려 여기서 지웠다 — `scope` 오류의 `alternatives` 와 `pr-check` base 오류의 `retry:` 를 #143 의 `errorKind` 로 고른다. 21번의 "pre-push 는 사실상 `default-base` 만 닿는다" 는 실측으로 틀렸다 — orphan 브랜치·커밋 없는 HEAD 를 체크아웃한 채 push 하면 `diff-failed` 가 닿아 pre-push 갈래도 종류별로 고쳤다.)
(19번은 2026-10-11 task `review-retry-hint`로 올려 여기서 지웠다 — scope 오류의 `retry:` 를 원인 종류(없는 `--base`·기본 base 판정 실패·git 저장소 아님·diff 계산 실패)로 고른다. standalone `scope` 의 retry 도 같은 어긋남이 있어 함께 고쳤다.)
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

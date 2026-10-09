# 후속 후보 — 새 세션 검토용

> 이 파일은 **task가 아니다.** 결정·착수 전의 후보 목록이며, 항목을 task로 올리면 여기서 지운다.
> 각 항목은 새 세션이 이 파일만 읽고 spec을 쓸 수 있도록 맥락·정본 위치·선행 조건을 담는다.
> 출처: 2026-09-10 세션 — 4요소(agent loop / tool interface / context management / control mechanisms)
> 관점 분석 → `done-force-audit-trail`(0.34.0, main에서 별도 구현) → `review-evidence-cli-owned`(0.37.0).

## 우선순위

**남은 것: 17·18번.** 13–16번은 2026-10-06에 닫았다(아래 괄호 기록). 새 후보가 생기면 이 절에 번호를 이어 붙인다(19번부터).

17. **worktree scope 리뷰가 이미 커밋된 브랜치 변경을 보지 않는다.** 미커밋 편집이 하나라도 있으면 `--scope` 없는 `review`는
    worktree를 고르고, 리뷰 프롬프트는 "working tree changes"만 가리킨다 — base 대비 이미 커밋한 구현은 리뷰에서 빠진다.
    그 리뷰도 `meta.reviews[]`에 기록돼 `verify: required`·R2 증거로 세진다(`verifyEvidencePredicate`는 kind만 본다).
    고치려면 worktree의 의미를 "미커밋 + base 대비 커밋"으로 넓혀야 하고, 이는 리뷰 프롬프트 문구·`commands/harness-review.md` 2단계 정본·
    기록되는 scope 값의 의미를 함께 바꾸는 계약 변경이다. 가드에 scope 검사를 붙이는 안은 정당한 커밋 전 리뷰까지 증거에서 빼면서
    이 결함은 못 고쳐 기각했다. 출처·근거: task `review-scope-handoff` spec 설계 절 "B 판단"·"관련 잠재 문제".
18. **리뷰 기록이 다음 리뷰의 scope 를 worktree 로 바꾼다.** `review`는 성공할 때마다 활성 task의 `<name>-artifact.md`·`<name>-meta.json`을
    쓴다. 그래서 커밋 없이 R2(`--framing scenario`) 다음 R3(`review`)를 `--scope` 없이 이어 돌리면, 두 번째 판정은 그 두 파일 때문에
    worktree가 된다(2026-10-10 임시 저장소 실측: 1차 리뷰 뒤 `M <t>-artifact.md`·`M <t>-meta.json` → 2차 `{scope:'worktree'}`).
    `review-scope-handoff`는 brief 지시로 post-commit 훅 출력만 제외했다 — 리뷰 기록 두 파일은 SSOT·기계 상태라 손 편집과 구분할 수 없어
    같은 방식으로 빼면 진짜 문서 수정까지 숨는다. 후보: 리뷰 직후 기록분만 비교(마지막 `meta.reviews[]` 항목과 artifact 블록)하거나,
    `/harness-review`·프레이밍 커맨드가 연속 실행 시 `--scope diff`를 명시하도록 안내. 지금의 우회: R2·R3를 `--scope diff`로 명시한다.

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

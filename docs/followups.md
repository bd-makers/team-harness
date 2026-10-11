# 후속 후보 — 새 세션 검토용

> 이 파일은 **task가 아니다.** 결정·착수 전의 후보 목록이며, 항목을 task로 올리면 여기서 지운다.
> 각 항목은 새 세션이 이 파일만 읽고 spec을 쓸 수 있도록 맥락·정본 위치·선행 조건을 담는다.
> 출처: 2026-09-10 세션 — 4요소(agent loop / tool interface / context management / control mechanisms)
> 관점 분석 → `done-force-audit-trail`(0.34.0, main에서 별도 구현) → `review-evidence-cli-owned`(0.37.0).

## 우선순위

**남은 것: 24번** (출처: 2026-10-11 `heliosent-profile` C1 실사용 회신, 전역 CLI 0.49.4 — 경미, 사용성). 13–16번은 2026-10-06에, 20–23번은 2026-10-11에 닫았다(아래 괄호 기록). 새 후보가 생기면 이 절에 번호를 이어 붙인다(25번부터).

24. **기본 브랜치에서 인수 없는 `wiki sources` 는 "활성 task 없음" 으로 끝나, 미컴파일 done task 를 찾을 길이 없다(경미, 사용성).**
    소비자 저장소 main 체크아웃에서 `harness-team wiki sources` 를 인수 없이 실행하면 활성 task 가 없어 exit 1 로 끝났다(읽기 전용, 무변경).
    그래서 아직 컴파일하지 않은 done task 를 찾으려고 task 를 하나씩 지정했다(`hslee/hslee-profile` → `compiled`, `hslee/profile-deploy` → `blockers [not-done]`).
    **판정: 문서대로이고 결함이 아니라 사용성 공백이다.** 인수 없는 형태의 의도는 "활성 task" 이며, 기본 브랜치에는 활성 task 가 없다는 것까지 문서가 예상한다 —
    `docs/chad/wiki-compile/wiki-compile-spec.md:58`("인수 없으면 활성 task")·`:82`("`done`이 활성 task를 비우므로 이 자리에서는 대상을 명시한다"),
    `commands/harness-wiki.md:21`·`:28`, `commands/harness-task.md:185-186`, 실행 위치는 `docs/harness-cycle.md:181`(기본 브랜치). 코드도 같다 —
    `src/commands/wiki.mjs:26`(USAGE "인수가 없으면 활성 task")·`:293-303`(활성 task 없으면 오류 패킷). 비는 것은 **발견**이다: 종결 절차 안에서는 방금 `done` 한
    task 를 알고 있으니 명시하면 되지만, 이미 done 된 task 를 소급 컴파일할 때(C1 첫 소비자 실사용이 그 경우 — `docs/harness-cycle.md:276`)는 후보 목록이 없다.
    `harness-team list` 는 task 이름만 내고 done·compiled 여부를 보이지 않는다.
    재현(2026-10-11, 이 저장소 `origin/main` c343655): `.harness/active.json` 이 없는 워크트리에서 `node bin/harness-team.mjs wiki sources`
    → `✗ wiki: 활성 task 없음` / `cause: 인수가 없고 .harness/active.json 에도 활성 task가 없음` /
    `` retry: `harness-team wiki sources <user>/<task>` 로 대상을 지정하거나 `harness-team task <name>` 으로 활성화 ``, exit 1. `--json` 은 `status: error` 에
    `alternatives: []`, exit 1. `active.json` 이 `{}`(task 필드 없음)여도 같다. 즉 "task 를 지정하라" 는 안내는 **이미 retry 에 있다** — 없는 것은 후보를 찾는 길이다.
    고칠 방향 후보(spec 에서 고른다):
    - A. **인수 없고 활성 task 도 없으면 done task 전체를 훑어 목록을 낸다** — task 마다 컴파일 가능 / `compiled` / `blockers`. 재료는 있다(`readTaskMeta` —
      `src/commands/summary.mjs`, `findCompiled` — `wiki.mjs:174`). 다만 spec 계약 둘을 바꾼다: `:58`(인수 없으면 활성 task)과 `:66`(task 를 찾지 못하면 exit 1 —
      목록이면 exit 0). JSON 도 단일 task 필드에서 목록으로 모양이 갈린다(스킬 2단계는 종결 절차에서 늘 `<user>/<task>` 를 주므로 닿지 않는다).
    - B. **인수 없는 계약은 두고 옵트인으로 목록을 낸다** — `wiki sources --all`(또는 `list` 쪽 표시). A 와 같은 목록이되 기본 동작·exit 계약은 그대로다.
      D11 2차 장치 규칙상 `list` 에 붙일지 `wiki` 에 붙일지를 spec 에서 고른다.
    - C. **오류 패킷만 보강한다** — 비어 있는 `alternatives` 에 후보 찾는 법(`harness-team list` 로 이름을 본 뒤 `<user>/<task>` 지정)을 싣는다(#143·#144 의 `alternatives` 패턴).
      코드가 가장 적지만 `list` 가 done·compiled 를 보이지 않으므로 하나씩 지정하는 수고는 그대로다 — 반쪽 해법이다.
    곁가지(같은 spec 에서 볼 것): retry 의 두 번째 안 "`harness-team task <name>` 으로 활성화" 는 명령 문서(`commands/harness-wiki.md:28`)가 기본 브랜치에서 권하는 길(대상 명시)과 다르다.
    테스트 자리: `tests/wiki.test.mjs:227`(not-done 막힘)·`:239`(compiled 감지) 옆 — `repoWithLandedTask` 픽스처와 `cli(dir, 'wiki', 'sources', …)` 로 부른다.
    인수 없는 분기(`wiki.mjs:293-303`)는 지금 테스트가 없다. `tests/wiki-command.test.mjs:49`·`:77` 은 `commands/harness-wiki.md:28`·`commands/harness-task.md:185-186`
    문장을 그대로 단언하므로, 그 문장을 고치면 테스트도 함께 고친다.
    선행 조건: 없음(A 는 spec 계약 개정이 먼저다). 참고로 done task 의 `compiled` 일괄 조회는 C2b(`compiled` 가 있는 task 만 지운다 — `docs/harness-cycle.md:274`)의 입력과도 겹친다.

(22·23번은 2026-10-11 task `followups-22-23`으로 올려 여기서 지웠다 — 22번: `diff-failed` cause 를 git stderr 의 사유 줄(마지막 `fatal:`·`error:` 줄, 없으면 마지막 비어 있지 않은 줄 — 커밋 없는 HEAD 는 사용법 안내가 마지막이다)로 바꿔 `review`·`scope`·`pr-check` 가 git 의 사유를 싣고 절대경로·명령줄을 싣지 않는다. 23번: **방향 A(사람 결정)** — 기본 브랜치와 공통 조상이 없는 브랜치의 push 는 PR 을 열 수 없으므로 pre-push 검사 대상에서 뺀다(`git merge-base` exit 1 일 때만, 그 밖의 실패는 삼키지 않는다). gh-pages 를 **체크아웃한 채** push 하면 여전히 base 판정에서 #144 의 `diff-failed` 패킷이 난다 — 범위이며 근거는 그 task spec.)
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

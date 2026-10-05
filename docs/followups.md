# 후속 후보 — 새 세션 검토용

> 이 파일은 **task가 아니다.** 결정·착수 전의 후보 목록이며, 항목을 task로 올리면 여기서 지운다.
> 각 항목은 새 세션이 이 파일만 읽고 spec을 쓸 수 있도록 맥락·정본 위치·선행 조건을 담는다.
> 출처: 2026-09-10 세션 — 4요소(agent loop / tool interface / context management / control mechanisms)
> 관점 분석 → `done-force-audit-trail`(0.34.0, main에서 별도 구현) → `review-evidence-cli-owned`(0.37.0).

## 우선순위

**남은 것: 11–16번** (출처: task `pr-check`, PR #125 — 2026-10-06 리뷰 두 번과 실측에서 남은 리스크).
위험도 순서다. 11·12번은 강제 장치(D11)가 조용히 꺼지는 경로라 먼저 본다.

### 11. pre-push 블록이 훅 관리자 재생성으로 사라진다 — doctor가 모른다
- **맥락**: init·sync가 `.git/hooks/pre-push`(또는 `core.hooksPath`)에 블록을 넣는다. husky·lefthook은 install 때 훅 파일을 다시 쓰므로 블록이 지워지고,
  그 뒤로는 pr-check가 push에서 돌지 않는다. 사용자는 알 길이 없다 — doctor는 PATH CLI 지원(`checkHookCli`)만 보고 훅 파일 자체는 보지 않는다.
- **정본**: `src/git-hooks.mjs` `installGitHook`·`PRE_PUSH_MARKER`, `src/commands/doctor.mjs` `checkHookCli`(:92).
- **제안**: doctor에 "pre-push 훅에 실행 줄(`PRE_PUSH_MARKER`, 주석 제외)이 있는가" 검사 + 처방 `harness-team sync`. 2차 장치 규칙 검토 대상(D11) —
  훅 관리자 설정에 직접 넣는 안내로 대신할 수 있는지 먼저 본다.

### 12. 기존 설치본은 init·sync를 다시 돌려야 pre-push를 받는다
- **맥락**: migrate는 pre-push를 설치하지 않는다(post-commit도 migrate 일반 경로에서는 설치하지 않음). 0.45.x 이전 소비자는 릴리스 후에도 강제가 없다.
- **정본**: `src/commands/migrate.mjs`(:165는 레거시 경로에만 post-commit 설치), migrate-is-pull 원칙(cycle §4-5).
- **제안**: 릴리스 노트·doctor 처방으로 "`harness-team sync` 1회"를 안내. migrate에 넣을지는 pull 원칙과 함께 판단 — 먼저 밀지 않는다.

### 13. post-commit 설치는 여전히 끝에 append하고 비-셸 훅에도 붙는다
- **맥락**: pre-push는 맨 위 삽입 + shebang 검사로 고쳤지만 post-commit은 바꾸지 않았다. python·node post-commit 훅에 셸 줄이 붙으면 그 훅이 문법 오류로 죽는다
  (커밋은 막지 않음 — post-commit rc는 무시된다). 앞선 `exit 0` 뒤라면 handoff 갱신이 조용히 안 돈다.
- **정본**: `src/git-hooks.mjs` `installPostCommitHook`·`SH_SHEBANG`, 테스트 `tests/git-hooks.test.mjs`.
- **제안**: 같은 `prepend` + shebang 검사를 post-commit에도 적용. 출력 문구가 바뀌므로 기존 테스트 기대값 갱신.

### 14. origin이 아닌 원격으로 push해도 base는 origin 기준이다
- **맥락**: 훅은 git이 주는 원격 이름(`$1`)을 넘기지 않고, pr-check의 base 사다리(`resolveScope`)는 origin만 본다. fork 워크플로(`upstream`·`fork` 원격)에서
  기본 브랜치 판정이 어긋날 수 있다. 미실측.
- **정본**: `src/commands/pr-check.mjs` `runPrCheck`, `src/commands/review.mjs` `resolveScope`(:234).
- **제안**: 훅이 `"$1"`을 넘기고 pr-check가 `refs/remotes/<remote>/HEAD`를 먼저 보게 할지 — fork 사용 팀이 실제로 있는지 먼저 확인.

### 15. 구버전 템플릿으로 만들어 손대지 않은 문서는 "템플릿 그대로"로 잡히지 않는다
- **맥락**: 템플릿 판정은 현재 CLI 템플릿 함수와의 trim 비교다. 예전 버전 `task`가 만든 빈 문서는 문자열이 달라 통과한다. 새 task에는 영향 없음.
- **정본**: `src/commands/pr-check.mjs` `DOCS`·`taskFindings`, `src/commands/task.mjs` 템플릿 함수.
- **제안**: 실제로 문제가 되는 사례가 나올 때만 — 과거 템플릿 sha 목록을 두는 것은 두께다(D11 2차 장치 규칙).

### 16. PR이 옛 task 문서를 부수적으로 건드리면 그 task도 검사된다
- **맥락**: 대상은 "diff가 건드린 task 디렉터리" 전부다. 링크 수정 같은 부수 변경으로 옛 task가 걸리면 그 task의 4문서도 요구된다.
  최근 merge 8건 실측에서는 문제 없었다(옛 task는 4문서가 채워져 있음). 영향 범위 미검증.
- **정본**: `src/commands/pr-check.mjs` `changedTaskRefs`.
- **제안**: 관측만. 실제로 막히는 사례가 나오면 `meta.json` status=done task는 안내로 낮추는 안을 검토.
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

---

---

## 이 목록에 없는 것 (의도적으로)

- **context check를 done 게이트로**: 4요소 분석에서 한때 "약점"으로 꼽았다가 철회. TCC는 AGENTS.md가
  **비-SSOT cache/workpad**로 정의하므로 cache 유효성으로 종결을 막으면 정의와 충돌한다. 다시 올리지 말 것.
- **리뷰 마커 HMAC 서명**: `review-evidence-cli-owned` spec `### 왜 서명이 아니라 meta인가`에서 기각.
  머신별 키는 두 머신 작업을 깨고, 공유 키는 얻는 게 없으며, 위조는 가드의 위협 모델 밖.

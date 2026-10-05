# pre-push-hook-doctor — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

### husky 실측 (S2, 2026-10-06, husky 9.1.7, 스크래치패드 임시 저장소)
- `npm i -D husky` → `npx husky init`: `core.hooksPath=.husky/_`, `.husky/_/pre-push` 생성(내용: shebang + `. "$(dirname "$0")/h"`), `prepare: husky`.
- `installPrePushHook`(init·sync가 부르는 설치기) → 블록이 `.husky/_/pre-push` 맨 위에 들어감 → `checkPrePushHook` = `pass`.
- `npm install`(prepare) → `.husky/_/pre-push`가 원래 두 줄로 **다시 쓰여 블록이 사라짐** — 문제 전제 확인.
  그때 doctor JSON = `pre-push hook (pr-check)` `skip` + 관리자 설정 안내(R2대로, 경고로 세지 않음).
- 관리자 경로 검증: `.husky/pre-push`에 넣은 줄이 ref 목록(stdin)을 그대로 받고, exit 1이면 push가 막힌다(로컬 bare 원격).
- **실측에서 나온 수정**: 맨 줄 `harness-team pr-check --pre-push`를 넣으면 PATH에 구버전(0.45.0, pr-check 없음) CLI가 있는 팀원의 push가
  "Unknown command"(exit 1)로 전부 막혔다. 처방을 가드 줄 `PRE_PUSH_MANAGER_LINE`(`--help`에 pr-check가 있을 때만 호출)으로 바꿨고,
  구버전·CLI 없음 → push 통과, pr-check 지원 CLI(exit 1) → push 차단을 다시 실측했다. 같은 세 경우를 `tests/git-hooks.test.mjs`에 고정.
- **리뷰 후 재수정**: 가드 줄도 stdin을 소비해 뒤 명령이 EOF를 받는다(codex P2, 재현). 처방을 설치기 블록 `PRE_PUSH_BLOCK` 재사용으로 바꿨다.
  husky 재실측: 블록 + 뒤 `cat` → 구버전·통과 CLI는 push 성공이고 뒤 명령이 같은 ref 목록을 받음, 실패 CLI는 push 차단.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-10-05T23:34:15.454Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 476b59f09e8bebb25094fe49fe0963f409450fa2 · exit 0 · 767 B

```text
전하, **P2 1건**을 발견했습니다.

- **P2 — `src/git-hooks.mjs:70`**: 관리자용 안내 줄이 stdin을 보존하지 않습니다. 앞에 넣으면 `pr-check`가 ref 목록을 소비하여 뒤의 Git LFS 같은 명령이 EOF를 받고, 뒤에 넣으면 앞선 명령이 소비한 입력 때문에 검사가 조용히 생략됩니다. 기존 `PRE_PUSH_BLOCK`처럼 입력을 버퍼링·복원하도록 안내해야 합니다.

재현에서 뒤 명령의 `downstream: EOF`를 확인했습니다. 문법 검사·`docs:check`·`git diff --check`는 통과했습니다. 전체 테스트는 파일 생성이 필요한 read-only 환경이라 실행하지 않았습니다.

**최종 판정: 수정 후 재검토 권장.** 파일은 변경하지 않았습니다.
```

<!-- harness:review kind=codex scope=worktree tip=476b59f09e8bebb25094fe49fe0963f409450fa2 at=2026-10-05T23:34:15.454Z -->

조치 (작성 세션 판별): **P2 수용** — 재현(`downstream:` 빈 입력) 확인. `PRE_PUSH_MANAGER_LINE` 제거, `PRE_PUSH_BLOCK`을 export해
doctor·README가 그 블록을 관리자 설정 맨 위에 넣으라고 처방. 테스트: `sh -e` 블록 동작(CLI 없음·구버전 통과, 실패 차단, 뒤 명령 stdin 보존) +
README 원문 고정. 리뷰 전 자체 점검에서 본 `skip` 문구(파일 경로를 hooksPath처럼 표기)도 함께 고침.

### 2026-10-05T23:37:31.055Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 476b59f09e8bebb25094fe49fe0963f409450fa2 · exit 0 · 489 B

```text
전하, `git status`·`git diff`로 작업 트리 변경을 직접 검토했습니다. **유의미한 P1/P2/P3 발견 사항은 없습니다.** 이전 stdin 소비 지적도 현재 변경에서 해소되었습니다.

문법 검사, `npm run docs:check`, `git diff --check`는 통과했습니다. 전체 테스트는 임시 파일 생성이 필요한 읽기 전용 환경이므로 재실행하지 않았습니다.

**최종 판정: 승인 가능.** 파일은 변경하지 않았습니다.
```

<!-- harness:review kind=codex scope=worktree tip=476b59f09e8bebb25094fe49fe0963f409450fa2 at=2026-10-05T23:37:31.055Z -->

## Learnings

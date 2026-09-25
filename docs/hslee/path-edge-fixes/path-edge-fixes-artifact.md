# path-edge-fixes — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- task 이름 `.`·`..` 을 쓰기 전에 거부(재현: 빈 `docs/` 에 6파일). `readRemoteTaskMeta` 를 `refs/remotes/<ref>` 로 읽어
  같은 이름의 로컬 브랜치를 타지 않게 했다. 테스트 3건(원 코드 red), 전체 `npm test` 1026 pass / 0 fail / skip 1.
- 후속 후보: `review.mjs` 의 비교 기준과 `resolveDefaultRef` 폴백도 짧은 `origin/main` 을 쓴다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-25T12:54:00.173Z — claude (harness-team review)

- engine: claude · scope: diff · tip: ea1711ac431fbddd2ff2fd5599f1ee682596e3c1 · exit 0 · 2719 B

```text
전하, 리뷰 결과 **머지를 막는 결함은 없습니다(P1·P2 없음).** 사소한 지적(P3) 두 건만 있습니다.

**범위:** origin/main 대비 커밋 1개 `ea1711a`, 파일 11개입니다. 코드 변경은 `src/commands/task.mjs`, `src/commands/remote-task.mjs` 두 곳이고 나머지는 테스트·CHANGELOG·task 문서입니다. 커밋되지 않은 변경 두 건은 post-commit 훅이 handoff 문서를 자동 갱신한 것이라 리뷰 대상이 아닙니다.

**확인한 사항**
- **task 이름 `.`·`..` 거부** (`task.mjs:262`): 파일을 쓰기 전에 거부하고, 테스트가 `docs/`와 `active.json`이 생기지 않는지까지 확인합니다. task 이름을 받는 곳은 `runTask` 하나라서 다른 진입점에 같은 구멍은 없습니다.
- **원격 meta를 전체 ref로 읽기** (`remote-task.mjs:48`): 짧은 이름 `origin/main`을 쓰면 git은 `refs/remotes/`보다 `refs/heads/`를 먼저 찾습니다. 그래서 같은 이름의 로컬 브랜치가 있으면 그쪽을 읽던 문제가 이번 수정으로 해결됩니다. `resolveDefaultRef`는 항상 `origin/<branch>` 형태를 돌려주므로 앞에 `refs/remotes/`를 붙여도 경로가 맞습니다. 반환값 `ref`는 짧은 이름 그대로라 안내 메시지 출력도 바뀌지 않습니다. `list --remote`(`:91`)와 같은 방식입니다.
- **테스트**: `node --test tests/remote-task.test.mjs tests/task-user-validation.test.mjs`에서 28개가 모두 통과했습니다. `npm test` 전체도 오류 없이 끝났습니다. 다만 새 테스트가 수정 전 코드에서 실제로 실패하는지는 되돌려 보지 않았고, git의 ref 해석 순서에 근거한 추론입니다.

**P3 (사소한 지적)**
1. `src/commands/task.mjs:273-274`: 이름이 `.`/`..`일 때 에러 패킷의 `retry`/`stop` 문구가 "영숫자·_·.·- 만 사용한 이름", "이름 규칙을 만족하지 못하면"으로 나옵니다. 그런데 `..`은 그 규칙을 통과하는 이름이라, 원인 문구와 복구 안내가 서로 맞지 않습니다.
2. `src/commands/remote-task.mjs:38`: 이번 변경 전부터 있던 문제로, 후속 과제입니다. `resolveDefaultRef`의 대체 경로가 여전히 짧은 이름으로 `rev-parse --verify origin/main`을 실행합니다. `readRemoteTaskMeta`는 이제 전체 ref로 다시 읽으므로 결과는 안전하게 null이 됩니다. 반면 `review.mjs:265`는 이 짧은 이름을 그대로 쓰기 때문에, 로컬 `origin/main` 브랜치가 있으면 비교 기준이 로컬 브랜치로 잘못 잡힐 수 있습니다.

**판정: 승인합니다.** P3 1번은 이번 PR에서 문구만 고치면 되고, 2번은 별도 task로 다루기를 권합니다.
```

<!-- harness:review kind=claude scope=diff tip=ea1711ac431fbddd2ff2fd5599f1ee682596e3c1 at=2026-09-25T12:54:00.173Z -->

엔진: codex 400(`gpt-6-sol` 은 ChatGPT 계정 Codex 미지원)이 지속돼 사용자 승인대로 claude 엔진을 썼다 — D2 분리는 약하다.
리뷰어는 "새 테스트가 수정 전 코드에서 실패하는지는 되돌려 보지 않았다" 고 했다 — 작성 세션이 구현 전에 3 red 를 확인했다.

판별:
- P3-1 `.`·`..` 거부 시 retry·stop 문구가 문자 규칙만 말함 — **진짜, 반영.** 두 문구에 "`.`·`..` 제외" 를 넣었다.
- P3-2 `resolveDefaultRef` 폴백의 `rev-parse --verify origin/main` 과 `review.mjs:265` 의 짧은 ref — **기존 동작, 범위 밖.**
  `readRemoteTaskMeta` 는 이제 전체 ref 로 다시 읽어 안전하게 null 이 된다. `review` 의 비교 기준 모호성은 후속 후보로 남긴다.

## Learnings

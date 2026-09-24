# task-paths-helper — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-24T09:21:44.812Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: dce0a5b91f5c7c638c86408724c948494af9f9ba · exit 0 · 1673 B

```text
전하, P1은 없습니다.

- P2 — `tests/e2e/task-paths-golden.test.mjs:65`: active task가 남아 있는 상태에서만 `session-context`를 호출하므로 `listIncompleteTasks` 스캐너가 실행되지 않으며, 비-task 디렉터리·순서 차이·`readdir` 오류 전파도 golden으로 고정하지 못합니다.
- P3 — `src/commands/task.mjs:335`: `docs/`가 첫 존재 확인 뒤 삭제되면 기존 `runList`/`collectTasks`는 `readdir` 오류를 전파했지만, 새 `listTaskRefs`는 두 번째 `exists`에서 빈 목록으로 바꿔 반환합니다.
- P3 — `tests/task-paths-single-source.test.mjs:12`: 단일 조립 지점 검사는 single-quote·단일 줄 패턴만 잡으므로 double-quote, multiline 호출, `DOCS_DIR` 우회 조립은 통과할 수 있습니다.

그 외에는 `taskFileRel`의 POSIX 상대 문자열, `taskFilePath`의 `join` 기반 I/O 경로, `boundary`의 최종 `resolve` 의미가 기존과 일치합니다. 세 스캐너도 안정된 파일시스템 상태에서는 기존 순서·spec marker 필터·오류 처리와 동일합니다. 현재 남은 직접 조립은 의도적으로 제외한 migrate 레거시 구간과 docs 템플릿 복사뿐입니다.

검증: `task-paths-single-source` 2개 통과, `git diff --check` 통과. 전체 `npm test`는 read-only sandbox가 임시 디렉터리 생성을 막아(`mkdtemp EPERM`) 완료하지 못했습니다.

최종 판정: **조건부 should-fix** — 런타임 리팩터 자체에서 중대한 회귀는 보이지 않지만, 요구하신 “세 스캐너 동등성”을 golden이 증명하지 못하므로 P2 테스트 보강 후 승인하는 편이 맞습니다.
```

<!-- harness:review kind=codex scope=worktree tip=dce0a5b91f5c7c638c86408724c948494af9f9ba at=2026-09-24T09:21:44.812Z -->

**판별·조치 (2026-09-24, 작성 세션):**
- **P2 진짜 결함 → 수정.** golden 이 활성 task 가 있을 때만 `session-context` 를 불러 `listIncompleteTasks` 경로·비-task 디렉터리 필터를 고정하지 못했다. 활성 없음 상태의 `session-context`(재개 후보 `tester/other`)와 비-task dir(`docs/superpowers/plans/`, `docs/tester/notes/`)을 추가했다.
  추가로 **golden 자체의 CI 결함**을 찾았다 — `list` 는 readdir 순서라 APFS(이름순)에서 만든 스냅샷이 ext4 CI 에서 깨질 수 있다. 스냅샷에는 `list` 줄을 정렬해 담고, 순서는 테스트 안에서 readdir 순서와 assert 한다(리팩터 전 계약 그대로).
  재생성한 golden 을 **`git archive main` 트리(리팩터 전 코드)에 넣어 2회 green** — 동작 변화 0 의 증거는 새 코드가 아니라 옛 코드로 만든다.
- **P3(docs 삭제 race) 진짜 → 수정.** `listTaskRefs` 의 내부 `exists` 를 없애고 docs/ 존재 확인을 호출자에게 되돌렸다(`listIncompleteTasks` 에 복원). 확인 뒤 사라진 docs/ 의 readdir 오류가 전처럼 전파된다.
- **P3(핀 테스트 패턴 한계) 부분 수용.** `"docs"` 큰따옴표를 정규식에 추가. 여러 줄 join·`DOCS_DIR` 우회는 줄 단위 트립와이어의 한계로 테스트 주석에 명시하고 수용했다.
- 재검증: `npm test` 973/972 pass·1 skip·0 fail, `doctor` 경고 0, `git diff --check` 통과.

## Learnings

- golden 을 새 코드로 재생성하면 그것은 증거가 아니다 — 리팩터 전 트리(`git archive main`)에서 같은 스냅샷이 green 인지 확인해야 "동작 변화 0" 을 말할 수 있다.
- 디렉터리 순회 순서(readdir)는 파일시스템마다 다르다(APFS 이름순, ext4 해시순). 순서를 스냅샷에 박지 말고 readdir 와의 대조로 고정한다.
- 전수 grep 은 변수 접두(`t.user`)를 놓쳤다. 전수표보다 핀 테스트 정규식이 누락을 잡았다 — 조사 결과는 테스트로 굳혀야 닫힌다.


# active-json-validation — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- `readActive` 가 active.json 의 user·task 에 #99 의 세그먼트 규칙을 적용 — 위반이면 null(활성 task 없음) + stderr 경고.
  doctor 의 직접 판독 2곳도 `readActive` 로 통일. `{}` placeholder·한글 user 는 통과.
- 테스트 `tests/active-json-validation.test.mjs` 6건(원 코드 5 red). 전체 `npm test` 1014 pass / 0 fail / skip 1.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-25T12:35:26.284Z — claude (harness-team review)

- engine: claude · scope: diff · tip: e96243f68f83b39c0e859f7c5ad48965575d3a74 · exit 0 · 2613 B

```text
전하, 막는 결함(P1/P2)은 없습니다. 병합해도 됩니다. 이번 변경은 커밋 1건(`e96243f`)이고, 손으로 고친 `.harness/active.json`의 user·task가 `docs/<user>/<task>/` 경로 규칙을 어기면 "활성 task 없음"으로 처리하고 stderr에 경고합니다.

**검증 결과**
- 새 테스트 `tests/active-json-validation.test.mjs`는 6개 모두 통과했습니다.
- 단위 + e2e 테스트는 1015개 중 1014개 통과, 실패 0입니다(나머지 1개는 skip 또는 todo로 보입니다).
- `npm test`를 `tail`로 잘라 보면 perf 테스트 1건만 보이므로, 앞 단계는 따로 돌려 확인했습니다.
- 수정 범위: active.json을 읽는 곳은 context·boundary·review·done·session-context·diagram·rules·list 모두 `readActive`를 거칩니다. doctor에서 직접 파싱하던 두 곳도 이번에 `readActive`로 바뀌었습니다.
- 템플릿 훅 `templates/.claude/hooks/observe-tools.mjs:103-107`은 active.json을 직접 읽지만, 값을 HMAC 계산에만 쓰고 경로를 만들지 않으므로 이번 범위 밖으로 봐도 됩니다.

**P3 (사소한 지적)**
1. `src/commands/task.mjs:38`: 검사는 필드가 있을 때만 합니다. 그래서 `{ "task": "foo" }`처럼 user가 없으면 통과하고, 소비자는 `!active.task`만 확인하므로 `docs/undefined/foo`를 조립합니다. 경로 이탈은 아니고 원래 있던 동작입니다. task가 있는데 user가 없으면 무효로 보면 끝납니다.
2. `src/commands/task.mjs:42`: 경고가 `readActive`를 부를 때마다 찍힙니다. `doctor`는 두 번 부르므로(`doctor.mjs:234`, `:253`) 같은 경고가 두 줄 나옵니다. `list`(`task.mjs:482`)에서도 목록 앞에 경고가 붙습니다. 동작 문제는 아니고 출력이 시끄러운 정도입니다.
3. `src/commands/task.mjs:42`: `cause.replace(/^user/, key)`는 `userNameError`의 모든 메시지가 `user`로 시작한다는 가정에 기댑니다. 지금은 성립하지만, 메시지 문구가 바뀌면 조용히 틀어집니다.
4. `README.md:516`: "같은 규칙으로 읽는다"는 문장이 그 규칙을 설명하는 문단 앞에 있어 읽는 순서가 어색합니다. 그 문단 뒤로 옮기는 것을 권합니다.
5. 참고: 워킹트리에 post-commit 훅이 갱신한 handoff 2개가 커밋되지 않은 채 남아 있습니다. 코드와는 무관합니다.

리뷰만 했고 파일은 수정하지 않았습니다. 이 리뷰를 활성 task artifact의 `## Reviews`에 남기는 일은 쓰기 작업이라 하지 않았습니다. 원하시면 이어서 기록하겠습니다.
```

<!-- harness:review kind=claude scope=diff tip=e96243f68f83b39c0e859f7c5ad48965575d3a74 at=2026-09-25T12:35:26.284Z -->

엔진: codex 가 400(`gpt-6-sol` 은 ChatGPT 계정 Codex 에서 미지원)으로 실패해 사용자 승인으로 claude 엔진을 썼다 — 작성자와 같은
모델 계열이라 D2 의 분리는 약하다.

판별:
- P3-1 user 없는 `{ task }` 포인터 → `docs/undefined/<task>` — **기존 동작, 유지.** 경로 탈출이 아니고 이 변경이 만든 것도 아니다.
- P3-2 경고 중복(doctor 2회·list 머리) — **유지.** 출력 소음이고, 위반 포인터를 고치면 사라진다.
- P3-3 `cause.replace(/^user/, key)` 가 메시지 문구에 기댐 — **진짜, 반영.** 치환을 없애고 key·값을 직접 적는다.
- P3-4 README 문장 순서 — **진짜, 반영.** 규칙 설명 뒤로 옮겼다.
- 참고(미커밋 handoff) — 훅 생성물, 다음 커밋에 포함.

## Learnings

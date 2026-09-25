# task-reserved-names — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- `runTask` 가 spec 마커 판정 직후 `findCommand(name)` 으로 명령 이름을 거부한다(exit 1, 무쓰기, 5필드 패킷).
  기존 task(spec 마커)는 종전대로 활성화 — 소비자 프로젝트 호환.
- 테스트 `tests/task-reserved-names.test.mjs` 2건(COMMANDS 27개 전부 거부 · 기존 task 활성화). 원 코드에서 red 확인.
- `npm test` fail 0, `docs:check` 최신. 문서: `commands/harness-task.md` 경고 문단, CHANGELOG Unreleased.
- 배경: 같은 사고를 전에 커맨드 문서 수정으로만 막았다(CHANGELOG 0.x "`/harness-task done`이 done task를 만들던 문서 결함").
  문서 경고는 CLI 직접 호출에 닿지 않는다 — 규범이 아니라 결정론적 거부로 옮겼다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-25T09:24:30.206Z — codex (harness-team review)

- engine: codex · scope: diff · tip: f686c833c5fd2aeadc8978b952620e664707e821 · exit 0 · 781 B

```text
전하, P1/P2는 없습니다.

- P3 — [tests/task-reserved-names.test.mjs:29](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/task-reserved-names/tests/task-reserved-names.test.mjs:29): 예약어 테스트가 27개 `COMMANDS` 중 4개만 고정 검사해 `help` 및 이후 추가 명령의 거부 회귀를 잡지 못합니다.

기존 task의 spec-marker 재활성화는 예약어 검사보다 먼저 유지되며, `help`도 `findCommand` 경계에 포함됩니다. 새 거부 경로도 기존 `buildErrorPacket`/`emitTaskError` 형식을 사용합니다.

최종 판정: P3만 있는 승인 가능 변경입니다. `node --check` 및 `git diff --check`는 통과했습니다.
```

<!-- harness:review kind=codex scope=diff tip=f686c833c5fd2aeadc8978b952620e664707e821 at=2026-09-25T09:24:30.206Z -->

**판별·조치**: P3 진짜 빈틈 — 구현은 COMMANDS 단일 소스지만 테스트가 4개 이름만 고정해 구현이 하드코딩 목록으로
퇴행해도 통과한다. 테스트 루프를 `COMMANDS` 전체(27개, `help` 포함)로 바꿨다. 나머지(기존 task 재활성화 순서·패킷 형식)는 이상 없음 확인.

## Learnings

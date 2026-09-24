# artifact-template-eof — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- `taskArtifactTemplate`이 `## Learnings\n`으로 끝난다(빈 줄 1줄 삭제). 새 task 커밋의 `git diff --check` 경고와
  `retro` append 앞의 이중 빈 줄이 사라진다. 기존 artifact는 건드리지 않고, `done` 가드는 trim 비교라 구 템플릿도 동일 판정.
- 회귀 테스트: `tests/task-templates.test.mjs` "task 템플릿은 개행 하나로 끝난다"(spec·plan·artifact·context) — 원 코드에서 red.
- golden 재생성: `expected.txt`에서 빈 줄 2줄 삭제만(새 artifact EOF, retro 절 앞).
- 검증: `npm test` 986 중 fail 0(skip 1은 CI 전용 jq 매트릭스), `doctor` exit 0.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-24T23:16:41.955Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 8c79b19508acddcd5c112dba95d6eb096544bdbd · exit 0 · 1295 B

```text
전하, P1은 없고 P2 1건입니다.

- P2 — [artifact-template-eof-artifact.md:14](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/artifact-template-eof/docs/hslee/artifact-template-eof/artifact-template-eof-artifact.md:14): 이번 변경으로 새로 추가되는 artifact가 여전히 EOF 빈 줄로 끝나 `git diff --cached --check`가 실패합니다. 이 작업이 해결하려는 커밋 시 whitespace 오류를 현재 변경 자체가 재도입하므로, 커밋 전에 해당 마지막 빈 줄을 제거해야 합니다.

그 외에는 유의미한 문제를 찾지 못했습니다. `done` 가드는 여전히 `trim()` 비교라 기존 artifact와 호환되고, `retro`·review·diagram의 헤딩 삽입은 EOF 변경에 영향을 받지 않습니다. golden 수정도 artifact 두 곳의 의도된 빈 줄 제거 범위로 보입니다.

테스트는 새 템플릿의 EOF 조건과 lifecycle golden을 함께 덮어 충분한 편입니다. 다만 read-only sandbox가 임시 디렉터리 생성을 막아 실행은 7개 통과, 10개 `EPERM(mkdtemp)`로 중단됐습니다. 이는 코드 실패가 아니라 환경 제약입니다.

최종 판정: **P2 수정 후 승인 가능**.
```

<!-- harness:review kind=codex scope=worktree tip=8c79b19508acddcd5c112dba95d6eb096544bdbd at=2026-09-24T23:16:41.955Z -->

**판별 (2026-09-25, 작성 세션)**
- P2 이 task의 artifact가 EOF 빈 줄로 끝나 `--check` 실패 — **진짜**. 원인은 이 artifact가 수정 **전** 템플릿으로
  생성됐기 때문(`task` 실행이 수정보다 먼저). 템플릿 결함이 아니다. 조치: 결과·판별·Learnings를 채워 해소하고
  `git diff --cached --check`로 확인.
- Codex는 sandbox `mkdtemp` EPERM으로 테스트 10건을 못 돌렸다 — 실행 검증은 작성 세션의 로컬 결과가 근거.

## Learnings
- 스캐폴드 템플릿을 고치는 task는 그 task 자신의 파일이 **옛 템플릿**으로 만들어진다 — 고친 결함이 자기 산출물에 남는다.
  커밋 전에 `git diff --cached --check`를 돌려 자기 파일부터 확인한다.

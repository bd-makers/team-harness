# ledger-only-pr-check — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `src/commands/pr-check.mjs`: `isLedgerPath`(POSIX 비교, `docs/task_summary.md` 또는 `docs/<u>/<u>-task.md` 에서 이름의 user 가 디렉터리와 같을 때만)
  — diff 가 전부 원장이면 `collectPrCheck` 가 `{ ledgerOnly: true, tasks: [] }` 를 돌려준다. `passed`·`docsFailed` 가 통과로 보고,
  렌더링은 `✓ pr-check <ref>: 생성물 원장만 변경 — task 문서 검사 대상 아님` + note, JSON `checks[].ledgerOnly`.
- `tests/pr-check.test.mjs` +4: 원장 전용 통과(직접·`--json`·`--pre-push`), 원장+코드 무 task 실패 / 원장+정상 task 통과(원장 note 없음),
  닮은 경로 4종(`docs/u/x-task.md`·`docs/u/u/u-task.md`·`docs/task_summary.md.bak`·`task_summary.md`) 실패, 원장 ref + 가드 실패 ref 동시 push 시 요약에 문서 누락 없음.
- 문서: D11·D5 정정(D5 는 `templates/docs/decisions.md` 와 같은 문장 — seed 라 sha 등록 대상 아님), `commands/harness-task.md` 원장 절, CHANGELOG Unreleased/Fixed.

### 검증 (명령과 출력)
- red 먼저: 새 테스트를 현 코드에서 실행 → `pass 34 / fail 1` (`r.ledgerOnly` undefined).
- 구현 후 `node scripts/test-isolated.mjs --test tests/pr-check.test.mjs` → `pass 36 / fail 0`.
- 변이: `docsFailed` 에서 `!r.result.ledgerOnly` 제거 → `pass 35 / fail 1` (동시 push 테스트가 잡음), 원복.
- `npm run test` → exit 0, `tests 1445 / pass 1444 / fail 0`.
- `npm run docs:check` → "harness overview 생성 상태가 최신입니다."
- doctor·migrate-templates·agent-files 테스트 → `pass 177 / fail 0`. D5 두 사본 `diff` 동일.
- 실재현: `collectPrCheck({ base: 'origin/main', rev: 'c72c76a4' })`(diff = `docs/chad/chad-task.md`, `docs/task_summary.md`) → `ledgerOnly: true`, `passed= true`.

### 검증하지 못한 것
- `git fetch` 실패(네트워크) — rebase 기준은 로컬 `origin/main` = d282f761 이다. 원격 최신과의 차이는 확인하지 않았다.
- P2-3(`pr-check-fork-main`, 같은 파일 `runPrCheck` push 대상 판정부)과의 실제 병합은 해 보지 않았다 — hunk 는 떨어져 있다(`docsFailed` 줄이 P2-3 hunk 끝에서 약 10줄 아래).
- 실제 pre-push 훅 경유 push 는 네트워크 차단으로 하지 않았다(훅과 같은 `--pre-push` 경로는 테스트로 확인).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings
- 종결 절차를 바꾸면(done-derive) 그 절차가 우연히 만족시키던 검사가 드러난다 — 종결 커밋이 meta 를 함께 바꿔 pr-check 를 통과하던 것이 그 예다.
  절차 변경 때 "그 커밋이 지나가던 게이트"를 전수 확인한다.
- 위키 컴파일 결과 + 원장을 한 커밋에 담는 흐름(`harness-wiki.md`)은 여전히 pr-check 에 막힌다 — 의도한 경계(Out)이며 처리는 별도 판단.

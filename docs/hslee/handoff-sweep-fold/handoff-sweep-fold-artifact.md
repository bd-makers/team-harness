# handoff-sweep-fold — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

규범만 바꿨다(훅 코드 불변). `AGENTS.md`·`templates/AGENTS.md.hbs`의 `commit 시` 줄, `commands/harness-task.md`
post-commit handoff 절(정본: 규칙·근거 수치·예외), `commands/harness-ship.md` 5단계, CHANGELOG Unreleased `### Changed`.
소비자는 `protocol` 절이 바뀌므로 `migrate`로 받는다.

검증: `npm test` → tests 1028 · pass 1027 · fail 0(+ perf 1/1) · `npm run docs:check` → "생성 상태가 최신입니다" ·
eager 소계 `AGENTS.md`+`CLAUDE.md` 17,495 B ≤ 17,500 B(`tests/agent-files.test.mjs` 통과).
남은 리스크: 강제력이 없는 규범이다 — 효과는 다음 몇 PR의 커밋 이력으로만 확인된다. eager 예산 여유가 5 B로 줄었다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-25T15:07:37.786Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: d98cdb9cd0fb690970339dfb54069ea94fa00063 · exit 0 · 1553 B

```text
전하, **P1은 없으며 P2 1건, P3 2건입니다.**

- **P2 — `commands/harness-task.md:147`**: 중간 푸시에서 sweep 1회를 사용한 뒤 추가 수정·리뷰 대응 커밋이 생기면 다시 dirty handoff가 남지만, “PR/MR당 최대 1개” 때문에 최종 정리 경로가 막힙니다. 추가 작업 후 필요한 sweep을 허용하거나 상한을 권장 목표로 완화해야 합니다.
- **P3 — `AGENTS.md:134` / `templates/AGENTS.md.hbs:134`**: “단독 커밋 말고”라는 무조건 금지가 harness-task의 예외 허용과 문언상 충돌합니다. 정본의 예외를 참조하면 해소됩니다.
- **P3 — `docs/hslee/handoff-sweep-fold/handoff-sweep-fold-spec.md:29`**: Git 동작 설명이 과도하게 단정적입니다. 브랜치 전환은 로컬 변경을 잃게 되는 경우 거부하며, 일반 `git worktree remove`는 dirty worktree 삭제를 거부합니다. 유실은 강제·수동 삭제 조건으로 한정해야 합니다. [switch 문서](https://git-scm.com/docs/git-switch), [worktree 문서](https://git-scm.com/docs/git-worktree)

다음 커밋에 함께 담는 기본 규칙과 ship 5단계는 기존 done 제외 경로·amend 교체 로직과 일치합니다. `git diff --check`, 문서 생성 상태 검사, AGENTS·템플릿 protocol 일치 확인은 통과했습니다. 테스트 실행·Git 변경 재현은 하지 않았으며 파일도 변경하지 않았습니다.

**최종 판정: 수정 권고 — P2의 반복 푸시·수정 경로를 보완한 뒤 승인 가능합니다.**
```

<!-- harness:review kind=codex scope=worktree tip=d98cdb9cd0fb690970339dfb54069ea94fa00063 at=2026-09-25T15:07:37.786Z -->

**판별·조치 (2026-09-25).** 세 건 모두 진짜 결함으로 판별해 반영했다.
- P2(진짜): "PR/MR당 최대 1개"는 푸시 뒤 리뷰 대응 커밋이 생기면 지킬 수 없는 상한이었다. 상한을 없애고
  "푸시·브랜치 전환·워크트리 정리 직전에 남은 변경이 handoff뿐이면 그때 한 번, 보통 PR/MR당 한 번"으로 바꿨다
  (`commands/harness-task.md`·spec·plan·CHANGELOG).
- P3(진짜): AGENTS 줄의 "단독 커밋 말고"가 정본의 예외와 문언상 충돌했다 → "다음 커밋에 담는다(예외: harness-task)".
  eager 예산 여유 6 B 안에서 +1 B.
- P3(진짜): spec의 git 동작 서술을 "로컬 변경을 잃는 전환은 거부·dirty 워크트리는 일반 `remove`가 거부·유실은
  `--force`·수동 삭제 때뿐"으로 고쳤다.

## Learnings

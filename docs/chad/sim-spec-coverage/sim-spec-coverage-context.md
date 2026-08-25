# sim-spec-coverage — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: agentloop에 SC7(`/harness-spec` 산출물 검증)을 넣어 `spec-writing-skill` plan의 열린 항목을 닫는다.
- Current atomic step: **신호 대기 (STANDBY)**. 오케스트레이터 신호 없이 main을 당기지 않는다.
  신호 조건 2가지(오케스트레이터가 확인 후 통보): ① main 런 그린 ② v0.18.1 태그가 머지 커밋으로 이동.
  2026-08-25 02:5x 기준 미충족 — main=d424407이지만 태그는 아직 f8d6b6d, main CI는 perf flake로 red.
  신호 후: ① merge 커밋으로 main 반영 ② CI green 확인 ③ 보고. 머지는 스스로 하지 않는다.
  머지 후 harness-team done만, summary --write는 금지.
- main 반영 방식: 이 레포 관례는 **merge 커밋**이다 (rebase 아님) —
  `git merge origin/main`, 메시지 `Merge origin/main into <branch> (PR #40 반영)`.
  선례: d70e7d6 · 780dbfc · f7ceae2.
- 충돌은 `docs/chad/chad-handoff.md` **1개뿐**. post-commit 훅 생성물 포인터라 양쪽을 억지로 합치지 말고
  머지 후 상태에 맞게 정리한다 — 훅이 다음 커밋에서 다시 쓴다.
- 범위 밖(섞지 말 것): `tests/perf/boundary-checkpoint.test.mjs:112-113`의 절대 상한(500/800ms)이
  같은 파일 :68의 중앙값 상대예산 설계를 무효화하는 진짜 결함 — worker-20 artifact의 후속 후보다.
  이 task의 발견 2건과 별개다.
- Stop / human-decision condition: SC7이 FAIL을 내면 원인이 커맨드 계약인지 sim 채점인지 가려
  사용자에게 보고한다. 가짜 PASS를 만들지 않는다.

## Constraints and settled decisions
- SC5 일반화 기각 — SC5는 canon.dir 공유, harness-spec은 writer라 오염. SC7 전용 샌드박스.
- 멀티턴 불가(runHeadless = 단발 `claude -p`) → 프롬프트 접기. MCP fetch·대화 UX·replace/cancel은 N/A.
- 인계 문구는 `result`로만 채점 — transcript에는 확장된 커맨드 본문이 섞여 항상 참이 된다.
- 병렬 워커 `-20` 소유 경로(`docs/what-changes-*.html`, `docs/chad/release-0181-recovery/`) 금지.

## JIT retrieval map
- Identifiers / symbols: `sc7SpecWriter` · `scoreSpecArtifacts` · `ambiguityCounts` · `na()` · `ICO`
- Narrow globs: `tests/sim/agentloop.mjs` · `tests/agentloop-spec-signals.test.mjs`
- Read next: `commands/harness-spec.md` 절차 4·7 · `docs/chad/spec-writing-skill/*-artifact.md`
- Verification command: `node --test tests/agentloop-spec-signals.test.mjs` · `node tests/sim/agentloop.mjs sc7`

## Failure capsules (max 3 unresolved)
### F-001
- Signal: `npm run test` · PR #39 CI 1건 FAIL — `docs/what-changes-0.18.1.html` ENOENT
- Tried: origin/main 트리 확인 — 해당 파일이 main에 없음
- Compact finding / current hypothesis: 이 브랜치와 무관한 선재 실패. 0.18.1 범프가 what-changes
  문서 없이 나갔다. 워커 `-20`(release-0181-recovery)의 소관.
- Next discriminator: 없음 — main f8d6b6d CI도 failure로 확인. 범위 밖 확정, PR 코멘트에 근거 기록.
- Source (safe path or command): `git ls-tree origin/main docs/ | grep what-changes-0.18`

## Resume checklist
- `git status`로 이 브랜치(`ao/harness-aijient-team-plugin-21/sim-spec-coverage`) 확인
- SC7 실행 로그: scratchpad `sc7-run.log`
- plan.md 체크 상태부터 읽고 이어간다

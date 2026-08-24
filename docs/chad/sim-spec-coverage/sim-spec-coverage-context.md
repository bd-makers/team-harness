# sim-spec-coverage — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: agentloop에 SC7(`/harness-spec` 산출물 검증)을 넣어 `spec-writing-skill` plan의 열린 항목을 닫는다.
- Current atomic step: sim SC7 실제 실행 결과 확보 → 상위 task 문서 갱신 → 리뷰 → PR.
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
- Signal: `npm run test` 1건 FAIL — `docs/what-changes-0.18.1.html` ENOENT
- Tried: origin/main 트리 확인 — 해당 파일이 main에 없음
- Compact finding / current hypothesis: 이 브랜치와 무관한 선재 실패. 0.18.1 범프가 what-changes
  문서 없이 나갔다. 워커 `-20`(release-0181-recovery)의 소관.
- Next discriminator: 없음 — 범위 밖으로 확정. 리포트에 선재 실패로 명시한다.
- Source (safe path or command): `git ls-tree origin/main docs/ | grep what-changes-0.18`

## Resume checklist
- `git status`로 이 브랜치(`ao/harness-aijient-team-plugin-21/sim-spec-coverage`) 확인
- SC7 실행 로그: scratchpad `sc7-run.log`
- plan.md 체크 상태부터 읽고 이어간다

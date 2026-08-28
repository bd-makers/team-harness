# node-test-runner-flake — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `node:test` 업스트림 역직렬화 버그로 CI가 간헐 실패하는 것을 멈춘다. **달성.**
- **종결 (2026-08-28).** plan 전 항목 완료. `runtime v24.20.0` 에서 **5회 연속 green**
  (run 33147199419 attempt 1~5, 커밋 `30d1273`). 실패 annotation 0건.
- Current atomic step: 없음 — 남은 것은 PR #56 머지 승인뿐이고 그건 사람 몫이다.
- Stop / human-decision condition: 없음. (a)/(b) 결정은 받았고 (b)로 처리됐다.

## Constraints and settled decisions
*아래는 전부 **확정**이다. 재litigation 방지용으로 남긴다.*

- CI matrix는 **`[24]`**, `engines.node`는 **`">=24"`** (PR #45). 변경 전 `[18, 20]`·`">=18"`은
  **historical** — 둘 다 EOL 런타임이었다.
- setup-node 스텝에 **`check-latest: true`** (PR #56, 사람 결정 (b)). **이 입력은 load-bearing 이다 —
  빼면 해석이 다시 러너 toolcache 로 돌아간다.**
- 원인: `#processRawBuffer`가 payload 길이를 **부호 있는 정수**로 읽는다 (nodejs/node#64061).
  수정은 `>>> 0` 한 줄 (PR #64706). 24.20.0 부터 v24 라인에 포함.
- **버전 도달에는 축이 셋이다:** ① EOL(v18/v20 영구 잔존) ② 백포트 도달(**v22 = 활성 LTS인데
  없음**, v24 = 24.20.0부터, v26 = 26.7.0부터) ③ **러너 이미지 toolcache 도달**.
  → `[22, 24]`는 함정이다. **22를 추가하지 말 것.**
- 채택하지 않은 것: 정확한 패치 버전 pin · 자동 재시도 · `workflow_dispatch` 추가 ·
  `engines` 상향. 전부 근거가 spec/artifact 에 있다.
- PR #44(perf flake)와 **독립**. 두 flake를 한 원인으로 묶지 말 것.

## JIT retrieval map
*이 task 는 닫혔다. 아래는 이 결론을 다시 참조할 때만 쓴다.*
- Read: `<name>-artifact.md` `## 결과` → `## 검증 기록`(1·2회차) → `## Learnings`
- Narrow globs: `.github/workflows/test.yml` (matrix 주석·check-latest·runtime annotation)
- 런타임 판정: `gh api repos/bd-makers/team-harness/check-runs/<job_id>/annotations`
  (CI 로그는 403 — `gh run view --log-failed` 는 쓰지 않는다)

## Failure capsules (max 3 unresolved)
- (none unresolved — F-1 "rerun 이 패치 런타임을 집지 못한다" 는 `check-latest: true` 로 해소됐고
  메커니즘·측정은 artifact `## 검증 기록`·`## Learnings` 로 옮겼다.)

## Resume checklist
- 이 task 는 **종결됐다.** 재개할 것 없음. 결론만 필요하면 artifact `## 결과` 를 읽는다.
- 미래에 CI 가 예상과 다른 node 패치로 돌면: annotation 의 `runtime vX.Y.Z` 를 먼저 보고,
  그 다음 `check-latest` 가 살아 있는지 확인한다 — 그 입력이 사라지면 증상이 재현된다.

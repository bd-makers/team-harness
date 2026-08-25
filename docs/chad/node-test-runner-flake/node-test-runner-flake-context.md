# node-test-runner-flake — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `node:test` 업스트림 역직렬화 버그로 CI가 간헐 실패하는 것을 멈춘다.
- Current atomic step: **[결정 대기] 지원 Node 범위** — EOL 탈출과 flake 해소를 분리해
  답을 받아야 한다. flake까지 없애려면 22는 답이 아니고 24(24.20.0 이후)/26이어야 한다.
- Stop / human-decision condition: **지금이 그 지점이다.** 하위 호환을 깨는 정책 결정이라
  사용자 답 없이 구현에 진입하지 않는다. spec의 Ambiguity 게이트도 이 항목 때문에 미통과 상태다.

## Constraints and settled decisions
- 원인 확정: `#processRawBuffer`가 payload 길이를 **부호 있는 정수**로 읽는다 (nodejs/node#64061).
  수정은 `>>> 0` 한 줄 (PR #64706), **Node 26.7.0**에 포함.
- **EOL과 백포트는 별개 축이다** (초기 판단 정정). 실측:
  v18/v20 = 수정 없음·EOL이라 영구 잔존 · **v22 = 활성 LTS인데 백포트 없음(staging에도)** ·
  v24 = `9ed7146851` staging, 릴리스 PR #65461 → **24.20.0(2026-08-26)부터** · v26 = 26.7.0에 포함.
- 따라서 **"활성 LTS로 이동" ≠ "flake 해소"**. 22로 가면 flake가 남는다.
- 현재 matrix `[18, 20]`은 전부 지원 종료 런타임이다.
- 우리 코드 무관 확정: 실패 파일은 스폰·직렬화 없음 · 동일 코드로 통과 이력 · 재실행 통과.
- 자동 재시도(후보 E)는 **채택 금지** — 진짜 회귀까지 숨긴다.
- PR #44(perf flake)와 **독립**. 두 flake를 한 원인으로 묶지 말 것.

## JIT retrieval map
- Narrow globs: `.github/workflows/test.yml`, `.github/workflows/release.yml`, `package.json`
- Identifiers: `engines.node`, `matrix.node`, `node-version`
- Read next: spec의 "후보" 표 — (A) 권장, (E) 금지 근거
- Verification command: CI annotation 수집
  `gh api repos/bd-makers/team-harness/check-runs/<job_id>/annotations`

## Failure capsules (max 3 unresolved)
- (none unresolved — 원인은 확정됐고 남은 것은 정책 결정이다)

## Resume checklist
- 재현은 **CI에서만** 가능하다 — 이 머신에 node 18 없음(프록시가 nodejs.org 차단), docker 없음.
- CI 로그는 403이다. `gh run view --log-failed`에 시간 쓰지 말 것 — annotation API를 쓴다.
- 결정이 나면 spec의 Ambiguity 자가진단 Constraint 항목부터 갱신하고 게이트를 다시 평가한다.

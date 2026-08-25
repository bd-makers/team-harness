# node-test-runner-flake — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `node:test` 업스트림 역직렬화 버그로 CI가 간헐 실패하는 것을 멈춘다.
- **정책 결정·구현·리뷰 대응은 모두 끝났다 (2026-08-25, PR #45).** `engines: ">=24"` + matrix `[24]`.
  spec Ambiguity 게이트 통과. **다시 열지 말 것.**
- Current atomic step: **[대기] Node 24.20.0 릴리스 후 flake 해소 검증.**
  릴리스되면 `node-version: 24`가 자동 승계 → 패치된 런타임에서 **반복** 통과 확인 후 해소 선언.
- Stop / human-decision condition: 없음. 남은 것은 외부 릴리스 대기이며 판단이 필요한 지점이 아니다.
  (24.20.0이 지연되거나 백포트가 빠지면 그때 재판단.)

## Constraints and settled decisions
*아래는 전부 **확정**이다. 재검토 대상이 아니라 재litigation 방지용으로 남긴다.*

- 현재 CI matrix는 **`[24]`** 이고 `engines.node`는 **`">=24"`** 다 (PR #45에서 변경).
  변경 전 `[18, 20]`·`">=18"`은 **historical** — 둘 다 EOL 런타임이었다.
- 원인: `#processRawBuffer`가 payload 길이를 **부호 있는 정수**로 읽는다 (nodejs/node#64061).
  수정은 `>>> 0` 한 줄 (PR #64706).
- **EOL과 백포트 도달은 별개 축이다.** v18/v20 = 영구 잔존(EOL) · **v22 = 활성 LTS인데 백포트 없음** ·
  v24 = **24.20.0(2026-08-26)부터** · v26 = 26.7.0부터.
  → `[22, 24]`는 함정이다. **22를 추가하지 말 것** — flake가 되돌아온다.
- `engines.node` 상향 요구는 **미수용**(AO 리뷰 1차). 버그는 `node --test` 안에 있고 소비자는
  그 코드를 실행하지 않는다 — `engines`는 소비자 지원 정책 선언이다.
- `node-version`을 **미출시 버전으로 pin하지 말 것.** 24.20.0 태그는 아직 404이고,
  pin하면 `setup-node` 해석 실패로 CI가 즉시 깨진다.
- 자동 재시도는 **채택 금지** — 진짜 회귀까지 숨긴다.
- PR #44(perf flake)와 **독립**. 두 flake를 한 원인으로 묶지 말 것.

## JIT retrieval map
- Read next: `<name>-artifact.md`의 **`## 결과`** 표 (현재 상태 정본) → 그 다음 `## Learnings`
- Narrow globs: `.github/workflows/test.yml` (matrix·runtime annotation), `package.json`
- Identifiers: `runtime v` (annotation 줄), `matrix.node`, `engines.node`
- Verification command:
  `gh api repos/bd-makers/team-harness/check-runs/<job_id>/annotations`
- 업스트림 확인: `gh api repos/nodejs/node/git/ref/tags/v24.20.0` (404면 아직 미출시)

## Failure capsules (max 3 unresolved)
- (none unresolved — 원인 확정·구현 완료. 남은 것은 외부 릴리스 대기뿐이다.)

## Resume checklist
- **먼저 확인:** CI annotation의 `runtime vX.Y.Z` 줄. `v24.19.x` 이하면 아직 미패치라
  green이어도 해소 증거가 아니다. **`v24.20.0` 이상이어야 검증 대상이다.**
- 패치된 런타임이 확인되면 **반복** 실행으로 검증한다 — 확률적 flake라 1회 green은 증거가 아니다.
  검증되면 artifact `## 결과`의 ⏳ 항목을 닫고 plan의 마지막 단계를 체크한다.
- 재현은 **CI에서만** 가능하다 — 이 머신에 node 18 없음(프록시가 nodejs.org 차단), docker 없음.
- CI 로그는 403이다. `gh run view --log-failed`에 시간 쓰지 말 것 — annotation API를 쓴다.

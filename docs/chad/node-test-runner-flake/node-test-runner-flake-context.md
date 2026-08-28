# node-test-runner-flake — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `node:test` 업스트림 역직렬화 버그로 CI가 간헐 실패하는 것을 멈춘다.
- **정책 결정·구현·리뷰 대응은 모두 끝났다 (2026-08-25, PR #45).** `engines: ">=24"` + matrix `[24]`.
  spec Ambiguity 게이트 통과. **다시 열지 말 것.**
- Current atomic step: **[대기] 러너 이미지 toolcache 가 24.20.0 을 실을 때까지.**
  Node 24.20.0 자체는 **이미 나왔다**(2026-08-27). 그런데도 CI 는 여전히 24.19.0 으로 돈다 —
  `setup-node` 가 dist 매니페스트보다 **러너 toolcache 를 먼저** 본다. 상세는 artifact
  `### 검증 시도 1회차 (2026-08-28)`.
- Stop / human-decision condition: **있다.** `check-latest: true` 를 넣을지((b)) 이미지
  롤아웃을 기다릴지((a)) 는 워크플로 변경이라 **사람 결정 대기 중**(2026-08-28 오케스트레이터가
  상신). 워커가 임의로 고르지 않는다. 어느 쪽이든 `.github/workflows/test.yml:19-26` 의
  "automatically once released" 주석은 **거짓으로 입증됐으므로 함께 닫는다.**
  (b) 를 택하면 런마다 **setup-node 단계 소요시간**을 `runtime vX.Y.Z` 와 함께 기록한다 —
  다운로드 불안정이 green streak 의 귀속을 흐리기 때문이다(사전 등록 조건).

## Constraints and settled decisions
*아래는 전부 **확정**이다. 재검토 대상이 아니라 재litigation 방지용으로 남긴다.*

- 현재 CI matrix는 **`[24]`** 이고 `engines.node`는 **`">=24"`** 다 (PR #45에서 변경).
  변경 전 `[18, 20]`·`">=18"`은 **historical** — 둘 다 EOL 런타임이었다.
- 원인: `#processRawBuffer`가 payload 길이를 **부호 있는 정수**로 읽는다 (nodejs/node#64061).
  수정은 `>>> 0` 한 줄 (PR #64706).
- **EOL과 백포트 도달은 별개 축이다.** v18/v20 = 영구 잔존(EOL) · **v22 = 활성 LTS인데 백포트 없음** ·
  v24 = **24.20.0(2026-08-27 게시)부터** · v26 = 26.7.0부터.
  → `[22, 24]`는 함정이다. **22를 추가하지 말 것** — flake가 되돌아온다.
- **세 번째 축이 있다: 러너 이미지가 그 패치 버전을 캐시했는가.** 업스트림 릴리스 ≠ CI 에서 실행됨.
- `engines.node` 상향 요구는 **미수용**(AO 리뷰 1차). 버그는 `node --test` 안에 있고 소비자는
  그 코드를 실행하지 않는다 — `engines`는 소비자 지원 정책 선언이다.
- `node-version`을 **정확한 패치 버전으로 pin하지 말 것.** 자동 재시도도 **채택 금지**.
- PR #44(perf flake)와 **독립**. 두 flake를 한 원인으로 묶지 말 것.

## JIT retrieval map
- Read next: `<name>-artifact.md`의 **`## 결과`** 표 → 그 다음 `### 검증 시도 1회차 (2026-08-28)`
- Narrow globs: `.github/workflows/test.yml` (matrix·runtime annotation), `package.json`
- Identifiers: `runtime v` (annotation 줄), `matrix.node`, `check-latest`
- 대기 해제 확인 (이것 하나만 보면 된다):
  `gh api repos/actions/runner-images/contents/images/ubuntu/Ubuntu2404-Readme.md --jq .content | base64 -d | grep -A4 '^#### Node.js'`
  → 목록에 **24.20.0 이상**이 뜨면 해제. (24.19.0 은 node-versions 게시 후 약 1주 만에 실렸다.)
- 런타임 판정: `gh api repos/bd-makers/team-harness/check-runs/<job_id>/annotations`

## Failure capsules (max 3 unresolved)
### F-1 rerun 이 패치 런타임을 집지 못한다 (미해결)
- 증상: 24.20.0 게시 19h 뒤 rerun(run 33020249395 attempt 2, job 98759657160)도 `runtime v24.19.0`.
- 원인: `setup-node@v5` `base-distribution.ts` 는 `check-latest` 가 꺼져 있으면
  `tc.find('node','24')` 를 dist 조회보다 먼저 한다. 최신 이미지 `ubuntu24/20260823.283` 의
  toolcache 가 24.19.0 이라 spec `24` 를 만족해 그대로 쓴다.
- 해소 조건: 러너 이미지 갱신(무변경) 또는 `check-latest: true`(워크플로 변경 — 결정 필요).

## Resume checklist
- **먼저 확인:** 위 JIT map 의 러너 이미지 Readme grep. 24.19.0 뿐이면 **아직 막혀 있다** —
  rerun 을 더 돌려도 결과는 같다. CI 예산만 태운다.
- 해제되면 **반복** 실행으로 검증한다 — 확률적 flake라 1회 green은 증거가 아니다(최소 5회 연속).
  검증되면 artifact `## 결과`의 ⏳를 닫고 plan의 미완 2건을 체크한다.
- 재현은 **CI에서만** 가능하다 — 이 머신에 node 18 없음(프록시가 nodejs.org 차단), docker 없음.
- CI 로그는 403이다. `gh run view --log-failed`에 시간 쓰지 말 것 — annotation API를 쓴다.

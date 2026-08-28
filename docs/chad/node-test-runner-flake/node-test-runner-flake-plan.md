# node-test-runner-flake — Plan

## 목표
`node:test` 러너의 업스트림 역직렬화 버그로 CI가 간헐적으로 빨개지는 것을 멈춘다.
동시에 CI matrix가 지원 종료 런타임만 테스트하는 상태를 해소한다.

## 단계
- [x] 원인 확정 — 업스트림 nodejs/node#64061, `#processRawBuffer` 부호 있는 길이 읽기
- [x] 우리 코드 무관함 입증 — 실패 파일은 스폰·직렬화 없음, 동일 코드로 통과 이력, 재실행 통과
- [x] 수정 릴리스 확인 — PR #64706 (`>>> 0`), Node 26.7.0 (2026-08-05)
- [x] node 18 백포트 불가 확인 — 2025-04-30 EOL
- [x] matrix가 전부 EOL임을 확인 — 18(2025-04-30) · 20(2026-04-30) 모두 지원 종료
- [x] **백포트 실측** — 릴리스 라인별 소스 대조로 확정 (spec의 백포트 표 참조)
      · v22: **백포트 없음** (staging에도 없음) → 22로 옮겨도 flake 잔존
      · v24: cherry-pick `9ed7146851` → `v24.x-staging`, 릴리스 PR #65461 → **수정은 24.20.0 부터 들어 있다**
        (실제 게시 2026-08-27). 단 이는 **백포트 도달** 축이다 — CI 가 그 런타임으로 도는지는 별개 축이며
        아래 미완 단계에서 다룬다
      · v26: 26.7.0에 이미 포함 (단 Current, LTS 승격 2026-10월)
- [x] **[결정 완료 2026-08-25] 지원 Node 범위 확정 — `engines: ">=24"` + matrix `[24]`**
      두 축을 분리해 물었고 사용자가 (a)(b) 모두 "예"를 택했다:
      · (a) EOL 런타임(18·20) 지원 중단 → `engines` 하위 호환 파기 **수용**
      · (b) flake까지 해소 → 그래서 **22는 제외**했다. "활성 LTS니까 22"는 flake를 남긴다
      · 대안이던 (D) `--test-concurrency=1`(확률만 낮춤)은 **불필요해져 폐기**
- [x] spec의 Ambiguity 자가진단 갱신 — Constraint 해소, 게이트 통과
- [x] 결정에 따라 아래 3곳을 수정 (grep으로 전수 확인함)
      · `.github/workflows/test.yml:14` — `node: [18, 20]`
      · `.github/workflows/release.yml:21` — `node-version: 20` (**릴리스 발행도 EOL 런타임에서 돈다**)
      · `package.json:20` — `"node": ">=18"`
- [x] 사용자 대면 문서 갱신 — `README.md`(2곳) · `docs/prerequisites.md`(3곳) · `CHANGELOG.md` Unreleased
      · 종결된 task의 spec(`docs/chad/prerequisites-doc/...`)은 **건드리지 않았다** — 당시 사실의
        historical record이며 다른 task의 SSOT다
- [x] **패치된 런타임(24.20.0+)에서 flake 해소 검증** — **완료 (2026-08-28).**
      `runtime v24.20.0` 에서 **5회 연속 green** (run 33147199419 attempt 1~5, 커밋 `30d1273`).
      · **대기 조건이 한 번 틀렸다.** 24.20.0 게시(2026-08-27) 후에도 rerun·새 `pull_request`
        런 모두 `runtime v24.19.0` 이었다 — `setup-node` 가 `check-latest` 없이는 dist
        매니페스트를 조회조차 않고 `tc.find('node','24')` 로 러너 toolcache 를 먼저 본다.
        이미지 `ubuntu24/20260823.283` 의 toolcache(22.23.2/24.19.0)가 실질 pin 이었다.
      · 사람 결정으로 **(b) `check-latest: true`** 채택 → 해석을 매니페스트에 묶었다.
        같은 커밋에서 test.yml 19-26행의 거짓 주석도 정정했다. matrix·engines·pin·retry는 불변.
      · 각 런의 setup-node 소요를 함께 기록했다(toolcache 0~1s → 매니페스트 5~13s).
        다운로드 실패로 깨진 런 0건 → green streak 는 네트워크 운이 아니라 패치 런타임에 귀속된다.
- [x] artifact에 결정 근거와 검증 결과 기록 — `## 검증 기록`(1·2회차), `## Reviews`
      (codex-adversarial), `## Learnings`. CHANGELOG `[Unreleased] ### Fixed` 에 해소 확인 1줄.

## Ontology 변경 로그
- **백포트 도달 여부**를 EOL과 **독립된 축**으로 분리 — 활성 LTS라고 수정이 와 있지 않다
  (v22가 반례). 초기 spec이 두 축을 하나로 묶었던 것을 정정했다.
- **전이성(transient) 실패** 정의 도입 — 재실행 통과가 코드 결함 가설의 반증이 된다는 판정 기준.
  이 프로젝트에서 flake를 분류할 때 재사용 가능하다.
- **러너 toolcache 도달 여부**를 세 번째 축으로 추가 (2026-08-28) — 업스트림 릴리스·백포트가
  모두 끝나도 CI 가 그 버전으로 도는 것은 별개 사건이다. `setup-node` 는 `check-latest` 없이는
  러너 이미지가 캐시한 버전을 먼저 쓴다. "릴리스됨"을 "CI 에서 실행됨"으로 읽으면 안 된다.
- **EOL**이 기술 결정의 입력으로 승격 — "업스트림 수정이 도달하지 못하는 런타임"이라는
  성질이 후보 평가를 좌우한다.

## 참고
- 이 task는 PR #44(perf flake)와 **독립**이다. 두 flake는 원인·수정 경로가 완전히 다르다.
- 재현은 CI에서만 가능하다 — 이 머신에는 node 18이 없고(프록시가 nodejs.org 차단),
  docker도 없다. 조사는 annotation 계측에 의존한다.

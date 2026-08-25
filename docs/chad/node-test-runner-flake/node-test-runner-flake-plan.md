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
      · v24: cherry-pick `9ed7146851` → `v24.x-staging`, 릴리스 PR #65461 → **24.20.0(2026-08-26)부터** 해소
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
- [ ] **[대기] 24.20.0 릴리스 후 flake 해소 검증** — 이것이 완료되기 전까지
      "flake가 해소됐다"고 선언하지 않는다 (AO 리뷰 P1 수용).
      · 2026-08-25 현재 `node-version: 24` → **24.19.0(미패치)**. 릴리스 PR nodejs/node#65461은
        아직 open이고 태그 `v24.20.0`은 존재하지 않는다(404) — **지금 pin하면 CI가 깨진다**
      · 릴리스되면 `24`가 자동으로 집는다. CI annotation의 `runtime vX.Y.Z` 줄로 확인
      · 패치된 런타임에서 **반복** 통과를 확인한 뒤에 해소 선언 — 확률적 flake라 1회 green은 증거가 아니다
- [ ] artifact에 결정 근거와 검증 결과 기록

## Ontology 변경 로그
- **백포트 도달 여부**를 EOL과 **독립된 축**으로 분리 — 활성 LTS라고 수정이 와 있지 않다
  (v22가 반례). 초기 spec이 두 축을 하나로 묶었던 것을 정정했다.
- **전이성(transient) 실패** 정의 도입 — 재실행 통과가 코드 결함 가설의 반증이 된다는 판정 기준.
  이 프로젝트에서 flake를 분류할 때 재사용 가능하다.
- **EOL**이 기술 결정의 입력으로 승격 — "업스트림 수정이 도달하지 못하는 런타임"이라는
  성질이 후보 평가를 좌우한다.

## 참고
- 이 task는 PR #44(perf flake)와 **독립**이다. 두 flake는 원인·수정 경로가 완전히 다르다.
- 재현은 CI에서만 가능하다 — 이 머신에는 node 18이 없고(프록시가 nodejs.org 차단),
  docker도 없다. 조사는 annotation 계측에 의존한다.

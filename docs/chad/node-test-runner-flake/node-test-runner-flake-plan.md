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
- [ ] **[결정 필요] 지원 Node 범위 확정** — 사용자 판단. `engines: ">=22"`로 올릴 것인가?
      · 올린다 → 후보 (A) 진행
      · 못 올린다 → (D) `--test-concurrency=1`로 확률만 낮추고 잔여 리스크를 문서화
- [ ] spec의 Ambiguity 자가진단 갱신 (Constraint 항목 해소 후 재평가)
- [ ] 결정에 따라 아래 3곳을 수정 (grep으로 전수 확인함)
      · `.github/workflows/test.yml:14` — `node: [18, 20]`
      · `.github/workflows/release.yml:21` — `node-version: 20` (**릴리스 발행도 EOL 런타임에서 돈다**)
      · `package.json:20` — `"node": ">=18"`
- [ ] `docs/chad/prerequisites-doc/prerequisites-doc-spec.md:9`의 `engines.node >= 18` 서술 갱신
- [ ] 활성 LTS에서 스위트 반복 통과 확인 (annotation으로 수치·실패 수집)
- [ ] artifact에 결정 근거와 검증 결과 기록

## Ontology 변경 로그
- **전이성(transient) 실패** 정의 도입 — 재실행 통과가 코드 결함 가설의 반증이 된다는 판정 기준.
  이 프로젝트에서 flake를 분류할 때 재사용 가능하다.
- **EOL**이 기술 결정의 입력으로 승격 — "업스트림 수정이 도달하지 못하는 런타임"이라는
  성질이 후보 평가를 좌우한다.

## 참고
- 이 task는 PR #44(perf flake)와 **독립**이다. 두 flake는 원인·수정 경로가 완전히 다르다.
- 재현은 CI에서만 가능하다 — 이 머신에는 node 18이 없고(프록시가 nodejs.org 차단),
  docker도 없다. 조사는 annotation 계측에 의존한다.

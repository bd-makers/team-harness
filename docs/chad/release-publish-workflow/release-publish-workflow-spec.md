# release-publish-workflow — Spec

## 목적 / 요구사항

태그를 push해도 GitHub Release가 발행되지 않는다. 저장소에는 `.github/workflows/test.yml`
하나뿐이고 트리거는 `push: [main]`과 `pull_request`뿐이다 — 태그 트리거도, 릴리스
워크플로우도 존재한 적이 없다. 그 결과 원격 태그 27개 중 Release는 10개(v0.2.0~v0.6.4)뿐이며,
그 10개도 2026-06-02T04:02:0x에 초 단위로 연달아 생성된 수동 소급분이다.
`MAINTAINING.md`의 릴리스 절차도 8단계(태그 생성·push)에서 끝나 발행 단계가 없다.

요구사항 (사용자 지시, 2026-08-08 — 제시한 3안 중 1번 선택):

1. `v*` 태그 push를 트리거로 GitHub Release를 자동 발행한다.
2. 릴리스 본문은 CHANGELOG의 해당 버전 절에서 가져온다.
3. `MAINTAINING.md` 절차를 자동화에 맞게 갱신한다.

누락된 17개 태그의 소급 생성은 이번 범위 밖이다(사용자가 자동화만 선택).

## 설계 / 접근

- **추출 로직을 워크플로우 YAML에서 분리한다** — `scripts/changelog-section.mjs`가
  `## [X.Y.Z] - ...`부터 다음 `## ` 직전까지를 반환한다. YAML 안의 sed/awk 한 줄짜리는
  CI에서만 실행돼 테스트할 수 없고, 이 저장소는 그런 검증 불가 경로를 이미 결함 원인으로
  겪었다(#16의 404). 스크립트로 두면 `node --test`가 직접 검증한다.
- **버전 불일치를 실패로 막는다** — 태그 `vX.Y.Z`와 그 커밋의 `package.json` version이
  다르면 워크플로우를 실패시킨다. 매니페스트를 bump하지 않은 커밋에 태그가 붙는 사고를
  차단한다(이번 세션에서 실제로 0.13.1 오발행이 있었다).
- **CHANGELOG 절이 없으면 실패시킨다** — 빈 본문 릴리스를 발행하지 않는다.
- **의존성 0 유지** — 저장소 관례대로 런타임 의존성을 추가하지 않는다. 발행은 러너에
  기본 제공되는 `gh` CLI로 한다.
- 기존 `test.yml`은 건드리지 않는다 — 태그 push는 `branches: [main]` 필터에 걸리지 않아
  CI가 중복 실행되지 않는다.

## Ontology

- **release-publish workflow**: `v*` 태그 push 시 버전 정합을 검증하고 CHANGELOG 절을
  본문으로 GitHub Release를 발행하는 CI 잡.
- **changelog section**: `## [X.Y.Z] - YYYY-MM-DD` 헤딩 다음 줄부터 다음 `## ` 헤딩
  직전까지의 본문. 앞뒤 공백은 제거한다.
- **게이트 통과 근거**: 요구사항이 사용자 지시로 확정됐고, 실패 조건(버전 불일치·절 부재)이
  명시적이며, 성공 기준이 `npm run test` 통과와 실제 태그 발행으로 측정 가능하다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — `v*` 태그 push → CHANGELOG 본문으로 Release 자동 발행
- [x] **Constraint 명확도** (30%) — 의존성 0, 기존 test.yml 불변, 검증 가능한 경로로 구현,
      버전 불일치·절 부재는 실패
- [x] **Success 기준** (30%) — `npm run test` 통과(추출기 단위 테스트 포함) + v0.14.0 태그
      재push로 실제 발행 확인
- [x] **Context 명확도** (brownfield) — `.github/workflows/test.yml`, `CHANGELOG.md` 헤딩
      포맷, `MAINTAINING.md` 8단계 식별 완료
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고

- MAINTAINING.md 릴리스 절차 (8단계에서 종료 — 발행 단계 부재)
- CHANGELOG.md Keep a Changelog 포맷 (`## [X.Y.Z] - YYYY-MM-DD`)

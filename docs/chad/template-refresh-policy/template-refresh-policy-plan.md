# template-refresh-policy — Plan

## 목표

기존 `refreshClaudeHooks`의 provenance-refresh 정책을 `.claude/skills`(3) · `.claude/rules`(4)로
확장하고, `doctor`가 stale 템플릿을 경고해 발견 가능하게 만든다. `docs/` seed는 비목표.

## 단계

- [x] 1. 픽스처 준비 — 7개 파일의 과거 stock 버전을 git blob에서 추출해
      `tests/fixtures/stock-templates/<era>/`에 배치 (기존 `stock-hooks` era 구조 준용)
- [x] 2. `migrate.mjs` — refresh를 표면 무관(surface-agnostic)하게 일반화하고
      skills·rules 목록 + `KNOWN_STOCK_TEMPLATE_SHA256` 테이블 추가.
      **고정 파일 목록으로 순회**(`readdir` 금지 — `/harness-promote`가 쓴 사용자 규칙을 건드리지 않는다)
- [x] 3. 회귀 테스트 — 실측 비대칭(수정 템플릿 미도달)을 단위 테스트로 고정 +
      보존/미설치/멱등/테이블 드리프트 가드
- [x] 4. `doctor.mjs` — stale-template 경고(→ `migrate` 유도). 기존 rules provenance 검사와
      이중 보고되지 않게 확인
- [x] 5. `commands/harness-init.md` — 재실행 계약 서술 갱신(무엇이 보존/갱신되는지)
- [x] 6. `docs/decisions.md` — 정책 결정 D-번호 한 줄
- [x] 7. 검증 — `npm test` · `doctor` · `docs:check` · 샌드박스 end-to-end 재현

## Ontology 변경 로그

- **stock / customized / refresh** 정의를 spec.md `## Ontology`에 신설 — 기존 훅 refresh가
  암묵적으로 쓰던 개념을 명시화했다.
- **refresh ≠ install** 구분을 명시 — 미설치 파일을 새로 깔지 않는다는 제약의 근거.

## 참고
- spec.md `## 설계 / 접근`의 기각 대안 3종(전면 덮어쓰기 · 마커 병합 · 설치 시점 매니페스트)

# release-0181-recovery — Plan

## 목표

빠진 `docs/what-changes-0.18.1.html`을 채워 main CI를 녹색으로 되돌리고, v0.18.1 GitHub 릴리스를
발행한다. 태그 처리는 근거를 보고한 뒤에만 실행한다.

## 단계
- [ ] 원인 재현 — `npm run test`에서 `what-changes-latest-version.test.mjs` ENOENT 확인
- [ ] 계약 확인 — 테스트가 요구하는 3가지(제목 버전 / 요약 `<dt>버전</dt>` / 스냅샷 완전 일치)
- [ ] `docs/what-changes-0.18.1.html` 작성 (0.18.0·0.16.1 스냅샷 구조·톤 준수, 자립형 정적 HTML)
- [ ] `docs/what-changes-latest-version.html`을 스냅샷과 바이트 단위 동일하게 동기화
- [ ] `npm run test` 388/388 + `npm run docs:check` 그린 확인
- [ ] 리뷰 실행 (`/harness-review`) 후 artifact `## Reviews`에 마커 포함 기록
- [ ] 커밋 · push · PR 생성 → CI 그린 확인
- [ ] 태그 처리 방안(강제 이동 vs 0.18.2 재범프) 근거와 함께 오케스트레이터에 보고
- [ ] 승인 후 태그 처리 실행 → v0.18.1 릴리스 발행 확인
- [ ] artifact 기록 · `harness-team done`

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- **릴리스 한 커밋 계약** — 태그가 가리키는 단일 커밋에서 세 검사가 모두 돌기 때문에 성립하는
  제약임을 명시했다. 이번 사고는 이 계약이 깨진 사례다.

## 참고
- `MAINTAINING.md` 릴리스 절차 4~9단계
- `tests/what-changes-latest-version.test.mjs`
- `.github/workflows/release.yml`

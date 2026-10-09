# wiki-commit-provenance — Plan

## 목표
PR 없이 기본 브랜치에 직접 커밋하는 저장소에서도 `wiki sources`가 마커를 낸다 — PR 번호를 못 찾으면 `no-pr` 막힘 대신 커밋 출처 마커(`pr=` 키 없음).
PR 번호가 있는 경로는 바이트 불변.

## 단계
- [x] spec/plan 다이어그램 — 미실행(함수 하나의 폴백 — 그림 이득 적음(사람 결정))
- [x] 1. `src/commands/wiki.mjs` — `wikiMarker`가 `pr === null`이면 `pr=` 키를 뺀다 · blockers에서 `no-pr` 삭제 · `BLOCKER_TEXT['no-pr']` 삭제 ·
  텍스트 출력 `note:` 한 줄과 JSON summary 문구(커밋 출처일 때만)
- [x] 2. 테스트 — `tests/wiki.test.mjs`: 기존 "no PR number blocks until --pr is given"을 S1·S2 두 테스트로 바꾸고 S3 추가. S4는 기존 테스트 무수정
- [x] 3. 문서 — `commands/harness-wiki.md` 3번 절차·"컴파일 단락의 내용" + `tests/wiki-command.test.mjs` 기대 문구(S5) · `skills/harness-wiki/SKILL.md` ·
  `docs/harness-cycle.md` §4-4 · `README.md` · CHANGELOG `[Unreleased]`
- [x] 4. 검증 — `npm test` · `npm run docs:check` · `harness-team scenario check` · heliosent 읽기 전용 재현(쓰기 0 확인) → artifact 기록
- [x] 5. 리뷰 — R2 `review codex --framing scenario` · R3 `review codex`(codex 실패 시 claude 엔진 폴백) → artifact `## Reviews`
- [x] 6. ship 준비 보고 — spec·plan·artifact 최종 갱신, 로컬 커밋까지(push·PR 금지 — brief)
- [x] 7. 사람 승인 3건 반영(2026-10-09) — 커밋 출처 `commit=`을 종결 커밋으로(`lastTouchingCommit`) · 다이어그램 건너뜀 기록 · 종결된 wiki-compile spec S3 증거 정정 → 검증 재실행 · R3 재리뷰(scope=diff 확인)
- [ ] 8. push(`HEAD:ao/harness-aijient-team-plugin-20/wiki-commit-provenance`) · PR(base main) · PR 번호·CI 상태 보고 — 머지 금지

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-09 커밋 출처 정의 추가, `no-pr`를 막힘 목록에서 뺌(c1 정의 대체).
- 2026-10-09 종결 커밋 정의 추가 — 커밋 출처의 `commit=`이 들여온 커밋에서 종결 커밋으로 바뀜(사람 승인).

## 참고
- spec Done evidence S1–S5, 설계 절 "마커 형식"·"기각한 대안"
- 다이어그램 단계는 brief 지시로 옵트인 질문 없이 열어 둔다 — 사람 결정 대기(보고에 포함).

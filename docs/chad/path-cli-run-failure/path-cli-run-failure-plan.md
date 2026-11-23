# path-cli-run-failure — Plan

## 목표
doctor가 PATH CLI 실행 실패를 옛 CLI로 오진하지 않고, 원인 첫 줄과 재설치 처방을 낸다.

## 단계
- [ ] [사람] spec 검토 승인 — chad
- [x] 실패·옛 CLI 테스트 작성 — 검증: 수정 전 실패
- [x] `readPathCliVersion`·`cliDriftWarning`·`checkCliDrift`·next_actions 수정 — 검증: 새 테스트 통과
- [x] 같은 사실을 적은 현행 문서 정합 (`MAINTAINING.md`·`docs/prerequisites.md` 등)
- [x] `npm test` · `npm run docs:check` 통과
- [ ] 리뷰 실행 + artifact `## Reviews` 판별 기록
- [ ] ship 완료

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-23: PATH CLI 상태에 `failed`(실행 실패) 추가 — `legacy`는 `Unknown command: --version` 양성 표지로만

## 참고
-

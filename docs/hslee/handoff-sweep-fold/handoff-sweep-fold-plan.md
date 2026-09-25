# handoff-sweep-fold — Plan

## 목표
handoff만 담는 sweep 커밋을 푸시·브랜치 전환 직전으로만 줄인다(보통 PR/MR당 1개) — 규범만 바꾸고 훅은 그대로 둔다.

## 단계
- [x] 설계 방향 결정 — A(다음 커밋에 접기), 2026-09-25 전하 선택
- [x] `AGENTS.md`·`templates/AGENTS.md.hbs` `commit 시` 줄 갱신 (eager 예산 안)
- [x] `commands/harness-task.md` post-commit handoff 절에 규칙·예외 정본화
- [x] `commands/harness-ship.md` 5단계에 ship 문서 커밋에 함께 담기
- [x] CHANGELOG Unreleased `### Changed`
- [x] `npm test`·`npm run docs:check` 통과
- [x] codex 리뷰 → artifact `## Reviews` 기록 (P2 1·P3 2, 전부 반영)
- [x] 커밋·PR — #105 머지(`32f7c2e`)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- sweep 커밋: "매 커밋 뒤 필요" → "푸시·브랜치 전환·워크트리 정리 직전에만(상한 없음, codex P2)".

## 참고
- 다이어그램: 옵트인 질문에 "넣지 않음"(2026-09-25).

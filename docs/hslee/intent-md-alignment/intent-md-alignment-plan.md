# intent-md-alignment — Plan

## 목표

intent.md 요소 2개(Problem · Open questions)를 기존 spec 표면에 흡수하고, observe 트립 → task 생성 nudge를
붙인다. 파일 추가·게이트·가중치 변경 없음. 다이어그램은 생성 시 질문에서 "아니오"로 옵트아웃.

## 단계
- [x] `commands/harness-spec.md` — Problem 인터뷰 차원 + `(open)` 열린 질문 규약
- [x] `commands/harness-interview.md` — Goal 채점 근거(문제 문장) · Goal 각도 문제 질문 · `(open)` 게이트 조건
- [x] `src/commands/task.mjs` spec 템플릿 안내문 1줄 + `tests/task-templates.test.mjs` assert
- [x] `src/commands/observe.mjs` 트립 nudge(JSON `next_actions` + 텍스트 렌더) + `tests/observe.test.mjs` assert
- [x] `commands/harness-observe.md` · README observe 절 · `templates/docs/README.md` 규약 · CHANGELOG `[Unreleased]`
- [x] `npm test` · `npm run docs:check` 통과
- [x] Codex read-only 리뷰(`/harness-review`) → artifact Reviews 기록 · 발견 재현·판별 후 반영
- [x] artifact Learnings 기록 · TCC 갱신

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-09-06 **Problem 축**·**(open) 항목**·**루프백 nudge** 신규 정의 — spec Ontology 참조.

## 참고
- 범위 확정 근거: spec "비목표" 절 (기각·보류 6건)
- 릴리스는 이 task 범위 밖 — `[Unreleased]`에만 기록

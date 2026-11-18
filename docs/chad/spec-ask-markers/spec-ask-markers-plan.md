# spec-ask-markers — Plan

## 목표
spec 외부 질의 마커(`ask:` → `asked:` → `answered` → 삭제)를 문서·템플릿 문구로 정의하고, 세 상태가 게이트를 통과하지 못하게 한다(설계 A4-1·A4-2).

## 단계
- [x] `commands/harness-interview.md` — 열린 질문 검사·R1 ②·표기 구분에 ask 3상태, 이월 비대상 문장, 차단 시 역할별 목록
- [x] `commands/harness-spec.md` — 6단계 ask 마커 bullet·역할별 목록·rule/skill 실행 제안(제안만), 7단계 인계
- [x] `src/commands/task.mjs` spec 템플릿 안내문 두 곳 + `templates/docs/README.md` 규약 줄
- [x] pin 테스트 — `tests/task-templates.test.mjs`·`tests/agent-files.test.mjs`
- [x] `CHANGELOG.md` `[Unreleased]` 항목
- [x] `npm test`·`npm run docs:check` 통과 후 로컬 커밋

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-18: **ask 마커** 신설 — 다른 역할에 묻는 질문의 3상태. `(open)`은 "누구에게 물을지 정하지 않은 질문"으로 좁혀 읽힌다. 이월 대상은 기록 위치이며 역할이 아니다.

## 참고
- 설계: `docs/chad/team-harness-improvements/team-harness-improvements-spec.md` "A4"

# task-clean — Plan

## 목표
`harness-team clean [<name>] [--base <ref>] [--yes]`로 task 하나를 시작 전 상태로 되돌린다(dry-run 기본, 백업 ref, 로컬 전용).

## 단계
- [x] spec 작성 · advisor 검토 반영
- [x] `task` 생성 시 meta `baseSha` 기록 + 테스트
- [x] `clean` 명령 등록(cli-args·router, 예약 이름)
- [x] `src/commands/clean.mjs` — anchor 판정·거부 가드·dry-run·백업·reset/clean·active 정리
- [x] `tests/clean.test.mjs` — 임시 git 저장소로 성공 기준 전부
- [x] 문서: `commands/harness-task.md`(에이전트 `--yes` 규칙 포함)·README·CHANGELOG·overview
- [x] `npm test` · `doctor` 통과
- [x] 리뷰(`harness-team review`) 기록
- [ ] 커밋·PR

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-17: `clean`·anchor·`baseSha`·백업 ref 신설.

## 참고
- 다이어그램: 생성 시 옵트인 질문에 "건너뛰기" — 단계 없음.

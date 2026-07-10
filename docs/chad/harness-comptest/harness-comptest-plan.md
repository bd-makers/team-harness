# harness-comptest — Plan

## 목표
`/harness-unittest`의 형제 커맨드로 `/harness-comptest`를 4-파일 동기화 규약에 맞춰 추가한다.

## 단계
- [x] 규약 정독: unittest 커맨드/스킬, manifest-sync 테스트, README 표
- [x] task 생성 + spec.md Ambiguity 게이트 통과
- [x] `commands/harness-comptest.md` 작성 (라우팅 + 0~6단계)
- [x] `skills/harness-comptest/SKILL.md` 작성 (Codex 래퍼)
- [x] `plugin.json` commands + README 커맨드 표 등록
- [x] unittest §4에 양방향 라우팅 교차 참조 1줄 추가
- [x] CHANGELOG [Unreleased] 기록
- [x] `npm run test:unit` 통과 (124/124, manifest-sync 8/8)

## Ontology 변경 로그
- comptest = Testing Trophy 통합 층(렌더·상호작용 관심사); 순수 로직은 unittest로 라우팅.

## 참고
- 형제 계약: `commands/harness-unittest.md`
- invariant 가드: `tests/manifest-sync.test.mjs`

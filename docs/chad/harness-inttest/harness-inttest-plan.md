# harness-inttest — Plan

## 목표

`/harness-inttest`를 3형제(unittest/comptest/inttest) 커맨드로 완결적으로 장착하고
manifest-sync invariant + `npm run test:unit`를 통과시킨다.

## 단계
- [x] 형제 계약·SKILL·manifest-sync·README 정독 → 규약 확정
- [x] spec.md Ambiguity 게이트 통과 (5/5)
- [x] 베이스라인 `npm run test:unit` 그린 확인 (124 pass)
- [x] `commands/harness-inttest.md` 작성 (사양 1~8, 형제 문체)
- [x] `skills/harness-inttest/SKILL.md` 작성 (Codex 래퍼 규약)
- [x] `plugin.json` commands + README 커맨드 표 등록
- [x] 형제 계약 2개에 교차 참조 각 1줄 (comptest 라우팅 / unittest §2)
- [x] CHANGELOG [Unreleased] 기록
- [x] `npm run test:unit` 재실행 통과 (124 pass, manifest-sync 7/7)

## Ontology 변경 로그

- 3형제 라우팅 경계 확정: 순수로직→unittest, 렌더/상호작용→comptest, 프로세스
  경계/인프라 배선→inttest. comptest·inttest가 공유하는 msw는 "관심사"(클라이언트
  렌더 vs 서버 수직 슬라이스)로 가른다.

## 참고
- `commands/harness-comptest.md` "라우팅" — 경계 서술 golden reference.
- `tests/manifest-sync.test.mjs` — 4-파일 동기화 invariant.

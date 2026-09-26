# backup-dir-worktree-base — Plan

## 목표
git 워크트리에서도 백업 경로(`loadBackupDir`·`resolveBackupDir`·`init` 신규 설정)가 메인 체크아웃 기준으로 풀린다.

## 단계
- [x] 실패 테스트 작성 — 링크된 워크트리 fixture (`tests/backup-dir.test.mjs`)
- [x] 구현 — `backupAnchor` 헬퍼 + 설정 해석 공유 + 자동 탐지·init 신규 설정 (`src/backup-dir.mjs`, `src/harness.mjs`, `src/commands/init.mjs`)
- [x] 문서 — CHANGELOG `[Unreleased]` Fixed
- [x] 검증 — `npm test`(1047, fail 0), `npm run docs:check`, deep-math 워크트리 doctor 실측 ✓
- [x] 리뷰(codex P2 2건 반영 → 재리뷰 claude P1·P2 없음, P3 2건 반영) → artifact Reviews 기록
- [x] 커밋·PR

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-09-26: "anchor(메인 체크아웃 기준 경로)" 정의 추가 — 백업 경로 해석의 기준.

## 참고
- 다이어그램: 옵트인 질문에 "넣지 않음"(2026-09-26)

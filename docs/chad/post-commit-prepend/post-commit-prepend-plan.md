# post-commit-prepend — Plan

## 목표
post-commit 설치를 pre-push와 같은 맨 위 삽입 + 비-셸 skip 경로로 옮기고, append 분기를 없앤다(followups 13).

## 단계
- [x] 1. spec 작성 — 판단 (a) 순서·(b) 한 줄 블록·(c) doctor 미추가와 기각한 축소안 기록
- [x] 2. 테스트 먼저 — `exit 0` 뒤 실행, 비-셸 skip + `harness-team handoff` 처방, shebang 변형·개행 없는 shebang, 멱등, 새 설치 바이트 동일
- [x] 3. 구현 — `POST_COMMIT_BLOCK`, `installGitHook({ name, block, marker, call })`, append 분기 삭제, shebang 개행 보정
- [x] 4. `npm run test` green
- [x] 5. CHANGELOG `[Unreleased]` 항목 + `docs/followups.md` 13번 제거
- [x] 6. `/harness-review`(codex) 실행 → artifact `## Reviews` 기록·반영
- [ ] 7. 커밋 → handoff 반영 커밋 → `harness-team pr-check`

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-06 "블록"이 pre-push 전용에서 두 훅 공통 개념이 됨 — 새 훅 파일 = `#!/bin/sh\n` + 블록

## 참고
- spec: `post-commit-prepend-spec.md`

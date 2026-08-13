# cursor-rules-prune — Plan

## 목표

원본이 사라진 Cursor 미러 산출물을 제거해, 이름을 바꾸거나 삭제한 규칙이 Cursor에
낡은 사본으로 계속 살아 있지 않게 한다.

## 단계
- [x] 생성 `.mdc`에 `CURSOR_MIRROR_MARKER` 스탬프 추가 (frontmatter 바로 뒤, 마크다운 주석)
- [x] `.harness/cursor-mirror.json` 기록 — 소유권 판정을 내용이 아니라 기록으로 (리뷰 P2)
- [x] 기록 경로를 신뢰하지 않는 입력으로 검증 (`..`·절대경로·역슬래시 거부)
- [x] `.claude/rules` 전체 삭제 시에도 prune 실행 (리뷰 P1)
- [x] `pruneCursorMirrors` — 기록에 있고 이번에 안 쓴 `.mdc`만 제거, 빈 디렉터리 정리
- [x] `mirrorCursorRules`가 prune 결과를 `action: 'prune'`으로 함께 반환
- [x] `sync`가 prune 건수를 별도 라인으로 보고
- [x] 테스트 5건 추가 — 이동/삭제+빈 디렉터리/손으로 쓴 규칙·구버전 산출물 보존/스탬프 존재
- [x] 뮤테이션 확인 — 경로 탈출 가드를 끄면 그 테스트만 실패. 이 과정에서 테스트 자체의 결함(`../` 한 단계로는 대상에 닿지 않음)을 발견해 `../../`로 수정
- [x] 실제 템플릿으로 확인 — `styling.md` 이동 + `testing.md` 삭제 → 옛 `.mdc` 2개 prune, 새 위치 생성
- [x] `npm test` 전량 통과 + `docs:check`
- [x] CHANGELOG `[Unreleased]` 기록
- [x] Codex 외부 리뷰 실행 및 artifact 기록

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-08-12: **미러 산출물 소유권** 정의 — `.cursor/rules`는 하네스와 사용자가 공유하는
  디렉터리다. 하네스는 자기가 스탬프한 파일만 소유하며, 그 밖은 읽기 전용으로 취급한다.

## 참고
- 선행 task: [[cursor-rules-mirror]] — 재귀 미러링이 "규칙을 폴더로 정리" 시나리오를 열면서
  이 결함이 실제 문제가 됐다.

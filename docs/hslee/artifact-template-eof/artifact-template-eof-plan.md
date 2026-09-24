# artifact-template-eof — Plan

## 목표
새 task artifact 템플릿이 EOF 빈 줄 없이 개행 하나로 끝나게 한다.

## 단계
- [x] 영향 소비자 확인(done 가드 trim 비교·retro append·review/diagram 삽입·golden 스냅샷)
- [x] 템플릿 끝 빈 줄 삭제 + 회귀 테스트(원 코드에서 red 확인)
- [x] golden 재생성(빈 줄 2줄 삭제만) · `npm test` · `doctor` green
- [x] CHANGELOG `[Unreleased]` `### Fixed`
- [x] Codex 리뷰(`review codex --scope worktree`) + artifact 판별 기록
- [ ] `git add` → `npm run docs:generate` → commit → PR

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
-

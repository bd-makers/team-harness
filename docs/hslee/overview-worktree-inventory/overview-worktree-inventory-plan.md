# overview-worktree-inventory — Plan

## 목표
overview 인벤토리를 `git add -A`가 스테이징할 트리 기준으로 바꾸고, MAINTAINING의 낡는 eager 수치를 측정 명령으로 대체한다(감사 후보 D).

## 단계
- [x] 인벤토리 출처를 작업 트리 기준으로 변경 (`scripts/generate-harness-overview.mjs`)
- [x] 계약 테스트를 임시 git 저장소로 옮겨 세 경우로 분할 (`tests/harness-overview-generation.test.mjs`)
- [x] `MAINTAINING.md:39` 생성 순서 안내와 `:52` eager 수치 정리
- [x] CHANGELOG `[Unreleased]` 항목
- [x] 검증: `git add` 전 `docs:generate` → `git add -A` → `docs:check`, `npm test`
- [ ] 커밋

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-04 소스 인벤토리: index 기준 → `git add -A`가 스테이징할 트리 기준.

## 참고
- 감사 spec: `docs/hslee/subsystem-audit/subsystem-audit-spec.md` 후보 D

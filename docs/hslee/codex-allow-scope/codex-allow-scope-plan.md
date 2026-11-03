# codex-allow-scope — Plan

## 목표
템플릿의 `Bash(codex:*)`를 빼고, 기존 설치는 migrate 일회성 단계로 정리하고, 역할 표의 호출 방식을 `harness-team review codex`로 바꾼다.

## 단계
- [x] 실측 3건(접두 규칙·합집합 병합·직접 호출 안내)과 spec — §5-A 정지 후 메인테이너 승인(2026-11-04)
- [x] 템플릿 settings에서 `Bash(codex:*)` 제거
- [x] `migrateCodexAllow` 일회성 단계 + `runMigrate` 연결
- [x] 역할 표 문구(템플릿·루트 AGENTS.md)
- [x] 테스트(템플릿 검사·migrate 2개)·CHANGELOG `[Unreleased]`
- [x] `npm test` fail 0(1,302개 중 pass 1,301), `docs:check` 최신
- [ ] 커밋(브랜치 `fix/codex-allow-scope`, push 없음)

## Ontology 변경 로그
- (none)

## 참고
- R3 리뷰는 PR 전에 메인테이너가 정한다.

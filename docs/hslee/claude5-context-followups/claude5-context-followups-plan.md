# claude5-context-followups — Plan

## 목표

Claude 5 컨텍스트 엔지니어링 검토(PR #64)의 후속 2건(spec 템플릿 rich-references 유도,
stack 조건부 rules 복사)을 구현하고 전체 테스트 + 외부 리뷰로 검증한다.

## 단계
- [x] 구현 A — `taskSpecTemplate`(`src/commands/task.mjs`)의 `## 참고` 섹션을 코드 기반
      참조 우선 안내 문구로 교체
- [x] 구현 B — `copyStaticAssets`(`src/harness.mjs`)가 RN 전용 rules 4종을 명시적 비-RN
      stack에서 제외하도록 게이트 (`copyTree`에 `exclude` 옵션 추가, `src/fsx.mjs`)
- [x] 테스트 추가 — `tests/stack-conditional-rules.test.mjs`(비-RN 제외/RN 계열 유지/
      미지정 하위호환/hooks·skills 무관/sync 빈 rules 무실패)
- [x] 전체 테스트(`npm test`) 통과 확인 — 462 실행(461 통과, 1 스킵, 기존 스킵) vs
      main 베이스라인 455 실행(454 통과) — 신규 7건 전부 통과, 회귀 없음
- [x] codex 외부 리뷰 실행 → artifact.md `## Reviews`에 기록 → 확정 발견 반영 —
      발견 0건(PASS), 반영할 확정 발견 없음

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
-

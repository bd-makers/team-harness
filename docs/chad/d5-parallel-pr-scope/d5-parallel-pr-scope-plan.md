# d5-parallel-pr-scope — Plan

## 목표

AGENTS.md D4 아래에 D5(2026-08-20) 결정 노트를 append 해 단일 스레드 쓰기 규칙의 범위를
"같은 워킹트리/브랜치 내"로 정정하고, 격리 브랜치·worktree + PR/MR 병합을 허용·권장 경로로 명문화한다.
문서 전용 — `src/` 코드는 건드리지 않는다.

## 단계
- [x] 가드 테스트 2개(`tests/agent-files.test.mjs`, `tests/e2e/ssot-consistency.test.mjs`)를 읽고
      템플릿↔루트 대조 방식과 고정 문자열을 파악한다
- [x] `AGENTS.md` D4 블록 다음에 D5 blockquote를 append (D4 원문 무수정)
- [x] `templates/AGENTS.md.hbs`에 동일한 D5 blockquote를 append (쌍 편집)
- [x] `CLAUDE.md` §2 "병렬 작성·결정 에이전트는 두지 않는다" 불릿에 범위 단서를 덧붙인다
      (고정 문자열 보존)
- [x] `templates/CLAUDE.md.hbs`에 동일하게 반영 (쌍 편집)
- [x] 루트 4파일이 템플릿 관리 절과 문자 단위로 일치하는지 확인
- [x] `CHANGELOG.md` `[Unreleased]`에 항목 추가 (버전 범프 없음)
- [x] `npm run test` 전체 실행 → 실제 출력으로 통과 확인
- [x] 격리 브랜치에 커밋하고 main 대상 PR 오픈 (머지 금지)
- [x] `artifact.md`에 결과 기록 + plan 체크박스 완료 처리

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-08-20: **단일 스레드 쓰기**의 의미를 "에이전트 세션 1개"가 아니라 "공유 쓰기 대상 1개당 세션 1개"로
  좁힌다 — D5가 정의하는 범위. `격리 병렬`을 새 개념으로 추가.

## 참고
- 편집 대상: `AGENTS.md`, `templates/AGENTS.md.hbs`, `CLAUDE.md`, `templates/CLAUDE.md.hbs`, `CHANGELOG.md`
- 금지: `harness-team release`, 버전 범프, main 직접 푸시, 어떤 서브커맨드에도 `--help`

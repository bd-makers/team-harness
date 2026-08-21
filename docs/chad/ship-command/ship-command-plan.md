# ship-command — Plan

## 목표
`/harness-ship`(PR/MR 직전 최종 갱신 + 준비 완료 보고, 다이어그램 옵트인)을 추가한다.
`harness-team done`과 릴리스 플로우는 건드리지 않는다.

## 단계
- [x] 제약 테스트 선독: manifest-sync / cli-drift / agent-files / ssot-consistency / doc-inventory
- [x] 새 CLI 서브커맨드 불필요 결정 + 근거를 spec.md에 기록
- [x] `commands/harness-ship.md` 작성 (핵심 제약 → 실행 절차 → 예시, codex-review 구조 준수)
- [x] `skills/harness-ship/SKILL.md` 작성 (harness-task 형식, frontmatter allowlist 준수)
- [x] `.claude-plugin/plugin.json` commands 배열 등록 (version 필드 불변)
- [x] `AGENTS.md` + `templates/AGENTS.md.hbs` task 워크플로우에 ship 한 줄 (바이트 동일)
- [x] `README.md` 반영 (명령 수 21 → 22, `/harness-ship` 절 추가)
- [x] `CHANGELOG.md` `[Unreleased]`에 Added 항목 (버전 범프 없음)
- [x] `git add` 후 `npm run docs:generate` → `docs/harness-overview.html` 갱신
- [x] `npm run docs:check` + `npm run test` 전체 통과를 실제 출력으로 확인
- [x] 커밋 → PR 생성(머지하지 않음) → PR 번호 보고 — PR #25
- [x] artifact.md에 결과·학습 기록

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- ship — PR/MR 직전 문서 정합 단계. done(task 완료 처리)과 구분된다.
- `<name>-diagram.html` — task 디렉터리의 생성물. SSOT 4파일에 포함되지 않는다.

## 참고
- 브리프: W3 — PR/MR 직전 최종 갱신 커맨드

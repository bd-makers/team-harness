# codex-wrapper-skills — Plan

## 목표

Claude Code의 `/harness-*` 16개 command와 대응되는 Codex `$harness-*` skill surface를 추가하고, 테스트로 drift를 방지한다.

## 단계
- [x] 기존 command 목록과 현재 Codex skill 목록 확인
- [x] `commands/*.md` 대응 wrapper skill 생성
- [x] 기존 `harness-sim`을 command-equivalent surface로 명시
- [x] manifest sync 테스트에 command/skill parity 가드 추가
- [x] README와 task artifact/handoff 갱신
- [x] 관련 테스트 실행

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- Command-equivalent skill, thin wrapper, command contract, Codex surface parity 정의 추가.

## 참고
- `docs/chad/codex-wrapper-skills/codex-wrapper-skills-spec.md`

# codex-command-surface — Plan

## 목표

Claude Code의 `/harness-*` 명령 목록과 Codex의 skill/plugin 노출 차이를 진단하고, 현재 설치에서 2개만 보이는 이유와 다음 조치를 정리한다.

## 단계
- [x] AGENTS/handoff와 현재 active task 상태 확인
- [x] Claude/Codex plugin manifest 비교
- [x] 소스 `skills/`와 Codex 설치 캐시의 skill 목록 비교
- [x] Codex manual 기준으로 plugin/skill/slash command 표면 확인
- [x] README와 task artifact에 진단 결과 기록

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- Claude slash command, Codex skill, Codex plugin surface, installed cache 정의 추가.

## 참고
- `docs/chad/codex-command-surface/codex-command-surface-spec.md`

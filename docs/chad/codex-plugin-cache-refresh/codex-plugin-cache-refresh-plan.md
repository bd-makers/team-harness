# codex-plugin-cache-refresh — Plan

## 목표

Codex local plugin cache를 새 wrapper skill 포함 버전으로 갱신하고, 새 thread에서 skill 목록이 보일 상태로 만든다.

## 단계
- [x] personal marketplace와 source path 확인
- [x] cachebuster version 적용
- [x] `codex plugin add harness-aijient-team@personal` 재설치
- [x] installed cache의 skill 목록 확인
- [x] source manifest version 일치 상태 복구
- [x] 검증 결과 기록 및 task 완료

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- Cachebuster reinstall, installed cache, source manifest 정의 추가.

## 참고
- `docs/chad/codex-plugin-cache-refresh/codex-plugin-cache-refresh-spec.md`

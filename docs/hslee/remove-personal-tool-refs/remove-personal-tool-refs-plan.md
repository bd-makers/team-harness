# remove-personal-tool-refs — Plan

## 목표
개인 도구(AO, Orca·firstmate)와 개인 환경 흔적을 팀 하네스의 살아 있는 표면에서 걷어 낸다.

## 단계
- [x] AO 규칙 파일을 `~/.ao/ao-worker-rules.md`로 옮기고 저장소에서 제거, 참조 정리(index·prerequisites)
- [x] Orca fleet 가이드 제거, 참조 정리(README·index·task-guide)
- [x] Obsidian frontmatter 키 제거(32파일)
- [x] `oh-my-openagent.json` gitignore 항목 제거
- [x] `codex-shipcheck` 예시 줄 제거
- [x] followups의 개인 스킬 경로 문단 제거
- [x] 검증: grep 0건 · `npm run test` · `npm run docs:check`
- [ ] 커밋 · PR

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-05 "개인 도구 흔적"·"이력 표면" 정의 추가(spec Ontology).

## 참고
- 머지 후 종결(`done`·`summary --write`)은 기본 브랜치 몫이다.

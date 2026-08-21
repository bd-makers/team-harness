# spec-writing-skill — Plan

## 목표

Confluence · Figma · Interview 3소스에서 활성 task의 spec 초안을 생성하는 `/harness-spec` 커맨드/스킬 추가.

## 단계
- [x] `commands/harness-spec.md` 커맨드 계약 작성 (agent workflow, harness-interview 스타일)
- [x] `skills/harness-spec/SKILL.md` + `agents/openai.yaml` Codex 래퍼 작성
- [x] `.claude-plugin/plugin.json` commands 배열에 등록
- [x] `src/commands/task.mjs` printTaskNextActions 안내 갱신 + `tests/task-templates.test.mjs` assert 갱신
- [x] `templates/CLAUDE.md.hbs` §1-A에 /harness-spec 언급 + 루트 `CLAUDE.md` 동기 갱신
- [x] `README.md` 커맨드 표 한 줄 + `CHANGELOG.md` Unreleased 기재
- [x] `npm run test` 전체 통과
- [x] codex 리뷰 실행 + 10건 조치 → artifact.md 기록 (Gemini는 CLI 미설치로 미실행)
- [ ] 대화형 드라이런 (실사용 첫 실행 또는 /harness-sim 확장에서 검증 — artifact 검증 한계 참조)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-08-21: "spec 소스", "specSources 설정", "writer vs validator" 신규 정의 (spec.md Ontology 반영됨)

## 참고
- 승인 플랜: `/Users/chadonpro/.claude/plans/merry-baking-moore.md`

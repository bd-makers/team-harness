# settings-ask-tier — Plan

## 목표

init이 쓰는 settings 템플릿에 `permissions.ask` 3개(`Bash(git push*)`·`Bash(gh pr create*)`·
`Bash(gh pr merge*)`)를 넣고, `AGENTS.md` 핵심 원칙에 신뢰 경계 한 줄을 더한다.
`src/`는 무변경 — 템플릿과 테스트만 바뀐다.

## 단계
- [x] spec.md 작성 · Ambiguity 게이트 통과(4/4) · Done evidence 선언(`review: required`)
- [x] 실패 테스트 ①: 템플릿 `permissions.ask`가 3개 항목을 갖고, `git push --force*`는 `deny`에 그대로 있다
- [x] 구현 ①: `templates/.claude/settings.json`에 `ask` 배열 추가 → ① green
- [x] 실패 테스트 ②: `planChanges` 병합 — 기존 프로젝트 settings(ask 없음/사용자 ask 있음)에 템플릿 ask가 합집합으로 들어가고 사용자 항목이 보존된다
- [x] 실패 테스트 ③: `AGENTS.md.hbs`의 `principles` 마커 안에 신뢰 경계 줄이 있고, `mergeMarkdown` 재적용 시 기존 프로젝트의 principles 절이 교체된다
- [x] 구현 ②: `templates/AGENTS.md.hbs` 핵심 원칙에 한 줄 추가 + 저장소 루트 `AGENTS.md` 동기화 → ③ 및 `tests/agent-files.test.mjs` 드리프트 테스트 green
- [x] `CHANGELOG.md` `[Unreleased]`에 Added 기록 — ask 계층 도입과 **합집합 병합으로 제거 불가**라는 한계를 함께 적는다
- [x] `npm run docs:check` exit 0 (필요하면 `docs:generate` 후 재확인)
- [x] `npm test` 전체 green
- [x] codex read-only 리뷰 실행 → `settings-ask-tier-artifact.md`의 `## Reviews`에 결과 기록, P1/P2 반영
- [ ] ship — spec·plan·artifact 최종 갱신 후 PR 준비 완료 보고 (PR 생성은 사용자 지시 후)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-09-05 신규: **ask 계층**·**정적 ask 항목**·**신뢰 경계 문장**·**합집합 병합의 비가역성** 정의(spec Ontology).

## 참고
- 계약 정본: `tests/settings-permissions.test.mjs`
- 드리프트 가드: `tests/agent-files.test.mjs` — 템플릿 `principles` 절을 바꾸면 저장소 루트 `AGENTS.md`도 같이 고쳐야 한다
- 선정 근거·비가역성 설명은 spec.md의 `## 설계 / 접근`

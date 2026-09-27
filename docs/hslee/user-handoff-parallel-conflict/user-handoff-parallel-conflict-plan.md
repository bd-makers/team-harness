# user-handoff-parallel-conflict — Plan

## 목표
병렬 PR(D5)끼리 `docs/<user>/<user>-handoff.md` 때문에 충돌하는 일을 구조적으로 없앤다.
권장안 A(같은 경로 유지·추적 해제, 워크트리 로컬 상태로 강등) 기준 초안 — **선택지 결정 전 구현 금지**.

## 단계
- [x] 소비자 전수 조사·충돌 실측 확인(`3323c6f`·`fdcffbc`·`a7c8354`) → spec 기록
- [x] 선택지 A~D 정리·권장안(A) 선정 → spec 기록
- [ ] 오케스트레이터 결정 수령(선택지 + migrate 수행/안내) — spec Ambiguity 게이트 통과 처리
- [ ] 실패 테스트 먼저: 같은 user 두 브랜치가 각자 커밋 후 머지해도 user handoff 충돌이 없음(e2e) · gitignore 목록에 `docs/*/*-handoff.md` 포함 · `task <name>` 활성화가 user handoff를 쓴다
- [ ] `src/harness.mjs` `appendGitignore` `harnessNeeded`에 `DOCS_DIR` 기반 패턴 추가
- [ ] `src/commands/task.mjs` task 활성화 경로에서 `renderUserHandoff` 활성 형태 1회 기록
- [ ] `migrate`: 추적 중인 user handoff 감지 → 결정된 방식(안내 또는 `git rm --cached`)으로 처리
- [ ] `doctor`: 추적 중인 user handoff 경고 1줄
- [ ] 규범 문구 갱신: AGENTS.md·`templates/AGENTS.md.hbs`·`templates/docs/README.md`·`commands/harness-task.md`·`commands/harness-ship.md`·`docs/ao-worker-rules.md` §2·§7·`docs/index.html` 링크
- [ ] golden fixture(`tests/fixtures/task-paths-golden/expected.txt`) 갱신·`npm test`·`npm run docs:check` 통과
- [ ] CHANGELOG `## [Unreleased]` 항목 추가
- [ ] 리뷰(read-only 외부 검증) → artifact `## Reviews` 기록
- [ ] 커밋·PR(지시 시) — 머지 후 기본 브랜치에서 이 레포 사본 추적 해제 커밋(`git rm --cached docs/chad/chad-handoff.md docs/hslee/hslee-handoff.md`)은 종결 커밋과 별도로 사람 승인 후

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-09-27: user handoff = 추적되는 세션 진입점 → (A 채택 시) 워크트리 로컬 렌더링. 정본은 `.harness/active.json`.

## 참고
- 설계·선택지·소비자 조사: `user-handoff-parallel-conflict-spec.md`
- 다이어그램 단계 없음 — AO 워커는 사용자에게 옵트인을 물을 수 없어(ao-worker-rules §5) 추가하지 않았다.

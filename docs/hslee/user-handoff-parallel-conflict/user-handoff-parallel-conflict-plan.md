# user-handoff-parallel-conflict — Plan

## 목표
병렬 PR(D5)끼리 `docs/<user>/<user>-handoff.md` 때문에 충돌하는 일을 구조적으로 없앤다.
선택지 A(같은 경로 유지·추적 해제, 워크트리 로컬 상태로 강등) — 2026-09-27 사용자 결정.

## 단계
- [x] 소비자 전수 조사·충돌 실측 확인(`3323c6f`·`fdcffbc`·`a7c8354`) → spec 기록
- [x] 선택지 A~D 정리·권장안(A) 선정 → spec 기록
- [x] 오케스트레이터 결정 수령(A · migrate 안내만) — spec Ambiguity 게이트 통과 처리
- [x] 실패 테스트 먼저(`tests/user-handoff-untracked.test.mjs` 7케이스 — done 가드·sweep 무시 파일 포함): 같은 user 두 브랜치가 각자 커밋 후 머지해도 user handoff 충돌이 없음(e2e) · gitignore 목록에 `docs/*/*-handoff.md` 포함 · `task <name>` 활성화가 user handoff를 쓴다
- [x] `src/harness.mjs` `appendGitignore` `harnessNeeded`에 `DOCS_DIR` 기반 패턴 추가
- [x] `src/commands/task.mjs` task 활성화 경로에서 `renderUserHandoff` 활성 형태 1회 기록
- [x] `migrate`: 추적 중인 user handoff 감지 → `.gitignore` 줄 보장 + `git rm --cached` 안내(인덱스 무변경)
- [x] `doctor`: 추적 중인 user handoff 경고 1줄
- [x] 규범 문구 갱신: AGENTS.md·`templates/AGENTS.md.hbs`·`templates/docs/README.md`·`commands/harness-task.md`·`commands/harness-ship.md`·`docs/ao-worker-rules.md` §2·§7·`docs/index.html` 링크
- [x] `npm test`·`npm run docs:check` 통과(golden fixture는 변경 불필요, `tests/summary.test.mjs` fixture에 무시 줄 추가)
- [x] CHANGELOG `## [Unreleased]` 항목 추가
- [x] 리뷰(read-only 외부 검증) → artifact `## Reviews` 기록 — codex P2 2건 조치
- [x] 커밋·PR — 이 레포 사본 추적 해제(`git rm --cached docs/chad/chad-handoff.md docs/hslee/hslee-handoff.md`)는 결정 [1]대로 이 PR에 포함

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-09-27: user handoff = 추적되는 세션 진입점 → (A 채택 시) 워크트리 로컬 렌더링. 정본은 `.harness/active.json`.

## 참고
- 설계·선택지·소비자 조사: `user-handoff-parallel-conflict-spec.md`
- 다이어그램 단계 없음 — AO 워커는 사용자에게 옵트인을 물을 수 없어(ao-worker-rules §5) 추가하지 않았다.

# agent-failure-hardening — Plan

## 목표
done 가드·testcritic 루브릭·harness-loop·Bash 훅·AGENTS.md 계약의 빈틈 5개를 최소 변경으로 메우고, 전체 테스트 통과와
release dry-run으로 입증한다. 커밋·push·release 본 실행은 사용자 승인 뒤.

## 단계
- [x] R1 red: `tests/done-guard.test.mjs`에 삭제 시나리오 테스트(소스 변경 + 기존 테스트 삭제 → 차단, 수정→삭제 2커밋 → 차단,
      삭제 + 다른 테스트 추가 → 차단, 테스트 이름 변경 + 소스 → 통과)를 쓰고 수정 전 실패 출력을 artifact에 기록
- [x] R1 green: `task.mjs`에 `foldNameStatus` + 호출부 `--name-status -M --reverse` + 삭제 issue, `node --test tests/done-guard.test.mjs` 통과
- [x] R2: testcritic 3종에 T7·C7·I7 [BLOCKER] 덧붙임(번호 유지 — spec 설계 2 정정), `commands/harness-{unittest,comptest,inttest}.md` 미러 일치, review pin 테스트 통과
- [x] R3: `commands/harness-loop.md` "진전 없음"에 테스트 후퇴 문장, `tests/loop-command.test.mjs` pin 갱신·통과
- [x] R5: `templates/AGENTS.md.hbs`·`AGENTS.md` principles 2줄, `taskSpecTemplate`에 `## 범위 (In / Out)`, 관련 테스트 통과
- [x] R4: `block-dangerous-bash.sh` + settings 새 Bash group + doctor·migrate 목록 + jq-fallback 매트릭스·블록 수·init-smoke 갱신, 해당 테스트 통과
- [x] CHANGELOG `[Unreleased]` 항목(소비자 도달 경로: 훅·settings는 `init`, principles는 `init --yes`) + `git add -A` 뒤 `docs:generate`·`docs:check`
- [x] `npm test` 전체 통과 + `node bin/harness-team.mjs release patch --dry-run`(백그라운드) 결과를 artifact에 기록
- [x] 리뷰: `harness-team review codex`(D6 read-only) → 재현·판별·반영 → artifact `## Reviews`

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-17: "테스트 증거"를 경로 목록에서 창 안 마지막 상태가 삭제가 아닌 경로로 좁힘, "테스트 삭제" 신설.

## 참고
- spec: `agent-failure-hardening-spec.md` (범위 In/Out·설계 1–5)

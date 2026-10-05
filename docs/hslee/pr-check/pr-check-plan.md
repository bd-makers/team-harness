# pr-check — Plan

## 목표
`harness-team pr-check`가 `base...rev`가 건드린 task마다 spec·plan·handoff·artifact(템플릿 아님)를 커밋 기준으로 판정하고(다이어그램은 권장 안내),
init·sync가 설치하는 git pre-push 훅과 ship 준비 보고가 같은 명령을 부른다.

## 단계
- [x] 1. 판정 코어 — `src/commands/pr-check.mjs` `collectPrCheck`: diff 경로 → task 집합(spec 마커) → rev의 git 객체로 4문서 존재·템플릿 비교, 다이어그램은 권장 안내(notes).
      `runPrCheck`: 사람 출력·`--json` envelope·exit 0/1, base는 `resolveScope({scope:'diff'})`. dispatch·`cli-args` 등록. 테스트: 신규 `tests/pr-check.test.mjs`(완료 기준 1–3)
- [x] 2. pre-push 모드 — `--pre-push` stdin 파싱, 삭제·태그·기본 브랜치 건너뜀, 빈 stdin 통과, 실패 시 `--no-verify` 안내. 테스트: 같은 파일(완료 기준 4)
- [x] 3. 훅 설치 — `src/git-hooks.mjs` `installGitHook` 일반화 + `installPrePushHook`(CLI 부재·구버전 fail-open 본문), init·sync 호출, sync 요약 문구.
      테스트: `tests/git-hooks.test.mjs` 추가(기존 post-commit 테스트 무변경) + bare remote 실제 push 실측
- [x] 4. doctor — `checkHookCli` 목록에 `pr-check`. 테스트: `tests/doctor.test.mjs`
- [x] 5. ship 연동 — `commands/harness-ship.md` 보고 전 pr-check 단계(실패면 준비 완료 미선언)·보고 형식 한 줄, `skills/harness-ship/SKILL.md` 한 줄. 테스트: `tests/ship-command.test.mjs` pin
- [x] 6. 문서 — README pr-check 절(pre-push·ship·CI), D11·`docs/harness-cycle.md` 다이어그램 권장 정정, `docs:check`, spec 갱신
- [x] 7. 검증 — `npm run test`·`npm run docs:check` PASS, 임시 저장소 실측(차단·`--no-verify`·기본 브랜치 push 통과) artifact 기록
- [x] 8. 리뷰 — codex(`review --scope worktree`, 미커밋 상태) + 새 컨텍스트 리뷰, 결과 artifact `## Reviews`
- [x] 9. 커밋·PR — #125

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-06: PR 다이어그램은 권장 — pr-check는 막지 않고 안내만 낸다(spec R2-3). D11·cycle 문서 정정.

## 참고
- spec: `pr-check-spec.md` (R1–R9, 설계 6). 기준: `docs/harness-cycle.md` §4-6.
- 템플릿 훅(`templates/.claude/hooks/*`)은 바꾸지 않는다 — sha 완결성 테스트 영향 없음.

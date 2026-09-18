# default-branch-primitive — Plan

## 목표

`origin/HEAD` 읽기 세 벌을 `readOriginHead` 하나로 모은다. **폴백 정책은 그대로 두고, 동작은
표준 `origin/HEAD → refs/remotes/origin/<branch>` 경로에 한해 그대로 둔다.**
비표준 `refs/heads/<branch>` 지시는 의도적으로 바뀐다 — 근거는 spec의 "기대 결과" 절.

## 단계

- [x] baseline 기록 — `npm test` 925개 중 924 pass (변경 전)
- [x] `src/git-default-branch.mjs` 신규 — `readOriginHead(exec)`. 폴백·실행 정책 없음, 읽기와 파싱만
- [x] `remote-task.mjs` `resolveDefaultRef` 교체 — `origin/main` 검증 폴백 유지
- [x] `summary.mjs` `defaultBranchCandidates` 교체 — `['main','master']` 폴백 유지
- [x] `summary.mjs` `isSyncedWithDefault` 교체 — 무폴백·fail-closed·스펠링 가드 유지
- [x] `tests/git-default-branch.test.mjs` 신규 — 있음/없음/슬래시 이름/dangling/로컬 ref 지시/git 아님/exec 주입/비-origin 응답
- [x] 회귀 증명 — 기존 테스트 **무수정** 925개 통과 + `git diff --stat tests/` 에 신규 파일만
- [x] 비-`main` 기본 브랜치 저장소 대조 — origin/HEAD=develop / origin/HEAD 삭제 두 상태에서 세 함수 답 확인
- [x] `npm run docs:generate` (stage 후) + `npm test` 전체 — 933개 중 932 pass, docs:check 최신
- [x] 리뷰 — `harness-team review codex` (1회차 P2: 비표준 origin/HEAD 동작 변화 — 새 동작 유지·주장 정정·테스트 고정)

## Ontology 변경 로그

- **읽기와 폴백을 분리**했다. 지금까지 "기본 브랜치 판정"이 한 덩어리로 불렸지만, `origin/HEAD` 읽기는
  하나의 답이고 폴백은 호출자마다 다른 정책이다. 프리미티브는 읽기만 소유한다.

## 참고

- 계획 원문: `/Users/hsonpro/.claude/plans/compressed-beaming-fern.md`
- 다이어그램: 옵트아웃 (2026-09-18 — 같은 성격의 변경에 연속 3번째, 묻지 않았다)

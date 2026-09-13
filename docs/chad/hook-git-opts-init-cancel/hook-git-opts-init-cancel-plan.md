# hook-git-opts-init-cancel — Plan

## 목표
Codex 분석이 재현한 P2 두 건(커밋 훅 git 전역 옵션 우회, init 취소 후 config 잔존)을 회귀 테스트와 함께 고친다.

## 단계
- [x] 훅 회귀 테스트 추가 — `tests/hooks-jq-fallback.test.mjs`에 `git -C . commit`·`git --no-pager commit`이 게이트에 도달하고, `git status`·`git log | grep commit`은 관여하지 않음 (양 모드) — 실패 확인
- [x] `pre-commit-check.sh` 판정을 `block-dangerous-git.sh`의 `GIT`/`END` 정규식으로 교체 — 테스트 통과
- [x] 직전 stock 판을 `tests/fixtures/stock-hooks/pre-git-opts/pre-commit-check.sh`로 보존하고 `KNOWN_STOCK_HOOK_SHA256`·fixture README 갱신 — 드리프트 가드 통과
- [x] `resolveUsername`/`saveUsername` 단위 테스트 추가 — resolve는 `.harness/config.json`을 만들지 않고, save가 만든다; 기존 user가 있으면 null — 실패 확인
- [x] `user-config.mjs` 분리 + `init.mjs`에서 resolve(계획)·save(적용 직후) 배선 — `ensureUsername`·`sync` 불변
- [x] `npm test` 전체 통과 + 임시 디렉터리에서 init 취소 재현(수동 1회) — config 미생성 확인
- [x] `harness-team review codex` 실행·artifact Reviews 기록
- [x] artifact 갱신 → `harness-team done`

## Ontology 변경 로그
- 2026-09-13: init의 사용자명 저장을 "계획"에서 "적용" 단계로 이동 — spec Ontology의 계획/적용 정의 참조.

## 참고
- Codex 분석 원문: `.lavish/team-harness-analysis-2026-09-13.html` §04 P2 두 건

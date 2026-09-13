# dangerous-git-end-boundary — Plan

## 목표
`block-dangerous-git.sh`의 토큰 경계를 "비단어 문자 전부"로 바꿔 `git push --force;echo` 류 셸 연산자 우회를 막는다.

## 단계
- [x] 회귀 테스트 추가 — `GIT_BLOCK`에 셸 연산자·리다이렉트·`bash -c` 케이스 5건 — 실패 확인
- [x] 직전 stock 판을 `tests/fixtures/stock-hooks/pre-end-boundary/`에 보존, sha 테이블·README·드리프트 가드 개수 갱신
- [ ] `END='([^[:alnum:]_-]|$)'` 교체 + 주석 — 차단·허용 테스트 양 모드 통과
- [x] `docs:generate` + `npm test` 전체 통과
- [ ] `harness-team review codex --scope diff --base task/hook-git-opts-init-cancel` 실행·판별 기록
- [ ] artifact 갱신 → `harness-team done`

## Ontology 변경 로그
- 2026-09-13: 토큰 경계(END)를 열거형에서 "비단어 문자 전부"로 재정의 — spec Ontology 참조.

## 참고
- PR #89 위 스택 브랜치 `task/dangerous-git-end-boundary`

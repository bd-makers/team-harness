# task-ledger-derived — Plan

## 목표

`task`/`done`의 공유 원장 쓰기를 제거하고, 원장을 task 디렉터리에서 렌더링하는 생성물로 전환한다.

## 단계
- [x] `<name>-meta.json` 생성/갱신을 `runTask`·`runDone`에 추가
- [x] `renderSummary` / `renderUserIndex` 구현 (결정론적 정렬, 과거 task fallback 포함)
- [x] `harness-team summary [--write|--check]` 신설 + `--write` 기본 브랜치 가드
- [x] `task`/`done`에서 원장 쓰기 3개 호출 제거
- [x] `migrate`에 원장 → meta.json 백필 경로 추가 (created + done 상태)
- [x] 템플릿·문서 갱신 (`templates/docs/README.md`, 하네스 AGENTS.md/CLAUDE.md, harness-task skill)
- [x] 테스트 추가 (병렬 브랜치 충돌 0 회귀, 렌더 결정론, 백필)
- [x] `npm run docs:generate` → `npm test` 전체 통과
- [ ] 외부 리뷰(codex read-only) → 지적 반영 → artifact 기록
- [ ] release 0.15.2 → 0.16.0 (동작 변경이므로 minor)

## Ontology 변경 로그

- 2026-08-19: `원장 = 생성물` 로 성격 재정의. task 디렉터리가 정본이고 집계 파일은 파생.
- 2026-08-19: `<name>-meta.json` 도입 — 4파일 SSOT 계약 밖의 **harness 내부 상태** 파일.

## 참고
- 대상: `~/.claude/plugins/marketplaces/harness-aijient-team-marketplace`

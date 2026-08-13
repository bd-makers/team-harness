# codex-hooks-template — Plan

## 목표

`apply`/`init`이 `.codex/hooks.json`을 설치해 Codex 세션도 SessionStart task context를 받게 하고,
README 강제력 표를 Codex CLI 0.147.0 실측으로 정정한다.

## 단계
- [x] `templates/.codex/hooks.json` 신설 — SessionStart → `harness-team session-context`
- [x] `src/harness.mjs:copyStaticAssets`에 `.codex/` 복사 추가 (skipExisting)
- [x] `src/commands/doctor.mjs`에 `.codex/hooks.json` optional 항목 추가
- [x] `README.md` 강제력 표 Codex 행 정정 + 근거 각주
- [x] `tests/e2e/apply-smoke.test.mjs` EXPECTED_PATHS에 `.codex/hooks.json` 추가
- [x] `npm test` 전량 통과 확인 (218 pass / 0 fail + perf 1 pass)
- [x] CHANGELOG `[Unreleased]` 기록
- [x] Codex 외부 리뷰 실행 → 발견 4건 검증(오탐 0) → artifact `## Reviews` 기록
- [x] 리뷰 조치: skipExisting → JSON deep-merge 전환 + 회귀 테스트 8건 (`tests/codex-hooks.test.mjs`)
- [x] 리뷰 조치: doctor가 JSON 유효성만이 아니라 harness 훅 존재까지 검사 (`checkCodexSessionHook`)
- [x] 리뷰 조치: 훅이 `git rev-parse --show-toplevel`로 저장소 루트 해석
- [x] 리뷰 조치: README에 Codex 훅 신뢰 승인 절차 + 훅 개수 정정
- [x] 자체 발견: `.codex`를 backup/clone/symlink/delete/upgrade item 목록 8곳 + gitignore에 추가
- [x] lifecycle 실검증: apply → backup(symlink 전환) → delete 전 구간

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-08-12: **강제력 비대칭** 재정의 — "Codex hooks 0"은 구조적 한계가 아니라 템플릿 누락이었다.
  훅은 Claude Code 전용 메커니즘이 아니며, Codex CLI 0.147.0도 프로젝트 로컬 훅을 지원한다.

## 참고
- 근거: `~/.codex/config.toml` `[hooks.state]`에 이 저장소 `.codex/hooks.json`이 session_start로 신뢰 등록됨.

# harness-unittest — Plan

## 목표

Khorikov 원칙 기반 단위테스트 작성 커맨드 `/harness-unittest`를 플러그인에 기본 장착.
산출물 5종(커맨드 계약·Codex 래퍼·manifest 등록·README·통과 CI) + 4-파일 동기화 무결성 유지.

## 단계
- [x] 기존 계약 2개(interview·retro) + 래퍼 1개(contrarian) + `manifest-sync.test.mjs` + README 표 읽고 규약 확정
- [x] 웹 검색으로 2026 도구 기준 확인 (web/lib → Vitest+TL, RN → Jest+@testing-library/react-native)
- [x] spec.md Ambiguity 자가진단 4/4 통과 (게이트 통과)
- [x] `commands/harness-unittest.md` 작성 — 0~6단계 + 종료조건, Khorikov를 금지/허용 규칙으로 표현
- [x] `skills/harness-unittest/SKILL.md` + `agents/openai.yaml` 작성 (Codex 래퍼 규약 준수)
- [x] `.claude-plugin/plugin.json` commands 등록 + README 커맨드 표 행 추가
- [x] CHANGELOG 항목 기록 + `docs/harness-overview.html` 커맨드 행·카운트·버전 갱신
- [x] `npm run test:unit` 통과 확인 (124 pass / 0 fail, manifest-sync 8 invariant green)
- [x] release 0.11.0 (4 매니페스트 bump, `--skip-cache`) + 커밋 `33da491` + `git push` + tag `v0.11.0`

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록.*

- harness-unittest = **에이전트 워크플로우 커맨드**(persona 계열)로 확정 — `harness-team` CLI 서브커맨드가 아님. 따라서 bin-router invariant 대상에서 제외.

## 참고
- spec.md 참조 섹션 참고 (본: harness-contrarian/interview, 게이트: manifest-sync.test.mjs).

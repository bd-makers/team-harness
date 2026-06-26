# e2e-apply-verification — Plan

## 목표
3스택(bare-node/next/react-native) 매트릭스로 L1~L3 자동 E2E를 `tests/e2e/`에 추가하고,
`npm test`에서 함께 돌게 한다. 각 스택에서 doctor green + 산출물/훅/SSOT 단언이 모두 통과.

## 단계
- [x] `tests/e2e/sandbox.mjs` — ephemeral sandbox 생성기 (mkdtemp + git init + 스택 시그니처 + harness-team PATH 심링크 + cli() spawn 헬퍼 + cleanup)
- [x] `tests/e2e/apply-smoke.test.mjs` — L1: 3스택 apply → 산출물 전수 존재 + detect-stack 인식 + `doctor` exit 0
- [x] `tests/e2e/lifecycle.test.mjs` — L2: task 생성→4파일→git commit→post-commit handoff 갱신→done→active.json 정리
- [x] `tests/e2e/ssot-consistency.test.mjs` — L3: AGENTS.md 마커 SSOT + CLAUDE/GEMINI @AGENTS.md import + cursor/opencode 코어 일관성
- [x] `package.json` test 스크립트가 `tests/e2e/*.test.mjs`도 포함하도록 갱신 (`test:unit` / `test:e2e` 분리 추가)
- [x] 전체 `npm test` green 확인 (104 pass) → artifact.md에 결과 기록

## Ontology 변경 로그
- (none)

## 참고
- spec.md 인벤토리 섹션 참조

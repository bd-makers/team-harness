# stack-detection-cli — Plan

## 목표

테스트 3형제 커맨드의 0단계에서 **판단이 없는 부분**(package.json 의존성 조회)을
`harness-team stack` 서브커맨드로 내리고, 세 문서를 CLI 호출 한 줄로 바꾼다.

## 단계

- [x] `src/detect-testing.mjs` 신규 — `detectTesting(dir)`. `src/fsx.mjs`의 `exists` 재사용, `detect-stack.mjs`는 불변
- [x] `src/commands/stack.mjs` 신규 — `runStack(ctx)`. `resolveStack` + `detectTesting` 합성, text 요약 + `--json` envelope
- [x] 배선 — `src/cli-args.mjs`의 `COMMANDS`·`OPTIONS_HELP`, `bin/harness-team.mjs`의 import·`case 'stack'`
- [x] `tests/detect-testing.test.mjs` 신규 — vitest+RTL+msw / jest+RN(jest-expo) / fastify+prisma+nock / 러너 없음 / package.json 없음
- [x] `tests/cli-args.test.mjs:195` 정정 — `--json` 지원 목록 pin에 `stack` 반영
- [x] `commands/harness-unittest.md` 0단계 교체 + 예외 참조 `§5` → `§4` 정정 (스냅샷 정책은 §4에 있다 — 드리프트는 comptest가 아니라 unittest 쪽이었다)
- [x] `commands/harness-comptest.md` 0단계 교체 + 밀린 단계 번호 정정
- [x] `commands/harness-inttest.md` 0단계 교체 — Docker 분기는 산문 유지
- [x] `npm run docs:generate` — 표는 `git ls-files` 기반이라 **stage 후에** 돌려야 신규 파일이 등재된다
- [x] 검증 — `npm test` 전체 + 실제 소비자 프로젝트(RN 계열)에 `--target` 걸어 감지 결과 대조
- [x] 리뷰 — `harness-team review codex` 5회 (P2 7건 전부 진짜 결함으로 판별·수정, 5회차 Approve로 수렴)

## Ontology 변경 로그

- **testing profile** 신설 — `detect-stack.mjs`의 **stack profile**(템플릿 렌더용)과 분리된 개념.
  소비자가 다르다: stack profile은 `init`/`migrate`가 AGENTS.md에 렌더하고, testing profile은 에이전트만 읽는다.

## 참고

- 계획 원문: `/Users/hsonpro/.claude/plans/compressed-beaming-fern.md`
- 다이어그램: 옵트아웃 (2026-09-17, 사용자 선택 — 변경이 선형이라 드러낼 숨은 구조가 적음)

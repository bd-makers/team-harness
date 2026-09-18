# scope-resolve-cli — Plan

## 목표

`resolveScope`가 `origin/HEAD`를 보게 고치고(실제 결함), 그 판정을 `harness-team scope`로 노출해
`/harness-ship` 2단계가 사다리를 손으로 실행하지 않게 한다.

## 단계

- [x] 회귀 테스트 먼저 — `tests/scope-command.test.mjs` 신규. master 기본 브랜치 fixture에서 실패하는 것을 확인
- [x] `src/commands/review.mjs` — 하드코딩 폴백을 `resolveDefaultRef` 호출로 교체 (판정 복제 없음)
- [x] `src/commands/scope.mjs` 신규 — `runScope(ctx)`. 정상·empty(warning)·error(packet, exit 1) 세 경로 + `SCOPES` 오타 가드(codex P2)
- [x] 배선 — `src/cli-args.mjs`의 `COMMANDS`·`OPTIONS_HELP`, `bin/harness-team.mjs`의 import·`case 'scope'`
- [x] `tests/cli-args.test.mjs` `--json` 목록 pin 갱신
- [x] `commands/harness-ship.md` 2단계 + 예시 블록 교체 + 7단계가 2번의 scope를 그대로 넘기도록 정정(codex P1)
- [x] `commands/harness-review.md` 2단계 — 정본이므로 지우지 않고 새 규칙으로 갱신
- [x] `skills/harness-team/SKILL.md` Common commands 한 줄
- [x] `npm run docs:generate` (stage 후) + `npm test` 전체 — 921개 중 920 pass, docs:check 최신
- [x] 기본 브랜치가 main이 아닌 저장소에서 실제 판정 변화 눈으로 대조 — develop + 낡은 로컬 main fixture로 조용한 오진 시나리오 재현
- [x] 리뷰 — `harness-team review codex` (1회차 P1·P2 수정, 2회차 코드 clean·문서 정합 지적 반영)

## Ontology 변경 로그

- **base ref**의 정의가 바뀌었다 — "없으면 `origin/main`"에서 "없으면 **원격 기본 브랜치**(`origin/HEAD`)"로.
  `origin/main`은 이제 그 판정의 폴백일 뿐 규칙이 아니다. 정본 산문(review.md 2단계)도 같이 갱신했다.

## 참고

- 계획 원문: `/Users/hsonpro/.claude/plans/compressed-beaming-fern.md`
- 다이어그램: 옵트아웃 (2026-09-17 — 직전 task와 같은 성격의 변경이라 묻지 않았다)

# codex-l5-sim-plan — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- 2026-07-08 Codex L5 시뮬레이션 구현 계획을 작성했다.
- 핵심 결정:
  - 기존 Claude L5 runner는 유지한다.
  - Codex L5는 `tests/sim/codex-agentloop.mjs`로 분리한다.
  - Codex L5의 실행 엔진은 `codex exec --json`이다.
  - Codex L5의 transcript/evidence는 JSONL event stream, file/git state, hook output으로 구성한다.
  - Claude-only 신호(SessionStart slash/hook)는 Codex L5에서 FAIL이 아니라 `N/A`로 다룬다.
- 산출 문서:
  - `codex-l5-sim-plan-spec.md`
  - `codex-l5-sim-plan-plan.md`
- 2026-07-08 Codex L5 구현을 완료했다.
  - 신규 runner: `tests/sim/codex-agentloop.mjs`
  - 신규 parser test: `tests/codex-agentloop-parser.test.mjs`
  - 신규 skill: `skills/harness-codex-sim/SKILL.md`
  - README Codex 플러그인 섹션에 probe/run 운용법 추가.
- 2026-07-09 Claude plugin과 Codex plugin의 차이 및 L5 시뮬레이션 테스트 비교 HTML을 추가했다.
  - HTML: `docs/chad/codex-l5-sim-plan/claude-vs-codex-l5-sim.html`
  - 기준: `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `commands/`, `skills/`, `tests/sim/agentloop.mjs`, `tests/sim/codex-agentloop.mjs`, 두 최종 sim report.
- 최종 Codex full run:
  - 리포트: `/Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-playground/sim-reports/codex-agentloop-2026-07-08T1932.md`
  - 스냅샷: `/Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-playground/sim-snapshots/codex/0.10.0/node-explicit-apply`
  - 집계: `PASS 39 · FAIL 0 · MANUAL 1 · N/A 1`
  - MANUAL: PreToolUse protect-files는 Codex headless에서 안정 관찰 불가.
  - N/A: Claude SessionStart nudge는 Claude-only 신호.
- 격리 검증:
  - `workspace-write` full run에서 `.git/hooks/post-commit` 설치가 막혀 SC4가 실패했다.
  - 동일 sandbox에서 직접 CLI와 `codex exec --sandbox danger-full-access`를 비교해 hook 설치/실행이 통과함을 확인했다.
  - 결론: harness 본체 결함이 아니라 Codex sandbox 정책으로 인한 sim/runtime artifact. full run은 throwaway `.sim-tmp` 안에서만 `danger-full-access`를 사용하도록 확정했다.
- 검증:
  - `node tests/sim/codex-agentloop.mjs probe` 통과.
  - `node tests/sim/codex-agentloop.mjs run` 통과.
  - `node tests/sim/agentloop.mjs probe` 회귀 통과.
  - `npm test` 통과: 132 tests.
  - `skills/harness-codex-sim` quick validator는 로컬 Python에 `yaml` 모듈이 없어 실행 불가. 대신 frontmatter 수동 확인과 `npm test`의 manifest/skill 검증으로 대체했다.


## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*


## Learnings
- Codex plugin support 검증은 Claude slash-command 시뮬레이션과 분리해야 PASS의 의미가 명확하다.
- Codex headless는 `codex exec --json` 이벤트 스트림을 transcript처럼 취급하는 것이 가장 자연스럽다.
- plugin 설치 여부보다 실제 skill-trigger 결과 파일을 보는 functional availability가 더 강한 신호다.
- Codex `workspace-write`는 `.git/hooks` 쓰기를 막으므로 post-commit hook 설치 검증에는 부적합하다. 이 검증은 throwaway sandbox에서 `danger-full-access`로만 수행한다.

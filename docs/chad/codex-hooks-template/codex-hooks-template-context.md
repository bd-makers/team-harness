# codex-hooks-template — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `apply`/`init`이 `.codex/hooks.json`을 설치해 Codex 세션도 SessionStart task context를 받게 하고, README 강제력 표를 실측으로 정정한다.
- Current atomic step: plan 전 항목 완료. Codex 리뷰 4건 조치 + 기록 완료. **커밋 승인 대기.**
- Stop / human-decision condition: 커밋·`task done`은 사용자 승인 후.

## Constraints and settled decisions
- 훅 커맨드는 Claude 쪽과 동일 계약: `harness-team session-context 2>/dev/null || true` (PATH의 CLI, 플러그인 소스 경로 비의존).
- 이벤트 이름은 PascalCase `SessionStart` — 이 저장소 기존 `.codex/hooks.json`이 그 표기로 Codex에 신뢰 등록됨.
- 이 저장소 자신의 `.codex/hooks.json`은 plugin-dev 전용(`node bin/harness-team.mjs`)이라 불변.
- 사용자 훅 보존 위해 `copyTree(..., { skipExisting: true })`.
- 다른 저장소 13곳 템플릿 갱신은 사용자 지시로 **보류**(이번 task 범위 밖).

## JIT retrieval map
- Identifiers / symbols: `copyStaticAssets`, `CHECKS`, `REQUIRED_PATHS`, `session-context`
- Narrow globs: `src/harness.mjs`, `src/commands/doctor.mjs`, `templates/.codex/*`, `tests/e2e/apply-smoke.test.mjs`
- Read next: 리뷰 출력 → `docs/chad/codex-hooks-template/codex-hooks-template-artifact.md` `## Reviews`
- Verification command: `npm test` (218 pass 기준), `npm run docs:check`

## Failure capsules (max 3 unresolved)
### F-001
- Signal: Codex 훅이 실제 **실행**되어 컨텍스트가 주입되는지 미확인.
- Tried: 임시 디렉터리에 마커 훅을 두고 `codex exec --sandbox read-only --dangerously-bypass-hook-trust` 실행 시도.
- Compact finding / current hypothesis: 샌드박스 정책이 해당 호출을 차단. 확인된 범위는 "Codex가 프로젝트 로컬 `.codex/hooks.json`을 발견해 신뢰 등록한다"까지(`~/.codex/config.toml` `[hooks.state]` trusted_hash).
- Next discriminator: 대화형 Codex 세션에서 하네스 적용 프로젝트를 열고 훅 신뢰를 수락한 뒤 task context 주입 여부를 눈으로 확인.
- Source (safe path or command): `~/.codex/config.toml` `[hooks.state]` 섹션, `codex --help | grep hook`

## Resume checklist
- 남은 것은 커밋 + `harness-team done` 뿐. 검증은 끝났다 — 이 task 범위 226 pass / docs:check 최신 / doctor green.
- **워킹 트리에 다른 세션의 in-flight 작업이 섞여 있다.** `tests/cursor-rules-mirror.test.mjs`는 `src/harness.mjs`에서 롤백된 `splitRulePaths`를 import해 현재 실패한다(고아 테스트). 이 task와 무관하니 건드리지 말고, 커밋 시 이 task 파일만 선택할 것. `tests/e2e/ssot-consistency.test.mjs` 변경도 같은 세션 것(diff 전 hunk가 cursor rules — 확인 완료).
- gemini CLI 미설치라 병렬 리뷰 미실행 — 리뷰 기록에 명기됨.

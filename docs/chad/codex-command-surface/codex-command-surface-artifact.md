# codex-command-surface — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 2026-07-09 진단 결과:
  - Claude Code 플러그인은 `.claude-plugin/plugin.json`의 `commands[]`로 `commands/harness-*.md` 16개를 노출한다.
  - Codex 플러그인은 `.codex-plugin/plugin.json`에서 `skills: "./skills/"`만 노출한다. Codex 플러그인 manifest에는 Claude식 `commands[]` 표면이 없다.
  - Codex manual 기준으로 플러그인은 skills/apps/MCP 서버를 bundle한다. Codex app composer의 `/` 메뉴는 built-in slash commands와 enabled skills를 보여주며, 명시 skill 호출은 `$`를 사용한다.
  - 현재 소스에는 `skills/harness-team`, `skills/harness-sim`, `skills/harness-codex-sim` 3개가 있다.
  - 현재 설치 캐시 `~/.codex/plugins/cache/personal/harness-aijient-team/0.10.0/skills`에는 `harness-team`, `harness-sim` 2개만 있다. 따라서 지금 Codex에서 2개만 보이는 것은 설치 캐시가 `harness-codex-sim` 추가 이전 스냅샷인 영향도 있다.
- 결론:
  - Claude의 `/harness-*` 목록이 Codex에 그대로 안 보이는 것은 결함이 아니라 플랫폼 표면 차이다.
  - Codex에서 같은 기능을 호출하려면 `$harness-aijient-team:harness-team`을 진입점으로 쓰고, 세부 작업은 자연어 또는 CLI 명령(`node bin/harness-team.mjs <command>`)으로 지시한다.
  - `harness-codex-sim`까지 보이게 하려면 플러그인 재설치/캐시버스터 후 새 thread에서 확인해야 한다.
  - Codex UI에도 Claude처럼 세부 항목을 나열하고 싶으면 `skills/harness-apply`, `skills/harness-doctor` 같은 얇은 skill wrapper를 별도로 추가하는 설계가 필요하다.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*


## Learnings

- Codex custom prompts는 slash command 형태를 만들 수 있지만 deprecated이며 로컬 Codex home 기반이라 플러그인 배포 표면으로 쓰기에는 부적합하다.
- Codex에서 재사용 가능한 배포 표면은 command mirror보다 skill wrapper가 더 맞다.

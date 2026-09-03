# stock-hooks fixtures

과거에 배포된 `templates/.claude/hooks/*.sh`의 **바이트 정확 사본**.
`src/commands/migrate.mjs`의 `KNOWN_STOCK_HOOK_SHA256` 테이블(설치 훅 refresh 판별)과
`tests/migrate-hooks.test.mjs`가 대조한다 — 수정하지 말 것.

| 디렉터리 | git blob | 출처 커밋 |
|---|---|---|
| `older/block-dangerous-git.sh` | `9198ed24` | `c12adc5a` 2026-07-02 도입판 |
| `older/pre-commit-check.sh` | `813a2212` | `6948aa73` initial (pnpm 하드코딩판) |
| `pre-jq-fallback/block-dangerous-git.sh` | `8367653a` | `2379051b` 상류 출처 표기판 |
| `pre-jq-fallback/protect-files.sh` | `286e227e` | `6948aa73` initial |
| `pre-jq-fallback/pre-commit-check.sh` | `d4662b9b` | `2099f693` detect_pm판 |
| `pre-jq-fallback/auto-format.sh` | `58c4fe2e` | `6948aa73` initial |
| `jq-fallback-v1/*` | `e1c87ee4`·`75858c28`·`d2132caf`·`775c0d56` | `9140358e` PR #29 (tool_input 스코프 이전) |

`older`/`pre-jq-fallback`은 `harness:jq-fallback` 마커가 없어 jq 부재 시 fail-open,
`jq-fallback-v1`은 마커는 있으나 `json_input_field`(tool_input 스코프) 이전 판이다.
| `pre-audit-cleanup/block-dangerous-git.sh` | `599cd2d4` | tool_input 스코프판 (`-C`·`-fu`·`+refspec` 우회 이전) |
| `pre-audit-cleanup/protect-files.sh` | `bf6c4f6e` | substring 패턴판 (`.envrc`·`android/builder.ts` 오탐) |
| `pre-audit-cleanup/boundary-checkpoint.sh` | `63c8862f` | 도입판 (CLI 부재 시 exit 127) |
| `pre-audit-cleanup/observe-tools.mjs` | `7bc95dd0` | 도입판 (`URL.pathname` 비교 — 공백 경로에서 no-op) |

`pre-audit-cleanup`은 2026-09-03 점검(audit-cleanup) 직전 판이다. `.mjs`도 같은 sha 규칙으로 refresh한다.

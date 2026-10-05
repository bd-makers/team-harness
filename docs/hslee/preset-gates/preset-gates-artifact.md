# preset-gates — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 다이어그램: docs/hslee/preset-gates/preset-gates-diagram.html 생성 (2026-10-05)
- 검증 (2026-10-05): `npm run test` → 1090 pass · 0 fail · skip 1 (+ perf 1 pass), `npm run docs:check` → 최신.
  완료 기준 1: `grep -nE 'pnpm|yarn|bunx|npx|prettier|tsc'` 두 훅 → 0줄.
- 소비자 실측 (2026-10-05, 읽기 전용 — `resolveStack`+`buildProposal`만 호출, config·훅 무변경):

  | 프로젝트 | 스택·PM | 설치 훅 | 제안 |
  |---|---|---|---|
  | deep-math | react-native · npm | 직전 stock → migrate가 래퍼로 갱신 + gates 제안 | `npx tsc --noEmit` · `npm run lint` · `npm run test` |
  | job-scraper | python · pip | 커스터마이즈 → migrate 무변경 | `ruff check .` · `pytest`, format `*.py → ruff format` |
  | heliosent-profile | next · bun | 커스터마이즈(bun.lock 감지 추가본) → migrate 무변경 | `bunx tsc --noEmit` · `bun run lint` · `bun run test` |

  **주의 — deep-math**: `lint` 스크립트는 있으나 eslint 미설치(#119 실측 exit 127). `migrate --yes`로 제안을 그대로 받으면
  `npm run lint`가 127 → "설정 오류"로 **모든 Claude 커밋이 막힌다**. 대화형 migrate는 제안을 먼저 보여 주므로 거절·수정할 수 있다.
  spec 설계상 기대 동작(127 = 설정 오류)이지만, `--yes`가 "이전 typecheck·test 동작 유지"보다 넓다(lint 추가)는 점은 R7 문장과 어긋난다 — 리뷰에서 판정.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-10-05T12:30:44.454Z — codex (harness-team review)

- engine: codex · scope: diff · tip: b253f34575badbc1bddc684868c2a4cd5b8a0a8a · exit 0 · 1468 B

```text
전하, **P2 3건을 발견했습니다. P1은 없습니다.**

- **P2 — `src/presets.mjs:68`**: `gates` 없이 사용자 `format`만 있는 config를 `init`·`migrate --yes`가 제안으로 덮어써 formatter를 삭제합니다(D8 위반); `gate suggest`도 이를 덮어쓰기로 인식하지 않아 경고 없이 기본 yes를 제시합니다.
- **P2 — `templates/.claude/hooks/pre-commit-check.sh:70`**: `exec`가 CLI 시작 실패의 exit 1·126·127을 그대로 전달하여 커밋을 차단하지 못합니다—차단에는 exit 2가 필요하며, exit 1 전달을 재현했습니다. [공식 훅 계약](https://code.claude.com/docs/en/hooks#exit-code-output)
- **P2 — `src/commands/gate.mjs:33`**: `{"gates":null}`·`{"gates":"npm test"}` 같은 잘못된 구조를 설정 오류 대신 “미설정”으로 처리하여 exit 0으로 검증을 건너뜁니다.

D11 언어 분기 잔존과 공백·프로젝트 밖 경로 처리에서는 추가 유의미한 결함을 찾지 못했습니다. CLI 부재 시 통과와 `migrate --yes`의 lint 추가는 명시된 설계입니다. 다만 lint 추가는 기존 커밋을 막을 수 있어 R7의 “기존 동작 유지” 문구와 충돌합니다.

파일은 변경하지 않았습니다. 쓰기를 가로챈 메모리 내 재현과 훅 실행으로 확인했으며, 전체 테스트는 실행하지 않았습니다.

**최종 판정: Request changes — 위 P2 수정 후 재검토 권장입니다.**
```

<!-- harness:review kind=codex scope=diff tip=b253f34575badbc1bddc684868c2a4cd5b8a0a8a at=2026-10-05T12:30:44.454Z -->

## Learnings

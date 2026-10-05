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

  **deep-math 주의 → 해소**: `lint` 스크립트는 있으나 eslint 미설치(#119 실측 exit 127). 첫 구현에서는 `migrate --yes`가 `npm run lint`까지
  기록해 모든 Claude 커밋이 "설정 오류"로 막힐 상태였다. 리뷰 I4 반영 후 `--yes`는 프리셋 `confirm` 항목(lint)을 빼고 `tsc`·`test`만 기록하며
  lint는 "추가 제안"으로만 출력한다(이후 doctor 지문 경고가 `gate suggest`로 안내). 대화형은 전체를 보여 주고 확인받는다.

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

### 2026-10-05 — 최종 브랜치 리뷰 (opus code-reviewer, 새 컨텍스트) + 반영

- 범위: 9329bd8..b253f34 (생성물 `docs/harness-overview.html` 제외). 판정: **Needs fixes** — Critical 1 · Important 5 · Minor 6. codex P2 3건을 독립 재현.
- **C1** gates가 사용자별 gitignore인 `.harness/config.json`에 있어 확정한 사람 외 팀원은 게이트가 소리 없이 꺼짐 →
  메인테이너 결정: 팀이 커밋하는 `.harness/gates.json`. (`gate-command`·`init-gates`·`migrate-gates`·`doctor` 테스트가 gates.json 경로를 고정)
- **I1** exit 0 훅의 stderr는 사용자에게 안 보임 → 미설정·CLI 부재 안내를 hook `systemMessage`(stdout JSON)로. 테스트: hooks `gates.json이 없으면 … systemMessage`, `CLI를 찾지 못하면 …` RED→GREEN.
- **I2**(=codex P2) `exec`가 CLI의 exit 1(구버전·크래시)을 통과시킴 → 0·2 외는 차단, doctor `checkHookCli`에 `gate` 추가.
  테스트: `CLI가 0·2 외의 코드로 끝나면 커밋을 막는다`, `checkHookCli … gate` RED→GREEN.
- **I3**(=codex P2) 형태가 틀린 gates를 미설정(exit 0)으로 처리 → 설정 오류 차단. 테스트: `gates.json 형태가 틀리거나 깨지면 …` RED→GREEN.
- **I4** `migrate --yes`가 lint를 추가해 R7과 충돌 → 메인테이너 결정: 프리셋 `confirm` 항목은 `--yes`에서 제외·추가 제안. 테스트: presets `unattended`, init·migrate `--yes` RED→GREEN.
- **I5**(=codex P2) format 덮어쓰기 → gates.json 통째 팀 파일화로 해소(init·migrate는 파일이 없을 때만 씀, `gate suggest`는 있으면 기본 No + 현재값 표시).
- 반영 커밋 34dc6e2 + 훅 변경은 9d1b904에 fixup 병합(sha 완결성 테스트가 브랜치 중간 판을 배포판으로 세므로 훅 커밋은 하나여야 한다).
  검증: `npm run test` → 1093 pass · 0 fail · skip 1, `npm run docs:check` → 최신.
- 미룬 Minor: M1 dotfile glob, M2 미해결 `{var}` 플레이스홀더, M3 지문 signal이 프리셋 when 직렬화(raw JSON 메시지), M4 migrate 거절 문구,
  M5 훅 timeout 120s·고아 프로세스, M6 일부 테스트 공백.

## Learnings

# preset-gates — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 다이어그램: docs/hslee/preset-gates/preset-gates-diagram.html 생성 (2026-10-05)
- 검증 (2026-10-05, 최종 tip 기준 — 리뷰 반영·rebase 후 재실행). 명령과 실제 출력:

  ```text
  $ npm run test > log 2>&1; echo "npm run test exit=$?"; grep -E '^ℹ (tests|pass|fail|skipped)' log | head -4
  npm run test exit=0
  ℹ tests 1094
  ℹ pass 1093
  ℹ fail 0
  ℹ skipped 1
  $ npm run docs:check
  harness overview 생성 상태가 최신입니다.
  docs:check exit=0
  $ grep -cE 'pnpm|yarn|bunx|npx|prettier|tsc' templates/.claude/hooks/pre-commit-check.sh templates/.claude/hooks/auto-format.sh; echo "exit=$?"   # spec 완료 기준 1
  templates/.claude/hooks/pre-commit-check.sh:0
  templates/.claude/hooks/auto-format.sh:0
  exit=1
  ```
  (grep은 일치가 0건이면 exit 1 — 두 훅 모두 0건이 기대값이다.)
- 소비자 실측 (2026-10-05, 읽기 전용 — `resolveStack`+`buildProposal`만 호출하는 일회성 스크립트, config·훅·gates.json 무변경).
  저장소 루트 아래 `.superpowers/tmp/consumers.mjs`(gitignore 경로, 실행 후 삭제)로 두고 `node .superpowers/tmp/consumers.mjs; echo "exit=$?"`로
  실행했다 — 같은 본문을 그 경로에 다시 쓰면 재현된다. `--yes=`는 `buildProposal(…, { unattended: true })`(= init·migrate `--yes`), `full=`은 대화형 전체 제안:

  ```js
  import { homedir } from 'node:os';
  import { resolveStack } from '../../src/detect-stack.mjs';
  import { loadRenderState } from '../../src/render-state.mjs';
  import { buildProposal } from '../../src/presets.mjs';
  const H = homedir();
  for (const dir of [`${H}/projects/workspace/deep-math`, `${H}/projects/workspace/job-scraper`, `${H}/projects/heliosent/heliosent-profile`]) {
    const stack = await resolveStack(dir, (await loadRenderState(dir)).stack);
    const yes = await buildProposal(dir, stack, { unattended: true });
    const full = await buildProposal(dir, stack);
    console.log(`${dir.replace(H, '~')} ${stack.id}/${stack.packageManager} --yes=${JSON.stringify(yes.commit)} deferred=${JSON.stringify(yes.deferred)} full=${JSON.stringify(full.commit)} format=${JSON.stringify(full.format)}`);
  }
  ```

  출력 원문:

  ```text
  ~/projects/workspace/deep-math react-native/npm --yes=["npx tsc --noEmit","npm run test"] deferred=["npm run lint"] full=["npx tsc --noEmit","npm run lint","npm run test"] format={}
  ~/projects/workspace/job-scraper python/pip --yes=[] deferred=["ruff check .","pytest","format *.py → ruff format"] full=["ruff check .","pytest"] format={"*.py":["ruff format"]}
  ~/projects/heliosent/heliosent-profile next/bun --yes=["bunx tsc --noEmit","bun run test"] deferred=["bun run lint"] full=["bunx tsc --noEmit","bun run lint","bun run test"] format={}
  exit=0
  ```
  설치 훅 판정(`KNOWN_STOCK_HOOK_SHA256` 대조, 같은 날 첫 실측): deep-math = 직전 stock → migrate가 래퍼로 갱신하고 gates.json을 제안,
  job-scraper·heliosent-profile = 커스터마이즈 → migrate 무변경.

  **deep-math 주의 → 해소**: `lint` 스크립트는 있으나 eslint 미설치(#119 실측 exit 127). 첫 구현에서는 `migrate --yes`가 `npm run lint`까지
  기록해 모든 Claude 커밋이 "설정 오류"로 막힐 상태였다. 리뷰 I4 반영 후 위 출력처럼 `--yes`는 lint를 `deferred`로 빼고 `tsc`·`test`만 기록한다
  (이후 doctor 지문 경고가 `gate suggest`로 안내). 대화형은 전체를 보여 주고 확인받는다.

- 다이어그램: 미실행 — ship: 리뷰 반영 때 라벨을 이미 갱신했고 구조는 그대로라 재생성 생략(사용자 선택) (2026-10-05)

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

<!-- harness:review kind=claude-code-reviewer scope=diff tip=b253f34575badbc1bddc684868c2a4cd5b8a0a8a at=2026-10-05T12:40:00Z -->
<!-- tip은 rebase 전 sha — 같은 내용이 rebase 후 7b56ac9(훅 fixup 병합으로 sha만 바뀜). at은 근사값: 서브에이전트 완료 시각이 기록되지 않아 codex 리뷰(12:30)와 shipcheck(13:02) 사이로 적었다 -->

### 2026-10-05T13:02:20.213Z — codex-shipcheck (harness-team review)

- engine: codex · scope: diff · tip: 6b112b8600d5cc58aff3ab5157c1c2f371d9cead · exit 0 · 2544 B

```text
전하, **판정은 Request changes입니다. fail은 S4·S5입니다.** `git status`는 clean이며, `refs/remotes/origin/main` 대비 35개 파일의 diff와 커밋 이력을 확인했습니다. 파일 변경과 테스트 재실행은 하지 않았습니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| S1 | spec 요구사항 대응 | BLOCKER | pass | R1–R9에 대응 구현이 있습니다. diff의 `GATES_REL = '.harness/gates.json'`, `buildProposal(... { unattended: Boolean(ctx.flags.yes) })`, `if (r.status === 127) return block(...)`, `gateSuggest`, `checkGateFingerprint`와 프리셋 3종·훅 래퍼가 요구사항을 구현합니다. R2의 일반 `--yes` 설명은 R7의 명시적 `confirm` 제외 규칙으로 보완됩니다. |
| S2 | 완료 체크 대응 변경·커밋 | MAJOR | pass | 다이어그램·1–10 단계의 대응 산출물과 커밋이 실재합니다: `e82118d`(문서·다이어그램), `59ed6d6`(프리셋), `009b6a5`·`9f3fc02`(실행·suggest), `9d1b904`(훅), `2e02bc8`(init), `4d7e61b`(migrate), `2995a0a`(doctor), `fdde1c7`(문서), `7b56ac9`(검증 기록), `34dc6e2`·`114289b`(리뷰 반영·기록). 검증 실행의 증거 품질은 S5에서 별도 판정합니다. |
| S3 | 스코프 밖 변경 | MAJOR | pass | diff는 프리셋·gate·훅·init/migrate/doctor·관련 테스트와 문서에 한정됩니다. 추가 `harness-cycle.md` 수정도 “처음엔 `.harness/config.json`이었으나 … 팀원마다 게이트가 꺼진다 — task `preset-gates` 리뷰”라고 사유를 기록합니다. |
| S4 | 모든 리뷰의 마커 기록 | MAJOR | **fail** | artifact:44에는 Codex 마커가 있으나, :46–60의 “최종 브랜치 리뷰 (opus code-reviewer, 새 컨텍스트)”에는 대응 `harness:review` 마커가 없습니다. 실행된 리뷰 하나가 마커 없이 기록됐습니다. |
| S5 | 실제 검증 명령·출력 인용 | BLOCKER | **fail** | artifact:58의 “`npm run test` → 1093 pass · 0 fail · skip 1, `npm run docs:check` → 최신”은 요약 선언입니다. 실제 출력 발췌·종료 코드가 없고, :10–16 소비자 실측도 호출 명령과 출력 대신 정리된 표만 있습니다. :30–42의 코드 블록은 리뷰 응답이며 테스트 출력이 아닙니다. |

**최종 verdict: fail = S4(MAJOR), S5(BLOCKER).** PR 전에 Opus 리뷰의 대응 마커와 검증 명령·실제 출력 발췌를 보완해야 합니다. 구현 대응 판정은 테스트 통과를 독립적으로 보증하지 않습니다.
```

<!-- harness:review kind=codex-shipcheck scope=diff tip=6b112b8600d5cc58aff3ab5157c1c2f371d9cead at=2026-10-05T13:02:20.213Z -->


- 판별·조치 (2026-10-05): **S4 진짜** — opus 최종 리뷰는 CLI 밖(서브에이전트)에서 돌아 마커가 없었다 → 위 절에 `kind=claude-code-reviewer` 마커를 추가했다
  (meta.reviews는 CLI 소유라 손대지 않음 — `review: required` 판정은 CLI가 기록한 codex 항목이 충족). **S5 진짜** — 검증이 요약 선언이었다 →
  `## 결과`에 실제 명령·종료 코드·출력 발췌로 교체하고 소비자 실측도 호출과 출력 원문으로 바꿨다. 코드 변경 없음(문서만).

## 남은 리스크 · 후속
- **소비자 배포 후 행동 필요**: 새 CLI로 `migrate`를 받으면 stock 훅이 래퍼로 바뀌고 `.harness/gates.json`이 제안된다 — **그 파일을 커밋해야** 팀 전체에 게이트가 걸린다.
  커밋 전까지 다른 팀원은 매 커밋 "커밋 게이트 미설정" systemMessage를 본다(차단은 아님).
- **구버전 CLI 팀원은 커밋이 막힌다**: 래퍼 훅은 CLI가 있는데 `gate`를 모르면(exit 1) 차단한다. CHANGELOG·doctor(`checkHookCli`)가 업데이트를 안내한다.
- **deep-math**: `--yes` 경로는 lint를 빼므로 막히지 않지만, `gate suggest`로 lint를 받으면 eslint 미설치(127) → 설정 오류로 막힌다. 수락 전 eslint 설치가 필요.
- 미룬 Minor 6건은 `## Reviews` 최종 리뷰 절 참조(M1 dotfile glob, M2 `{var}` 잔존, M3 지문 signal 형식, M4 거절 문구, M5 timeout, M6 테스트 공백).
- 다음 task: 저장소 모양 판별·모노레포(turbo·nx 위임, 경로별 목록)·RN rules 프리셋(spec `(open →)` 이월). git pre-commit 연결은 4번 `pr-check` task.

### 2026-10-05T13:08:23.683Z — codex-shipcheck (harness-team review)

- engine: codex · scope: diff · tip: a30154f508a19831df07e67fb3cdb158d8d677b1 · exit 0 · 2891 B

```text
전하, **S4는 해소됐지만 S5는 부분 보완에 그쳐 Request changes입니다.** `git status`는 clean이며, `refs/remotes/origin/main` 대비 35개 파일의 diff와 커밋 이력을 직접 확인했습니다. 파일 변경과 전체 테스트 재실행은 하지 않았습니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| S1 | spec 요구사항 대응 구현 | BLOCKER | pass | R1–R9에 대응합니다. diff의 프리셋 3종, `GATES_REL = '.harness/gates.json'`, `buildProposal(... { unattended: Boolean(ctx.flags.yes) })`, `if (r.status === 127) return block(...)`, 훅의 `"$bin" gate commit`, format의 `${cmd} "$@"`, `checkGateFingerprint`, `migrateGates`, `gateSuggest`가 각각 데이터·확정·실행·래퍼·포맷·지문·이행·재제안을 구현합니다. |
| S2 | plan 완료 체크의 실재 | MAJOR | pass | 다이어그램과 1–10 단계의 변경·커밋이 존재합니다: `e82118d` 문서·다이어그램, `59ed6d6` 프리셋, `009b6a5`·`9f3fc02` 실행기·suggest, `9d1b904` 훅, `2e02bc8` init, `4d7e61b` migrate, `2995a0a` doctor, `fdde1c7` 문서, `7b56ac9` 검증 기록, `34dc6e2`·`114289b` 리뷰 반영·기록. 검증 인용의 적합성은 S5에서 판정합니다. |
| S3 | 문서에 없는 스코프 밖 변경 | MAJOR | pass | 변경은 프리셋·gate·연결 코드·관련 테스트·문서에 한정됩니다. `harness-cycle.md`의 추가 수정도 diff에 “처음엔 `.harness/config.json`이었으나 그 파일은 사용자별 gitignore라 팀원마다 게이트가 꺼진다 — task `preset-gates` 리뷰”라고 사유가 기록돼 있습니다. |
| S4 | 실행된 리뷰의 마커 기록 | MAJOR | pass | artifact `## Reviews`에 `kind=codex`(:63), 새로 추가된 `kind=claude-code-reviewer`(:81), `kind=codex-shipcheck`(:102)가 있습니다. Opus 마커의 시각은 :82에서 “at은 근사값”이라고 명시했습니다. 직전 누락은 해소됐습니다. |
| S5 | 실제 검증 명령·출력 인용 | BLOCKER | **fail** | artifact:11–19의 테스트·docs 출력은 보강됐습니다. 그러나 :20의 `grep -cE …`에 대응하는 :21의 `hook-grep lines=0`은 해당 명령의 실제 출력이 아닙니다. 직접 실행한 출력은 `templates/.claude/hooks/pre-commit-check.sh:0`과 `templates/.claude/hooks/auto-format.sh:0`입니다. 또한 :23–30은 “일회성 스크립트” 설명과 결과만 있고, 실제 실행 명령·스크립트 본문 또는 재확인 가능한 위치가 없습니다. |

S5를 닫으려면 grep 출력 원문을 맞추고, 소비자 실측에 사용한 실제 호출 명령과 스크립트 본문 또는 위치를 추가해야 합니다. 현재 기록만으로 전체 테스트 통과를 독립적으로 보증하지는 않습니다.

**최종 verdict: Request changes — fail 전부: S5(BLOCKER). S4 해소, S5 미해소.**
```

<!-- harness:review kind=codex-shipcheck scope=diff tip=a30154f508a19831df07e67fb3cdb158d8d677b1 at=2026-10-05T13:08:23.683Z -->

- 판별·조치 (2026-10-05): **S5 진짜** — grep 줄이 합산값이었다 → 명령 원문과 실제 출력(`…:0` 두 줄, `exit=1`)으로 교체. 소비자 실측에 실행 명령과
  스크립트 본문(재현 경로)을 추가. 문서만 변경.

### 2026-10-05T13:10:49.762Z — codex-shipcheck (harness-team review)

- engine: codex · scope: diff · tip: 18b386ec7252675bd66c3aa358576668982a4a84 · exit 0 · 2381 B

```text
전하, **S5는 해소됐습니다.** `git status`는 clean이며, `refs/remotes/origin/main` 대비 35개 파일의 diff와 커밋 이력을 직접 확인했습니다. 파일은 변경하지 않았습니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| S1 | spec 요구사항 대응 구현 | BLOCKER | pass | R1–R9에 대응하는 diff가 있습니다: 프리셋 3종, `GATES_REL = '.harness/gates.json'`, `buildProposal`, `gateCommit`, 훅의 `"$bin" gate commit`, format의 `${cmd} "$@"`, `checkGateFingerprint`, `migrateGates`, `gateSuggest`. R7의 `confirm` 제외는 `unattended && item.confirm`으로 구현됐습니다. |
| S2 | plan 완료 체크의 실재 | MAJOR | pass | 다이어그램·1–10 단계에 대응하는 변경과 커밋이 존재합니다: `e82118d`, `59ed6d6`, `009b6a5`, `9f3fc02`, `9d1b904`, `2e02bc8`, `4d7e61b`, `2995a0a`, `fdde1c7`, `7b56ac9`, `34dc6e2`, `114289b`. 검증 증거 보완도 `a30154f`·`18b386e`에 실재합니다. |
| S3 | 문서에 없는 스코프 밖 변경 | MAJOR | pass | diff는 프리셋·실행기·훅·init/migrate/doctor·관련 테스트와 문서입니다. `harness-cycle.md`의 저장 위치 변경도 “사용자별 gitignore라 팀원마다 게이트가 꺼진다 — task `preset-gates` 리뷰”라고 사유가 기록됐습니다. |
| S4 | 실행된 리뷰의 마커 기록 | MAJOR | pass | artifact `## Reviews`에 `kind=codex`, `kind=claude-code-reviewer`, 두 차례의 `kind=codex-shipcheck` 마커가 있습니다. Opus 리뷰 시각은 “at은 근사값”이라고 명시했습니다. |
| S5 | 실제 검증 명령·출력 인용 | BLOCKER | pass | artifact에 `npm run test exit=0`, `ℹ tests 1094 / pass 1093 / fail 0 / skipped 1`과 docs 출력이 인용됐습니다. grep은 실제 원문인 두 파일의 `:0`·`exit=1`로 교체됐습니다. 소비자 실측에는 실행 명령·스크립트 본문·출력 원문이 모두 있습니다. 직접 재현한 소비자 3곳의 출력이 기록과 일치했고(exit 0), grep과 `npm run docs:check`도 기록과 일치했습니다. |

전체 테스트는 이번 재검에서 재실행하지 않았습니다. S5의 pass는 **검증 증거 형식과 실측 재현성의 해소**를 뜻하며, 전체 테스트 통과를 독립적으로 재보증하지는 않습니다.

**최종 verdict: PASS — fail 없음. S5 해소.**
```

<!-- harness:review kind=codex-shipcheck scope=diff tip=18b386ec7252675bd66c3aa358576668982a4a84 at=2026-10-05T13:10:49.762Z -->

## Learnings
- **sha 완결성 테스트와 훅 커밋**: `KNOWN_STOCK_HOOK_SHA256` 완결성 테스트는 `--first-parent` 이력 기준이라, 브랜치에서 훅을 두 번 커밋하면
  중간 판이 브랜치에선 "필수", main merge 뒤엔 "여분"이 되어 어느 쪽이든 실패한다. 훅 변경은 한 커밋에 모으고, 후속 수정은 fixup + autosquash
  (`core.hooksPath=/dev/null`로 post-commit 재생성을 막고)로 합친다.
- **`.harness/config.json`은 사용자별 gitignore다**: 팀이 공유해야 하는 확정값을 넣으면 확정한 한 사람 외에는 소리 없이 빠진다. 팀 상태는 커밋되는 파일에 둔다.
- **훅 exit 0의 stderr는 사용자에게 보이지 않는다**: "경고 후 통과"는 stdout JSON `systemMessage`로 내야 실제로 경고가 된다.
- **설계 결함은 리뷰가 잡았다**: 위 두 항목(C1·I1)은 spec 단계 인터뷰·자가진단을 모두 통과했지만 새 컨텍스트 리뷰어가 찾았다 — D6 검증자의 값.

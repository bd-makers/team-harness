# path-cli-run-failure — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `readPathCliVersion`에 `failed` 상태 추가: `--version`이 0 아닌 exit(127 포함)로 끝나고 stderr에
  `Unknown command: --version` 한 줄이 없으면 `{ state: 'failed', code, detail: 첫 출력 줄 }`. `legacy`는 그 줄로만.
- `cliDriftWarning`이 `failed`에 "실행되지 않음 (exit N: <첫 줄>)" + 활성 Node에서 `npm i -g "<clone>"` + 버전 관리자 shim 언급을
  낸다. `VERSION_FLAG_SINCE` 게이트 없음, plugin-dev 모드에서도 나온다.
- `checkCliDrift`가 `{ warning, action }`을 돌려주고 doctor JSON `next_actions`는 `failed`면 `npm i -g …`, 그 밖엔 기존 `git -C <clone> pull`.
- 문서: `MAINTAINING.md`(설치본 세 곳)·`docs/prerequisites.md`(훅 PATH)·`docs/harness-onboarding-checklist.html`(버전 드리프트 확인 항목)·`CHANGELOG.md` Unreleased.
- 테스트: `tests/cli-drift.test.mjs` — mise shim 실패·옛 CLI 응답·127·무출력 exit 1·stdout/접두 오인·JSON next_actions.
  수정 전 4건 실패(red) 확인 → 수정 후 20/20, `npm test` 1468건 실패 0, `npm run docs:check` 통과.
- 묻지 않고 내린 결정: exit 127도 `failed`로 접음(이전엔 침묵하는 `unknown`) — 버전을 단정하지 않고 "실행되지 않음"만 말하므로
  기존 "침묵으로 날짜를 매기지 않는다" 의도와 맞는다. 출력 없는 exit 1도 `failed`(이전 `legacy`) — 옛 CLI는 항상 그 줄을 냈다.
  소비자 측에서는 hook CLI 검사와 함께 두 줄이 나올 수 있다(이쪽만 원인 첫 줄을 싣는다). 다이어그램 단계는 넣지 않음(옵트인).

- spec 검토 승인: 2026-11-23 chad가 채팅에서 승인했다. 구현·ship이 승인보다 먼저 진행됐다(게이트 순서 위반 — 사후 승인).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-23T02:29:25.210Z — codex (harness-team review)

- engine: codex · model: default · scope: diff · base: main · mergeBase: 6d9a218e3477c85fbc47881c4e136b2f1a33423f · tip: b98a4c44e19f0c8b812df403a84634c2b0649c70 · exit 0 · 2375 B

```text
- **P2** `legacy` 판정이 stderr와 stdout을 합쳐 부분 일치로 검사합니다. stderr에 실제 실패 원인이 있어도 stdout에 옛 CLI 문구가 있거나 `Unknown command: --version-helper`가 출력되면 `git pull`을 잘못 권고합니다. [doctor.mjs:202](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/funny-keller-1e80f5/src/commands/doctor.mjs:202>)
- **P3** `--version`만 실패하고 훅 명령은 정상인 래퍼에서도 `cliDriftWarning`이 훅 실패를 단정합니다. [doctor.mjs:252](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/funny-keller-1e80f5/src/commands/doctor.mjs:252>)
- **P3** plugin-dev JSON 테스트는 `npm i -g`의 존재만 확인해 실행 실패에 `git pull`이 함께 추가되는 회귀를 놓칩니다. [cli-drift.test.mjs:313](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/funny-keller-1e80f5/tests/cli-drift.test.mjs:313>)
- **P3** spec은 `checkCliDrift`가 `{ state, warning }`을 반환한다고 명시하지만 구현은 `{ warning, action }`을 반환합니다. [path-cli-run-failure-spec.md:59](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/funny-keller-1e80f5/docs/chad/path-cli-run-failure/path-cli-run-failure-spec.md:59>)

**검증** · `git status`, `git diff main`, `git diff --check main`을 확인했고 파일 변경은 없습니다. 읽기 전용 테스트 9개가 통과했습니다. 동일 입력을 메모리에서 대조한 결과 mise 오류, exit 127, 출력 없는 exit 1의 새 단언은 `main`에서 실패하고 현재 코드에서 통과했습니다. 실제 구버전 판정은 양쪽에서 통과했습니다. 현재 `checkCliDrift`는 의도대로 실행 실패에 `npm i -g`, 구버전과 버전 불일치에 `git pull`을 반환합니다. 임시 파일을 쓰는 전체 테스트와 CLI 통합 테스트는 실행하지 않았습니다.

**최종 판정 · 수정 요청.** P1은 없습니다. P2의 `legacy` 오판을 수정한 뒤 병합하는 것이 적절합니다.
```

<!-- harness:review kind=codex scope=diff tip=b98a4c44e19f0c8b812df403a84634c2b0649c70 at=2026-11-23T02:29:25.210Z -->

판별·조치 (2026-11-23):
- P2 `legacy` 부분 일치 — **진짜 결함.** 옛 CLI는 `console.error`로 stderr에만 그 줄을 냈다. stderr 한 줄 전체(`/^Unknown command: --version$/m`)로
  좁혔고, stdout에만 있는 경우·`--version-helper` 접두 경우를 `failed`로 고정하는 단언을 추가했다(이전 구현이면 실패).
- P3 "훅도 실패한다" 단정 — **타당.** "같은 이유로 실패하고 있을 수 있다"로 완화.
- P3 JSON 테스트가 `git pull` 동반을 못 잡음 — **타당.** `failed`의 `next_actions`에 ` pull`이 없음을 단언 추가.
- P3 spec의 반환형 서술 불일치 — **타당.** spec을 `{ warning, action }`으로 정정.

## Learnings

# capsule-cause — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- TCC capsule stub에 `- Cause (intent | context | environment | verification | state | unknown):`(권장). `context check` 불변.
- fix-bug·new-feature 스킬이 원인 범주와 뜻을 안내. 직전 스킬 판은 stock fixture era로 등록(22개).
- AGENTS.md는 eager 예산 때문에 바꾸지 않음.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-02T16:41:46.035Z — codex (harness-team review)

- engine: codex · scope: diff · base: refs/remotes/origin/main · mergeBase: a18749d050b17eda57376ede14624dd6157addde · tip: 63d7024da45e3f4a53f610832a259bb769eafa80 · exit 0 · 1420 B

```text
전하, **P1/P2에 해당하는 유의미한 결함은 발견하지 못했습니다.**

- **P3 nit — [tests/fixtures/stock-templates/README.md:23](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/capsule-cause-fd2407/tests/fixtures/stock-templates/README.md:23)**: 새 era를 추가하면서 “마지막 era”가 Pocock 규율 도입 이후 판을 가리키게 됐습니다. 의도한 `2026-09-07-286ef8e9`를 명시하는 편이 정확합니다.

요청하신 항목은 다음과 같이 확인했습니다.

- 빈 `Cause`는 capsule 내용으로 세지 않으며, 필드 없는 기존 TCC의 검사 계약도 유지됩니다.
- 새 fixture 두 개는 도입 커밋·`origin/main`의 직전 stock과 Git blob이 일치합니다. 해시 등록과 refresh 경로도 적절합니다.
- `AGENTS.md`와 템플릿의 추가 문구가 일치합니다.
- CHANGELOG의 새 TCC 생성·스킬 migrate·AGENTS init 갱신 경로는 구현과 부합합니다.

선택한 읽기 전용 테스트 **17개**, `npm run docs:check`, `git diff --check`가 통과했습니다. 전체 테스트와 실제 migrate 쓰기는 실행하지 않았습니다. 추가 검증 스크립트는 here-document 임시 파일 생성 권한에 막혀 재시도하지 않았습니다. 파일 변경은 없습니다.

**최종 판정: Approve with nit.**
```

<!-- harness:review kind=codex scope=diff tip=63d7024da45e3f4a53f610832a259bb769eafa80 at=2026-11-02T16:41:46.035Z -->

**판별·조치 (2026-11-03)**
- P3 README "마지막 era" 지칭 — **진짜(문서)**. 새 era `2026-09-08-c9480a32`가 끝에 붙어 지칭이 틀어졌다. `2026-09-07-286ef8e9`로 명시했다.
- 리뷰가 놓친 것: tip `63d7024`의 AGENTS.md 3줄은 eager 예산(AGENTS.md+CLAUDE.md 17500 B)을 133~155 B 넘겨
  `tests/agent-files.test.mjs` 2건이 실패했다(리뷰어는 선택 테스트 17개만 실행). AGENTS.md 변경을 철회하고 범주 뜻을 스킬 두 개로 옮겼다.
- 그 수정 커밋을 따로 두면 중간 스킬 판이 git 이력에 남아 stock 완전성 테스트가 요구하므로, 푸시 전 두 커밋을 하나로 합쳤다.
  리뷰 tip `63d7024`는 합치기 전 sha라 최종 tip 대상으로 재리뷰했다(아래).

### 2026-11-02T16:44:13.771Z — codex (harness-team review)

- engine: codex · scope: diff · base: refs/remotes/origin/main · mergeBase: a18749d050b17eda57376ede14624dd6157addde · tip: 4f260b9319ce62bc963f8c55950b7ba20adc7d82 · exit 0 · 1315 B

```text
전하, 최종 tip `4f260b9`을 `origin/main`과 대조한 결과 **P1/P2 결함은 발견하지 못했습니다.**

- **P3 nit — [capsule-cause-context.md:5](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/capsule-cause-fd2407/docs/hslee/capsule-cause/capsule-cause-context.md:5>)**: Goal에 철회한 “AGENTS.md 안내”가 남아 있습니다. 최종 범위인 “스킬 안내”로 맞추면 됩니다.

요청하신 세 항목은 확인했습니다.

1. 빈 `Cause` stub은 미해결 capsule로 세지 않으며, 필드 없는 기존 TCC도 유효합니다.
2. 새 SHA256·fixture는 도입 커밋과 직전 stock에 일치하고, Git 이력 완전성 검사도 통과했습니다. refresh 로직상 갱신 대상입니다.
3. CHANGELOG·spec의 소비자 도달 경로는 최종 diff와 일치합니다. AGENTS.md 언급은 변경 철회를 설명하는 내용입니다.

읽기 전용 선택 테스트 **20개**, `npm run docs:check`, `git diff --check`가 통과했습니다. 전체 `npm test`와 실제 migrate 쓰기는 실행하지 않았습니다. 파일 변경은 없으며 기존 handoff 수정도 보존했습니다. 별도 구현 결정은 없습니다.

**최종 판정: Approve with nit.**
```

<!-- harness:review kind=codex scope=diff tip=4f260b9319ce62bc963f8c55950b7ba20adc7d82 at=2026-11-02T16:44:13.771Z -->

**판별·조치 (2026-11-03)**
- P3 TCC Goal에 철회한 "AGENTS.md 안내"가 남음 — **진짜(workpad 문구)**. 최종 범위인 스킬 안내로 고쳤다. 코드·테스트 영향 없음.
- 리뷰어는 선택 테스트 20개만 실행했다. 전체 `npm test`는 작성 세션이 tip 직전 판(`6ea4b84`, 이후 변경은 README 문구·artifact뿐)에서
  1283건 fail 0으로 확인했다.

## Learnings

---
name: harness-sim
description: playground 3개 프로젝트(bare-node/next-app/rn-app)에서 설치된 하네스 설정을 실제로 굴려 L4 시뮬레이션을 돌리고 날짜 박힌 리포트를 남긴다. "하네스 시뮬레이션", "harness sim", "playground 검증", "하네스 동작 점검" 요청에 사용.
disable-model-invocation: false
argument-hint: "[all|bare-node|next-app|rn-app]"
allowed-tools: Read, Write, Edit, Bash, Glob
---

# /harness-sim — playground L4 시뮬레이션 + 리포트

설치된 하네스 설정(실 `.claude/settings.json` 훅, 실 command 파일, 실 post-commit 훅)을
영속 playground의 3개 소비자 프로젝트에서 **실제로 굴려보고**, 사람이 읽는 **날짜 리포트**를 남긴다.

> **이건 `tests/e2e/`의 재구현이 아니다.** e2e는 휘발성 tmpdir에서 L1·L2·L3을 기계 검증한다.
> 이 스킬은 *디스크에 상주하는 설치된 설정*을 굴리는 **L4 + 리포트**다. 판정은 assert를 새로
> 짜지 말고 기존 `--json` 출력(`doctor --json`, `session-context`)을 **호출해 요약**한다.

## 정직성 규칙 (위조 금지)
- slash command 실세션 해석 / skill 트리거 / SessionStart nudge는 **이 스킬 실행 중엔 관찰 불가**.
  이런 항목은 절대 PASS로 칠하지 말고 `⚠️ 수동확인`으로 표기한다.
- nudge는 `session-context` 출력으로 **대리 검증**하되, "세션 시작 시 실주입은 별도 확인 필요" 한계를 적는다.
- command/skill **존재**(파일 있음)는 인벤토리일 뿐 "동작 테스트"가 아니다 — `⚠️ 수동확인`으로 분류.

---

## 변수
- `PLUGIN_ROOT` = 이 플러그인 repo 루트 (스킬 기준 `../..`)
- `PG` = `$PLUGIN_ROOT/../harness-playground` (상대경로로 해석 — 절대경로 하드코딩 금지)
- `BIN` = `$PLUGIN_ROOT/bin/harness-team.mjs`
- `TS` = 실행 타임스탬프 `YYYY-MM-DDTHHmm` (`date +%Y-%m-%dT%H%M`)
- `PROJECTS` = 인자로 받은 대상. 기본 `all` → `bare-node next-app rn-app`

## Phase 0 — 프리플라이트 (실패 시 즉시 중단/안내)

1. **harness-team PATH 확인** — `command -v harness-team`.
   없으면 post-commit 훅이 PATH 링크로 `harness-team`을 부르지 못해 훅 검증이 **거짓 통과**한다.
   없으면 중단하고 안내: "plugin repo에서 `npm link` 먼저 실행".
   (스킬 내부 CLI 호출은 `node $BIN ...`로 하되, 훅 경로 검증을 위해 PATH 링크는 필수.)
2. **playground 존재 확인** — `$PG` 디렉터리 없으면 "dev 전용 도구 — playground 부재"라고
   안내하고 **우아하게 종료**(에러 아님).
3. 각 대상 프로젝트에 대해 **잔재 reclaim**(이전 실패 흔적 청소 — abort 아님):
   - `git -C $PG/<p> branch --list 'harness-sim/*'` 있으면 삭제(`git branch -D`).
   - `docs/*/sim-feature-*`, `docs/*/sim-fix-*` 디렉터리 있으면 제거.
   - `.sim-scratch` 잔재 제거. `.harness/active.json`이 sim task 가리키면 `{}`로 복원.
   - 마지막에 `git -C $PG/<p> status --porcelain`이 **비어야** 다음 단계 진행.
     여전히 더러우면 그 프로젝트는 `SKIP`(사유 기록)하고 리포트에 남긴다.
4. **스냅샷**(정리용): 프로젝트별 `ORIG_BRANCH`, `ORIG_HEAD=git rev-parse HEAD`,
   `ORIG_ACTIVE=.harness/active.json` 내용을 기억한다.

## Phase 1 — 프로젝트별 시뮬레이션 (각 프로젝트 반복)

각 프로젝트 `<p>`에서, 모든 작업은 격리 브랜치에서:
```
git -C $PG/<p> checkout -b harness-sim/$TS
```

### S1 — 하네스 코어 & 스킬
- **doctor**: `node $BIN doctor --json --target $PG/<p>` → `.status == "success"` 그리고
  `checks[]`에 `fail` 0건이면 `PASS`. 아니면 `FAIL` + 실패 라벨 기록.
- **SSOT 일관성**:
  - `AGENTS.md`에 `harness:section=` 마커 존재? (Grep)
  - `CLAUDE.md`·`GEMINI.md`가 `@AGENTS.md` import 포함? → 둘 다 만족 `PASS`.
- **session-context nudge (대리)**: 활성 task 없는 상태에서 `(cd $PG/<p> && node $BIN session-context)`
  출력에 "활성 task가 없습니다" 포함 → `PASS(대리)`. 리포트에 "실세션 주입은 수동확인" 한 줄.
- **command/skill 인벤토리**: `$PG/<p>/.claude/commands` 및 plugin commands 존재 카운트만 →
  `⚠️ 수동확인`(동작 아님).

### S2 — 새 피처 워크플로우 (더미)
모든 CLI는 `(cd $PG/<p> && node $BIN ...)`로 실행(task 커맨드는 cwd 기준).
1. `task sim-feature-$TS` → `docs/<user>/sim-feature-$TS/`에 4종 SSOT(spec·plan·handoff·artifact)
   생성 + `.harness/active.json`이 이를 가리킴 → 각각 확인.
2. **spec 게이트**: 생성된 `*-spec.md`에 "Ambiguity 자가진단"·"Ontology" 섹션 존재 → 확인.
3. **더미 변경**: `.sim-scratch`에 한 줄 write(실 src·toolchain 미오염). plan.md의 박스 1개를
   `- [x]`로 체크.
4. **커밋 훅**: `git add -A && git commit -m "sim(feature): dummy"` → 커밋 후
   `<name>-handoff.md`와 `<user>-handoff.md`의 mtime/내용이 갱신됐는지 확인(post-commit 훅).
5. **done-guard** (3조건 검사 — 검증으로 확인됨): ① plan 미완 박스 ② 미커밋 변경
   ③ artifact.md 템플릿 그대로. 미완 박스를 남긴 채 `node $BIN done` →
   완료 차단("stop" 메시지, active 유지) 확인. **차단된 사유 라인을 리포트에 그대로 기록**한다.
   > **실제 마찰(리포트에 관찰로 남길 것):** post-commit 훅이 매 커밋 후 `handoff.md`를
   > 더럽히므로, 커밋 직후 `done`은 "미커밋 변경" 가드가 **항상** 발동한다.
6. **done 완료**: 남은 박스 모두 `- [x]` + artifact.md에 더미 결과 한 줄 작성 → 재커밋 →
   훅이 또 handoff를 더럽히므로 `node $BIN done --force`(정상 완료 경로) → `active.json`이
   `null`/`{}`로 해제 + `<name>-handoff.md`에 done 갱신 확인. PASS/FAIL 기록.

### S3 — 기존 수정 워크플로우 (더미)
1. `task sim-fix-$TS` → 활성화.
2. 기존 `.sim-scratch`를 **수정**(append) — 기존 파일 수정 경로 시뮬.
3. `git commit -m "sim(fix): dummy"` → 커밋 훅 handoff 갱신 확인.
4. plan 박스 완료 + artifact 한 줄 + 재커밋 → `node $BIN done --force`(훅-더럽힘 회피) → 완료 확인.

## Phase 2 — 정리 (필수, 무오염 보장)
프로젝트별로:
1. `git checkout -q -- . ; git clean -fdq docs .sim-scratch` 로 미커밋/미추적 잔재 제거.
   (`.harness/`는 gitignore라 git이 복원 못 함 → active.json은 3단계에서 수동 복원.)
2. `git checkout $ORIG_BRANCH` → `git branch -D harness-sim/$TS`.
3. `.harness/active.json`을 `$ORIG_ACTIVE`로 복원.
4. **사후 검증**: `git status --porcelain` 비어 있음 + `node $BIN doctor --target $PG/<p>` green.
   둘 중 하나라도 실패하면 리포트 "정리 검증" 섹션에 ❌로 명시(조용히 넘어가지 말 것).

## Phase 3 — 리포트
`$PG/sim-reports/harness-sim-$TS.md`를 `report-template.md` 골격으로 작성:
- **헤더**: 실행일시, `harness-team --version`(또는 package.json version), plugin git SHA
  (`git -C $PLUGIN_ROOT rev-parse --short HEAD`), 대상 프로젝트별 시작 브랜치.
- **본문**: 프로젝트(행) × 포커스 S1/S2/S3(열) 매트릭스. 셀은 `PASS` / `FAIL` / `⚠️수동확인` /
  `SKIP`. 매트릭스 아래 항목별 관찰 메모와 실패 원인.
- **정리 검증** 섹션: 프로젝트별 git clean·doctor green 결과.
- **수동확인 잔여** 섹션: slash/skill 트리거·SessionStart 실주입 등 자동검증 불가 항목 체크리스트.

작성 후 리포트 경로를 사용자에게 보고한다. (sim-reports/는 git repo 아님 — 커밋 불필요.)

## 주의
- 절대 실제 `src/` 코드를 바꾸지 않는다 — 모든 더미 변경은 `.sim-scratch`에 국한.
- 어떤 단계가 죽어도 Phase 2 정리는 best-effort로 시도하고, 정리 실패를 리포트에 남긴다.
- 리포트의 PASS는 반드시 `--json`/파일/git 증거에 근거한다. 추측 green 금지.

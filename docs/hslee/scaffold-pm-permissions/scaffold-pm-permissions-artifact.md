# scaffold-pm-permissions — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

**인도물** (브랜치 `claude/scaffold-pm-permissions`, base `origin/main` c9945bc):
- `src/settings-permissions.mjs` — `stackPermissions(profile, { stackId })`·`RN_STACK_IDS`·`isRnStack`. pm 게이트(npm·yarn·pnpm·bun)와 RN 게이트가 독립.
- `templates/.claude/settings.json` — allow 15→6, deny 8→6 (pm·RN 무관 항목만).
- `src/harness.mjs` — `planChanges`가 생성 항목을 템플릿 permissions에 합성한 뒤 deep-merge; `RN_STACK_IDS`를 새 모듈에서 import.
- `tests/settings-permissions.test.mjs` — 16건(단위 매트릭스 10 + `planChanges` 통합 6).
- `CHANGELOG.md` [Unreleased] Changed 1항목, `docs/harness-overview.html` 인벤토리 재생성.

**검증** (2026-09-04, ship 시점 재실행 — 실제 출력):
```
$ npm test            # exit 0
ℹ tests 524
ℹ pass 523
ℹ fail 0
ℹ skipped 1           # tests/hooks-jq-fallback.test.mjs의 skip: !process.env.CI 게이트
ℹ tests 1             # perf
ℹ pass 1
$ npm run docs:check
harness overview 생성 상태가 최신입니다.
```
통합 테스트 변별력: `planChanges`의 합성 블록을 잠시 끄면 6건 중 4건 실패(4단계에서 확인, 파일은 커밋 상태로 원복).

- 다이어그램: 건너뜀 (사용자 선택 — task 생성 시 옵트아웃, ship 질문에서도 건너뜀, 2026-09-04)

**남은 리스크**
- 합집합 병합으로 이미 스캐폴드된 프로젝트의 옛 `pnpm …` 항목은 남는다(무해·낡음). 테스트로 pin, CHANGELOG에 한계 명시. 자동 제거는 별도 결정.
- stack 없이 `planChanges`를 직접 부르는 외부 호출자는 종전보다 좁은 permissions를 받는다 — 저장소 내부 호출자는 모두 stack을 넘기며 pin 테스트가 있다.
- `npx expo install *`는 pm 무관 고정이다 — `yarn expo install`을 쓰는 팀은 그 항목을 직접 추가해야 한다.

**후속 작업**: 없음(옛 항목 제거가 필요해지면 `migrate` task로).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


### 2026-09-04 — codex (read-only, scope=diff `origin/main...HEAD` c9945bc → 4f3e55f, 13파일 +481/-19)

**실행**: `codex exec --sandbox read-only "<공용 리뷰 프롬프트 + focus 5개(pm/RN 게이트 엣지·템플릿 축소 영향·멱등·테스트 품질·CHANGELOG 정확성)>" < /dev/null` (백그라운드, stdout 2.5 KB). 폴백 없음(명시 codex).
미커밋 파일은 post-commit 훅 산출 handoff 2개뿐이라 scope=diff로 잡았다.
**결과**: P1 0 · P2 1 · P3 3 → 리뷰어 판정 "Changes requested". 리뷰어 자체 확인: migrate는 템플릿에서 hooks만 읽어 영향 없음, 저장소 내부 호출은 모두 stack을 넘김, 정상 init 경로의 합집합 병합·멱등은 구현·테스트와 일치.
- P2 `src/settings-permissions.mjs:27` — 지원하지 않는 pm(`(none)` 포함)이면 즉시 반환해, package.json 없는 프로젝트에 `--stack expo`를 강제하면 RN allow뿐 아니라 `ios/android` deny도 빠진다. RN 게이트를 pm 게이트와 분리해야 한다.
- P3 `tests/settings-permissions.test.mjs:58` — 테스트명은 접두 4종(npx·bunx·yarn·pnpm)을 말하지만 npm·bun만 단언한다.
- P3 `tests/settings-permissions.test.mjs:89` — `stackPermissions(null)`만 확인하고, `planChanges(ctx, { stack: undefined })`가 템플릿에서 제거된 항목을 되살리지 않는다는 직접 호출 계약은 검증하지 않는다.
- P3 `CHANGELOG.md:27` — "RN 계열에만 Expo allow 3종과 deny 2종을 더한다"는 위 `(none) + --stack expo` 경로에서 성립하지 않는다.
**판별** (작성 세션 재현): 4건 모두 진짜.
- P2: `resolveStack(빈 디렉터리, 'expo')` → `packageManager '(none)'` → `stackPermissions(profile, { stackId: 'expo' })` = `{allow:[],deny:[]}`. 같은 입력에 `excludesRnRules` = false(RN rules는 포함) — 두 게이트가 어긋난다. package.json 있는 대조군은 deny 2종을 낸다.
- P3-1: 58~66행 단언은 `npx`·`bunx`뿐. P3-2: agent-files·codex-hooks 테스트는 permissions를 보지 않음. P3-3: P2에 종속.
**조치**: 없음(review-only). 제안 — (1) RN 게이트를 pm 게이트 앞으로 빼서 deny 2종은 pm과 무관하게, Expo allow는 exec 접두 `EXEC_PREFIX[pm] ?? 'npx'`로 생성 (2) yarn·pnpm `tsc --noEmit` 단언 추가 (3) `planChanges(ctx, { stack: undefined })`의 permissions가 템플릿 6+6과 같음을 pin (4) P2 수정 후 CHANGELOG 문장은 그대로 참이 되므로 변경 없음. 반영은 사용자 지시로 별도 진행.
**반영 (2026-09-04, 사용자 지시)**: (1) `stackPermissions`의 pm 게이트를 `if (ADD_CMD[pm])` 블록으로 바꾸고 RN 게이트를 독립시킴, exec 접두 `EXEC_PREFIX[pm] ?? 'npx'` (2) yarn·pnpm `tsc --noEmit` 단언 추가 (3) `planChanges(ctx, { stack: undefined })` permissions == 템플릿 pin. P2 케이스는 실패 테스트를 먼저 써서 red(16건 중 1 fail) 확인 후 green. 재검증: 파일 16/16, `test:unit` fail 0, `docs:check` 최신. CHANGELOG 문장은 수정 없이 참이 됨.

<!-- harness:review kind=codex scope=diff tip=4f3e55fb63aae3f7aae2b05de008a82273ef4d3c at=2026-09-03T15:56:11Z -->

## Learnings

- **한 함수 안의 두 게이트는 순서가 곧 계약이다** — pm early return이 RN 게이트를 삼켜 package.json 없는 `--stack expo`에서 네이티브 deny가 사라졌다(codex P2). 독립 조건은 독립 블록으로 쓴다.
- **감지 계약을 테스트에 단정하기 전에 감지 코드를 읽는다** — `expo`는 `--stack` 별칭이고 감지값은 `react-native`였다(4단계 가정 오류 1건).
- **배선 뒤에 쓴 통합 테스트는 배선을 잠시 꺼서 실패하는지 본다** — 4건이 실패해야 변별력이 증명된다. 통과만 본 테스트는 증거가 아니다.
- **신규 파일은 `git add` 후 `docs:generate`** — 이번에도 단위 스위트의 첫 실패는 overview 인벤토리 pin이었다(audit-cleanup 학습 재확인).

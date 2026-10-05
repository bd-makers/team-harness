# preset-repo-shape — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 다이어그램: docs/hslee/preset-repo-shape/preset-repo-shape-diagram.html 생성 (2026-10-05)

### 검증 (2026-10-06, 리뷰 수정 패스 후)
- `npm run test` → 1137 pass · 0 fail · skip 1(+perf 1 pass). `npm run docs:check` → 최신.
- 픽스처 실측(임시 디렉터리, `init --yes`): npm workspaces·pnpm workspace·turbo·nx 모두 `monorepo`(앱 2 = expo·react-dom 런타임 의존성, 패키지 1)로 판별·표시,
  RN 앱 `apps/mobile`만 `apps-mobile-*.md` 4종 설치. 도구 없음 → `{"apps/mobile": ["cd apps/mobile && npm run test"], "apps/web": [...]}`(pnpm은 `pnpm run`), lint는 추가 제안.
  turbo(루트 tsconfig·test) → `commit: ["npx tsc --noEmit","npm run test"]`(예전 훅과 같은 루트 목록) + 추가 제안 `npx turbo run lint test --filter=...[HEAD]`.
  nx(루트 스크립트 없음) → `commit: []` + 추가 제안 `npx nx affected -t lint typecheck test --base=HEAD`(예전 훅도 아무것도 돌리지 않던 경우).
  npm 픽스처에서 git 커밋 후 `apps/web`만 수정 → 실제 `gate commit`이 web 목록 1개만 실행(exit 0). `apps/admin` 추가 → doctor `commit gates: warning (+workspace apps/admin, …)`.
- 소비자 3곳 읽기 전용 `stack --json`: deep-math(react-native)·job-scraper(python)·heliosent-profile(next) 모두 `repoShape: single` — 동작 변화 없음.
- 미검증: 실제 turbo·nx 바이너리 실행(위임 명령은 문자열 테스트와 소스 조사뿐), 대상 0개일 때 두 도구의 exit code, Windows 경로 구분자.

### 구현 중 판단 (Rulings)
- 1단계 (리뷰로 보강): dev·start 스크립트 조건을 뺐다 — RN UI 라이브러리·오케스트레이터 루트가 앱이 됐다(리뷰 P2-3). 앱은 `runtimeDependency` next·expo·react-native·react-dom.
- 1단계: 앱 조건의 프레임워크 의존성은 `dependency`가 아니라 새 조건 `runtimeDependency`(dependencies만)로 본다 — `react-native`를 devDependency로 가진 UI 패키지가
  앱으로 분류됐다(테스트로 재현, spec G4가 막으려던 경우). 틀렸을 때 비용: 조건 종류 하나와 node.json 세 줄.
- 1단계: 앱 판정은 workspace 자신의 stack id로 고른 프리셋의 `workspace.app` 조건으로 한다(루트 프리셋이 아니라) — workspace마다 언어가 다를 수 있다.
- 조사(2026-10-06, 소스 기준·docs 미명시): turbo `--filter=...[HEAD]`·nx `affected --base=HEAD` 모두 HEAD 대비 staged·unstaged·untracked를 포함한다.
  turbo는 turbo.json에 없는 task를 넘기면 에러 → 정의된 task만 제안. nx는 target 없는 프로젝트를 조용히 건너뛴다. `NX_HEAD` 환경변수가 있으면 working tree가 빠지는 함정은
  로컬 커밋 훅에서 드물어 명령에 넣지 않는다(틀렸을 때 비용: CI 같은 환경에서 게이트가 커밋 전 변경을 못 봄).
- 2단계 (리뷰로 뒤집음): 위임 명령은 `confirm: true`. 처음엔 `--yes`면 commit을 빈 배열로 뒀으나, 루트 tsc·test가 있던 turbo 저장소의 `init --yes`·`migrate --yes`가
  예전보다 게이트가 줄어드는 후퇴였다(리뷰 P2-2, origin/main 대비 실측). 이제 확인 전까지는 루트 목록(예전 훅과 같은 것)을 유지하고, 위임은 추가 제안 + doctor 재알림.
- 2단계: workspace별 format 제안은 glob이 같으면 먼저 나온 것을 쓴다 — format은 루트 cwd에서 파일 경로를 붙여 실행되므로 workspace마다 나눌 실익이 없다.
- 2단계: 위임 entry의 task가 하나도 정의돼 있지 않으면 그 도구를 건너뛰고 다음 도구·경로별 목록으로 간다.
- 3단계: git이 없거나 저장소가 아니어도 "HEAD 없음"과 같이 모든 키를 실행한다 — 판정 불가를 덜 검사하는 쪽으로 바꾸지 않는다.
  키가 하나도 걸리지 않으면 아무것도 실행하지 않고 통과하며 stderr에 한 줄 남긴다(차단 대상이 아니다).
- 4단계: `gate suggest`는 gates.json의 확정 모양을 재사용하지 않고 다시 묻는다 — single로 거절했던 저장소가 workspace 모양으로 돌아오는 유일한 경로다.
  init은 확정 모양을 재사용한다(재 init마다 묻지 않기 위해). 거절 경로는 프롬프트 여러 개를 파이프로 흉내 내는 대신 `resolveShape`에 확인 함수를 주입해 단위 테스트했다.
- 6단계: 접두 사본 파일명은 앱 경로 slug(`apps/mobile` → `apps-mobile-navigation.md`) — basename만 쓰면 `apps/mobile`·`packages/mobile`이 충돌한다.
  접두 사본은 migrate refresh 고정 목록 밖이라 refresh·stale 경고 대상이 아니다(spec open 항목 확인 — 설계대로).
- 6단계: `copyStaticAssets`에 `ruleInstalls`가 없으면 유효 stack id로 단일 판정 — init 밖의 직접 호출도 종전 RN 게이트와 같은 결과(stack 정보가 전혀 없을 때만 달라짐, R11).
- 7단계: `/harness-init`은 항상 `init --yes`라 R3 확인이 에이전트 경로에서 빠진다 → `stack --json`에 `repoShape` 미리보기, init에 `--shape single`,
  명령 문서 Step 0.5(AskUserQuestion)를 더했다. 틀렸을 때 비용: 플래그 하나·문서 한 절(spec R3에 반영).
- 조사: 실제 turbo·nx 실행과 "대상 0개일 때 exit 0"은 미검증이다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-10-05T15:44:04.893Z — codex (harness-team review)

- engine: codex · scope: diff · tip: e7e95136f879984ca45d172622ce539db855ac95 · exit 0 · 1579 B

```text
전하, **P2 should-fix 4건**입니다. P1 blocking과 P3 nit은 없습니다.

- **P2 — `src/commands/gate.mjs:74`**: rename 감지 시 `--name-only`는 목적지 경로만 반환하므로, workspace 간 파일 이동에서 원본 workspace 검증이 누락됩니다. 저장소의 실제 rename 이력으로 확인했습니다. `--no-renames` 또는 양쪽 경로 수집이 필요합니다.
- **P2 — `src/repo-shape.mjs:29`**: 유효한 YAML인 `packages:\n- apps/*`를 다음 최상위 키로 오인해 빈 목록을 반환하므로, pnpm workspace가 `single`로 처리됩니다. 순수 함수 호출로 재현했습니다. [YAML 명세](https://yaml.org/spec/1.2.2/)
- **P2 — `src/repo-shape.mjs:47`**: 깊이 4 제한으로 `packages/group/domain/apps/mobile` 같은 명시적 workspace를 누락해, 해당 앱의 게이트·RN rules·doctor drift 감지가 빠집니다.
- **P2 — `src/harness.mjs:278`**: `apps/a-b`와 `apps/a/b`가 동일한 rules 파일명으로 변환되어, 두 번째 RN 앱의 4종 rules가 기존 파일로 간주되고 모두 건너뛰어집니다.

확정 shape drift, `"."`의 나머지 변경 처리, workspace 없는 단일 앱의 출력·기록 경로에서는 추가 유의미한 결함을 발견하지 못했습니다. 바이트 동일성은 실행 검증하지 않았습니다.

**최종 판정: 수정 후 재검토 권장.** 작업 트리는 clean이며 파일 변경은 없습니다. `git diff --check origin/main`은 통과했고, 파일을 생성하는 테스트는 read-only 조건에 따라 실행하지 않았습니다.
```

<!-- harness:review kind=codex scope=diff tip=e7e95136f879984ca45d172622ce539db855ac95 at=2026-10-05T15:44:04.893Z -->

**판별·조치 (작성 세션, 2026-10-06)** — 각 지적을 재현해 판별했다.
- P2 rename(`gate.mjs` diff): **진짜** — 임시 저장소에서 `git mv` 후 `--name-only`가 목적지만 냄을 재현. `--no-renames`로 수정, 테스트 RED→GREEN.
- P2 YAML 들여쓰기 없는 목록(`parsePnpmWorkspace`): **진짜** — 순수 함수 호출로 `[]` 재현. 줄머리 `-`를 목록 항목으로 읽도록 수정, RED→GREEN.
- P2 walk 깊이 4: **진짜**(코드 대조) — 패턴이 적은 깊이까지 훑도록(`**`는 8) 수정, 5단계 workspace 테스트 RED→GREEN.
- P2 slug 충돌(`apps/a-b` vs `apps/a/b`): **진짜이나 Minor로 재분류** — 두 디렉터리가 모두 RN 앱이어야만 생기고, 결과는 두 번째 앱 rules가 skip(덮어쓰기 아님). 보류.

### 2026-10-06 — 별도 컨텍스트 리뷰 (Claude 서브에이전트, 읽기 전용)
엔진 기록 없음(`harness-team review` 밖 — 가드 증거 아님, 보조 검토). origin/main 사본과 픽스처로 실측 비교.
- P2-1 rename: codex와 같은 지적 — 위에서 수정.
- P2-2 turbo·nx `--yes`에서 `commit: []`: **진짜** — origin/main은 `["npx tsc --noEmit","npm run test"]`, 브랜치는 `[]`(init·migrate). 2단계 판단을 뒤집어
  확인 전까지 루트 목록 유지로 수정, `tests/presets.test.mjs` turbo 테스트 RED→GREEN.
- P2-3 앱 조건 dev·start가 너무 넓음: **진짜** — RN UI 라이브러리가 RN rules를 받고, 오케스트레이터 루트가 `"."`가 됨. 앱 조건을 런타임 프레임워크 의존성만으로 좁힘, 테스트 2개 RED→GREEN,
  스크립트로 앱을 표시하던 기존 픽스처 8곳을 의존성으로 갱신.
- P3 pnpm 파서(따옴표 키·여러 줄 flow): 수정, RED→GREEN. P3 재 init 반복 질문: 기존 gates.json은 확정 single로 보도록 수정, RED→GREEN. P3 업그레이드 drift 안내: CHANGELOG에 추가.
- 보류(Minor): `gate commit` "바뀐 workspace 없음" 안내가 exit 0 stderr라 안 보임 · 심볼릭 링크 workspace 미인식 · `/apps/web`처럼 슬래시로 시작하는 키 · `turbo.jsonc` 미감지 · slug 충돌.
- 단일 앱 바이트 동일: 리뷰어가 Expo 단일 앱에서 origin/main과 `init --yes` 출력·`Copied N`·rules·gates.json·doctor를 비교해 동일(프로젝트명 제외) 확인.

## Learnings

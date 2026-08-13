# global-cli-drift — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

전역 CLI가 설치본과 어긋난 상태를 **릴리스 시점과 진단 시점 양쪽에서** 드러내도록 했다.

- `src/commands/doctor.mjs` — `global CLI version drift` 검사 추가.
  `readPathCliVersion`(missing/legacy/unknown/version 4상태) × `installedHarnessVersion` ×
  `cliDriftWarning`(순수) × `checkCliDrift`(배선). **plugin-dev 게이트 밖에서 실행**한다.
- `src/commands/release.mjs` — marketplace clone의 `package.json`이 새 버전과 다르면
  `marketplaceStaleDir` 기록 + `marketplaceStaleHints()`로 `⚠️`·`next:` 출력, JSON `next_actions` 반영.
  **clone을 대신 git pull 하지 않는다.**
- `MAINTAINING.md` — "설치본 세 곳과 갱신 주체" 표, 릴리스 10단계(`harness-team --version` 확인).
- `tests/cli-drift.test.mjs` — 17 tests. 전체 275 pass.

커밋: `e5b832e` (1차), 리뷰 반영분은 후속 커밋.

### 설계 판단
- **"낮으면"이 아니라 "다르면"** — PATH CLI가 설치본보다 새로운 것도 드리프트다. 순서 비교는
  `VERSION_FLAG_SINCE`(0.15.1) 한 곳에서만 한다.
- **전역 CLI 설치 대상을 cache로 옮기지 않았다** — cache는 버전별 경로라 심볼릭 링크가 그 버전에
  영구 고정된다. clone이 안정적 링크 대상인 게 맞고, 결함은 clone 코드를 아무도 갱신하지 않는다는 점.
- **검토 항목 3(dirty clone)은 만들지 않았다** — release가 clone에 쓰는 건 `marketplace.json`·`commands/`
  뿐이고 `marketplace.json` 갱신은 본 역할이다. 관측 가능한 증상은 stale 경고가 이미 덮는다.

## Reviews

### 2026-08-13 — Codex review (e5b832e)

- Verdict: changes requested (P2 3건 + P3 1건). **4건 전부 반영.**
- **P2 — `readPathCliVersion`이 ENOENT 외 실행 실패를 legacy로 오분류**: EACCES·타임아웃·exit 127이
  "0.15.1 이전 CLI"로 보고됐다. → `unknown` 상태 추가. 실행되지 못한 바이너리를 침묵으로 나이 매기지
  않는다. ENOENT/EACCES는 `missing`, killed·127·비숫자 code는 `unknown`, 평범한 non-zero exit만 `legacy`.
- **P2 — prerelease/비정규 버전 파싱**: `0.15.2-rc.1` 설치본은 `Number('2-rc')=NaN`으로 조용했고,
  PATH가 `v0.15.1`을 출력하면 오탐했다. → `normalizeVersion`(출력에서 semver 추출) +
  `isAtLeast`를 major.minor.patch 정규식 파싱으로 교체.
- **P2 — JSON warning에 remediation 없음**: 에이전트 소비자에게 `next_actions: []`로 보였다.
  → `cliDriftAction()` 추가해 `warnActions`에 연결.
- **P3 — 텍스트 doctor가 warning 뒤에도 `All checks passed` 출력**: 선행 결함이었다(`checks`는 JSON
  모드에서만 채워져 텍스트 모드 집계가 항상 0). → `add()`에 `warnings` 카운터를 두고 두 모드가 공유.
- 정상 확인: release의 `--dry-run`/`--skip-cache` 경로는 stale 힌트 전에 반환하므로 오발화 없음.
  `marketplaceStale*`는 envelope 스키마를 깨지 않음. `CLAUDE_PLUGINS_ROOT` 없는 CI 형태에서 조용함.
- 미해결(수용): `installedHarnessVersion`이 marketplace 절반만 매칭하고 user scope가 없으면 첫 레코드를
  쓴다. `release()`가 같은 fallback을 쓰므로 일관되고, release가 `marketplace.json.plugins.length === 1`을
  강제하므로 이 marketplace에는 플러그인이 하나뿐이다.
- Gemini 병렬 리뷰: **미실행** (gemini CLI 미설치).

## Learnings

### 가드를 넣었다는 것과 가드가 도는지는 별개다
드리프트 검사를 `!pluginDev` 분기에 넣었으면 **사고가 난 바로 그 머신 상태에서 skip**됐을 것이다.
기존 `SessionStart/post-commit hook CLI` 검사가 plugin-dev에서 skip인 것을 먼저 실측하고,
"소비자 훅은 소스 저장소에서 증명 불가"라는 근거가 드리프트에는 전이되지 않음을 확인한 뒤 배치했다.
**How to apply:** 기존 skip/gate 분기가 있는 파일에 검사를 추가할 때는, 붙이려는 분기가 목표 시나리오에서
어떤 상태를 내는지 먼저 실행해 본다.

### mutation이 통과하면 테스트가 그 분기를 안 타는 것이다
`unknown` 분류를 제거하는 mutation이 잡히지 않았다. 원인: 테스트가 잘못된 shebang으로 그 경로를
노리려 했는데 macOS는 그걸 ENOENT로 돌려줘 `missing` 분기로 빠졌다. `exit 127` 셸 shim으로 바꾸니 잡혔다.
**How to apply:** mutation이 살아남으면 "가드가 불필요한가"가 아니라 **"테스트가 그 코드에 닿는가"**를
먼저 의심한다. 통과한 assertion이 `['unknown','missing'].includes(...)`처럼 느슨하면 특히 그렇다.

### 로컬 통과가 "테스트가 옳다"는 증거는 아니다 — 머신 상태에 기댄 테스트
e2e doctor 테스트가 PATH CLI는 shim으로 주면서 비교 상대(`installed_plugins.json`)는 **내 머신의 실제
`~/.claude`**에서 읽었다. 로컬에선 통과하고 CI에선 Node 18·20 둘 다 실패했다 — 러너엔 설치된 플러그인이
없어 검사가 (올바르게) 아무것도 내지 않기 때문이다. 앞서 손으로 한 "실측 확인"도 같은 머신 상태 덕에
통과한 것이었다.
**How to apply:** 환경을 읽는 검사를 테스트할 때는 **비교의 양쪽 모두**를 fixture로 준다
(`CLAUDE_PLUGINS_ROOT` 주입). 그리고 `HOME=$(mktemp -d) npm test`로 깨끗한 환경을 한 번 돌려본다 —
CI에 가장 가까운 로컬 근사다.

### 확인 행위가 부작용을 일으키면 안 된다 (재발)
이 task는 `harness-team release --help`로 전역 CLI를 확인하다가 진짜 릴리스가 수행된 사고에서 출발했다.
그리고 같은 세션에서 한 번 더 밟았다 — 소스를 고쳤어도 **PATH의 바이너리는 별개**였기 때문이다.
**How to apply:** 버전 확인은 `--version`이나 파일 존재(`ls .../src/cli-args.mjs`)로 하고,
동작 확인은 부작용 없는 명령(`doctor --help`)으로 한다.

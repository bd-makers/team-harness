# global-cli-drift — Spec

## 목적 / 요구사항

`installed_plugins.json`이 최신 버전을 가리키는데 **PATH의 `harness-team`이 구버전 코드로 실행되는 상태**를
아무도 감지하지 못한다. 이 조용한 드리프트를 릴리스 시점과 진단 시점 양쪽에서 드러낸다.

관측된 사고 (2026-08-13, v0.15.1 직후):
- 전역 `harness-team` → `~/.claude/plugins/marketplaces/<name>` 심볼릭 링크
- 그 clone은 `eb8bd0f`(0.14.0)에 멈춰 있는데 `release`가 `marketplace.json`만 0.15.1로 덮어써
  **자기모순 트리**가 됐다
- 0.15.1에서 고친 `--help` 가드가 전역 CLI엔 없어 `harness-team release --help`가 또 진짜 릴리스를 수행
- SessionStart/post-commit 훅도 같은 전역 CLI를 부르므로 그 기간 내내 구버전으로 동작

## 설계 / 접근

### 1. `release`가 clone이 낡았음을 말한다 (Fix B)
marketplace 동기화(step 8) 뒤, clone의 `package.json` 버전이 새 버전과 다르면 `next:` 힌트를 낸다.
**release가 clone을 git pull 하지는 않는다** — release는 이미 라이브 Claude Code와의 경쟁을 경고하는
로컬 작업이고, 여기에 바깥을 건드리는 git 조작을 얹는 건 더 나쁘다. 한 줄 알려주는 것까지가 역할이다.

### 2. `doctor`가 드리프트를 감지한다 (Fix A)
PATH `harness-team --version` vs `installed_plugins.json`의 설치 버전을 비교해 다르면 warning.

- **plugin-dev 모드에서도 실행한다.** 기존 `SessionStart/post-commit hook CLI` 검사는 plugin-dev에서
  skip되는데, 그 근거("소비자의 훅 PATH는 소스 저장소에서 증명할 수 없다")는 드리프트에 전이되지 않는다.
  전역 CLI와 소스 트리가 가장 크게 벌어지는 곳이 바로 작성자 머신이고, 이번 사고도 이 저장소에서 났다.
- **"낮으면"이 아니라 "다르면"**: semver 비교기가 없고, PATH CLI가 설치본보다 *새로운* 것도 드리프트다.
  보고는 "PATH가 X, 설치본은 Y" 형태로 한다.
- 세 상태를 구분한다 — (1) PATH에 없음 (2) 있으나 `--version` 미지원(= 0.15.1 이전) (3) 버전 보고.
  조치가 다르므로 (2)를 (1)에 뭉뚱그리지 않는다.

### 3. dirty clone (검토 항목 3) — 별도 가드를 만들지 않는다
`release`가 clone에 쓰는 것은 `marketplace.json`과 `commands/`뿐이고 `marketplace.json` 갱신은 이 명령의
본 역할이다. 사용자가 clone을 편집 중이어서 생기는 관측 가능한 증상(버전 불일치)은 Fix B가 이미 알린다.
중복 가드를 추가하지 않는다.

### 기각한 대안
- **전역 CLI 설치 대상을 cache 디렉터리로 변경**: cache는 버전별 경로(`.../0.15.1/`)라 심볼릭 링크가
  그 버전에 영구히 고정된다 — 드리프트 방향만 바뀔 뿐 더 나빠진다. marketplace clone이 안정적인 링크
  대상인 게 맞고, 결함은 링크 대상이 아니라 **clone의 코드를 아무도 갱신하지 않는다**는 점이다.
- **`hookCliInstallCommand`의 형태 변경**: 0.14.0 회귀 테스트가 npm 공개 저장소 형태의 부재를 고정한다.
  경로는 바꿔도 되지만 형태는 건드리지 않는다. 이번 범위에선 바꾸지 않는다.

## Ontology

- **marketplace clone**: `~/.claude/plugins/marketplaces/<marketplace>` — 저장소의 git clone.
  **카탈로그**(어떤 버전이 있는가)가 본래 역할이며 `/plugin marketplace update`(=git pull)가 갱신 주체다.
  이 머신에선 `npm i -g <clone>`이 심볼릭 링크를 걸어 **전역 CLI 바이너리의 출처**를 겸한다.
- **cache dir**: `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>` — release가 저장소 트리를
  통째로 복사한 **버전 정확한 설치본**. Claude Code가 커맨드·스킬을 읽는 곳.
- **드리프트**: `installed_plugins.json`의 설치 버전 ≠ PATH `harness-team`이 실행하는 코드의 버전.
- **자기모순 트리**: clone 안에서 `marketplace.json`은 새 버전, `package.json`·`bin/`·`src/`는 옛 버전.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — "설치 버전과 PATH CLI 버전의 불일치를 release·doctor 양쪽에서 드러낸다"
- [x] **Constraint 명확도** (30%) — release 실행 금지(테스트는 `release()` 직접 호출), mutation 검증 필수,
      CHANGELOG `[Unreleased]`에만 기록하고 릴리스는 별도 판단
- [x] **Success 기준** (30%) — 구버전 PATH CLI 상태에서 doctor가 warning을 내고, 낡은 clone 상태에서
      release가 `next:` 힌트를 낸다. 두 비교 로직을 각각 제거하면 대응 테스트가 실패한다.
- [x] **Context 명확도** — `src/commands/doctor.mjs`, `src/commands/release.mjs`,
      `tests/doctor.test.mjs`, `tests/release.test.mjs`, `CHANGELOG.md`
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0

> 게이트 통과 근거: 사고 재현 경로와 영향 파일이 실측으로 확정됐고, 성공 기준이 mutation으로 판정 가능하다.

## 참고
- 사고 경위: v0.15.1 릴리스 세션 (2026-08-13)
- `src/commands/release.mjs` step 8 (marketplace 동기화 주석)
- `src/commands/doctor.mjs:328-330` (plugin-dev skip 분기)

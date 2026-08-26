# AO 워커 상시 규칙

> 이 파일은 `ao project set-config --agent-rules-file` 로 **모든 워커 세션 프롬프트에 append** 된다.
> 하네스 계약(`AGENTS.md`)·Claude 워크플로우(`CLAUDE.md`)는 워커가 자기 워크트리에서 직접 읽으므로
> **여기 복제하지 않는다.** 이 파일에는 *AO 병렬 워크트리에서만 발생하는 문제*와
> *이 레포에서만 통하는 실행 사실*만 남긴다. 길어지면 상단 항목이 묻힌다 — 100행 이하로 유지한다.

## 1. CI 실패는 로그가 아니라 annotation 으로 읽는다

이 레포를 유지보수하는 머신에서 raw CI 로그는 **읽을 수 없다** —
로그는 `*.blob.core.windows.net` 에서 서빙되는데 프록시가 403 을 반환한다.
따라서 `gh run view --log-failed` 는 **항상 실패한다. 재시도하지 마라.**

`.github/workflows/test.yml` 은 실패 라인을 `::error::` annotation 으로 다시 내보내고,
perf 진단은 통과한 run 에서도 `::notice::` 로 남긴다. Annotations REST API 는 도달 가능하다:

```bash
# 1) 현재 커밋의 check-run id 찾기
gh api "repos/bd-makers/team-harness/commits/$(git rev-parse HEAD)/check-runs" \
  --jq '.check_runs[] | "\(.id) \(.name) \(.conclusion)"'

# 2) 그 id 의 annotation 읽기 — 실패 원인과 perf 수치가 여기 있다
gh api "repos/bd-makers/team-harness/check-runs/<ID>/annotations" \
  --jq '.[] | "\(.annotation_level): \(.message)"'
```

타이밍 flake 를 진단할 때는 실패한 run 뿐 아니라 **통과한 run 의 `notice` 수치**도 같이 본다 —
비교 기준선이 거기 있다.

## 2. 생성물은 PR 브랜치에서 절대 건드리지 않는다

다음 두 파일은 **생성물**이고 기본 브랜치에서 `harness-team summary --write` 로만 갱신된다:

- `docs/task_summary.md`
- `docs/<user>/<user>-task.md`

AO 는 워커마다 별도 워크트리를 띄우므로, 이 파일을 PR 브랜치에서 수정하면
**여러 워커가 같은 줄을 동시에 고쳐 충돌한다.** task SSOT 4파일
(`spec`·`plan`·`handoff`·`artifact`)은 task 디렉터리에 격리되어 있으니 자유롭게 수정해도 된다.

## 3. 설치 단계는 없다

런타임 의존성 0개, lockfile 없음. 따라서:

- `npm install` 을 실행하지 마라. lockfile 을 만들지 마라. `package.json` 에 의존성을 추가하지 마라.
- 테스트는 바로 돌린다: `npm test` (unit + e2e, 이어서 perf 를 `--test-concurrency=1` 로).
  좁히려면 `npm run test:unit` / `npm run test:e2e`.
- Node `>=24` 필수. CI 매트릭스도 `24` 단일 항목이며, 이유는 `test.yml` 주석에 적혀 있다 —
  "LTS 커버리지" 명목으로 18/20/22 를 되살리지 마라.

## 4. 워크트리에서 ref 는 낡아 있다

워크트리의 `git rev-parse main` 은 **오래된 값**을 준다.
기준 커밋·태그·릴리스 sha 가 필요하면 명시적으로 fetch 하고 `origin/<branch>` 를 쓴다:

```bash
git fetch origin main && git rev-parse origin/main
```

## 5. 범위 경계

- **버전 범프·매니페스트 수정은 기능 PR 의 범위가 아니다.** 릴리스는 기본 브랜치에서 별도로 수행된다
  (`package.json`, `.claude-plugin/*`, `.codex-plugin/plugin.json`, `CHANGELOG`).
  버전이 필요해 보이면 올리지 말고 보고한다.
- 낯선 CLI 를 `--help` 로 탐색하지 마라 — 소스·문서를 먼저 읽는다.
  (`harness-team release --help` 가 실제 릴리스를 수행한 사고가 있었다.)

## 6. PR 을 올린 뒤 변경 다이어그램을 붙인다

PR 생성이 끝나면 `/mr-change-diagram` 스킬로 리뷰용 슬라이드 덱을 만든다 —
리뷰어가 소스를 열지 않고도 무엇이 깨졌고 무엇이 고쳐졌는지 보게 하는 산출물이다.

- **호출 시점은 PR 이 생긴 뒤다.** 스킬은 PR 번호를 받아야 동작하고, 없으면 멈추고 되묻는다.
  현재 브랜치로 추측하게 두지 말고 번호를 명시해 부른다: `/mr-change-diagram <PR번호>`
- **저장 경로: `docs/diagrams/pr/pr-<번호>-<슬러그>.html`.**
  스킬은 폴더를 스스로 정하지 않으므로, 경로를 주지 않으면 되묻고 멈춘다.
- **커밋은 이 규칙이 곧 승낙이다.** 스킬의 커밋 opt-in 을 다시 묻지 말고, 산출물 HTML **하나만**
  스테이징해 PR 소스 브랜치에 푸시한다 (`docs(diagram): PR <번호> 변경 슬라이드 추가`).
  워크트리는 폐기되므로 커밋하지 않으면 산출물이 사라진다.
  관련 없는 변경을 같이 담지 마라. `--amend`·`--force` 는 쓰지 않는다.
- **건너뛰어도 되는 경우**: 문서·설정만 바뀌어 제품 동작 변화가 없는 PR. 판단 근거를 한 줄 남긴다.
- **스킬이 설치되지 않은 머신**이면 실패로 처리하지 말고 건너뛰되,
  보고에 `다이어그램 미실행(스킬 없음)` 이라고 남긴다.

## 7. 보고 계약

작업이 끝나면 오케스트레이터가 그대로 라우팅할 수 있는 형태로 보고한다:

1. **PR 번호**와 브랜치
2. **CI 상태** — 통과/실패, 그리고 그 판단의 근거 라인 (annotation 원문 또는 로컬 `npm test` 결과)
3. **변경 다이어그램** — 커밋한 덱 경로, 또는 건너뛴 사유
4. **의도적으로 하지 않은 것** — 범위 밖이라 남긴 항목, 막힌 지점

CI 가 빨간 상태면 스스로 고치고 push 한다. 원인이 이 PR 밖(업스트림 flake 등)이라고 판단되면
고치지 말고 **근거와 함께 보고**한다.

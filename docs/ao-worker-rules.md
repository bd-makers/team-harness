# AO 워커 상시 규칙

> 이 파일은 `ao project set-config --agent-rules-file` 로 **모든 워커 세션 프롬프트에 append** 된다.
> 하네스 계약(`AGENTS.md`)·Claude 워크플로우(`CLAUDE.md`)는 워커가 자기 워크트리에서 직접 읽으므로 **여기 복제하지 않는다.**
> 이 파일에는 *AO 병렬 워크트리에서만 발생하는 문제*와 *이 레포에서만 통하는 실행 사실*만 남긴다. 길어지면 상단 항목이 묻힌다 — 100행 이하로 유지한다.

## 1. CI 실패는 로그가 아니라 annotation 으로 읽는다

이 레포를 유지보수하는 머신에서 raw CI 로그는 **읽을 수 없다** — 로그는 `*.blob.core.windows.net` 에서 서빙되는데 프록시가
403 을 반환한다. 따라서 `gh run view --log-failed` 는 **항상 실패한다. 재시도하지 마라.** `.github/workflows/test.yml` 은
`npm test` 의 실패 라인을 `::error::` annotation 으로 다시 내보내고(그다음 단계인 `npm run docs:check` 실패는 제외 — §3),
perf 진단은 통과한 run 에서도 `::notice::` 로 남긴다. Annotations REST API 는 도달 가능하다:

```bash
# 1) 현재 커밋의 check-run id 찾기 → 2) 그 id 의 annotation 읽기 — 실패 원인과 perf 수치가 여기 있다
gh api "repos/bd-makers/team-harness/commits/$(git rev-parse HEAD)/check-runs" --jq '.check_runs[] | "\(.id) \(.name) \(.conclusion)"'
gh api "repos/bd-makers/team-harness/check-runs/<ID>/annotations" --jq '.[] | "\(.annotation_level): \(.message)"'
```

타이밍 flake 를 진단할 때는 실패한 run 뿐 아니라 **통과한 run 의 `notice` 수치**도 같이 본다 — 비교 기준선이 거기 있다.

## 2. 생성물·공유 파일은 PR 브랜치끼리 충돌한다

`docs/task_summary.md` 와 `docs/<user>/<user>-task.md` 는 **생성물**이고 기본 브랜치에서 `harness-team summary --write` 로만 갱신된다 —
PR 브랜치에서 절대 건드리지 않는다. AO 는 워커마다 별도 워크트리를 띄우므로, PR 브랜치에서 수정하면 **여러 워커가 같은 줄을
동시에 고쳐 충돌한다.** task SSOT 4파일(`spec`·`plan`·`handoff`·`artifact`)은 task 디렉터리에 격리되어 있으니 자유롭게 수정해도 된다.
`docs/<user>/<user>-handoff.md` 는 워크트리 로컬 파일이라 **추적하지 않는다**(gitignore) — 훅이 다시 써도 커밋·충돌 대상이 아니다.
`git add -f` 로 억지로 담지 마라.

## 3. 설치 단계는 없다

런타임 의존성 0개, lockfile 없음. `npm install` 을 실행하지 마라. lockfile 을 만들지 마라. `package.json` 에 의존성을 추가하지 마라.
- 테스트는 바로 돌린다: `npm test` (unit + e2e, 이어서 perf 를 `--test-concurrency=1` 로). 좁히려면 `npm run test:unit` / `npm run test:e2e`.
- CI 는 `npm test` 다음에 `npm run docs:check`(생성 문서 `docs/harness-overview.html` 바이트 대조 + 현행 문서 버전 표지 대조)도 돈다. 로컬 검증도 둘 다
  돌린다. docs:check 실패는 annotation 이 없으니 로컬에서 재현하고 `npm run docs:generate` 로 다시 만든다.
- Node `>=24` 필수. CI 매트릭스도 `24` 단일 항목이며, 이유는 `test.yml` 주석에 있다 — "LTS 커버리지" 명목으로 18/20/22 를 되살리지 마라.

## 4. 워크트리에서 ref 는 낡아 있다

워크트리의 `git rev-parse main` 은 **오래된 값**을 준다. 기준 커밋·태그·릴리스 sha 가 필요하면 fetch 하고 전체 ref 이름을 쓴다:
`git fetch origin main && git rev-parse refs/remotes/origin/main` — 짧은 `origin/main` 은 같은 이름의 로컬 브랜치가 있으면 그쪽으로 먼저 풀린다.

## 5. 범위 경계

- **버전 범프·매니페스트 수정은 기능 PR 의 범위가 아니다.** 릴리스(`package.json`, `.claude-plugin/*`, `.codex-plugin/plugin.json`)는 기본 브랜치에서 별도로 수행된다. 버전이 필요해 보이면 올리지 말고 보고한다.
- `CHANGELOG.md` 는 `## [Unreleased]` 아래 항목 추가까지만 기능 PR 범위다 — 버전 헤딩 생성·이동은 릴리스 몫이다. 충돌하면 양쪽 항목을 모두 남긴다.
- 낯선 CLI 를 `--help` 로 탐색하지 마라 — 소스·문서를 먼저 읽는다. (`harness-team release --help` 가 실제 릴리스를 수행한 사고가 있었다.)
- **오케스트레이터가 브리프에서 지정한 문구는 재작성하지 마라.** 오탈자·마크다운 깨짐만 고친다. 내용에 이견이 있으면 **고치지 말고 보고**한다 — 승인된 결정을 워커가 뒤집지 않는다.
- **PR 을 스스로 머지하지 마라.** 머지는 사람의 명시적 지시로만 이뤄진다. 리뷰가 통과하고 CI 가 그린이어도 보고까지가 워커의 끝이다.
- **종결은 워커 몫이 아니다.** `harness-team done`·`summary --write`·plan 의 마지막(머지) 단계 체크는 머지 후 기본 브랜치에서
  커밋 하나로 처리한다(`commands/harness-task.md` 머지 후 종결). `ao report --done` 은 이것과 무관하다.
- **사용자에게 직접 묻지 마라.** AO 워커 세션은 비대화형이라 `AskUserQuestion` 이 abort 되고, 워커는 답을 기다리며 무기한 멈춘다.
  결정이 필요하면 **오케스트레이터에게 보고하고 멈춘다** — 선택지와 각각의 근거를 보고에 담으면 오케스트레이터가 사람에게 물어 답을 돌려준다.

## 6. 다이어그램은 옵트인이고, 커밋은 자동 승낙이 아니다

task 다이어그램은 **옵트인 단계**이지 상시 의무가 아니다. 계약의 정본은 `commands/harness-task.md`(옵트인 상태 = plan 체크박스)와
`commands/harness-ship.md`(probe → degrade → record)이고, 실행은 `/harness-diagram` 어댑터가 맡는다.
- **호출은 어댑터로 한다.** 상류 스킬을 직접 부르면 산출물 경로·자립형 inline SVG 제약·artifact 기록 의무가 하나도 붙지 않는다.
  다이어그램 스킬은 이 플러그인이 소유·번들하지 않는 외부 동반 플러그인이라 **머신마다 있을 수도 없을 수도 있다.**
- **없으면 건너뛴다** — 스킬이 없거나 호출이 실패해도 실패로 처리하지 않는다. 인라인 SVG 를 손으로 대신 그려 채우지 않는다 — 그러면 옵트인의 의미가 사라진다.
- **기록은 CLI로 한다** — `harness-team diagram record`(건너뛰었으면 `--skipped "<사유>"`). artifact 한 줄과 plan 단계 닫기를
  이 한 명령이 한다. plan 의 다이어그램 단계를 지우거나 artifact 에 손으로 쓰지 않는다.
- **산출물 경로는 `docs/<user>/<name>/<name>-diagram.html`** 이며 SSOT 4파일이 아닌 생성물이다.
- **커밋·push 를 스스로 승인하지 마라.** 생성했더라도 스테이징·커밋·push 는 사용자의 명시적 지시가 있을 때만 한다.
  워크트리가 폐기되면 산출물이 사라진다는 사실은 보고에 적고, 판단은 사용자에게 맡긴다. (PR 리뷰 덱은 §7 — 커밋이 선승인되어 있다.)

## 7. PR 리뷰 덱은 PR 을 올린 뒤 붙인다

§6 의 task 다이어그램과 **다른 산출물**이다. 리뷰어가 소스를 열지 않고도 무엇이 깨졌고 무엇이 고쳐졌는지 보게 하는
PR 단위 슬라이드 덱이며, 오케스트레이터가 지정한 상시 단계다.
- **호출은 PR 이 생긴 뒤, 번호를 명시해서:** `/mr-change-diagram <PR번호>`. 스킬은 번호가 없으면 멈추고 되묻는다 — 현재 브랜치로 추측하게 두지 않는다.
- **저장 경로: `docs/diagrams/pr/pr-<번호>-<슬러그>.html`.** 스킬은 폴더를 스스로 정하지 않으므로, 경로를 주지 않으면 되묻고 멈춘다.
- **이 산출물에 한해 커밋이 선승인되어 있다.** opt-in 을 다시 묻지 말고 덱 HTML 과, 트리에 남아 있는 task handoff
  (`<name>-handoff.md`) 변경만 함께 스테이징한다 — 그 밖의 변경은 담지 않는다(`commands/harness-task.md`
  post-commit handoff 절). PR 소스 브랜치에 푸시한다(`docs(diagram): PR <번호> 변경 슬라이드 추가`). `--amend`·`--force` 는 쓰지 않는다.
- **건너뛰어도 되는 경우**: 문서·설정만 바뀌어 제품 동작 변화가 없는 PR. 근거를 한 줄 남긴다.
- **스킬이 없는 머신**이면 실패로 처리하지 말고 건너뛰되, 보고에 `리뷰 덱 미실행(스킬 없음)` 이라고 남긴다.

## 8. 보고 계약

작업이 끝나면 오케스트레이터가 그대로 라우팅할 수 있는 형태로 보고한다:
1. **PR 번호**와 브랜치
2. **CI 상태** — 통과/실패, 그리고 그 판단의 근거 라인 (annotation 원문 또는 로컬 `npm test`·`npm run docs:check` 결과)
3. **다이어그램** — 실행/건너뜀/미실행과 그 사유 (커밋은 지시받았을 때만)
4. **PR 리뷰 덱** — 커밋한 덱 경로, 또는 건너뛴 사유
5. **외부 검증** — 실행한 검증 리뷰의 kind(`<engine>-adversarial` 등)와 요약, 또는 미실행 사유
6. **의도적으로 하지 않은 것** — 범위 밖이라 남긴 항목, 막힌 지점

CI 가 빨간 상태면 먼저 **실패 원인과 근거(annotation 원문, docs:check 는 로컬 재현)를 확인**한다. 그다음은 원인으로 갈리고,
경계가 애매하면 고치지 말고 보고한다 — ship 계약(`commands/harness-ship.md`)의 기본값이다:
- **이 PR 의 변경이 깬 것**이면 고쳐서 push 한다. 범위는 그 실패까지다 — 하다가 눈에 띈 다른 코드 결함은 같이 고치지 말고 보고한다.
- **그 밖**(업스트림 flake, main 이 이미 빨간 상태, 인프라 장애)이면 고치지 말고 근거와 함께 **보고**한다. 수정은 명시적 지시가 있을 때만 한다.

## 9. 워크트리에는 활성 task 가 없다

`.harness/active.json`·`config.json` 은 gitignore 라 새 워크트리에 없다. 브리프가 task 를 지정하면 먼저 `harness-team task <name> --member <브리프의 member>`
로 활성화한다 — config 가 없어 member 가 `git config user.name` 으로 추론되므로 `--member` 를 생략하지 않는다. 지정이 없으면 SessionStart
task-gate 를 사용자에게 묻지 말고(§5) 오케스트레이터에 보고한다. `harness-team review`·`diagram record` 는 활성 task 없이 거부된다.

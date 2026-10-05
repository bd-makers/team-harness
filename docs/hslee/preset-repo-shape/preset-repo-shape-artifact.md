# preset-repo-shape — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 다이어그램: docs/hslee/preset-repo-shape/preset-repo-shape-diagram.html 생성 (2026-10-05)

### 구현 중 판단 (Rulings)
- 1단계: 앱 조건의 프레임워크 의존성은 `dependency`가 아니라 새 조건 `runtimeDependency`(dependencies만)로 본다 — `react-native`를 devDependency로 가진 UI 패키지가
  앱으로 분류됐다(테스트로 재현, spec G4가 막으려던 경우). 틀렸을 때 비용: 조건 종류 하나와 node.json 세 줄.
- 1단계: 앱 판정은 workspace 자신의 stack id로 고른 프리셋의 `workspace.app` 조건으로 한다(루트 프리셋이 아니라) — workspace마다 언어가 다를 수 있다.
- 조사(2026-10-06, 소스 기준·docs 미명시): turbo `--filter=...[HEAD]`·nx `affected --base=HEAD` 모두 HEAD 대비 staged·unstaged·untracked를 포함한다.
  turbo는 turbo.json에 없는 task를 넘기면 에러 → 정의된 task만 제안. nx는 target 없는 프로젝트를 조용히 건너뛴다. `NX_HEAD` 환경변수가 있으면 working tree가 빠지는 함정은
  로컬 커밋 훅에서 드물어 명령에 넣지 않는다(틀렸을 때 비용: CI 같은 환경에서 게이트가 커밋 전 변경을 못 봄).
- 2단계: 위임 명령은 예전 훅에 없던 차단 명령이라 `confirm: true` — `--yes`면 commit은 빈 배열이고 위임 명령은 추가 제안으로만 남는다(경로별 목록으로 폴백하지 않는다:
  폴백하면 사람이 보지 않은 경로에서 다른 모양의 게이트가 확정된다). 틀렸을 때 비용: turbo 저장소의 `--yes` init이 게이트 없이 끝남(`gate suggest`로 복구).
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


## Learnings

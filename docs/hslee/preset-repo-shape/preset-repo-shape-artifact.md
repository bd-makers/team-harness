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
- 조사: 실제 turbo·nx 실행과 "대상 0개일 때 exit 0"은 미검증이다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

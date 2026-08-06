# harness-activation — Plan

## 목표

task 확장(loop/graph/workflow 신설)을 기각한 대신, 하네스가 실제로 발동하게 만드는
갭 3건을 메운다. 신규 파일 0, task 4파일 SSOT 유지.

## 단계

### 1. 워크플로우 진입점 — `task` 평문 출력에 다음 단계 안내

- [x] `src/commands/task.mjs` 평문 분기에 `nextActions` 상당 안내 추가
      (현재 `--json` 분기에만 존재 — 생성 `task.mjs:293`, 재활성화 `task.mjs:260`;
      평문은 `task.mjs:303`의 2줄)
- [x] 안내 내용 확정: spec 작성(Ambiguity 자가진단) → `/harness-interview` →
      구현 → 테스트(`/harness-unittest` 계열) → 리뷰 → `/harness-retro` → `done`
- [x] 기존 task 활성화(재진입) 경로에도 현재 단계 힌트가 나오는지 확인
- [x] **검증**: probe 프로젝트에서 `harness-team task <new>` 실행 → 다음 단계가 stdout에 보임.
      `--json` 출력의 기존 envelope 스키마가 깨지지 않음(테스트 통과)

### 2. 온보딩 3채널 문서화

- [x] README에 채널 표 추가 — `apply`(프로젝트 1회) / 플러그인 설치(사람·머신마다) /
      npm 전역 `harness-team`(사람마다)
- [x] "`apply`만으로는 `/harness-*` 슬래시 커맨드가 오지 않는다"를 명시
- [x] 에이전트별 강제력 비대칭 표 추가 (Claude=훅+커맨드, OpenCode=커맨드 3,
      Gemini/Cursor=텍스트만, Codex=별도 플러그인) — 훅이 Claude Code 전용인 구조적 이유 포함
- [x] AGENTS.md 역할표 주변에 "결정론적 강제 대상은 Claude, 나머지는 규범" 한 줄
- [x] **검증**: clone-후-팀원 시나리오를 README만 읽고 재현 가능한지 확인
      (probe 디렉토리에서 커맨드 없이 시작 → 문서가 안내하는 대로 복구)

### 3. 훅 조용한 실패 가시화

- [x] `doctor`에 훅 명령 실행 가능성 검사 추가 — `harness-team` PATH 확인,
      `.claude/settings.json`의 훅 command가 실제로 실행 가능한지
- [x] SessionStart / post-commit 두 훅 모두 커버 (`git-hooks.mjs`의 POST_COMMIT_HOOK 포함)
- [x] 경고 문구에 복구 방법 명시 (`npm i -g` 또는 플러그인 경로)
- [x] **검증**: PATH에서 `harness-team`을 가린 환경에서 `doctor` 실행 → 경고 발생.
      정상 환경에서는 경고 없음(오탐 없음)

### 4. 마무리

- [x] `npm run test` 통과
- [x] `/review` 또는 Codex·Gemini 리뷰 → 결과를 `artifact.md ## Reviews`에 기록
- [x] `artifact.md` 결과·학습 작성 후 `harness-team done`

## Ontology 변경 로그

- 2026-08-06 — **발동(activation)** 정의 신설: 문서 규범이 실행 시점에 강제되는가.
  결정론적 강제 / 모델 재량 / 부재 3분류.
- 2026-08-06 — **채널(channel)** 정의 신설: apply / 플러그인 / npm 전역 3종 독립 경로.
- 2026-08-06 — **loop·graph·workflow**를 Anthropic 어휘로 고정
  (loop=agent, graph=workflow, harness=환경). 커뮤니티 조어를 하네스 용어로 채택하지 않음.

## 참고

- 결정 근거·실측 데이터: `harness-activation-spec.md`
- 범위 밖 후속: `docs/report.md` G2(상주 boundary-verifier), G3(관측성)

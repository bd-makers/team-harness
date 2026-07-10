# harness-unittest — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`/harness-unittest` 커맨드를 0.11.0으로 출시. 산출물 5종 모두 완료:

- `commands/harness-unittest.md` — 커맨드 계약(SSOT). 0단계 스택 감지 → 1단계 스코프 파싱
  (file/session/feature/folder/project) → 2단계 Khorikov 4대 기둥(리팩토링 내성 최우선,
  mock/stub 규율) → 3단계 GWT 강제 → 4단계 React/RN 규칙 → 5단계 위험 기반 커버리지 →
  6단계 뮤테이션 자가점검. Khorikov 원칙을 선언이 아닌 `[허용]/[금지]` 실행 규칙으로 표현.
- `skills/harness-unittest/SKILL.md` + `agents/openai.yaml` — Codex 얇은 래퍼(contrarian 본).
- `.claude-plugin/plugin.json` commands 등록 + README 커맨드 표 행 + Codex 섹션 카운트 16→17.
- `docs/harness-overview.html` — 커맨드 행 추가, "16개→17개", 버전 배지 v0.11.0.
- 검증: `npm run test:unit` → **124 pass / 0 fail**, manifest-sync 8 invariant green.

출시: commit `33da491`, tag `v0.11.0`, `git push origin main` + tag 완료.
(외부 캐시 동기화 `release 0.11.0`은 세션 종료 후 사용자가 수행 — 라이브 세션 race 회피 위해 `--skip-cache`로 릴리스.)

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다.*

- 2026-07-11 advisor(강화 리뷰어) 사전 검토 — 접근 승인. 4가지 CI 함정 사전 차단:
  bin-router 정규식(백틱 뒤 소문자 단어 회피), 버전 미변경(Test1), Unreleased 단일 블록,
  4-파일 invariant 체크리스트. 지적 전부 반영 후 진행.

## Learnings

- **bin-router invariant는 정규식 함정이 있다.** `manifest-sync`의 bin-router 테스트는
  `commands/*.md`에서 백틱 직후 또는 줄머리의 `harness-team <소문자단어>`를 전부 매칭해
  라우터 case 존재를 강제한다. "이건 CLI 서브커맨드가 아니다"라고 설명할 때조차
  `` `harness-team` `` 처럼 **백틱을 harness-team 바로 뒤에 닫아** 소문자 단어가 붙지 않게 해야 한다.
  → 신규 커맨드가 에이전트 워크플로우면 이 패턴을 항상 확인.
- **커밋 스코프가 다른 작업과 얽히면 멈추고 묻는다.** 워킹트리에 사용자의 pending
  Codex-wrapper 작업이 섞여 있어 `git add -A`가 위험했다. AskUserQuestion으로 스코프를
  확정("플러그인 표면만") 후 명시적 `git add`로 처리 → 무관한 기획 문서 오염 방지.
- **task 문서(plan/artifact)는 작업과 동시에 갱신한다.** 직접 드라이브하며 plan.md 체크박스와
  artifact.md를 방치했더니 `done` 종결 가드 3개에 걸렸다. --force 우회 대신 실제로 채우는 것이
  이 레포 철학(게으름 금지). → 다음엔 단계 완료 시점에 plan.md를 즉시 `- [x]`로 갱신.

# harness-activation — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 평문 `task` 생성 출력에 spec → interview → 구현 → 테스트 → 리뷰 → retro → done 안내를, 재활성화 출력에는 plan 현재 단계 경로와 interview → 구현 → 테스트 → 리뷰 → retro → done 안내를 추가했다(재활성화 시 spec 작성은 생략). JSON envelope는 변경하지 않았다.
- README에 apply / Claude Code 플러그인 / 전역 CLI의 독립 3채널, clone 팀원 복구 절차, 에이전트별 강제력 비대칭을 문서화했다.
- doctor가 소비자 프로젝트에서 PATH의 `harness-team --help`가 `session-context`와 `handoff`를 지원한다고 광고하는지 확인해 SessionStart와 post-commit 훅의 공통 PATH 의존성을 경고한다. plugin-dev는 로컬 `node bin/harness-team.mjs`로 실행하고 소비자 훅을 설치하지 않으므로 같은 검사를 n/a로 skip한다.

### Probe (2026-08-06)

- `/tmp/fm-th-activation/probe-activation`에서 `task activation-probe` 생성 출력이 spec·interview·test·review·retro·done 체인을, 재실행 출력이 `activation-probe-plan.md` 현재 단계 힌트와 interview·test·review·retro·done 체인을 보였다(재활성화 시 spec 단계 없음).
- 같은 probe를 커맨드 없이 clone한 팀원으로 가정해 README의 플러그인 설치 → `npm i -g harness-aijient-team` → `harness-team doctor` 절차와 독립 채널·`apply` 제한 설명을 확인했다.
- 정상 PATH의 doctor는 `SessionStart/post-commit hook CLI` pass, node만 남긴 PATH는 복구 명령을 포함한 warning을 보고했다.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

- 2026-08-06 — 이 변경의 독립 리뷰는 no-mistakes 파이프라인이 소유한다(리뷰·테스트·lint·CI). 대상: task 평문 계약, README 온보딩/템플릿 동기화, doctor 훅 CLI 실행 가능성 검사와 probe 검증.


## Learnings

- 관리 마커 내부의 AGENTS 역할 문구는 `apply` 시 템플릿으로 교체된다. 소비자까지 지속하려면 root와 `templates/AGENTS.md.hbs`를 함께 갱신해야 하며, `agent-files`와 `migrate-agents` 테스트가 그 동기화를 증명한다.

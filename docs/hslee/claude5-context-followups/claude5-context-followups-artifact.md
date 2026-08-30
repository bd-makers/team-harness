# claude5-context-followups — Artifact

*최종 결과물과 학습 내용을 기록한다.*

- 2026-08-30: 다이어그램 옵트인 질문 생략(비대화형 세션) — 미채택.

## 결과

- **A**: `taskSpecTemplate`(`src/commands/task.mjs`)의 `## 참고` 섹션에 코드 기반 참조
  우선 안내 문구를 브리프 원문 그대로 내장. pin/snapshot 테스트 없음 확인 — 별도 테스트 갱신
  불필요.
- **B**: `copyStaticAssets`(`src/harness.mjs`)가 RN 전용 rules 4종
  (`navigation.md`·`state-management.md`·`styling.md`·`testing.md`)을 명시적 비-RN
  `--stack`(python/node/generic 등)에서 제외하도록 게이트. `copyTree`(`src/fsx.mjs`)에
  `exclude` 옵션을 추가해 구현. `--stack` 미지정(자동감지 경로)과 RN 계열
  (`react-native`, 방어적으로 `expo`)은 기존 무조건 복사 동작 유지 — 하위 호환.
  `.cursor/rules` 미러(`mirrorCursorRules`)는 이미 복사된 `.claude/rules`를 그대로 읽으므로
  별도 게이트 불필요 — 실제로 빈 소스에서도 예외 없이 빈 결과를 반환함을 테스트로 확인.
- 신규 테스트 7건(`tests/stack-conditional-rules.test.mjs`) 전부 통과, 회귀 없음
  (전체 462 실행/461 통과/1 스킵 — main 베이스라인 455 실행/454 통과 대비 +7 정확히 일치).
- `CHANGELOG.md` `## [Unreleased]`에 두 변경 각각 한 항목씩 기록(`### Changed`, `### Fixed`).

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-08-30 — codex (read-only, worktree 변경분)
- 엔진: codex (probe 폴백 체인에서 codex 가용 — gemini/claude는 미시도)
- 범위: working tree 변경분(`git status`/`git diff`) — Change A(`src/commands/task.mjs`),
  Change B(`src/harness.mjs`, `src/fsx.mjs`), 신규 테스트(`tests/stack-conditional-rules.test.mjs`),
  `CHANGELOG.md`
- 발견: 없음 (P1/P2/P3 전부 없음) — `git diff --check` + 변경 4개 파일 `node --check` 통과 확인 후
  "유의미한 finding 없음" 최종 판정(PASS)
- 판별: 해당 없음(발견 자체가 없어 확정/오탐 분류 대상 없음)
- 조치: 해당 없음

<!-- harness:review kind=codex scope=worktree tip=none at=2026-08-30T01:52:04Z -->


## Learnings

- 2026-08-30: `detectStack()`은 `expo`/`react-native` 의존성 둘 다 `id: 'react-native'` 하나로
  수렴시킨다 — 코드베이스가 실제로 정의하는 RN 식별자는 이 하나뿐이다. `--stack` 플래그는
  enum 검증 없는 자유 문자열이라, 사용자가 `--stack expo`를 타이핑할 가능성까지 방어적으로
  허용값에 포함했다(`RN_STACK_IDS`).
- 2026-08-30: stack 게이팅은 "명시적 `--stack` 플래그"만 근거로 삼고 `detectStack()`의
  자동감지 결과는 근거로 쓰지 않는 것이 하위 호환·최소 영향 원칙에 맞다 — 자동감지까지
  게이트하면 기존에 관찰되지 않던 새 회귀 표면이 열린다.

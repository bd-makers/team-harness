# deprecated-review-carryover — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 2026-08-28: `CHANGELOG.md` `## [Unreleased]`에 `### Notes` 절 신설 — 0.19.0 Notes의
  이월 기록 규칙("다시 이월한다면 그 사실을 그 릴리스의 이 절에 적는다")이 0.20.0에서
  지켜지지 않은 사실을 정정 기록으로 남겼다. 발행된 `## [0.20.0]` 절은 불변 원칙에 따라
  수정하지 않았다. 포워딩 4개가 0.20.0 트리에 남은 것이 의도된 하위 호환(선행 조건:
  홈 머신 hsonpro 전역 CLAUDE.md 전환 확인 → 0.21.0 제거 목표)임을 함께 기록.
- 0.21.0 제거 실행 단계는 plan 후속 범위에 준비: 커맨드 2 + 스킬 2 제거,
  `.claude-plugin/plugin.json` commands 항목 2 제거, `npm test`(manifest-sync) 확인,
  `npm run docs:generate` 재생성. `skills/harness-codex-sim`은 별개 — 제거 대상 아님.
- 검증: `node --test tests/what-changes-latest-version.test.mjs tests/manifest-sync.test.mjs
  tests/documentation-inventory-pointers.test.mjs` 12/12 green, `npm run docs:check` 최신 확인.
- 다이어그램 옵트인: 비대화 세션이라 기본값 "아니오"로 건너뜀(plan에 사유 기록).

### 2026-08-28 (2차 세션) — 게이트 해제 + 제거 실행

- **게이트 닫힘.** 홈 머신 hsonpro 세션에서 `~/.claude/CLAUDE.md`를 실측: 외부 리뷰 절이
  `/harness-review`·`/harness-adversarial-review`를 호출 경로로 안내하고, 옛 이름은
  "새 참조를 옛 이름으로 만들지 말 것"이라는 **금지 문구 1회**뿐이다. 부르는 안내가 아니므로
  0.19.0 Notes가 걱정한 실패 모드(포워딩 삭제 → 안내가 조용히 무반응)가 성립하지 않는다.
  spec 선행 조건 체크리스트를 `[x]`로 채웠다.
- **제거 실행** — 커맨드 2 + 스킬 디렉터리 2 + `.claude-plugin/plugin.json` 항목 2.
  슬래시 커맨드 26 → 24개. 동반 갱신 5종(README 3곳, harness-diagram.md, 가이드 HTML 3파일 6곳,
  overview 재생성, CHANGELOG `### Removed`)까지 함께. 상세는 plan 후속 범위 체크리스트.
- 검증: `npm test` **453 pass / 0 fail / 1 skip** + perf 1 pass, `npm run docs:check` 최신.

## Learnings (2차 세션)

- **로컬 `main`이 9커밋 뒤처져 있어 task 문서가 워킹트리에 아예 없었다.** PR #59는 이미
  머지됐는데 로컬만 stale이었다. `git show <branch>:<path>`로 읽는 것은 조사에는 되지만
  **편집 전에는 반드시 fetch + fast-forward** 해야 한다 — 안 그러면 다음 pull에서 충돌하거나
  존재하지 않는 파일을 고치려 든다.
- **재귀 `grep -rn`은 이 iCloud 볼트에서 120초를 넘겨 타임아웃한다.** `git grep`을 쓴다
  (추적 파일만 훑고 즉시 끝난다). 조사 도구 선택이 곧 조사 완결성이었다 — 타임아웃된
  `grep`은 33행만 뱉고 끝나 "잔여 참조 없음"으로 오판할 뻔했다.
- **문서에 미래 릴리스 번호를 박으면 이월할 때마다 거짓말이 하나씩 늘어난다.** 가이드 3파일이
  "0.19.0에서 제거됩니다"라고 적고 있었는데 실제 제거는 0.21.0이었다 — 3릴리스 이월 동안
  아무도 이 문장을 갱신하지 않았다. 이번 정정은 번호를 새로 박는 대신 **완료 시제**로 썼다.
  같은 이유로 CHANGELOG `### Removed`에도 "0.21.0에서 제거함"이 아니라 릴리스 절 자체가
  번호를 말하게 뒀다.
- **plan의 "준비된 6단계"는 실행 준비가 덜 돼 있었다.** 매니페스트·개수 언급·생성 문서가
  물려 있어 동반 갱신 5종이 추가로 필요했다. plan에 후속 범위를 적을 때는 삭제 대상만이
  아니라 **그 대상을 이름으로 부르는 모든 곳**을 함께 적어야 한다.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-08-28 · codex (gpt-5.6-terra, `codex exec --sandbox read-only`) · scope=diff(main...HEAD)

**판정: Approve — P1/P2/P3 발견 0건.** 리뷰어가 독립적으로 재현한 검증:

- 삭제 범위가 정확하다 — 커맨드 2 + 스킬 2만 ABSENT, `skills/harness-codex-sim/SKILL.md`는 PRESENT.
- 개수 정합 — manifest 24 / 실제 커맨드 파일 24 / 생성 overview 24, `missingFromOverview`·
  `staleOverviewEntries` 모두 빈 배열. `docs:check` 최신, `git diff --check` 통과.
- 라이브 문서에 **제거된 이름을 실행하라고 안내하는 참조 0건** — 남은 언급은 전부 제거 사실
  고지 또는 마이그레이션 안내다.
- 발행 버전 스냅샷 미수정 확인. 리뷰어가 `docs/what-changes-latest-version.html:421`의
  "이번에도 이월합니다" 문구를 짚었으나 **0.20.0 발행 스냅샷의 사실 기록**으로 분류했다 —
  이 세션의 판단(발행 절 불변 + `tests/what-changes-latest-version.test.mjs`가 0.20.0
  스냅샷과의 바이트 동일성을 강제)과 일치한다. 조치 없음이 정답.

**조치: 없음** (발견 0건). 반영할 지적이 없으므로 review-only 계약대로 종료.

**미실행 기록:** gemini 병렬 리뷰는 돌리지 않았다 — `gemini` CLI는 이 머신에 설치돼 있으나
(`doctor` ✓) 이번 호출이 `codex` 엔진 명시였다. 단일 엔진 리뷰다.

<!-- harness:review kind=codex scope=diff tip=68e76c14db41db04dcb0564198e08854d0e7d85c at=2026-08-28T14:48:06Z -->


## Learnings


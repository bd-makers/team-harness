# followups-22-23 — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 다이어그램: 미실행 — 경미한 오류 경로 수정 (2026-10-11)
- 재현(구현 전, 임시 저장소 `main`·`feature`·`--orphan gh-pages`, HEAD=feature, `origin/main`=main):
  - 23: `printf 'refs/heads/gh-pages <sha> refs/heads/gh-pages <0×40>\n' | harness-team pr-check --pre-push` →
    `Error: Command failed: git -C <절대경로> … diff --name-only --relative refs/remotes/origin/main...<sha>` / `fatal: …: no merge base` + 스택, exit 1.
  - 22: `pr-check --base gh-pages --json` → `root_cause: "diff 계산 실패: Command failed: git -C <절대경로> diff --stat gh-pages...HEAD"`.
- 회귀 테스트 구현 전 ✖ (2026-10-11, `node --test --test-name-pattern=…`):
  - ✖ `scope error cause: a diff failure carries git's reason, not the command line or the absolute path` — `diff 계산 실패: Command failed: git -C /var/folders/…/harness-review-… diff --stat unrelated...HEAD`
  - ✖ `pr-check --pre-push: 기본 브랜치와 무관한 히스토리의 브랜치는 건너뛰고, 관련 브랜치는 그대로 검사한다` — `Error: Command failed: git -C … diff --name-only --relative refs/remotes/origin/main...<sha>` (throw)
- 구현 후 ✔ 두 테스트 모두. 재현도 바뀜:
  - 23: 텍스트 무출력·exit 0, `--json` 은 `status: success`·`checks: []`(기본 브랜치 push 만 했을 때와 같은 형태).
  - 22: `root_cause: "diff 계산 실패: fatal: gh-pages...HEAD: no merge base"`.
  - 수동 `pr-check`(push 없이)는 종전대로 HEAD 를 검사(task 문서 없음 ✗, exit 1) — 무변경.
  - 그 밖의 실패는 삼키지 않음: 로컬에 없는 sha 를 stdin 으로 주면 `merge-base` exit 128 → 종전처럼 스택 트레이스 exit 1(git 은 pre-push 에 로컬 sha 만 주므로 실사용에서는 닿지 않는다 — 고치지 않음).
- 편차(advisor 지적 후 실측): 커밋 없는 HEAD(`checkout --orphan nocommit`)에서 "마지막 비어 있지 않은 줄"은
  `diff 계산 실패: 'git <command> [<revision>...] -- [<file>...]'` 였다(사용법 안내 줄). 마지막 `fatal:`·`error:` 줄을 우선하도록 다듬고
  같은 테스트에 unborn HEAD 단언을 더했다 — 다듬기 전 ✖, 후 ✔. 결과: `diff 계산 실패: fatal: ambiguous argument 'main...HEAD': unknown revision or path not in the working tree.`
- AO 리뷰(claude-code) approved @4b65114 선택 제안 3건 반영(2026-10-11, 오케스트레이터 지시·사람 승인):
  (1) diff-failed 의 diff 호출과 `sharesHistory` 의 merge-base 호출에만 `LC_ALL=C` — 공용 헬퍼에는 호출 단위 `env` 인자만.
  이 머신 git(Xcode 번들 `/Applications/Xcode.app/…/git-core`)은 번역 카탈로그(`share/locale`)가 없어 `LANG=ko_KR.UTF-8` 에서도 메시지가
  영어라 지역화 재현이 안 된다 — 대신 PATH 의 git 래퍼가 받은 `LC_ALL` 을 기록해 두 호출만 `C`, 나머지는 `ko_KR.UTF-8` 임을 단언하는
  테스트 `pr-check: 지역화 env 에서도 diff·merge-base 호출만 LC_ALL=C 로 불러 cause 가 fatal: 줄을 싣는다` 를 더했다 — src 변경 전 ✖, 후 ✔.
  (2) plan 3단계 문구를 실제 우선순위에 맞춤. (3) 아래 ## Reviews 에 이 리뷰 기록.
  참고: 이 spec 의 `## Done evidence` JSON 은 템플릿 주석(`<!-- -->`) 안이라 선언되지 않은 상태다 — done 가드는 review 를 요구하지 않는다. 기록은 리뷰 프로토콜대로 남긴다.
- 검증(리뷰 반영 후): `npm test` — tests 1240 · pass 1239 · fail 0 (+ perf 1 pass), `npm run docs:check` — 최신.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-10-11T07:31:47Z — AO native review (claude-code) · PR #146

<!-- harness:review kind=ao-claude-code scope=diff tip=4b651144af919cdfca9772bd8086d728cb1c3b24 at=2026-10-11T07:31:47.117Z -->

- run `9632efc9-791b-4a1f-b25c-e7e74061dcea` · GitHub review `5482374821` · 범위: `origin/main...4b65114` 전체 diff(리뷰어는 테스트 미실행)
- **verdict: approved** (변경 요청 없음)
  - 22 `gitFailureReason`: `fatal:`/`error:` 우선 → 마지막 줄 → 종전 첫 줄 폴백, unborn HEAD 함정을 테스트로 고정. `findLast` 는 engines `node>=24` 라 안전.
  - 23 `sharesHistory`: `err.code` 는 숫자 종료 코드, merge-base 는 공통 조상 없음일 때만 exit 1, 128 은 rethrow. 전부 건너뛰면 기본 브랜치 push 와 같은 출력.
- 선택 제안 → 조치(전부 반영, 위 결과 절):
  1. gettext 빌드 git 에서 `fatal:` 이 번역되면 unborn 케이스가 사용법 줄로 떨어짐 → 해당 두 호출에만 `LC_ALL=C` + env 전달 단언 테스트.
  2. plan 3단계 문구 → 실제 우선순위로 수정.
  3. 이 기록.


## Learnings

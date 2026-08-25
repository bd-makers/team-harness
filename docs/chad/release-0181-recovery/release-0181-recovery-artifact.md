# release-0181-recovery — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `docs/what-changes-0.18.1.html` 신규 작성 — 0.18.0 스냅샷의 구조·CSS·톤을 그대로 따르고,
  내용은 `CHANGELOG.md` `## [0.18.1]`과 `done-guard-evidence-artifact.md`의 리뷰 기록에서 가져왔다.
  4개 섹션(종결 가드 2종 / Done evidence 선언 / 리뷰 마커 배선 / 설계 원칙) + 전환 창 callout.
  자립형 정적 HTML — 런타임 JS·외부 네트워크 의존 없음(what-changes 시리즈 전체가 SVG·JS 없이 CSS만 쓴다).
- `docs/what-changes-latest-version.html`을 스냅샷의 바이트 단위 사본으로 동기화
  (`tests/what-changes-latest-version.test.mjs`의 `assert.equal(latest, snapshot)` 계약).
- 검증: `npm run test` 388 tests / 387 pass / 1 skip / 0 fail, `npm run docs:check` 최신.
  브라우저 프리뷰(`ao preview` + `ao browser get text body`)로 렌더 확인 — nav·hero·release-brief·
  4개 섹션·footer 정상, 이스케이프한 HTML 주석 마커도 본문에 그대로 표시.
- PR: [#40](https://github.com/bd-makers/team-harness/pull/40).
- 태그 push 전 3검사(`MAINTAINING.md` 8단계)를 브랜치에서 선행 실행 — `changelog-section.mjs 0.18.1`
  exit 0, `### Added`/`### Fixed`/`### Notes` 3개 서브섹션 출력, 헤딩 줄 제거·인접 절 미혼입 확인.
  `CHANGELOG.md`를 이 PR이 건드리지 않으므로 머지 커밋에서 돌리는 것과 동치다.
  → `release.yml` 4개 게이트 중 3개 실측 확인(버전 일치·npm test·노트 추출), 4번째는
  v0.18.1 릴리스가 존재하지 않아 `gh release create` 충돌 없음.

### 릴리스 복구 실행 기록 (2026-08-25)

- PR #40 머지 → merge commit `d424407` (tree `6874363…` = 브랜치 head와 **동일 트리**).
- **main push 런 1차: run `32801750964` = failure** — `test (18)` PASS / `test (20)` FAIL.
  같은 커밋·같은 트리인데 Node 20만 실패했고, PR CI에서는 18·20 모두 PASS였다.
  CI 로그는 이 머신에서 확보 불가(`gh`·`gh-axi`·직접 curl 모두 blob storage에서 403 —
  프록시가 `*.blob.core.windows.net` 을 막는다). **실패 테스트 이름은 끝내 미확정**이다.
- 로컬 재현: merge commit(`d424407`) 체크아웃, Node 20.19.5로 전체 스위트 → 그린.
  worker-21도 격리 worktree에서 같은 커밋·Node 20.19.5로 388/387 pass/0 fail/1 skip 확인.
- **main push 런 재실행(실패 job만): run `32801750964` = success** (18·20 모두 PASS).
  → 게이트 3(main 그린) 충족.
- 게이트 4(로컬 3검사, merge commit 체크아웃 상태): `changelog-section.mjs 0.18.1` 25줄·3서브섹션,
  `package.json` 0.18.1, `npm test` 388/387 pass/0 fail/1 skip.
- 게이트 5(태그 이동): `git push origin :refs/tags/v0.18.1` → `git tag -f v0.18.1 d424407` →
  `git push origin v0.18.1`.
- 게이트 6(발행): release run `32802158249` 전 단계 success →
  **v0.18.1 릴리스 발행, Latest** (2026-08-25T02:38:33Z). 노트 본문은 CHANGELOG `## [0.18.1]` 절.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-08-24 — codex (read-only, diff against origin/main)

- **엔진**: codex. gemini는 이 머신에 미설치라 **미실행**(폴백 체인상 codex가 먼저 잡혔고,
  vendor 분리 리뷰어 1종으로 충분하다고 판단).
- **요약**: P1 0건 / P2 1건 / P3 1건. verdict REQUEST CHANGES. 2건 모두 재현·검증 후 조치.
- **P2** `what-changes-0.18.1.html` Fixed 카드 제목이 "fail-open 경로 3종"인데 본문은 4건을
  나열 — CHANGELOG의 P2 4건과도 어긋난다. **검증: 진짜 결함**(제목의 수와 목록의 수가 불일치).
  조치: 제목을 "조용히 열리던 경로 4종 차단"으로, 왜 문장을 "네 경우 모두…"로 고쳤다.
  ④(C-quoted 경로 오분류)는 선언 파싱의 fail-open은 아니지만 **가드가 조용히 통과하는**
  결과는 같으므로 카드 제목을 그 상위 개념으로 올리는 쪽을 택했다 — `## 설계 원칙`의
  "fail-open은 선언 기반 가드의 최대 적" 문단은 선언 파싱 3건만 명시하므로 그대로 둔다.
- **P3** `release-0181-recovery-artifact.md` EOF 빈 줄(`git diff --check`). **검증: 진짜 결함이나
  생성기 유래** — `src/commands/task.mjs:120` artifact 템플릿이 `## Learnings\n\n`로 끝난다.
  이 task에서는 artifact 본문을 채우며 자연 해소. 템플릿 수정은 범위 밖이라 Learnings에 남긴다.
- **검증됨(리뷰어 확인)**: 두 HTML 파일 SHA-256 동일, 계약 테스트 통과, `docs:check` 통과,
  런타임 JS·외부 리소스·미이스케이프 엔티티·깨진 앵커·0.18.0 대비 구조/접근성 회귀 없음.
  read-only 샌드박스의 `mkdtemp` 권한 때문에 전체 `npm run test`는 리뷰어가 아닌 이 세션에서 실행했다.

<!-- harness:review kind=codex scope=diff tip=03eea077230210eebd05542926ce682754d2bbe7 at=2026-08-24T09:31:10Z -->

## Learnings

- **범프 커밋의 "한 커밋" 계약은 세 산출물을 함께 묶을 때만 성립한다.** 이번 사고는 매니페스트 4종 +
  CHANGELOG는 들어갔는데 `docs/what-changes-X.Y.Z.html`이 빠진 경우다. 로컬에서 `npm test`를 돌렸다면
  push 전에 걸렸을 결함이고, `MAINTAINING.md` 8단계가 이미 그 확인을 권한다
  (`node scripts/changelog-section.mjs X.Y.Z && node -p "require('./package.json').version" && npm test`).
  태그는 되돌리기 번거롭다 — 태그 push 전 로컬 3검사는 선택이 아니라 절차다.
- **`latest`는 편집 대상이 아니라 복사 대상이다.** 두 파일을 각각 손으로 고치면 완전 일치 계약이
  깨지기 쉽다. 스냅샷을 정본으로 쓰고 `cp`로 맞춘 뒤 `cmp`로 확인하는 편이 안전하다.
- **워크트리에서 `git rev-parse main`은 신뢰할 수 없다.** 이 세션은 git worktree에서 돌고
  `main`은 다른 워크트리에 체크아웃돼 있어, 로컬 `main` ref가 머지 후에도 `f8d6b6d`(= 깨진
  범프 커밋)에 머물러 있었다. 합의된 절차의 `git tag -f v0.18.1 "$(git rev-parse main)"`을
  그대로 실행했다면 **정확히 그 깨진 커밋에 다시 태그가 붙었을 것**이다. 실제로는
  `origin/main` · `gh pr view 40 --json mergeCommit` · detached HEAD 세 값이 모두
  `d424407`로 일치함을 확인하고 그 sha를 썼다. 워크트리에서는 fetch 직후의 `origin/<branch>`가
  단일 진실이다.
- **`tests/perf/boundary-checkpoint.test.mjs`는 부하에 민감한 flake다 — 내용 무관 확증.**
  CI에서 3회 관측했고 **전부 `test (20)`** 이다: main `32801750964`(1차), PR #41
  `32802292903`, 그리고 그중 #41은 diff가 task 문서(md/json)뿐이라 테스트를 깨는 것이
  원리적으로 불가능하다. 재실행하면 통과한다.
  **실패 테스트를 실행으로 특정했다** (CI 로그는 blob storage 403으로 끝내 확보 불가):
  merge commit 체크아웃 + Node 20.19.5 + CPU 부하(busy loop 16개, 12코어 머신)에서
  3회 중 2회 실패했고, 실패한 것은 오직
  `boundary performance: cold check <75ms and plan checkpoint <150ms …` 하나다.
  실패 메시지: `median cold boundary CLI cost 97.1ms over the 43.5ms spawn floor
  (limit: 75ms; cold samples: 360.3, 140.6, 83.3; bare samples: 42.4, 43.5, 57.3, …)`.
  → 무부하에서는 로컬·격리 worktree 모두 그린(스폰 바닥값 17ms / cold 33ms).
  **정정할 점**: 깨진 것은 `:112-113`의 `Math.max` 절대 상한이 아니라 **:110의 중앙값 상대
  예산**이었다. 부하가 걸리면 CLI 본체 작업(20 × 10KiB 스키마 read+JSON.parse)이
  bare `node -e ''` 스폰보다 훨씬 크게 늘어나 차이값 자체가 예산을 넘는다 —
  상대 예산은 스폰 비용 변동만 상쇄할 뿐 **작업량 비례 지연은 상쇄하지 못한다**.
  후속 후보(범위 밖): ① 상대 예산의 분모를 bare 스폰이 아니라 동일 작업량의 기준 실행으로
  바꾸거나 ② 부하 감지 시 skip, ③ 최소한 `Math.max` 절대 상한도 중앙값 기준으로 이동.
  심각도: PR 내용과 무관하게 재실행을 요구하므로 **후속 후보가 아니라 실무 차단 요인**이다.
- **artifact 템플릿이 EOF 빈 줄을 남긴다** (`src/commands/task.mjs:120`, `## Learnings\n\n`).
  0.18.0이 handoff 생성기에서 고친 것과 같은 계열의 결함이다 — 본문을 채우면 가려지지만,
  생성 직후 커밋하면 `git diff --check`에 걸린다. 별도 task 후보.

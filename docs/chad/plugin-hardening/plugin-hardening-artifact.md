# plugin-hardening — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- **item 1 — CI** (`9c8ed5e`): `.github/workflows/test.yml` 추가. push(main)/PR 시 `npm test`(unit+e2e), Node 18/20 매트릭스. deps 0·lockfile 없음 → install 단계 생략. e2e 샌드박스 외부에서 git 쓰는 테스트 위해 CI 전역 git identity 설정.
- **item 2 — pre-commit-check.sh PM 감지**: pnpm 하드코딩 제거 → lockfile 기반 감지(pnpm-lock/yarn.lock/bun.lockb→없으면 npm, `src/detect-stack.mjs`와 동일 우선순위). exec/run 형태를 매니저별로 정확히 분기(npm=`npx`, bun=`bunx`+`bun run test`). package.json/tsconfig/test-script 부재 시 우아하게 skip. `migrate.mjs`에 `refreshClaudeHooks` 추가 — 기존 pnpm-하드코딩 설치본만 갱신, 커스터마이즈본은 skip.

- **item 3 — manifest-sync 테스트**: `tests/manifest-sync.test.mjs` 신규(3 assertion). ①commands/*.md ⟺ plugin.json ②commands/*.md ⟺ README 표 ③commands가 참조하는 `harness-team <sub>` ⊆ bin 라우터 case. 작성 직후 **기존 드리프트 발견** — `commands/harness-sim.md`가 README 명령 표에 누락 → README 행 추가로 수정. 107→110 pass. spec Ontology의 "4-파일 동기화"를 그대로 불변식으로 인코딩(README 포함).

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-07-06 — Claude self-review (item 2: pre-commit-check.sh + migrate)
- **정확성**: 매니저별 실행 형태를 fake-bin 하네스로 실증 — npm→`npx tsc`/`npm test`, pnpm→`pnpm exec tsc`/`pnpm test`, yarn→`yarn tsc`/`yarn test`, bun→`bunx tsc`/`bun run test`. 단순 `$PM tsc`(npm 깨짐)·`bun test`(스크립트 무시) 함정 회피.
- **엣지**: package.json 부재→exit0 skip, test-script/tsconfig 부재→해당 검사만 skip, non-commit 명령→passthrough, tsc/test 실패→exit2 block 모두 검증.
- **회귀**: `npm test` 107 pass 유지. e2e apply-smoke가 3-스택에 새 훅 재적용 후 doctor green 확인(자동). pre-commit-check.sh는 PreToolUse 훅(git 훅 아님)이라 스위트가 직접 실행하지 않음 → PM 분기는 수동 하네스로 커버.
- **보안**: 입력은 기존과 동일하게 jq로 파싱, 신규 외부 입력 없음. 실행 명령은 고정 문자열(tsc/test)로 사용자 명령 인젝션 없음.
- **단순성**: detect_pm/pm_exec/pm_run_test 3개 헬퍼로 최소화. migrate refresh는 기존 `refreshProjectScripts` 패턴 재사용.
- **테스트**: 자동 스위트가 훅을 안 타는 한계 → item 3(manifest-sync)와 별개로, 향후 pre-commit 훅 PM 분기 단위 테스트 추가는 미결(백로그 후보).
- **조치**: 커스터마이즈 훅 clobber 방지 위해 `detect_pm` 마커 부재 + `pnpm tsc --noEmit` 서명으로만 refresh 대상 판정.

### 2026-07-02 — Codex (v0.9.5 분석·backlog 교차 리뷰)
- **요약**: Claude 분석 리포트와 대체로 일치 (구조 단순성·비파괴 merge·테스트 커버리지 긍정 / CI·LICENSE·pnpm 하드코딩·manifest sync 테스트 부재 동일 지적). 런타임 검증 포함: `npm test` 107 passed / 0 failed.
- **신규 발견 2건** (Claude 재검증으로 확인됨):
  1. `doctor --json`이 이 레포에서 5 problem(s) 실패 — 원인은 `.harness/backup.json`·clone.sh·symlink.sh·delete.sh·backup dir 부재. 플러그인 **소스 레포**를 소비자 프로젝트 기준으로 점검해서 생기는 구조적 false-positive → plan에 "doctor plugin-dev 모드" 항목 추가.
  2. task 인덱스 의미 중첩 — `chad-task.md`/`task_summary.md`의 "Active"는 "미완료(open)"를 뜻하고 `.harness/active.json`은 "현재 작업 포인터"라 상시 불일치 가능 (backlog task 생성 직후가 그 예). 버그가 아니라 네이밍 문제 → plan doctor 항목에 참고로 병기.
- **조치**: plan.md에 doctor plugin-dev 모드 단계 추가. active task 활성화 여부는 사용자 판단 대기 (backlog 유지 중).


## Learnings


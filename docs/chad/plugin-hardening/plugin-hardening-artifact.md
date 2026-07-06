# plugin-hardening — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- **item 1 — CI** (`9c8ed5e`): `.github/workflows/test.yml` 추가. push(main)/PR 시 `npm test`(unit+e2e), Node 18/20 매트릭스. deps 0·lockfile 없음 → install 단계 생략. e2e 샌드박스 외부에서 git 쓰는 테스트 위해 CI 전역 git identity 설정.
- **item 2 — pre-commit-check.sh PM 감지**: pnpm 하드코딩 제거 → lockfile 기반 감지(pnpm-lock/yarn.lock/bun.lockb→없으면 npm, `src/detect-stack.mjs`와 동일 우선순위). exec/run 형태를 매니저별로 정확히 분기(npm=`npx`, bun=`bunx`+`bun run test`). package.json/tsconfig/test-script 부재 시 우아하게 skip. `migrate.mjs`에 `refreshClaudeHooks` 추가 — 기존 pnpm-하드코딩 설치본만 갱신, 커스터마이즈본은 skip.

- **item 3 — manifest-sync 테스트**: `tests/manifest-sync.test.mjs` 신규(3 assertion). ①commands/*.md ⟺ plugin.json ②commands/*.md ⟺ README 표 ③commands가 참조하는 `harness-team <sub>` ⊆ bin 라우터 case. 작성 직후 **기존 드리프트 발견** — `commands/harness-sim.md`가 README 명령 표에 누락 → README 행 추가로 수정. 107→110 pass. spec Ontology의 "4-파일 동기화"를 그대로 불변식으로 인코딩(README 포함).

- **item 5 — doctor 강화**: ①깨진(dangling) symlink을 "missing"이 아니라 "broken symlink — run sync"로 구분 감지. ②backup.json이 가리키는 backup dir이 디스크에 없으면(iCloud eviction/이동) fail + 힌트. `loadBackupDir` 반환 경로를 그대로 재사용해 해석 불일치 방지. ③`cloudSyncPathWarning`(harness.mjs) — iCloud/Dropbox/GDrive/OneDrive 경로면 init(=apply, 동일 함수)에서 ⚠️ 경고.
- **item 6 — doctor plugin-dev 모드**: `isPluginDevRepo`(.claude-plugin/plugin.json + templates + bin/harness-team.mjs 3마커, 구조적 감지 — 경로 동일성 아님). 감지 시 backup.json·clone/symlink/delete.sh·backup clone dir·SessionStart 5+1건을 `status:"skip"`로 표시(생략 아님), summary·top-level `mode:"plugin-dev"`로 LOUD. 이 레포 `doctor --json` 5 problem → **0**(status success). advisor 지적 반영: skip을 checks[]에 명시해 소비자 오탐(templates/ 우연 보유)에도 silent green 방지. "active" 네이밍 = 검토 후 별도 task defer.

- **item 7 — release race 가드**: `detectClaudeCodeProcs`(ps 기반, best-effort). Claude Code(CLI `claude-code`/바이너리 `claude`/데스크톱 `Claude.app`) 감지 시 release가 경고. **advisory·non-blocking** (MAINTAINING.md 톤 준수 — `/harness-release`가 세션 내부 실행이 흔하므로 block하면 정상 플로우 파괴). skipCache면 installed_plugins 미접근이라 감지도 skip. dry-run에도 노출(실 실행 전 "종료 권장" 힌트). win32/에러 시 [] 반환으로 절대 release 차단 안 함. human ⚠️ + json status:"warning"+claudeProcs.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-07-06 — Claude self-review (item 7: release race 가드)
- **정확성**: mock ps로 claude-code/Claude.app/`claude` 3종 감지, `claude-experiments`·vim 오탐 없음 검증. 라이브(이 세션)에서 실제 감지(12~13 hit). dry-run 실행 시 human ⚠️ + json status:"warning" 노출, git 변경 0(비파괴).
- **엣지**: ps 실패→[](throw 안 함). win32→[](ps 없음). self pid 제외. skipCache→감지 자체 skip(installed_plugins 미접근이라 무의미). `claude-<other>` 정규식 오탐 방지.
- **회귀**: 114→119 pass(신규 5). 기존 release 테스트(dry-run byte-identical 포함) 전부 green — 감지는 읽기 전용.
- **보안**: ps 출력만 파싱, 실행/네트워크 없음. 프로세스 args를 그대로 출력하지 않고 pid만 envelope에 노출.
- **단순성**: 함수 1개 + release()에 조기 감지 1블록 + runRelease 경고 1줄. block 아님 → 정상 세션-내 플로우 보존.
- **테스트**: detectClaudeCodeProcs 4개 + skipCache-skip 1개. 주입형 exec로 결정론적.
- **판단 근거**: MAINTAINING.md L65가 "가급적 종료 후 실행"(advisory)이라 block 대신 warn 선택. block은 `/harness-release`(세션 내부 실행)를 상시 차단해 오히려 harness 파괴.

### 2026-07-06 — Claude self-review (item 5·6: doctor 강화 + plugin-dev 모드)
- **정확성**: 양면 검증(advisor #3). 플러그인 레포 `doctor --json`→status success·fail 0·skip 5·mode "plugin-dev". 소비자 샌드박스 3-스택 e2e 여전히 success → plugin-dev 미누출 + 5b가 샌드박스 안 깸 입증. 5a/5b는 subprocess fixture로 실증(broken symlink·missing dir 각각 정확한 detail).
- **엣지**: 마커 하나 빠지면 isPluginDevRepo=false(소비자 오탐 방지) 단위 테스트. cloudSyncPathWarning 4종 매칭 + 로컬/빈값/null→null. dangling symlink이 access()에 "missing"으로 보이는 함정을 lstat로 구분.
- **회귀**: 110→114 pass(신규 4). e2e 포함 green. dogfood 훅 제거로 생긴 SessionStart 경고는 plugin-dev에서 억제(의도된 비-dogfood).
- **보안**: 신규 입력 없음. cloudSyncPathWarning은 경로 substring만 검사(실행/네트워크 없음).
- **단순성**: plugin-dev는 skipInPluginDev 플래그 1개 + 루프 3곳 분기. advisor #1(config.json) 확인 → 모드 플래그 없어 구조적 감지가 맞음.
- **테스트**: isPluginDevRepo·cloudSyncPathWarning 단위 4개 추가. broken-symlink/missing-dir inline 경로는 subprocess 수동검증(runDoctor가 emitObservation로 출력해 단위화 부담 큼 — 향후 헬퍼 추출 시 자동화 후보).
- **advisor 반영**: #1 config.json 무플래그 확인 / #2 skip을 checks[]+mode로 LOUD / #3 양면 e2e / #4 loadBackupDir 경로 재사용 + active 네이밍 defer 기록.

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


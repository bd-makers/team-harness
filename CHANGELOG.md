# Changelog

<!--
  유지 방법:
  - 새 변경은 ## [Unreleased] 아래에 추가하세요.
  - 릴리스 시 Unreleased 항목을 새 버전 헤딩(## [X.Y.Z] - YYYY-MM-DD)으로 이동하세요.
  - 형식: Keep a Changelog (https://keepachangelog.com/ko/1.0.0/)
-->

## [Unreleased]

---

## [0.7.1] - 2026-06-02

### Fixed
- `harness-team release`가 마켓플레이스 `marketplace.json`을 마켓플레이스 **루트**에 잘못 기록하던 버그 수정 — Claude Code가 실제로 읽는 권위 경로인 `.claude-plugin/marketplace.json`에 동기화하도록 변경 (다른 모든 설치 마켓플레이스와 동일). 0.7.0에서는 루트에 stray 파일이 생기고 `.claude-plugin/marketplace.json`이 stale 상태로 남았음. 회귀 방지 테스트 추가.

---

## [0.7.0] - 2026-06-02

### Added
- spec/plan 템플릿에 4차원 Ambiguity 자가진단 + Ontology 섹션, task 생성 시 `artifact.md` 4번째 파일 scaffold
- 페르소나 3종 슬래시 커맨드: `/harness-interview`(Socratic), `/harness-contrarian`, `/harness-simplifier`
- `/harness-retro` + `harness-team retro` 서브커맨드 — 활성 task의 `artifact.md`에 학습/교정 내용 append (자기개선 루프)
- `/harness-release` + `src/commands/release.mjs` — 3개 매니페스트 동시 bump + 캐시/마켓플레이스/`installed_plugins.json` 동기화 자동화 (휴먼 에러 차단)
- `CHANGELOG.md`(0.4.0~0.6.4 복원) + `MAINTAINING.md`(릴리스 절차 명문화) 도입

### Changed
- `templates/CLAUDE.md.hbs`: Ambiguity 게이트(1-A) 룰 + 페르소나 호출 가이드 추가
- `src/commands/doctor.mjs`: 외부 도구(gh/codex/gemini/opencode/jq) healthcheck + 자체 CLI 실행성 검사 추가 (동시 실행)

---

## [0.6.4] - 2026-05-20

### Fixed
- `harness-symlink` CLI에 `same_tree` 가드 추가 — 실파일과 백업 경로가 동일 트리일 때 `rm -rf` 방지

---

## [0.6.3] - 2026-05-19

### Fixed
- `scripts/`: 백업 및 실파일 보호 — `rm -rf` 제거, 동일 경로 안전 가드 추가

---

## [0.6.2] - 2026-05-19

### Fixed
- `harness-doctor`: `clone/symlink/delete.sh`를 프로젝트 루트에서 점검 (init 직후 doctor 실패 문제 해결)
- `templates/.opencode/opencode.json`: 존재하지 않는 plan/handoff/review skill 참조 제거, fix-bug/new-feature/verify만 노출

### Changed
- README: task 구조 표기를 실제 구현(`docs/<member>/<name>/` 평탄 구조)에 맞춰 정정

---

## [0.6.1] - 2026-05-15

### Fixed
- `harness-init`: `AI_GITIGNORE_ENTRIES`에서 `docs/` 제거 — 팀 공유 문서가 gitignore에 등록되던 버그 수정

---

## [0.6.0] - 2026-05-15

### Added
- `harness-task`: flat path 구조(`docs/<member>/<name>/`) + prefix 파일명 + `handoff` auto 재설계
- `harness-init` / `harness-sync`: username 자동 감지(`git config user.name` → `$USER`) 및 저장
- `harness-init` / `harness-sync`: post-commit hook 자동 설치로 handoff 자동 갱신
- `harness-migrate`: pre-0.6.0 task 구조 → v0.6.0 flat path 마이그레이션 지원
- HTML 문서: harness-overview·workflow-simulation v0.6.0 반영

### Fixed
- `harness-task`: prefix 매칭 버그, regex 이스케이프, plan 체크 분리 수정
- `harness-init`: 미사용 `join` import 제거

### Changed
- `ensureUsername` + `installPostCommitHook`를 공유 모듈로 분리
- 새 task 인터페이스를 `harness-task.md`, skills, `CLAUDE.md.hbs`에 반영

---

## [0.5.1] - 2026-04-28

### Added
- `harness-init` / `harness-apply` / `harness-migrate`: `CLAUDE.md` 마커 외부 커스텀 감지 시 AskUserQuestion으로 이전 여부 확인
- `harness-doctor`: `CLAUDE.md` 미반영 내용 진단 결과 표시

### Changed
- `CLAUDE.md.hbs` 내용 업데이트

---

## [0.5.0] - 2026-04-28

### Added
- `CLAUDE.md.hbs`에 코드 리뷰 기준 내장 — 외부 도구 의존 없이 팀원이 직접 인지 가능

### Changed
- `harness-review` 커맨드 및 review skill 제거 — 인프라 의존성 대비 효용 불명확

---

## [0.4.0] - 2026-04-27

### Added
- `harness-upgrade`: v0.3.x 실제 파일 → v0.4+ symlink 원스텝 전환 커맨드
- `harness-delete`: `--include-real` 플래그로 실제 파일/디렉토리 삭제 지원
- `harness-backup`: `opts.backupDir` override + auto-detect fallback
- `harness-symlink`: `--backup-dir` 플래그 지원

### Fixed
- `harness-clone`: `ctx.flags['backup-dir']` 지원 추가
- `harness-upgrade`: resolved backupDir를 clone에 전달 + clone.sh/delete.sh 삭제 방지
- `harness-delete`: abort 경로에서 savedBackupConfig null 대신 실제 값 반환
- `harness-backup`: parent+name 경로 `resolve()`로 정규화
- 심볼릭 링크 관련 코드 리뷰 이슈 수정 (tilde 확장, loadBackupDir resolve, upgrade ALIAS_ITEMS 감지, symlink-probe 테스트)

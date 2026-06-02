# Changelog

<!--
  유지 방법:
  - 새 변경은 ## [Unreleased] 아래에 추가하세요.
  - 릴리스 시 Unreleased 항목을 새 버전 헤딩(## [X.Y.Z] - YYYY-MM-DD)으로 이동하세요.
  - 형식: Keep a Changelog (https://keepachangelog.com/ko/1.0.0/)
-->

## [Unreleased]

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

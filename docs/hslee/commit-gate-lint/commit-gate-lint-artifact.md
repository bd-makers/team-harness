# commit-gate-lint — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 커밋 게이트(`templates/.claude/hooks/pre-commit-check.sh`)가 typecheck → **lint** → test 순으로 돈다.
  package.json `lint`가 있을 때만 `<pm> run lint` — 위반은 `exit 2`, 127(실행 불가)은 ⚠ 경고 후 통과.
  test 게이트는 바꾸지 않았다(127도 차단 — 의도된 비대칭, spec 참조). `has_test_script` → `has_script <name>` 일반화.
- 배달: 직전 판(blob `ed90db5b`)을 `KNOWN_STOCK_HOOK_SHA256`·`tests/fixtures/stock-hooks/pre-lint/`에 추가 —
  stock 설치본은 migrate refresh로 갱신, 커스터마이즈본은 보존(기존 계약).
- 테스트: `tests/hooks-jq-fallback.test.mjs`에 npm 스텁 기반 4케이스 × jq 있음/없음(위반·통과·없음·127),
  `tests/migrate-hooks.test.mjs`에 pre-lint 판 refresh 1건. 구 훅으로 바꿔 돌리면 신규 6건이 실패(판별력 확인).
- 문서: overview 카드(lint 단계·127 비대칭)와 `hooks.mmd`(낡은 `pnpm` 하드코딩 → `$PM`, lint 단계) 갱신.
  `/verify` 스킬·README는 훅 동작을 서술하지 않아 변경하지 않았다(`/verify` 수정은 stock-template 테이블 갱신만 늘린다).

### 착수 전 실측 (2026-10-05)
- deep-math `npm run lint` → exit 127 `sh: eslint: command not found` (eslint 의존성·설정 모두 없음 — 죽은 스크립트).
- heliosent-profile `bun run lint` → exit 0.
- → 사용자 결정 C안: 위반은 차단, 127만 경고.

### 후속 후보 (이번 task에서 고치지 않음 — 사용자 지시)
- 템플릿 `detect_pm`이 `bun.lockb`만 봐서 bun 1.2+ 텍스트 락파일 `bun.lock` 프로젝트를 npm으로 오인한다
  (heliosent-profile은 로컬 수정으로 우회 중).
- heliosent-profile의 `pre-commit-check.sh`는 커스터마이즈본이라 migrate가 덮지 않는다 → lint 게이트가 배달되지 않는다.
  수동 병합 또는 bun.lock 수정을 템플릿에 올린 뒤 stock 판정 재검토가 필요하다.
- deep-math의 죽은 `lint` 스크립트: eslint 설치 또는 스크립트 제거(현재는 매 커밋 ⚠ 경고).
- package.json 없는 프로젝트(ruff의 job-scraper)로의 확장.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

- 훅 템플릿 바이트를 바꾸면 세 곳을 함께 바꿔야 한다: `KNOWN_STOCK_HOOK_SHA256` 직전 판 sha, `stock-hooks/<era>/` fixture,
  드리프트 가드의 fixture 개수(`checked`). 이력 완전성 테스트는 `HEAD` 기준이라 **커밋 전에는 반드시 실패**한다.

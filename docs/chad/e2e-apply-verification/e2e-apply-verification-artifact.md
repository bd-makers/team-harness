# e2e-apply-verification — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
`tests/e2e/` 추가 — 실제 `bin/harness-team.mjs`를 child_process로 spawn해 ephemeral sandbox에
하네스를 적용하고 검증하는 L1~L3 E2E. bare-node/next/react-native 3스택 매트릭스 × 3레이어 = **9 케이스 전부 통과**.
`npm test` 전체 104 pass (단위 95 + E2E 9).

신규 파일:
- `tests/e2e/sandbox.mjs` — sandbox 생성기. mkdtemp + git init + 스택 시그니처 package.json + `.bin/harness-team` shim을 PATH에 얹어 진짜 post-commit 훅이 진짜 commit에서 동작. backup-dir은 sandbox 내부에 격납(doctor required `.harness/backup.json` 충족).
- `tests/e2e/apply-smoke.test.mjs` — L1: apply exit 0 + 산출물 16종 전수 존재 + detect-stack id 인식 + `doctor --json` status=success.
- `tests/e2e/lifecycle.test.mjs` — L2: task→4 SSOT 파일→active.json→commit이 post-commit 훅으로 handoff 갱신→done 가드 exit 1→`--force` 후 active.json=null.
- `tests/e2e/ssot-consistency.test.mjs` — L3: AGENTS.md 실파일+roles 마커, CLAUDE/GEMINI는 @AGENTS.md import이고 roles 마커 복제 없음, opencode.json 유효 JSON, cursor .mdc 존재.

`package.json`: `test`가 `tests/e2e/*.test.mjs`도 포함. `test:unit`/`test:e2e` 분리 스크립트 추가.

비범위(의도적): L4 라이브 Claude 세션(SessionStart 훅 주입·슬래시·스킬 트리거)은 자동화 불가 → 제외.

## 발견 (하네스 버그 후보, 이 task 범위 밖)
- **`--member`가 `--yes` 모드에서 무시됨.** `src/user-config.mjs:19-25` `ensureUsername`은
  `flags.yes`일 때 `flags.member`를 보지 않고 git `user.name`→`$USER`로만 결정해 `.harness/config.json`에 고정한다.
  이후 `task`도 `task.mjs:39`에서 `cfg.user`를 우선해 `--member`를 무시.
  → `harness-team apply --yes --member alice`가 docs 경로를 alice가 아닌 git user.name으로 만든다.
  E2E는 이 실사용 경로에 맞춰 sandbox git user.name=tester로 결정값을 고정했다(테스트 자체는 영향 없음).
  수정은 별도 task 권장: `ensureUsername`/`detectMember`에서 `flags.member`를 최우선으로.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*


## Learnings

